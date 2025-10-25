"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      config: {
        appId: "",
        accessKey: "",
        modelName: "bigmodel",
        enablePunc: true,
        enableItn: true,
        enableSpeakerInfo: false
      },
      modelOptions: ["bigmodel", "general"],
      modelIndex: 0,
      testResult: null
    };
  },
  computed: {
    canSave() {
      return this.config.appId.trim() && this.config.accessKey.trim();
    },
    canTest() {
      return this.config.appId.trim() && this.config.accessKey.trim();
    }
  },
  onLoad() {
    this.loadConfiguration();
  },
  methods: {
    // 加载配置
    loadConfiguration() {
      const saved = common_vendor.index.getStorageSync("voiceConfig");
      if (saved) {
        this.config = { ...this.config, ...saved };
        const modelIndex = this.modelOptions.indexOf(this.config.modelName);
        this.modelIndex = modelIndex >= 0 ? modelIndex : 0;
      }
    },
    // 模型选择变化
    onModelChange(e) {
      this.modelIndex = e.detail.value;
      this.config.modelName = this.modelOptions[this.modelIndex];
    },
    // 开关变化
    onSwitchChange(e) {
      const field = e.currentTarget.dataset.field;
      this.config[field] = e.detail.value;
    },
    // 测试配置
    async testConfiguration() {
      if (!this.canTest)
        return;
      common_vendor.index.showLoading({
        title: "测试中..."
      });
      try {
        await this.testVolcengineMode();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/voice-config/voice-config.vue:196", "测试失败:", error);
        let errorMessage = "未知错误";
        if (error.message.includes("grant not found")) {
          errorMessage = "App ID 或 Access Key 无效，请检查配置是否正确";
        } else if (error.message.includes("timeout")) {
          errorMessage = "网络超时，请检查网络连接";
        } else if (error.message.includes("unauthorized") || error.message.includes("403")) {
          errorMessage = "权限不足，请确认账号已开通语音识别服务";
        } else if (error.message.includes("400")) {
          errorMessage = "请求参数错误，请检查配置信息";
        } else {
          errorMessage = error.message || "服务调用失败";
        }
        this.testResult = {
          success: false,
          message: `测试失败：${errorMessage}`
        };
        common_vendor.index.showModal({
          title: "测试失败",
          content: `${errorMessage}

建议：
1. 确认App ID和Access Key正确
2. 确认已开通火山引擎语音识别服务
3. 检查网络连接
4. 可尝试使用演示模式体验功能`,
          showCancel: false
        });
      } finally {
        common_vendor.index.hideLoading();
      }
    },
    // 测试火山引擎模式
    async testVolcengineMode() {
      common_vendor.index.showLoading({
        title: "检查API连接..."
      });
      const connectivityTest = await this.testApiConnectivity();
      if (!connectivityTest.success) {
        throw new Error(connectivityTest.message);
      }
      common_vendor.index.showLoading({
        title: "准备测试音频..."
      });
      const audioData = await this.getTestAudioData();
      if (!audioData) {
        this.testResult = {
          success: true,
          message: "API配置正确，连接测试成功！（未找到测试音频文件，但API连通性正常）"
        };
        common_vendor.index.showToast({
          title: "API连接成功",
          icon: "success"
        });
        return;
      }
      common_vendor.index.showLoading({
        title: "正在识别语音..."
      });
      const result = await this.callFlashAPI(null, audioData);
      this.testResult = {
        success: true,
        message: result ? `识别成功：${result}` : "API配置正确，但测试音频无法识别内容"
      };
      common_vendor.index.showToast({
        title: "测试成功",
        icon: "success"
      });
    },
    // API连通性测试
    async testApiConnectivity() {
      try {
        const response = await common_vendor.index.request({
          url: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash",
          method: "POST",
          header: {
            "X-Api-App-Key": this.config.appId,
            "X-Api-Access-Key": this.config.accessKey,
            "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
            "X-Api-Request-Id": "test-connectivity",
            "X-Api-Sequence": "-1",
            "Content-Type": "application/json"
          },
          data: {
            user: { uid: "test" },
            audio: { url: "test" },
            request: { model_name: "bigmodel" }
          },
          timeout: 1e4
        });
        if (response.statusCode === 200) {
          const statusCode = response.header["X-Api-Status-Code"];
          if (statusCode === "20000000" || statusCode === "40000001") {
            return { success: true };
          } else if (statusCode === "40000003" || statusCode === "40000004") {
            return {
              success: false,
              message: "App ID 或 Access Key 验证失败"
            };
          }
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: `连接失败：${error.message}`
        };
      }
    },
    // 调用Flash API进行语音识别
    async callFlashAPI(audioUrl, audioData = null) {
      const requestId = this.generateUUID();
      const recognizeUrl = "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";
      const headers = {
        "X-Api-App-Key": this.config.appId,
        "X-Api-Access-Key": this.config.accessKey,
        "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
        "X-Api-Request-Id": requestId,
        "X-Api-Sequence": "-1",
        "Content-Type": "application/json"
      };
      let audio_data = null;
      if (audioUrl) {
        audio_data = { "url": audioUrl };
      } else if (audioData) {
        audio_data = { "data": audioData };
      } else {
        audio_data = { "data": "" };
      }
      const requestData = {
        user: {
          uid: this.config.appId
        },
        audio: audio_data,
        request: {
          model_name: this.config.modelName,
          enable_itn: this.config.enableItn,
          enable_punc: this.config.enablePunc,
          enable_ddc: true,
          enable_speaker_info: this.config.enableSpeakerInfo
        }
      };
      common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:367", "Flash API 请求数据:", requestData);
      const response = await common_vendor.index.request({
        url: recognizeUrl,
        method: "POST",
        header: headers,
        data: requestData,
        timeout: 3e4
      });
      common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:377", "Flash API 响应:", JSON.stringify(response));
      if (response.statusCode === 200) {
        const statusCode = response.header["X-Api-Status-Code"];
        if (statusCode === "20000000") {
          const result = response.data;
          let recognizedText = "";
          if (result && result.data && result.data.result && result.data.result.text) {
            recognizedText = result.data.result.text;
          } else if (result && result.result && result.result.text) {
            recognizedText = result.result.text;
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
    // 保存配置
    saveConfiguration() {
      if (!this.canSave)
        return;
      try {
        common_vendor.index.setStorageSync("voiceConfig", this.config);
        common_vendor.index.showToast({
          title: "保存成功",
          icon: "success"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      } catch (error) {
        common_vendor.index.showToast({
          title: "保存失败",
          icon: "error"
        });
      }
    },
    // 打开帮助文档
    openHelp() {
      common_vendor.index.showModal({
        title: "火山引擎语音识别配置指南",
        content: '1. 访问 console.volcengine.com\n2. 开通"语音技术-语音识别"服务\n3. 创建应用，获取App ID\n4. 在"访问管理"中创建Access Key\n5. 确保账号有足够余额或已购买套餐\n6. 将获取的App ID和Access Key填入配置\n\n注意：请确保服务已正常开通并有使用权限',
        confirmText: "明白了",
        showCancel: false
      });
    },
    // 获取测试音频数据
    async getTestAudioData() {
      try {
        common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:446", "开始获取测试音频数据...");
        const audioPath = "/static/test.mp3";
        common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:484", "非App环境：检查可用的API");
        if (typeof common_vendor.index.getFileSystemManager === "function") {
          common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:488", "小程序环境：使用getFileSystemManager");
          const fs = common_vendor.index.getFileSystemManager();
          return new Promise((resolve) => {
            fs.readFile({
              filePath: audioPath,
              encoding: "base64",
              success: (res) => {
                common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:495", "小程序环境成功读取音频文件:", audioPath);
                resolve(res.data);
              },
              fail: (error) => {
                common_vendor.index.__f__("error", "at pages/voice-config/voice-config.vue:499", "小程序环境读取音频文件失败:", error);
                resolve("");
              }
            });
          });
        } else if (typeof fetch !== "undefined") {
          common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:507", "H5环境：使用fetch API");
          try {
            const response = await fetch(audioPath);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = function() {
                const base64 = reader.result.split(",")[1];
                common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:520", "H5环境成功读取音频文件:", audioPath);
                resolve(base64);
              };
              reader.onerror = function() {
                common_vendor.index.__f__("error", "at pages/voice-config/voice-config.vue:524", "H5环境读取音频文件失败");
                resolve("");
              };
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            common_vendor.index.__f__("error", "at pages/voice-config/voice-config.vue:530", "H5环境获取音频文件失败:", error);
            common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:531", "H5环境：无法获取音频文件，跳过音频测试");
            return "";
          }
        } else {
          common_vendor.index.__f__("log", "at pages/voice-config/voice-config.vue:537", "当前环境不支持文件读取，跳过音频测试");
          return "";
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/voice-config/voice-config.vue:543", "获取测试音频数据出错:", error);
        return "";
      }
    },
    // 生成UUID
    generateUUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.config.appId,
    b: common_vendor.o(($event) => $data.config.appId = $event.detail.value),
    c: $data.config.accessKey,
    d: common_vendor.o(($event) => $data.config.accessKey = $event.detail.value),
    e: common_vendor.t($data.modelOptions[$data.modelIndex]),
    f: $data.modelIndex,
    g: $data.modelOptions,
    h: common_vendor.o((...args) => $options.onModelChange && $options.onModelChange(...args)),
    i: $data.config.enablePunc,
    j: common_vendor.o((...args) => $options.onSwitchChange && $options.onSwitchChange(...args)),
    k: $data.config.enableItn,
    l: common_vendor.o((...args) => $options.onSwitchChange && $options.onSwitchChange(...args)),
    m: $data.config.enableSpeakerInfo,
    n: common_vendor.o((...args) => $options.onSwitchChange && $options.onSwitchChange(...args)),
    o: $data.testResult && !$data.testResult.success
  }, $data.testResult && !$data.testResult.success ? {} : {}, {
    p: common_vendor.o((...args) => $options.openHelp && $options.openHelp(...args)),
    q: common_vendor.o((...args) => $options.testConfiguration && $options.testConfiguration(...args)),
    r: !$options.canTest,
    s: common_vendor.o((...args) => $options.saveConfiguration && $options.saveConfiguration(...args)),
    t: !$options.canSave,
    v: $data.testResult
  }, $data.testResult ? {
    w: common_vendor.t($data.testResult.success ? "✅ 测试成功" : "❌ 测试失败"),
    x: common_vendor.t($data.testResult.message),
    y: common_vendor.n($data.testResult.success ? "success" : "error")
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-3aff46fe"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/voice-config/voice-config.js.map
