// ======================================================
// Resume（简历）存储模块 - 本地存储 + 可选后端同步（REST API）
// 行为契约：
// - 本地始终使用 key: 'resume' 作为缓存
// - 如果通过 configureApi 开启了后端地址，则尝试与后端同步（优先使用后端数据），失败时回退到本地
// - 导出函数：configureApi, apiRequest, getResume, saveResume, listExperiences, addExperience, updateExperience, deleteExperience, checkStoragePermission
// ======================================================

const RESUME_KEY = 'resume'

// API 配置（可由外部在启动时调用 configureApi 设置）
let apiConfig = {
  enabled: false,
  baseURL: '',
  tokenKey: 'token' // 从 storage 读取 token
}

export function configureApi({ enabled = false, baseURL = '', tokenKey = 'token' } = {}) {
  apiConfig = { enabled, baseURL, tokenKey }
}

function getDefaultResume() {
  return {
    summary: '',
    experiences: [],
    achievements: [],
    updatedAt: new Date().toISOString()
  }
}

// 辅助：统一的 API 请求封装（返回 Promise）
export function apiRequest(method, path, data = {}, opts = {}) {
  if (!apiConfig.enabled || !apiConfig.baseURL) {
    return Promise.reject(new Error('API 未配置或未启用'))
  }

  const url = apiConfig.baseURL.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path)
  const token = uni.getStorageSync(apiConfig.tokenKey) || ''

  const header = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {})
  if (token) header.Authorization = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: method.toUpperCase(),
      data: data,
      header,
      success: (res) => {
        // 兼容不同后端返回结构：优先返回 data 字段
        const status = res.statusCode || 0
        if (status >= 200 && status < 300) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// ========== 存储/备份相关 ==========
export function checkStoragePermission() {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.android) return resolve()
    try {
      const Context = plus.android.importClass('android.content.Context');
      const PackageManager = plus.android.importClass('android.content.pm.PackageManager');
      const Manifest = plus.android.importClass('android.Manifest');
      const main = plus.android.runtimeMainActivity();

      const writePermission = main.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
      const readPermission = main.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE);

      if (writePermission === PackageManager.PERMISSION_GRANTED && readPermission === PackageManager.PERMISSION_GRANTED) {
        resolve();
      } else {
        const ActivityCompat = plus.android.importClass('androidx.core.app.ActivityCompat');
        ActivityCompat.requestPermissions(main, [
          Manifest.permission.WRITE_EXTERNAL_STORAGE,
          Manifest.permission.READ_EXTERNAL_STORAGE
        ], 1001);

        setTimeout(() => {
          const newWritePermission = main.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
          const newReadPermission = main.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE);

          if (newWritePermission === PackageManager.PERMISSION_GRANTED && newReadPermission === PackageManager.PERMISSION_GRANTED) {
            resolve();
          } else {
            reject(new Error('用户未授予存储权限'));
          }
        }, 2000);
      }
    } catch (e) {
      // 在非 Android 或 plus 不可用时，直接 resolve
      resolve()
    }
  });
}

function saveBackupFile(jsonContent, tag = 1, fileName) {
  // APP-PLUS 环境写文件（if available）
  // #ifdef APP-PLUS
  try {
    if (typeof saveJSONToDCIM === 'function') {
      saveJSONToDCIM(jsonContent, tag, fileName)
    }
  } catch (e) {
    console.log('备份到外部失败', e)
  }
  // #endif
}

// ========== 简历数据接口（本地 + 可选后端） ==========
// 读取本地 resume（如果后端可用则优先从后端读取）
export async function getResume() {
  if (apiConfig.enabled) {
    try {
      const remote = await apiRequest('GET', '/resume')
      if (remote && typeof remote === 'object') {
        const merged = Object.assign(getDefaultResume(), remote)
        uni.setStorageSync(RESUME_KEY, merged)
        return merged
      }
    } catch (e) {
      // 后端读取失败，回退到本地
      console.warn('从后端获取 resume 失败，回退到本地', e)
    }
  }
  try {
    const r = uni.getStorageSync(RESUME_KEY)
    if (!r || typeof r !== 'object') return getDefaultResume()
    return Object.assign(getDefaultResume(), r)
  } catch (e) {
    console.error('读取 resume 失败', e)
    return getDefaultResume()
  }
}

// 保存整个 resume 对象（覆盖），若开启后端则同步到后端
export async function saveResume(resumeObj) {
  if (!resumeObj || typeof resumeObj !== 'object') {
    throw new Error('resume 必须是对象')
  }
  const toSave = Object.assign(getDefaultResume(), resumeObj, { updatedAt: new Date().toISOString() })

  if (apiConfig.enabled) {
    try {
      const resp = await apiRequest('POST', '/resume', toSave)
      // 如果后端返回数据，则以后端返回为准
      const final = (resp && typeof resp === 'object') ? Object.assign(getDefaultResume(), resp) : toSave
      uni.setStorageSync(RESUME_KEY, final)
      // 备份文件（APP-PLUS 可选）
      saveBackupFile(JSON.stringify(final), 1, `resume_backup_${new Date().toISOString().slice(0, 10)}.json`)
      return final
    } catch (e) {
      console.warn('保存到后端失败，已写入本地', e)
      uni.setStorageSync(RESUME_KEY, toSave)
      saveBackupFile(JSON.stringify(toSave), 1, `resume_backup_${new Date().toISOString().slice(0, 10)}.json`)
      return toSave
    }
  }

  uni.setStorageSync(RESUME_KEY, toSave)
  saveBackupFile(JSON.stringify(toSave), 1, `resume_backup_${new Date().toISOString().slice(0, 10)}.json`)
  return toSave
}

export function listExperiences() {
  const r = uni.getStorageSync(RESUME_KEY) || getDefaultResume()
  return r.experiences || []
}

// 添加单条经历，优先让后端创建（如果可用），否则本地创建 id
export async function addExperience(exp) {
  if (!exp || typeof exp !== 'object') throw new Error('experience 必须是对象')

  const localResume = await getResume()

  if (apiConfig.enabled) {
    try {
      const created = await apiRequest('POST', '/resume/experiences', exp)
      // 尝试从后端返回中更新本地缓存
      try {
        const refreshed = await apiRequest('GET', '/resume')
        const final = Object.assign(getDefaultResume(), refreshed)
        uni.setStorageSync(RESUME_KEY, final)
        return created
      } catch (e) {
        // 如果无法刷新，则把 created 附加到本地
        const id = (created && created.id) ? created.id : (Date.now()).toString()
        const newExp = Object.assign({ id, company: '', role: '', start: '', end: '', description: '', categoryId: '' }, created)
        localResume.experiences.push(newExp)
        localResume.updatedAt = new Date().toISOString()
        uni.setStorageSync(RESUME_KEY, localResume)
        return newExp
      }
    } catch (e) {
      console.warn('向后端添加 experience 失败，使用本地方式', e)
    }
  }

  const id = (Date.now()).toString()
  const newExp = Object.assign({ id, company: '', role: '', start: '', end: '', description: '', categoryId: '' }, exp)
  localResume.experiences.push(newExp)
  localResume.updatedAt = new Date().toISOString()
  uni.setStorageSync(RESUME_KEY, localResume)
  saveBackupFile(JSON.stringify(localResume), localResume.experiences.length, `resume_backup_${new Date().toISOString().slice(0, 10)}.json`)
  return newExp
}

// 更新指定 id 的经历（partial patch），尝试调用后端
export async function updateExperience(id, patch) {
  if (!id) throw new Error('缺少 id')
  const resume = await getResume()
  const idx = (resume.experiences || []).findIndex(e => e.id === id)
  if (idx === -1) return null

  if (apiConfig.enabled) {
    try {
      const resp = await apiRequest('PATCH', `/resume/experiences/${id}`, patch)
      // 刷新本地数据
      try {
        const refreshed = await apiRequest('GET', '/resume')
        const final = Object.assign(getDefaultResume(), refreshed)
        uni.setStorageSync(RESUME_KEY, final)
        return resp
      } catch (e) {
        // 如果无法刷新，则在本地合并
        resume.experiences[idx] = Object.assign({}, resume.experiences[idx], patch)
        resume.updatedAt = new Date().toISOString()
        uni.setStorageSync(RESUME_KEY, resume)
        return resume.experiences[idx]
      }
    } catch (e) {
      console.warn('更新后端 experience 失败，回退到本地更新', e)
    }
  }

  resume.experiences[idx] = Object.assign({}, resume.experiences[idx], patch)
  resume.updatedAt = new Date().toISOString()
  uni.setStorageSync(RESUME_KEY, resume)
  saveBackupFile(JSON.stringify(resume), resume.experiences.length, `resume_backup_${new Date().toISOString().slice(0, 10)}.json`)
  return resume.experiences[idx]
}

// 删除指定经历，返回 true/false
export async function deleteExperience(id) {
  if (!id) throw new Error('缺少 id')
  const resume = await getResume()

  if (apiConfig.enabled) {
    try {
      await apiRequest('DELETE', `/resume/experiences/${id}`)
      // 刷新本地
      try {
        const refreshed = await apiRequest('GET', '/resume')
        const final = Object.assign(getDefaultResume(), refreshed)
        uni.setStorageSync(RESUME_KEY, final)
        return true
      } catch (e) {
        // 若刷新失败，则本地删除
        resume.experiences = (resume.experiences || []).filter(e => e.id !== id)
        resume.updatedAt = new Date().toISOString()
        uni.setStorageSync(RESUME_KEY, resume)
        return true
      }
    } catch (e) {
      console.warn('从后端删除 experience 失败，回退本地删除', e)
    }
  }

  const before = (resume.experiences || []).length
  resume.experiences = (resume.experiences || []).filter(e => e.id !== id)
  const after = resume.experiences.length
  if (after === before) return false
  resume.updatedAt = new Date().toISOString()
  uni.setStorageSync(RESUME_KEY, resume)
  saveBackupFile(JSON.stringify(resume), resume.experiences.length, `resume_backup_${new Date().toISOString().slice(0, 10)}.json`)
  return true
}

// ========== experienceRecords（页面使用的记录集合） ==========
// 与页面中的 `experienceRecords` key 对应，提供与后端同步的读写接口
export async function getExperienceRecords() {
  if (apiConfig.enabled) {
    try {
      const resp = await apiRequest('GET', '/records')
      if (Array.isArray(resp)) {
        uni.setStorageSync('experienceRecords', resp)
        return resp
      }
      // 如果后端返回包裹在 data 中
      if (resp && Array.isArray(resp.data)) {
        uni.setStorageSync('experienceRecords', resp.data)
        return resp.data
      }
    } catch (e) {
      console.warn('获取 experienceRecords 从后端失败，回退本地', e)
    }
  }
  return uni.getStorageSync('experienceRecords') || []
}

export async function addExperienceRecord(record) {
  // record: { id?, fileName, fileSize, fileType, startDate, endDate, note, category, summary, createdTime, fileContent }
  const localRecords = uni.getStorageSync('experienceRecords') || []

  if (apiConfig.enabled) {
    try {
      const created = await apiRequest('POST', '/records', record)
      // 尝试将后端返回的记录加入本地缓存
      const toPush = created && typeof created === 'object' ? created : record
      const id = toPush.id || (Date.now()).toString()
      toPush.id = id
      localRecords.push(toPush)
      uni.setStorageSync('experienceRecords', localRecords)
      return toPush
    } catch (e) {
      console.warn('向后端添加 record 失败，回退本地保存', e)
    }
  }

  const id = record.id || (Date.now()).toString()
  const newRec = Object.assign({ id }, record)
  localRecords.push(newRec)
  uni.setStorageSync('experienceRecords', localRecords)
  return newRec
}

export async function updateExperienceRecord(id, patch) {
  if (!id) throw new Error('缺少 id')
  let records = uni.getStorageSync('experienceRecords') || []
  const idx = records.findIndex(r => r.id === id)
  if (idx === -1) return null

  if (apiConfig.enabled) {
    try {
      const resp = await apiRequest('PATCH', `/records/${id}`, patch)
      // 刷新本地缓存尝试
      try {
        const refreshed = await getExperienceRecords()
        return resp || refreshed[idx] || Object.assign({}, records[idx], patch)
      } catch (e) {
        // 合并本地
        records[idx] = Object.assign({}, records[idx], patch)
        uni.setStorageSync('experienceRecords', records)
        return records[idx]
      }
    } catch (e) {
      console.warn('更新后端 record 失败，回退本地更新', e)
    }
  }

  records[idx] = Object.assign({}, records[idx], patch)
  uni.setStorageSync('experienceRecords', records)
  return records[idx]
}

export async function deleteExperienceRecord(id) {
  if (!id) throw new Error('缺少 id')
  let records = uni.getStorageSync('experienceRecords') || []
  const before = records.length

  if (apiConfig.enabled) {
    try {
      await apiRequest('DELETE', `/records/${id}`)
      // 刷新本地
      try {
        await getExperienceRecords()
        return true
      } catch (e) {
        records = records.filter(r => r.id !== id)
        uni.setStorageSync('experienceRecords', records)
        return true
      }
    } catch (e) {
      console.warn('从后端删除 record 失败，回退本地删除', e)
    }
  }

  records = records.filter(r => r.id !== id)
  const after = records.length
  if (after === before) return false
  uni.setStorageSync('experienceRecords', records)
  return true
}

