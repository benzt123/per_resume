"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      categoryInfo: {},
      records: [],
      displayRecords: [],
      pageSize: 10,
      totalCount: 0,
      totalAmount: "0.00",
      avgAmount: "0.00",
      maxAmount: "0.00",
      minAmount: "0.00",
      firstUseDate: "暂无",
      lastUseDate: "暂无",
      monthlyCount: 0,
      monthlyAmount: "0.00",
      lastMonthCount: 0,
      lastMonthAmount: "0.00",
      yearlyCount: 0,
      yearlyAmount: "0.00",
      lastYearCount: 0,
      lastYearAmount: "0.00",
      monthlyTrend: [],
      yearlyTrend: [],
      // 金额计算工具函数，解决浮点数精度问题
      moneyCalculator: {
        // 金额加法
        add(a, b) {
          const factor = 100;
          return Math.round(parseFloat(a) * factor + parseFloat(b) * factor) / factor;
        },
        // 金额减法
        subtract(a, b) {
          const factor = 100;
          return Math.round(parseFloat(a) * factor - parseFloat(b) * factor) / factor;
        },
        // 金额乘法
        multiply(a, b) {
          const factor = 100;
          return Math.round(parseFloat(a) * parseFloat(b) * factor) / factor;
        },
        // 金额除法
        divide(a, b) {
          if (parseFloat(b) === 0)
            return 0;
          const factor = 100;
          return Math.round(parseFloat(a) / parseFloat(b) * factor) / factor;
        },
        // 格式化金额，保留两位小数
        format(amount) {
          return parseFloat(amount).toFixed(2);
        }
      }
    };
  },
  onLoad(options) {
    if (options.category) {
      try {
        this.categoryInfo = JSON.parse(decodeURIComponent(options.category));
        this.loadCategoryData();
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/category-detail/category-detail.vue:273", "解析分类信息失败:", e);
        common_vendor.index.showToast({
          title: "数据加载失败",
          icon: "none"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      }
    }
  },
  methods: {
    loadCategoryData() {
      const allRecords = common_vendor.index.getStorageSync("records") || [];
      this.records = allRecords.filter(
        (record) => record.categoryId === this.categoryInfo.id && record.type === this.categoryInfo.type
      ).sort((a, b) => new Date(b.time) - new Date(a.time));
      this.calculateStats();
      this.loadMoreRecords(true);
    },
    calculateStats() {
      if (this.records.length === 0) {
        this.totalCount = 0;
        this.totalAmount = "0.00";
        this.avgAmount = "0.00";
        this.maxAmount = "0.00";
        this.minAmount = "0.00";
        this.firstUseDate = "暂无";
        this.lastUseDate = "暂无";
        this.monthlyCount = 0;
        this.monthlyAmount = "0.00";
        return;
      }
      this.totalCount = this.records.length;
      let totalAmount = 0;
      let maxAmount = 0;
      let minAmount = Infinity;
      this.records.forEach((record) => {
        const amount = parseFloat(record.amount);
        totalAmount = this.moneyCalculator.add(totalAmount, amount);
        if (amount > maxAmount)
          maxAmount = amount;
        if (amount < minAmount)
          minAmount = amount;
      });
      this.totalAmount = this.moneyCalculator.format(totalAmount);
      this.avgAmount = this.moneyCalculator.format(this.moneyCalculator.divide(totalAmount, this.records.length));
      this.maxAmount = this.moneyCalculator.format(maxAmount);
      this.minAmount = minAmount === Infinity ? "0.00" : this.moneyCalculator.format(minAmount);
      const sortedByTime = [...this.records].sort((a, b) => new Date(a.time) - new Date(b.time));
      this.firstUseDate = this.formatDate(sortedByTime[0].time);
      this.lastUseDate = this.formatDate(sortedByTime[sortedByTime.length - 1].time);
      this.calculateMonthlyStats();
      this.calculateYearlyStats();
    },
    calculateMonthlyStats() {
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthRecords = this.records.filter((record) => {
        const recordDate = new Date(record.time);
        return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
      });
      this.monthlyCount = monthRecords.length;
      if (monthRecords.length > 0) {
        let monthTotal = 0;
        monthRecords.forEach((record) => {
          monthTotal = this.moneyCalculator.add(monthTotal, parseFloat(record.amount));
        });
        this.monthlyAmount = this.moneyCalculator.format(monthTotal);
      } else {
        this.monthlyAmount = "0.00";
      }
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonthRecords = this.records.filter((record) => {
        const recordDate = new Date(record.time);
        return recordDate.getFullYear() === lastMonthYear && recordDate.getMonth() === lastMonth;
      });
      this.lastMonthCount = lastMonthRecords.length;
      if (lastMonthRecords.length > 0) {
        let lastMonthTotal = 0;
        lastMonthRecords.forEach((record) => {
          lastMonthTotal = this.moneyCalculator.add(lastMonthTotal, parseFloat(record.amount));
        });
        this.lastMonthAmount = this.moneyCalculator.format(lastMonthTotal);
      } else {
        this.lastMonthAmount = "0.00";
      }
    },
    calculateYearlyStats() {
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const yearRecords = this.records.filter((record) => {
        const recordDate = new Date(record.time);
        return recordDate.getFullYear() === currentYear;
      });
      this.yearlyCount = yearRecords.length;
      if (yearRecords.length > 0) {
        let yearTotal = 0;
        yearRecords.forEach((record) => {
          yearTotal = this.moneyCalculator.add(yearTotal, parseFloat(record.amount));
        });
        this.yearlyAmount = this.moneyCalculator.format(yearTotal);
      } else {
        this.yearlyAmount = "0.00";
      }
      const lastYear = currentYear - 1;
      const lastYearRecords = this.records.filter((record) => {
        const recordDate = new Date(record.time);
        return recordDate.getFullYear() === lastYear;
      });
      this.lastYearCount = lastYearRecords.length;
      if (lastYearRecords.length > 0) {
        let lastYearTotal = 0;
        lastYearRecords.forEach((record) => {
          lastYearTotal = this.moneyCalculator.add(lastYearTotal, parseFloat(record.amount));
        });
        this.lastYearAmount = this.moneyCalculator.format(lastYearTotal);
      } else {
        this.lastYearAmount = "0.00";
      }
      this.calculateMonthlyTrend();
      this.calculateYearlyTrend();
    },
    calculateMonthlyTrend() {
      const monthlyData = [];
      const now = /* @__PURE__ */ new Date();
      const allRecords = common_vendor.index.getStorageSync("records") || [];
      const categoryRecords = allRecords.filter(
        (record) => record.categoryId === this.categoryInfo.id && record.type === this.categoryInfo.type
      );
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData.push({
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          monthKey,
          count: 0,
          amount: "0.00"
        });
      }
      categoryRecords.forEach((record) => {
        const recordDate = new Date(record.time);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth() + 1;
        const monthKey = `${recordYear}-${String(recordMonth).padStart(2, "0")}`;
        const monthData = monthlyData.find((m) => m.monthKey === monthKey);
        if (monthData) {
          monthData.count += 1;
          const currentAmount = parseFloat(monthData.amount);
          const recordAmount = parseFloat(record.amount);
          monthData.amount = (currentAmount + recordAmount).toFixed(2);
        }
      });
      this.monthlyTrend = monthlyData;
    },
    getComparisonClass(current, previous) {
      if (current > previous)
        return "positive";
      if (current < previous)
        return "negative";
      return "neutral";
    },
    getComparisonText(current, previous, unit) {
      const diff = current - previous;
      const percentage = previous > 0 ? (diff / previous * 100).toFixed(1) : "0.0";
      if (diff > 0) {
        return `↗ +${Math.abs(diff).toFixed(unit === "元" ? 2 : 0)}${unit} (+${percentage}%)`;
      } else if (diff < 0) {
        return `↘ -${Math.abs(diff).toFixed(unit === "元" ? 2 : 0)}${unit} (-${Math.abs(percentage)}%)`;
      } else {
        return `→ 持平 (0%)`;
      }
    },
    calculateYearlyTrend() {
      const yearlyData = [];
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      for (let i = 0; i < 4; i++) {
        const year = currentYear - i;
        yearlyData.push({
          year,
          count: 0,
          amount: "0.00"
        });
      }
      this.records.forEach((record) => {
        const recordYear = new Date(record.time).getFullYear();
        const yearData = yearlyData.find((y) => y.year === recordYear);
        if (yearData) {
          yearData.count += 1;
          const currentAmount = parseFloat(yearData.amount);
          const recordAmount = parseFloat(record.amount);
          yearData.amount = (currentAmount + recordAmount).toFixed(2);
        }
      });
      this.yearlyTrend = yearlyData;
    },
    getYearTrendBarHeight(amount) {
      if (this.yearlyTrend.length === 0)
        return 0;
      const maxAmount = Math.max(...this.yearlyTrend.map((y) => parseFloat(y.amount)));
      if (maxAmount === 0)
        return 20;
      const ratio = parseFloat(amount) / maxAmount;
      return Math.max(20, ratio * 150);
    },
    getTrendBarHeight(amount) {
      if (this.monthlyTrend.length === 0)
        return 0;
      const maxAmount = Math.max(...this.monthlyTrend.map((m) => parseFloat(m.amount)));
      if (maxAmount === 0)
        return 20;
      const ratio = parseFloat(amount) / maxAmount;
      return Math.max(20, ratio * 120);
    },
    loadMoreRecords(reset = false) {
      if (reset) {
        this.displayRecords = [];
      }
      const startIndex = this.displayRecords.length;
      const endIndex = startIndex + this.pageSize;
      const newRecords = this.records.slice(startIndex, endIndex);
      this.displayRecords.push(...newRecords);
    },
    getMonthLabel(month) {
      return `${month.month}月`;
    },
    formatDate(timeStr) {
      const date = new Date(timeStr);
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1e3);
      const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (recordDate.getTime() === today.getTime()) {
        return "今天";
      } else if (recordDate.getTime() === yesterday.getTime()) {
        return "昨天";
      } else {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }
    },
    formatTime(timeStr) {
      const date = new Date(timeStr);
      return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },
    showRecordDetail(record) {
      common_vendor.index.showModal({
        title: "记录详情",
        content: `分类：${record.categoryName}
金额：${record.type === "expense" ? "-" : "+"}¥${record.amount}
备注：${record.note || "无"}
时间：${new Date(record.time).toLocaleString("zh-CN")}`,
        showCancel: false
      });
    },
    goToAdd() {
      const categoryParam = encodeURIComponent(JSON.stringify(this.categoryInfo));
      common_vendor.index.navigateTo({
        url: `/pages/add/add?presetCategory=${categoryParam}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.categoryInfo.icon),
    b: common_vendor.t($data.categoryInfo.name),
    c: common_vendor.t($data.categoryInfo.type === "expense" ? "支出分类" : "收入分类"),
    d: common_vendor.t($data.yearlyCount),
    e: common_vendor.t($data.yearlyAmount),
    f: $data.lastYearCount > 0 || $data.yearlyCount > 0
  }, $data.lastYearCount > 0 || $data.yearlyCount > 0 ? {
    g: common_vendor.t($options.getComparisonText($data.yearlyCount, $data.lastYearCount, "次")),
    h: common_vendor.n($options.getComparisonClass($data.yearlyCount, $data.lastYearCount)),
    i: common_vendor.t($options.getComparisonText(parseFloat($data.yearlyAmount), parseFloat($data.lastYearAmount), "元")),
    j: common_vendor.n($options.getComparisonClass(parseFloat($data.yearlyAmount), parseFloat($data.lastYearAmount)))
  } : {}, {
    k: common_vendor.t($data.monthlyCount),
    l: common_vendor.t($data.monthlyAmount),
    m: $data.lastMonthCount > 0 || $data.monthlyCount > 0
  }, $data.lastMonthCount > 0 || $data.monthlyCount > 0 ? {
    n: common_vendor.t($options.getComparisonText($data.monthlyCount, $data.lastMonthCount, "次")),
    o: common_vendor.n($options.getComparisonClass($data.monthlyCount, $data.lastMonthCount)),
    p: common_vendor.t($options.getComparisonText(parseFloat($data.monthlyAmount), parseFloat($data.lastMonthAmount), "元")),
    q: common_vendor.n($options.getComparisonClass(parseFloat($data.monthlyAmount), parseFloat($data.lastMonthAmount)))
  } : {}, {
    r: $data.yearlyTrend.length > 0
  }, $data.yearlyTrend.length > 0 ? {
    s: common_vendor.f($data.yearlyTrend, (year, index, i0) => {
      return {
        a: common_vendor.t(year.year),
        b: common_vendor.t(year.amount),
        c: index,
        d: $options.getYearTrendBarHeight(year.amount) + "rpx"
      };
    })
  } : {}, {
    t: $data.monthlyTrend.length > 0
  }, $data.monthlyTrend.length > 0 ? {
    v: common_vendor.f($data.monthlyTrend, (month, index, i0) => {
      return {
        a: common_vendor.t($options.getMonthLabel(month)),
        b: common_vendor.t(month.amount),
        c: index,
        d: $options.getTrendBarHeight(month.amount) + "rpx"
      };
    })
  } : {}, {
    w: common_vendor.t($data.totalCount),
    x: common_vendor.t($data.totalAmount),
    y: common_vendor.t($data.avgAmount),
    z: common_vendor.t($data.maxAmount),
    A: common_vendor.t($data.firstUseDate),
    B: common_vendor.t($data.lastUseDate),
    C: common_vendor.t($data.records.length),
    D: $data.records.length === 0
  }, $data.records.length === 0 ? {
    E: common_vendor.o((...args) => $options.goToAdd && $options.goToAdd(...args))
  } : common_vendor.e({
    F: common_vendor.f($data.displayRecords, (record, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.formatDate(record.time)),
        b: common_vendor.t($options.formatTime(record.time)),
        c: record.note
      }, record.note ? {
        d: common_vendor.t(record.note)
      } : {}, {
        e: common_vendor.t(record.type === "expense" ? "-" : "+"),
        f: common_vendor.t(record.amount),
        g: common_vendor.n(record.type),
        h: record.id,
        i: common_vendor.o(($event) => $options.showRecordDetail(record), record.id)
      });
    }),
    G: $data.records.length > $data.displayRecords.length
  }, $data.records.length > $data.displayRecords.length ? {
    H: common_vendor.t($data.records.length - $data.displayRecords.length),
    I: common_vendor.o((...args) => $options.loadMoreRecords && $options.loadMoreRecords(...args))
  } : {}), {
    J: common_vendor.t($data.categoryInfo.name),
    K: common_vendor.o((...args) => $options.goToAdd && $options.goToAdd(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/category-detail/category-detail.js.map
