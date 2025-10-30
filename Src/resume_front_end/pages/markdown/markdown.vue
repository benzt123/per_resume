	<template>
	  <view class="page">
		<!-- 左侧：编辑区域 -->
		<view class="editor-area">
		  <textarea class="editor" v-model="markdownText" placeholder="在这里输入你的简历 Markdown..."></textarea>
		  <view class="controls">
			<button @click="renderPreview">预览</button>
			<button @click="exportPDF">导出 PDF</button>
			<button @click="loadSample">加载示例</button>
			<button @click="clear">清空</button>
			<!-- 保存并回传到 myResumes（如果来自 Mypresume） -->
			<button @click="saveResume">保存</button>
		  </view>
		</view>

		<!-- 右侧：预览区域 -->
		<scroll-view class="preview-area" scroll-y="true">
		  <view class="preview-inner" v-html="htmlContent"></view>
		</scroll-view>
	  </view>
	</template>
<script>
import { renderMarkdown } from '@/utils/markdown.js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default {
  data() {
    return {
      markdownText: '',
      htmlContent: '',
      resumeId: null // 存储当前编辑的简历 ID
    }
  },

  // ✅ 关键：使用 onLoad 获取 URL 参数
  onLoad(options) {
    const id = options.id
    if (!id) {
      uni.showToast({ title: '无效的简历 ID', icon: 'none' })
      return
    }

    this.resumeId = decodeURIComponent(id)

    // 从存储中加载对应简历
    this.loadResumeById(this.resumeId)
  },

  mounted() {
    // 注意：不要在这里加载数据！onLoad 已处理
    this.renderPreview()
  },

  methods: {
    loadResumeById(id) {
      try {
        let resumes = []
        if (typeof uni !== 'undefined' && uni.getStorageSync) {
          resumes = uni.getStorageSync('myResumes') || []
        } else if (typeof localStorage !== 'undefined') {
          const s = localStorage.getItem('myResumes')
          resumes = s ? JSON.parse(s) : []
        }

        const item = resumes.find(r => String(r.id) === String(id))
        if (item) {
          this.markdownText = item.markdown || ''
          // 可选：也保存 title 用于保存时 fallback
          this.currentTitle = item.title || ''
        } else {
          uni.showToast({ title: '未找到该简历', icon: 'none' })
          this.markdownText = ''
        }
      } catch (err) {
        console.error('加载简历失败', err)
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },

    renderPreview() {
      this.htmlContent = renderMarkdown(this.markdownText)
    },

    async saveResume() {
      if (!this.resumeId) {
        uni.showToast({ title: '无效的简历 ID', icon: 'none' })
        return
      }

      const key = 'myResumes'
      try {
        let resumes = []
        if (typeof uni !== 'undefined' && uni.getStorageSync) {
          resumes = uni.getStorageSync(key) || []
        } else if (typeof localStorage !== 'undefined') {
          const s = localStorage.getItem(key)
          resumes = s ? JSON.parse(s) : []
        }

        const idx = resumes.findIndex(r => String(r.id) === String(this.resumeId))
        if (idx !== -1) {
          // 更新现有简历
          resumes[idx].markdown = this.markdownText
          // 可选：更新 title（如果你在编辑页支持改标题）
          // resumes[idx].title = this.currentTitle || resumes[idx].title
        } else {
          // 理论上不应发生，但兜底：新增
          resumes.push({
            id: this.resumeId,
            title: this.currentTitle || '未命名简历',
            markdown: this.markdownText,
            date: new Date().toLocaleDateString('zh-CN').replace(/\//g, '/'),
            img: '/static/tab-chat.png',
            imgLoaded: false
          })
        }

        // 保存回存储
        if (typeof uni !== 'undefined' && uni.setStorageSync) {
          uni.setStorageSync(key, resumes)
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(resumes))
        }

        uni.showToast({ title: '保存成功', icon: 'success' })
        uni.navigateBack()
      } catch (err) {
        console.error('保存失败', err)
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    },

    async exportPDF() {
      try {
        const previewEl = document.querySelector('.preview-inner')
        if (!previewEl) { 
          uni.showToast({ title: '预览内容未找到', icon: 'none' })
          return 
        }
        const canvas = await html2canvas(previewEl, { scale: 2, useCORS: true })
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const imgProps = pdf.getImageProperties(imgData)
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save('resume.pdf')
      } catch (err) { 
        console.error(err)
        uni.showToast({ title: '导出失败: ' + (err.message || err), icon: 'none' }) 
      }
    },

    loadSample() { 
      this.markdownText = sampleText()
      this.renderPreview() 
    },
    
    clear() { 
      this.markdownText = ''
      this.renderPreview() 
    }
  }
}

function sampleText() {
  return `# 个人简历
**姓名**：张三
**求职意向**：前端工程师

---

## 教育背景
- 2015 - 2019 本科，计算机科学与技术，某某大学

## 项目经验
### 简历编辑器 (uni-app)
- 使用 Markdown + KaTeX 实现可编辑简历，支持公式与代码高亮
- 导出为 PDF（html2canvas + jsPDF）

## 技能
- JavaScript / Vue / uni-app
- Markdown / KaTeX / html2canvas
`
}
</script>
	<style>
	.page {
	  display: flex;
	  flex-direction: row; /* 改为横向排列 */
	  height: 100vh;
	  width: 100vw;
	  overflow: hidden; /* 防止滚动条叠加 */
	}

	/* 左侧编辑区：固定或弹性宽度 */
	.editor-area {
	  width: 50%; /* 或者用 flex: 1 */
	  padding: 12px;
	  background: #fff;
	  border-right: 1px solid #eee; /* 改为右侧边框 */
	  display: flex;
	  flex-direction: column;
	  box-sizing: border-box;
	}

	.editor {
	  flex: 1; /* 占据剩余高度 */
	  min-height: 0; /* 防止 flex 子项最小高度干扰 */
	  width: 100%;
	  border: 1px solid #e6e6e6;
	  padding: 10px;
	  font-family: monospace;
	  font-size: 14px;
	  box-sizing: border-box;
	  border-radius: 6px;
	  resize: none; /* 禁用 textarea 默认拖拽 */
	}

	.controls {
	  margin-top: 8px;
	  display: flex;
	  gap: 8px;
	}

	button {
	  padding: 8px 10px;
	  border-radius: 6px;
	  border: 1px solid #ddd;
	  background: #f8f8f8;
	}

	/* 右侧预览区 */
	.preview-area {
	  flex: 1; /* 占据剩余宽度 */
	  padding: 16px;
	  background: #fafafa;
	  overflow-y: auto; /* 允许纵向滚动 */
	}

	.preview-inner {
	  max-width: 900px;
	  margin: 0 auto;
	  background: #fff;
	  padding: 20px;
	  box-shadow: 0 0 0 1px rgba(0,0,0,0.03);
	  border-radius: 6px;
	  min-height: 100%; /* 防止内容过少时高度塌陷 */
	}

	.hljs {
	  background: #f6f8fa;
	  padding: 8px;
	  border-radius: 4px;
	  overflow: auto;
	}

	.katex {
	  font-size: 1.05em;
	}
	</style>
