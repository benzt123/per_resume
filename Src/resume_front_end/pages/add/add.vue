<template>
	<view class="container">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title"> '添加经历'</text>
		</view>
		
		<!-- 文件上传区域 -->
		<view class="upload-section">
			<text class="section-title">上传经历文件</text>
			<view 
				class="upload-area"
				@click="chooseFile"
				@dragover.prevent="dragOver = true"
				@dragleave="dragOver = false"
				@drop="handleFileDrop"
				:class="{ 'drag-over': dragOver }"
			>
				<view class="upload-icon">📁</view>
				<text class="upload-text">点击或拖拽文件到此处上传</text>
				<text class="upload-hint">支持txt, xlsx, csv, jpg等格式</text>
			</view>
			
			<!-- 已选择文件列表 -->
			<view v-if="selectedFile" class="file-list">
				<view class="file-item">
					<text class="file-name">{{selectedFile.name}}</text>
					<text class="file-size">{{formatFileSize(selectedFile.size)}}</text>
					<view class="remove-btn" @click="removeFile">×</view>
				</view>
			</view>
		</view>
		
		<!-- 时间选择 -->
		<view class="time-section">
			<text class="section-title">经历时间</text>
			<view class="time-container">
				<!-- 开始时间 -->
				<view class="time-item">
					<text class="time-label">开始时间</text>
					<picker class="date-picker" mode="date" :value="startDate" @change="onStartDateChange">
						<view class="time-picker">
							<text class="time-text">{{startDate || '选择开始日期'}}</text>
							<text class="time-arrow">📅</text>
						</view>
					</picker>
				</view>
				
				<!-- 结束时间 -->
				<view class="time-item">
					<text class="time-label">结束时间</text>
					<picker class="date-picker" mode="date" :value="endDate" @change="onEndDateChange">
						<view class="time-picker">
							<text class="time-text">{{endDate || '选择结束日期'}}</text>
							<text class="time-arrow">📅</text>
						</view>
					</picker>
				</view>
			</view>
		</view>
		
		<!-- 备注输入 -->
		<view class="note-section">
			<text class="section-title">补充说明（可选）</text>
			<textarea class="note-input" 
					  v-model="note" 
					  placeholder="可以补充一些经历的背景信息..." 
					  maxlength="200"/>
		</view>
		
		<!-- AI分类结果预览 -->
		<view v-if="aiClassification" class="ai-preview-section">
			<text class="section-title">AI分类结果</text>
			<view class="classification-result">
				<view class="classification-tag">
					<text class="tag-text">{{aiClassification.category}}</text>
				</view>
				<text class="summary-text">{{aiClassification.summary}}</text>
			</view>
		</view>
		
		<!-- 保存按钮 -->
		<view class="save-section">
		  <button class="save-btn" @click="saveRecord" :disabled="!canSave">
		    保存经历
		  </button>
		  <view class="status-info" style="font-size: 12px; color: #666; text-align: center; margin-top: 10rpx;">
		    状态: {{canSave ? '可保存' : '不可保存'}} | 
		    文件: {{selectedFile ? '✓' : '✗'}} | 
		    AI分析: {{aiClassification ? '✓' : '✗'}}
		  </view>
		</view>
	</view>
</template>

<script>
	const API_BASE = 'http://localhost:3000';
	export default {
	data() {
	    return {
	      //本地显示字段
	      selectedFile: null,
	      startDate: '',
	      endDate: '',
	      note: '',
	      dragOver: false,
	      editingRecordId: null,
	      aiClassification: null,
	      experienceCategories: [
	        { id: 1, name: '学生工作', icon: '👥' },
	        { id: 2, name: '科研项目', icon: '🔬' },
	        { id: 3, name: '实习经历', icon: '💼' },
	        { id: 4, name: '荣誉奖励', icon: '🏆' }
	      ],
	    };
	  },

		
		computed: {
			canSave() {
				return this.selectedFile && this.startDate&& this.aiClassification
			}
		},
		
		onLoad(options) {
				uni.setNavigationBarTitle({
					title: '添加经历'
				})
				// 设置默认开始时间为当前时间
				const now = new Date()
				this.startDate = this.formatDateForPicker(now)
		},
		
		methods: {
			// 选择文件
			chooseFile() {
				uni.chooseFile({
					count: 1,
					type: 'all',
					success: (res) => {
						const file = res.tempFiles[0]
						this.selectedFile = file
						this.processFileWithAI(file)
					}
				})
			},
			
			// 处理文件拖放
			handleFileDrop(event) {
				event.preventDefault()
				this.dragOver = false
				const files = event.dataTransfer.files
				if (files && files.length > 0) {
					this.selectedFile = files[0]
					this.processFileWithAI(files[0])
				}
			},
			
			async processFileWithAI(file) {
			  try {
			    // 调用AI分析，但不保存
			    const classification = await this.callAIClassificationAPI(file)
			
			    // 只更新页面显示，不保存到数据库
			    this.aiClassification = {
			      category: classification.category,
			      summary: classification.summary,
			      confidence: classification.confidence || null
			    }
			
			    uni.showToast({ title: 'AI分析完成', icon: 'success' })
			  } catch (error) {
			    uni.showToast({ title: 'AI分析失败', icon: 'error' })
			    console.error('AI分析失败:', error)
			  }
			},
			
			// 调用AI分类API（只分析，不保存）
			async callAIClassificationAPI(file) {
			  return new Promise((resolve, reject) => {
			    uni.showLoading({ title: 'AI分析中...' });
			
			    uni.uploadFile({
			      url: `${API_BASE}/api/ai/classify`,
			      filePath: file.path || file.tempFilePath || file,
			      name: 'file',
			      success: (uploadRes) => {
			        let payload;
			        try {
			          payload = JSON.parse(uploadRes.data);
			        } catch (e) {
			          uni.hideLoading();
			          return reject(new Error('后端返回不是 JSON：' + String(uploadRes.data).slice(0, 200)));
			        }
			
			        // HTTP 200 -> 期望 { success: true, data: {...} }
			        if (uploadRes.statusCode === 200 && payload && payload.success) {
			          const first = Array.isArray(payload.data?.experiences)
			            ? payload.data.experiences[0]
			            : payload.data;
			          if (!first || !first.category || !first.summary) {
			            uni.hideLoading();
			            return reject(new Error('AI 未返回有效的 category/summary'));
			          }
			          uni.hideLoading();
			          
			          // 只返回分析结果，不保存到数据库
			          return resolve({
			            category: first.category,
			            summary: first.summary,
			            confidence: (typeof first.confidence === 'number') ? first.confidence : null
			          });
			        }
			
			        // 非 200 或 success=false -> 显示后端 details
			        const backendMsg = payload?.details || payload?.error || `HTTP ${uploadRes.statusCode}`;
			        uni.hideLoading();
			        return reject(new Error(backendMsg));
			      },
			      fail: (err) => {
			        uni.hideLoading();
			        reject(new Error('上传失败：' + (err?.errMsg || '未知错误')));
			      }
			    });
			  });
			},
			
			// 移除文件
			removeFile() {
				this.selectedFile = null
				this.aiClassification = null
			},
			
			// 格式化文件大小
			formatFileSize(bytes) {
				if (bytes === 0) return '0 B'
				const k = 1024
				const sizes = ['B', 'KB', 'MB', 'GB']
				const i = Math.floor(Math.log(bytes) / Math.log(k))
				return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
			},
			
			onStartDateChange(e) {
				this.startDate = e.detail.value
			},
			
			onEndDateChange(e) {
				this.endDate = e.detail.value
			},
			
			formatDateForPicker(date) {
				const year = date.getFullYear()
				const month = (date.getMonth() + 1).toString().padStart(2, '0')
				const day = date.getDate().toString().padStart(2, '0')
				return `${year}-${month}-${day}`
			},
			
			// 加载编辑的记录
			loadEditRecord(recordId) {
				const records = uni.getStorageSync('experienceRecords') || []
				const record = records.find(item => item.id == recordId)
				
				if (record) {
					this.selectedFile = {
						name: record.fileName,
						size: record.fileSize
					}
					this.startDate = record.startDate
					this.endDate = record.endDate
					this.note = record.note || ''
					this.aiClassification = {
						category: record.category,
						summary: record.summary
					}
				}
			},
			
			
			// 保存记录
			saveRecord() {
			  console.log('点击保存按钮，当前状态:', {
			    canSave: this.canSave,
			    selectedFile: !!this.selectedFile,
			    startDate: this.startDate,
			    aiClassification: this.aiClassification
			  });
			  
			  if (!this.canSave) {
			    uni.showToast({
			      title: '请上传文件并等待AI分析完成',
			      icon: 'none'
			    })
			    return;
			  }
			  
			  console.log('开始保存到数据库...');
			  this.createRecord()
			
			},
			
			// 创建新记录
			async createRecord() {
			  // 从AI分析结果获取数据
			  const category = this.aiClassification?.category || '未分类';
			  const summary = this.aiClassification?.summary || '等待AI分析';
			  const confidence = (typeof this.aiClassification?.confidence === 'number')
			    ? this.aiClassification.confidence
			    : null;
			
			  console.log('准备保存到数据库:', { category, summary, confidence });
			
			  try {
			    uni.showLoading({ title: '保存中...' });
			    //调用保存API
			    const res = await uni.request({
			      url: `${API_BASE}/api/experience/add`,
			      method: 'POST',
			      header: { 'Content-Type': 'application/json' },
			      data: { category, summary, confidence }
			    });
			
			    uni.hideLoading();
			    console.log('保存成功，响应:', res);
			    uni.showToast({ title: '经历已保存', icon: 'success' });
			
			    // 延时返回
			    setTimeout(() => {
			      uni.navigateBack();
			    }, 1500);
			  } catch (e) {
			    uni.hideLoading();
			    console.error('创建失败：', e);
			    uni.showToast({ title: '保存失败', icon: 'none' });
			  }
			},
			
			
			// 获取文件类型
			getFileType(filename) {
				const ext = filename.split('.').pop().toLowerCase()
				const typeMap = {
					'txt': '文本文件',
					'xlsx': 'Excel文件',
					'csv': 'CSV文件',
					'jpg': '图片文件',
					'jpeg': '图片文件',
					'png': '图片文件',
					'pdf': 'PDF文件'
				}
				return typeMap[ext] || '文件'
			}
		}
	}
</script>

<style>
	.container {
		background-color: #F5F5F5;
		min-height: 100vh;
		padding: 20rpx;
	}
	
	.page-header {
		text-align: center;
		padding: 20rpx 0 30rpx 0;
	}
	
	.page-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}
	
	.upload-section, .time-section, .note-section, .ai-preview-section {
		background-color: white;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
	}
	
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 30rpx;
		display: block;
	}
	
	.upload-area {
		border: 2px dashed #ccc;
		border-radius: 15rpx;
		padding: 60rpx 30rpx;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.upload-area.drag-over {
		border-color: #667eea;
		background-color: #F8F9FF;
	}
	
	.upload-icon {
		font-size: 60rpx;
		margin-bottom: 20rpx;
		display: block;
	}
	
	.upload-text {
		font-size: 28rpx;
		color: #333;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.upload-hint {
		font-size: 24rpx;
		color: #999;
	}
	
	.file-list {
		margin-top: 20rpx;
	}
	
	.file-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx;
		background-color: #F8F9FA;
		border-radius: 10rpx;
		border: 1px solid #E9ECEF;
	}
	
	.file-name {
		flex: 1;
		font-size: 26rpx;
		color: #333;
		margin-right: 15rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.file-size {
		font-size: 22rpx;
		color: #666;
		margin-right: 15rpx;
	}
	
	.remove-btn {
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background-color: #FF6B6B;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24rpx;
		cursor: pointer;
	}
	
	.time-container {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}
	
	.time-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	
	.time-label {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
	}
	
	.time-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx;
		background-color: #F8F8F8;
		border-radius: 10rpx;
		border: 2rpx solid #E0E0E0;
		min-width: 250rpx;
	}
	
	.time-text {
		font-size: 26rpx;
		color: #333;
	}
	
	.time-arrow {
		font-size: 24rpx;
		color: #667eea;
	}
	
	.note-input {
		width: 100%;
		min-height: 120rpx;
		font-size: 28rpx;
		line-height: 1.5;
		border: none;
		resize: none;
		outline: none;
		background: transparent;
	}
	
	.classification-result {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 15rpx;
		padding: 30rpx;
		color: white;
	}
	
	.classification-tag {
		display: inline-block;
		background: rgba(255, 255, 255, 0.2);
		padding: 8rpx 20rpx;
		border-radius: 20rpx;
		margin-bottom: 20rpx;
	}
	
	.tag-text {
		font-size: 24rpx;
		font-weight: bold;
	}
	
	.summary-text {
		font-size: 26rpx;
		line-height: 1.4;
	}
	
	.save-section {
		margin-top: 40rpx;
	}
	
	.save-btn {
		width: 100%;
		background: linear-gradient(45deg, #4ECDC4, #44A08D);
		color: white;
		border: none;
		border-radius: 50rpx;
		padding: 30rpx;
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.save-btn[disabled] {
		background: #CCC;
		color: #999;
	}
</style>