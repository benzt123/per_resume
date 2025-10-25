"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      messages: [],
      inputText: "",
      isLoading: false,
      scrollTop: 0,
      aiConfig: null,
      // 语音识别相关
      isRecording: false,
      isVoiceMode: false,
      // 语音输入模式切换
      voiceConfig: null,
      recordManager: null,
      tempAudioPath: ""
    };
  },
  onLoad() {
    this.loadAIConfig();
    this.loadVoiceConfig();
    this.loadChatHistory();
  },
  methods: {
    // 申请麦克风权限
    async requestMicrophonePermission() {
      return new Promise((resolve, reject) => {
        if (common_vendor.index.authorize) {
          common_vendor.index.authorize({
            scope: "scope.record",
            success: () => {
              common_vendor.index.__f__("log", "at pages/chat/chat.vue:195", "麦克风权限获取成功");
              resolve();
            },
            fail: (error) => {
              common_vendor.index.__f__("log", "at pages/chat/chat.vue:199", "麦克风权限获取失败:", error);
              reject(new Error("permission_denied"));
            }
          });
        } else if (common_vendor.index.getSetting && common_vendor.index.authorize) {
          common_vendor.index.getSetting({
            success: (res) => {
              if (res.authSetting["scope.record"]) {
                resolve();
              } else if (res.authSetting["scope.record"] === false) {
                reject(new Error("permission_denied"));
              } else {
                common_vendor.index.authorize({
                  scope: "scope.record",
                  success: () => {
                    resolve();
                  },
                  fail: () => {
                    reject(new Error("permission_denied"));
                  }
                });
              }
            },
            fail: () => {
              common_vendor.index.authorize({
                scope: "scope.record",
                success: () => {
                  resolve();
                },
                fail: () => {
                  reject(new Error("permission_denied"));
                }
              });
            }
          });
        } else {
          common_vendor.index.__f__("log", "at pages/chat/chat.vue:242", "当前环境不支持权限检查，直接通过");
          resolve();
        }
      });
    },
    // 切换输入模式
    toggleInputMode() {
      this.isVoiceMode = !this.isVoiceMode;
    },
    // 加载语音识别配置
    loadVoiceConfig() {
      this.voiceConfig = common_vendor.index.getStorageSync("voiceConfig");
    },
    // 开始语音录制
    async startVoiceRecording() {
      try {
        await this.requestMicrophonePermission();
      } catch (error) {
        let title = "需要麦克风权限";
        let content = "使用语音记账功能需要麦克风权限";
        if (error.message === "permission_denied") {
          title = "麦克风权限被拒绝";
          content = "检测到麦克风权限被拒绝，请手动开启权限后重试";
        }
        common_vendor.index.showModal({
          title,
          content,
          confirmText: "了解",
          showCancel: false,
          success: () => {
            const systemInfo = common_vendor.index.getSystemInfoSync();
            let guide = "";
            if (systemInfo.platform === "ios") {
              guide = "iOS用户：设置 → 隐私与安全 → 麦克风 → 找到本应用并开启";
            } else if (systemInfo.platform === "android") {
              guide = "Android用户：设置 → 应用管理 → 本应用 → 权限管理 → 开启麦克风权限";
            } else {
              guide = "请在系统设置中为本应用开启麦克风权限";
            }
            common_vendor.index.showToast({
              title: guide,
              icon: "none",
              duration: 4e3
            });
          }
        });
        return;
      }
      this.loadVoiceConfig();
      if (!this.voiceConfig) {
        common_vendor.index.showModal({
          title: "需要配置语音识别",
          content: '请先在"我的"页面配置语音识别服务，才能使用语音记账功能',
          confirmText: "去配置",
          success: (res) => {
            if (res.confirm) {
              common_vendor.index.navigateTo({
                url: "/pages/voice-config/voice-config"
              });
            }
          }
        });
        return;
      }
      if (!this.voiceConfig.appId || !this.voiceConfig.accessKey) {
        common_vendor.index.showModal({
          title: "配置不完整",
          content: "需要配置App ID和Access Key才能使用语音识别功能",
          confirmText: "去配置",
          success: (res) => {
            if (res.confirm) {
              common_vendor.index.navigateTo({
                url: "/pages/voice-config/voice-config"
              });
            }
          }
        });
        return;
      }
      if (!common_vendor.index.getRecorderManager) {
        common_vendor.index.showToast({
          title: "当前环境不支持录音功能",
          icon: "error"
        });
        return;
      }
      this.isRecording = true;
      this.recordManager = common_vendor.index.getRecorderManager();
      this.recordManager.onStart(() => {
        common_vendor.index.showToast({
          title: "开始录音...",
          icon: "none",
          duration: 1e3
        });
      });
      this.recordManager.onStop((res) => {
        this.tempAudioPath = res.tempFilePath;
        if (!res.tempFilePath) {
          common_vendor.index.showToast({
            title: "录音文件无效，请重试",
            icon: "error"
          });
          this.isRecording = false;
          return;
        }
        this.processVoiceRecording();
      });
      this.recordManager.onError((error) => {
        this.isRecording = false;
        common_vendor.index.showToast({
          title: "录音失败，请重试",
          icon: "error"
        });
      });
      this.recordManager.start({
        duration: 6e4,
        sampleRate: 16e3,
        numberOfChannels: 1,
        encodeBitRate: 96e3,
        format: "wav"
      });
    },
    // 停止语音录制
    stopVoiceRecording() {
      if (!this.isRecording)
        return;
      this.isRecording = false;
      if (this.recordManager) {
        this.recordManager.stop();
      }
    },
    // 处理语音录制结果
    async processVoiceRecording() {
      if (!this.tempAudioPath) {
        common_vendor.index.showToast({
          title: "录音文件无效",
          icon: "error"
        });
        return;
      }
      common_vendor.index.showLoading({
        title: "正在识别语音..."
      });
      try {
        const recognizedText = await this.callFlashAPI();
        common_vendor.index.hideLoading();
        if (recognizedText) {
          common_vendor.index.showToast({
            title: "语音识别成功",
            icon: "success"
          });
          await this.sendMessage(null, recognizedText);
        } else {
          common_vendor.index.showToast({
            title: "未识别到有效内容",
            icon: "none"
          });
        }
      } catch (error) {
        common_vendor.index.hideLoading();
        let errorMessage = "语音识别失败，请重试";
        let showConfigModal = false;
        if (error.message.includes("grant not found") || error.message.includes("验证失败")) {
          errorMessage = "语音识别配置错误，请前往设置页面重新配置";
          showConfigModal = true;
        } else if (error.message.includes("不支持") || error.message.includes("无法读取")) {
          errorMessage = "当前环境不支持语音功能，建议使用文字输入";
        } else if (error.message.includes("网络") || error.message.includes("timeout")) {
          errorMessage = "网络连接问题，请检查网络后重试";
        }
        if (showConfigModal) {
          common_vendor.index.showModal({
            title: "配置错误",
            content: errorMessage + "\n\n点击确认前往配置页面",
            confirmText: "去配置",
            success: (res) => {
              if (res.confirm) {
                common_vendor.index.navigateTo({
                  url: "/pages/voice-config/voice-config"
                });
              }
            }
          });
        } else {
          common_vendor.index.showToast({
            title: errorMessage,
            icon: "error"
          });
        }
      }
    },
    // 使用Flash API进行语音识别
    async callFlashAPI() {
      const recognizeUrl = "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";
      const audioBase64 = await this.getAudioBase64();
      const headers = {
        "X-Api-App-Key": this.voiceConfig.appId,
        "X-Api-Access-Key": this.voiceConfig.accessKey,
        "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
        "X-Api-Request-Id": this.generateUUID(),
        "X-Api-Sequence": "-1",
        "Content-Type": "application/json"
      };
      const requestData = {
        user: {
          uid: this.voiceConfig.appId
        },
        audio: {
          data: audioBase64
        },
        request: {
          model_name: this.voiceConfig.modelName || "bigmodel",
          enable_itn: this.voiceConfig.enableItn !== false,
          enable_punc: this.voiceConfig.enablePunc !== false,
          enable_ddc: true,
          enable_speaker_info: this.voiceConfig.enableSpeakerInfo || false
        }
      };
      const response = await common_vendor.index.request({
        url: recognizeUrl,
        method: "POST",
        header: headers,
        data: requestData,
        timeout: 3e4
      });
      if (response.statusCode === 200) {
        const statusCode = response.header["X-Api-Status-Code"];
        if (statusCode === "20000000") {
          const result = response.data;
          let recognizedText = "";
          if (result && result.result && result.result.text) {
            recognizedText = result.result.text;
          } else if (result && result.data && result.data.result && result.data.result.text) {
            recognizedText = result.data.result.text;
          } else if (result && result.utterances && result.utterances.length > 0) {
            recognizedText = result.utterances.map((item) => item.text).join("");
          } else if (result && result.text) {
            recognizedText = result.text;
          }
          return recognizedText.trim() || null;
        } else {
          throw new Error(`语音识别失败: ${response.header["X-Api-Message"] || "未知错误"}`);
        }
      } else {
        throw new Error(`API调用失败: HTTP ${response.statusCode}`);
      }
    },
    // 获取录音文件的Base64编码
    async getAudioBase64() {
      return new Promise((resolve, reject) => {
        if (common_vendor.index.getFileSystemManager) {
          common_vendor.index.getFileSystemManager().readFile({
            filePath: this.tempAudioPath,
            encoding: "base64",
            success: (res) => {
              resolve(res.data);
            },
            fail: (error) => {
              this.getAudioBase64Fallback().then(resolve).catch(reject);
            }
          });
        } else {
          this.getAudioBase64Fallback().then(resolve).catch(reject);
        }
      });
    },
    // 备用方案：使用 plus.io 读取文件
    async getAudioBase64Fallback() {
      return new Promise((resolve, reject) => {
        if (typeof plus !== "undefined" && plus.io) {
          plus.io.resolveLocalFileSystemURL(this.tempAudioPath, (entry) => {
            entry.file((file) => {
              const reader = new plus.io.FileReader();
              reader.onloadend = (evt) => {
                if (evt.target.result) {
                  const base64Data = evt.target.result.split(",")[1] || evt.target.result;
                  resolve(base64Data);
                } else {
                  reject(new Error("文件读取结果为空"));
                }
              };
              reader.onerror = () => {
                reject(new Error("FileReader读取失败"));
              };
              reader.readAsDataURL(file);
            }, () => {
              reject(new Error("获取文件对象失败"));
            });
          }, () => {
            reject(new Error("解析文件路径失败"));
          });
        } else {
          reject(new Error("当前环境无法读取录音文件，建议使用文字输入"));
        }
      });
    },
    // 生成UUID
    generateUUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    },
    // 加载AI配置
    loadAIConfig() {
      this.aiConfig = common_vendor.index.getStorageSync("aiConfig");
      if (!this.aiConfig || !this.aiConfig.apiUrl || !this.aiConfig.apiKey) {
        common_vendor.index.showModal({
          title: "需要配置AI",
          content: '请先在"我的"页面配置智能体，才能使用聊天记账功能',
          confirmText: "去配置",
          success: (res) => {
            if (res.confirm) {
              common_vendor.index.navigateTo({
                url: "/pages/ai-config/ai-config"
              });
            } else {
              common_vendor.index.navigateBack();
            }
          }
        });
      }
    },
    // 加载聊天历史
    loadChatHistory() {
      const history = common_vendor.index.getStorageSync("chatHistory") || [];
      this.messages = history;
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    // 保存聊天历史
    saveChatHistory() {
      const historyToSave = this.messages.slice(-50);
      common_vendor.index.setStorageSync("chatHistory", historyToSave);
    },
    // 快捷输入
    quickInput(text) {
      this.inputText = text;
      this.sendMessage();
    },
    // 清空聊天记录
    clearChatHistory() {
      common_vendor.index.showModal({
        title: "清空聊天记录",
        content: "确定要清空所有聊天记录吗？此操作不可恢复。",
        confirmText: "确定清空",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.messages = [];
            common_vendor.index.removeStorageSync("chatHistory");
            common_vendor.index.showToast({
              title: "聊天记录已清空",
              icon: "success"
            });
          }
        }
      });
    },
    // 发送消息
    async sendMessage(dom, messageText = null) {
      const message = (messageText || this.inputText).trim();
      if (!message || this.isLoading) {
        return;
      }
      this.addMessage("user", message);
      if (!messageText) {
        this.inputText = "";
      }
      this.loadAIConfig();
      if (!this.aiConfig) {
        this.addMessage("assistant", "抱歉，AI配置未找到，请在设置中重新配置");
        return;
      }
      this.isLoading = true;
      try {
        const response = await this.callAI(message);
        this.handleAIResponse(response, message);
      } catch (error) {
        this.addMessage("assistant", "抱歉，AI服务暂时不可用，请稍后再试或检查网络连接");
      } finally {
        this.isLoading = false;
      }
    },
    // 调用AI接口
    async callAI(userMessage) {
      var _a, _b;
      const expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [];
      const incomeCategories = common_vendor.index.getStorageSync("incomeCategories") || [];
      const expenseNames = expenseCategories.map((cat) => cat.name).join("、");
      const incomeNames = incomeCategories.map((cat) => cat.name).join("、");
      let categoryInfo = "";
      if (expenseNames || incomeNames) {
        categoryInfo = "\n\n当前可用分类：";
        if (expenseNames) {
          categoryInfo += `
支出类别：${expenseNames}`;
        }
        if (incomeNames) {
          categoryInfo += `
收入类别：${incomeNames}`;
        }
        categoryInfo += "\n\n请优先从上述分类中选择最合适的，避免创建重复或相似的分类。";
      }
      const systemPrompt = (this.aiConfig.systemPrompt || "你是一个智能记账助手") + categoryInfo;
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        // 包含最近的对话历史（最多10条）
        ...this.messages.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "user",
          content: userMessage
        }
      ];
      const requestData = {
        model: this.aiConfig.modelName || "gpt-3.5-turbo",
        messages,
        max_tokens: 500,
        temperature: 0.7
      };
      const response = await common_vendor.index.request({
        url: this.aiConfig.apiUrl,
        method: "POST",
        header: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.aiConfig.apiKey}`
        },
        data: requestData,
        timeout: 3e4
      });
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${((_b = (_a = response.data) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || "请求失败"}`);
      }
      return response.data;
    },
    // 处理AI响应
    handleAIResponse(response, userMessage) {
      var _a, _b, _c;
      const aiReply = ((_c = (_b = (_a = response.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "抱歉，我没有理解你的意思";
      const recordsData = this.parseRecordsData(aiReply);
      if (recordsData && recordsData.length > 0) {
        let replyText = aiReply.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, "").replace(/```(?:json)?\s*\[[\s\S]*?\]\s*```/g, "").replace(/\{[\s\S]*?"type"\s*:\s*"(expense|income)"[\s\S]*?\}/g, "").replace(/\n\s*\n/g, "\n").trim();
        if (!replyText) {
          replyText = `我帮你识别了${recordsData.length}笔记录：`;
        }
        this.addMessage("assistant", replyText, recordsData);
      } else {
        this.addMessage("assistant", aiReply);
      }
    },
    // 解析记账数据（支持单笔和多笔）
    parseRecordsData(text) {
      try {
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) {
          let jsonStr = codeBlockMatch[1].trim();
          jsonStr = this.unescapeJsonString(jsonStr);
          const data = JSON.parse(jsonStr);
          if (Array.isArray(data)) {
            const validRecords = data.filter((item) => this.validateRecordData(item));
            return validRecords.length > 0 ? validRecords : null;
          } else if (this.validateRecordData(data)) {
            return [data];
          }
        }
        const strongObjectMatch = text.match(/\{[\s\S]*?"type"\s*:\s*"(expense|income)"[\s\S]*?\}/);
        if (strongObjectMatch) {
          let objectStr = strongObjectMatch[0];
          objectStr = this.unescapeJsonString(objectStr);
          const data = JSON.parse(objectStr);
          if (this.validateRecordData(data)) {
            return [data];
          }
        }
        const flexibleObjectMatch = text.match(/\{[^{}]*?"type"[^{}]*?"(expense|income)"[^{}]*?\}/s);
        if (flexibleObjectMatch) {
          let objectStr = flexibleObjectMatch[0];
          objectStr = this.unescapeJsonString(objectStr);
          const data = JSON.parse(objectStr);
          if (this.validateRecordData(data)) {
            return [data];
          }
        }
        const arrayMatch = text.match(/\[[^\]]*\]/);
        if (arrayMatch) {
          let arrayStr = arrayMatch[0];
          arrayStr = this.unescapeJsonString(arrayStr);
          const dataArray = JSON.parse(arrayStr);
          if (Array.isArray(dataArray) && dataArray.length > 0) {
            const validRecords = dataArray.filter((item) => this.validateRecordData(item));
            return validRecords.length > 0 ? validRecords : null;
          }
        }
        const objectMatch = text.match(/\{[^}]*\}/);
        if (objectMatch) {
          let objectStr = objectMatch[0];
          objectStr = this.unescapeJsonString(objectStr);
          const data = JSON.parse(objectStr);
          if (this.validateRecordData(data)) {
            return [data];
          }
        }
      } catch (error) {
        common_vendor.index.__f__("log", "at pages/chat/chat.vue:829", "JSON解析失败:", error.message);
      }
      return null;
    },
    // 处理JSON字符串中的转义字符
    unescapeJsonString(str) {
      return str.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\r/g, "\r").replace(/\\\\/g, "\\");
    },
    // 验证记录数据
    validateRecordData(data) {
      return data && data.type && data.amount && data.category;
    },
    // 添加消息
    addMessage(role, content, recordsData = null) {
      const message = {
        role,
        content,
        timestamp: Date.now(),
        recordsData,
        recorded: false
      };
      this.messages.push(message);
      this.saveChatHistory();
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    },
    // 确认多笔记录
    async confirmMultipleRecords(recordsData) {
      const results = [];
      const newCategories = [];
      for (const recordData of recordsData) {
        try {
          const result = await this.processRecord(recordData);
          results.push(result);
          if (result.isNewCategory) {
            newCategories.push(result.category);
          }
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      if (newCategories.length > 0) {
        await this.handleNewCategories(newCategories);
      }
      const messageIndex = this.messages.findIndex(
        (msg) => msg.recordsData === recordsData
      );
      if (messageIndex !== -1) {
        this.messages[messageIndex].recorded = true;
        this.saveChatHistory();
      }
      const successCount = results.filter((r) => r.success).length;
      if (successCount === recordsData.length) {
        common_vendor.index.showToast({
          title: `成功记录${successCount}笔！`,
          icon: "success"
        });
        this.addMessage("assistant", `✅ 记账成功！已记录${successCount}笔账目`);
      } else {
        common_vendor.index.showToast({
          title: `记录${successCount}/${recordsData.length}笔`,
          icon: "none"
        });
      }
    },
    // 处理单条记录
    async processRecord(recordData) {
      return new Promise((resolve) => {
        const recordTime = this.parseRecordTime(recordData.time);
        const { categoryIcon, isNewCategory, categoryId } = this.getCategoryIconWithCheck(
          recordData.category,
          recordData.type
        );
        const recordId = Date.now() + Math.random() * 1e3;
        const newRecord = {
          id: recordId,
          type: recordData.type,
          amount: parseFloat(recordData.amount).toString(),
          categoryName: recordData.category,
          categoryId,
          // 添加分类ID关联
          categoryIcon,
          note: recordData.note || "",
          time: recordTime.toISOString()
        };
        const records = common_vendor.index.getStorageSync("records") || [];
        records.push(newRecord);
        common_vendor.index.setStorageSync("records", records);
        resolve({
          success: true,
          record: newRecord,
          isNewCategory,
          category: isNewCategory ? {
            name: recordData.category,
            icon: categoryIcon,
            type: recordData.type
          } : null
        });
      });
    },
    // 解析记录时间
    parseRecordTime(timeDescription) {
      const now = /* @__PURE__ */ new Date();
      if (!timeDescription || timeDescription === "刚才") {
        return now;
      }
      if (timeDescription.includes("今天")) {
        if (timeDescription.includes("早上") || timeDescription.includes("上午")) {
          return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
        } else if (timeDescription.includes("中午")) {
          return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0);
        } else if (timeDescription.includes("下午")) {
          return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0);
        } else if (timeDescription.includes("晚上")) {
          return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0);
        }
      } else if (timeDescription.includes("昨天")) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (timeDescription.includes("早上") || timeDescription.includes("上午")) {
          return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0);
        } else if (timeDescription.includes("中午")) {
          return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 12, 0);
        } else if (timeDescription.includes("下午")) {
          return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 15, 0);
        } else if (timeDescription.includes("晚上")) {
          return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 19, 0);
        }
      } else if (timeDescription.includes("前天")) {
        const dayBeforeYesterday = new Date(now);
        dayBeforeYesterday.setDate(now.getDate() - 2);
        return new Date(dayBeforeYesterday.getFullYear(), dayBeforeYesterday.getMonth(), dayBeforeYesterday.getDate(), 12, 0);
      }
      return now;
    },
    // 确认单笔记录（从多笔记录中）
    async confirmSingleRecord(record, recordIndex, message) {
      try {
        const { categoryIcon, isNewCategory, categoryId } = this.getCategoryIconWithCheck(
          record.category,
          record.type
        );
        let finalCategoryId = categoryId;
        if (isNewCategory) {
          const newCategory = {
            name: record.category,
            icon: categoryIcon,
            type: record.type
          };
          const addedCategories = await this.handleNewCategories([newCategory]);
          if (addedCategories && addedCategories.length > 0) {
            finalCategoryId = addedCategories[0].id;
          }
        }
        const recordTime = this.parseRecordTime(record.time);
        const recordId = Date.now() + Math.random() * 1e3;
        const newRecord = {
          id: recordId,
          type: record.type,
          amount: parseFloat(record.amount).toString(),
          categoryName: record.category,
          categoryId: finalCategoryId,
          categoryIcon,
          note: record.note || "",
          time: recordTime.toISOString()
        };
        const records = common_vendor.index.getStorageSync("records") || [];
        records.push(newRecord);
        common_vendor.index.setStorageSync("records", records);
        message.recordsData[recordIndex].recorded = true;
        const allRecorded = message.recordsData.every((r) => r.recorded);
        if (allRecorded) {
          message.recorded = true;
        }
        this.saveChatHistory();
        common_vendor.index.showToast({
          title: "记账成功！",
          icon: "success"
        });
        this.addMessage("assistant", `✅ 已记录${record.type === "expense" ? "支出" : "收入"}¥${record.amount} (${record.category})`);
      } catch (error) {
        common_vendor.index.showToast({
          title: "记账失败，请重试",
          icon: "error"
        });
      }
    },
    // 获取分类图标并检查是否为新分类
    getCategoryIconWithCheck(categoryName, type) {
      const expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [];
      const incomeCategories = common_vendor.index.getStorageSync("incomeCategories") || [];
      const allCategories = [...expenseCategories, ...incomeCategories];
      const existingCategory = allCategories.find((cat) => cat.name === categoryName);
      if (existingCategory) {
        return {
          categoryIcon: existingCategory.icon,
          categoryId: existingCategory.id,
          isNewCategory: false
        };
      }
      const newIcon = this.generateCategoryIcon(categoryName, type);
      return {
        categoryIcon: newIcon,
        categoryId: null,
        isNewCategory: true
      };
    },
    // 生成新分类图标
    generateCategoryIcon(categoryName, type) {
      const iconMap = {
        "早餐": "🥞",
        "午餐": "🍱",
        "晚餐": "🍽️",
        "夜宵": "🌙",
        "咖啡": "☕",
        "奶茶": "🧋",
        "饮料": "🥤",
        "打车": "🚗",
        "地铁": "🚇",
        "公交": "🚌",
        "油费": "⛽",
        "零食": "🍿",
        "水果": "🍎",
        "蔬菜": "🥬",
        "肉类": "🥩",
        "洗衣": "👕",
        "理发": "💇",
        "美容": "💄",
        "健身": "💪",
        "宠物": "🐱",
        "花卉": "🌸",
        "书籍": "📚",
        "兼职": "💼",
        "奖励": "🎁",
        "补贴": "💰"
      };
      if (iconMap[categoryName]) {
        return iconMap[categoryName];
      }
      for (const [key, icon] of Object.entries(iconMap)) {
        if (categoryName.includes(key) || key.includes(categoryName)) {
          return icon;
        }
      }
      return type === "expense" ? "💰" : "💎";
    },
    // 处理新分类
    async handleNewCategories(newCategories) {
      if (newCategories.length === 0)
        return null;
      const categoryNames = newCategories.map((cat) => cat.name).join("、");
      return new Promise((resolve) => {
        common_vendor.index.showModal({
          title: "发现新分类",
          content: `检测到新的消费分类：${categoryNames}

是否要添加到分类管理中？`,
          confirmText: "添加",
          cancelText: "跳过",
          success: (res) => {
            if (res.confirm) {
              const addedCategories = this.addNewCategoriesToStorage(newCategories);
              common_vendor.index.showToast({
                title: "分类已添加",
                icon: "success"
              });
              resolve(addedCategories);
            } else {
              resolve(null);
            }
          }
        });
      });
    },
    // 添加新分类到存储
    addNewCategoriesToStorage(newCategories) {
      const expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [];
      const incomeCategories = common_vendor.index.getStorageSync("incomeCategories") || [];
      const addedCategories = [];
      newCategories.forEach((category, index) => {
        const uniqueId = Date.now() + index * 1e3 + Math.floor(Math.random() * 1e3);
        const newCategoryItem = {
          id: uniqueId,
          name: category.name,
          icon: category.icon
        };
        if (category.type === "expense") {
          expenseCategories.push(newCategoryItem);
        } else {
          incomeCategories.push(newCategoryItem);
        }
        addedCategories.push({
          ...category,
          id: uniqueId
        });
      });
      common_vendor.index.setStorageSync("expenseCategories", expenseCategories);
      common_vendor.index.setStorageSync("incomeCategories", incomeCategories);
      return addedCategories;
    },
    // 获取分类图标
    getCategoryIcon(categoryName, type) {
      const expenseIcons = {
        "餐饮": "🍽️",
        "交通": "🚗",
        "购物": "🛍️",
        "娱乐": "🎬",
        "住房": "🏠",
        "医疗": "💊",
        "教育": "📚",
        "通讯": "📱",
        "服装": "👕",
        "其他": "📦"
      };
      const incomeIcons = {
        "工资": "💰",
        "奖金": "🎁",
        "投资": "📈",
        "兼职": "💼",
        "红包": "🧧",
        "退款": "↩️",
        "其他": "💎"
      };
      if (type === "expense") {
        return expenseIcons[categoryName] || "📦";
      } else {
        return incomeIcons[categoryName] || "💎";
      }
    },
    // 格式化时间
    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1e3);
      const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1e3);
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;
      if (messageDate.getTime() === today.getTime()) {
        return `今天 ${timeStr}`;
      } else if (messageDate.getTime() === yesterday.getTime()) {
        return `昨天 ${timeStr}`;
      } else if (messageDate.getTime() === dayBeforeYesterday.getTime()) {
        return `前天 ${timeStr}`;
      } else if (date.getFullYear() === now.getFullYear()) {
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return `${month}-${day} ${timeStr}`;
      } else {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day} ${timeStr}`;
      }
    },
    // 滚动到底部
    scrollToBottom() {
      const query = common_vendor.index.createSelectorQuery().in(this);
      query.select(".chat-container").boundingClientRect((rect) => {
        if (rect) {
          this.scrollTop = rect.height;
        }
      }).exec();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.messages.length === 0
  }, $data.messages.length === 0 ? {} : {}, {
    b: common_vendor.f($data.messages, (message, index, i0) => {
      return common_vendor.e({
        a: message.role === "assistant"
      }, message.role === "assistant" ? common_vendor.e({
        b: common_vendor.t(message.content),
        c: common_vendor.t($options.formatTime(message.timestamp)),
        d: message.recordsData && message.recordsData.length > 0
      }, message.recordsData && message.recordsData.length > 0 ? {
        e: common_vendor.f(message.recordsData, (record, recordIndex, i1) => {
          return common_vendor.e({
            a: common_vendor.t(record.type === "expense" ? "💸" : "💰"),
            b: common_vendor.t(record.type === "expense" ? "支出" : "收入"),
            c: common_vendor.t(record.amount),
            d: common_vendor.t(record.category),
            e: record.time
          }, record.time ? {
            f: common_vendor.t(record.time)
          } : {}, {
            g: record.note
          }, record.note ? {
            h: common_vendor.t(record.note)
          } : {}, {
            i: !record.recorded
          }, !record.recorded ? {
            j: common_vendor.o(($event) => $options.confirmSingleRecord(record, recordIndex, message), recordIndex)
          } : {}, {
            k: recordIndex
          });
        })
      } : {}) : {
        f: common_vendor.t(message.content),
        g: common_vendor.t($options.formatTime(message.timestamp))
      }, {
        h: index,
        i: common_vendor.n(message.role === "user" ? "user-message" : "assistant-message")
      });
    }),
    c: $data.isLoading
  }, $data.isLoading ? {} : {}, {
    d: $data.scrollTop,
    e: common_vendor.o((...args) => $options.clearChatHistory && $options.clearChatHistory(...args)),
    f: $data.isRecording
  }, $data.isRecording ? {} : {}, {
    g: !$data.isVoiceMode
  }, !$data.isVoiceMode ? {
    h: common_vendor.o((...args) => $options.toggleInputMode && $options.toggleInputMode(...args))
  } : {}, {
    i: $data.isVoiceMode
  }, $data.isVoiceMode ? {
    j: common_vendor.o((...args) => $options.toggleInputMode && $options.toggleInputMode(...args))
  } : {}, {
    k: !$data.isVoiceMode
  }, !$data.isVoiceMode ? {
    l: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args)),
    m: $data.isLoading,
    n: $data.inputText,
    o: common_vendor.o(($event) => $data.inputText = $event.detail.value),
    p: common_vendor.t($data.isLoading ? "发送中" : "发送"),
    q: common_vendor.o((...args) => $options.sendMessage && $options.sendMessage(...args)),
    r: $data.isLoading || !$data.inputText.trim()
  } : {}, {
    s: $data.isVoiceMode
  }, $data.isVoiceMode ? {
    t: common_vendor.t($data.isRecording ? "松开 结束" : "按住 说话"),
    v: common_vendor.o((...args) => $options.startVoiceRecording && $options.startVoiceRecording(...args)),
    w: common_vendor.o((...args) => $options.stopVoiceRecording && $options.stopVoiceRecording(...args)),
    x: common_vendor.o((...args) => $options.stopVoiceRecording && $options.stopVoiceRecording(...args)),
    y: $data.isLoading,
    z: $data.isRecording ? 1 : ""
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0a633310"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/chat/chat.js.map
