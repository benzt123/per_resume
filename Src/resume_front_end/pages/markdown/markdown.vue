	<template>
	  <view class="page">
		<!-- 左侧：编辑区域 -->
		<view class="editor-area">
		  <textarea
		  		        class="editor"   
		  		        placeholder="在这里输入你的简历 Markdown..."
		  		        v-model="markdownText"
		  		        :maxlength="-1"
		  		        auto-height
		  		        adjust-position="false"
		  		        show-confirm-bar="false"
		  		        :cursor-spacing="10"
		  		        @paste="onPaste"
		  		      ></textarea>
		  <view class="controls">
			<button @click="renderPreview">预览</button>
			<button @click="exportPDF">导出 PDF</button>
			<button @click="loadSample">加载示例</button>
			<button @click="clear">清空</button>
			<button @click="restoreOriginal">恢复原文</button>
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
      resumeId: null, // 存储当前编辑的简历 ID
	  originalText: '', // 用来缓存原内容
	  isSample: false, //是否为示例状态
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
		  this.originalText = this.markdownText //  备份
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
	  if (this.isSample) {
	  	        uni.showToast({ title: '请先恢复原文再保存', icon: 'none' })
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
	  this.isSample = true
      this.markdownText = sampleText()
      this.renderPreview() 
    },
    restoreOriginal() {
            this.markdownText = this.originalText
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

## 基本信息
<style>
.resume-info {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  color: #2b5c5c;
}
.resume-info td {
  padding: 6px 12px;
  vertical-align: top;
  text-align: left;
}
.resume-info .photo {
  width: 120px;
  text-align: right;
}
.resume-info img {
  width: 100px;
  height: 120px;
  border-radius: 6px;
  object-fit: cover;
}
</style>

<table class="resume-info">
  <tr>
    <td>
      <table>
        <tr>
          <td>姓名：林晓恩</td>
          <td>学历：本科</td>
        </tr>
        <tr>
          <td>性别：女</td>
          <td>专业：临床医学</td>
        </tr>
        <tr>
          <td>籍贯：湖南</td>
          <td>电话：18888888888</td>
        </tr>
        <tr>
          <td>学校：武汉大学</td>
          <td>邮箱：188@qq.com</td>
        </tr>
      </table>
    </td>
    <td class="photo">
      <img src="你的照片链接或本地路径.jpg" alt="个人照片" />
    </td>
  </tr>
</table>


## 专业技能

- JavaScript / Vue / uni-app
- HTML5 / CSS3 / 响应式布局
- Markdown / KaTeX / html2canvas
- 前端工程化 / Webpack

## 项目与经历

• 实习经历
- 使用 Markdown + KaTeX 实现可编辑简历，支持公式与代码高亮
- 导出为 PDF（html2canvas + jsPDF）

## 自我评价

热爱前端技术，具备扎实的编程基础和良好的团队协作能力。善于学习新技术，对用户体验有深刻理解，能够独立完成项目开发。
`
}
</script>
<style scoped>
	.page {
	  display: flex;
	  flex-direction: row;
	  height: 100vh;
	  width: 100vw;
	  overflow: hidden;
	  background: #f5f5f5;
	}
	/* 左侧编辑区 - 支持滚动 */
	.editor-area {
	  width: 50%;
	  padding: 20px;
	  background: #fff;
	  border-right: 1px solid #e8e8e8;
	  display: flex;
	  flex-direction: column;
	  box-sizing: border-box;
	  overflow: hidden; /* 整体隐藏溢出，保证 flex 内部滚动生效 */
	}
	
	.editor {
	  flex: 1;
	  min-height: 0; 
	  width: 100%;
	  border: 1px solid #d9d9d9;
	  padding: 16px;
	  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	  font-size: 14px;
	  line-height: 1.6;
	  box-sizing: border-box;
	  border-radius: 8px;
	  resize: none;
	  background: #fafafa;
	  overflow-y: auto; /*  添加滚动 */
	}
	

	
	.editor:focus {
	  outline: none;
	  border-color: #1890ff;
	  background: #fff;
	}
	
	.controls {
	  margin-top: 16px;
	  display: flex;
	  gap: 10px;
	  flex-wrap: wrap;
	}
	
	button {
	  padding: 8px 16px;
	  border-radius: 6px;
	  border: 1px solid #d9d9d9;
	  background: #fff;
	  color: #333;
	  font-size: 14px;
	  cursor: pointer;
	  transition: all 0.2s;
	}
	
	button:hover {
	  background: #f0f0f0;
	  border-color: #bbb;
	}
	
	button:active {
	  background: #e6e6e6;
	}
	
	/* 右侧预览区 - 支持滚动 */
	.preview-area {
	  flex: 1;
	  padding: 20px;
	  background: #fff;
	  overflow-y: auto; /* 添加滚动 */
	}
	
	.preview-inner {
	  max-width: 800px;
	  margin: 0 auto;
	  background: #fff;
	  padding: 40px 50px;
	  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
	  border-radius: 8px;
	  min-height: 100%;
	  font-family: 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif;
	  line-height: 1.6;
	  color: #333;
	}
	
	/* ========== 简历预览特定样式 ========== */
	
	/* 主标题 - 无下划线 */
	.page ::v-deep .preview-inner h1 {
	  font-size: 22px;
	  font-weight: 600;
	  margin-bottom: 25px;
	  color: #000;
	  text-align: center;
	  padding-bottom: 0;
	  border-bottom: none;
	}
	
	/* 章节标题 - 蓝色字体 + 蓝色下划线 */
	.page ::v-deep .preview-inner h2 {
	  font-size: 16px;
	  font-weight: 600;
	  margin: 28px 0 15px 0;
	  color: #1890ff;
	  padding-bottom: 8px;
	  border-bottom: 2px solid #1890ff;
	}
	
	/* 基本信息表格样式 - 调整单元格宽度 */
	.page ::v-deep .preview-inner .info-table {
	  width: 100%;
	  border-collapse: collapse;
	  margin: 12px 0 20px 0;
	  font-size: 14px;
	  border: 1px solid #e8e8e8;
	}
	
	.page ::v-deep .preview-inner .info-table td {
	  padding: 6px 10px;
	  border: 1px solid #e8e8e8;
	  color: #333;
	  line-height: 1.4;
	  white-space: nowrap;
	}
	
	/* 第一行：4个单元格等宽 */
	.page ::v-deep .preview-inner .info-table tr:first-child td {
	  width: 25%;
	}
	
	/* 第二行：调整单元格宽度比例 */
	.page ::v-deep .preview-inner .info-table tr:nth-child(2) td:nth-child(1) { /* 毕业院校 */
	  width: 28%;
	}
	.page ::v-deep .preview-inner .info-table tr:nth-child(2) td:nth-child(2) { /* 学历 */
	  width: 12%;
	}
	.page ::v-deep .preview-inner .info-table tr:nth-child(2) td:nth-child(3) { /* 专业 */
	  width: 30%;
	}
	.page ::v-deep .preview-inner .info-table tr:nth-child(2) td:nth-child(4) { /* 毕业年份 */
	  width: 15%;
	}
	.page ::v-deep .preview-inner .info-table tr:nth-child(2) td:nth-child(5) { /* GPA */
	  width: 15%;
	}
	
	/* 第三行：联系电话和邮箱各占2.5个单元格 */
	.page ::v-deep .preview-inner .info-table tr:nth-child(3) td:nth-child(1) { /* 联系电话 */
	  width: 50%;
	}
	.page ::v-deep .preview-inner .info-table tr:nth-child(3) td:nth-child(2) { /* 邮箱 */
	  width: 50%;
	}
	
	/* 第四行：求职意向合并单元格 */
	.page ::v-deep .preview-inner .info-table tr:nth-child(4) td {
	  width: 100%;
	  text-align: center;
	}
	
	/* 专业技能列表样式 */
	.page ::v-deep .preview-inner h2:nth-of-type(2) + ul {
	  margin: 12px 0 25px 0;
	  padding-left: 20px;
	}
	
	.page ::v-deep .preview-inner h2:nth-of-type(2) + ul li {
	  color: #333;
	  font-size: 14px;
	  line-height: 1.8;
	  margin-bottom: 8px;
	}
	
	/* 项目与经历样式 */
	.page ::v-deep .preview-inner h2:nth-of-type(3) + ul {
	  margin: 12px 0 25px 0;
	  padding-left: 20px;
	}
	
	.page ::v-deep .preview-inner h2:nth-of-type(3) + ul li {
	  margin-bottom: 12px;
	  font-size: 14px;
	  line-height: 1.6;
	  color: #333;
	}
	
	.page ::v-deep .preview-inner h2:nth-of-type(3) + ul li ul {
	  margin: 8px 0 0 20px;
	  padding-left: 0;
	}
	
	.page ::v-deep .preview-inner h2:nth-of-type(3) + ul li ul li {
	  margin-bottom: 6px;
	  color: #666;
	  font-size: 13px;
	  line-height: 1.5;
	}
	
	/* 自我评价样式 */
	.page ::v-deep .preview-inner h2:nth-of-type(4) + p {
	  font-size: 14px;
	  line-height: 1.8;
	  color: #333;
	  margin: 15px 0 20px 0;
	  text-align: justify;
	  padding: 0;
	}
	
	/* 通用列表样式 */
	.page ::v-deep .preview-inner ul {
	  margin: 12px 0 20px 0;
	  padding-left: 20px;
	}
	
	.page ::v-deep .preview-inner li {
	  margin-bottom: 8px;
	  font-size: 14px;
	  line-height: 1.6;
	  color: #333;
	}
	
	.page ::v-deep .preview-inner strong {
	  font-weight: 600;
	  color: #000;
	}
	
	/* 确保内容紧凑 */
	.page ::v-deep .preview-inner * {
	  margin-top: 0;
	}
	
	.page ::v-deep .preview-inner h1:first-child {
	  margin-top: 0;
	}
	
	/* 响应式调整 - 只在非常小的屏幕上变为上下布局 */
	@media (max-width: 480px) {
	  .page {
	    flex-direction: column;
	    height: auto;
	  }
	  
	  .editor-area {
	    width: 100%;
	    border-right: none;
	    border-bottom: 1px solid #e8e8e8;
	  }
	  
	  .preview-area {
	    width: 100%;
	  }
	  
	  .preview-inner {
	    padding: 20px;
	  }
	  
	  .page ::v-deep .preview-inner .info-table {
	    font-size: 12px;
	  }
	  
	  .page ::v-deep .preview-inner .info-table td {
	    padding: 4px 6px;
	    white-space: normal;
	  }
	  
	  /* 移动端调整标题样式 */
	  .page ::v-deep .preview-inner h1 {
	    font-size: 18px;
	  }
	  
	  .page ::v-deep .preview-inner h2 {
	    font-size: 14px;
	  }
	}
	</style>