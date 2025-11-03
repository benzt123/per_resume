<template>
	<view class="container">
		<!-- 岗位选择器 -->
		<view class="job-selector">
			<input 
				v-model="targetJob" 
				placeholder="请输入目标岗位名称" 
				class="job-input"
				@confirm="fetchAnalysis"
			/>
			<button @click="fetchAnalysis" :disabled="loading" class="analyze-btn">
				{{ loading ? '分析中...' : '开始分析' }}
			</button>
		</view>

		<!-- 分析结果加载状态 -->
		<view v-if="loading" class="loading-state">
			<text class="loading-text">AI 正在分析您的能力与 "{{ targetJob }}" 岗位的匹配度...</text>
		</view>

		<!-- 分析结果展示 -->
		<view v-else-if="analysisResult" class="analysis-result">
			<!-- 总体评价卡片 -->
			<view class="summary-card">
				<text class="summary-title">总体评价</text>
				<text class="summary-overall">{{ analysisResult.summary.overallMatch }}</text>
				<view v-if="analysisResult.summary.strengths && analysisResult.summary.strengths.length > 0" class="summary-section">
					<text class="section-title">优势</text>
					<view v-for="(strength, index) in analysisResult.summary.strengths" :key="'strength_' + index" class="summary-item">
						<text class="item-dot">•</text>
						<text class="item-text">{{ strength }}</text>
					</view>
				</view>
				<view v-if="analysisResult.summary.weaknesses && analysisResult.summary.weaknesses.length > 0" class="summary-section">
					<text class="section-title">待提升</text>
					<view v-for="(weakness, index) in analysisResult.summary.weaknesses" :key="'weakness_' + index" class="summary-item">
						<text class="item-dot">•</text>
						<text class="item-text">{{ weakness }}</text>
					</view>
				</view>
			</view>

			<!-- 能力雷达图 (模拟) -->
			<view class="radar-section">
				<text class="section-title">能力雷达图</text>
				<view class="radar-container">
					<!-- 这里可以用 uCharts 或其他图表库绘制真正的雷达图 -->
					<!-- 为简化，先用列表模拟 -->
					<view class="radar-list">
						<view v-for="(cap, index) in analysisResult.capabilities" :key="cap.name" class="radar-item">
							<view class="radar-item-left">
								<text class="radar-name">{{ cap.name }}</text>
								<text class="radar-relevance">{{ cap.relevance }}</text>
							</view>
							<view class="radar-item-right">
								<text class="radar-level" :class="getLevelClass(cap.level)">{{ cap.level }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 详细能力列表 -->
			<view class="capabilities-section">
				<text class="section-title">详细能力分析</text>
				<view v-for="(cap, index) in analysisResult.capabilities" :key="cap.name" class="capability-item">
					<view class="capability-header">
						<text class="capability-name">{{ cap.name }}</text>
						<view class="capability-level-badge" :class="getLevelClass(cap.level)">
							<text class="badge-text">{{ cap.level }}</text>
						</view>
					</view>
					<view class="capability-details">
						<view v-if="cap.evidence && cap.evidence.length > 0" class="evidence-section">
							<text class="detail-title">已有经验:</text>
							<view v-for="(e, eIndex) in cap.evidence" :key="eIndex" class="evidence-item">
								<text class="evidence-text">{{ e }}</text>
							</view>
						</view>
						<view v-if="cap.improvement" class="improvement-section">
							<text class="detail-title">提升建议:</text>
							<text class="improvement-text">{{ cap.improvement }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 改进建议 -->
			<view class="suggestions-section">
				<text class="section-title">改进建议</text>
				<view v-for="(suggestion, index) in analysisResult.suggestions" :key="index" class="suggestion-item">
					<view class="suggestion-type">{{ suggestion.type }}</view>
					<text class="suggestion-desc">{{ suggestion.description }}</text>
				</view>
			</view>

			<!-- 刷新按钮 -->
			<view class="refresh-section">
				<button @click="refreshAnalysis" class="refresh-btn">重新分析</button>
				<button @click="clearCache" class="clear-btn">清除缓存</button>
			</view>
		</view>

		<!-- 无结果或错误状态 -->
		<view v-else-if="error" class="error-state">
			<text class="error-text">{{ error }}</text>
			<button @click="fetchAnalysis" class="retry-btn">重试</button>
		</view>
		<view v-else class="empty-state">
			<text class="empty-text">请输入目标岗位并点击 "开始分析" 以查看能力图分析结果</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			targetJob: '',
			analysisResult: null,
			loading: false,
			error: null
		}
	},
	onLoad() {
		// --- 保持不变 ---
		const savedResumes = uni.getStorageSync('myResumes') || [];
		
		if (savedResumes.length > 0) {
			const latestResume = savedResumes[0]; 
			const title = latestResume.title || '';
			const jobMatch = title.match(/.*?的?\s*([^-—\s\d（）\(\)]+)\s*简历/); 

			if (jobMatch && jobMatch[1]) {
				this.targetJob = jobMatch[1].trim();
			} else {
				const parts = title.split('-');
				const likelyJob = parts.find(part => 
					/工程师|经理|专员|主管|总监|实习生|设计师|分析师|顾问|开发|产品|运营|市场|销售|财务|人事|法务|行政|客服|教师|医生|律师|记者|编辑|翻译|策划|顾问|总监/.test(part)
				);
				this.targetJob = likelyJob || title;
			}
			console.log(`从简历 "${title}" 中提取岗位名: ${this.targetJob}`);
		} else {
			console.log('本地未找到简历，需要手动输入岗位名');
		}
		// --- 保持不变 ---
	},
	methods: {
		// 生成用于本地缓存的键
		getCacheKey(job) {
			return `capability_analysis_${job}`;
		},

async fetchAnalysis() {
			if (!this.targetJob.trim()) {
				uni.showToast({
					title: '请先输入或选择目标岗位',
					icon: 'none'
				});
				return;
			}

			this.loading = true;
			this.error = null;
			const cacheKey = this.getCacheKey(this.targetJob.trim());

			try {
				// 1. 尝试从本地存储获取缓存
				const cachedData = uni.getStorageSync(cacheKey);
				if (cachedData) {
					console.log(`[Frontend Cache] 找到本地缓存，岗位: ${this.targetJob}`);
					this.analysisResult = cachedData;
					uni.showToast({
						title: '加载缓存结果',
						icon: 'success'
					});
					return; // 直接返回缓存结果
				}

				// 2. 如果没有缓存，调用后端 API
				console.log(`[API] 调用后端 API 分析岗位: ${this.targetJob}`);
				const res = await uni.request({
					// 使用 GET 方式，让后端自己查询经历
					url: `http://localhost:3000/api/capability-analysis?job=${encodeURIComponent(this.targetJob.trim())}`,
					method: 'GET'
				});

				// --- 修改开始 ---
				// 检查 HTTP 状态码
				if (res.statusCode === 200) { // 直接使用 res.statusCode
					this.analysisResult = res.data; // 直接使用 res.data
					// 3. 将新结果存入本地存储
					uni.setStorageSync(cacheKey, this.analysisResult);
					console.log(`[Frontend Cache] 分析结果已缓存到本地，岗位: ${this.targetJob}`);
					uni.showToast({
						title: '分析完成',
						icon: 'success'
					});
				} else {
					// 如果 HTTP 状态码不是 200
					throw new Error(res.data?.error || `HTTP Error: ${res.statusCode}`);
				}
				// --- 修改结束 ---
			} catch (err) {
				// 捕获网络错误或上面 throw 的错误
				console.error('获取能力分析失败:', err);
				this.error = err.message || '获取分析结果失败';
				uni.showToast({
					title: '分析失败: ' + this.error,
					icon: 'none',
					duration: 3000
				});
			} finally {
				this.loading = false;
			}
		},

		async refreshAnalysis() {
			if (!this.targetJob.trim()) {
				uni.showToast({
					title: '请先输入岗位名称',
					icon: 'none'
				});
				return;
			}
			// 清除本地缓存
			await this.clearCache();
			// 重新获取
			this.fetchAnalysis();
		},

		async clearCache() {
			if (!this.targetJob.trim()) {
				uni.showToast({
					title: '请先输入岗位名称',
					icon: 'none'
				});
				return;
			}
			const cacheKey = this.getCacheKey(this.targetJob.trim());
			try {
				uni.removeStorageSync(cacheKey); // 删除本地缓存
				console.log(`[Frontend Cache] 已清除本地缓存，岗位: ${this.targetJob}`);
				uni.showToast({
					title: '缓存已清除',
					icon: 'success'
				});
				// 清除本地数据，准备重新获取
				this.analysisResult = null;
			} catch (err) {
				console.error('清除本地缓存失败:', err);
				uni.showToast({
					title: '清除缓存失败',
					icon: 'none'
				});
			}
		},

		// 如果使用 POST 方式且需要前端提供经历数据，实现此方法
		// getCurrentExperiences() {
		//   // 从你的全局状态管理（如 Vuex/Pinia）或通过 API 获取当前经历列表
		//   // 示例：从本地存储获取经历（如果你在其他地方保存了）
		//   const records = uni.getStorageSync('records') || []; // 假设经历在 'records' 中
		//   // 需要将 records 格式化为 AI 分析函数期望的格式
		//   return records.map(r => ({
		//     category: r.categoryName, // 假设 categoryName 对应 category
		//     summary: r.description || r.summary, // 假设 description 或 summary 对应 summary
		//     confidence: r.confidence // 假设有 confidence 字段
		//   }));
		// },

		// 根据能力水平返回对应的 CSS 类
		getLevelClass(level) {
			if (level.includes('精通') || level.includes('熟练')) return 'level-high';
			if (level.includes('了解')) return 'level-medium';
			if (level.includes('缺失')) return 'level-low';
			return ''; // 其他情况无特殊样式
		}
	}
}
</script>

<style>
.container {
	background-color: #f5f5f5;
	min-height: 100vh;
	padding: 20rpx;
}

.job-selector {
	background-color: white;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.job-input {
	border: 2rpx solid #e0e0e0;
	border-radius: 12rpx;
	padding: 20rpx;
	font-size: 28rpx;
}

.analyze-btn {
	background: linear-gradient(45deg, #667eea, #764ba2);
	color: white;
	border: none;
	border-radius: 12rpx;
	padding: 25rpx;
	font-size: 28rpx;
	font-weight: bold;
}

.analyze-btn:disabled {
	background: #cccccc;
	color: #999999;
}

.loading-state, .error-state, .empty-state {
	text-align: center;
	padding: 100rpx 40rpx;
}

.loading-text, .error-text, .empty-text {
	font-size: 28rpx;
	color: #666;
}

.error-text {
	color: #ff4757;
}

.retry-btn, .refresh-btn, .clear-btn {
	background: linear-gradient(45deg, #667eea, #764ba2);
	color: white;
	border: none;
	border-radius: 12rpx;
	padding: 20rpx 30rpx;
	font-size: 26rpx;
	margin: 20rpx 10rpx;
}

.clear-btn {
	background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
}

.refresh-section {
	display: flex;
	gap: 20rpx;
	justify-content: center;
	margin-top: 40rpx;
}

/* 分析结果样式 */
.analysis-result {
	display: flex;
	flex-direction: column;
	gap: 30rpx;
}

.summary-card {
	background-color: white;
	border-radius: 20rpx;
	padding: 30rpx;
}

.summary-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 20rpx;
}

.summary-overall {
	font-size: 28rpx;
	color: #666;
	display: block;
	margin-bottom: 20rpx;
	padding: 15rpx;
	background-color: #f8f9fa;
	border-radius: 12rpx;
}

.summary-section {
	margin-bottom: 15rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 10rpx;
}

.summary-item {
	display: flex;
	align-items: flex-start;
	margin-bottom: 8rpx;
}

.item-dot {
	color: #667eea;
	font-weight: bold;
	margin-right: 10rpx;
}

.item-text {
	font-size: 26rpx;
	color: #666;
	flex: 1;
}

/* 雷达图模拟样式 */
.radar-section {
	background-color: white;
	border-radius: 20rpx;
	padding: 30rpx;
}

.radar-container {
	background-color: #fafafa;
	border-radius: 16rpx;
	padding: 20rpx;
}

.radar-list {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.radar-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15rpx;
	background-color: white;
	border-radius: 12rpx;
	border-left: 6rpx solid #667eea;
}

.radar-item-left {
	flex: 1;
}

.radar-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	display: block;
}

.radar-relevance {
	font-size: 24rpx;
	color: #999;
}

.radar-item-right {
	text-align: right;
}

.radar-level {
	font-size: 24rpx;
	font-weight: bold;
	padding: 6rpx 12rpx;
	border-radius: 16rpx;
}

.level-high {
	background-color: #d4edda;
	color: #155724;
}

.level-medium {
	background-color: #fff3cd;
	color: #856404;
}

.level-low {
	background-color: #f8d7da;
	color: #721c24;
}

/* 详细能力列表样式 */
.capabilities-section {
	background-color: white;
	border-radius: 20rpx;
	padding: 30rpx;
}

.capability-item {
	margin-bottom: 30rpx;
	padding-bottom: 30rpx;
	border-bottom: 1rpx solid #eee;
}

.capability-item:last-child {
	margin-bottom: 0;
	padding-bottom: 0;
	border-bottom: none;
}

.capability-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 15rpx;
}

.capability-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.capability-level-badge {
	padding: 6rpx 12rpx;
	border-radius: 16rpx;
	font-size: 24rpx;
	font-weight: bold;
}

.capability-level-badge.level-high {
	background-color: #d4edda;
	color: #155724;
}

.capability-level-badge.level-medium {
	background-color: #fff3cd;
	color: #856404;
}

.capability-level-badge.level-low {
	background-color: #f8d7da;
	color: #721c24;
}

.capability-details {
	padding-left: 20rpx;
}

.detail-title {
	font-size: 26rpx;
	color: #666;
	font-weight: 500;
	display: block;
	margin-bottom: 8rpx;
}

.evidence-item {
	margin-bottom: 8rpx;
}

.evidence-text, .improvement-text {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
}

/* 改进建议样式 */
.suggestions-section {
	background-color: white;
	border-radius: 20rpx;
	padding: 30rpx;
}

.suggestion-item {
	margin-bottom: 25rpx;
	padding: 20rpx;
	background-color: #f8f9fa;
	border-radius: 12rpx;
	border-left: 4rpx solid #667eea;
}

.suggestion-type {
	font-size: 26rpx;
	font-weight: bold;
	color: #667eea;
	display: block;
	margin-bottom: 8rpx;
}

.suggestion-desc {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
}
</style>