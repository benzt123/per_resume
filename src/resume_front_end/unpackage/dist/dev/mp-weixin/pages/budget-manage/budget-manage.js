"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      categoryBudgets: [],
      // 分类预算列表
      currentMonthRecords: [],
      // 当前月份的记录
      editingBudget: null,
      // 正在编辑的预算
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
      // 预算表单相关数据
      showBudgetForm: false,
      selectedCategory: null,
      selectedTimeUnit: "month",
      selectedQuarterStartMonth: 1,
      budgetAmount: ""
    };
  },
  computed: {
    // 总预算 - 直接计算各分类预算的总和
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
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:309", "计算已使用金额(统一方式):", total);
      return total;
    },
    // 剩余金额
    remainingAmount() {
      return this.totalBudget - this.usedAmount;
    },
    // 使用进度百分比
    progressPercentage() {
      if (this.totalBudget === 0)
        return 0;
      return Math.min(this.usedAmount / this.totalBudget * 100, 100);
    },
    // 进度条颜色
    progressColor() {
      if (this.progressPercentage <= 70)
        return "#4CAF50";
      if (this.progressPercentage <= 90)
        return "#FF9800";
      return "#FF6B6B";
    },
    // 超预算分类数量
    overBudgetCount() {
      return this.categoryBudgets.filter((budget) => {
        const budgetBaseline = this.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month");
        return budget.spentAmount > budgetBaseline;
      }).length;
    },
    // 节省金额
    savedAmount() {
      return this.categoryBudgets.reduce((sum, budget) => {
        const budgetBaseline = this.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month");
        const saved = budgetBaseline - budget.spentAmount;
        return sum + (saved > 0 ? saved : 0);
      }, 0);
    },
    // 预算预警信息
    budgetWarnings() {
      const warnings = [];
      this.categoryBudgets.forEach((budget) => {
        const budgetBaseline = this.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month");
        const percentage = budgetBaseline > 0 ? budget.spentAmount / budgetBaseline * 100 : 0;
        const timeUnitName = this.getTimeUnitName(budget.timeUnit || "month");
        if (budget.spentAmount > budgetBaseline) {
          warnings.push({
            categoryId: budget.categoryId,
            message: `${budget.categoryIcon} ${budget.categoryName} 已超出${timeUnitName}预算 ¥${(budget.spentAmount - budgetBaseline).toFixed(2)}`
          });
        } else if (percentage >= 100) {
          warnings.push({
            categoryId: budget.categoryId,
            message: `${budget.categoryIcon} ${budget.categoryName} ${timeUnitName}预算已用完`
          });
        } else if (percentage >= 80) {
          warnings.push({
            categoryId: budget.categoryId,
            message: `${budget.categoryIcon} ${budget.categoryName} ${timeUnitName}预算即将用完 (${percentage.toFixed(1)}%)`
          });
        }
      });
      return warnings;
    },
    // 预算健康度评分
    healthScore() {
      if (this.categoryBudgets.length === 0)
        return 100;
      let totalScore = 0;
      let scoreCount = 0;
      this.categoryBudgets.forEach((budget) => {
        const budgetBaseline = this.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month");
        if (budgetBaseline > 0) {
          const percentage = budget.spentAmount / budgetBaseline * 100;
          let score = 100;
          if (percentage > 100) {
            score = Math.max(0, 50 - (percentage - 100) * 2);
          } else if (percentage > 90) {
            score = 60;
          } else if (percentage > 80) {
            score = 80;
          } else if (percentage > 70) {
            score = 90;
          }
          totalScore += score;
          scoreCount++;
        }
      });
      return scoreCount > 0 ? Math.round(totalScore / scoreCount) : 100;
    },
    // 健康度评分颜色
    healthScoreColor() {
      if (this.healthScore >= 80)
        return "#4CAF50";
      if (this.healthScore >= 60)
        return "#FF9800";
      return "#FF6B6B";
    },
    // 健康度描述
    healthScoreDesc() {
      if (this.healthScore >= 90)
        return "预算控制优秀，继续保持！";
      if (this.healthScore >= 80)
        return "预算控制良好";
      if (this.healthScore >= 60)
        return "预算控制一般，需要注意";
      return "预算控制较差，建议调整支出";
    },
    // 日均支出
    dailyAverage() {
      if (this.currentMonthRecords.length === 0)
        return 0;
      const currentDate = /* @__PURE__ */ new Date();
      const currentDay = currentDate.getDate();
      return this.usedAmount / currentDay;
    },
    // 预计月末支出
    projectedAmount() {
      if (this.dailyAverage === 0)
        return this.usedAmount;
      const currentDate = /* @__PURE__ */ new Date();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      return this.dailyAverage * daysInMonth;
    },
    // 可用的分类列表（排除已设置预算的）
    availableCategories() {
      const expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [
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
      if (this.editingBudget) {
        return expenseCategories.filter(
          (category) => category.id === this.editingBudget.categoryId || !this.categoryBudgets.some((budget) => budget.categoryId === category.id)
        );
      } else {
        return expenseCategories.filter(
          (category) => !this.categoryBudgets.some((budget) => budget.categoryId === category.id)
        );
      }
    },
    // 是否可以确认添加/更新预算
    canConfirm() {
      return this.selectedCategory && this.selectedTimeUnit && this.budgetAmount && parseFloat(this.budgetAmount) > 0 && (this.selectedTimeUnit !== "quarter" || this.selectedQuarterStartMonth);
    }
  },
  onLoad() {
    common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:484", "=== 预算管理页面加载 ===");
    this.loadBudgetData();
    this.loadCurrentMonthRecords();
    this.calculateCategorySpending();
    common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:490", "总预算:", this.totalBudget);
    common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:491", "分类预算数量:", this.categoryBudgets.length);
    common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:492", "本月记录数量:", this.currentMonthRecords.length);
  },
  onShow() {
    common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:496", "=== 预算管理页面显示 ===");
    this.loadCurrentMonthRecords();
    this.calculateCategorySpending();
    this.$nextTick(() => {
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:502", "已使用金额:", this.usedAmount);
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:503", "剩余金额:", this.remainingAmount);
    });
  },
  methods: {
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
    // 获取时间单位名称
    getTimeUnitName(timeUnit) {
      const unit = this.timeUnits.find((u) => u.key === timeUnit);
      return unit ? unit.name : "月";
    },
    // 获取季度预算显示名称（动态显示当前季度范围）
    getQuarterBudgetDisplayName(budget) {
      if (budget.timeUnit === "quarter" && budget.quarterStartMonth) {
        const currentDate = /* @__PURE__ */ new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const quarterStartMonth = budget.quarterStartMonth;
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
        const m1 = this.monthNames[month1 - 1];
        this.monthNames[month2 - 1];
        const m3 = this.monthNames[month3 - 1];
        return `季(${m1}-${m3})`;
      }
      return this.getTimeUnitName(budget.timeUnit || "month");
    },
    // 获取支出统计标签
    getSpentAmountLabel(timeUnit) {
      switch (timeUnit) {
        case "day":
          return "本月已用";
        case "month":
          return "本月已用";
        case "quarter":
          return "本季已用";
        case "year":
          return "本年已用";
        default:
          return "本月已用";
      }
    },
    // 获取时间范围描述（用于调试）
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
    // 加载预算数据
    loadBudgetData() {
      const savedCategoryBudgets = common_vendor.index.getStorageSync("categoryBudgets");
      if (savedCategoryBudgets && Array.isArray(savedCategoryBudgets) && savedCategoryBudgets.length > 0) {
        this.categoryBudgets = savedCategoryBudgets;
      } else {
        this.createDefaultCategoryBudgets();
      }
    },
    // 创建默认分类预算
    createDefaultCategoryBudgets() {
      const expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [
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
      if (expenseCategories.length === 0) {
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:652", "没有找到支出分类，跳过创建默认预算");
        return;
      }
      const defaultBudgets = [
        { categoryName: "餐饮", budgetAmount: 600, timeUnit: "month" },
        { categoryName: "交通", budgetAmount: 200, timeUnit: "month" },
        { categoryName: "购物", budgetAmount: 300, timeUnit: "month" },
        { categoryName: "娱乐", budgetAmount: 200, timeUnit: "month" },
        { categoryName: "住房", budgetAmount: 1500, timeUnit: "quarter", quarterStartMonth: 1 }
        // 季度预算示例，从1月开始
      ];
      const newCategoryBudgets = [];
      defaultBudgets.forEach((defaultBudget) => {
        const category = expenseCategories.find((cat) => cat.name === defaultBudget.categoryName);
        if (category) {
          const budgetItem = {
            categoryId: category.id,
            categoryName: category.name,
            categoryIcon: category.icon,
            budgetAmount: defaultBudget.budgetAmount,
            timeUnit: defaultBudget.timeUnit,
            spentAmount: 0
          };
          if (defaultBudget.timeUnit === "quarter" && defaultBudget.quarterStartMonth) {
            budgetItem.quarterStartMonth = defaultBudget.quarterStartMonth;
          }
          newCategoryBudgets.push(budgetItem);
        }
      });
      if (newCategoryBudgets.length > 0) {
        this.categoryBudgets = newCategoryBudgets;
        common_vendor.index.setStorageSync("categoryBudgets", this.categoryBudgets);
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:692", "创建了默认分类预算:", newCategoryBudgets.length, "个");
      }
    },
    // 加载当前月份的记录
    loadCurrentMonthRecords() {
      const allRecords = common_vendor.index.getStorageSync("records") || [];
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:699", "加载所有记录:", allRecords.length, "条");
      const currentDate = /* @__PURE__ */ new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      this.currentMonthRecords = allRecords.filter((record) => {
        const recordDate = new Date(record.time);
        const isCurrentMonth = recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
        if (isCurrentMonth) {
          common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:710", "本月记录:", {
            date: record.time,
            type: record.type,
            amount: record.amount,
            category: record.categoryName
          });
        }
        return isCurrentMonth;
      });
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:721", "本月记录总数:", this.currentMonthRecords.length);
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:722", "本月支出记录数:", this.currentMonthRecords.filter((r) => r.type === "expense").length);
    },
    // 根据时间单位获取相应时间范围的记录
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
          common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:771", `季度计算: 开始月份${quarterStartMonth}, 当前月份${currentMonth}, 第${quarterNumber + 1}季度(${month1}-${month2}-${month3})`);
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
    // 计算各分类的支出
    calculateCategorySpending() {
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:823", "开始计算分类支出，预算分类数量:", this.categoryBudgets.length);
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
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:855", `分类 ${budget.categoryName} ${timeRangeDesc} ${timeUnitName}支出:`, categorySpending);
        budget.spentAmount = categorySpending;
      });
      this.saveCategoryBudgets();
    },
    // 从记录中计算特定分类的支出
    calculateCategorySpendingFromRecords(records, budget) {
      return records.filter((record) => {
        const isExpense = record.type === "expense";
        const isSameCategory = record.categoryId == budget.categoryId || record.categoryName === budget.categoryName;
        if (isExpense && isSameCategory) {
          common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:871", `匹配到${this.getTimeUnitName(budget.timeUnit)}支出记录:`, {
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
    // === 预算表单相关方法 ===
    // 选择分类
    selectCategory(category) {
      this.selectedCategory = category;
    },
    // 选择时间单位
    selectTimeUnit(timeUnit) {
      this.selectedTimeUnit = timeUnit;
      if (timeUnit !== "quarter") {
        this.selectedQuarterStartMonth = 1;
      }
    },
    // 选择季度开始月份
    selectQuarterStartMonth(month) {
      this.selectedQuarterStartMonth = month;
    },
    // 获取金额输入框占位符
    getAmountPlaceholder() {
      if (!this.selectedTimeUnit)
        return "请输入预算金额";
      const unitName = this.selectedTimeUnit === "quarter" && this.selectedQuarterStartMonth ? `季度(${this.monthNames[this.selectedQuarterStartMonth - 1]}-${this.monthNames[(this.selectedQuarterStartMonth + 2) % 12 || 12 - 1]})` : this.getTimeUnitName(this.selectedTimeUnit);
      return `请输入${unitName}预算金额`;
    },
    // 获取时间单位显示名称
    getTimeUnitDisplayName() {
      if (this.selectedTimeUnit === "quarter" && this.selectedQuarterStartMonth) {
        const endMonth = (this.selectedQuarterStartMonth + 2) % 12 || 12;
        return `季度预算 (${this.monthNames[this.selectedQuarterStartMonth - 1]} - ${this.monthNames[endMonth - 1]})`;
      }
      return `${this.getTimeUnitName(this.selectedTimeUnit)}预算`;
    },
    // 编辑预算
    editBudget(budget) {
      this.editingBudget = budget;
      this.selectedCategory = {
        id: budget.categoryId,
        name: budget.categoryName,
        icon: budget.categoryIcon
      };
      this.selectedTimeUnit = budget.timeUnit || "month";
      this.selectedQuarterStartMonth = budget.quarterStartMonth || 1;
      this.budgetAmount = budget.budgetAmount.toString();
      this.showBudgetForm = true;
    },
    // 关闭预算表单
    closeBudgetForm() {
      this.showBudgetForm = false;
      this.editingBudget = null;
      this.selectedCategory = null;
      this.selectedTimeUnit = "month";
      this.selectedQuarterStartMonth = 1;
      this.budgetAmount = "";
    },
    // 确认添加/更新预算
    confirmBudget() {
      if (!this.canConfirm) {
        common_vendor.index.showToast({
          title: "请完善预算信息",
          icon: "none"
        });
        return;
      }
      const amount = parseFloat(this.budgetAmount);
      const quarterStartMonth = this.selectedTimeUnit === "quarter" ? this.selectedQuarterStartMonth : null;
      if (this.editingBudget) {
        this.updateCategoryBudget(this.selectedCategory, amount, this.selectedTimeUnit, quarterStartMonth);
      } else {
        this.addCategoryBudget(this.selectedCategory, amount, this.selectedTimeUnit, quarterStartMonth);
      }
      this.closeBudgetForm();
    },
    // 显示添加分类预算对话框 (保留兼容性，现在直接显示表单)
    showAddCategoryBudgetDialog() {
      this.showBudgetForm = true;
    },
    // 添加分类预算
    addCategoryBudget(category, amount, timeUnit, quarterStartMonth = null) {
      const newBudget = {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        budgetAmount: amount,
        timeUnit,
        spentAmount: 0
      };
      if (timeUnit === "quarter" && quarterStartMonth) {
        newBudget.quarterStartMonth = quarterStartMonth;
      }
      this.categoryBudgets.push(newBudget);
      this.calculateCategorySpending();
      const timeUnitName = timeUnit === "quarter" && quarterStartMonth ? `季(${this.monthNames[quarterStartMonth - 1]}-${this.monthNames[(quarterStartMonth + 2) % 12 || 12 - 1]})` : this.getTimeUnitName(timeUnit);
      common_vendor.index.showToast({
        title: `${timeUnitName}预算添加成功`,
        icon: "success"
      });
    },
    // 更新分类预算
    updateCategoryBudget(category, amount, timeUnit, quarterStartMonth = null) {
      const index = this.categoryBudgets.findIndex((budget) => budget.categoryId === category.id);
      if (index !== -1) {
        this.categoryBudgets[index].budgetAmount = amount;
        this.categoryBudgets[index].timeUnit = timeUnit;
        if (timeUnit === "quarter" && quarterStartMonth) {
          this.categoryBudgets[index].quarterStartMonth = quarterStartMonth;
        } else if (timeUnit !== "quarter") {
          delete this.categoryBudgets[index].quarterStartMonth;
        }
        this.saveCategoryBudgets();
        this.calculateCategorySpending();
        const timeUnitName = timeUnit === "quarter" && quarterStartMonth ? `季(${this.monthNames[quarterStartMonth - 1]}-${this.monthNames[(quarterStartMonth + 2) % 12 || 12 - 1]})` : this.getTimeUnitName(timeUnit);
        common_vendor.index.showToast({
          title: `${timeUnitName}预算更新成功`,
          icon: "success"
        });
      }
      this.editingBudget = null;
    },
    // 删除分类预算
    deleteCategoryBudget(categoryId) {
      common_vendor.index.showModal({
        title: "删除预算",
        content: "确定要删除这个分类的预算设置吗？",
        confirmColor: "#FF6B6B",
        success: (res) => {
          if (res.confirm) {
            this.categoryBudgets = this.categoryBudgets.filter((budget) => budget.categoryId !== categoryId);
            this.saveCategoryBudgets();
            common_vendor.index.showToast({
              title: "预算删除成功",
              icon: "success"
            });
          }
        }
      });
    },
    // 保存分类预算数据
    saveCategoryBudgets() {
      common_vendor.index.setStorageSync("categoryBudgets", this.categoryBudgets);
    },
    // 获取预算进度颜色
    getBudgetProgressColor(spent, budget, timeUnit = "month") {
      const budgetBaseline = this.getBudgetBaseline(budget, timeUnit);
      if (budgetBaseline === 0)
        return "#E0E0E0";
      const percentage = spent / budgetBaseline * 100;
      if (percentage <= 70)
        return "#4CAF50";
      if (percentage <= 90)
        return "#FF9800";
      return "#FF6B6B";
    },
    // 获取预算进度文本
    getBudgetProgressText(spent, budget, timeUnit = "month") {
      const budgetBaseline = this.getBudgetBaseline(budget, timeUnit);
      if (budgetBaseline === 0)
        return "0%";
      const percentage = spent / budgetBaseline * 100;
      const timeUnitName = this.getTimeUnitName(timeUnit);
      common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:1080", `预算进度计算 - ${timeUnitName}预算: ${budget}, 已花费: ${spent}, 基准: ${budgetBaseline}, 百分比: ${percentage.toFixed(1)}%`);
      if (percentage >= 100) {
        return "已用完";
      } else {
        return percentage.toFixed(1) + "%";
      }
    },
    // 获取当前数据统计来源
    getCurrentDataSource() {
      const currentDate = /* @__PURE__ */ new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      return `${currentYear}年${currentMonth}月`;
    },
    // 刷新预算数据
    refreshBudgetData() {
      common_vendor.index.showLoading({
        title: "刷新中..."
      });
      this.loadCurrentMonthRecords();
      this.calculateCategorySpending();
      setTimeout(() => {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "数据已刷新",
          icon: "success",
          duration: 1e3
        });
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:1116", "刷新后统计:");
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:1117", "- 本月记录数:", this.currentMonthRecords.length);
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:1118", "- 已使用金额:", this.usedAmount);
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:1119", "- 剩余预算:", this.remainingAmount);
        common_vendor.index.__f__("log", "at pages/budget-manage/budget-manage.vue:1120", "- 分类预算详情:", this.categoryBudgets.map((b) => ({
          name: b.categoryName,
          budget: b.budgetAmount,
          spent: b.spentAmount,
          remaining: b.budgetAmount - b.spentAmount
        })));
      }, 500);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($options.totalBudget.toFixed(2)),
    b: common_vendor.t($data.categoryBudgets.length),
    c: common_vendor.t($options.usedAmount.toFixed(2)),
    d: common_vendor.t($options.remainingAmount.toFixed(2)),
    e: $options.remainingAmount >= 0 ? "#4CAF50" : "#FF6B6B",
    f: $options.progressPercentage + "%",
    g: $options.progressColor,
    h: common_vendor.t($options.progressPercentage.toFixed(1)),
    i: common_vendor.t($data.currentMonthRecords.filter((r) => r.type === "expense").length),
    j: common_vendor.t($options.getCurrentDataSource()),
    k: common_vendor.o(($event) => $data.showBudgetForm = true),
    l: common_vendor.o((...args) => $options.refreshBudgetData && $options.refreshBudgetData(...args)),
    m: $data.showBudgetForm
  }, $data.showBudgetForm ? common_vendor.e({
    n: common_vendor.t($data.editingBudget ? "编辑预算" : "添加预算"),
    o: common_vendor.o((...args) => $options.closeBudgetForm && $options.closeBudgetForm(...args)),
    p: common_vendor.f($options.availableCategories, (category, k0, i0) => {
      return {
        a: common_vendor.t(category.icon),
        b: common_vendor.t(category.name),
        c: category.id,
        d: $data.selectedCategory && $data.selectedCategory.id === category.id ? 1 : "",
        e: common_vendor.o(($event) => $options.selectCategory(category), category.id)
      };
    }),
    q: common_vendor.f($data.timeUnits, (unit, k0, i0) => {
      return {
        a: common_vendor.t(unit.name),
        b: unit.key,
        c: $data.selectedTimeUnit === unit.key ? 1 : "",
        d: common_vendor.o(($event) => $options.selectTimeUnit(unit.key), unit.key)
      };
    }),
    r: $data.selectedTimeUnit === "quarter"
  }, $data.selectedTimeUnit === "quarter" ? common_vendor.e({
    s: common_vendor.f($data.monthNames, (month, index, i0) => {
      return {
        a: common_vendor.t(month),
        b: index,
        c: $data.selectedQuarterStartMonth === index + 1 ? 1 : "",
        d: common_vendor.o(($event) => $options.selectQuarterStartMonth(index + 1), index)
      };
    }),
    t: $data.selectedQuarterStartMonth
  }, $data.selectedQuarterStartMonth ? {
    v: common_vendor.t($data.monthNames[$data.selectedQuarterStartMonth - 1]),
    w: common_vendor.t($data.monthNames[$data.selectedQuarterStartMonth % 12]),
    x: common_vendor.t($data.monthNames[($data.selectedQuarterStartMonth + 1) % 12])
  } : {}) : {}, {
    y: $options.getAmountPlaceholder(),
    z: $data.budgetAmount,
    A: common_vendor.o(($event) => $data.budgetAmount = $event.detail.value),
    B: $data.selectedCategory && $data.selectedTimeUnit && $data.budgetAmount
  }, $data.selectedCategory && $data.selectedTimeUnit && $data.budgetAmount ? {
    C: common_vendor.t($data.selectedCategory.icon),
    D: common_vendor.t($data.selectedCategory.name),
    E: common_vendor.t($options.getTimeUnitDisplayName()),
    F: common_vendor.t(parseFloat($data.budgetAmount || 0).toFixed(2))
  } : {}, {
    G: common_vendor.o((...args) => $options.closeBudgetForm && $options.closeBudgetForm(...args)),
    H: common_vendor.t($data.editingBudget ? "更新" : "添加"),
    I: common_vendor.o((...args) => $options.confirmBudget && $options.confirmBudget(...args)),
    J: !$options.canConfirm ? 1 : ""
  }) : {}, {
    K: common_vendor.t($data.categoryBudgets.length),
    L: $data.categoryBudgets.length === 0
  }, $data.categoryBudgets.length === 0 ? {
    M: common_vendor.o(($event) => $data.showBudgetForm = true)
  } : {}, {
    N: common_vendor.f($data.categoryBudgets, (budget, k0, i0) => {
      return {
        a: common_vendor.t(budget.categoryIcon),
        b: common_vendor.t(budget.categoryName),
        c: common_vendor.t($options.getQuarterBudgetDisplayName(budget)),
        d: common_vendor.o(($event) => $options.editBudget(budget), budget.categoryId),
        e: common_vendor.o(($event) => $options.deleteCategoryBudget(budget.categoryId), budget.categoryId),
        f: common_vendor.t($options.getTimeUnitName(budget.timeUnit || "month")),
        g: common_vendor.t(budget.budgetAmount.toFixed(2)),
        h: common_vendor.t($options.getSpentAmountLabel(budget.timeUnit || "month")),
        i: common_vendor.t(budget.spentAmount.toFixed(2)),
        j: common_vendor.t(($options.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month") - budget.spentAmount).toFixed(2)),
        k: $options.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month") - budget.spentAmount >= 0 ? "#4CAF50" : "#FF6B6B",
        l: Math.min(budget.spentAmount / $options.getBudgetBaseline(budget.budgetAmount, budget.timeUnit || "month") * 100, 100) + "%",
        m: $options.getBudgetProgressColor(budget.spentAmount, budget.budgetAmount, budget.timeUnit || "month"),
        n: common_vendor.t($options.getBudgetProgressText(budget.spentAmount, budget.budgetAmount, budget.timeUnit || "month")),
        o: budget.categoryId
      };
    }),
    O: $options.budgetWarnings.length > 0
  }, $options.budgetWarnings.length > 0 ? {
    P: common_vendor.f($options.budgetWarnings, (warning, k0, i0) => {
      return {
        a: common_vendor.t(warning.message),
        b: warning.categoryId
      };
    })
  } : {}, {
    Q: common_vendor.t($options.healthScore),
    R: $options.healthScoreColor,
    S: $options.healthScore + "%",
    T: $options.healthScoreColor,
    U: common_vendor.t($options.healthScoreDesc),
    V: common_vendor.t($options.dailyAverage.toFixed(2)),
    W: common_vendor.t($options.projectedAmount.toFixed(2)),
    X: $options.projectedAmount > $options.totalBudget ? "#FF6B6B" : "#4CAF50",
    Y: common_vendor.t($options.projectedAmount > $options.totalBudget ? "⚠️" : "✅"),
    Z: common_vendor.t($options.projectedAmount > $options.totalBudget ? "按当前速度可能超出预算" : "支出控制良好"),
    aa: common_vendor.n($options.projectedAmount > $options.totalBudget ? "trend-warning" : "trend-good")
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-0f1d8cb6"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/budget-manage/budget-manage.js.map
