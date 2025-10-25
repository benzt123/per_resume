"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentPeriod: "month",
      totalExpense: 0,
      totalIncome: 0,
      expenseStats: [],
      incomeStats: [],
      expenseTrendData: [],
      incomeTrendData: [],
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
  computed: {
    periodText() {
      switch (this.currentPeriod) {
        case "week":
          return "本周";
        case "month":
          return "本月";
        case "year":
          return "本年";
        default:
          return "本月";
      }
    },
    netIncome() {
      return this.moneyCalculator.format(
        this.moneyCalculator.subtract(parseFloat(this.totalIncome), parseFloat(this.totalExpense))
      );
    }
  },
  onLoad() {
    this.calculateStats();
  },
  onShow() {
    this.calculateStats();
  },
  methods: {
    switchPeriod(period) {
      this.currentPeriod = period;
      this.calculateStats();
    },
    calculateStats() {
      const records = common_vendor.index.getStorageSync("records") || [];
      const filteredRecords = this.filterRecordsByPeriod(records);
      this.calculateTotals(filteredRecords);
      this.calculateCategoryStats(filteredRecords);
      this.calculateTrendData(records);
    },
    filterRecordsByPeriod(records) {
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentWeek = this.getWeekNumber(now);
      return records.filter((record) => {
        const recordDate = new Date(record.time);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth();
        const recordWeek = this.getWeekNumber(recordDate);
        switch (this.currentPeriod) {
          case "week":
            return recordYear === currentYear && recordWeek === currentWeek;
          case "month":
            return recordYear === currentYear && recordMonth === currentMonth;
          case "year":
            return recordYear === currentYear;
          default:
            return true;
        }
      });
    },
    getWeekNumber(date) {
      const yearStart = new Date(date.getFullYear(), 0, 1);
      const weekStart = new Date(yearStart.getTime() - yearStart.getDay() * 24 * 60 * 60 * 1e3);
      return Math.floor((date - weekStart) / (7 * 24 * 60 * 60 * 1e3));
    },
    calculateTotals(records) {
      let expense = 0;
      let income = 0;
      records.forEach((record) => {
        const amount = parseFloat(record.amount);
        if (record.type === "expense") {
          expense = this.moneyCalculator.add(expense, amount);
        } else {
          income = this.moneyCalculator.add(income, amount);
        }
      });
      this.totalExpense = this.moneyCalculator.format(expense);
      this.totalIncome = this.moneyCalculator.format(income);
    },
    calculateCategoryStats(records) {
      const expenseRecords = records.filter((r) => r.type === "expense");
      const incomeRecords = records.filter((r) => r.type === "income");
      this.expenseStats = this.getCategoryStats(expenseRecords, this.totalExpense);
      this.incomeStats = this.getCategoryStats(incomeRecords, this.totalIncome);
    },
    getCategoryStats(records, total) {
      const categoryMap = /* @__PURE__ */ new Map();
      records.forEach((record) => {
        const categoryId = record.categoryId;
        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId);
          existing.amount = this.moneyCalculator.add(existing.amount, parseFloat(record.amount));
          existing.count += 1;
        } else {
          categoryMap.set(categoryId, {
            categoryId,
            name: record.categoryName,
            icon: record.categoryIcon,
            amount: parseFloat(record.amount),
            count: 1
          });
        }
      });
      const stats = Array.from(categoryMap.values());
      stats.forEach((stat) => {
        stat.amount = this.moneyCalculator.format(stat.amount);
        stat.percentage = total > 0 ? this.moneyCalculator.format(this.moneyCalculator.multiply(
          this.moneyCalculator.divide(parseFloat(stat.amount), parseFloat(total)),
          100
        )) : "0.00";
      });
      stats.sort((a, b) => {
        if (parseFloat(b.percentage) !== parseFloat(a.percentage)) {
          return parseFloat(b.percentage) - parseFloat(a.percentage);
        }
        return b.count - a.count;
      });
      return stats;
    },
    // 获取饼状图颜色
    getPieColor(index) {
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FECA57",
        "#FF9FF3",
        "#54A0FF",
        "#5F27CD",
        "#00D2D3",
        "#FF9F43"
      ];
      return colors[index % colors.length];
    },
    // 生成饼状图样式
    getPieChartStyle(stats) {
      if (!stats || stats.length === 0) {
        return {
          background: "conic-gradient(#E0E0E0 0deg 360deg)",
          borderRadius: "50%"
        };
      }
      const displayStats = stats.slice(0, 5);
      let gradientStops = [];
      let currentAngle = 0;
      displayStats.forEach((stat, index) => {
        const percentage = parseFloat(stat.percentage);
        const color = this.getPieColor(index);
        const nextAngle = currentAngle + percentage / 100 * 360;
        gradientStops.push(`${color} ${currentAngle}deg ${nextAngle}deg`);
        currentAngle = nextAngle;
      });
      if (currentAngle < 360) {
        gradientStops.push(`#E0E0E0 ${currentAngle}deg 360deg`);
      }
      return {
        background: `conic-gradient(${gradientStops.join(", ")})`,
        borderRadius: "50%",
        transition: "all 0.3s ease"
      };
    },
    // 获取其他分类的百分比
    getOtherPercentage(stats) {
      if (stats.length <= 4)
        return "0.00";
      const otherStats = stats.slice(4);
      let otherTotal = 0;
      otherStats.forEach((stat) => {
        otherTotal = this.moneyCalculator.add(otherTotal, parseFloat(stat.percentage));
      });
      return this.moneyCalculator.format(otherTotal);
    },
    // 获取其他分类的金额
    getOtherAmount(stats) {
      if (stats.length <= 5)
        return "0.00";
      const otherStats = stats.slice(5);
      let otherTotal = 0;
      otherStats.forEach((stat) => {
        otherTotal = this.moneyCalculator.add(otherTotal, parseFloat(stat.amount));
      });
      return this.moneyCalculator.format(otherTotal);
    },
    // 计算趋势数据
    calculateTrendData(records) {
      const now = /* @__PURE__ */ new Date();
      if (this.currentPeriod === "week") {
        this.calculateWeeklyTrend(records, now);
      } else if (this.currentPeriod === "month") {
        this.calculateMonthlyTrend(records, now);
      } else if (this.currentPeriod === "year") {
        this.calculateYearlyTrend(records, now);
      }
    },
    // 计算周趋势（显示最近7天，从后往前）
    calculateWeeklyTrend(records, now) {
      const expenseData = {};
      const incomeData = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        expenseData[dateKey] = { date: dateKey, amount: 0, day: date.getDate() };
        incomeData[dateKey] = { date: dateKey, amount: 0, day: date.getDate() };
      }
      records.forEach((record) => {
        const recordDate = new Date(record.time).toISOString().split("T")[0];
        const amount = parseFloat(record.amount);
        if (record.type === "expense" && expenseData[recordDate]) {
          expenseData[recordDate].amount = this.moneyCalculator.add(expenseData[recordDate].amount, amount);
        } else if (record.type === "income" && incomeData[recordDate]) {
          incomeData[recordDate].amount = this.moneyCalculator.add(incomeData[recordDate].amount, amount);
        }
      });
      this.expenseTrendData = Object.values(expenseData).map((item) => ({
        ...item,
        amount: this.moneyCalculator.format(item.amount)
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      this.incomeTrendData = Object.values(incomeData).map((item) => ({
        ...item,
        amount: this.moneyCalculator.format(item.amount)
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    // 计算月趋势（显示最近12个月，从后往前）
    calculateMonthlyTrend(records, now) {
      const expenseData = {};
      const incomeData = {};
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        expenseData[monthKey] = { month: date.getMonth() + 1, year: date.getFullYear(), amount: 0 };
        incomeData[monthKey] = { month: date.getMonth() + 1, year: date.getFullYear(), amount: 0 };
      }
      records.forEach((record) => {
        const recordDate = new Date(record.time);
        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, "0")}`;
        const amount = parseFloat(record.amount);
        if (record.type === "expense" && expenseData[monthKey]) {
          expenseData[monthKey].amount = this.moneyCalculator.add(expenseData[monthKey].amount, amount);
        } else if (record.type === "income" && incomeData[monthKey]) {
          incomeData[monthKey].amount = this.moneyCalculator.add(incomeData[monthKey].amount, amount);
        }
      });
      this.expenseTrendData = Object.values(expenseData).map((item) => ({
        ...item,
        amount: this.moneyCalculator.format(item.amount)
      })).sort((a, b) => {
        if (b.year !== a.year)
          return b.year - a.year;
        return b.month - a.month;
      });
      this.incomeTrendData = Object.values(incomeData).map((item) => ({
        ...item,
        amount: this.moneyCalculator.format(item.amount)
      })).sort((a, b) => {
        if (b.year !== a.year)
          return b.year - a.year;
        return b.month - a.month;
      });
    },
    // 计算年趋势（显示最近5年，从后往前）
    calculateYearlyTrend(records, now) {
      const expenseData = {};
      const incomeData = {};
      for (let i = 0; i < 5; i++) {
        const year = now.getFullYear() - i;
        expenseData[year] = { year, amount: 0 };
        incomeData[year] = { year, amount: 0 };
      }
      records.forEach((record) => {
        const recordYear = new Date(record.time).getFullYear();
        const amount = parseFloat(record.amount);
        if (record.type === "expense" && expenseData[recordYear]) {
          expenseData[recordYear].amount = this.moneyCalculator.add(expenseData[recordYear].amount, amount);
        } else if (record.type === "income" && incomeData[recordYear]) {
          incomeData[recordYear].amount = this.moneyCalculator.add(incomeData[recordYear].amount, amount);
        }
      });
      this.expenseTrendData = Object.values(expenseData).map((item) => ({
        ...item,
        amount: this.moneyCalculator.format(item.amount)
      })).sort((a, b) => b.year - a.year);
      this.incomeTrendData = Object.values(incomeData).map((item) => ({
        ...item,
        amount: this.moneyCalculator.format(item.amount)
      })).sort((a, b) => b.year - a.year);
    },
    // 获取趋势图柱状图高度
    getTrendBarHeight(amount, trendData) {
      if (!trendData || trendData.length === 0)
        return 20;
      const maxAmount = Math.max(...trendData.map((item) => parseFloat(item.amount)));
      if (maxAmount === 0)
        return 20;
      const ratio = parseFloat(amount) / maxAmount;
      return Math.max(20, ratio * 120);
    },
    // 获取趋势图标签
    getTrendLabel(item, index) {
      if (this.currentPeriod === "week") {
        return `${item.day}日`;
      } else if (this.currentPeriod === "month") {
        return `${item.month}月`;
      } else if (this.currentPeriod === "year") {
        return `${item.year}`;
      }
      return "";
    },
    // 获取分类在原始排序中的索引，用于保持颜色一致性
    getOriginalIndex(stat, statsArray) {
      return statsArray.findIndex((item) => item.categoryId === stat.categoryId);
    },
    // 显示分类详情
    showCategoryDetail(stat, type) {
      const category = {
        id: stat.categoryId,
        name: stat.name,
        icon: stat.icon,
        type
      };
      const categoryParam = encodeURIComponent(JSON.stringify(category));
      common_vendor.index.navigateTo({
        url: `/pages/category-detail/category-detail?category=${categoryParam}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.currentPeriod === "week" ? 1 : "",
    b: common_vendor.o(($event) => $options.switchPeriod("week")),
    c: $data.currentPeriod === "month" ? 1 : "",
    d: common_vendor.o(($event) => $options.switchPeriod("month")),
    e: $data.currentPeriod === "year" ? 1 : "",
    f: common_vendor.o(($event) => $options.switchPeriod("year")),
    g: common_vendor.t($options.periodText),
    h: common_vendor.t($data.totalExpense),
    i: common_vendor.t($options.periodText),
    j: common_vendor.t($data.totalIncome),
    k: common_vendor.t(parseFloat($options.netIncome) >= 0 ? "+" : "-"),
    l: common_vendor.t(Math.abs(parseFloat($options.netIncome)).toFixed(2)),
    m: common_vendor.n(parseFloat($options.netIncome) >= 0 ? "net-positive" : "net-negative"),
    n: $data.expenseTrendData.length === 0
  }, $data.expenseTrendData.length === 0 ? {} : {
    o: common_vendor.f($data.expenseTrendData, (item, index, i0) => {
      return {
        a: common_vendor.t($options.getTrendLabel(item, index)),
        b: common_vendor.t(item.amount),
        c: index,
        d: $options.getTrendBarHeight(item.amount, $data.expenseTrendData) + "rpx"
      };
    })
  }, {
    p: $data.incomeTrendData.length === 0
  }, $data.incomeTrendData.length === 0 ? {} : {
    q: common_vendor.f($data.incomeTrendData, (item, index, i0) => {
      return {
        a: common_vendor.t($options.getTrendLabel(item, index)),
        b: common_vendor.t(item.amount),
        c: index,
        d: $options.getTrendBarHeight(item.amount, $data.incomeTrendData) + "rpx"
      };
    })
  }, {
    r: common_vendor.t($options.periodText),
    s: $data.expenseStats.length === 0
  }, $data.expenseStats.length === 0 ? {} : common_vendor.e({
    t: common_vendor.t($data.totalExpense),
    v: common_vendor.s($options.getPieChartStyle($data.expenseStats)),
    w: common_vendor.f($data.expenseStats.slice(0, 5), (stat, index, i0) => {
      return {
        a: $options.getPieColor($options.getOriginalIndex(stat, $data.expenseStats)),
        b: common_vendor.t(stat.name),
        c: common_vendor.t(stat.percentage),
        d: common_vendor.t(stat.amount),
        e: stat.categoryId
      };
    }),
    x: $data.expenseStats.length > 5
  }, $data.expenseStats.length > 5 ? {
    y: common_vendor.t($options.getOtherPercentage($data.expenseStats)),
    z: common_vendor.t($options.getOtherAmount($data.expenseStats))
  } : {}, {
    A: common_vendor.f($data.expenseStats, (stat, k0, i0) => {
      return {
        a: common_vendor.t(stat.icon),
        b: common_vendor.t(stat.name),
        c: common_vendor.t(stat.count),
        d: common_vendor.t(stat.amount),
        e: common_vendor.t(stat.percentage),
        f: stat.categoryId,
        g: common_vendor.o(($event) => $options.showCategoryDetail(stat, "expense"), stat.categoryId)
      };
    })
  }), {
    B: common_vendor.t($options.periodText),
    C: $data.incomeStats.length === 0
  }, $data.incomeStats.length === 0 ? {} : common_vendor.e({
    D: common_vendor.t($data.totalIncome),
    E: common_vendor.s($options.getPieChartStyle($data.incomeStats)),
    F: common_vendor.f($data.incomeStats.slice(0, 5), (stat, index, i0) => {
      return {
        a: $options.getPieColor($options.getOriginalIndex(stat, $data.incomeStats)),
        b: common_vendor.t(stat.name),
        c: common_vendor.t(stat.percentage),
        d: common_vendor.t(stat.amount),
        e: stat.categoryId
      };
    }),
    G: $data.incomeStats.length > 5
  }, $data.incomeStats.length > 5 ? {
    H: common_vendor.t($options.getOtherPercentage($data.incomeStats)),
    I: common_vendor.t($options.getOtherAmount($data.incomeStats))
  } : {}, {
    J: common_vendor.f($data.incomeStats, (stat, k0, i0) => {
      return {
        a: common_vendor.t(stat.icon),
        b: common_vendor.t(stat.name),
        c: common_vendor.t(stat.count),
        d: common_vendor.t(stat.amount),
        e: common_vendor.t(stat.percentage),
        f: stat.categoryId,
        g: common_vendor.o(($event) => $options.showCategoryDetail(stat, "income"), stat.categoryId)
      };
    })
  }));
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/statistics/statistics.js.map
