"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/add/add.js";
  "./pages/statistics/statistics.js";
  "./pages/category/category.js";
  "./pages/profile/profile.js";
  "./pages/category-detail/category-detail.js";
  "./pages/icon-manage/icon-manage.js";
  "./pages/ai-config/ai-config.js";
  "./pages/voice-config/voice-config.js";
  "./pages/chat/chat.js";
  "./pages/budget-manage/budget-manage.js";
}
const _sfc_main = {
  onLaunch: function() {
    this.initApp();
  },
  onShow: function() {
  },
  onHide: function() {
  },
  methods: {
    initApp() {
      const isFirstLaunch = common_vendor.index.getStorageSync("isFirstLaunch");
      if (!isFirstLaunch) {
        this.initDemoData();
        common_vendor.index.setStorageSync("isFirstLaunch", true);
      }
    },
    initDemoData() {
      const demoRecords = [
        {
          id: Date.now().toString() + "1",
          type: "expense",
          amount: "25.50",
          categoryId: 1,
          categoryName: "餐饮",
          categoryIcon: "🍽️",
          note: "午餐",
          time: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "2",
          type: "expense",
          amount: "8.00",
          categoryId: 2,
          categoryName: "交通",
          categoryIcon: "🚗",
          note: "地铁",
          time: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "3",
          type: "income",
          amount: "5000.00",
          categoryId: 11,
          categoryName: "工资",
          categoryIcon: "💰",
          note: "月薪",
          time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString()
        }
      ];
      common_vendor.index.setStorageSync("records", demoRecords);
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
