"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      currentType: "expense",
      amount: "",
      selectedCategory: null,
      datetime: "",
      dateValue: "",
      timeValue: "",
      note: "",
      expenseCategories: [],
      incomeCategories: [],
      isEditMode: false,
      // 是否为编辑模式
      editingRecordId: null,
      // 正在编辑的记录ID
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
    currentCategories() {
      return this.currentType == "expense" ? this.expenseCategories : this.incomeCategories;
    },
    canSave() {
      return this.amount && parseFloat(this.amount) > 0 && this.selectedCategory;
    }
  },
  onLoad(options) {
    this.loadCategories();
    if (options && options.editId) {
      this.isEditMode = true;
      this.editingRecordId = options.editId;
      common_vendor.index.setNavigationBarTitle({
        title: "编辑记录"
      });
      this.loadEditRecord(options.editId);
    } else {
      common_vendor.index.setNavigationBarTitle({
        title: "记一笔"
      });
      const now = /* @__PURE__ */ new Date();
      this.dateValue = this.formatDateForPicker(now);
      this.timeValue = this.formatTimeForPicker(now);
      this.datetime = this.formatDatetimeForPicker(now);
      common_vendor.index.__f__("log", "at pages/add/add.vue:165", "初始化日期:", this.dateValue, "时间:", this.timeValue);
    }
    if (!this.isEditMode && options && options.presetCategory) {
      try {
        const presetCategory = JSON.parse(decodeURIComponent(options.presetCategory));
        common_vendor.index.__f__("log", "at pages/add/add.vue:172", "预设分类:", presetCategory);
        this.currentType = presetCategory.type;
        this.$nextTick(() => {
          const category = this.currentCategories.find((cat) => cat.id == presetCategory.id);
          if (category) {
            this.selectedCategory = category;
          }
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/add/add.vue:185", "解析预设分类参数失败:", error);
      }
    }
  },
  methods: {
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
      if (!expenseCategories || expenseCategories.length == 0) {
        expenseCategories = defaultExpenseCategories;
        common_vendor.index.setStorageSync("expenseCategories", expenseCategories);
      }
      if (!incomeCategories || incomeCategories.length == 0) {
        incomeCategories = defaultIncomeCategories;
        common_vendor.index.setStorageSync("incomeCategories", incomeCategories);
      }
      this.expenseCategories = expenseCategories;
      this.incomeCategories = incomeCategories;
    },
    // 加载编辑的记录数据
    loadEditRecord(recordId) {
      common_vendor.index.__f__("log", "at pages/add/add.vue:237", "加载编辑记录ID:", recordId);
      const records = common_vendor.index.getStorageSync("records") || [];
      const record = records.find((item) => item.id == recordId);
      if (record) {
        this.currentType = record.type;
        this.amount = record.amount;
        this.note = record.note || "";
        const recordDate = new Date(record.time);
        this.dateValue = this.formatDateForPicker(recordDate);
        this.timeValue = this.formatTimeForPicker(recordDate);
        this.datetime = this.formatDatetimeForPicker(recordDate);
        this.$nextTick(() => {
          const category = this.currentCategories.find((cat) => cat.id == record.categoryId);
          if (category) {
            this.selectedCategory = category;
          } else {
            this.selectedCategory = {
              id: record.categoryId,
              name: record.categoryName,
              icon: record.categoryIcon
            };
          }
        });
        common_vendor.index.__f__("log", "at pages/add/add.vue:268", "加载编辑记录:", record);
      } else {
        common_vendor.index.__f__("error", "at pages/add/add.vue:270", "找不到要编辑的记录:", recordId);
        common_vendor.index.showToast({
          title: "记录不存在",
          icon: "error"
        });
        setTimeout(() => {
          common_vendor.index.navigateBack();
        }, 1500);
      }
    },
    switchType(type) {
      this.currentType = type;
      this.selectedCategory = null;
    },
    onAmountInput(e) {
      let value = e.detail.value;
      value = value.replace(/[^\d.]/g, "");
      const dotIndex = value.indexOf(".");
      if (dotIndex !== -1) {
        value = value.slice(0, dotIndex + 1) + value.slice(dotIndex + 1).replace(/\./g, "");
        if (value.length > dotIndex + 3) {
          value = value.slice(0, dotIndex + 3);
        }
      }
      this.amount = value;
    },
    selectCategory(category) {
      this.selectedCategory = category;
    },
    onDatetimeChange(e) {
      common_vendor.index.__f__("log", "at pages/add/add.vue:308", "时间选择变更:", e.detail.value);
      this.datetime = e.detail.value;
    },
    onDateChange(e) {
      common_vendor.index.__f__("log", "at pages/add/add.vue:313", "日期选择变更:", e.detail.value);
      this.dateValue = e.detail.value;
      this.updateDateTime();
    },
    onTimeChange(e) {
      common_vendor.index.__f__("log", "at pages/add/add.vue:319", "时间选择变更:", e.detail.value);
      this.timeValue = e.detail.value;
      this.updateDateTime();
    },
    updateDateTime() {
      if (this.dateValue && this.timeValue) {
        this.datetime = `${this.dateValue} ${this.timeValue}`;
        common_vendor.index.__f__("log", "at pages/add/add.vue:327", "合并后的时间:", this.datetime);
      }
    },
    formatDateTime(datetime) {
      if (!datetime)
        return "";
      const date = new Date(datetime);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    formatDatetimeForPicker(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    formatDateForPicker(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    formatTimeForPicker(date) {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    },
    getMinDate() {
      const date = /* @__PURE__ */ new Date();
      date.setFullYear(date.getFullYear() - 1);
      return this.formatDatetimeForPicker(date);
    },
    getMaxDate() {
      const date = /* @__PURE__ */ new Date();
      return this.formatDatetimeForPicker(date);
    },
    saveRecord() {
      if (!this.canSave) {
        common_vendor.index.showToast({
          title: "请填写完整信息",
          icon: "none"
        });
        return;
      }
      if (this.isEditMode) {
        this.updateRecord();
      } else {
        this.createRecord();
      }
    },
    // 创建新记录
    createRecord() {
      const record = {
        id: Date.now().toString(),
        type: this.currentType,
        amount: this.moneyCalculator.format(parseFloat(this.amount)),
        categoryId: this.selectedCategory.id,
        categoryName: this.selectedCategory.name,
        categoryIcon: this.selectedCategory.icon,
        note: this.note.trim(),
        time: new Date(this.datetime).toISOString()
      };
      const records = common_vendor.index.getStorageSync("records") || [];
      records.push(record);
      common_vendor.index.setStorageSync("records", records);
      common_vendor.index.showToast({
        title: "记录已保存",
        icon: "success"
      });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1500);
    },
    // 更新现有记录
    updateRecord() {
      const records = common_vendor.index.getStorageSync("records") || [];
      const recordIndex = records.findIndex((item) => item.id == this.editingRecordId);
      if (recordIndex == -1) {
        common_vendor.index.showToast({
          title: "记录不存在",
          icon: "error"
        });
        return;
      }
      const updatedRecord = {
        ...records[recordIndex],
        // 保持原有的id和创建时间等信息
        type: this.currentType,
        amount: this.moneyCalculator.format(parseFloat(this.amount)),
        categoryId: this.selectedCategory.id,
        categoryName: this.selectedCategory.name,
        categoryIcon: this.selectedCategory.icon,
        note: this.note.trim(),
        time: new Date(this.datetime).toISOString()
      };
      records[recordIndex] = updatedRecord;
      common_vendor.index.setStorageSync("records", records);
      common_vendor.index.showToast({
        title: "记录已更新",
        icon: "success"
      });
      setTimeout(() => {
        common_vendor.index.navigateBack();
      }, 1500);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($data.isEditMode ? "编辑记录" : "记一笔"),
    b: $data.currentType == "expense" ? 1 : "",
    c: common_vendor.o(($event) => $options.switchType("expense")),
    d: $data.currentType == "income" ? 1 : "",
    e: common_vendor.o(($event) => $options.switchType("income")),
    f: common_vendor.o([($event) => $data.amount = $event.detail.value, (...args) => $options.onAmountInput && $options.onAmountInput(...args)]),
    g: $data.amount,
    h: common_vendor.f($options.currentCategories, (category, k0, i0) => {
      return {
        a: common_vendor.t(category.icon),
        b: common_vendor.t(category.name),
        c: category.id,
        d: $data.selectedCategory && $data.selectedCategory.id == category.id ? 1 : "",
        e: common_vendor.o(($event) => $options.selectCategory(category), category.id)
      };
    }),
    i: common_vendor.t($data.dateValue || "选择日期"),
    j: $data.dateValue,
    k: common_vendor.o((...args) => $options.onDateChange && $options.onDateChange(...args)),
    l: $options.getMinDate().split(" ")[0],
    m: $options.getMaxDate().split(" ")[0],
    n: common_vendor.t($data.timeValue || "选择时间"),
    o: $data.timeValue,
    p: common_vendor.o((...args) => $options.onTimeChange && $options.onTimeChange(...args)),
    q: $data.note,
    r: common_vendor.o(($event) => $data.note = $event.detail.value),
    s: common_vendor.t($data.isEditMode ? "更新记录" : "保存记录"),
    t: common_vendor.o((...args) => $options.saveRecord && $options.saveRecord(...args)),
    v: !$options.canSave
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/add/add.js.map
