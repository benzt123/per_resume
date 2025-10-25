"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      config: {
        apiUrl: "",
        apiKey: "",
        modelName: "gpt-3.5-turbo",
        systemPrompt: ""
      },
      isTestingConnection: false,
      connectionStatus: null,
      templates: {
        accounting: {
          name: "智能记账助手",
          prompt: `你是一个专业的记账助手，主要功能是帮助用户解析和记录财务信息。

请按照以下规则工作：

1. 分类选择原则（重要）：
   - 用户会在对话开始时提供当前可用的分类列表
   - 优先从现有分类中选择最匹配的分类
   - 只有在现有分类都不合适时才创建新分类
   - 例如：如果现有分类有"餐饮"，不要创建"早餐"、"午餐"等细分类别

2. 当用户输入记账信息时（可能包含单笔或多笔记录），你需要：
   - 解析出每笔记录的金额数字
   - 从现有分类中选择最合适的类别，或创建新分类
   - 判断是支出还是收入
   - 提取备注信息和时间信息
   
3. 返回格式规则（极其重要）：
   - 当识别到记账信息时，必须直接返回纯JSON，不能有任何其他内容
   - 绝对禁止使用markdown代码块（如\`\`\`json\`\`\`）包裹JSON
   - 绝对禁止在JSON前后添加任何说明文字
   - 单笔记录：只返回 {"type": "expense/income", "amount": "金额", "category": "分类", "note": "备注", "time": "时间描述"}
   - 多笔记录：只返回 [{"type": "expense", "amount": "20", "category": "餐饮", "note": "早餐", "time": "今天早上"}, ...]
   - 时间描述：如"今天早上"、"昨天中午"、"前天晚上"等，如果没有明确时间则设为"刚才"
   - JSON字符串不得包含转义字符，直接使用标准JSON格式

4. 分类匹配规则：
   - 严格优先使用现有分类
   - 如果用户说"早餐20元"且现有分类有"餐饮"，使用"餐饮"而不是创建"早餐"
   - 如果用户说"打车15元"且现有分类有"交通"，使用"交通"而不是创建"打车"
   - 只有在现有分类完全不匹配时才创建新分类

5. 示例：
   现有分类：[餐饮, 交通, 购物]
   输入："今天早上早餐20元，打车15元"
   输出：[{"type": "expense", "amount": "20", "category": "餐饮", "note": "早餐", "time": "今天早上"}, {"type": "expense", "amount": "15", "category": "交通", "note": "打车", "time": "今天早上"}]

6. 当用户询问财务相关问题时，提供专业的理财建议

7. 保持友好、专业的语调，简洁明了地回复`
        },
        financial: {
          name: "财务顾问",
          prompt: `你是一个专业的个人财务顾问，具备以下能力：

1. 记账功能：
   - 解析用户的消费记录，如"红牛20元"
   - 返回JSON格式：{"type": "expense/income", "amount": "金额", "category": "分类", "note": "备注"}

2. 财务咨询：
   - 分析用户的收支情况
   - 提供预算规划建议
   - 推荐合适的理财产品
   - 帮助制定储蓄目标

3. 理财教育：
   - 普及理财知识
   - 解释投资概念
   - 风险评估建议

请用专业但易懂的语言回复，关注用户的实际情况，提供个性化建议。`
        }
      }
    };
  },
  onLoad() {
    this.loadConfig();
  },
  methods: {
    // 加载配置
    loadConfig() {
      const savedConfig = common_vendor.index.getStorageSync("aiConfig") || {};
      this.config = {
        apiUrl: savedConfig.apiUrl || "",
        apiKey: savedConfig.apiKey || "",
        modelName: savedConfig.modelName || "gpt-3.5-turbo",
        systemPrompt: savedConfig.systemPrompt || ""
      };
    },
    // 配置变化
    onConfigChange() {
      this.connectionStatus = null;
    },
    // 使用预设模板
    useTemplate(templateKey) {
      common_vendor.index.showModal({
        title: "使用模板",
        content: `确定要使用"${this.templates[templateKey].name}"模板吗？这将覆盖当前的智能体指令。`,
        success: (res) => {
          if (res.confirm) {
            this.config.systemPrompt = this.templates[templateKey].prompt;
            common_vendor.index.showToast({
              title: "模板已应用",
              icon: "success"
            });
          }
        }
      });
    },
    // 测试连接
    async testConnection() {
      if (!this.config.apiUrl || !this.config.apiKey) {
        common_vendor.index.showToast({
          title: "请先填写API地址和密钥",
          icon: "none"
        });
        return;
      }
      this.isTestingConnection = true;
      this.connectionStatus = null;
      try {
        const response = await common_vendor.index.request({
          url: this.config.apiUrl,
          method: "POST",
          header: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.config.apiKey}`
          },
          data: {
            model: this.config.modelName,
            messages: [
              {
                role: "user",
                content: "测试连接"
              }
            ],
            max_tokens: 10
          },
          timeout: 1e4
        });
        if (response.statusCode === 200) {
          this.connectionStatus = {
            success: true,
            message: "连接成功！API配置正确"
          };
          common_vendor.index.showToast({
            title: "连接测试成功",
            icon: "success"
          });
        } else {
          throw new Error(`HTTP ${response.statusCode}`);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/ai-config/ai-config.vue:269", "连接测试失败:", error);
        this.connectionStatus = {
          success: false,
          message: `连接失败：${error.message || "请检查API配置"}`
        };
        common_vendor.index.showToast({
          title: "连接测试失败",
          icon: "none"
        });
      } finally {
        this.isTestingConnection = false;
      }
    },
    // 保存配置
    saveConfig() {
      if (!this.config.apiUrl.trim()) {
        common_vendor.index.showToast({
          title: "请填写API地址",
          icon: "none"
        });
        return;
      }
      if (!this.config.apiKey.trim()) {
        common_vendor.index.showToast({
          title: "请填写API密钥",
          icon: "none"
        });
        return;
      }
      common_vendor.index.setStorageSync("aiConfig", this.config);
      common_vendor.index.showToast({
        title: "配置已保存",
        icon: "success"
      });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1500);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o([($event) => $data.config.apiUrl = $event.detail.value, (...args) => $options.onConfigChange && $options.onConfigChange(...args)]),
    b: $data.config.apiUrl,
    c: common_vendor.o([($event) => $data.config.apiKey = $event.detail.value, (...args) => $options.onConfigChange && $options.onConfigChange(...args)]),
    d: $data.config.apiKey,
    e: common_vendor.o([($event) => $data.config.modelName = $event.detail.value, (...args) => $options.onConfigChange && $options.onConfigChange(...args)]),
    f: $data.config.modelName,
    g: common_vendor.o([($event) => $data.config.systemPrompt = $event.detail.value, (...args) => $options.onConfigChange && $options.onConfigChange(...args)]),
    h: $data.config.systemPrompt,
    i: common_vendor.o(($event) => $options.useTemplate("accounting")),
    j: common_vendor.o(($event) => $options.useTemplate("financial")),
    k: common_vendor.t($data.isTestingConnection ? "测试中..." : "🔗 测试连接"),
    l: common_vendor.o((...args) => $options.testConnection && $options.testConnection(...args)),
    m: $data.isTestingConnection,
    n: common_vendor.o((...args) => $options.saveConfig && $options.saveConfig(...args)),
    o: $data.connectionStatus
  }, $data.connectionStatus ? {
    p: common_vendor.t($data.connectionStatus.success ? "✅" : "❌"),
    q: common_vendor.t($data.connectionStatus.message),
    r: common_vendor.n($data.connectionStatus.success ? "status-success" : "status-error")
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dd080916"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/ai-config/ai-config.js.map
