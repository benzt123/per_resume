<template>
  <div class="my-resume">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <div class="header-left">
        <div class="title">我的简历</div>
        <div class="subtitle">已保存 {{ resumes.length }} 份简历预览</div>
      </div>
      <div class="header-actions">
        <button class="primary-btn" @click="goMakeResume">生成新简历</button>
      </div>
    </div>
    <div class="resume-list">
      <div v-for="(item, index) in resumes" :key="index" class="resume-card">
        <!-- 预览图片已移除，仅保留标题与操作按钮 -->
        
        <!-- 标题和按钮区域 -->
        <div class="info-section">
          <div class="resume-title">
            <span class="title-text">{{ item.title }}</span>
            <span class="title-date">{{ item.date }}</span>
          </div>
          <div class="button-group">
            <button class="download-btn" @click="downloadImage(item.img, item.title)">
              <span class="download-icon">↓</span>
              <span class="download-text">下载简历</span>
            </button>
            <button class="delete-btn" @click="deleteResume(index)">
              <span class="delete-icon">×</span>
              <span class="delete-text">删除</span>
            </button>
            <button class="edit-btn" @click="previewResume(index)">
              <span class="edit-icon">✎</span>
              <span class="edit-text">查看修改</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="resumes.length === 0" class="empty-state">
      <div class="empty-icon">📄</div>
      <div class="empty-text">暂无简历</div>
      <div class="empty-subtext">快去生成你的第一份简历吧！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

// 使用响应式数据
const resumes = ref([])

// 从本地存储加载简历数据
const loadResumes = () => {
  const savedResumes = uni.getStorageSync('myResumes') || [
    { 
      id: '1',
      date: '2025/9/20', 
      img: '/static/tab-chat.png',
      title: 'xxx科研实习简历',
      imgLoaded: false,
      // markdown 内容（示例），真实场景请在生成简历时保存 markdown
      markdown: `# xxx科研实习简历\n\n**姓名**：张三\n\n## 教育背景\n- 2019 - 2023 某某大学` 
    },
    { 
      id: '2',
      date: '2025/8/20', 
      img: '/static/tab-chat.png',
      title: 'xxx职位简历',
      imgLoaded: false,
      markdown: `# xxx职位简历\n\n**姓名**：李四\n\n## 求职意向\n- 前端工程师` 
    },
    { 
      id: '3',
      date: '2025/4/2', 
      img: '/static/tab-chat.png',
      title: 'xx公司xx岗位简历（2）',
      imgLoaded: false,
      markdown: `# xx公司xx岗位简历（2）\n\n**姓名**：王五\n\n## 项目经验\n- 项目 A` 
    },
    { 
      id: '4',
      date: '2025/4/1', 
      img: '/static/tab-chat.png',
      title: 'xx公司xx岗位简历（1）',
      imgLoaded: false,
      markdown: `# xx公司xx岗位简历（1）\n\n**姓名**：赵六\n\n## 技能\n- JavaScript / Vue` 
    }
  ]
  resumes.value = savedResumes
}

// 保存简历数据到本地存储
const saveResumes = () => {
  uni.setStorageSync('myResumes', resumes.value)
}
// 删除简历
const deleteResume = (index) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这份简历吗？删除后无法恢复。',
    confirmText: '删除',
    confirmColor: '#ff4757',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        // 从数组中移除
        resumes.value.splice(index, 1)
        // 保存到本地存储
        saveResumes()
        
        uni.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        })
      }
    }
  })
}

const handleImageError = (index) => {
  console.log(`图片 ${index} 加载失败，使用备用图片`)
  resumes.value[index].img = 'https://via.placeholder.com/150x200/ffe1b0/704d20?text=简历预览'
}

const downloadImage = (url, title) => {
  // 在uni-app环境中使用uni.downloadFile
  if (typeof uni !== 'undefined') {
    uni.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              uni.showToast({
                title: '下载成功',
                icon: 'success'
              })
            },
            fail: () => {
              uni.showToast({
                title: '下载失败',
                icon: 'none'
              })
            }
          })
        }
      },
      fail: () => {
        uni.showToast({
          title: '下载失败',
          icon: 'none'
        })
      }
    })
  } else {
    // 浏览器环境
    const link = document.createElement('a')
    link.href = url
    link.download = `${title}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 预览并编辑简历：把对应的 markdown 内容写入临时存储，然后跳转到 markdown 编辑页面
const previewResume = (index) => {
  const item = resumes.value[index]

  // ✅ 直接通过 URL 传递 id，不再使用临时存储
  const url = `/pages/markdown/markdown?id=${encodeURIComponent(item.id)}`

  if (typeof uni !== 'undefined' && uni.navigateTo) {
    // UniApp 环境（小程序 / App / H5）
    uni.navigateTo({ url })
  } else if (typeof window !== 'undefined') {
    // 纯浏览器 SPA fallback（如直接用 Vue 开发的 H5）
    // 注意：如果你项目是标准 UniApp H5，通常不会走这里
    window.location.href = `/#${url}`
  } else {
    console.warn('无法跳转到编辑页面')
  }
}

// 前往生成简历
const goMakeResume = () => {
  if (typeof uni !== 'undefined' && uni.navigateTo) {
    uni.navigateTo({ 
      url: '/pages/Make_presume/Make_presume',
      success: () => {
        console.log('跳转到生成简历页面成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        uni.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    })
  } else if (typeof window !== 'undefined') {
    // 浏览器环境 fallback
    window.location.href = '/#/pages/Make_presume/Make_presume'
  }
}
// 页面加载时从本地存储读取数据
onMounted(() => {
  loadResumes()
})

onShow(() => {
  console.log('监听页面显示，重新加载简历')
  loadResumes()
})

</script>

<style scoped>
.my-resume {
  background: linear-gradient(to bottom, #fff9f0 0%, #ffffff 100%);
  min-height: 100vh;
  padding: 20px 16px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  max-width: 1000px;
  margin: 0 auto 16px;
  padding: 4px 4px 8px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #5b3a17;
}

.subtitle {
  font-size: 12px;
  color: #9c7a53;
}

.primary-btn {
  padding: 10px 14px;
  background: linear-gradient(135deg, #ff9f43 0%, #ff7f11 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(255, 159, 67, 0.28);
  cursor: pointer;
  transition: all 0.25s ease;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(255, 159, 67, 0.36);
}

.primary-btn:active {
  transform: translateY(0);
}

.resume-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

/* 单列布局下无需特殊处理最后一个卡片 */

.resume-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(112, 77, 32, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  flex-direction: column;
}

.resume-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(112, 77, 32, 0.15);
}

.date-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 225, 176, 0.95);
  color: #704d20;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 12px;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.image-container {
  width: 100%;
  padding: 14px 14px 16px;
  box-sizing: border-box;
}

.image-placeholder {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: linear-gradient(135deg, #f5f5f5 0%, #ebebeb 100%);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #999;
  font-size: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ffa53b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.resume-img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.resume-card:hover .resume-img {
  transform: scale(1.02);
}

.info-section {
  padding: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.resume-title {
  font-size: 15px;
  font-weight: 600;
  color: #704d20;
  background: linear-gradient(135deg, #ffe1b0 0%, #ffd89a 100%);
  border-radius: 10px;
  padding: 10px 14px;
  flex: 1 1 auto;
  width: auto;
  max-width: 100%;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  box-shadow: 0 2px 4px rgba(112, 77, 32, 0.08);
  position: relative;
  padding-right: 108px; /* 为右上角的时间预留空间 */
}

.title-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.title-date {
  position: absolute;
  top: 6px;
  right: 10px;
  background: rgba(255, 255, 255, 0.85);
  color: #6b4a1e;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.button-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  width: auto;
  flex: 0 0 auto;
  white-space: nowrap;
}

.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 42px;
  background: linear-gradient(135deg, #ffa53b 0%, #ff8c00 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(255, 165, 59, 0.3);
  letter-spacing: 0.2px;
}

.download-btn:hover {
  background: linear-gradient(135deg, #ff8c00 0%, #ff7700 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(255, 165, 59, 0.4);
}

.download-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(255, 165, 59, 0.3);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 42px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(255, 107, 107, 0.3);
  letter-spacing: 0.2px;
}

.delete-btn:hover {
  background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(255, 107, 107, 0.4);
}

/* 编辑按钮（查看修改） */
.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 42px;
  background: linear-gradient(135deg, #5aa2ff 0%, #2f7bff 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 8px rgba(47, 123, 255, 0.28);
  letter-spacing: 0.2px;
}

.edit-btn:hover {
  background: linear-gradient(135deg, #2f7bff 0%, #1f66e6 100%);
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(47, 123, 255, 0.36);
}

.delete-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
}

.download-icon, .delete-icon, .edit-icon {
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
}

.download-text, .delete-text, .edit-text {
  letter-spacing: 0.4px;
  line-height: 1;
  white-space: nowrap;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 18px;
  font-weight: 500;
  color: #704d20;
  margin-bottom: 8px;
}

.empty-subtext {
  font-size: 14px;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .resume-list {
    gap: 16px;
  }
  
  .resume-card {
    border-radius: 12px;
  }
  
  .date-badge {
    font-size: 10px;
    padding: 3px 8px;
  }
  
  .resume-title {
    font-size: 13px;
    padding: 6px 10px;
    padding-right: 92px; /* 移动端为时间留出更小空间 */
  }
  
  .download-btn, .delete-btn, .edit-btn {
    height: 36px;
    font-size: 12.5px;
  }
  
  .button-group {
    gap: 6px;
  }
}

/* 平板适配 */
@media (min-width: 768px) {
  .resume-list {
    grid-template-columns: 1fr;
    gap: 22px;
  }
}

/* 大屏适配 */
@media (min-width: 1024px) {
  .resume-list {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>