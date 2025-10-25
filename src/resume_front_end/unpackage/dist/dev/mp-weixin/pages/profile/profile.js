"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  data() {
    return {
      // 从category.vue移过来的默认分类数据
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
  methods: {
    // 跳转到智能记账聊天
    goToChat() {
      common_vendor.index.navigateTo({
        url: "/pages/chat/chat"
      });
    },
    // 跳转到AI配置页面
    goToAIConfig() {
      common_vendor.index.navigateTo({
        url: "/pages/ai-config/ai-config"
      });
    },
    // 跳转到语音识别配置页面
    goToVoiceConfig() {
      common_vendor.index.navigateTo({
        url: "/pages/voice-config/voice-config"
      });
    },
    goToBudgetManage() {
      common_vendor.index.navigateTo({
        url: "/pages/budget-manage/budget-manage"
      });
    },
    goToIconManage() {
      common_vendor.index.navigateTo({
        url: "/pages/icon-manage/icon-manage"
      });
    },
    // 统一的错误处理方法
    showErrorDialog(title, message) {
      common_vendor.index.showModal({
        title: title || "操作失败",
        content: message || "请重试或联系技术支持",
        showCancel: false,
        confirmText: "我知道了"
      });
    },
    // 统一的成功提示方法
    showSuccessToast(message, duration = 1500) {
      common_vendor.index.showToast({
        title: message || "操作成功",
        icon: "success",
        duration
      });
    },
    refreshCategories() {
      common_vendor.index.showModal({
        title: "刷新分类",
        content: "将同步账单记录中的分类名称和图标，确定要继续吗？",
        confirmText: "确认刷新",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.performCategoryRefresh();
          }
        }
      });
    },
    performCategoryRefresh() {
      try {
        common_vendor.index.showLoading({
          title: "正在刷新分类..."
        });
        const records = common_vendor.index.getStorageSync("records") || [];
        if (records.length === 0) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "暂无账单记录",
            icon: "none"
          });
          return;
        }
        const expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [];
        const incomeCategories = common_vendor.index.getStorageSync("incomeCategories") || [];
        const expenseCategoryMap = /* @__PURE__ */ new Map();
        const incomeCategoryMap = /* @__PURE__ */ new Map();
        expenseCategories.forEach((cat) => {
          expenseCategoryMap.set(cat.id, cat);
        });
        incomeCategories.forEach((cat) => {
          incomeCategoryMap.set(cat.id, cat);
        });
        let updatedRecordsCount = 0;
        let createdCategoriesCount = 0;
        const updatedRecords = [];
        const newExpenseCategories = [...expenseCategories];
        const newIncomeCategories = [...incomeCategories];
        const missingExpenseCategories = /* @__PURE__ */ new Map();
        const missingIncomeCategories = /* @__PURE__ */ new Map();
        records.forEach((record) => {
          const categoryMap = record.type === "expense" ? expenseCategoryMap : incomeCategoryMap;
          const currentCategory = categoryMap.get(record.categoryId);
          let updatedRecord = { ...record };
          if (currentCategory) {
            if (record.categoryName !== currentCategory.name || record.categoryIcon !== currentCategory.icon) {
              updatedRecord.categoryName = currentCategory.name;
              updatedRecord.categoryIcon = currentCategory.icon;
              updatedRecordsCount++;
            }
          } else {
            const missingMap = record.type === "expense" ? missingExpenseCategories : missingIncomeCategories;
            const categoryKey = `${record.categoryId}_${record.categoryName}_${record.categoryIcon}`;
            if (!missingMap.has(categoryKey)) {
              missingMap.set(categoryKey, {
                id: record.categoryId,
                name: record.categoryName,
                icon: record.categoryIcon,
                originalId: record.categoryId
                // 保存原始ID用于后续更新
              });
            }
          }
          updatedRecords.push(updatedRecord);
        });
        const categoryIdMapping = /* @__PURE__ */ new Map();
        missingExpenseCategories.forEach((category) => {
          const originalId = category.originalId;
          if (expenseCategoryMap.has(category.id)) {
            const newId = this.generateNewCategoryId([...newExpenseCategories, ...newIncomeCategories]);
            categoryIdMapping.set(`expense_${originalId}`, newId);
            category.id = newId;
          }
          delete category.originalId;
          newExpenseCategories.push(category);
          createdCategoriesCount++;
        });
        missingIncomeCategories.forEach((category) => {
          const originalId = category.originalId;
          if (incomeCategoryMap.has(category.id)) {
            const newId = this.generateNewCategoryId([...newExpenseCategories, ...newIncomeCategories]);
            categoryIdMapping.set(`income_${originalId}`, newId);
            category.id = newId;
          }
          delete category.originalId;
          newIncomeCategories.push(category);
          createdCategoriesCount++;
        });
        if (categoryIdMapping.size > 0) {
          updatedRecords.forEach((record) => {
            const mappingKey = `${record.type}_${record.categoryId}`;
            const newId = categoryIdMapping.get(mappingKey);
            if (newId) {
              record.categoryId = newId;
              updatedRecordsCount++;
            }
          });
        }
        common_vendor.index.setStorageSync("records", updatedRecords);
        common_vendor.index.setStorageSync("expenseCategories", newExpenseCategories);
        common_vendor.index.setStorageSync("incomeCategories", newIncomeCategories);
        common_vendor.index.hideLoading();
        let message = "分类刷新完成！";
        if (updatedRecordsCount > 0 || createdCategoriesCount > 0) {
          const details = [];
          if (updatedRecordsCount > 0) {
            details.push(`更新了${updatedRecordsCount}条记录`);
          }
          if (createdCategoriesCount > 0) {
            details.push(`创建了${createdCategoriesCount}个分类`);
          }
          message += "\n" + details.join("，");
        } else {
          message += "\n所有数据已是最新状态";
        }
        common_vendor.index.showModal({
          title: "刷新完成",
          content: message,
          showCancel: false,
          confirmText: "确定"
        });
      } catch (error) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:341", "刷新分类时出错:", error);
        common_vendor.index.showToast({
          title: "刷新失败，请重试",
          icon: "error"
        });
      }
    },
    // 生成新的分类ID，避免冲突
    generateNewCategoryId(allCategories) {
      let maxId = 0;
      allCategories.forEach((cat) => {
        if (typeof cat.id === "number" && cat.id > maxId) {
          maxId = cat.id;
        } else if (typeof cat.id === "string") {
          const numId = parseInt(cat.id);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      });
      return maxId + 1;
    },
    clearAllData() {
      common_vendor.index.showModal({
        title: "清空所有数据",
        content: "此操作将永久删除所有记账记录，无法恢复。确定要继续吗？",
        confirmColor: "#FF6B6B",
        confirmText: "确认清空",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.removeStorageSync("records");
            common_vendor.index.showToast({
              title: "所有数据已清空",
              icon: "success"
            });
          }
        }
      });
    },
    importData() {
      common_vendor.index.showActionSheet({
        itemList: ["从剪贴板导入", "手动输入数据"],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.importFromClipboard();
          } else if (res.tapIndex === 1) {
            this.showCsvImportDialog();
          }
        }
      });
    },
    // 统一的文件导入入口
    importFromFile() {
      this.importFromFileWx();
    },
    showCsvImportDialog() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:460", "=== 显示CSV数据输入对话框 ===");
      common_vendor.index.showModal({
        title: "导入数据",
        content: '请将CSV格式的数据粘贴到下方输入框：\n\n新格式：时间,类型,分类名,分类图标,金额,备注\n旧格式：时间,类型,分类名,金额,备注\n\n示例：\n"2024-01-01 12:00","支出","餐饮","🍽️","25.50","午餐"',
        editable: true,
        placeholderText: "请粘贴CSV数据...",
        confirmText: "开始导入",
        cancelText: "取消",
        success: (res) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:470", "CSV输入对话框结果:", res);
          if (res.confirm && res.content && res.content.trim()) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:472", "用户输入CSV数据长度:", res.content.trim().length);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:473", "CSV数据内容预览:", res.content.trim().substring(0, 200) + (res.content.trim().length > 200 ? "..." : ""));
            this.parseCsvData(res.content.trim());
          } else if (res.confirm) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:476", "用户确认但未输入数据");
            common_vendor.index.showToast({
              title: "请输入有效数据",
              icon: "none"
            });
          } else {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:482", "用户取消CSV数据输入");
          }
        }
      });
    },
    importFromClipboard() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:489", "=== 开始从剪切板导入 ===");
      common_vendor.index.getClipboardData({
        success: (res) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:512", "uni-app剪切板读取成功:", res);
          this.processClipboardData(res.data);
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:516", "uni-app读取剪切板失败:", err);
          common_vendor.index.showModal({
            title: "读取失败",
            content: "无法读取剪切板内容，请检查权限设置或手动粘贴数据。",
            showCancel: true,
            confirmText: "手动输入",
            cancelText: "取消",
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.showCsvImportDialog();
              }
            }
          });
        }
      });
    },
    processClipboardData(clipboardData) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:535", "=== 处理剪切板数据 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:536", "剪切板数据类型:", typeof clipboardData);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:537", "剪切板数据长度:", clipboardData ? clipboardData.length : 0);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:538", "剪切板数据预览:", clipboardData ? clipboardData.substring(0, 200) + (clipboardData.length > 200 ? "..." : "") : "无内容");
      if (!clipboardData || !clipboardData.trim()) {
        common_vendor.index.showModal({
          title: "剪贴板为空",
          content: "剪贴板中没有找到数据，请先复制CSV格式的数据。\n\n支持格式：\n新格式：时间,类型,分类名,分类图标,金额,备注\n旧格式：时间,类型,分类名,金额,备注",
          showCancel: false,
          confirmText: "我知道了"
        });
        return;
      }
      const trimmedData = clipboardData.trim();
      if (!trimmedData.includes(",")) {
        common_vendor.index.showModal({
          title: "数据格式错误",
          content: "检测到的数据不是有效的CSV格式，请确保数据包含逗号分隔的字段。\n\n支持格式：\n新格式：时间,类型,分类名,分类图标,金额,备注\n旧格式：时间,类型,分类名,金额,备注",
          showCancel: false,
          confirmText: "我知道了"
        });
        return;
      }
      const lines = trimmedData.split("\n").filter((line) => line.trim());
      common_vendor.index.showModal({
        title: "确认导入数据",
        content: `检测到 ${lines.length} 行数据，确定要导入吗？

数据预览：
${trimmedData.substring(0, 100)}${trimmedData.length > 100 ? "..." : ""}`,
        confirmText: "确认导入",
        cancelText: "取消",
        success: (modalRes) => {
          if (modalRes.confirm) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:571", "用户确认导入剪切板数据");
            this.parseCsvData(trimmedData);
          } else {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:574", "用户取消导入剪切板数据");
          }
        }
      });
    },
    showManualPasteDialog() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:581", "=== 显示手动粘贴对话框 ===");
      common_vendor.index.showModal({
        title: "手动输入数据",
        content: "无法自动读取剪贴板内容，请点击确定后手动输入CSV数据。\n\n支持格式：\n新格式：时间,类型,分类名,分类图标,金额,备注\n旧格式：时间,类型,分类名,金额,备注",
        showCancel: true,
        confirmText: "手动输入",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.showCsvImportDialog();
          }
        }
      });
    },
    exportToClipboard(csvContent, recordCount) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:597", "=== 开始导出到剪切板 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:598", "记录数量:", recordCount);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:599", "CSV内容长度:", csvContent.length);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:600", "CSV内容预览:", csvContent.substring(0, 200));
      common_vendor.index.setClipboardData({
        data: csvContent,
        success: () => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:629", "uni-app剪切板写入成功");
          common_vendor.index.showModal({
            title: "导出成功",
            content: `已将 ${recordCount} 条记录复制到剪贴板！

您可以将数据粘贴到任意文本编辑器中保存为CSV文件，或直接在其他应用中使用。`,
            showCancel: false,
            confirmText: "我知道了"
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:638", "uni-app剪切板写入失败:", err);
          common_vendor.index.showModal({
            title: "导出失败",
            content: "无法复制数据到剪贴板，请检查应用权限设置。\n\n您可以尝试其他导出方式。",
            showCancel: false,
            confirmText: "我知道了"
          });
        }
      });
    },
    fallbackCopyToClipboard(csvContent, recordCount) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:651", "=== 使用后备剪切板方案 ===");
      try {
        const textArea = document.createElement("textarea");
        textArea.value = csvContent;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:668", "后备方案复制成功");
          common_vendor.index.showModal({
            title: "导出成功",
            content: `已将${recordCount}条记录复制到剪切板

您可以粘贴到任意文本编辑器中保存为CSV文件，或直接在其他应用中使用。`,
            showCancel: false,
            confirmText: "知道了"
          });
        } else {
          throw new Error("execCommand copy failed");
        }
      } catch (err) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:679", "后备方案也失败了:", err);
        this.showManualCopyDialog(csvContent, recordCount);
      }
    },
    showManualCopyDialog(csvContent, recordCount) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:686", "=== 显示手动复制对话框 ===");
      const previewContent = csvContent.length > 500 ? csvContent.substring(0, 500) + "\n...(数据已截断，请复制完整内容)" : csvContent;
      common_vendor.index.showModal({
        title: "请手动复制",
        content: `自动复制失败，请手动复制以下内容：

${previewContent}`,
        showCancel: true,
        confirmText: "已复制",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showToast({
              title: "操作完成",
              icon: "success"
            });
          }
        }
      });
    },
    parseCsvData(csvText) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:709", "=== 开始解析CSV数据 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:710", "输入数据类型:", typeof csvText);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:711", "输入数据长度:", csvText ? csvText.length : "undefined");
      try {
        if (!csvText || typeof csvText !== "string") {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:716", "数据检查失败: 数据为空或不是字符串类型");
          common_vendor.index.showToast({
            title: "数据为空或格式错误",
            icon: "none"
          });
          return;
        }
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:724", "开始分割数据行...");
        const lines = csvText.split("\n").filter((line) => line.trim());
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:726", "总行数:", lines.length, "有效行数:", lines.filter((line) => line.trim()).length);
        if (lines.length === 0) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:729", "数据检查失败: 文件内容为空");
          common_vendor.index.showToast({
            title: "文件内容为空",
            icon: "none"
          });
          return;
        }
        const records = [];
        const existingRecords = common_vendor.index.getStorageSync("records") || [];
        const newCategories = [];
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:740", "现有记录数量:", existingRecords.length);
        let startIndex = 0;
        let hasIconColumn = false;
        if (lines.length > 0 && lines[0]) {
          const firstLine = lines[0].toLowerCase();
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:747", "第一行内容:", lines[0]);
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:748", "第一行小写:", firstLine);
          if (firstLine.includes("时间") && firstLine.includes("类型")) {
            startIndex = 1;
            hasIconColumn = firstLine.includes("图标");
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:752", "检测到标题行，从第二行开始解析，包含图标列:", hasIconColumn);
          } else {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:754", "未检测到标题行，从第一行开始解析");
            const firstLineFields = this.parseCSVLine(lines[0]);
            hasIconColumn = firstLineFields.length >= 6;
          }
        }
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:759", "开始逐行解析数据，起始行:", startIndex);
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:762", `处理第${i + 1}行:`, line.substring(0, 100) + (line.length > 100 ? "..." : ""));
          if (!line) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:765", `第${i + 1}行为空，跳过`);
            continue;
          }
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:770", `开始解析第${i + 1}行的CSV字段...`);
          const fields = this.parseCSVLine(line);
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:772", `第${i + 1}行解析得到${fields.length}个字段:`, fields);
          const minFields = hasIconColumn ? 5 : 4;
          if (fields.length >= minFields) {
            let timeStr, typeStr, categoryStr, categoryIcon, amountStr, noteStr;
            if (hasIconColumn) {
              timeStr = fields[0];
              typeStr = fields[1];
              categoryStr = fields[2];
              categoryIcon = fields[3];
              amountStr = fields[4];
              noteStr = fields[5] || "";
            } else {
              timeStr = fields[0];
              typeStr = fields[1];
              categoryStr = fields[2];
              categoryIcon = "";
              amountStr = fields[3];
              noteStr = fields[4] || "";
            }
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:797", `第${i + 1}行字段详情:`, {
              time: timeStr,
              type: typeStr,
              category: categoryStr,
              icon: categoryIcon,
              amount: amountStr,
              note: noteStr
            });
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:805", `验证第${i + 1}行数据类型...`);
            const type = typeStr === "支出" ? "expense" : typeStr === "收入" ? "income" : null;
            if (!type) {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:808", `第${i + 1}行类型无效:`, typeStr, "跳过此行");
              continue;
            }
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:811", `第${i + 1}行类型验证通过:`, type);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:813", `解析第${i + 1}行金额:`, amountStr);
            const amount = parseFloat(amountStr.replace(/[^\d.]/g, ""));
            if (isNaN(amount) || amount <= 0) {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:816", `第${i + 1}行金额无效:`, amountStr, "=>", amount, "跳过此行");
              continue;
            }
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:819", `第${i + 1}行金额验证通过:`, amount);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:822", `查找第${i + 1}行分类:`, categoryStr, type, "图标:", categoryIcon);
            let category = this.findOrCreateCategory(categoryStr, type, categoryIcon);
            if (!category) {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:825", `第${i + 1}行无法创建分类:`, categoryStr, "跳过此行");
              continue;
            }
            if (category.isNewCategory) {
              const existingNew = newCategories.find((cat) => cat.name === category.name && cat.type === type);
              if (!existingNew) {
                newCategories.push({
                  name: category.name,
                  icon: category.icon,
                  type: type === "expense" ? "支出" : "收入"
                });
              }
              delete category.isNewCategory;
            }
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:842", `第${i + 1}行分类处理成功:`, category);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:843", `解析第${i + 1}行时间:`, timeStr);
            let time;
            try {
              time = new Date(timeStr).toISOString();
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:847", `第${i + 1}行时间解析成功:`, time);
            } catch (e) {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:849", `第${i + 1}行时间解析失败，使用当前时间:`, e.message);
              time = (/* @__PURE__ */ new Date()).toISOString();
            }
            const record = {
              id: Date.now().toString() + "_import_" + i,
              type,
              amount: amount.toFixed(2),
              categoryId: category.id,
              categoryName: category.name,
              categoryIcon: category.icon,
              note: noteStr,
              time
            };
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:864", `第${i + 1}行记录创建成功:`, record);
            records.push(record);
          } else {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:867", `第${i + 1}行字段数量不足(${fields.length}/${minFields})，跳过此行`);
          }
        }
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:871", "数据解析完成，有效记录数:", records.length);
        if (records.length > 0) {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:875", "开始合并数据到本地存储...");
          const allRecords = [...existingRecords, ...records];
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:877", "合并后总记录数:", allRecords.length);
          common_vendor.index.setStorageSync("records", allRecords);
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:880", "数据保存成功");
          let successMessage = `成功导入 ${records.length} 条记录！`;
          if (newCategories.length > 0) {
            successMessage += `

新创建分类 ${newCategories.length} 个：
`;
            newCategories.forEach((cat) => {
              successMessage += `${cat.icon} ${cat.name} (${cat.type})
`;
            });
          }
          common_vendor.index.showModal({
            title: "导入完成",
            content: successMessage,
            showCancel: false,
            confirmText: "我知道了"
          });
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:897", "=== CSV导入流程完成 ===");
        } else {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:899", "没有可导入的有效数据");
          common_vendor.index.showToast({
            title: "没有可导入的有效数据",
            icon: "none"
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:906", "=== CSV解析出现异常 ===");
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:907", "错误类型:", error.name);
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:908", "错误信息:", error.message);
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:909", "错误堆栈:", error.stack);
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:910", "输入数据:", csvText);
        common_vendor.index.showModal({
          title: "数据格式错误",
          content: '请检查数据格式是否正确！\n\n支持格式：\n新格式：时间,类型,分类名,分类图标,金额,备注\n旧格式：时间,类型,分类名,金额,备注\n\n示例：\n"2024-01-01 12:00","支出","餐饮","🍽️","25.50","午餐"',
          showCancel: false,
          confirmText: "我知道了"
        });
      }
    },
    // H5平台文件导入
    importFromFileH5() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:923", "=== H5平台文件选择流程 ===");
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.txt";
      input.style.display = "none";
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:929", "创建文件选择元素:", input);
      input.onchange = (event) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:932", "=== H5文件选择change事件触发 ===");
        const file = event.target.files[0];
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:934", "选择的文件对象:", file);
        if (!file) {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:937", "未选择文件或文件为空");
          common_vendor.index.showToast({
            title: "未选择文件",
            icon: "none"
          });
          return;
        }
        if (file.size === 0) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:947", "文件大小为0");
          common_vendor.index.showToast({
            title: "文件为空",
            icon: "error"
          });
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:956", "文件过大:", file.size);
          common_vendor.index.showToast({
            title: "文件不能超过5MB",
            icon: "error"
          });
          return;
        }
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:964", "文件大小检查通过，开始读取文件内容...");
        const reader = new FileReader();
        reader.onload = (e) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:968", "=== FileReader读取完成 ===");
          const content = e.target.result;
          if (!content || typeof content !== "string") {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:972", "读取到的内容无效");
            common_vendor.index.showToast({
              title: "文件内容无效",
              icon: "error"
            });
            return;
          }
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:980", "文件读取成功，开始解析CSV数据...");
          this.parseCsvData(content);
        };
        reader.onerror = (e) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:985", "=== FileReader读取失败 ===", e);
          common_vendor.index.showToast({
            title: "读取文件失败",
            icon: "error"
          });
        };
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:992", "开始FileReader.readAsText操作...");
        reader.readAsText(file, "UTF-8");
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:996", "清理文件选择元素");
        document.body.removeChild(input);
      };
      input.oncancel = () => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1002", "文件选择cancel事件触发");
        document.body.removeChild(input);
      };
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1006", "添加文件选择元素到DOM并触发点击");
      document.body.appendChild(input);
      input.click();
    },
    importFromFileWx() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1012", "=== 微信小程序文件选择流程 ===");
      common_vendor.wx$1.chooseMessageFile({
        count: 1,
        type: "file",
        success: (res) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1018", "文件选择成功:", res);
          const file = res.tempFiles[0];
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1020", "选择的文件:", file);
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1021", "文件名:", file.name);
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1022", "文件大小:", file.size);
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1023", "文件路径:", file.path);
          if (!file.name.toLowerCase().endsWith(".csv") && !file.name.toLowerCase().endsWith(".txt")) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1026", "文件类型检查失败:", file.name);
            common_vendor.index.showToast({
              title: "请选择CSV或TXT文件",
              icon: "none"
            });
            return;
          }
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1033", "文件类型检查通过");
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1035", "开始读取文件内容...");
          const fs = common_vendor.wx$1.getFileSystemManager();
          if (!fs) {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:1039", "无法获取文件系统管理器");
            common_vendor.index.showToast({
              title: "文件系统不可用",
              icon: "error"
            });
            return;
          }
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1047", "文件系统管理器获取成功，开始读取文件:", file.path);
          fs.readFile({
            filePath: file.path,
            encoding: "utf8",
            success: (fileRes) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1053", "文件读取成功！");
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1054", "读取结果:", fileRes);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1055", "数据类型:", typeof fileRes.data);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1056", "数据长度:", fileRes.data ? fileRes.data.length : "undefined");
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1057", "文件内容预览:", fileRes.data ? fileRes.data.substring(0, 200) + (fileRes.data.length > 200 ? "..." : "") : "无内容");
              if (!fileRes.data) {
                common_vendor.index.__f__("error", "at pages/profile/profile.vue:1060", "读取到的文件内容为空");
                common_vendor.index.showToast({
                  title: "文件内容为空",
                  icon: "error"
                });
                return;
              }
              if (typeof fileRes.data !== "string") {
                common_vendor.index.__f__("error", "at pages/profile/profile.vue:1069", "读取到的内容不是字符串类型:", typeof fileRes.data);
                common_vendor.index.showToast({
                  title: "文件格式错误",
                  icon: "error"
                });
                return;
              }
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1077", "文件内容有效，开始解析CSV...");
              this.parseCsvData(fileRes.data);
            },
            fail: (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1081", "读取文件失败:", err);
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1082", "错误对象完整信息:", JSON.stringify(err, null, 2));
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1083", "错误消息:", err.errMsg || err.message || "未知错误");
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1084", "错误代码:", err.errCode || err.code || "无代码");
              common_vendor.index.showToast({
                title: "读取文件失败: " + (err.errMsg || err.message || "未知错误"),
                icon: "error"
              });
            }
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1094", "文件选择失败:", err);
          if (err.errMsg && err.errMsg.includes("cancel")) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1097", "用户取消文件选择(通过errMsg检测)");
            return;
          }
          if (err.code === 12 || err.message && err.message.includes("cancelled")) {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1102", "用户取消文件选择(通过code/message检测)");
            return;
          }
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1107", "文件选择出现其他错误，启动降级方案");
          this.fallbackImport();
        }
      });
    },
    selectFromDownloads() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1114", "=== 从下载目录选择文件 ===");
      plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1116", "获取下载目录文件系统成功");
        fs.root.createReader().readEntries((rootEntries) => {
          const rootCsvFiles = rootEntries.filter(
            (entry) => entry.isFile && (entry.name.toLowerCase().endsWith(".csv") || entry.name.toLowerCase().endsWith(".txt"))
          );
          fs.root.getDirectory("AccountData", { create: false }, (accountDataEntry) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1129", "找到AccountData目录");
            accountDataEntry.createReader().readEntries((subEntries) => {
              const subCsvFiles = subEntries.filter(
                (entry) => entry.isFile && (entry.name.toLowerCase().endsWith(".csv") || entry.name.toLowerCase().endsWith(".txt"))
              ).map((entry) => ({
                ...entry,
                displayName: `AccountData/${entry.name}`,
                isFromSubDir: true
              }));
              const allFiles = [
                ...rootCsvFiles.map((entry) => ({
                  ...entry,
                  displayName: entry.name,
                  isFromSubDir: false
                })),
                ...subCsvFiles
              ];
              this.showFileSelectionDialog(allFiles, "下载目录");
            }, (err) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1154", "AccountData目录为空或读取失败:", err);
              this.showFileSelectionDialog(
                rootCsvFiles.map((entry) => ({
                  ...entry,
                  displayName: entry.name,
                  isFromSubDir: false
                })),
                "下载目录"
              );
            });
          }, (err) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1165", "AccountData目录不存在:", err);
            this.showFileSelectionDialog(
              rootCsvFiles.map((entry) => ({
                ...entry,
                displayName: entry.name,
                isFromSubDir: false
              })),
              "下载目录"
            );
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:1176", "读取下载目录失败:", err);
          this.fallbackImport();
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1180", "访问下载目录失败:", err);
        this.fallbackImport();
      });
    },
    selectFromDocuments() {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.createReader().readEntries((entries) => {
          const csvFiles = entries.filter(
            (entry) => entry.name.toLowerCase().endsWith(".csv") || entry.name.toLowerCase().endsWith(".txt")
          );
          if (csvFiles.length === 0) {
            common_vendor.index.showToast({
              title: "文档目录中没有找到CSV文件",
              icon: "none"
            });
            return;
          }
          const fileNames = csvFiles.map((file) => file.name);
          common_vendor.index.showActionSheet({
            itemList: fileNames,
            success: (res) => {
              const selectedFile = csvFiles[res.tapIndex];
              this.readFileContent(selectedFile);
            }
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1212", "访问文档目录失败:", err);
        this.fallbackImport();
      });
    },
    // 从公共存储（下载目录的AccountData子目录）导入
    selectFromPublicStorage() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1219", "=== 从公共存储选择文件 ===");
      try {
        const Environment = plus.android.importClass("android.os.Environment");
        const File = plus.android.importClass("java.io.File");
        let publicDownloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (publicDownloadsDir === null || publicDownloadsDir === void 0) {
          const externalStorageDir = Environment.getExternalStorageDirectory();
          if (externalStorageDir !== null) {
            publicDownloadsDir = new File(externalStorageDir, "Download");
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1235", "使用备用下载目录路径:", publicDownloadsDir.getAbsolutePath());
          } else {
            throw new Error("无法获取任何外部存储目录");
          }
        }
        const accountDataDir = new File(publicDownloadsDir, "AccountData");
        if (!accountDataDir.exists()) {
          common_vendor.index.showToast({
            title: "未找到AccountData目录，请先导出数据",
            icon: "none"
          });
          return;
        }
        const files = accountDataDir.listFiles();
        if (!files || files.length === 0) {
          common_vendor.index.showToast({
            title: "AccountData目录为空",
            icon: "none"
          });
          return;
        }
        const csvFiles = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.getName();
          if (fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".txt")) {
            csvFiles.push({
              name: fileName,
              fullPath: file.getAbsolutePath(),
              displayName: fileName,
              isFromPublicDir: true,
              nativeFile: file
            });
          }
        }
        if (csvFiles.length === 0) {
          common_vendor.index.showToast({
            title: "未找到CSV或TXT文件",
            icon: "none"
          });
          return;
        }
        this.showFileSelectionDialog(csvFiles, "真正的公共存储(AccountData目录)");
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1288", "访问公共目录失败:", error);
        this.fallbackSelectFromPublicStorage();
      }
    },
    // 降级的公共存储选择方法
    fallbackSelectFromPublicStorage() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1296", "降级使用 plus.io API 选择文件");
      plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1298", "获取下载目录文件系统成功");
        fs.root.getDirectory("AccountData", { create: false }, (accountDataEntry) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1302", "找到AccountData目录");
          accountDataEntry.createReader().readEntries((entries) => {
            const csvFiles = entries.filter(
              (entry) => entry.isFile && (entry.name.toLowerCase().endsWith(".csv") || entry.name.toLowerCase().endsWith(".txt"))
            ).map((entry) => ({
              ...entry,
              displayName: entry.name,
              isFromSubDir: true,
              parentDir: accountDataEntry
            }));
            this.showFileSelectionDialog(csvFiles, "公共存储(AccountData目录)");
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:1318", "读取AccountData目录失败:", err);
            common_vendor.index.showToast({
              title: "AccountData目录为空或无法访问",
              icon: "none"
            });
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:1325", "AccountData目录不存在:", err);
          common_vendor.index.showToast({
            title: "未找到AccountData目录，请先导出数据",
            icon: "none"
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1332", "访问公共存储失败:", err);
        this.fallbackImport();
      });
    },
    // 从应用文档目录导入
    selectFromAppDocuments() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1339", "=== 从应用文档目录选择文件 ===");
      const externalPath = plus.io.convertLocalFileSystemURL("_documents/");
      plus.io.resolveLocalFileSystemURL(externalPath, (externalEntry) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1344", "找到外部文档目录");
        externalEntry.createReader().readEntries((entries) => {
          const csvFiles = entries.filter(
            (entry) => entry.isFile && (entry.name.toLowerCase().endsWith(".csv") || entry.name.toLowerCase().endsWith(".txt"))
          ).map((entry) => ({
            ...entry,
            displayName: `外部文档/${entry.name}`,
            isFromSubDir: false
          }));
          this.checkPrivateDocuments((privateCsvFiles) => {
            const allFiles = [...csvFiles, ...privateCsvFiles];
            this.showFileSelectionDialog(allFiles, "应用文档目录");
          });
        }, (err) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1363", "外部文档目录为空:", err);
          this.checkPrivateDocuments((privateCsvFiles) => {
            this.showFileSelectionDialog(privateCsvFiles, "应用文档目录");
          });
        });
      }, (err) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1370", "外部文档目录不存在:", err);
        this.checkPrivateDocuments((privateCsvFiles) => {
          this.showFileSelectionDialog(privateCsvFiles, "应用文档目录");
        });
      });
    },
    // 检查私有文档目录
    checkPrivateDocuments(callback) {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.createReader().readEntries((entries) => {
          const csvFiles = entries.filter(
            (entry) => entry.isFile && (entry.name.toLowerCase().endsWith(".csv") || entry.name.toLowerCase().endsWith(".txt"))
          ).map((entry) => ({
            ...entry,
            displayName: `私有文档/${entry.name}`,
            isFromSubDir: false
          }));
          callback(csvFiles);
        }, (err) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1394", "私有文档目录为空:", err);
          callback([]);
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1398", "访问私有文档目录失败:", err);
        callback([]);
      });
    },
    // 显示文件选择对话框
    showFileSelectionDialog(files, sourceDesc) {
      if (files.length === 0) {
        common_vendor.index.showToast({
          title: `${sourceDesc}中没有找到CSV文件`,
          icon: "none"
        });
        return;
      }
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1413", `找到${files.length}个文件:`, files.map((f) => f.displayName));
      const fileNames = files.map((file) => file.displayName);
      common_vendor.index.showActionSheet({
        itemList: fileNames,
        success: (res) => {
          const selectedFile = files[res.tapIndex];
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1421", "选择的文件:", selectedFile.displayName);
          if (selectedFile.isFromSubDir && selectedFile.parentDir) {
            selectedFile.parentDir.getFile(selectedFile.name, { create: false }, (fileEntry) => {
              this.readFileContent(fileEntry);
            }, (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1428", "获取子目录文件失败:", err);
              common_vendor.index.showToast({
                title: "文件访问失败",
                icon: "error"
              });
            });
          } else {
            this.readFileContent(selectedFile);
          }
        }
      });
    },
    manualInputPath() {
      common_vendor.index.showModal({
        title: "输入文件路径",
        content: "请输入CSV文件的完整路径：",
        editable: true,
        placeholderText: "/storage/emulated/0/Download/data.csv",
        success: (res) => {
          if (res.confirm && res.content && res.content.trim()) {
            this.readFileFromPath(res.content.trim());
          }
        }
      });
    },
    readFileFromPath(filePath) {
      plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
        this.readFileContent(entry);
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1460", "文件路径错误:", err);
        common_vendor.index.showToast({
          title: "文件不存在或路径错误",
          icon: "none"
        });
      });
    },
    readFileContent(fileEntry) {
      if (fileEntry.isFromPublicDir && fileEntry.nativeFile) {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1471", "从公共目录读取文件:", fileEntry.fullPath);
        try {
          const FileInputStream = plus.android.importClass("java.io.FileInputStream");
          const InputStreamReader = plus.android.importClass("java.io.InputStreamReader");
          const BufferedReader = plus.android.importClass("java.io.BufferedReader");
          const StringBuilder = plus.android.importClass("java.lang.StringBuilder");
          const fis = new FileInputStream(fileEntry.nativeFile);
          const isr = new InputStreamReader(fis, "UTF-8");
          const br = new BufferedReader(isr);
          const sb = new StringBuilder();
          let line;
          while ((line = br.readLine()) !== null) {
            sb.append(line).append("\n");
          }
          br.close();
          isr.close();
          fis.close();
          const content = sb.toString();
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1493", "文件内容读取完成，长度:", content.length);
          this.parseCsvData(content);
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:1497", "读取公共目录文件失败:", error);
          common_vendor.index.showToast({
            title: "读取文件失败",
            icon: "none"
          });
        }
      } else {
        fileEntry.file((file) => {
          const reader = new plus.io.FileReader();
          reader.onload = (e) => {
            this.parseCsvData(e.target.result);
          };
          reader.onerror = (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:1511", "读取文件失败:", err);
            common_vendor.index.showToast({
              title: "读取文件失败",
              icon: "none"
            });
          };
          reader.readAsText(file, "UTF-8");
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:1519", "获取文件内容失败:", err);
          common_vendor.index.showToast({
            title: "获取文件内容失败",
            icon: "none"
          });
        });
      }
    },
    fallbackImport() {
      common_vendor.index.showModal({
        title: "导入提示",
        content: '当前环境不支持文件选择功能，请使用"手动输入数据"方式导入。',
        showCancel: true,
        confirmText: "手动输入",
        cancelText: "取消",
        success: (res) => {
          if (res.confirm) {
            this.showCsvImportDialog();
          }
        }
      });
    },
    parseCSVLine(line) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1544", "开始解析CSV行:", line);
      if (!line || typeof line !== "string") {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1547", "CSV行无效，返回空数组");
        return [];
      }
      const result = [];
      let current = "";
      let inQuotes = false;
      let i = 0;
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1556", "开始逐字符解析，总长度:", line.length);
      while (i < line.length) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1562", `字符${i}: 引号，inQuotes=${inQuotes}`);
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1565", `字符${i}: 逗号(非引号内)，添加字段: "${current.trim()}"`);
          current = "";
        } else {
          current += char;
        }
        i++;
      }
      result.push(current.trim());
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1574", `解析完成，最后添加字段: "${current.trim()}"`);
      const finalResult = result.map((field) => field.replace(/^"|"$/g, ""));
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1578", "移除引号后的最终结果:", finalResult);
      return finalResult;
    },
    findOrCreateCategory(categoryName, type, categoryIcon = "") {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1583", "查找或创建分类:", categoryName, "类型:", type, "图标:", categoryIcon);
      let expenseCategories = common_vendor.index.getStorageSync("expenseCategories") || [...this.defaultExpenseCategories];
      let incomeCategories = common_vendor.index.getStorageSync("incomeCategories") || [...this.defaultIncomeCategories];
      const categories = type === "expense" ? expenseCategories : incomeCategories;
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1590", "可用分类列表:", categories.map((cat) => cat.name));
      let category = categories.find((cat) => cat.name === categoryName);
      if (category) {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1595", "找到现有分类:", category);
        return category;
      }
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1600", "未找到分类，创建新分类:", categoryName);
      let finalIcon = categoryIcon;
      if (!finalIcon || finalIcon.trim() === "") {
        finalIcon = type === "expense" ? "📦" : "💎";
      }
      const allCategories = [...expenseCategories, ...incomeCategories];
      const maxId = allCategories.length > 0 ? Math.max(...allCategories.map((cat) => cat.id || 0)) : 0;
      const newId = maxId + 1;
      const newCategory = {
        id: newId,
        name: categoryName,
        icon: finalIcon,
        isNewCategory: true
        // 临时标记，用于识别新创建的分类
      };
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1622", "创建的新分类:", newCategory);
      if (type === "expense") {
        expenseCategories.push(newCategory);
        common_vendor.index.setStorageSync("expenseCategories", expenseCategories);
      } else {
        incomeCategories.push(newCategory);
        common_vendor.index.setStorageSync("incomeCategories", incomeCategories);
      }
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1633", "新分类已保存到存储");
      return newCategory;
    },
    createSampleData() {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1638", "=== 开始创建示例数据 ===");
      const existingRecords = common_vendor.index.getStorageSync("records") || [];
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1640", "当前已有记录数:", existingRecords.length);
      const sampleData = [
        {
          id: Date.now().toString() + "_sample1",
          type: "expense",
          amount: "35.80",
          categoryId: 1,
          categoryName: "餐饮",
          categoryIcon: "🍽️",
          note: "午餐 - 示例数据",
          time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "_sample2",
          type: "expense",
          amount: "12.00",
          categoryId: 2,
          categoryName: "交通",
          categoryIcon: "🚗",
          note: "地铁费 - 示例数据",
          time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "_sample3",
          type: "expense",
          amount: "199.00",
          categoryId: 3,
          categoryName: "购物",
          categoryIcon: "🛍️",
          note: "买衣服 - 示例数据",
          time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "_sample4",
          type: "income",
          amount: "3000.00",
          categoryId: 11,
          categoryName: "工资",
          categoryIcon: "💰",
          note: "部分工资 - 示例数据",
          time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "_sample5",
          type: "expense",
          amount: "88.50",
          categoryId: 4,
          categoryName: "娱乐",
          categoryIcon: "🎬",
          note: "电影票 - 示例数据",
          time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString()
        },
        {
          id: Date.now().toString() + "_sample6",
          type: "income",
          amount: "200.00",
          categoryId: 15,
          categoryName: "红包",
          categoryIcon: "🧧",
          note: "生日红包 - 示例数据",
          time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1e3).toISOString()
        }
      ];
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1706", "创建的示例数据:", sampleData);
      const allRecords = [...existingRecords, ...sampleData];
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1710", "合并后总记录数:", allRecords.length);
      common_vendor.index.setStorageSync("records", allRecords);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1713", "示例数据保存成功");
      common_vendor.index.showToast({
        title: `成功导入${sampleData.length}条示例数据`,
        icon: "success",
        duration: 2e3
      });
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1720", "=== 示例数据创建流程完成 ===");
    },
    exportData() {
      const records = common_vendor.index.getStorageSync("records") || [];
      if (records.length === 0) {
        common_vendor.index.showToast({
          title: "暂无数据可导出",
          icon: "none"
        });
        return;
      }
      common_vendor.index.getStorageSync("expenseCategories") || this.defaultExpenseCategories;
      common_vendor.index.getStorageSync("incomeCategories") || this.defaultIncomeCategories;
      let csvContent = "时间,类型,分类名,分类图标,金额,备注\n";
      records.forEach((record) => {
        const time = new Date(record.time).toLocaleString("zh-CN");
        const type = record.type === "expense" ? "支出" : "收入";
        const categoryName = record.categoryName;
        const categoryIcon = record.categoryIcon || "📦";
        const amount = record.amount;
        const note = record.note || "";
        csvContent += `"${time}","${type}","${categoryName}","${categoryIcon}","${amount}","${note}"
`;
      });
      common_vendor.index.showActionSheet({
        itemList: ["复制到剪切板"],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.exportToClipboard(csvContent, records.length);
          }
        }
      });
    },
    // 显示文件保存选项
    showFileSaveOptions(csvContent, recordCount, fileName) {
      common_vendor.index.showActionSheet({
        itemList: ["保存到公共存储", "保存到下载目录", "保存到应用文档", "自定义路径"],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.saveToDCIM(csvContent, recordCount, fileName);
          } else if (res.tapIndex === 1) {
            this.saveToDownloads(csvContent, recordCount, fileName);
          } else if (res.tapIndex === 2) {
            this.saveToPublicDocuments(csvContent, recordCount, fileName);
          } else if (res.tapIndex === 3) {
            this.saveToCustomLocation(csvContent, recordCount, fileName);
          }
        }
      });
    },
    saveToFile(csvContent, recordCount) {
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `记账数据_${dateStr}.csv`;
      this.saveFileWx(csvContent, recordCount, fileName);
    },
    selectSaveLocationApp(csvContent, recordCount, fileName) {
      if (typeof plus !== "undefined") {
        common_vendor.index.showActionSheet({
          itemList: ["保存到下载目录", "保存到公共存储", "保存到应用文档", "选择自定义目录"],
          success: (res) => {
            if (res.tapIndex === 0) {
              this.saveToDownloads(csvContent, recordCount, fileName);
            } else if (res.tapIndex === 1) {
              this.saveToDCIM(csvContent, recordCount, fileName);
            } else if (res.tapIndex === 2) {
              this.saveToPublicDocuments(csvContent, recordCount, fileName);
            } else if (res.tapIndex === 3) {
              this.saveToCustomLocation(csvContent, recordCount, fileName);
            }
          }
        });
      } else {
        this.fallbackExport(csvContent, recordCount);
      }
    },
    saveToDownloads(csvContent, recordCount, fileName) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1861", "=== 开始保存到下载目录 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1862", "文件名:", fileName);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1863", "记录数量:", recordCount);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1864", "CSV内容长度:", csvContent.length);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1865", "CSV内容预览:", csvContent.substring(0, 200));
      plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1868", "获取下载目录文件系统成功");
        fs.root.getFile(fileName, { create: true }, (fileEntry) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1870", "创建文件成功:", fileEntry.fullPath);
          fileEntry.createWriter((writer) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1872", "创建写入器成功");
            writer.onwrite = (e) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1875", "文件写入完成事件:", e);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1876", "写入器位置:", writer.position);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1877", "写入器长度:", writer.length);
              common_vendor.index.showModal({
                title: "导出完成",
                content: `文件已成功保存！

位置：下载目录/${fileName}
记录数：${recordCount} 条
文件大小：${writer.length} 字节

您可以通过文件管理器在下载文件夹中找到该文件。`,
                showCancel: false,
                confirmText: "我知道了"
              });
            };
            writer.onerror = (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1887", "写入失败:", err);
              common_vendor.index.showToast({
                title: "文件写入失败",
                icon: "error"
              });
            };
            writer.onwriteend = () => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1895", "写入结束，最终文件大小:", writer.length);
            };
            const bom = "\uFEFF";
            const fullContent = bom + csvContent;
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1901", "完整内容长度(含BOM):", fullContent.length);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1904", "开始写入数据...");
            writer.write(fullContent);
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:1907", "创建写入器失败:", err);
            common_vendor.index.showToast({
              title: "创建写入器失败",
              icon: "error"
            });
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:1914", "创建文件失败:", err);
          common_vendor.index.showToast({
            title: "创建文件失败",
            icon: "error"
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1921", "获取下载目录失败:", err);
        common_vendor.index.showToast({
          title: "获取下载目录失败",
          icon: "error"
        });
      });
    },
    saveToDocuments(csvContent, recordCount, fileName) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1930", "=== 开始保存到文档目录 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1931", "文件名:", fileName);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1932", "记录数量:", recordCount);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1933", "CSV内容长度:", csvContent.length);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:1934", "CSV内容预览:", csvContent.substring(0, 200));
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:1937", "获取文档目录文件系统成功");
        fs.root.getFile(fileName, { create: true }, (fileEntry) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:1939", "创建文件成功:", fileEntry.fullPath);
          fileEntry.createWriter((writer) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1941", "创建写入器成功");
            writer.onwrite = (e) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1944", "文件写入完成事件:", e);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1945", "写入器位置:", writer.position);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1946", "写入器长度:", writer.length);
              common_vendor.index.showModal({
                title: "导出成功",
                content: `文件已保存到应用文档目录：
${fileName}

共${recordCount}条记录
文件大小：${writer.length}字节`,
                showCancel: false,
                confirmText: "知道了"
              });
            };
            writer.onerror = (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:1956", "写入失败:", err);
              common_vendor.index.showToast({
                title: "文件写入失败",
                icon: "error"
              });
            };
            writer.onwriteend = () => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:1964", "写入结束，最终文件大小:", writer.length);
            };
            const bom = "\uFEFF";
            const fullContent = bom + csvContent;
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1970", "完整内容长度(含BOM):", fullContent.length);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:1973", "开始写入数据...");
            writer.write(fullContent);
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:1976", "创建写入器失败:", err);
            common_vendor.index.showToast({
              title: "创建写入器失败",
              icon: "error"
            });
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:1983", "创建文件失败:", err);
          common_vendor.index.showToast({
            title: "创建文件失败",
            icon: "error"
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:1990", "获取文档目录失败:", err);
        common_vendor.index.showToast({
          title: "获取文档目录失败",
          icon: "error"
        });
      });
    },
    saveToCustomLocation(csvContent, recordCount, fileName) {
      common_vendor.index.showModal({
        title: "自定义保存路径",
        content: "请输入保存路径（不包含文件名）：",
        editable: true,
        placeholderText: "/storage/emulated/0/Documents",
        success: (res) => {
          if (res.confirm && res.content && res.content.trim()) {
            const customPath = res.content.trim();
            this.saveToCustomPath(csvContent, recordCount, fileName, customPath);
          }
        }
      });
    },
    saveToCustomPath(csvContent, recordCount, fileName, customPath) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2014", "=== 开始保存到自定义路径 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2015", "自定义路径:", customPath);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2016", "文件名:", fileName);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2017", "记录数量:", recordCount);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2018", "CSV内容长度:", csvContent.length);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2019", "CSV内容预览:", csvContent.substring(0, 200));
      plus.io.resolveLocalFileSystemURL(customPath, (dirEntry) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2022", "解析自定义路径成功:", dirEntry.fullPath);
        dirEntry.getFile(fileName, { create: true }, (fileEntry) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2024", "创建文件成功:", fileEntry.fullPath);
          fileEntry.createWriter((writer) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2026", "创建写入器成功");
            writer.onwrite = (e) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2029", "文件写入完成事件:", e);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2030", "写入器位置:", writer.position);
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2031", "写入器长度:", writer.length);
              common_vendor.index.showModal({
                title: "导出成功",
                content: `文件已保存到：
${customPath}/${fileName}

共${recordCount}条记录
文件大小：${writer.length}字节`,
                showCancel: false,
                confirmText: "知道了"
              });
            };
            writer.onerror = (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:2041", "写入失败:", err);
              common_vendor.index.showToast({
                title: "文件写入失败",
                icon: "error"
              });
            };
            writer.onwriteend = () => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2049", "写入结束，最终文件大小:", writer.length);
            };
            const bom = "\uFEFF";
            const fullContent = bom + csvContent;
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2055", "完整内容长度(含BOM):", fullContent.length);
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2058", "开始写入数据...");
            writer.write(fullContent);
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:2061", "创建写入器失败:", err);
            common_vendor.index.showToast({
              title: "创建写入器失败",
              icon: "error"
            });
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2068", "创建文件失败:", err);
          common_vendor.index.showToast({
            title: "保存失败，请检查路径权限",
            icon: "none"
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2075", "路径不存在:", err);
        common_vendor.index.showToast({
          title: "路径不存在或无权限",
          icon: "none"
        });
      });
    },
    saveFileWx(csvContent, recordCount, fileName) {
      const fs = common_vendor.wx$1.getFileSystemManager();
      const filePath = `${common_vendor.wx$1.env.USER_DATA_PATH}/${fileName}`;
      fs.writeFile({
        filePath,
        data: csvContent,
        encoding: "utf8",
        success: () => {
          common_vendor.index.showActionSheet({
            itemList: ["分享文件", "保存到相册", "显示路径"],
            success: (res) => {
              if (res.tapIndex === 0) {
                this.shareFileWx(filePath, fileName, recordCount);
              } else if (res.tapIndex === 1) {
                this.saveToPhotosWx(csvContent, fileName, recordCount);
              } else if (res.tapIndex === 2) {
                common_vendor.index.showModal({
                  title: "导出成功",
                  content: `文件已保存：
${filePath}

共${recordCount}条记录`,
                  showCancel: false,
                  confirmText: "知道了"
                });
              }
            }
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2112", "保存失败:", err);
          this.fallbackExport(csvContent, recordCount);
        }
      });
    },
    shareFileWx(filePath, fileName, recordCount) {
      common_vendor.wx$1.shareFileMessage({
        filePath,
        fileName,
        success: () => {
          common_vendor.index.showToast({
            title: "分享成功",
            icon: "success"
          });
        },
        fail: (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2129", "分享失败:", err);
          common_vendor.index.showModal({
            title: "导出成功",
            content: `文件已保存，但分享失败
路径：${filePath}

共${recordCount}条记录`,
            showCancel: false,
            confirmText: "知道了"
          });
        }
      });
    },
    saveToPhotosWx(csvContent, fileName, recordCount) {
      common_vendor.index.showModal({
        title: "提示",
        content: "小程序无法直接保存CSV文件到相册，建议使用分享功能或复制到剪贴板",
        showCancel: true,
        confirmText: "复制内容",
        success: (res) => {
          if (res.confirm) {
            this.fallbackExport(csvContent, recordCount);
          }
        }
      });
    },
    downloadDataFile(csvContent, recordCount) {
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `记账数据_${dateStr}.csv`;
      this.saveDataToFileMp(csvContent, recordCount, fileName);
    },
    downloadFileH5(csvContent, fileName, recordCount) {
      try {
        const blob = new Blob(["\uFEFF" + csvContent], {
          type: "text/csv;charset=utf-8"
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        common_vendor.index.showToast({
          title: `成功导出${recordCount}条记录`,
          icon: "success"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2211", "下载失败:", error);
        common_vendor.index.setClipboardData({
          data: csvContent,
          success: () => {
            common_vendor.index.showToast({
              title: "下载失败，已复制到剪贴板",
              icon: "success"
            });
          }
        });
      }
    },
    saveDataToFile(csvContent, recordCount, fileName) {
      try {
        const fs = common_vendor.index.getFileSystemManager();
        const tempPath = `${common_vendor.index.env.USER_DATA_PATH}/${fileName}`;
        fs.writeFileSync(tempPath, csvContent, "utf8");
        common_vendor.index.showActionSheet({
          itemList: ["分享文件", "显示文件位置"],
          success: (res) => {
            if (res.tapIndex === 0) {
              this.shareFile(tempPath, fileName, recordCount);
            } else if (res.tapIndex === 1) {
              common_vendor.index.showModal({
                title: "导出成功",
                content: `文件已保存至：
${tempPath}

共${recordCount}条记录`,
                showCancel: false,
                confirmText: "知道了"
              });
            }
          }
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2254", "文件写入失败:", error);
        common_vendor.index.setClipboardData({
          data: csvContent,
          success: () => {
            common_vendor.index.showToast({
              title: "文件保存失败，已复制到剪贴板",
              icon: "success"
            });
          }
        });
      }
    },
    saveDataToFileApp(csvContent, recordCount, fileName) {
      if (typeof plus !== "undefined") {
        plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
          fs.root.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.createWriter((writer) => {
              writer.onwrite = () => {
                common_vendor.index.showModal({
                  title: "导出成功",
                  content: `文件已保存到下载目录：
${fileName}

共${recordCount}条记录`,
                  showCancel: false,
                  confirmText: "知道了"
                });
              };
              writer.onerror = (err) => {
                common_vendor.index.__f__("error", "at pages/profile/profile.vue:2283", "写入失败:", err);
                this.fallbackExport(csvContent, recordCount);
              };
              writer.write(new Blob(["\uFEFF" + csvContent], { type: "text/csv" }));
            });
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:2289", "创建文件失败:", err);
            this.fallbackExport(csvContent, recordCount);
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2293", "获取文件系统失败:", err);
          this.fallbackExport(csvContent, recordCount);
        });
      } else {
        this.fallbackExport(csvContent, recordCount);
      }
    },
    saveDataToFileMp(csvContent, recordCount, fileName) {
      this.fallbackExport(csvContent, recordCount);
    },
    fallbackExport(csvContent, recordCount) {
      common_vendor.index.setClipboardData({
        data: csvContent,
        success: () => {
          common_vendor.index.showModal({
            title: "导出完成",
            content: `数据已复制到剪贴板（共 ${recordCount} 条记录）

由于平台限制，无法直接保存文件。您可以将数据粘贴到任意文本编辑器中保存为CSV文件。`,
            showCancel: false,
            confirmText: "我知道了"
          });
        },
        fail: () => {
          common_vendor.index.showToast({
            title: "导出失败，请重试",
            icon: "none"
          });
        }
      });
    },
    shareFile(filePath, fileName, recordCount) {
      if (typeof plus !== "undefined" && plus.share) {
        plus.share.sendWithSystem({
          type: "file",
          path: filePath,
          success: () => {
            common_vendor.index.showToast({
              title: "导出成功",
              icon: "success"
            });
          },
          fail: (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:2341", "分享失败:", err);
            common_vendor.index.showModal({
              title: "导出成功",
              content: `文件已保存至：
${filePath}

共${recordCount}条记录`,
              showCancel: false,
              confirmText: "知道了"
            });
          }
        });
      } else {
        common_vendor.index.showModal({
          title: "导出成功",
          content: `文件已保存至：
${filePath}

共${recordCount}条记录`,
          showCancel: false,
          confirmText: "知道了"
        });
      }
    },
    // 保存到外部公共存储（兼容Android 10+）
    saveToDCIM(csvContent, recordCount, fileName) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2364", "=== 开始保存到外部公共存储 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2365", "文件名:", fileName);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2366", "记录数量:", recordCount);
      this.checkStoragePermission().then(() => {
        try {
          const Environment = plus.android.importClass("android.os.Environment");
          const File = plus.android.importClass("java.io.File");
          const FileOutputStream = plus.android.importClass("java.io.FileOutputStream");
          const OutputStreamWriter = plus.android.importClass("java.io.OutputStreamWriter");
          const state = Environment.getExternalStorageState();
          if (state !== Environment.MEDIA_MOUNTED) {
            throw new Error("外部存储不可用");
          }
          let publicDownloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
          if (publicDownloadsDir === null || publicDownloadsDir === void 0) {
            const externalStorageDir = Environment.getExternalStorageDirectory();
            if (externalStorageDir !== null) {
              publicDownloadsDir = new File(externalStorageDir, "Download");
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2392", "使用备用下载目录路径:", publicDownloadsDir.getAbsolutePath());
            } else {
              throw new Error("无法获取任何外部存储目录，设备可能不支持");
            }
          } else {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2397", "公共下载目录:", publicDownloadsDir.getAbsolutePath());
          }
          if (!publicDownloadsDir.exists()) {
            const created = publicDownloadsDir.mkdirs();
            if (!created) {
              throw new Error("下载目录不存在且无法创建");
            }
          }
          if (!publicDownloadsDir.canWrite()) {
            throw new Error("下载目录不可写，请检查权限");
          }
          const accountDataDir = new File(publicDownloadsDir, "AccountData");
          if (!accountDataDir.exists()) {
            const created = accountDataDir.mkdirs();
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2417", "创建AccountData目录结果:", created);
            if (!created) {
              throw new Error("无法创建AccountData目录");
            }
          }
          const csvFile = new File(accountDataDir, fileName);
          const absolutePath = csvFile.getAbsolutePath();
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2426", "目标文件完整路径:", absolutePath);
          if (csvFile.exists()) {
            csvFile.delete();
          }
          const fos = new FileOutputStream(csvFile);
          const writer = new OutputStreamWriter(fos, "UTF-8");
          const bom = "\uFEFF";
          const fullContent = bom + csvContent;
          writer.write(fullContent);
          writer.flush();
          writer.close();
          fos.close();
          const fileSize = csvFile.length();
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2449", "文件写入完成，大小:", fileSize);
          common_vendor.index.showModal({
            title: "导出成功",
            content: `文件已保存到真正的公共下载目录：

${absolutePath}

共${recordCount}条记录
文件大小：${fileSize}字节

现在可以通过任何文件管理器在"下载"文件夹的"AccountData"子目录中找到该文件`,
            showCancel: false,
            confirmText: "知道了"
          });
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2458", "原生文件操作失败:", error);
          common_vendor.index.showModal({
            title: "保存失败",
            content: `无法保存到公共目录：${error.message}

将尝试其他方式保存`,
            showCancel: true,
            confirmText: "尝试其他方式",
            cancelText: "取消",
            success: (res) => {
              if (res.confirm) {
                this.fallbackToPublicDownloads(csvContent, recordCount, fileName);
              }
            }
          });
        }
      }).catch((err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2474", "存储权限检查失败:", err);
        common_vendor.index.showModal({
          title: "权限不足",
          content: "需要存储权限才能保存到公共目录。请在应用设置中授予存储权限。",
          showCancel: true,
          confirmText: "去设置",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              const Intent = plus.android.importClass("android.content.Intent");
              const Settings = plus.android.importClass("android.provider.Settings");
              const Uri = plus.android.importClass("android.net.Uri");
              const main = plus.android.runtimeMainActivity();
              const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
              const uri = Uri.fromParts("package", main.getPackageName(), null);
              intent.setData(uri);
              main.startActivity(intent);
            }
          }
        });
      });
    },
    // 检查存储权限
    checkStoragePermission() {
      return new Promise((resolve, reject) => {
        plus.android.importClass("android.content.Context");
        const PackageManager = plus.android.importClass("android.content.pm.PackageManager");
        const Manifest = plus.android.importClass("android.Manifest");
        const main = plus.android.runtimeMainActivity();
        const writePermission = main.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        const readPermission = main.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE);
        if (writePermission === PackageManager.PERMISSION_GRANTED && readPermission === PackageManager.PERMISSION_GRANTED) {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2513", "存储权限已授予");
          resolve();
        } else {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2516", "存储权限未授予，尝试请求权限");
          const ActivityCompat = plus.android.importClass("androidx.core.app.ActivityCompat");
          ActivityCompat.requestPermissions(main, [
            Manifest.permission.WRITE_EXTERNAL_STORAGE,
            Manifest.permission.READ_EXTERNAL_STORAGE
          ], 1001);
          setTimeout(() => {
            const newWritePermission = main.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            const newReadPermission = main.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE);
            if (newWritePermission === PackageManager.PERMISSION_GRANTED && newReadPermission === PackageManager.PERMISSION_GRANTED) {
              resolve();
            } else {
              reject(new Error("用户未授予存储权限"));
            }
          }, 2e3);
        }
      });
    },
    // 创建公共目录
    createPublicDirectory(targetPath, fileName, csvContent, recordCount) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2542", "开始创建公共目录:", targetPath);
      try {
        const Environment = plus.android.importClass("android.os.Environment");
        const File = plus.android.importClass("java.io.File");
        const FileOutputStream = plus.android.importClass("java.io.FileOutputStream");
        const OutputStreamWriter = plus.android.importClass("java.io.OutputStreamWriter");
        let publicDownloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (publicDownloadsDir === null || publicDownloadsDir === void 0) {
          const externalStorageDir = Environment.getExternalStorageDirectory();
          if (externalStorageDir !== null) {
            publicDownloadsDir = new File(externalStorageDir, "Download");
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2560", "使用备用下载目录路径:", publicDownloadsDir.getAbsolutePath());
          } else {
            throw new Error("无法获取任何外部存储目录");
          }
        } else {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2565", "公共下载目录:", publicDownloadsDir.getAbsolutePath());
        }
        const accountDataDir = new File(publicDownloadsDir, "AccountData");
        if (!accountDataDir.exists()) {
          const created = accountDataDir.mkdirs();
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2572", "创建AccountData目录:", created);
        }
        const csvFile = new File(accountDataDir, fileName);
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2577", "目标文件路径:", csvFile.getAbsolutePath());
        const fos = new FileOutputStream(csvFile);
        const writer = new OutputStreamWriter(fos, "UTF-8");
        const bom = "\uFEFF";
        const fullContent = bom + csvContent;
        writer.write(fullContent);
        writer.flush();
        writer.close();
        fos.close();
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2592", "文件写入完成");
        common_vendor.index.showModal({
          title: "导出成功",
          content: `文件已保存到真正的公共下载目录：
${csvFile.getAbsolutePath()}

共${recordCount}条记录

可通过任何文件管理器在"下载"文件夹的"AccountData"子目录中找到该文件`,
          showCancel: false,
          confirmText: "知道了"
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2601", "原生文件操作失败:", error);
        this.fallbackToPublicDownloads(csvContent, recordCount, fileName);
      }
    },
    // 降级到 plus.io.PUBLIC_DOWNLOADS
    fallbackToPublicDownloads(csvContent, recordCount, fileName) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2609", "降级使用 plus.io.PUBLIC_DOWNLOADS");
      plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2613", "获取公共下载目录文件系统成功");
        fs.root.getDirectory("AccountData", { create: true }, (accountDataEntry) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2617", "创建AccountData目录成功:", accountDataEntry.fullPath);
          accountDataEntry.getFile(fileName, { create: true }, (fileEntry) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2620", "创建文件成功:", fileEntry.fullPath);
            fileEntry.createWriter((writer) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2622", "创建写入器成功");
              writer.onwrite = (e) => {
                common_vendor.index.__f__("log", "at pages/profile/profile.vue:2625", "文件写入完成");
                common_vendor.index.showModal({
                  title: "导出成功",
                  content: `文件已保存到：
${fileEntry.fullPath}

共${recordCount}条记录
文件大小：${writer.length}字节

请通过文件管理器查看，路径可能在：
• /storage/emulated/0/Download/AccountData/
• 或应用私有目录中`,
                  showCancel: false,
                  confirmText: "知道了"
                });
              };
              writer.onerror = (err) => {
                common_vendor.index.__f__("error", "at pages/profile/profile.vue:2635", "写入失败:", err);
                common_vendor.index.showToast({
                  title: "文件写入失败",
                  icon: "error"
                });
              };
              const bom = "\uFEFF";
              const fullContent = bom + csvContent;
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2645", "开始写入数据...");
              writer.write(fullContent);
            }, (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:2648", "创建写入器失败:", err);
              common_vendor.index.showToast({
                title: "创建写入器失败",
                icon: "error"
              });
            });
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:2655", "创建文件失败:", err);
            common_vendor.index.showToast({
              title: "创建文件失败",
              icon: "error"
            });
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2662", "创建AccountData目录失败:", err);
          common_vendor.index.showToast({
            title: "创建目录失败",
            icon: "error"
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2669", "获取公共存储失败:", err);
        common_vendor.index.showToast({
          title: "获取公共存储失败",
          icon: "error"
        });
      });
    },
    // 写入文件到指定的目录条目
    writeFileToEntry(dirEntry, fileName, csvContent, recordCount, targetPath) {
      dirEntry.getFile(fileName, { create: true }, (fileEntry) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2680", "创建文件成功:", fileEntry.fullPath);
        fileEntry.createWriter((writer) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2682", "创建写入器成功");
          writer.onwrite = (e) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2685", "文件写入完成");
            common_vendor.index.showModal({
              title: "导出成功",
              content: `文件已保存到真实公共目录：
${targetPath}${fileName}

共${recordCount}条记录
文件大小：${writer.length}字节

可通过文件管理器的"下载"目录 > "AccountData"文件夹查看`,
              showCancel: false,
              confirmText: "知道了"
            });
          };
          writer.onerror = (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:2695", "写入失败:", err);
            common_vendor.index.showToast({
              title: "文件写入失败",
              icon: "error"
            });
          };
          const bom = "\uFEFF";
          const fullContent = bom + csvContent;
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2705", "开始写入数据...");
          writer.write(fullContent);
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2708", "创建写入器失败:", err);
          common_vendor.index.showToast({
            title: "创建写入器失败",
            icon: "error"
          });
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2715", "创建文件失败:", err);
        common_vendor.index.showToast({
          title: "创建文件失败",
          icon: "error"
        });
      });
    },
    // 保存到应用外部存储目录（兼容Android 10+）
    saveToPublicDocuments(csvContent, recordCount, fileName) {
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2725", "=== 开始保存到应用外部存储 ===");
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2726", "文件名:", fileName);
      common_vendor.index.__f__("log", "at pages/profile/profile.vue:2727", "记录数量:", recordCount);
      plus.io.requestFileSystem(plus.io.PRIVATE_WWW, (fs) => {
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2731", "获取应用存储成功，尝试访问外部目录");
        const externalPath = plus.io.convertLocalFileSystemURL("_documents/");
        common_vendor.index.__f__("log", "at pages/profile/profile.vue:2735", "外部路径:", externalPath);
        plus.io.resolveLocalFileSystemURL(externalPath, (entry) => {
          common_vendor.index.__f__("log", "at pages/profile/profile.vue:2738", "解析外部路径成功:", entry.fullPath);
          entry.getFile(fileName, { create: true }, (fileEntry) => {
            common_vendor.index.__f__("log", "at pages/profile/profile.vue:2741", "创建文件成功:", fileEntry.fullPath);
            fileEntry.createWriter((writer) => {
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2743", "创建写入器成功");
              writer.onwrite = (e) => {
                common_vendor.index.__f__("log", "at pages/profile/profile.vue:2746", "文件写入完成");
                common_vendor.index.showModal({
                  title: "导出成功",
                  content: `文件已保存到应用文档目录：
${fileName}

共${recordCount}条记录
文件大小：${writer.length}字节

可通过文件管理器的应用文档目录访问`,
                  showCancel: false,
                  confirmText: "知道了"
                });
              };
              writer.onerror = (err) => {
                common_vendor.index.__f__("error", "at pages/profile/profile.vue:2756", "写入失败:", err);
                common_vendor.index.showToast({
                  title: "文件写入失败",
                  icon: "error"
                });
              };
              const bom = "\uFEFF";
              const fullContent = bom + csvContent;
              common_vendor.index.__f__("log", "at pages/profile/profile.vue:2766", "开始写入数据...");
              writer.write(fullContent);
            }, (err) => {
              common_vendor.index.__f__("error", "at pages/profile/profile.vue:2769", "创建写入器失败:", err);
              this.saveToDocuments(csvContent, recordCount, fileName);
            });
          }, (err) => {
            common_vendor.index.__f__("error", "at pages/profile/profile.vue:2774", "创建文件失败:", err);
            this.saveToDocuments(csvContent, recordCount, fileName);
          });
        }, (err) => {
          common_vendor.index.__f__("error", "at pages/profile/profile.vue:2779", "解析外部路径失败:", err);
          this.saveToDocuments(csvContent, recordCount, fileName);
        });
      }, (err) => {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:2784", "获取应用存储失败:", err);
        this.saveToDocuments(csvContent, recordCount, fileName);
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: common_vendor.o((...args) => $options.goToAIConfig && $options.goToAIConfig(...args)),
    c: common_vendor.o((...args) => $options.goToVoiceConfig && $options.goToVoiceConfig(...args)),
    d: common_vendor.o((...args) => $options.goToBudgetManage && $options.goToBudgetManage(...args)),
    e: common_vendor.o((...args) => $options.goToIconManage && $options.goToIconManage(...args)),
    f: common_vendor.o((...args) => $options.refreshCategories && $options.refreshCategories(...args)),
    g: common_vendor.o((...args) => $options.importData && $options.importData(...args)),
    h: common_vendor.o((...args) => $options.exportData && $options.exportData(...args)),
    i: common_vendor.o((...args) => $options.clearAllData && $options.clearAllData(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
