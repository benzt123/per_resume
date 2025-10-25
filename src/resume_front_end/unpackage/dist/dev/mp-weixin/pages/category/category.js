"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentType: "expense",
      usageStats: [],
      expenseCategories: [],
      incomeCategories: [],
      // 默认分类数据（作为备用）
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
      return this.currentType === "expense" ? this.expenseCategories : this.incomeCategories;
    }
  },
  onLoad() {
    this.loadCategories();
    this.calculateUsageStats();
  },
  onShow() {
    this.loadCategories();
    this.calculateUsageStats();
  },
  methods: {
    // 动态加载分类数据
    loadCategories() {
      let expenseCategories = common_vendor.index.getStorageSync("expenseCategories");
      let incomeCategories = common_vendor.index.getStorageSync("incomeCategories");
      if (!expenseCategories || expenseCategories.length === 0) {
        expenseCategories = [...this.defaultExpenseCategories];
        common_vendor.index.setStorageSync("expenseCategories", expenseCategories);
      }
      if (!incomeCategories || incomeCategories.length === 0) {
        incomeCategories = [...this.defaultIncomeCategories];
        common_vendor.index.setStorageSync("incomeCategories", incomeCategories);
      }
      this.expenseCategories = expenseCategories;
      this.incomeCategories = incomeCategories;
    },
    switchType(type) {
      this.currentType = type;
      this.loadCategories();
      this.calculateUsageStats();
    },
    getCategoryUsage(categoryId) {
      const records = common_vendor.index.getStorageSync("records") || [];
      return records.filter(
        (record) => record.categoryId === categoryId && record.type === this.currentType
      ).length;
    },
    calculateUsageStats() {
      const records = common_vendor.index.getStorageSync("records") || [];
      const filteredRecords = records.filter((record) => record.type === this.currentType);
      const categoryMap = /* @__PURE__ */ new Map();
      filteredRecords.forEach((record) => {
        const categoryId = record.categoryId;
        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId);
          existing.count += 1;
          existing.totalAmount += parseFloat(record.amount);
        } else {
          categoryMap.set(categoryId, {
            categoryId,
            name: record.categoryName,
            icon: record.categoryIcon,
            count: 1,
            totalAmount: parseFloat(record.amount)
          });
        }
      });
      const stats = Array.from(categoryMap.values());
      stats.forEach((stat) => {
        stat.totalAmount = stat.totalAmount.toFixed(2);
      });
      stats.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.totalAmount - a.totalAmount;
      });
      this.usageStats = stats;
    },
    showCategoryDetail(category) {
      const categoryParam = encodeURIComponent(JSON.stringify({
        id: category.id,
        name: category.name,
        icon: category.icon,
        type: this.currentType
      }));
      common_vendor.index.navigateTo({
        url: `/pages/category-detail/category-detail?category=${categoryParam}`
      });
    },
    goToIconManage() {
      common_vendor.index.navigateTo({
        url: "/pages/icon-manage/icon-manage"
      });
    },
    refreshCategories() {
      this.loadCategories();
      this.calculateUsageStats();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goToIconManage && $options.goToIconManage(...args)),
    b: $data.currentType === "expense" ? 1 : "",
    c: common_vendor.o(($event) => $options.switchType("expense")),
    d: $data.currentType === "income" ? 1 : "",
    e: common_vendor.o(($event) => $options.switchType("income")),
    f: common_vendor.f($options.currentCategories, (category, k0, i0) => {
      return {
        a: common_vendor.t(category.icon),
        b: common_vendor.t(category.name),
        c: common_vendor.t($options.getCategoryUsage(category.id)),
        d: category.id,
        e: common_vendor.o(($event) => $options.showCategoryDetail(category), category.id)
      };
    }),
    g: $data.usageStats.length === 0
  }, $data.usageStats.length === 0 ? {} : {}, {
    h: common_vendor.f($data.usageStats, (stat, index, i0) => {
      return {
        a: common_vendor.t(index + 1),
        b: common_vendor.t(stat.icon),
        c: common_vendor.t(stat.name),
        d: common_vendor.t(stat.count),
        e: common_vendor.t(stat.totalAmount),
        f: stat.categoryId
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/category/category.js.map
