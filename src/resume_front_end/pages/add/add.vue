<template>
	<view class="container">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title">{{isEditMode ? '编辑经历' : '添加经历'}}</text>
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
				{{isEditMode ? '更新经历' : '保存经历'}}
			</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				selectedFile: null,
				startDate: '',
				endDate: '',
				note: '',
				dragOver: false,
				isEditMode: false,
				editingRecordId: null,
				aiClassification: null,
				// 经历分类选项
				experienceCategories: [
					{id: 1, name: '学生工作', icon: '👥'},
					{id: 2, name: '科研项目', icon: '🔬'},
					{id: 3, name: '实习经历', icon: '💼'},
					{id: 4, name: '荣誉奖励', icon: '🏆'}
				]
			}
		},
		
		computed: {
			canSave() {
				return this.selectedFile && this.startDate
			}
		},
		
		onLoad(options) {
			if (options && options.editId) {
				this.isEditMode = true
				this.editingRecordId = options.editId
				uni.setNavigationBarTitle({
					title: '编辑经历'
				})
				this.loadEditRecord(options.editId)
			} else {
				uni.setNavigationBarTitle({
					title: '添加经历'
				})
				// 设置默认开始时间为当前时间
				const now = new Date()
				this.startDate = this.formatDateForPicker(now)
			}
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
			
			// 使用AI处理文件并分类
			async processFileWithAI(file) {
				// 显示加载状态
				uni.showLoading({
					title: 'AI分析中...'
				})
				
				try {
					// 这里调用后端AI接口进行文件分析和分类
					const classification = await this.callAIClassificationAPI(file)
					this.aiClassification = classification
					
					uni.hideLoading()
					uni.showToast({
						title: 'AI分析完成',
						icon: 'success'
					})
				} catch (error) {
					uni.hideLoading()
					uni.showToast({
						title: 'AI分析失败',
						icon: 'error'
					})
					console.error('AI分析失败:', error)
				}
			},
			
			// 调用AI分类API（需要对接后端）
			async callAIClassificationAPI(file) {
				// 模拟AI分类结果 - 实际项目中这里需要调用真实的后端API
				return new Promise((resolve) => {
					setTimeout(() => {
						// 模拟AI分析结果
						const categories = ['学生工作', '科研项目', '实习经历', '荣誉奖励']
						const randomCategory = categories[Math.floor(Math.random() * categories.length)]
						
						const summaries = {
							'学生工作': '担任学生干部，组织校园活动，展现领导力和组织能力',
							'科研项目': '参与学术研究项目，具备科研能力和创新思维',
							'实习经历': '在企业实习，积累工作经验，提升职业素养',
							'荣誉奖励': '获得表彰奖励，证明优秀表现和突出成就'
						}
						
						resolve({
							category: randomCategory,
							summary: summaries[randomCategory],
							confidence: (Math.random() * 0.3 + 0.7).toFixed(2) // 70%-100%的置信度
						})
					}, 1500)
				})
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
				if (!this.canSave) {
					uni.showToast({
						title: '请上传文件并选择开始时间',
						icon: 'none'
					})
					return
				}
				
				if (this.isEditMode) {
					this.updateRecord()
				} else {
					this.createRecord()
				}
			},
			
			// 创建新记录
			createRecord() {
				const record = {
					id: Date.now().toString(),
					fileName: this.selectedFile.name,
					fileSize: this.selectedFile.size,
					fileType: this.selectedFile.type || this.getFileType(this.selectedFile.name),
					startDate: this.startDate,
					endDate: this.endDate,
					note: this.note.trim(),
					category: this.aiClassification ? this.aiClassification.category : '未分类',
					summary: this.aiClassification ? this.aiClassification.summary : '等待AI分析',
					createdTime: new Date().toISOString(),
					// 文件内容（实际项目中可能需要上传到服务器）
					fileContent: '文件已上传，等待进一步处理' // 这里可以存储文件路径或内容
				}
				
				// 保存到本地存储
				const records = uni.getStorageSync('experienceRecords') || []
				records.push(record)
				uni.setStorageSync('experienceRecords', records)
				
				uni.showToast({
					title: '经历已保存',
					icon: 'success'
				})
				
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
			},
			
			// 更新记录
			updateRecord() {
				const records = uni.getStorageSync('experienceRecords') || []
				const recordIndex = records.findIndex(item => item.id == this.editingRecordId)
				
				if (recordIndex === -1) {
					uni.showToast({
						title: '记录不存在',
						icon: 'error'
					})
					return
				}
				
				const updatedRecord = {
					...records[recordIndex],
					fileName: this.selectedFile.name,
					fileSize: this.selectedFile.size,
					startDate: this.startDate,
					endDate: this.endDate,
					note: this.note.trim(),
					category: this.aiClassification ? this.aiClassification.category : records[recordIndex].category,
					summary: this.aiClassification ? this.aiClassification.summary : records[recordIndex].summary
				}
				
				records[recordIndex] = updatedRecord
				uni.setStorageSync('experienceRecords', records)
				
				uni.showToast({
					title: '经历已更新',
					icon: 'success'
				})
				
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
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