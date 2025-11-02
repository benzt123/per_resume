<template>
	<view class="container">
		<!-- 用户信息区域 -->
		<view class="user-info">
			<view class="avatar-section">
				<image class="avatar" :src="avatarUrl" mode="aspectFit"></image>
				<text class="username">用户</text>
				<text class="user-desc">记录你的成长</text>
			</view>
		</view>
		
		
		<!-- 个人信息管理 -->
		<view class="data-management">
			<text class="management-title">个人信息</text>
			<view class="management-item message-item" @click="goToMessage">
				<view class="management-left">
					<text class="management-icon">📋</text>
					<text class="management-text">基本信息</text>
				</view>
				<text class="management-arrow">></text>
			</view>
			<view class="management-item resume-item" @click="goToResume">
				<view class="management-left">
					<text class="management-icon">📄</text>
					<text class="management-text">我的简历</text>
				</view>
				<text class="management-arrow">></text>
			</view>
		</view>
		
	</view>
</template>

<script>
	export default {
		data() {
			return {
				avatarUrl: '/static/logo.png',  // 默认头像
				API_BASE: 'http://localhost:3000'  // API 基础地址
			}
		},
		onShow() {
			// 页面显示时加载头像
			this.loadAvatar();
		},
		
		methods: {
			//新增：加载用户头像
			async loadAvatar() {
				try {
					const response = await uni.request({
						url: `${this.API_BASE}/api/profile`,
						method: 'GET'
					});
					
					if (response.data && response.data.avatar) {
						const avatar = response.data.avatar;
						
						// 判断是否为完整 URL
						if (avatar.startsWith('http')) {
							this.avatarUrl = avatar;
						} else {
							// 拼接完整 URL：http://localhost:3000/uploads/avatars/avatar-xxx.jpg
							this.avatarUrl = `${this.API_BASE}${avatar}`;
						}
						
						console.log('加载头像成功:', this.avatarUrl);
					} else {
						console.log('未找到用户头像，使用默认头像');
					}
				} catch (error) {
					console.error('加载头像失败:', error);
					uni.showToast({
						title: '头像加载失败',
						icon: 'none'
					});
				}
			},
			
			// 跳转到AI配置页面
			goToAIConfig() {
				uni.navigateTo({
					url: '/pages/ai-config/ai-config'
				})
			},
			
			// 跳转到语音识别配置页面
			goToVoiceConfig() {
				uni.navigateTo({
					url: '/pages/voice-config/voice-config'
				})
			},
			
			// 跳转到基本信息页面
			goToMessage() {
				uni.navigateTo({
					url: '/pages/message/message'
				})
			},
			
			// 跳转到我的简历页面
			goToResume() {
				uni.navigateTo({
					url: '/pages/Mypresume/Mypresume'
				})
			},
			
			// 清空所有数据
			clearAllData() {
				uni.showModal({
					title: '清空所有数据',
					content: '此操作将永久删除所有记账记录,无法恢复。确定要继续吗?',
					confirmColor: '#FF6B6B',
					confirmText: '确认清空',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							// 清空所有存储数据
							uni.removeStorageSync('records')
							uni.showToast({
								title: '所有数据已清空',
								icon: 'success'
							})
						}
					}
				})
			}
		}
	}
</script>

<style>
	.container {
		background-color: #f5f5f5;
		min-height: 100vh;
		padding: 0 0 40rpx 0;
	}
	
	/* 用户信息区域 */
	.user-info {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 40rpx 30rpx 60rpx;
		position: relative;
		border-radius: 0 0 40rpx 40rpx;
	}
	
	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: white;
	}
	
	.avatar {
		width: 120rpx;
		height: 120rpx;
		border-radius: 60rpx;
		border: 4rpx solid rgba(255, 255, 255, 0.3);
		margin-bottom: 20rpx;
	}
	
	.username {
		font-size: 36rpx;
		font-weight: bold;
		margin-bottom: 10rpx;
	}
	
	.user-desc {
		font-size: 28rpx;
		opacity: 0.8;
	}
	
	/* 数据管理区域 */
	.data-management {
		background: white;
		margin: 30rpx 30rpx 0;
		border-radius: 20rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 20rpx rgba(0, 0, 0, 0.08);
	}
	
	.management-title {
		display: block;
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		padding: 30rpx 30rpx 20rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.management-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx;
		border-bottom: 1rpx solid #f8f8f8;
		transition: background-color 0.2s;
	}
	
	.management-item:last-child {
		border-bottom: none;
	}
	
	.management-item:active {
		background-color: #f8f8f8;
	}
	
	.management-left {
		display: flex;
		align-items: center;
	}
	
	.management-icon {
		font-size: 36rpx;
		margin-right: 20rpx;
		width: 50rpx;
		text-align: center;
	}
	
	.management-text {
		font-size: 30rpx;
		color: #333;
	}
	
	.management-arrow {
		font-size: 28rpx;
		color: #999;
	}
	
	/* 特殊项目样式 */
	.ai-config-item .management-icon {
		background: linear-gradient(45deg, #4ECDC4, #44A08D);
		border-radius: 50%;
		color: white;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 50rpx;
		height: 50rpx;
	}
	
	.voice-config-item .management-icon {
		background: linear-gradient(45deg, #667eea, #764ba2);
		border-radius: 50%;
		color: white;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 50rpx;
		height: 50rpx;
	}
	
	.message-item .management-icon {
		background: linear-gradient(45deg, #5B86E5, #36D1DC);
		border-radius: 50%;
		color: white;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 50rpx;
		height: 50rpx;
	}
	
	.resume-item .management-icon {
		background: linear-gradient(45deg, #FA8BFF, #2BD2FF);
		border-radius: 50%;
		color: white;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 50rpx;
		height: 50rpx;
	}
	
	.danger-item .management-text {
		color: #ff4d4f;
	}
	
	.danger-item .management-icon {
		color: #ff4d4f;
	}
	
	/* 响应式适配 */
	@media (max-width: 750rpx) {
		.container {
			padding: 0;
		}
		
		.data-management {
			margin-left: 20rpx;
			margin-right: 20rpx;
		}
	}
</style>