<template>
	<view class="container">
		<!-- 岗位选择器 -->
		<view class="job-selector">
			<textarea
				v-model="targetJob" 
				placeholder="请输入目标岗位名称" 
				class="job-input"
				maxlength="200"
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

			<!-- 能力可视化图表 (使用 uCharts) -->
			<view class="chart-section">
				<text class="section-title">能力分布</text>
				<view class="chart-container">
					<canvas
						v-if="analysisResult.capabilities && analysisResult.capabilities.length > 0"
						id="capabilityChart"
						ref="capabilityChartRef"
						class="q-charts"
						:canvas-id="'capabilityChart'"
						:style="{ width: chartWidth + 'px', height: chartHeight + 'px' }"
						@touchstart="touchStart"
						@touchmove="touchMove"
						@touchend="touchEnd"
					></canvas>
					<view v-else class="empty-chart">
						<text class="empty-text">暂无能力数据</text>
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
// 引入 uCharts
import uCharts from '@qiun/ucharts';

export default {
	data() {
		return {
			// ... (其他 data 不变)
			targetJob: '',
			analysisResult: null,
			loading: false,
			error: null,
			// uCharts 相关
			chartInstance: null,
			chartWidth: 0,
			chartHeight: 0,
			// 添加 canvasId，确保唯一性，虽然 ref 也可以用
			canvasId: 'capabilityChart',
			// 添加一个标志，表示页面是否已经准备好
			pageReady: false 
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
	onReady() {
	  this.pageReady = true;
	},
	watch: {
	  'analysisResult.capabilities': {
		handler(newVal) {
		  if (this.pageReady && newVal && newVal.length > 0) {
			// 等待 DOM 更新后再测量
			this.$nextTick(() => {
			  const query = uni.createSelectorQuery().in(this);
			  query.select('.chart-container').boundingClientRect(data => {
				if (data && data.width > 0) {
				  this.chartWidth = data.width * 0.9;
				  this.chartHeight = 400;
				  this.initChartAndRender(newVal);
				} else {
				  console.warn('未获取到 chart-container 宽高，延迟重试');
				  setTimeout(() => this.renderChart(newVal), 300);
				}
			  }).exec();
			});
		  }
		},
		deep: true
	  }
	},
	methods: {
		// 生成用于本地缓存的键
		getCacheKey(job) {
			return `capability_analysis_${job}`;
		},

		// ... (fetchAnalysis, refreshAnalysis, clearCache 方法不变)
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
					// 不再 return，因为 onReady 或 watch 会处理图表渲染
					// return; 
				} else {
					// 2. 如果没有缓存，调用后端 API
					console.log(`[API] 调用后端 API 分析岗位: ${this.targetJob}`);
					const res = await uni.request({
						url: `http://localhost:3000/api/capability-analysis?job=${encodeURIComponent(this.targetJob.trim())}`,
						method: 'GET'
					});

					if (res.statusCode === 200) {
						this.analysisResult = res.data;
						// 3. 将新结果存入本地存储
						uni.setStorageSync(cacheKey, this.analysisResult);
						console.log(`[Frontend Cache] 分析结果已缓存到本地，岗位: ${this.targetJob}`);
						uni.showToast({
							title: '分析完成',
							icon: 'success'
						});
					} else {
						throw new Error(res.data?.error || `HTTP Error: ${res.statusCode}`);
					}
				}
			} catch (err) {
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

		async initChartAndRender(capabilities) {
			// ... (initChartAndRender 的逻辑不变)
			if (!capabilities || capabilities.length === 0) {
				console.warn('没有能力数据可渲染图表');
				return;
			}

			try {
				await this.$nextTick(); 
				const context = uni.createCanvasContext(this.canvasId, this);

				const categories = capabilities.map(item => item.name);
				const levels = capabilities.map(item => this.getNumericLevel(item.level));
				console.log(categories)
				console.log('uCharts 版本:', uCharts.version);
				const chartConfig = {
					type: 'radar',
					  // ✅ 图例部分
					legend: {
						show: true,
						position: 'bottom',
						float: 'center',
						itemGap: 10,
						padding: 5,
						margin: 10,
						backgroundColor: 'rgba(255,255,255,0)',
						borderColor: 'rgba(0,0,0,0)',
						borderWidth: 0,
						fontColor: '#333333',
						lineHeight: 16,
						format: (name) => `${name}`
					},
					dataLabel: true,
					background: '#FFFFFF',
					pixelRatio: 1,
					rotate: false,
					categories: categories,
					series: [{
						name: '能力水平',
						data: levels,
						color: '#667eea',
					}],
					animation: true,
					width: this.chartWidth,
					height: this.chartHeight,
					context: context,
					canvasId: this.canvasId,
					extra: {
					  radar: {
						max: 4,
						gridType: 'radar',
						gridColor: '#CCCCCC',
						gridSize: 1,
						labelColor: '#333333', // ✅ 设置标签颜色
						labelFontSize: 12,     // ✅ 标签字号
						labelShow: true,
					  },
					}
				};

				if (this.chartInstance) {
					this.chartInstance.dispose();
					this.chartInstance = new uCharts(chartConfig);
				} else {
					this.chartInstance = new uCharts(chartConfig);
				}
			} catch (err) {
				console.error('初始化图表或获取 context 失败:', err);
				uni.showToast({
					title: '图表初始化失败',
					icon: 'none',
					duration: 2000
				});
			}
		},

		// 修改 renderChart 方法，只负责调用 initChartAndRender (因为尺寸和 context 都由 initChartAndRender 处理)
		// 现在 renderChart 只在 watch 中，且 pageReady 为 true 时被调用
		renderChart(capabilities) {
			// 直接调用 initChartAndRender，因为 watch 保证了 pageReady 为 true
			if (capabilities && capabilities.length > 0) {
				this.initChartAndRender(capabilities);
			} else if (this.chartInstance) {
				// 数据为空时，清空图表
				this.chartInstance.dispose();
				this.chartInstance = null;
			}
		},


		// 将能力水平字符串转换为数字，用于图表渲染
		getNumericLevel(levelStr) {
			// 根据你的后端返回格式调整
			if (levelStr.includes('精通')) return 4;
			if (levelStr.includes('熟练')) return 3;
			if (levelStr.includes('了解')) return 2;
			if (levelStr.includes('缺失')) return 1;
			return 0; // 未知级别
		},

		// uCharts 触摸事件处理 (必须)
		touchStart(e) {
			if (this.chartInstance) {
				this.chartInstance.showToolTip(e, {
					format: (item, category) => {
						// 自定义 tooltip 显示内容
						const originalLevel = this.analysisResult.capabilities.find(cap => cap.name === category)?.level;
						return `${category}: ${item.data} (${originalLevel})`;
					}
				});
			}
		},
		touchMove(e) {
			if (this.chartInstance) {
				this.chartInstance.showToolTip(e, {
					format: (item, category) => {
						const originalLevel = this.analysisResult.capabilities.find(cap => cap.name === category)?.level;
						return `${category}: ${item.data} (${originalLevel})`;
					}
				});
			}
		},
		touchEnd(e) {
			// 通常不需要特殊处理
		},

		// ... (其他方法不变)
		async refreshAnalysis() {
			if (!this.targetJob.trim()) {
				uni.showToast({
					title: '请先输入岗位名称',
					icon: 'none'
				});
				return;
			}
			await this.clearCache();
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
				uni.removeStorageSync(cacheKey);
				console.log(`[Frontend Cache] 已清除本地缓存，岗位: ${this.targetJob}`);
				uni.showToast({
					title: '缓存已清除',
					icon: 'success'
				});
				this.analysisResult = null;
				// 清除图表实例
				if (this.chartInstance) {
					this.chartInstance.dispose();
					this.chartInstance = null;
				}
			} catch (err) {
				console.error('清除本地缓存失败:', err);
				uni.showToast({
					title: '清除缓存失败',
					icon: 'none'
				});
			}
		},

		getLevelClass(level) {
			if (level.includes('精通') || level.includes('熟练')) return 'level-high';
			if (level.includes('了解')) return 'level-medium';
			if (level.includes('缺失')) return 'level-low';
			return '';
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
    /* 原有样式 */
    border: 2rpx solid #e0e0e0;
    border-radius: 12rpx;
    padding: 30rpx;
    font-size: 30rpx;
    pointer-events: auto;
    outline: 3rpx solid rgba(102, 126, 234, 0.3);
    outline-offset: 3rpx;

    /* 新增/修改：自适应大小 */
    width: 100%; /* 填充父容器宽度 */
    min-height: 80rpx; /* 设置最小高度，容纳提示文字和一行输入 */
    max-height: 200rpx; /* 设置最大高度，防止内容过多时撑开 */
    height: auto; /* 让高度根据内容和 min/max 调整 */
    resize: vertical; /* 允许用户垂直调整大小（可选） */
    /* resize: none; */ /* 或者禁止用户调整大小 */

    /* 保持文本框外观一致 */
    background-color: white;
    box-sizing: border-box; /* 确保 padding 和 border 包含在 width/height 内 */
    line-height: 1.4; /* 设置行高，改善文字垂直居中感 */
    overflow-y: auto; /* 当内容超过 max-height 时出现垂直滚动条 */
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

/* 图表区域样式 */
.chart-section {
	background-color: white;
	border-radius: 20rpx;
	padding: 30rpx;
}

.chart-container {
	background-color: #fafafa;
	border-radius: 16rpx;
	padding: 20rpx;
	display: flex;
	justify-content: center; /* 居中显示图表 */
	align-items: center; /* 垂直居中 */
	min-height: 440rpx; /* 设置最小高度，防止图表区域塌陷 */
}

.q-charts {
	width: 100%;
	height: 100%;
}

.empty-chart {
	text-align: center;
	width: 100%;
	padding: 60rpx 0;
}

.empty-text {
	color: #999;
	font-size: 28rpx;
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