"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentTab: "expense",
      // expense | income
      expenseCategories: [],
      incomeCategories: [],
      showModal: false,
      isEdit: false,
      editId: null,
      formData: {
        name: "",
        icon: ""
      },
      // 可选图标库
      availableIcons: [
        // 餐饮美食
        "🍽️",
        "🍕",
        "🍔",
        "🍟",
        "🍗",
        "🍖",
        "🥘",
        "🍜",
        "🍱",
        "🥙",
        "🌮",
        "🍰",
        "🧁",
        "🍦",
        "☕",
        "🧃",
        "🍺",
        "🍷",
        "🥤",
        "🥢",
        // 交通出行
        "🚗",
        "🚙",
        "🚌",
        "🚎",
        "🏎️",
        "🚑",
        "🚒",
        "🛻",
        "🚚",
        "🚕",
        "🏍️",
        "🛵",
        "🚲",
        "🛴",
        "✈️",
        "🚀",
        "🚁",
        "🛥️",
        "⛵",
        "🚂",
        "🚄",
        "🚅",
        "🚆",
        "🚇",
        "🚈",
        "🚉",
        "🚊",
        "🚝",
        "🚞",
        // 购物消费
        "�🛍️",
        "🛒",
        "💳",
        "💰",
        "💎",
        "👕",
        "👔",
        "👗",
        "👠",
        "👜",
        "🎒",
        "👓",
        "⌚",
        "💄",
        "💍",
        "🕶️",
        "👑",
        "🧢",
        "🎩",
        "🧥",
        // 娱乐休闲
        "🎬",
        "�",
        "🎲",
        "🎯",
        "🎪",
        "🎭",
        "🎨",
        "🎵",
        "🎶",
        "🎸",
        "🎹",
        "🎤",
        "🎧",
        "📻",
        "🎺",
        "🎷",
        "🥁",
        "🎻",
        "🎪",
        "🎟️",
        "🏀",
        "⚽",
        "🏈",
        "⚾",
        "🎾",
        "🏐",
        "🏓",
        "🏸",
        "🥊",
        "🏊",
        // 居家生活
        "🏡",
        "🏢",
        "🏬",
        "🏪",
        "🏨",
        "🏦",
        "🏥",
        "🏫",
        "🏛️",
        "⚡",
        "💡",
        "🔧",
        "🔨",
        "🪑",
        "🛏️",
        "🚿",
        "🧹",
        "🧽",
        "🗑️",
        "📺",
        "💻",
        "📱",
        "⌨️",
        "🖥️",
        "🖨️",
        "📷",
        "🎥",
        "📞",
        "☎️",
        // 医疗健康
        "💊",
        "🏥",
        "⚕️",
        "🩺",
        "🌡️",
        "🧴",
        "🧪",
        "🔬",
        "🧬",
        "🦠",
        "😷",
        "🤒",
        "🤕",
        "🩹",
        "🧘",
        "🏃",
        "🚴",
        "💪",
        "❤️",
        // 教育学习
        "✏️",
        "📐",
        "🧮",
        "🔍",
        "📊",
        "📈",
        "💹",
        "📋",
        "📌",
        "📍",
        "🗂️",
        "📁",
        "📂",
        "🗃️",
        "🗄️",
        "👨‍🏫",
        "👩‍🏫",
        "🏫",
        "📑",
        "📄",
        "📃",
        "📜",
        // 工作商务
        "👔",
        "💻",
        "📊",
        "📈",
        "💹",
        "💰",
        "💳",
        "🏦",
        "🏢",
        "📞",
        "📧",
        "📨",
        "📩",
        "📤",
        "📥",
        "📮",
        "🗳️",
        "✉️",
        "📪",
        "💼",
        "👨‍💼",
        "👩‍💼",
        "👨‍💻",
        "👩‍💻",
        "🖊️",
        "✒️",
        "🖍️",
        // 旅行度假
        "✈️",
        "🏝️",
        "⛱️",
        "🧳",
        "🎒",
        "📷",
        "🎫",
        "🎟️",
        "⛺",
        "🔥",
        "🌅",
        "🌄",
        "🏔️",
        "🌋",
        "🏜️",
        "🏞️",
        "🎡",
        "🗼",
        "⛪",
        "🕌",
        "🛕",
        // 节日庆典
        "🎄",
        "🎅",
        "🤶",
        "👻",
        "🦇",
        "☠️",
        "🎆",
        "🎇",
        "✨",
        "🌟",
        "⭐",
        "🌙",
        "☀️",
        "🌈",
        "🔥",
        "⚡",
        "🌪️",
        "🌊",
        "❄️",
        // 货币金融
        "💴",
        "💵",
        "💶",
        "💷",
        "💸",
        "💲",
        "💱",
        "💎",
        "🪙",
        "📊",
        "📈",
        "📉",
        "💹",
        "💳",
        "💰",
        "🤑",
        "💸",
        "🧾",
        // 其他实用
        "📦",
        "📮",
        "🗑️",
        "♻️",
        "⚠️",
        "🚫",
        "✅",
        "❌",
        "❓",
        "❗",
        "💯",
        "🔔",
        "🔕",
        "🔇",
        "🔊",
        "📢",
        "📣",
        "📯",
        "📻"
      ],
      // 默认分类数据
      defaultExpenseCategories: [
        { id: 1, name: "餐饮", icon: "🍽️" },
        { id: 2, name: "交通", icon: "🚗" },
        { id: 3, name: "购物", icon: "🛍️" },
        { id: 4, name: "娱乐", icon: "🎬" },
        { id: 5, name: "住房", icon: "🏠" },
        { id: 6, name: "医疗", icon: "💊" },
        { id: 7, name: "教育", icon: "📚" },
        { id: 8, name: "通讯", icon: "📱" },
        { id: 9, name: "服装", icon: "👕" },
        { id: 10, name: "其他", icon: "📦" }
      ],
      defaultIncomeCategories: [
        { id: 11, name: "工资", icon: "💰" },
        { id: 12, name: "奖金", icon: "🎁" },
        { id: 13, name: "投资", icon: "📈" },
        { id: 14, name: "兼职", icon: "💼" },
        { id: 15, name: "红包", icon: "🧧" },
        { id: 16, name: "退款", icon: "↩️" },
        { id: 17, name: "其他", icon: "💎" }
      ]
    };
  },
  computed: {
    currentCategories() {
      return this.currentTab === "expense" ? this.expenseCategories : this.incomeCategories;
    }
  },
  onLoad() {
    this.loadCategories();
  },
  methods: {
    // 加载分类数据
    loadCategories() {
      let expenseCategories = common_vendor.index.getStorageSync("expenseCategories");
      let incomeCategories = common_vendor.index.getStorageSync("incomeCategories");
      if (!expenseCategories || expenseCategories.length === 0) {
        expenseCategories = this.defaultExpenseCategories;
        common_vendor.index.setStorageSync("expenseCategories", expenseCategories);
      }
      if (!incomeCategories || incomeCategories.length === 0) {
        incomeCategories = this.defaultIncomeCategories;
        common_vendor.index.setStorageSync("incomeCategories", incomeCategories);
      }
      this.expenseCategories = expenseCategories;
      this.incomeCategories = incomeCategories;
    },
    // 切换标签页
    switchTab(tab) {
      this.currentTab = tab;
    },
    // 显示添加弹窗
    showAddModal() {
      this.isEdit = false;
      this.editId = null;
      this.formData = {
        name: "",
        icon: ""
      };
      this.showModal = true;
    },
    // 编辑分类
    editCategory(category) {
      this.isEdit = true;
      this.editId = category.id;
      this.formData = {
        name: category.name,
        icon: category.icon
      };
      this.showModal = true;
    },
    // 选择图标
    selectIcon(icon) {
      this.formData.icon = icon;
    },
    // 关闭弹窗
    closeModal() {
      this.showModal = false;
      this.formData = {
        name: "",
        icon: ""
      };
    },
    // 保存分类
    saveCategory() {
      if (!this.formData.name.trim()) {
        common_vendor.index.showToast({
          title: "请输入分类名称",
          icon: "none"
        });
        return;
      }
      if (!this.formData.icon) {
        common_vendor.index.showToast({
          title: "请选择图标",
          icon: "none"
        });
        return;
      }
      const categories = this.currentTab === "expense" ? this.expenseCategories : this.incomeCategories;
      const storageKey = this.currentTab === "expense" ? "expenseCategories" : "incomeCategories";
      if (this.isEdit) {
        const index = categories.findIndex((cat) => cat.id === this.editId);
        if (index !== -1) {
          categories[index] = {
            ...categories[index],
            name: this.formData.name.trim(),
            icon: this.formData.icon
          };
        }
      } else {
        const maxId = Math.max(...categories.map((cat) => cat.id), 0);
        const newCategory = {
          id: maxId + 1,
          name: this.formData.name.trim(),
          icon: this.formData.icon
        };
        categories.push(newCategory);
      }
      if (this.currentTab === "expense") {
        this.expenseCategories = [...categories];
      } else {
        this.incomeCategories = [...categories];
      }
      common_vendor.index.setStorageSync(storageKey, categories);
      this.closeModal();
      common_vendor.index.showToast({
        title: this.isEdit ? "修改成功" : "添加成功",
        icon: "success"
      });
    },
    // 删除分类
    deleteCategory(category) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: `确定要删除分类"${category.name}"吗？删除后相关记录将显示为"未知分类"。`,
        confirmColor: "#FF3B30",
        success: (res) => {
          if (res.confirm) {
            const categories = this.currentTab === "expense" ? this.expenseCategories : this.incomeCategories;
            const storageKey = this.currentTab === "expense" ? "expenseCategories" : "incomeCategories";
            const filteredCategories = categories.filter((cat) => cat.id !== category.id);
            if (this.currentTab === "expense") {
              this.expenseCategories = filteredCategories;
            } else {
              this.incomeCategories = filteredCategories;
            }
            common_vendor.index.setStorageSync(storageKey, filteredCategories);
            common_vendor.index.showToast({
              title: "删除成功",
              icon: "success"
            });
          }
        }
      });
    },
    // 恢复默认分类
    resetToDefault() {
      common_vendor.index.showModal({
        title: "恢复默认",
        content: "确定要恢复到默认分类吗？这将清除所有自定义分类。",
        success: (res) => {
          if (res.confirm) {
            this.expenseCategories = [...this.defaultExpenseCategories];
            this.incomeCategories = [...this.defaultIncomeCategories];
            common_vendor.index.setStorageSync("expenseCategories", this.expenseCategories);
            common_vendor.index.setStorageSync("incomeCategories", this.incomeCategories);
            common_vendor.index.showToast({
              title: "已恢复默认分类",
              icon: "success"
            });
          }
        }
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.resetToDefault && $options.resetToDefault(...args)),
    b: common_vendor.o((...args) => $options.showAddModal && $options.showAddModal(...args)),
    c: $data.currentTab === "expense" ? 1 : "",
    d: common_vendor.o(($event) => $options.switchTab("expense")),
    e: $data.currentTab === "income" ? 1 : "",
    f: common_vendor.o(($event) => $options.switchTab("income")),
    g: common_vendor.f($options.currentCategories, (category, k0, i0) => {
      return {
        a: common_vendor.t(category.icon),
        b: common_vendor.t(category.name),
        c: category.id,
        d: common_vendor.o(($event) => $options.editCategory(category), category.id),
        e: common_vendor.o(($event) => $options.deleteCategory(category), category.id)
      };
    }),
    h: $data.showModal
  }, $data.showModal ? {
    i: common_vendor.t($data.isEdit ? "编辑分类" : "添加分类"),
    j: common_vendor.o((...args) => $options.closeModal && $options.closeModal(...args)),
    k: $data.formData.name,
    l: common_vendor.o(($event) => $data.formData.name = $event.detail.value),
    m: common_vendor.f($data.availableIcons, (icon, k0, i0) => {
      return {
        a: common_vendor.t(icon),
        b: icon,
        c: $data.formData.icon === icon ? 1 : "",
        d: common_vendor.o(($event) => $options.selectIcon(icon), icon)
      };
    }),
    n: common_vendor.o((...args) => $options.closeModal && $options.closeModal(...args)),
    o: common_vendor.t($data.isEdit ? "保存" : "添加"),
    p: common_vendor.o((...args) => $options.saveCategory && $options.saveCategory(...args)),
    q: common_vendor.o(() => {
    }),
    r: common_vendor.o((...args) => $options.closeModal && $options.closeModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-1d7a4849"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/icon-manage/icon-manage.js.map
