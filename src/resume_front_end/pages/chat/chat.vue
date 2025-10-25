<template>
	<view class="container">
		<!-- 聊天记录区域 -->
		<scroll-view 
			class="chat-container" 
			scroll-y="true" 
			:scroll-top="scrollTop"
			scroll-with-animation="true">
			
			<!-- 欢迎消息 -->
			<view class="message-item assistant-message" v-if="messages.length === 0">
				<view class="avatar assistant-avatar">🤖</view>
				<view class="message-content">
					<text class="message-text">你好！我是你的智能助手。</text>
					<text class="message-text">有什么可以帮助你的吗？</text>
				</view>
			</view>
			
			<!-- 聊天消息列表 -->
			<view v-for="(message, index) in messages" :key="index" 
				class="message-item" 
				:class="message.role === 'user' ? 'user-message' : 'assistant-message'">
				
				<!-- AI消息：头像在左边 -->
				<template v-if="message.role === 'assistant'">
					<view class="avatar assistant-avatar">🤖</view>
					<view class="message-content">
						<text class="message-text">{{ message.content }}</text>
						<text class="message-time">{{ formatTime(message.timestamp) }}</text>
					</view>
				</template>
				
				<!-- 用户消息：头像在右边 -->
				<template v-else>
					<view class="message-content">
						<text class="message-text">{{ message.content }}</text>
						<text class="message-time">{{ formatTime(message.timestamp) }}</text>
					</view>
					<view class="avatar user-avatar">👤</view>
				</template>
			</view>
			
			<!-- 加载状态 -->
			<view v-if="isLoading" class="message-item assistant-message">
				<view class="avatar assistant-avatar">🤖</view>
				<view class="message-content loading-content">
					<view class="loading-dots">
						<view class="dot"></view>
						<view class="dot"></view>
						<view class="dot"></view>
					</view>
					<text class="loading-text">AI正在思考...</text>
				</view>
			</view>
		</scroll-view>
		
		<!-- 固定在底部的输入区域 -->
		<view class="input-container-fixed">
			<!-- 功能按钮区域 -->
			<view class="function-buttons">
				<button class="clear-btn" @click="clearChatHistory">
					🗑️ 清空记录
				</button>
			</view>
			
			<view class="input-row">
				<input 
					class="chat-input" 
					v-model="inputText" 
					placeholder="输入消息..." 
					@confirm="sendMessage"
					:disabled="isLoading"
					confirm-type="send"
				/>
				<button 
					class="send-btn" 
					@click="sendMessage"
					:disabled="isLoading || !inputText.trim()">
					<text class="send-text">{{ isLoading ? '发送中' : '发送' }}</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				messages: [],
				inputText: '',
				isLoading: false,
				scrollTop: 0,
				aiConfig: null
			}
		},
		
		onLoad() {
			this.loadAIConfig()
			this.loadChatHistory()
		},
		
		methods: {
			// 加载AI配置
			loadAIConfig() {
				this.aiConfig = uni.getStorageSync('aiConfig')
				if (!this.aiConfig || !this.aiConfig.apiUrl || !this.aiConfig.apiKey) {
					uni.showModal({
						title: '需要配置AI',
						content: '请先配置AI服务才能使用聊天功能',
						confirmText: '去配置',
						success: (res) => {
							if (res.confirm) {
								uni.navigateTo({
									url: '/pages/ai-config/ai-config'
								})
							} else {
								uni.navigateBack()
							}
						}
					})
				}
			},
			
			// 加载聊天历史
			loadChatHistory() {
				const history = uni.getStorageSync('chatHistory') || []
				this.messages = history
				this.$nextTick(() => {
					this.scrollToBottom()
				})
			},
			
			// 保存聊天历史
			saveChatHistory() {
				// 只保存最近50条消息
				const historyToSave = this.messages.slice(-50)
				uni.setStorageSync('chatHistory', historyToSave)
			},
			
			// 清空聊天记录
			clearChatHistory() {
				uni.showModal({
					title: '清空聊天记录',
					content: '确定要清空所有聊天记录吗？此操作不可恢复。',
					confirmText: '确定清空',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							this.messages = []
							uni.removeStorageSync('chatHistory')
							uni.showToast({
								title: '聊天记录已清空',
								icon: 'success'
							})
						}
					}
				})
			},
			
			// 发送消息
			async sendMessage() {
				const message = this.inputText.trim()
				if (!message || this.isLoading) {
					return
				}
				
				this.addMessage('user', message)
				this.inputText = ''
				
				this.loadAIConfig()
				if (!this.aiConfig) {
					this.addMessage('assistant', '抱歉，AI配置未找到，请在设置中重新配置')
					return
				}
				
				this.isLoading = true
				
				try {
					const response = await this.callAI(message)
					this.handleAIResponse(response)
				} catch (error) {
					this.addMessage('assistant', '抱歉，AI服务暂时不可用，请稍后再试或检查网络连接')
				} finally {
					this.isLoading = false
				}
			},
			
			// 调用AI接口
			async callAI(userMessage) {
				const systemPrompt = this.aiConfig.systemPrompt || '你是一个智能助手'
				
				const messages = [
					{
						role: 'system',
						content: systemPrompt
					},
					// 包含最近的对话历史（最多10条）
					...this.messages.slice(-10).map(msg => ({
						role: msg.role,
						content: msg.content
					})),
					{
						role: 'user',
						content: userMessage
					}
				]
				
				const requestData = {
					model: this.aiConfig.modelName || 'gpt-3.5-turbo',
					messages: messages,
					max_tokens: 500,
					temperature: 0.7
				}
				
				const response = await uni.request({
					url: this.aiConfig.apiUrl,
					method: 'POST',
					header: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.aiConfig.apiKey}`
					},
					data: requestData,
					timeout: 30000
				})
				
				if (response.statusCode !== 200) {
					throw new Error(`HTTP ${response.statusCode}: ${response.data?.error?.message || '请求失败'}`)
				}
				
				return response.data
			},
			
			// 处理AI响应
			handleAIResponse(response) {
				const aiReply = response.choices?.[0]?.message?.content || '抱歉，我没有理解你的意思'
				this.addMessage('assistant', aiReply)
			},
			
			// 添加消息
			addMessage(role, content) {
				const message = {
					role,
					content,
					timestamp: Date.now()
				}
				
				this.messages.push(message)
				this.saveChatHistory()
				
				this.$nextTick(() => {
					this.scrollToBottom()
				})
			},
			
			// 格式化时间
			formatTime(timestamp) {
				const date = new Date(timestamp)
				const now = new Date()
				
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
				const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
				const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
				
				const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
				
				const hours = date.getHours().toString().padStart(2, '0')
				const minutes = date.getMinutes().toString().padStart(2, '0')
				const timeStr = `${hours}:${minutes}`
				
				if (messageDate.getTime() === today.getTime()) {
					return `今天 ${timeStr}`
				} else if (messageDate.getTime() === yesterday.getTime()) {
					return `昨天 ${timeStr}`
				} else if (messageDate.getTime() === dayBeforeYesterday.getTime()) {
					return `前天 ${timeStr}`
				} else if (date.getFullYear() === now.getFullYear()) {
					const month = (date.getMonth() + 1).toString().padStart(2, '0')
					const day = date.getDate().toString().padStart(2, '0')
					return `${month}-${day} ${timeStr}`
				} else {
					const year = date.getFullYear()
					const month = (date.getMonth() + 1).toString().padStart(2, '0')
					const day = date.getDate().toString().padStart(2, '0')
					return `${year}-${month}-${day} ${timeStr}`
				}
			},
			
			// 滚动到底部
			scrollToBottom() {
				const query = uni.createSelectorQuery().in(this)
				query.select('.chat-container').boundingClientRect((rect) => {
					if (rect) {
						this.scrollTop = rect.height
					}
				}).exec()
			}
		}
	}
</script>

<style scoped>
	* {
		max-width: 100%;
		box-sizing: border-box;
	}
	
	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #FAFAFA;
		max-width: 100vw;
		overflow-x: hidden;
	}
	
	.chat-container {
		flex: 1;
		padding: 30rpx 20rpx;
		padding-bottom: 150rpx;
		overflow-y: auto;
		overflow-x: hidden;
		box-sizing: border-box;
	}
	
	.message-item {
		display: flex;
		margin-bottom: 35rpx;
		animation: fadeIn 0.3s ease-in;
		max-width: 100%;
		box-sizing: border-box;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(20rpx); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	.user-message {
		justify-content: flex-end;
	}
	
	.assistant-message {
		justify-content: flex-start;
	}
	
	.avatar {
		width: 55rpx;
		height: 55rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		flex-shrink: 0;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
	}
	
	.user-avatar {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		margin-left: 15rpx;
	}
	
	.assistant-avatar {
		background: linear-gradient(135deg, #4ECDC4, #44A08D);
		color: white;
		margin-right: 15rpx;
	}
	
	.message-content {
		max-width: calc(100vw - 150rpx);
		min-width: 100rpx;
		padding: 18rpx 22rpx;
		border-radius: 18rpx;
		position: relative;
		display: flex;
		flex-direction: column;
		word-wrap: break-word;
		overflow-wrap: break-word;
		box-sizing: border-box;
	}
	
	.user-message .message-content {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		border-bottom-right-radius: 6rpx;
		box-shadow: 0 3rpx 12rpx rgba(102, 126, 234, 0.25);
	}
	
	.assistant-message .message-content {
		background: white;
		color: #333;
		border-bottom-left-radius: 6rpx;
		box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
	}
	
	.message-text {
		font-size: 28rpx;
		line-height: 1.6;
		margin-bottom: 8rpx;
		word-wrap: break-word;
		overflow-wrap: break-word;
		white-space: pre-wrap;
		max-width: 100%;
	}
	
	.message-time {
		font-size: 20rpx;
		opacity: 0.5;
		align-self: flex-end;
		margin-top: 8rpx;
	}
	
	.user-message .message-time {
		align-self: flex-start;
	}
	
	.loading-content {
		background: white !important;
		display: flex;
		align-items: center;
		gap: 15rpx;
	}
	
	.loading-dots {
		display: flex;
		gap: 8rpx;
	}
	
	.dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: #4ECDC4;
		animation: bounce 1.4s ease-in-out infinite both;
	}
	
	.dot:nth-child(1) { animation-delay: -0.32s; }
	.dot:nth-child(2) { animation-delay: -0.16s; }
	
	@keyframes bounce {
		0%, 80%, 100% { transform: scale(0); }
		40% { transform: scale(1); }
	}
	
	.loading-text {
		font-size: 26rpx;
		color: #666;
	}
	
	.input-container-fixed {
		position: fixed;
		bottom: 100rpx;
		left: 0;
		right: 0;
		background: linear-gradient(to bottom, #FAFAFA, #F5F5F5);
		padding: 15rpx 20rpx 15rpx;
		padding-bottom: calc(15rpx + env(safe-area-inset-bottom));
		z-index: 999;
		box-sizing: border-box;
		max-width: 100vw;
		box-shadow: 0 -2rpx 15rpx rgba(0,0,0,0.05);
		border-top: 1rpx solid rgba(0,0,0,0.05);
	}
	
	.function-buttons {
		margin-bottom: 15rpx;
		display: flex;
		justify-content: flex-end;
		width: 100%;
		box-sizing: border-box;
	}
	
	.clear-btn {
		padding: 12rpx 22rpx;
		background: linear-gradient(135deg, #FFF5F5, #FFEBEB);
		border-radius: 15rpx;
		font-size: 22rpx;
		color: #E74C3C;
		line-height: 1;
		border: none;
		box-shadow: 0 2rpx 6rpx rgba(231, 76, 60, 0.12);
	}
	
	.clear-btn:active {
		background: #FFE5E5;
		transform: scale(0.95);
	}
	
	.input-row {
		display: flex;
		align-items: center;
		gap: 15rpx;
		width: 100%;
		box-sizing: border-box;
	}
	
	.chat-input {
		flex: 1;
		min-width: 0;
		height: 68rpx;
		padding: 0 22rpx;
		border-radius: 12rpx;
		font-size: 28rpx;
		background: linear-gradient(135deg, #FFFFFF, #F8F9FA);
		transition: all 0.2s ease;
		box-sizing: border-box;
		border: none;
		box-shadow: 0 3rpx 10rpx rgba(0,0,0,0.08);
	}
	
	.send-btn {
		min-width: 110rpx;
		width: auto;
		height: 68rpx;
		padding: 0 28rpx;
		background: linear-gradient(135deg, #1AAD19, #179B16);
		color: white;
		border: none;
		border-radius: 12rpx;
		font-size: 26rpx;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		flex-shrink: 0;
		box-shadow: 0 3rpx 12rpx rgba(26, 173, 25, 0.3);
	}
	
	.send-btn:disabled {
		background: linear-gradient(135deg, #E9ECEF, #DEE2E6);
		color: #ADB5BD;
		box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.06);
	}
	
	.send-btn:active:not(:disabled) {
		background: linear-gradient(135deg, #179B16, #148A13);
		transform: scale(0.98);
		box-shadow: 0 2rpx 8rpx rgba(26, 173, 25, 0.35);
	}
	
	.send-text {
		font-size: 26rpx;
		font-weight: 500;
	}
</style>