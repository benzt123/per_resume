<template>
  <div class="message-page">
    <!-- 头像区域 -->
    <div class="avatar-section">
      <div class="avatar-container" :class="{ 'has-avatar': formData.avatar }" @click="handleAvatarClick">
        <img class="user-avatar" :src="getAvatarUrl()" alt="头像" />
        <div class="avatar-mask" v-if="isEditMode">
          <text class="camera-icon">📷</text>
        </div>
      </div>
      <div class="avatar-tip" v-if="isEditMode">点击更换头像</div>
    </div>

    <!-- 表单区域 -->
    <div class="form-section">
      <!-- 姓名 -->
      <div class="form-item">
        <div class="item-label">
          <text class="required">*</text>
          <text>姓名</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.name" 
          :disabled="!isEditMode"
          placeholder="请输入姓名"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 性别 -->
      <div class="form-item" @click="handleGenderClick">
        <div class="item-label">
          <text class="required">*</text>
          <text>性别</text>
        </div>
        <div class="item-value" :class="{ disabled: !isEditMode }">
          <text :class="{ placeholder: !formData.gender }">
            {{ formData.gender || '请选择性别' }}
          </text>
          <text class="arrow" v-if="isEditMode">›</text>
        </div>
      </div>

      <!-- 学历 -->
      <div class="form-item" @click="handleEducationClick">
        <div class="item-label">
          <text class="required">*</text>
          <text>学历</text>
        </div>
        <div class="item-value" :class="{ disabled: !isEditMode }">
          <text :class="{ placeholder: !formData.education }">
            {{ formData.education || '请选择学历' }}
          </text>
          <text class="arrow" v-if="isEditMode">›</text>
        </div>
      </div>

      <!-- 手机号 -->
      <div class="form-item">
        <div class="item-label">
          <text class="required">*</text>
          <text>手机号</text>
        </div>
        <input 
          class="item-input" 
          type="number"
          v-model="formData.phone" 
          :disabled="!isEditMode"
          placeholder="请输入手机号"
          placeholder-class="placeholder"
          maxlength="11"
        />
      </div>

      <!-- 政治面貌 -->
      <div class="form-item" @click="handlePoliticalClick">
        <div class="item-label">
          <text>政治面貌</text>
        </div>
        <div class="item-value" :class="{ disabled: !isEditMode }">
          <text :class="{ placeholder: !formData.political_status }">
            {{ formData.political_status || '请选择政治面貌' }}
          </text>
          <text class="arrow" v-if="isEditMode">›</text>
        </div>
      </div>

      <!-- 出生年月 -->
      <div class="form-item">
        <div class="item-label">
          <text>出生日期</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.birthday" 
          :disabled="!isEditMode"
          placeholder="如:2005-10-15"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 毕业年份 -->
      <div class="form-item">
        <div class="item-label">
          <text>毕业年份</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.graduation_year" 
          :disabled="!isEditMode"
          placeholder="请输入毕业年份"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 毕业院校 -->
      <div class="form-item">
        <div class="item-label">
          <text>毕业院校</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.school" 
          :disabled="!isEditMode"
          placeholder="请输入毕业院校"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 在校成绩 -->
      <div class="form-item">
        <div class="item-label">
          <text>在校成绩</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.gpa" 
          :disabled="!isEditMode"
          placeholder="如:3.8"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 邮箱 -->
      <div class="form-item">
        <div class="item-label">
          <text>邮箱</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.email" 
          :disabled="!isEditMode"
          placeholder="请输入邮箱地址"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 专业 -->
      <div class="form-item">
        <div class="item-label">
          <text>专业</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.address" 
          :disabled="!isEditMode"
          placeholder="请输入专业"
          placeholder-class="placeholder"
        />
      </div>

      <!-- 个人简介 -->
      <div class="form-item textarea-item">
        <div class="item-label">
          <text>个人简介</text>
        </div>
        <textarea 
          class="item-textarea" 
          v-model="formData.intro" 
          :disabled="!isEditMode"
          placeholder="请输入个人简介"
          placeholder-class="placeholder"
          maxlength="200"
        />
        <div class="char-count" v-if="isEditMode">
          {{ formData.intro ? formData.intro.length : 0 }}/200
        </div>
      </div>
    </div>

    <!-- 悬浮编辑按钮 -->
    <div class="float-edit-btn" @click="toggleEditMode">
      <text>{{ isEditMode ? '完成' : '编辑' }}</text>
    </div>
  </div>
</template>

<script>
const API_BASE = 'http://localhost:3000';

export default {
  name: "MessagePage",
  data() {
    return {
      isEditMode: false,
      maxDate: '',
      currentYear: '',
      genderOptions: ['男', '女', '其他'],
      educationOptions: [
        '初中及以下',
        '高中/中专',
        '大专',
        '本科',
        '硕士',
        '博士',
        '博士后'
      ],
      politicalOptions: [
        '中共党员',
        '中共预备党员',
        '共青团员',
        '民主党派',
        '群众',
        '其他'
      ],
      formData: {
        avatar: '',
        name: '',
        gender: '',
        birthday: '',
        political_status: '',
        education: '',
        graduation_year: '',
        school: '',
        gpa: '',
        phone: '',
        email: '',
        address: '',
        intro: ''
      }
    };
  },
  
  onLoad() {
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];
    this.currentYear = today.getFullYear().toString();
    this.loadUserInfo();
  },
  
  methods: {
    // 获取头像URL
    getAvatarUrl() {
      if (!this.formData.avatar) {
        return '/static/default-avatar.png';
      }
      // 如果已经是完整URL就直接使用
      if (this.formData.avatar.startsWith('http')) {
        return this.formData.avatar;
      }
      // 如果是相对路径，拼接基础URL
      return `${API_BASE}${this.formData.avatar}`;
    },
    
    // 切换编辑模式
    toggleEditMode() {
      if (this.isEditMode) {
        this.saveInfo();
      } else {
        this.isEditMode = true;
      }
    },
    
    // 头像上传
    handleAvatarClick() {
      if (!this.isEditMode) return;
      
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (chooseRes) => {
          const tempFilePath = chooseRes.tempFilePaths[0];
          
          uni.showLoading({ title: '上传中...' });
          
          // 使用 uni.uploadFile 上传文件
          uni.uploadFile({
            url: `${API_BASE}/api/upload/avatar`,
            filePath: tempFilePath,
            name: 'avatar',
            // 不要手动设置 header，让 uni.uploadFile 自动处理
            success: (uploadRes) => {
              uni.hideLoading();
              
              try {
                const data = JSON.parse(uploadRes.data);
                
                if (data.success) {
                  // 保存相对路径到 formData
                  this.formData.avatar = data.url;
                  
                  uni.showToast({ 
                    title: '头像上传成功', 
                    icon: 'success',
                    duration: 1500
                  });
                  
                  // 延迟保存，确保界面已更新
                  setTimeout(() => {
                    this.saveAvatarToDatabase();
                  }, 500);
                } else {
                  throw new Error(data.error || '上传失败');
                }
              } catch (err) {
                console.error('解析响应失败:', err);
                uni.showToast({
                  title: '上传失败: ' + err.message,
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              uni.hideLoading();
              console.error('上传请求失败:', err);
              uni.showToast({
                title: '上传失败，请重试',
                icon: 'none'
              });
            }
          });
        },
        fail: (err) => {
          console.error('选择图片失败:', err);
          uni.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      });
    },
    
    // 单独保存头像路径到数据库
    async saveAvatarToDatabase() {
      try {
        const response = await uni.request({
          url: `${API_BASE}/api/profile/save`,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: this.formData
        });
        
        if (response.data && response.data.success) {
          console.log('头像路径已保存到数据库');
        } else {
          console.error('保存头像路径失败:', response.data?.error);
        }
      } catch (error) {
        console.error('保存头像路径到数据库失败:', error);
      }
    },
    
    // 性别选择
    handleGenderClick() {
      if (!this.isEditMode) return;
      
      uni.showActionSheet({
        itemList: this.genderOptions,
        success: (res) => {
          this.formData.gender = this.genderOptions[res.tapIndex];
        }
      });
    },
    
    // 政治面貌选择
    handlePoliticalClick() {
      if (!this.isEditMode) return;
      
      uni.showActionSheet({
        itemList: this.politicalOptions,
        success: (res) => {
          this.formData.political_status = this.politicalOptions[res.tapIndex];
        }
      });
    },
    
    // 学历选择
    handleEducationClick() {
      if (!this.isEditMode) return;
      
      uni.showActionSheet({
        itemList: this.educationOptions,
        success: (res) => {
          this.formData.education = this.educationOptions[res.tapIndex];
        }
      });
    },
    
    // 表单验证
    validateForm() {
      if (!this.formData.name) {
        uni.showToast({
          title: '请输入姓名',
          icon: 'none'
        });
        return false;
      }
      
      if (!this.formData.gender) {
        uni.showToast({
          title: '请选择性别',
          icon: 'none'
        });
        return false;
      }
      
      if (!this.formData.education) {
        uni.showToast({
          title: '请选择学历',
          icon: 'none'
        });
        return false;
      }
      
      if (!this.formData.phone) {
        uni.showToast({
          title: '请输入手机号',
          icon: 'none'
        });
        return false;
      }
      
      if (!/^1[3-9]\d{9}$/.test(this.formData.phone)) {
        uni.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return false;
      }
      
      if (this.formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
        uni.showToast({
          title: '请输入正确的邮箱地址',
          icon: 'none'
        });
        return false;
      }
      
      return true;
    },
    
    // 保存用户信息到数据库
    async saveInfo() {
      if (!this.validateForm()) {
        return;
      }
      
      uni.showLoading({ title: '保存中...' });
      
      try {
        const response = await uni.request({
          url: `${API_BASE}/api/profile/save`,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: this.formData
        });
        
        uni.hideLoading();
        
        if (response.data && response.data.success) {
          this.isEditMode = false;
          uni.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          uni.showToast({
            title: response.data?.error || '保存失败',
            icon: 'none'
          });
        }
      } catch (error) {
        uni.hideLoading();
        console.error('保存失败:', error);
        uni.showToast({
          title: '保存失败,请重试',
          icon: 'none'
        });
      }
    },
    
    // 从数据库加载用户信息
    async loadUserInfo() {
      uni.showLoading({ title: '加载中...' });
      
      try {
        const response = await uni.request({
          url: `${API_BASE}/api/profile`,
          method: 'GET'
        });
        
        uni.hideLoading();
        
        if (response.data) {
          // 处理头像URL：如果是完整URL，转换为相对路径保存
          if (response.data.avatar && response.data.avatar.startsWith('http')) {
            const url = new URL(response.data.avatar);
            response.data.avatar = url.pathname;
          }
          
          this.formData = { 
            ...this.formData, 
            ...response.data 
          };
          
          // 处理空值显示
          if (!this.formData.intro) {
            this.formData.intro = '';
          }
        }
      } catch (error) {
        uni.hideLoading();
        console.error('加载用户信息失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none',
          duration: 2000
        });
      }
    }
  }
};
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 120px;
  padding-top: 15px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
  background: #fff;
  margin-bottom: 15px;
}

.avatar-container {
  position: relative;
  cursor: pointer;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  border: 4px solid #f0f0f0;
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-container:not(.has-avatar) .user-avatar {
  display: none;
}

.avatar-container:not(.has-avatar)::before {
  content: '👤';
  font-size: 40px;
  color: #ccc;
}

.avatar-mask {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #fff;
}

.camera-icon {
  font-size: 16px;
}

.avatar-tip {
  margin-top: 10px;
  font-size: 13px;
  color: #999;
}

.form-section {
  background: #fff;
  border-radius: 15px;
  margin: 0 15px;
  overflow: hidden;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f5;
  min-height: 55px;
}

.form-item:last-child {
  border-bottom: none;
}

.textarea-item {
  flex-direction: column;
  align-items: flex-start;
  min-height: auto;
}

.item-label {
  display: flex;
  align-items: center;
  min-width: 90px;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.required {
  color: #ff4d4f;
  margin-right: 3px;
}

.item-input {
  flex: 1;
  font-size: 15px;
  color: #333;
  text-align: right;
  border: none;
  outline: none;
}

.item-input:disabled {
  background-color: transparent;
  color: #666;
}

.item-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 15px;
  color: #333;
  cursor: pointer;
}

.item-value.disabled {
  cursor: default;
  color: #666;
}

.item-value text {
  margin-right: 5px;
}

.placeholder {
  color: #bbb;
}

.arrow {
  font-size: 18px;
  color: #ccc;
}

.item-textarea {
  width: 100%;
  min-height: 100px;
  font-size: 15px;
  color: #333;
  padding: 10px 0;
  border: none;
  outline: none;
  resize: none;
  line-height: 1.6;
}

.item-textarea:disabled {
  background-color: transparent;
  color: #666;
}

.char-count {
  align-self: flex-end;
  font-size: 12px;
  color: #bbb;
  margin-top: 5px;
}

.float-edit-btn {
  position: fixed;
  right: 30px;
  bottom: 30px;
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s;
  z-index: 999;
  border: 4px solid #fff;
}

.float-edit-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

@media (max-width: 375px) {
  .item-label {
    min-width: 80px;
    font-size: 14px;
  }
  
  .item-input, .item-value {
    font-size: 14px;
  }
  
  .float-edit-btn {
    width: 100px;
    height: 100px;
    font-size: 18px;
    right: 20px;
    bottom: 20px;
  }
  
  .avatar-container {
    width: 80px;
    height: 80px;
  }
}
</style>