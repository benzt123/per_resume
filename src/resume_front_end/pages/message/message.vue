<template>
  <div class="message-page">
    <!-- 头像区域 -->
    <div class="avatar-section">
      <div class="avatar-container" :class="{ 'has-avatar': formData.avatar }" @click="handleAvatarClick">
        <img class="user-avatar" :src="getAvatarUrl()" alt="头像" v-if="formData.avatar" />
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
          <text :class="{ placeholder: !formData.politicalStatus }">
            {{ formData.politicalStatus || '请选择政治面貌' }}
          </text>
          <text class="arrow" v-if="isEditMode">›</text>
        </div>
      </div>

      <!-- 出生年月 -->
      <div class="form-item">
        <div class="item-label">
          <text>出生年月</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.birthday" 
          :disabled="!isEditMode"
          placeholder="如:2005.10"
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
          v-model="formData.graduationYear" 
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
          placeholder="如:GPA 3.8/4.0"
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

      <!-- 地址 -->
      <div class="form-item">
        <div class="item-label">
          <text>地址</text>
        </div>
        <input 
          class="item-input" 
          v-model="formData.address" 
          :disabled="!isEditMode"
          placeholder="请输入居住地址"
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
          {{ formData.intro.length }}/200
        </div>
      </div>
    </div>

    <!-- 悬浮编辑按钮 -->
    <div class="float-edit-btn" @click="toggleEditMode">
      <text>{{ isEditMode ? '完成' : '编辑' }}</text>
    </div>

    <!-- 日期选择器 -->
    <picker 
      mode="date" 
      :value="formData.birthday"
      :end="maxDate"
      @change="onBirthdayChange"
      v-if="showDatePicker"
    >
      <view></view>
    </picker>

    <!-- 毕业年份选择器 -->
    <picker 
      mode="date" 
      :value="formData.graduationYear"
      :end="currentYear"
      fields="year"
      @change="onGraduationYearChange"
      v-if="showGraduationYearPicker"
    >
      <view></view>
    </picker>
  </div>
</template>

<script>
export default {
  name: "MessagePage",
  data() {
    return {
      isEditMode: false,
      showDatePicker: false,
      showGraduationYearPicker: false,
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
        politicalStatus: '',
        education: '',
        graduationYear: '',
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
    getAvatarUrl() {
      if (!this.formData.avatar) {
        return '/static/default-avatar.png';
      }
      return this.formData.avatar;
    },
    
    toggleEditMode() {
      if (this.isEditMode) {
        this.saveInfo();
      } else {
        this.isEditMode = true;
      }
    },
    
    handleAvatarClick() {
      if (!this.isEditMode) {
        uni.showToast({
          title: '请先点击编辑按钮',
          icon: 'none'
        });
        return;
      }
      
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (chooseRes) => {
          const tempFilePath = chooseRes.tempFilePaths[0];
          this.formData.avatar = tempFilePath;
          this.saveAvatarToStorage();
          
          uni.showToast({
            title: '头像更新成功',
            icon: 'success',
            duration: 1500
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
    
    saveAvatarToStorage() {
      const userInfo = uni.getStorageSync('userInfo') || {};
      userInfo.avatar = this.formData.avatar;
      uni.setStorageSync('userInfo', userInfo);
    },
    
    handleGenderClick() {
      if (!this.isEditMode) return;
      
      uni.showActionSheet({
        itemList: this.genderOptions,
        success: (res) => {
          this.formData.gender = this.genderOptions[res.tapIndex];
        }
      });
    },
    
    handleBirthdayClick() {
      if (!this.isEditMode) return;
      this.showDatePicker = true;
      
      this.$nextTick(() => {
        setTimeout(() => {
          this.showDatePicker = false;
        }, 100);
      });
    },
    
    handlePoliticalClick() {
      if (!this.isEditMode) return;
      
      uni.showActionSheet({
        itemList: this.politicalOptions,
        success: (res) => {
          this.formData.politicalStatus = this.politicalOptions[res.tapIndex];
        }
      });
    },
    
    handleEducationClick() {
      if (!this.isEditMode) return;
      
      uni.showActionSheet({
        itemList: this.educationOptions,
        success: (res) => {
          this.formData.education = this.educationOptions[res.tapIndex];
        }
      });
    },
    
    handleGraduationYearClick() {
      if (!this.isEditMode) return;
      this.showGraduationYearPicker = true;
      
      this.$nextTick(() => {
        setTimeout(() => {
          this.showGraduationYearPicker = false;
        }, 100);
      });
    },
    
    onBirthdayChange(e) {
      this.formData.birthday = e.detail.value;
    },
    
    onGraduationYearChange(e) {
      this.formData.graduationYear = e.detail.value;
    },
    
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
    
    saveInfo() {
      if (!this.validateForm()) {
        return;
      }
      
      uni.setStorageSync('userInfo', this.formData);
      this.isEditMode = false;
      
      uni.showToast({
        title: '保存成功',
        icon: 'success'
      });
    },
    
    loadUserInfo() {
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo) {
        this.formData = { ...this.formData, ...userInfo };
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

/* 头像区域 */
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

.avatar-container:active .user-avatar {
  transform: scale(0.95);
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

/* 表单区域 */
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

/* 悬浮编辑按钮 - 变大版本 */
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

/* 响应式适配 */
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