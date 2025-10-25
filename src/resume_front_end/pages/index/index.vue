<template>
	<view class="container">
		<!-- 顶部时间显示区域 -->
		<view class="time-display-section">
			<view class="time-background">
				<text class="current-date">{{currentDate}}</text>
				<text class="current-time">{{currentTime}}</text>
				<text class="time-greeting">{{greeting}}</text>
			</view>
		</view>

		<!-- 统计卡片 -->
		<view class="stats-card">
			<view class="stats-header">
				<text class="stats-title">我的经历档案</text>
				<view class="add-record-btn" @click="goToAdd">
					<text class="add-icon">＋</text>
					<text class="add-text">记一笔</text>
				</view>
			</view>
			
			<!-- 主要统计信息 -->
			<view class="main-stats">
				<view class="stat-item">
					<text class="stat-number">{{totalRecords}}</text>
					<text class="stat-label">总经历数</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{activeCategories}}</text>
					<text class="stat-label">经历类型</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{totalFiles}}</text>
					<text class="stat-label">文件总数</text>
				</view>
			</view>
			
			<!-- 分类统计 -->
			<view class="category-stats">
				<text class="category-title">经历分类统计</text>
				<view class="category-grid">
					<view v-for="category in categoryStats" :key="category.name" class="category-item">
						<text class="category-icon">{{getCategoryIcon(category.name)}}</text>
						<text class="category-name">{{category.name}}</text>
						<text class="category-count">{{category.count}}条</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 经历列表 -->
		<view class="record-list-section">
			<view class="section-header">
				<text class="section-title">最近经历</text>
				<view class="filter-options">
					<picker class="filter-picker" mode="selector" :range="timeFilterOptions" :value="selectedTimeFilter" @change="onTimeFilterChange">
						<view class="picker-display">{{timeFilterOptions[selectedTimeFilter]}}</view>
					</picker>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-if="filteredRecords.length === 0" class="empty-state">
				<view class="empty-icon">📝</view>
				<text class="empty-text">还没有经历记录</text>
				<text class="empty-hint">点击上方"记一笔"开始记录</text>
			</view>

			<!-- 经历列表 -->
			<view v-else class="records-container">
				<view v-for="record in filteredRecords" :key="record.id" class="record-item">
					<view class="record-left" @click="viewRecordDetail(record)">
						<view class="record-category">
							<text class="category-icon">{{getCategoryIcon(record.category)}}</text>
							<text class="category-name">{{record.category}}</text>
							<!-- 分类修改按钮 -->
							<view class="category-edit-btn" @click.stop="showCategoryPicker(record)">
								<text class="edit-icon">✏️</text>
							</view>
						</view>
						<text class="record-summary">{{record.summary}}</text>
						<view class="record-meta">
							<text class="record-time">{{formatRecordTime(record.createdTime)}}</text>
							<text class="record-duration">{{record.startDate}} {{record.endDate ? '至 ' + record.endDate : '至今'}}</text>
						</view>
					</view>
					<view class="record-arrow" @click="viewRecordDetail(record)">›</view>
				</view>
			</view>
		</view>

		<!-- 生成简历按钮 -->
		<view class="generate-resume-section">
			<button class="generate-btn" @click="generateResume" :disabled="totalRecords === 0">
				<text class="btn-icon">📄</text>
				<text class="btn-text">生成简历</text>
			</button>
		</view>

		<!-- 分类选择弹窗 -->
		<view v-if="showCategoryModal" class="category-modal">
			<view class="modal-mask" @click="hideCategoryModal"></view>
			<view class="modal-content">
				<view class="modal-header">
					<text class="modal-title">修改分类</text>
					<view class="modal-close" @click="hideCategoryModal">×</view>
				</view>
				<view class="modal-body">
					<text class="modal-hint">为经历选择正确的分类：</text>
					<view class="category-options">
						<view 
							v-for="category in availableCategories" 
							:key="category.name"
							class="category-option"
							:class="{ 'selected': selectedCategory === category.name }"
							@click="selectCategory(category)"
						>
							<text class="option-icon">{{category.icon}}</text>
							<text class="option-name">{{category.name}}</text>
						</view>
					</view>
				</view>
				<view class="modal-footer">
					<button class="modal-btn cancel" @click="hideCategoryModal">取消</button>
					<button class="modal-btn confirm" @click="confirmCategoryChange" :disabled="!selectedCategory">确认修改</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				currentDate: '',
				currentTime: '',
				greeting: '',
				totalRecords: 0,
				activeCategories: 0,
				totalFiles: 0,
				allRecords: [],
				filteredRecords: [],
				selectedTimeFilter: 0,
				timeFilterOptions: ['全部时间', '最近一周', '最近一月', '最近三月'],
				// 分类修改相关
				showCategoryModal: false,
				editingRecord: null,
				selectedCategory: '',
				// 可用分类
				availableCategories: [
					{ name: '学生工作', icon: '👥' },
					{ name: '科研项目', icon: '🔬' },
					{ name: '实习经历', icon: '💼' },
					{ name: '荣誉奖励', icon: '🏆' }
				],
				timer: null
			}
		},

		computed: {
			// 分类统计
			categoryStats() {
				const stats = {}
				this.allRecords.forEach(record => {
					const category = record.category || '未分类'
					if (!stats[category]) {
						stats[category] = 0
					}
					stats[category]++
				})

				// 确保所有分类都显示，即使数量为0
				const allCategories = ['学生工作', '科研项目', '实习经历', '荣誉奖励']
				return allCategories.map(category => ({
					name: category,
					count: stats[category] || 0,
					icon: this.getCategoryIcon(category)
				}))
			}
		},

		onLoad() {
			this.loadData()
			this.startTimeUpdate()
		},

		onShow() {
			this.loadData()
		},

		onUnload() {
			if (this.timer) {
				clearInterval(this.timer)
			}
		},

		methods: {
			// 更新时间显示
			startTimeUpdate() {
				this.updateTime()
				this.timer = setInterval(() => {
					this.updateTime()
				}, 1000)
			},

			updateTime() {
				const now = new Date()
				
				// 格式化日期
				const year = now.getFullYear()
				const month = now.getMonth() + 1
				const day = now.getDate()
				const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
				const weekday = weekdays[now.getDay()]
				
				this.currentDate = `${year}年${month}月${day}日 ${weekday}`
				
				// 格式化时间
				const hours = now.getHours().toString().padStart(2, '0')
				const minutes = now.getMinutes().toString().padStart(2, '0')
				const seconds = now.getSeconds().toString().padStart(2, '0')
				this.currentTime = `${hours}:${minutes}:${seconds}`
				
				// 问候语
				const hour = now.getHours()
				if (hour < 6) {
					this.greeting = '夜深了，注意休息'
				} else if (hour < 9) {
					this.greeting = '早上好，开启新的一天'
				} else if (hour < 12) {
					this.greeting = '上午好，保持专注'
				} else if (hour < 14) {
					this.greeting = '中午好，适当休息'
				} else if (hour < 18) {
					this.greeting = '下午好，继续努力'
				} else if (hour < 22) {
					this.greeting = '晚上好，回顾今天'
				} else {
					this.greeting = '晚安，明天会更好'
				}
			},

			loadData() {
				// 从本地存储加载数据
				const records = uni.getStorageSync('experienceRecords') || []
				this.allRecords = records.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))
				
				this.filterRecords()
				this.calculateStats()
			},

			calculateStats() {
				this.totalRecords = this.allRecords.length
				this.totalFiles = this.allRecords.reduce((sum, record) => sum + 1, 0)
				
				// 计算活跃分类数量
				const uniqueCategories = new Set(this.allRecords.map(record => record.category))
				this.activeCategories = uniqueCategories.size
			},

			// 筛选记录
			filterRecords() {
				let filteredRecords = this.allRecords
				
				// 时间筛选
				if (this.selectedTimeFilter > 0) {
					filteredRecords = this.filterByTime(filteredRecords)
				}
				
				this.filteredRecords = filteredRecords
			},

			// 按时间筛选
			filterByTime(records) {
				const now = new Date()
				let startDate = new Date()
				
				switch(this.selectedTimeFilter) {
					case 1: // 最近一周
						startDate.setDate(now.getDate() - 7)
						break
					case 2: // 最近一月
						startDate.setMonth(now.getMonth() - 1)
						break
					case 3: // 最近三月
						startDate.setMonth(now.getMonth() - 3)
						break
				}
				
				return records.filter(record => {
					const recordDate = new Date(record.createdTime)
					return recordDate >= startDate
				})
			},

			// 获取分类图标
			getCategoryIcon(category) {
				const iconMap = {
					'学生工作': '👥',
					'科研项目': '🔬',
					'实习经历': '💼',
					'荣誉奖励': '🏆'
				}
				return iconMap[category] || '📄'
			},

			// 格式化记录时间
			formatRecordTime(timestamp) {
				const date = new Date(timestamp)
				const now = new Date()
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
				const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
				
				if (recordDate.getTime() === today.getTime()) {
					return '今天'
				} else {
					const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
					if (recordDate.getTime() === yesterday.getTime()) {
						return '昨天'
					} else {
						return `${date.getMonth() + 1}月${date.getDate()}日`
					}
				}
			},

			// 分类修改功能
			showCategoryPicker(record) {
				this.editingRecord = record
				this.selectedCategory = record.category
				this.showCategoryModal = true
			},

			hideCategoryModal() {
				this.showCategoryModal = false
				this.editingRecord = null
				this.selectedCategory = ''
			},

			selectCategory(category) {
				this.selectedCategory = category.name
			},

			confirmCategoryChange() {
				if (!this.editingRecord || !this.selectedCategory) return
				
				// 更新记录的分类
				const records = uni.getStorageSync('experienceRecords') || []
				const recordIndex = records.findIndex(item => item.id === this.editingRecord.id)
				
				if (recordIndex !== -1) {
					records[recordIndex].category = this.selectedCategory
					uni.setStorageSync('experienceRecords', records)
					
					uni.showToast({
						title: '分类修改成功',
						icon: 'success'
					})
					
					// 重新加载数据
					this.loadData()
				}
				
				this.hideCategoryModal()
			},

			// 事件处理
			onTimeFilterChange(e) {
				this.selectedTimeFilter = e.detail.value
				this.filterRecords()
			},

			goToAdd() {
				uni.navigateTo({
					url: '/pages/add/add'
				})
			},

			viewRecordDetail(record) {
				uni.navigateTo({
					url: `/pages/detail/detail?id=${record.id}`
				})
			},

			generateResume() {
				if (this.totalRecords === 0) {
					uni.showToast({
						title: '请先添加经历记录',
						icon: 'none'
					})
					return
				}
				// 模拟简历生成过程
				setTimeout(() => {
					uni.hideLoading()
					uni.showModal({
						title: '简历即将生成',
						content: '跳转至简历生成页面',
						success: (res) => {
							if (res.confirm) {
								uni.navigateTo({
									url: '/pages/Make_presume/Make_presume'
								})
							}
						}
					})
				}, 2000)
			},

			// 底部导航栏跳转
			goHome() {
				uni.switchTab({
					url: '/pages/index/index'
				})
			},
			goAI() {
				uni.switchTab({
					url: '/pages/chat/chat'
				})
			},
			goAbility() {
				uni.switchTab({
					url: '/pages/statistics/statistics'
				})
			},
			goMy() {
				uni.switchTab({
					url:'/pages/my/my'
				})
			}
		}
	}
</script>

<style scoped>
	.container {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
		padding: 0;
		padding-bottom: 120rpx; /* 为底部导航栏留出空间 */
	}

	/* 时间显示区域 */
	.time-display-section {
		padding: 60rpx 30rpx 40rpx 30rpx;
	}

	.time-background {
		text-align: center;
		color: white;
	}

	.current-date {
		display: block;
		font-size: 36rpx;
		font-weight: 300;
		margin-bottom: 10rpx;
		opacity: 0.9;
	}

	.current-time {
		display: block;
		font-size: 72rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		letter-spacing: 2rpx;
	}

	.time-greeting {
		display: block;
		font-size: 28rpx;
		opacity: 0.8;
	}

	/* 统计卡片 */
	.stats-card {
		background: white;
		margin: 0 30rpx;
		border-radius: 20rpx;
		padding: 40rpx 30rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
	}

	.stats-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 40rpx;
	}

	.stats-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}

	.add-record-btn {
		display: flex;
		align-items: center;
		background: linear-gradient(45deg, #FF9845, #F9BE25);
		padding: 15rpx 25rpx;
		border-radius: 50rpx;
		color: white;
		font-size: 24rpx;
	}

	.add-icon {
		font-size: 28rpx;
		margin-right: 8rpx;
		font-weight: bold;
	}

	/* 主要统计信息 */
	.main-stats {
		display: flex;
		justify-content: space-around;
		margin-bottom: 40rpx;
		padding-bottom: 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.stat-item {
		text-align: center;
	}

	.stat-number {
		display: block;
		font-size: 42rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 8rpx;
	}

	.stat-label {
		font-size: 24rpx;
		color: #666;
	}

	/* 分类统计 */
	.category-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #333;
		margin-bottom: 25rpx;
		display: block;
	}

	.category-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20rpx;
	}

	.category-item {
		display: flex;
		align-items: center;
		padding: 20rpx;
		background: #f8f9fa;
		border-radius: 12rpx;
	}

	.category-icon {
		font-size: 36rpx;
		margin-right: 15rpx;
	}

	.category-name {
		flex: 1;
		font-size: 26rpx;
		color: #333;
	}

	.category-count {
		font-size: 24rpx;
		color: #666;
		font-weight: 500;
	}

	/* 经历列表区域 */
	.record-list-section {
		background: white;
		margin: 30rpx;
		border-radius: 20rpx;
		padding: 40rpx 30rpx;
		box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
		margin-top: 30rpx;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}

	.filter-picker {
		background: #f8f9fa;
		padding: 12rpx 20rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		color: #666;
	}

	/* 空状态 */
	.empty-state {
		text-align: center;
		padding: 80rpx 0;
	}

	.empty-icon {
		font-size: 80rpx;
		display: block;
		margin-bottom: 20rpx;
	}

	.empty-text {
		display: block;
		font-size: 28rpx;
		color: #666;
		margin-bottom: 10rpx;
	}

	.empty-hint {
		display: block;
		font-size: 24rpx;
		color: #999;
	}

	/* 经历列表 */
	.records-container {
		max-height: 600rpx;
		overflow-y: auto;
	}

	.record-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
	}

	.record-item:last-child {
		border-bottom: none;
	}

	.record-left {
		flex: 1;
	}

	.record-category {
		display: flex;
		align-items: center;
		margin-bottom: 15rpx;
		position: relative;
	}

	.record-category .category-icon {
		font-size: 28rpx;
		margin-right: 10rpx;
	}

	.record-category .category-name {
		font-size: 24rpx;
		color: #666;
		font-weight: 500;
		margin-right: 10rpx;
	}

	.category-edit-btn {
		padding: 4rpx 8rpx;
		border-radius: 6rpx;
		background: #f0f0f0;
		cursor: pointer;
	}

	.edit-icon {
		font-size: 20rpx;
	}

	.record-summary {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 15rpx;
		line-height: 1.4;
	}

	.record-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.record-time {
		font-size: 22rpx;
		color: #999;
	}

	.record-duration {
		font-size: 22rpx;
		color: #666;
	}

	.record-arrow {
		font-size: 36rpx;
		color: #ccc;
		margin-left: 20rpx;
	}

	/* 生成简历按钮 */
	.generate-resume-section {
		padding: 40rpx 30rpx;
	}

	.generate-btn {
		width: 100%;
		background: linear-gradient(45deg, #4ECDC4, #44A08D);
		color: white;
		border: none;
		border-radius: 50rpx;
		padding: 30rpx;
		font-size: 32rpx;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.generate-btn[disabled] {
		background: #ccc;
		color: #999;
	}

	.btn-icon {
		font-size: 36rpx;
		margin-right: 15rpx;
	}

	/* 底部导航栏 */
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 100rpx;
		display: flex;
		justify-content: space-around;
		align-items: center;
		background-color: #fff;
		border-top: 1rpx solid #eee;
		padding: 0 20rpx;
		box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 10rpx;
		color: #777;
		font-size: 20rpx;
	}

	.nav-icon {
		font-size: 36rpx;
		margin-bottom: 4rpx;
	}

	.nav-text {
		font-size: 20rpx;
	}

	.nav-item.active {
		color: #FF9845;
	}

	.add-btn {
		width: 80rpx;
		height: 80rpx;
		background: linear-gradient(135deg, #ff9845, #f9be25);
		color: #fff;
		font-size: 40rpx;
		font-weight: bold;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		top: -20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.2);
	}

	/* 分类修改弹窗 */
	.category-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
	}

	.modal-mask {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
	}

	.modal-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: white;
		border-radius: 30rpx 30rpx 0 0;
		padding: 40rpx;
		transform: translateY(0);
		animation: slideUp 0.3s ease;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30rpx;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}

	.modal-close {
		font-size: 40rpx;
		color: #999;
		padding: 10rpx;
	}

	.modal-hint {
		display: block;
		font-size: 26rpx;
		color: #666;
		margin-bottom: 30rpx;
	}

	.category-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20rpx;
		margin-bottom: 40rpx;
	}

	.category-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30rpx 20rpx;
		border: 2rpx solid #f0f0f0;
		border-radius: 15rpx;
		background: #fafafa;
		transition: all 0.3s ease;
	}

	.category-option.selected {
		border-color: #4ECDC4;
		background: #f0f9f8;
	}

	.option-icon {
		font-size: 48rpx;
		margin-bottom: 15rpx;
	}

	.option-name {
		font-size: 26rpx;
		color: #333;
		font-weight: 500;
	}

	.modal-footer {
		display: flex;
		gap: 20rpx;
	}

	.modal-btn {
		flex: 1;
		padding: 25rpx;
		border-radius: 15rpx;
		font-size: 28rpx;
		font-weight: 500;
	}

	.modal-btn.cancel {
		background: #f8f9fa;
		color: #666;
		border: 1rpx solid #e9ecef;
	}

	.modal-btn.confirm {
		background: #4ECDC4;
		color: white;
		border: none;
	}

	.modal-btn.confirm[disabled] {
		background: #ccc;
		color: #999;
	}
</style>