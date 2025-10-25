"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      records: [],
      allRecords: [],
      // 存储所有记录
      groupedRecords: [],
      // 按日期分组的记录
      monthExpense: 0,
      monthIncome: 0,
      monthBalance: 0,
      todayExpense: 0,
      totalRecords: 0,
      avgDailyExpense: 0,
      // 预算相关 - 与预算管理页面保持一致
      categoryBudgets: [],
      // 分类预算列表
      currentMonthRecords: [],
      // 当前月份的记录
      // 时间单位定义
      timeUnits: [
        { key: "day", name: "日", factor: 30 },
        // 日预算 × 30 = 月预算
        { key: "month", name: "月", factor: 1 },
        // 月预算 × 1 = 月预算
        { key: "quarter", name: "季", factor: 1 / 3 },
        // 季预算 × 1/3 = 月预算
        { key: "year", name: "年", factor: 1 / 12 }
        // 年预算 × 1/12 = 月预算
      ],
      monthNames: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
      touchData: {},
      // 存储每个item的触摸数据
      // 分页相关
      currentPage: 1,
      pageSize: 20,
      hasMore: true,
      isLoading: false,
      // 筛选相关
      timeOptions: ["全部时间", "今天", "本周", "本月", "本年", "自定义范围"],
      selectedTimeIndex: 3,
      // 默认选择本月
      customStartDate: "",
      customEndDate: "",
      typeOptions: ["全部类型", "支出", "收入"],
      selectedTypeIndex: 0,
      categoryOptions: ["全部分类"],
      selectedCategoryIndex: 0,
      // 所有分类数据（从本地存储加载）
      expenseCategories: [],
      incomeCategories: [],
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
    // 总预算 - 直接计算各分类预算的总和（与预算管理页面保持一致）
    totalBudget() {
      return this.categoryBudgets.reduce((sum, budget) => {
        return sum + (budget.budgetAmount || 0);
      }, 0);
    },
    // 已使用金额 - 统一使用分类预算的计算方式
    usedAmount() {
      const total = this.categoryBudgets.reduce((sum, budget) => {
        return sum + (budget.spentAmount || 0);
      }, 0);
      common_vendor.index.__f__("log", "at pages/index/index.vue:310", "首页计算已使用金额(统一方式):", total);
      return total;
    },
    // 剩余金额 - 与预算管理页面保持一致
    remainingAmount() {
      return this.totalBudget - this.usedAmount;
    },
    // 使用进度百分比 - 与预算管理页面保持一致
    progressPercentage() {
      if (this.totalBudget === 0)
        return 0;
      return Math.min(this.usedAmount / this.totalBudget * 100, 100);
    },
    // 计算预算信息（始终基于本月数据，不受筛选条件影响）
    calculateBudgetInfo() {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const currentDay = now.getDate();
      const remainingDays = lastDay - currentDay + 1;
      const dailyAverage = remainingDays > 0 ? this.remainingAmount / remainingDays : 0;
      return {
        totalBudget: this.totalBudget,
        usedAmount: this.usedAmount,
        remainingAmount: this.remainingAmount,
        progress: this.progressPercentage,
        remainingDays,
        dailyAverage: Math.max(dailyAverage, 0)
      };
    }
  },
  onLoad() {
    this.loadData();
  },
  onShow() {
    this.loadData();
  },
  methods: {
    // 获取预算进度显示文本
    getBudgetProgressDisplayText() {
      const progress = this.calculateBudgetInfo.progress;
      if (progress >= 100) {
        return "已用完";
      } else {
        return Math.round(progress) + "%";
      }
    },
    loadData() {
      const records = common_vendor.index.getStorageSync("records") || [];
      this.allRecords = records.sort((a, b) => new Date(b.time) - new Date(a.time));
      this.loadBudgetData();
      this.loadCurrentMonthRecords();
      this.calculateCategorySpending();
      this.loadCategories();
      this.selectedTimeIndex = 3;
      this.updateCategoryOptions();
      this.filterRecords();
      this.calculateMonthSummary();
    },
    // 加载预算数据 - 与预算管理页面保持一致
    loadBudgetData() {
      const savedCategoryBudgets = common_vendor.index.getStorageSync("categoryBudgets");
      if (savedCategoryBudgets && Array.isArray(savedCategoryBudgets)) {
        this.categoryBudgets = savedCategoryBudgets;
      }
    },
    // 加载当前月份的记录 - 与预算管理页面保持一致
    loadCurrentMonthRecords() {
      const allRecords = common_vendor.index.getStorageSync("records") || [];
      const currentDate = /* @__PURE__ */ new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      this.currentMonthRecords = allRecords.filter((record) => {
        const recordDate = new Date(record.time);
        return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
      });
    },
    // 加载分类数据
    loadCategories() {
      const defaultExpenseCategories = [
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
      ];
      const defaultIncomeCategories = [
        { id: 11, name: "工资", icon: "💰" },
        { id: 12, name: "奖金", icon: "🎁" },
        { id: 13, name: "投资", icon: "📈" },
        { id: 14, name: "兼职", icon: "💼" },
        { id: 15, name: "红包", icon: "🧧" },
        { id: 16, name: "退款", icon: "↩️" },
        { id: 17, name: "其他", icon: "💎" }
      ];
      let expenseCategories = common_vendor.index.getStorageSync("expenseCategories");
      let incomeCategories = common_vendor.index.getStorageSync("incomeCategories");
      if (!expenseCategories || expenseCategories.length === 0) {
        expenseCategories = defaultExpenseCategories;
        common_vendor.index.setStorageSync("expenseCategories", expenseCategories);
      }
      if (!incomeCategories || incomeCategories.length === 0) {
        incomeCategories = defaultIncomeCategories;
        common_vendor.index.setStorageSync("incomeCategories", incomeCategories);
      }
      this.expenseCategories = expenseCategories;
      this.incomeCategories = incomeCategories;
    },
    // 更新分类选项
    updateCategoryOptions() {
      let categories = ["全部分类"];
      if (this.selectedTypeIndex === 1) {
        categories = categories.concat(this.expenseCategories.map((cat) => cat.name));
      } else if (this.selectedTypeIndex === 2) {
        categories = categories.concat(this.incomeCategories.map((cat) => cat.name));
      } else {
        categories = categories.concat(this.expenseCategories.map((cat) => cat.name));
        categories = categories.concat(this.incomeCategories.map((cat) => cat.name));
      }
      this.categoryOptions = categories;
      if (this.selectedCategoryIndex >= this.categoryOptions.length) {
        this.selectedCategoryIndex = 0;
      }
    },
    // 筛选记录
    filterRecords() {
      let filteredRecords = this.allRecords;
      if (this.selectedTimeIndex > 0) {
        filteredRecords = this.filterByTime(filteredRecords);
      }
      if (this.selectedTypeIndex > 0) {
        const type = this.selectedTypeIndex === 1 ? "expense" : "income";
        filteredRecords = filteredRecords.filter((record) => record.type === type);
      }
      if (this.selectedCategoryIndex > 0) {
        const categoryName = this.categoryOptions[this.selectedCategoryIndex];
        filteredRecords = filteredRecords.filter((record) => record.categoryName === categoryName);
      }
      this.records = filteredRecords;
      this.currentPage = 1;
      this.hasMore = true;
      this.groupRecordsByDate();
      this.calculateMonthSummary();
    },
    // 按时间筛选
    filterByTime(records) {
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return records.filter((record) => {
        const recordDate = new Date(record.time);
        const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        switch (this.selectedTimeIndex) {
          case 1:
            return recordDay.getTime() === today.getTime();
          case 2:
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return recordDate >= weekStart;
          case 3:
            return recordDate.getFullYear() === now.getFullYear() && recordDate.getMonth() === now.getMonth();
          case 4:
            return recordDate.getFullYear() === now.getFullYear();
          case 5:
            if (!this.customStartDate || !this.customEndDate) {
              return true;
            }
            const startDate = new Date(this.customStartDate);
            const endDate = /* @__PURE__ */ new Date(this.customEndDate + " 23:59:59");
            return recordDate >= startDate && recordDate <= endDate;
          default:
            return true;
        }
      });
    },
    // 时间筛选变化
    onTimeChange(e) {
      this.selectedTimeIndex = e.detail.value;
      if (this.selectedTimeIndex !== 5) {
        this.customStartDate = "";
        this.customEndDate = "";
      } else {
        this.showCustomDatePicker();
      }
      this.filterRecords();
    },
    // 显示自定义日期选择器
    showCustomDatePicker() {
      common_vendor.index.showModal({
        title: "选择时间范围",
        content: "请先选择开始日期，然后选择结束日期",
        showCancel: false,
        success: () => {
        }
      });
    },
    // 按日期分组记录
    groupRecordsByDate() {
      const groupedMap = /* @__PURE__ */ new Map();
      const totalRecords = this.records;
      const startIndex = 0;
      const endIndex = this.currentPage * this.pageSize;
      const displayRecords = totalRecords.slice(startIndex, endIndex);
      this.hasMore = endIndex < totalRecords.length;
      displayRecords.forEach((record) => {
        const date = new Date(record.time);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (!groupedMap.has(dateKey)) {
          groupedMap.set(dateKey, {
            date: dateKey,
            dateText: this.formatDateText(date),
            weekday: this.getWeekday(date),
            records: [],
            totalExpense: 0,
            totalIncome: 0
          });
        }
        const group = groupedMap.get(dateKey);
        group.records.push(record);
        if (record.type === "expense") {
          group.totalExpense = this.moneyCalculator.add(group.totalExpense, parseFloat(record.amount));
        } else {
          group.totalIncome = this.moneyCalculator.add(group.totalIncome, parseFloat(record.amount));
        }
      });
      this.groupedRecords = Array.from(groupedMap.values()).map((group) => ({
        ...group,
        totalExpense: this.moneyCalculator.format(group.totalExpense),
        totalIncome: this.moneyCalculator.format(group.totalIncome)
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    // 格式化日期显示文本
    formatDateText(date) {
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1e3);
      const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (recordDate.getTime() === today.getTime()) {
        return "今天";
      } else if (recordDate.getTime() === yesterday.getTime()) {
        return "昨天";
      } else if (now.getFullYear() === date.getFullYear()) {
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      } else {
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      }
    },
    // 获取星期几
    getWeekday(date) {
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      return weekdays[date.getDay()];
    },
    // 加载更多数据（滚动到底部自动触发）
    loadMore() {
      if (this.isLoading || !this.hasMore)
        return;
      this.isLoading = true;
      setTimeout(() => {
        this.currentPage++;
        this.groupRecordsByDate();
        this.isLoading = false;
      }, 800);
    },
    // 只格式化时间部分（不包括日期）
    formatTimeOnly(timeStr) {
      const date = new Date(timeStr);
      return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    },
    // 开始日期选择
    onStartDateChange(e) {
      this.customStartDate = e.detail.value;
      if (this.customEndDate && this.customEndDate < this.customStartDate) {
        this.customEndDate = this.customStartDate;
      }
      this.filterRecords();
    },
    // 结束日期选择
    onEndDateChange(e) {
      this.customEndDate = e.detail.value;
      if (this.customStartDate && this.customEndDate < this.customStartDate) {
        this.customStartDate = this.customEndDate;
      }
      this.filterRecords();
    },
    // 类型筛选变化
    onTypeChange(e) {
      this.selectedTypeIndex = e.detail.value;
      this.selectedCategoryIndex = 0;
      this.updateCategoryOptions();
      this.filterRecords();
    },
    // 分类筛选变化
    onCategoryChange(e) {
      this.selectedCategoryIndex = e.detail.value;
      this.filterRecords();
    },
    calculateMonthSummary() {
      let filteredRecords = this.allRecords;
      if (this.selectedTimeIndex > 0) {
        filteredRecords = this.filterByTime(filteredRecords);
      }
      if (this.selectedTypeIndex > 0) {
        const type = this.selectedTypeIndex === 1 ? "expense" : "income";
        filteredRecords = filteredRecords.filter((record) => record.type === type);
      }
      if (this.selectedCategoryIndex > 0) {
        const categoryName = this.categoryOptions[this.selectedCategoryIndex];
        filteredRecords = filteredRecords.filter((record) => record.categoryName === categoryName);
      }
      let filteredExpense = 0;
      let filteredIncome = 0;
      let todayExpense = 0;
      let expenseDays = /* @__PURE__ */ new Set();
      filteredRecords.forEach((record) => {
        const recordDate = new Date(record.time);
        const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        if (record.type === "expense") {
          filteredExpense = this.moneyCalculator.add(filteredExpense, parseFloat(record.amount));
          expenseDays.add(recordDay.getTime());
        } else {
          filteredIncome = this.moneyCalculator.add(filteredIncome, parseFloat(record.amount));
        }
      });
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.allRecords.forEach((record) => {
        const recordDate = new Date(record.time);
        const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        if (recordDay.getTime() === today.getTime() && record.type === "expense") {
          todayExpense = this.moneyCalculator.add(todayExpense, parseFloat(record.amount));
        }
      });
      this.monthExpense = this.moneyCalculator.format(filteredExpense);
      this.monthIncome = this.moneyCalculator.format(filteredIncome);
      this.monthBalance = this.moneyCalculator.format(this.moneyCalculator.subtract(filteredIncome, filteredExpense));
      this.todayExpense = this.moneyCalculator.format(todayExpense);
      this.totalRecords = filteredRecords.length;
      const expenseDaysCount = expenseDays.size;
      this.avgDailyExpense = expenseDaysCount > 0 ? this.moneyCalculator.format(this.moneyCalculator.divide(filteredExpense, expenseDaysCount)) : "0.00";
      this.loadCurrentMonthRecords();
      this.calculateCategorySpending();
    },
    // 获取当前时间范围文本（根据筛选条件）
    getCurrentTimeRangeText() {
      switch (this.selectedTimeIndex) {
        case 0:
          return this.getCurrentMonthRange();
        case 1:
          const today = /* @__PURE__ */ new Date();
          return this.formatSingleDate(today);
        case 2:
          return this.getCurrentWeekRange();
        case 3:
          return this.getCurrentMonthRange();
        case 4:
          return this.getCurrentYearRange();
        case 5:
          if (this.customStartDate && this.customEndDate) {
            return this.formatCustomRange();
          } else {
            return "请选择时间范围";
          }
        default:
          return this.getCurrentMonthRange();
      }
    },
    // 获取当前月份范围
    getCurrentMonthRange() {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}年${m}月${d}日`;
      };
      return `${formatDate(firstDay)}-${formatDate(lastDay)}`;
    },
    // 获取本周范围
    getCurrentWeekRange() {
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}年${m}月${d}日`;
      };
      return `${formatDate(weekStart)}-${formatDate(weekEnd)}`;
    },
    // 获取本年范围
    getCurrentYearRange() {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      return `${year}年全年`;
    },
    // 格式化单个日期
    formatSingleDate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}年${m}月${d}日 (今天)`;
    },
    // 格式化自定义范围
    formatCustomRange() {
      const startDate = new Date(this.customStartDate);
      const endDate = new Date(this.customEndDate);
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}年${m}月${d}日`;
      };
      if (this.customStartDate === this.customEndDate) {
        return formatDate(startDate);
      } else {
        return `${formatDate(startDate)}-${formatDate(endDate)}`;
      }
    },
    // 切换时间筛选器
    toggleTimeFilter() {
      common_vendor.index.showActionSheet({
        itemList: this.timeOptions,
        success: (res) => {
          if (res.tapIndex !== this.selectedTimeIndex) {
            this.selectedTimeIndex = res.tapIndex;
            this.onTimeChange({ detail: { value: res.tapIndex } });
          }
        }
      });
    },
    goToAdd() {
      common_vendor.index.navigateTo({
        url: "/pages/add/add"
      });
    },
    goToChat() {
      common_vendor.index.switchTab({
        url: "/pages/chat/chat"
      });
    },
    showRecordDetail(record) {
      common_vendor.index.showModal({
        title: "记录详情",
        content: `分类：${record.categoryName}
金额：${record.type === "expense" ? "-" : "+"}¥${record.amount}
备注：${record.note || "无"}
时间：${this.formatTime(record.time)}`,
        showCancel: false
      });
    },
    formatTime(timeStr) {
      const date = new Date(timeStr);
      const now = /* @__PURE__ */ new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1e3);
      const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (recordDate.getTime() === today.getTime()) {
        return `今天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      } else if (recordDate.getTime() === yesterday.getTime()) {
        return `昨天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      } else {
        return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      }
    },
    // 触摸开始
    onTouchStart(e, id) {
      this.touchData[id] = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        translateX: this.touchData[id] ? this.touchData[id].translateX || 0 : 0
      };
    },
    // 触摸移动
    onTouchMove(e, id) {
      if (!this.touchData[id])
        return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchData[id].startX;
      const deltaY = touch.clientY - this.touchData[id].startY;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }
      e.preventDefault();
      let newTranslateX = this.touchData[id].translateX + deltaX;
      if (newTranslateX > 0) {
        newTranslateX = 0;
      } else if (newTranslateX < -160) {
        newTranslateX = -160;
      }
      this.$set(this.touchData, id, {
        ...this.touchData[id],
        translateX: newTranslateX
      });
    },
    // 触摸结束
    onTouchEnd(e, id) {
      if (!this.touchData[id])
        return;
      const translateX = this.touchData[id].translateX;
      if (translateX < -80) {
        this.$set(this.touchData, id, {
          ...this.touchData[id],
          translateX: -160
        });
      } else {
        this.$set(this.touchData, id, {
          ...this.touchData[id],
          translateX: 0
        });
      }
    },
    // 获取translateX值
    getTranslateX(id) {
      return this.touchData[id] ? this.touchData[id].translateX || 0 : 0;
    },
    // 编辑记录
    editRecord(record) {
      this.$set(this.touchData, record.id, { translateX: 0 });
      common_vendor.index.navigateTo({
        url: `/pages/add/add?editId=${record.id}`
      });
    },
    // 删除记录
    deleteRecord(record) {
      common_vendor.index.showModal({
        title: "确认删除",
        content: `确定要删除这条记录吗？
${record.categoryName} ${record.type === "expense" ? "-" : "+"}¥${record.amount}`,
        success: (res) => {
          if (res.confirm) {
            let records = common_vendor.index.getStorageSync("records") || [];
            records = records.filter((item) => item.id !== record.id);
            common_vendor.index.setStorageSync("records", records);
            this.$set(this.touchData, record.id, { translateX: 0 });
            this.loadData();
            common_vendor.index.showToast({
              title: "删除成功",
              icon: "success",
              duration: 1500
            });
          } else {
            this.$set(this.touchData, record.id, { translateX: 0 });
          }
        }
      });
    },
    // ============= 预算相关方法 (与budget-manage.vue保持一致) =============
    // 将不同时间单位的预算转换为月预算
    convertToMonthlyBudget(amount, timeUnit) {
      const unit = this.timeUnits.find((u) => u.key === timeUnit) || this.timeUnits.find((u) => u.key === "month");
      return amount * unit.factor;
    },
    // 获取用于比较当期支出的预算基准
    getBudgetBaseline(amount, timeUnit) {
      switch (timeUnit) {
        case "day":
          const currentDate = /* @__PURE__ */ new Date();
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          return amount * daysInMonth;
        case "month":
          return amount;
        case "quarter":
          return amount;
        case "year":
          return amount;
        default:
          return amount;
      }
    },
    // 计算各分类的支出 - 与预算管理页面保持一致
    calculateCategorySpending() {
      common_vendor.index.__f__("log", "at pages/index/index.vue:1058", "首页开始计算分类支出，预算分类数量:", this.categoryBudgets.length);
      this.categoryBudgets.forEach((budget) => {
        if (!budget.timeUnit) {
          budget.timeUnit = "month";
        }
        let categorySpending = 0;
        if (budget.timeUnit === "month") {
          const timeRangeRecords = this.getRecordsByTimeUnit(budget.timeUnit);
          categorySpending = this.calculateCategorySpendingFromRecords(timeRangeRecords, budget);
        } else if (budget.timeUnit === "quarter") {
          const timeRangeRecords = this.getRecordsByTimeUnit(budget.timeUnit, budget.quarterStartMonth);
          categorySpending = this.calculateCategorySpendingFromRecords(timeRangeRecords, budget);
        } else if (budget.timeUnit === "year") {
          const timeRangeRecords = this.getRecordsByTimeUnit(budget.timeUnit);
          categorySpending = this.calculateCategorySpendingFromRecords(timeRangeRecords, budget);
        } else {
          const timeRangeRecords = this.getRecordsByTimeUnit(budget.timeUnit);
          categorySpending = this.calculateCategorySpendingFromRecords(timeRangeRecords, budget);
        }
        const timeUnitName = this.getTimeUnitName(budget.timeUnit);
        const timeRangeDesc = this.getTimeRangeDesc(budget.timeUnit, budget.quarterStartMonth);
        common_vendor.index.__f__("log", "at pages/index/index.vue:1090", `首页分类 ${budget.categoryName} ${timeRangeDesc} ${timeUnitName}支出:`, categorySpending);
        budget.spentAmount = categorySpending;
      });
      this.saveCategoryBudgets();
    },
    // 根据时间单位获取相应时间范围的记录 - 与预算管理页面保持一致
    getRecordsByTimeUnit(timeUnit, quarterStartMonth = null) {
      const allRecords = common_vendor.index.getStorageSync("records") || [];
      const currentDate = /* @__PURE__ */ new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      switch (timeUnit) {
        case "day":
          return this.currentMonthRecords;
        case "month":
          return allRecords.filter((record) => {
            const recordDate = new Date(record.time);
            const recordYear = recordDate.getFullYear();
            const recordMonth = recordDate.getMonth() + 1;
            return recordYear === currentYear && recordMonth === currentMonth;
          });
        case "quarter":
          if (!quarterStartMonth) {
            quarterStartMonth = currentMonth;
          }
          let quarterNumber = 0;
          if (currentMonth >= quarterStartMonth) {
            quarterNumber = Math.floor((currentMonth - quarterStartMonth) / 3);
          } else {
            quarterNumber = Math.floor((12 - quarterStartMonth + currentMonth) / 3);
          }
          const currentQuarterStartMonth = (quarterStartMonth + quarterNumber * 3 - 1) % 12 + 1;
          const month1 = currentQuarterStartMonth;
          const month2 = currentQuarterStartMonth + 1 > 12 ? currentQuarterStartMonth + 1 - 12 : currentQuarterStartMonth + 1;
          const month3 = currentQuarterStartMonth + 2 > 12 ? currentQuarterStartMonth + 2 - 12 : currentQuarterStartMonth + 2;
          common_vendor.index.__f__("log", "at pages/index/index.vue:1144", `首页季度计算: 开始月份${quarterStartMonth}, 当前月份${currentMonth}, 第${quarterNumber + 1}季度(${month1}-${month2}-${month3})`);
          return allRecords.filter((record) => {
            const recordDate = new Date(record.time);
            const recordYear = recordDate.getFullYear();
            const recordMonth = recordDate.getMonth() + 1;
            let recordQuarterNumber = 0;
            if (recordMonth >= quarterStartMonth) {
              recordQuarterNumber = Math.floor((recordMonth - quarterStartMonth) / 3);
            } else {
              recordQuarterNumber = Math.floor((12 - quarterStartMonth + recordMonth) / 3);
            }
            const isCurrentQuarter = recordQuarterNumber === quarterNumber;
            let isInQuarterRange = false;
            if (currentQuarterStartMonth <= 10) {
              isInQuarterRange = recordYear === currentYear && (recordMonth === month1 || recordMonth === month2 || recordMonth === month3);
            } else {
              isInQuarterRange = recordYear === currentYear && recordMonth >= currentQuarterStartMonth || recordYear === currentYear + 1 && recordMonth <= month3;
            }
            return isCurrentQuarter && isInQuarterRange;
          });
        case "year":
          return allRecords.filter((record) => {
            const recordDate = new Date(record.time);
            const recordYear = recordDate.getFullYear();
            return recordYear === currentYear;
          });
        default:
          return this.currentMonthRecords;
      }
    },
    // 从记录中计算特定分类的支出 - 与预算管理页面保持一致
    calculateCategorySpendingFromRecords(records, budget) {
      return records.filter((record) => {
        const isExpense = record.type === "expense";
        const isSameCategory = record.categoryId == budget.categoryId || record.categoryName === budget.categoryName;
        if (isExpense && isSameCategory) {
          common_vendor.index.__f__("log", "at pages/index/index.vue:1202", `首页匹配到${this.getTimeUnitName(budget.timeUnit)}支出记录:`, {
            amount: record.amount,
            category: record.categoryName,
            date: record.time,
            timeUnit: budget.timeUnit
          });
        }
        return isExpense && isSameCategory;
      }).reduce((sum, record) => {
        const amount = parseFloat(record.amount) || 0;
        return sum + amount;
      }, 0);
    },
    // 获取时间范围描述（用于调试）- 与预算管理页面保持一致
    getTimeRangeDesc(timeUnit, quarterStartMonth = null) {
      const currentDate = /* @__PURE__ */ new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      switch (timeUnit) {
        case "day":
        case "month":
          return `${currentYear}年${currentMonth}月`;
        case "quarter":
          if (quarterStartMonth) {
            const m1 = this.monthNames[quarterStartMonth - 1];
            const m2 = this.monthNames[quarterStartMonth % 12];
            const m3 = this.monthNames[(quarterStartMonth + 1) % 12];
            return `${currentYear}年自定义季度(${m1}-${m2}-${m3})`;
          } else {
            const quarter = Math.floor((currentMonth - 1) / 3) + 1;
            const quarterStart = (quarter - 1) * 3 + 1;
            const quarterEnd = quarter * 3;
            return `${currentYear}年第${quarter}季度(${quarterStart}-${quarterEnd}月)`;
          }
        case "year":
          return `${currentYear}年`;
        default:
          return `${currentYear}年${currentMonth}月`;
      }
    },
    // 获取时间单位名称
    getTimeUnitName(timeUnit) {
      const unit = this.timeUnits.find((u) => u.key === timeUnit);
      return unit ? unit.name : "月";
    },
    // 保存分类预算数据 - 与预算管理页面保持一致
    saveCategoryBudgets() {
      common_vendor.index.setStorageSync("categoryBudgets", this.categoryBudgets);
    },
    // 获取预算进度文本
    getBudgetProgressText(spent, budget, timeUnit = "month") {
      const budgetBaseline = this.getBudgetBaseline(budget, timeUnit);
      if (budgetBaseline === 0)
        return "0%";
      const percentage = spent / budgetBaseline * 100;
      if (percentage >= 100) {
        return "已用完";
      } else {
        return percentage.toFixed(1) + "%";
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($options.getCurrentTimeRangeText()),
    b: common_vendor.o((...args) => $options.toggleTimeFilter && $options.toggleTimeFilter(...args)),
    c: common_vendor.t($data.monthExpense),
    d: common_vendor.t($data.monthIncome),
    e: common_vendor.t($data.monthBalance),
    f: common_vendor.n($data.monthBalance >= 0 ? "positive" : "negative"),
    g: common_vendor.o((...args) => $options.goToChat && $options.goToChat(...args)),
    h: common_vendor.t($options.getBudgetProgressDisplayText()),
    i: `conic-gradient(#4A90E2 0deg, #4A90E2 ${$options.calculateBudgetInfo.progress * 3.6}deg, rgba(255,255,255,0.2) ${$options.calculateBudgetInfo.progress * 3.6}deg, rgba(255,255,255,0.2) 360deg)`,
    j: common_vendor.t($options.calculateBudgetInfo.totalBudget),
    k: common_vendor.t($data.categoryBudgets.length),
    l: common_vendor.t($options.calculateBudgetInfo.usedAmount.toFixed(2)),
    m: common_vendor.t($options.calculateBudgetInfo.remainingAmount.toFixed(2)),
    n: common_vendor.t($data.todayExpense),
    o: common_vendor.t($data.totalRecords),
    p: common_vendor.t($data.avgDailyExpense),
    q: common_vendor.o((...args) => $options.goToAdd && $options.goToAdd(...args)),
    r: common_vendor.t($data.timeOptions[$data.selectedTimeIndex]),
    s: $data.timeOptions,
    t: $data.selectedTimeIndex,
    v: common_vendor.o((...args) => $options.onTimeChange && $options.onTimeChange(...args)),
    w: common_vendor.t($data.typeOptions[$data.selectedTypeIndex]),
    x: $data.typeOptions,
    y: $data.selectedTypeIndex,
    z: common_vendor.o((...args) => $options.onTypeChange && $options.onTypeChange(...args)),
    A: $data.selectedTimeIndex === 5
  }, $data.selectedTimeIndex === 5 ? {
    B: common_vendor.t($data.customStartDate || "选择开始日期"),
    C: $data.customStartDate,
    D: common_vendor.o((...args) => $options.onStartDateChange && $options.onStartDateChange(...args)),
    E: common_vendor.t($data.customEndDate || "选择结束日期"),
    F: $data.customEndDate,
    G: common_vendor.o((...args) => $options.onEndDateChange && $options.onEndDateChange(...args))
  } : {}, {
    H: $data.selectedTypeIndex > 0
  }, $data.selectedTypeIndex > 0 ? {
    I: common_vendor.t($data.categoryOptions[$data.selectedCategoryIndex]),
    J: $data.categoryOptions,
    K: $data.selectedCategoryIndex,
    L: common_vendor.o((...args) => $options.onCategoryChange && $options.onCategoryChange(...args))
  } : {}, {
    M: $data.groupedRecords.length === 0
  }, $data.groupedRecords.length === 0 ? {} : {}, {
    N: common_vendor.f($data.groupedRecords, (group, groupIndex, i0) => {
      return common_vendor.e({
        a: common_vendor.t(group.dateText),
        b: common_vendor.t(group.weekday),
        c: group.totalExpense > 0
      }, group.totalExpense > 0 ? {
        d: common_vendor.t(group.totalExpense)
      } : {}, {
        e: group.totalIncome > 0
      }, group.totalIncome > 0 ? {
        f: common_vendor.t(group.totalIncome)
      } : {}, {
        g: common_vendor.f(group.records, (record, k1, i1) => {
          return common_vendor.e({
            a: common_vendor.t(record.categoryIcon),
            b: common_vendor.t(record.categoryName),
            c: record.note
          }, record.note ? {
            d: common_vendor.t(record.note)
          } : {}, {
            e: common_vendor.t(record.type === "expense" ? "-" : "+"),
            f: common_vendor.t(record.amount),
            g: common_vendor.n(record.type),
            h: common_vendor.t($options.formatTimeOnly(record.time)),
            i: common_vendor.o(($event) => $options.showRecordDetail(record), record.id),
            j: common_vendor.o(($event) => $options.onTouchStart($event, record.id), record.id),
            k: common_vendor.o(($event) => $options.onTouchMove($event, record.id), record.id),
            l: common_vendor.o(($event) => $options.onTouchEnd($event, record.id), record.id),
            m: `translateX(${$options.getTranslateX(record.id)}px)`,
            n: common_vendor.o(($event) => $options.editRecord(record), record.id),
            o: common_vendor.o(($event) => $options.deleteRecord(record), record.id),
            p: record.id
          });
        }),
        h: group.date
      });
    }),
    O: $data.hasMore && $data.groupedRecords.length > 0 && $data.isLoading
  }, $data.hasMore && $data.groupedRecords.length > 0 && $data.isLoading ? {} : {}, {
    P: !$data.hasMore && $data.groupedRecords.length > 0
  }, !$data.hasMore && $data.groupedRecords.length > 0 ? {} : {}, {
    Q: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
