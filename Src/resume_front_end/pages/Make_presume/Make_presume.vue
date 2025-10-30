<template>
	<view class="container">

		<!-- 输入框 -->
		<view class="form-box">
			<text class="label">请输入想生成的简历相关岗位：</text>
			<input class="input" type="text" placeholder="请输入" v-model="job" />
		</view>

		<!-- 底部按钮 -->
		<view class="btn-box">
			<button class="generate-btn" @click="handleGenerate">一键生成</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			job: ''
		}
	},
	methods: {
		// 返回首页
		goHome() {
			uni.switchTab({
				url: '/pages/index/index' // 假设首页路径是 /pages/index/index.vue
			})
		},

		// 一键生成逻辑
		async handleGenerate() {
			if (!this.job) {
				uni.showToast({
					title: '请输入岗位名称',
					icon: 'none'
				})
				return
			}
			// TODO: 这里可以加入生成逻辑
			console.log('生成简历岗位：', this.job)
			uni.showLoading({ title: 'AI 正在生成...' });

			try {
				const res = await uni.request({
				url: 'http://localhost:3000/api/generate-resume',
				method: 'POST',
				header: { 'Content-Type': 'application/json' },
				data:{job: this.job },
				});

				if (res.statusCode !== 200) throw new Error(res.data?.error || '请求失败');

				// 保存到本地
				const resumes = uni.getStorageSync('myResumes') || [];
				resumes.unshift(res.data);
				uni.setStorageSync('myResumes', resumes);

				uni.showToast({ title: '生成成功！', icon: 'success' });
				setTimeout(() => uni.navigateTo({ url: '/pages/Mypresume/Mypresume' }), 1000);
			} catch (err) {
				uni.showToast({ title: err.message || '生成失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		}
	}
}
</script>

<style scoped>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40rpx;
	background-color: #f9f9f9;
	min-height: 100vh;
}

.header {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	margin-top: 20rpx;
	margin-bottom: 40rpx;
}

.back-btn {
	position: absolute;
	left: 20rpx;
	top: 0;
	padding: 10rpx;
}

.arrow {
	font-size: 40rpx;
	color: #333;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	color: #ff6600;
}

.form-box {
	width: 90%;
	background: #fff;
	padding: 20rpx;
	border-radius: 10rpx;
	box-shadow: 0 0 10rpx rgba(0, 0, 0, 0.05);
	border: 1rpx solid #ddd;
}

.label {
	font-size: 28rpx;
	color: #333;
	margin-bottom: 10rpx;
	display: block;
}

.input {
	width: 100%;
	height: 80rpx;
	border: 1rpx solid #ccc;
	border-radius: 8rpx;
	padding: 0 20rpx;
	margin-top: 10rpx;
}

.btn-box {
	position: fixed;
	bottom: 100rpx;
	width: 100%;
	display: flex;
	justify-content: center;
}

.generate-btn {
	width: 200rpx;
	height: 200rpx;
	background-color: #ffbd73;
	color: white;
	font-size: 32rpx;
	border-radius: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	box-shadow: 0 8rpx 20rpx rgba(255, 189, 115, 0.5);
}
</style>