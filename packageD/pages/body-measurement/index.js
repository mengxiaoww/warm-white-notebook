// 移除Toast import，使用wx.showToast替代

// 引入工具函数
const { getTodayLocalDate } = require("../../../utils/util.js");


Page({
  data: {
    // 选中的日期
    selectedDate: '',

    // 日期选择器状态
    datePickerVisible: false,

    // 基础表单数据
    formData: {
      height: '',
      weight: ''
    },

    // 正常范围参考值
    normalRanges: {
      height: { min: '50', max: '250' },
      weight: { min: '10', max: '300' }
    },

    // 自定义指标列表
    customIndicators: [],

    // 用户选中的指标配置
    bodyMeasurementIndicatorConfig: {
      height: true,
      weight: true
    },

    // 显示的基础指标
    displayedBasicIndicators: [
      { id: 'height', name: '身高', unit: 'cm' },
      { id: 'weight', name: '体重', unit: 'kg' },
    ],

    // 用户信息
    openid: '',
    currentProfileId: '',

    // 当前记录ID（编辑模式）
    recordId: '',
    isLoggedIn: false,

    // 当前聚焦的输入框索引（用于键盘切换）
    focusIndex: -1
  },

  // 页面初始化
  onLoad(options) {
    console.log('🎯 身高体重页面 onLoad，传入参数:', options);

    // 设置基础数据
    const today = getTodayLocalDate();
    const selectedDate = options.date || today; // 如果有传入日期就使用传入的，否则使用今天

    console.log('🗓️ 设置日期:', selectedDate, '(今天:', today, ')');

    this.setData({
      selectedDate: selectedDate,
      recordId: options.recordId || ''
    });

    console.log('✅ 页面初始化完成，当前数据:', this.data);
  },

  // 页面渲染完成后再加载用户配置
  onReady() {

    // 异步加载用户配置，不阻塞页面显示
    setTimeout(() => {
      this.checkLoginAndLoadData();
    }, 100);
  },

  // 页面显示/切入前台时触发
  onShow() {

    // 检查是否需要刷新数据
    const app = getApp();
    if (app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.checkLoginAndLoadData();
    }

    // 检查是否有临时配置预览（从配置页面返回）
    if (app.globalData.temporaryBodyMeasurementConfig) {
      this.loadTemporaryConfiguration();

      // 🔧 关键修复：恢复用户之前的输入
      this.restoreTemporaryUserInput();
    } else if (app.globalData.needRefreshBodyMeasurementConfig || app.globalData.indicatorConfigChanged) {
      app.globalData.needRefreshBodyMeasurementConfig = false;
      app.globalData.indicatorConfigChanged = false;

      wx.showLoading({
        title: '刷新配置中...',
        mask: true
      });

      this.loadCompleteConfiguration().then(() => {
        wx.hideLoading();
      }).catch(err => {
        console.error('配置刷新失败:', err);
        wx.hideLoading();
      });
    }
  },

  // 页面卸载
  onUnload() {
    // 清理临时配置（如果未保存）
    this.cleanupTemporaryConfigIfNotSaved();
  },

  // 页面隐藏
  onHide() {
    // 不清理临时配置，因为选相册/相机会触发onHide，回来后需要恢复配置
  },

  // 加载临时配置预览
  loadTemporaryConfiguration() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBodyMeasurementConfig;

    if (!tempConfig || !tempConfig.isTemporary) {
      return;
    }


    // 根据临时配置构建显示的指标列表
    const { selectedIndicators, customIndicators, indicatorConfigs } = tempConfig;

    // 构建基础指标列表
    const basicIndicators = [
      { id: 'height', name: '身高', unit: 'cm' },
      { id: 'weight', name: '体重', unit: 'kg' },
      { id: 'bmi', name: 'BMI', unit: '' }
    ];

    // 过滤出被选中的基础指标
    console.log('🔍 selectedIndicators配置:', selectedIndicators);
    console.log('🔍 basicIndicators列表:', basicIndicators.map(i => i.id));

    const displayedBasicIndicators = basicIndicators.filter(indicator => {
      const isSelected = selectedIndicators[indicator.id];
      console.log(`🔍 检查指标 ${indicator.id}(${indicator.name}): 选中=${isSelected}`);

      if (isSelected && indicatorConfigs[indicator.id]) {
        // 使用自定义配置覆盖默认值
        const customConfig = indicatorConfigs[indicator.id];
        indicator.name = customConfig.name || indicator.name;
        indicator.unit = customConfig.unit || indicator.unit;
      }
      return isSelected;
    });

    console.log('🔍 最终显示的基础指标:', displayedBasicIndicators.map(i => `${i.id}(${i.name})`));

    // 过滤出被选中的自定义指标
    const displayedCustomIndicators = customIndicators.filter(indicator => {
      return selectedIndicators[indicator.id];
    }).map(indicator => ({
      id: indicator.id,
      name: indicator.fullName,
      min: indicator.min,
      max: indicator.max,
      unit: indicator.unit
    }));

    // 更新页面数据
    this.setData({
      displayedBasicIndicators,
      customIndicators: displayedCustomIndicators,
      isTemporaryConfig: true // 标记当前使用临时配置
    });

    // 显示预览提示
    wx.showToast({
      title: '加载配置预览，保存后生效',
      icon: 'none',
      duration: 2500
    });

  },

  // 🔧 关键修复：恢复用户之前的输入（从配置页面返回后）
  restoreTemporaryUserInput() {
    const app = getApp();
    const tempInput = app.globalData.temporaryBodyMeasurementInput;

    if (!tempInput || !tempInput.formData) {
      return;
    }

    // 检查时间戳，超过10分钟就忽略
    const now = Date.now();
    const savedTime = tempInput.savedAt || 0;
    const isValid = (now - savedTime) < 10 * 60 * 1000; // 10分钟

    if (!isValid) {
      delete app.globalData.temporaryBodyMeasurementInput;
      return;
    }

    // 检查日期是否匹配
    if (tempInput.selectedDate === this.data.selectedDate) {
      console.log('🔄 恢复身高体重用户临时输入:', tempInput.formData);

      // 恢复表单数据，但不覆盖现有数据（如果有的话）
      const currentFormData = this.data.formData || {};
      const restoredFormData = { ...currentFormData };

      Object.keys(tempInput.formData).forEach(key => {
        // 只有当前字段为空时才恢复
        if (!restoredFormData[key] || restoredFormData[key].toString().trim() === '') {
          restoredFormData[key] = tempInput.formData[key];
        }
      });

      this.setData({
        formData: restoredFormData
      });

      console.log('✅ 身高体重用户输入已恢复');
    } else {
      console.log('📅 身高体重临时输入日期不匹配，忽略恢复');
    }

    // 清理临时输入（无论是否恢复都要清理）
    delete app.globalData.temporaryBodyMeasurementInput;
  },

  // 清理临时配置（如果未保存）
  cleanupTemporaryConfigIfNotSaved() {
    const app = getApp();
    if (app.globalData && app.globalData.temporaryBodyMeasurementConfig && this.data.isTemporaryConfig) {
      console.log('🧹 清理未保存的临时配置');
      delete app.globalData.temporaryBodyMeasurementConfig;

      // 重新加载原有配置
      this.loadCompleteConfiguration();
    }
  },

  // 显示更多菜单
  showMoreMenu() {
    wx.showActionSheet({
      itemList: ['查看历史记录', '导出数据'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.viewHistory();
        } else if (res.tapIndex === 1) {
          this.exportData();
        }
      }
    });
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({
      datePickerVisible: true
    });
  },

  // 日期选择确认
  onDateConfirm(e) {
    let selectedDate = e.detail.value;

    // 确保日期格式为 YYYY-MM-DD
    if (selectedDate.includes(' ') || selectedDate.includes('T')) {
      selectedDate = selectedDate.split(' ')[0].split('T')[0];
    }

    console.log(`🔄 用户切换日期到: ${selectedDate}`);

    wx.showLoading({
      title: '切换日期中...',
      mask: true
    });

    // 立即设置默认配置
    this.setData({
      selectedDate,
      datePickerVisible: false,
      recordId: '',
      formData: {
        height: '',
        weight: ''
      },
      displayedBasicIndicators: [
        { id: 'height', name: '身高', unit: 'cm' },
        { id: 'weight', name: '体重', unit: 'kg' },
      ],
      customIndicators: []
    });

    // 加载真正的配置
    this.loadCompleteConfiguration().then(() => {
      wx.hideLoading();
    }).catch(err => {
      console.error('切换日期时配置加载失败:', err);
      wx.hideLoading();
    });
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({
      datePickerVisible: false
    });
  },

  // 输入框值改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;

    // 实时验证输入长度和格式
    if (value) {
      // 只允许数字和一个小数点
      value = value.replace(/[^0-9.]/g, '');

      // 确保只有一个小数点
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }

      // 检查长度限制
      if (parts.length > 1) {
        // 有小数点的情况
        const integerPart = parts[0];
        const decimalPart = parts[1];

        // 整数部分限制6位
        if (integerPart.length > 6) {
          value = integerPart.substring(0, 6) + '.' + decimalPart;
        }

        // 小数部分限制3位
        if (decimalPart.length > 3) {
          value = (integerPart.length > 6 ? integerPart.substring(0, 6) : integerPart) + '.' + decimalPart.substring(0, 3);
        }
      } else {
        // 没有小数点的情况，整数部分限制6位
        if (value.length > 6) {
          value = value.substring(0, 6);
        }
      }
    }

    // 强制刷新显示
    this.setData({
      [`formData.${field}`]: value
    }, () => {
      // 验证是否设置成功
      if (this.data.formData[field] !== value) {
        // 如果设置失败，强制重新设置
        const newFormData = { ...this.data.formData };
        newFormData[field] = value;
        this.setData({ formData: newFormData });
      }
    });
  },

  // 输入框获得焦点
  onInputFocus(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      focusIndex: index
    });
  },

  // 输入框失去焦点
  onInputBlur(e) {
    // 立即清除焦点索引，避免placeholder浮动bug
    // catchtap已经能防止按钮点击时的冲突
    const index = parseInt(e.currentTarget.dataset.index);
    if (this.data.focusIndex === index) {
      this.setData({
        focusIndex: -1
      });
    }
  },

  // 点击"下一项"按钮跳转到下一个输入框
  goToNextInput(e) {
    const currentIndex = parseInt(e.currentTarget.dataset.index);
    const nextIndex = currentIndex + 1;

    // 跳转到下一个输入框
    this.setData({
      focusIndex: nextIndex
    });
  },

  // 点击"完成"按钮收起键盘
  completeInput() {
    // 收起键盘
    this.setData({
      focusIndex: -1
    });
    // 触发自动保存
    // 输入完成提示已移除
  },

  // 配置指标
  configIndicators() {
    // 检查用户登录状态
    const { openid, currentProfileId, selectedDate, formData } = this.data;
    if (!openid || !currentProfileId) {
      wx.showToast({
      title: '请先去【我的】登录并选择档案',
      icon: 'none'
    });
      return;
    }

    // 分析当前日期的数据状态
    const hasDataIndicators = [];
    Object.keys(formData).forEach(indicatorId => {
      const value = formData[indicatorId];
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        hasDataIndicators.push(indicatorId);
      }
    });

    // 🔧 修复：只保存有意义的用户输入，避免保存残留数据
    const cleanFormData = {};
    const { displayedBasicIndicators, customIndicators } = this.data;
    const allCurrentIndicatorIds = []
      .concat(displayedBasicIndicators.map(item => item.id))
      .concat(customIndicators.map(item => item.id));

    // 只保存当前配置中显示的指标的非空值（允许0值）
    allCurrentIndicatorIds.forEach(indicatorId => {
      const value = formData[indicatorId];
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        cleanFormData[indicatorId] = value.toString().trim();
      }
    });

    console.log('💾 准备保存的干净用户输入:', cleanFormData);
    console.log('💾 当前显示的指标:', allCurrentIndicatorIds);

    const app = getApp();
    if (app.globalData) {
      // 只有当用户真的有输入时才保存临时数据
      if (Object.keys(cleanFormData).length > 0) {
        app.globalData.temporaryBodyMeasurementInput = {
          formData: cleanFormData,
          selectedDate: this.data.selectedDate,
          recordId: this.data.recordId,
          savedAt: Date.now()
        };
        console.log('✅ 已保存有效的用户输入到临时变量');
      } else {
        // 如果没有用户输入，清除可能存在的临时数据
        delete app.globalData.temporaryBodyMeasurementInput;
        console.log('🧹 没有用户输入，清除临时变量');
      }

      // 保存当前日期的数据状态信息和日期
      app.globalData.currentDateContext = {
        selectedDate: selectedDate,
        hasDataIndicators: hasDataIndicators,
        totalDisplayedCount: Object.keys(formData).length
      };
    }

    // 🔧 重要：传递当前日期给配置页面
    wx.navigateTo({
      url: `/packageD/pages/body-measurement-config/index?date=${selectedDate}`,
      fail: (err) => {
        console.error('跳转到配置页面失败:', err);
        wx.showToast({
      title: '打开配置页面失败',
      icon: 'none'
    });
      }
    });
  },

  // 查看历史记录
  viewHistory() {
    wx.navigateTo({
      url: '/pages/body-measurement-history/index'
    });
  },

  // 导出数据
  exportData() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 保存数据
  async saveData() {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    const { openid, currentProfileId, selectedDate, formData, recordId } = this.data;

    if (!openid || !currentProfileId) {
      wx.hideLoading();
      wx.showToast({
      title: '请先去【我的】登录并选择档案',
      icon: 'none'
    });
      return;
    }

    // 获取所有已配置的指标ID（包括预设和自定义）
    const { displayedBasicIndicators, customIndicators } = this.data;
    const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
    const allCustomIndicatorIds = customIndicators.map(item => item.id);
    const allIndicatorIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

    // 数据校验 - 所有显示的指标都必须填写
    const validationErrors = [];

    // 检查每个显示的指标是否都已填写
    for (const indicatorId of allIndicatorIds) {
      const value = formData[indicatorId];
      const indicator = [].concat(displayedBasicIndicators).concat(customIndicators).find(item => item.id === indicatorId);
      const indicatorName = indicator ? indicator.name : indicatorId;

      // 检查是否为空（允许0值）
      if (value === undefined || value === null || value.toString().trim() === '') {
        validationErrors.push(`${indicatorName}: 必须填写数值`);
        continue;
      }

      // 更严格的数字校验：只接受纯数字
      const trimmedValue = value.toString().trim();

      // 检查是否包含非数字字符（除了小数点）
      if (!/^\d+(\.\d+)?$/.test(trimmedValue)) {
        validationErrors.push(`${indicatorName}: 只能输入数字`);
        continue;
      }

      // 检查数字长度（包括小数点前后的位数）
      const parts = trimmedValue.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';

      // 整数部分不能超过6位
      if (integerPart.length > 6) {
        validationErrors.push(`${indicatorName}: 整数部分不能超过6位数`);
        continue;
      }

      // 小数部分不能超过3位
      if (decimalPart.length > 3) {
        validationErrors.push(`${indicatorName}: 小数部分不能超过3位`);
        continue;
      }

      // 转换为数字后校验
      const numValue = parseFloat(trimmedValue);
      if (isNaN(numValue)) {
        validationErrors.push(`${indicatorName}: 请输入有效的数字`);
      } else if (numValue < 0) {
        validationErrors.push(`${indicatorName}: 数值不能为负数`);
      } else if (numValue > 999999) {
        validationErrors.push(`${indicatorName}: 数值不能超过999999`);
      }
    }

    // 检查校验错误
    if (validationErrors.length > 0) {
      wx.hideLoading();

      // 显示第一个错误信息，让用户明确知道哪个字段有问题
      const firstError = validationErrors[0];
      wx.showToast({
      title: firstError,
      icon: 'none'
    });

      // 如果有多个错误，在控制台输出所有错误信息
      if (validationErrors.length > 1) {
        console.log('所有验证错误:', validationErrors);
      }

      return;
    }

    try {
      const db = wx.cloud.database();

      // 🔧 重新设计：总是根据日期查询记录，不依赖recordId，确保操作正确的记录
      const existingRes = await db.collection('bodyMeasurements')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      let isNewRecord = existingRes.data.length === 0;
      let targetRecordId = isNewRecord ? null : existingRes.data[0]._id;

      if (isNewRecord) {
        // 🔧 新增数据：使用同样保守的策略
        const saveData = {
          openid,
          profileId: currentProfileId,
          date: selectedDate,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          type: 'body-measurement'
        };

        // 🔥 安全策略：只保存当前显示且有值的指标（允许0值）
        const currentDisplayedData = {};
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value !== undefined && value !== null && value.toString().trim() !== '') {
            currentDisplayedData[indicatorId] = parseFloat(value);
          }
        });

        // 分别处理直接字段和customValues字段

        // 1. 处理直接字段
        allBasicIndicatorIds.forEach(indicatorId => {
          if (currentDisplayedData[indicatorId] !== undefined) {
            saveData[indicatorId] = currentDisplayedData[indicatorId];
          }
        });

        // 2. 处理自定义指标：同时保存到直接字段和customValues字段
        if (allCustomIndicatorIds.length > 0) {
          const customValues = {};
          allCustomIndicatorIds.forEach(indicatorId => {
            if (currentDisplayedData[indicatorId] !== undefined) {
              const value = currentDisplayedData[indicatorId];
              // 同时保存到直接字段和customValues字段
              saveData[indicatorId] = value;
              customValues[indicatorId] = value;
            }
          });

          if (Object.keys(customValues).length > 0) {
            saveData.customValues = customValues;
          }
        }

        // 🔥 安全日志：记录新增操作
        console.log('安全新增操作：', {
          targetDate: selectedDate,
          savedFields: Object.keys(saveData).filter(key => !['openid', 'profileId', 'date', 'createTime', 'updateTime', 'type'].includes(key)),
          currentDisplayed: Object.keys(currentDisplayedData)
        });

        const res = await db.collection('bodyMeasurements').add({
          data: saveData
        });

        // 更新recordId
        this.setData({ recordId: res._id });

        wx.hideLoading();
        wx.showToast({
      title: '保存成功',
      icon: 'none'
    });

      } else {
        // 🔥 重新设计：绝对安全的更新策略
        const existingData = existingRes.data[0];

        // 🔧 安全验证：确保我们更新的是正确的记录
        if (existingData.date !== selectedDate) {
          console.error('严重错误：查询到的记录日期不匹配！', {
            expectedDate: selectedDate,
            actualDate: existingData.date,
            recordId: existingData._id
          });
          wx.showToast({
      title: '数据错误，请重试',
      icon: 'none'
    });
          return;
        }

        // 🔧 构建极其保守的更新数据：只包含当前显示且有值的指标
        const updateData = {
          updateTime: db.serverDate()
        };

        // 🔥 新策略：使用增量更新，避免覆盖任何现有数据（允许0值）
        const currentDisplayedData = {};
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value !== undefined && value !== null && value.toString().trim() !== '') {
            currentDisplayedData[indicatorId] = parseFloat(value);
          }
        });



        // 🔧 分别处理直接字段和customValues字段

        // 1. 处理直接字段：只更新当前显示且有值的指标
        allBasicIndicatorIds.forEach(indicatorId => {
          if (currentDisplayedData[indicatorId] !== undefined) {
            updateData[indicatorId] = currentDisplayedData[indicatorId];
          }
        });

        // 2. 处理自定义指标：同时更新直接字段和customValues字段
        if (allCustomIndicatorIds.length > 0) {
          const customValues = {};

          // 更新自定义指标的值
          allCustomIndicatorIds.forEach(indicatorId => {
            if (currentDisplayedData[indicatorId] !== undefined) {
              const value = currentDisplayedData[indicatorId];
              // 同时更新直接字段和customValues字段，确保一致性
              updateData[indicatorId] = value;
              customValues[indicatorId] = value;
            }
          });

          // 保留其他现有的自定义值（不在当前显示中的）
          if (existingData.customValues) {
            Object.keys(existingData.customValues).forEach(key => {
              if (!allCustomIndicatorIds.includes(key)) {
                customValues[key] = existingData.customValues[key];
                // 也保留到直接字段
                if (existingData[key] !== undefined) {
                  updateData[key] = existingData[key];
                }
              }
            });
          }

          updateData.customValues = customValues;
        }

        // 🔥 安全日志：记录更新操作
        console.log('安全更新操作：', {
          targetDate: selectedDate,
          targetRecordId: targetRecordId,
          updateFields: Object.keys(updateData).filter(key => key !== 'updateTime'),
          currentDisplayed: Object.keys(currentDisplayedData)
        });

        await db.collection('bodyMeasurements')
          .doc(targetRecordId)
          .update({
            data: updateData
          });

        // 更新recordId（确保一致性）
        this.setData({ recordId: targetRecordId });

        wx.hideLoading();
        wx.showToast({
      title: '更新成功',
      icon: 'none'
    });
      }

      // 🔧 关键逻辑：如果存在临时配置，现在保存它
      await this.saveTemporaryConfigIfExists();

      // 通知首页刷新日历数据（通过全局变量）
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
      }

      // 保存成功后返回首页
      setTimeout(() => {
        wx.navigateBack({
          fail: (err) => {
            console.error('返回失败:', err);
          }
        });
      }, 1000); // 给用户1秒时间看到成功提示

    } catch (err) {
      console.error('保存数据失败:', err);
      wx.hideLoading();
      wx.showToast({
      title: '保存失败，请重试',
      icon: 'none'
    });
    }
  },

  // 查找继承的配置（向前查找最近的配置）
  async findInheritedConfig(targetDate, openid, currentProfileId) {
    try {
      const db = wx.cloud.database();

      console.log(`🔍 开始查找 ${targetDate} 的继承配置...`);

      // 查找所有小于等于目标日期的配置，按日期降序排列
      const configRes = await db.collection('bodyMeasurementIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.lte(targetDate)
        })
        .orderBy('date', 'desc')
        .limit(10) // 限制查询10条，防止数据过多
        .get();

      console.log(`📊 查找到 ${configRes.data.length} 条历史配置`);

      if (configRes.data.length === 0) {
        console.log('🚫 未找到任何历史配置');
        return null;
      }

      // 逐个检查配置，找到第一个有效的配置
      for (let i = 0; i < configRes.data.length; i++) {
        const config = configRes.data[i];
        const configDate = config.date;
        const selectedIndicators = config.selectedIndicators;

        if (!selectedIndicators) {
          console.log(`⚠️ ${configDate} 的配置数据为空，跳过`);
          continue;
        }

        // 检查是否有自定义指标被选中
        const hasCustomIndicators = Object.keys(selectedIndicators).some(key => {
          return key.startsWith('custom_') && selectedIndicators[key] === true;
        });

        const totalSelected = Object.keys(selectedIndicators).filter(key => selectedIndicators[key] === true).length;

        console.log(`📝 ${configDate} 的配置: 总选中=${totalSelected}, 有自定义=${hasCustomIndicators}`);

        // 如果配置有意义（不只是默认的2项），就使用它
        if (hasCustomIndicators || totalSelected > 2) {
          console.log(`✅ 使用 ${configDate} 的配置作为继承配置`);
          return selectedIndicators;
        }
      }

      // 如果所有配置都是默认的，使用最近的一个
      if (configRes.data.length > 0) {
        const latestConfig = configRes.data[0];
        console.log(`🔄 所有配置都是默认的，使用最近的配置: ${latestConfig.date}`);
        return latestConfig.selectedIndicators;
      }

      console.log('🚫 未找到可用的继承配置');
      return null;

    } catch (err) {
      console.error('查找继承配置失败:', err);
      return null;
    }
  },

  // 保存临时配置（如果存在）
  async saveTemporaryConfigIfExists() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBodyMeasurementConfig;

    if (!tempConfig || !tempConfig.isTemporary) {
      console.log('✅ 无临时配置需要保存');
      return;
    }

    console.log('💾 保存临时配置到数据库...');

    const { openid, currentProfileId, selectedDate } = this.data;
    const { selectedIndicators, customIndicators, dateType: configDateType } = tempConfig;

    // 使用临时配置中的日期类型，或者重新判断
    const today = getTodayLocalDate();
    const dateType = configDateType || this.determineDateType(selectedDate, today);

    try {
      const db = wx.cloud.database();

      // 1. 保存自定义指标设置（如果有新增的）
      const newCustomIndicators = customIndicators.filter(indicator =>
        indicator.id.startsWith('custom_')
      );

      for (const indicator of newCustomIndicators) {
        // 检查是否已存在
        const existingRes = await db.collection('bodyMeasurementIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId,
            indicatorId: indicator.id
          })
          .get();

        if (existingRes.data.length === 0) {
          // 新增自定义指标 - 使用统一的Settings集合
          await db.collection('bodyMeasurementIndicatorSettings').add({
            data: {
              openid: openid,
              profileId: currentProfileId,
              indicatorId: indicator.id,
              name: indicator.fullName,
              unit: indicator.unit,
              minValue: indicator.min,
              maxValue: indicator.max,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });
          console.log(`➕ 已新增自定义指标: ${indicator.fullName}`);
        }
      }

      // 2. 保存选中状态配置
      const configData = {
        selectedIndicators: selectedIndicators,
        updateTime: db.serverDate(),
        configType: dateType || 'today',
        effectiveScope: (dateType === 'today') ? 'future' : 'single'
      };

      // 查询现有配置
      const existingConfigRes = await db.collection('bodyMeasurementIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (existingConfigRes.data.length > 0) {
        // 更新现有配置
        await db.collection('bodyMeasurementIndicatorConfig')
          .doc(existingConfigRes.data[0]._id)
          .update({
            data: configData
          });
        console.log(`📝 已更新 ${selectedDate} 的配置`);
      } else {
        // 创建新配置
        await db.collection('bodyMeasurementIndicatorConfig').add({
          data: {
            openid: openid,
            profileId: currentProfileId,
            date: selectedDate,
            ...configData
          }
        });
        console.log(`➕ 已创建 ${selectedDate} 的配置`);
      }

      // 3. 如果是今日配置，应用到未来日期
      if (dateType === 'today') {
        console.log('📎 今日配置，开始应用到未来日期...');
        await this.applyTodayConfigToFuture(selectedDate, selectedIndicators, openid, currentProfileId, db);
      }

      // 4. 清理临时配置数据
      delete app.globalData.temporaryBodyMeasurementConfig;
      this.setData({ isTemporaryConfig: false });

      console.log('✅ 临时配置已成功保存并清理');

      // 5. 设置刷新标志，让其他页面知道配置已更新
      if (app.globalData) {
        app.globalData.needRefreshBodyMeasurementConfig = true;
        app.globalData.indicatorConfigChanged = true;
      }

    } catch (err) {
      console.error('保存临时配置失败:', err);
      // 不影响主流程，只是警告
      wx.showToast({
      title: '配置保存部分失败',
      icon: 'none',
      duration: 2000
      });
    }
  },

  // 判断日期类型
  determineDateType(targetDate, today) {
    if (targetDate === today) {
      return 'today';
    } else if (targetDate < today) {
      return 'past';
    } else {
      return 'future';
    }
  },

  // 将今日配置应用到未来日期
  async applyTodayConfigToFuture(todayDate, selectedIndicators, openid, currentProfileId, db) {
    try {
      // 查找所有未来日期的配置
      const futureConfigsRes = await db.collection('bodyMeasurementIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gt(todayDate)
        })
        .get();

      if (futureConfigsRes.data.length === 0) {
        console.log('📋 暂无未来日期配置需要更新');
        return;
      }

      // 批量更新未来日期的配置
      const batchUpdatePromises = futureConfigsRes.data.map(config => {
        console.log(`📎 更新未来日期配置: ${config.date}`);
        return db.collection('bodyMeasurementIndicatorConfig')
          .doc(config._id)
          .update({
            data: {
              selectedIndicators: selectedIndicators,
              updateTime: db.serverDate(),
              inheritedFrom: todayDate,
              configType: 'inherited'
            }
          });
      });

      await Promise.all(batchUpdatePromises);
      console.log(`✅ 成功更新 ${batchUpdatePromises.length} 个未来日期的配置`);

      // 显示成功提示
      if (batchUpdatePromises.length > 0) {
        wx.showToast({
      title: `已同步到${batchUpdatePromises.length}个未来日期`,
      icon: 'success',
      duration: 2000
        });
      }

    } catch (err) {
      console.error('应用今日配置到未来日期失败:', err);
      // 不影响主流程
    }
  },

  // 删除记录
  async deleteRecord() {
    // 重新获取用户信息，确保数据是最新的
    const success = this.getUserInfo();
    if (!success) {
      wx.showToast({
      title: '请先去【我的】登录并选择档案',
      icon: 'none'
    });
      return;
    }

    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    const { openid, currentProfileId, selectedDate } = this.data;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('bodyMeasurements')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (res.data.length === 0) {
        wx.hideLoading();
        wx.showToast({
      title: '当天没有可删除的记录',
      icon: 'none'
    });
        return;
      }

      const recordToDelete = res.data[0];
      const actualRecordId = recordToDelete._id;

      // 简化版删除确认
      wx.showModal({
        title: '确认删除',
        content: `确定要删除 ${selectedDate} 的身高体重记录吗？`,
        confirmText: '删除',
        cancelText: '取消',
        success: async (modalRes) => {
          if (!modalRes.confirm) {
            wx.hideLoading();
            return;
          }

          if (modalRes.confirm) {
            try {
              // 1. 删除身高体重记录
              await db.collection('bodyMeasurements').doc(actualRecordId).remove();

              // 2. 🔧 关键修复：同时删除该日期的专用配置，避免重新进入时配置还在
              try {
                await db.collection('bodyMeasurementIndicatorConfig')
                  .where({
                    openid: openid,
                    profileId: currentProfileId,
                    date: selectedDate
                  })
                  .remove();
              } catch (configErr) {
                // 配置删除失败不影响主流程
                console.log('配置删除失败（可能没有配置记录）:', configErr);
              }

              // 3. 通知首页和健康档案刷新
              const app = getApp();
              if (app.globalData) {
                app.globalData.needRefreshCalendar = true;
                // 🔧 关键修复：通知健康档案也需要刷新
                app.globalData.needRefreshHealthProfile = true;
              }

              this.setData({ recordId: '' });

              wx.hideLoading();
              wx.showToast({
      title: '删除成功',
      icon: 'success'
    });

              // 重新加载配置（这会重新评估哪些指标应该显示）
              setTimeout(() => {
                this.loadCompleteConfiguration();
              }, 100);

              // 删除成功后返回每日记录页面
              setTimeout(() => {
                wx.navigateBack({
                  fail: (err) => {
                    console.error('返回失败:', err);
                  }
                });
              }, 1000);

            } catch (err) {
              wx.hideLoading();
              wx.showToast({
      title: '删除失败，请重试',
      icon: 'error'
    });
            }
          }
        }
      });

    } catch (err) {
      wx.hideLoading();
      wx.showToast({
      title: '查询失败，请重试',
      icon: 'error'
    });
    }
  },

  // 获取用户信息
  getUserInfo() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    // 增强档案ID获取逻辑
    let currentProfileId = '';
    if (app.globalData && app.globalData.currentProfile && app.globalData.currentProfile.profileId) {
      currentProfileId = app.globalData.currentProfile.profileId;
    } else if (app.getCurrentProfileId) {
      currentProfileId = app.getCurrentProfileId();
    }

    console.log('身高体重页面 - 获取用户信息:', {
      openid: openid ? '已获取' : '未获取',
      currentProfileId,
      globalDataProfile: app.globalData?.currentProfile
    });

    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先去【我的】登录',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }

    if (!currentProfileId) {
      wx.showModal({
        title: '提示',
        content: '请先选择档案',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }

    this.setData({
      openid,
      currentProfileId
    });

    console.log('✅ 身高体重页面：用户信息获取成功');
    return true;
  },

  // 加载配置的主方法
  async loadCompleteConfiguration() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId || !selectedDate) {
      console.log('❌ 参数缺失，无法加载配置:', { openid, currentProfileId, selectedDate });
      return;
    }

    console.log(`🔄🔄🔄 开始加载 ${selectedDate} 的完整配置 🔄🔄🔄`);

    wx.showLoading({
      title: '加载配置...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 1. 查询当前日期的专用配置
      console.log('🔍 步骤1：查询当前日期的专用配置');
      const currentDateConfigRes = await db.collection('bodyMeasurementIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      // 2. 查询当前日期的身高体重数据
      console.log('🔍 步骤2：查询当前日期的身高体重数据');
      console.log('🔍 查询参数确认:', { openid, profileId: currentProfileId, date: selectedDate });

      const bodyMeasurementRes = await db.collection('bodyMeasurements')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      console.log('📋 身高体重数据查询结果:', bodyMeasurementRes.data.length, '条记录');
      if (bodyMeasurementRes.data.length > 0) {
        console.log('📋 找到的数据:', bodyMeasurementRes.data[0]);
      }

      // 3. 查询所有自定义指标设置
      console.log('🔍 步骤3：查询所有自定义指标设置');
      let customSettingsRes = { data: [] };
      try {
        customSettingsRes = await db.collection('bodyMeasurementIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .get();
        console.log('✅ 自定义指标设置查询成功');
      } catch (customErr) {
        console.error('⚠️ 自定义指标设置查询失败，继续使用默认配置:', customErr);
        // 移动端可能查询失败，使用空结果继续
        customSettingsRes = { data: [] };
      }

      console.log('📊 查询结果汇总:');
      console.log(`  - 专用配置: ${currentDateConfigRes.data ? currentDateConfigRes.data.length : '查询失败'} 条`);
      console.log(`  - 身高体重数据: ${bodyMeasurementRes.data ? bodyMeasurementRes.data.length : '查询失败'} 条`);
      console.log(`  - 自定义设置: ${customSettingsRes.data ? customSettingsRes.data.length : '查询失败'} 条`);

      // 🔧 移动端安全性检查：验证查询结果格式
      if (!currentDateConfigRes || !currentDateConfigRes.data || !Array.isArray(currentDateConfigRes.data)) {
        console.error('❌ 专用配置查询结果格式异常:', currentDateConfigRes);
        throw new Error('专用配置查询结果格式异常');
      }
      if (!bodyMeasurementRes || !bodyMeasurementRes.data || !Array.isArray(bodyMeasurementRes.data)) {
        console.error('❌ 身高体重数据查询结果格式异常:', bodyMeasurementRes);
        throw new Error('身高体重数据查询结果格式异常');
      }
      if (!customSettingsRes || !customSettingsRes.data || !Array.isArray(customSettingsRes.data)) {
        console.error('❌ 自定义设置查询结果格式异常:', customSettingsRes);
        customSettingsRes = { data: [] }; // 修正为空数组
      }

      // 4. 构建配置的优先级逻辑（新增继承逻辑）
      let config = {
        height: true,
        weight: true
      };

      if (currentDateConfigRes.data.length > 0) {
        // 🔥 优先级1：如果有当前日期的专用配置，直接使用
        console.log('✅ 找到当前日期的专用配置，直接使用');
        config = currentDateConfigRes.data[0].selectedIndicators || config;
        console.log('📋 专用配置内容:', config);
      } else {
        // 🔥 新增：尝试继承今日或最近的配置
        console.log('🔍 未找到当前日期的专用配置，尝试查找继承配置...');
        const inheritedConfig = await this.findInheritedConfig(selectedDate, openid, currentProfileId);

        if (inheritedConfig) {
          console.log('✅ 找到继承配置，使用继承配置');
          config = inheritedConfig;
          console.log('📋 继承配置内容:', config);
        } else if (bodyMeasurementRes.data.length > 0) {
          // 🔥 优先级2：如果没有专用配置但有数据，根据数据构建配置
          console.log('✅ 没有专用配置但有数据，根据数据构建配置');
          const bodyData = bodyMeasurementRes.data[0];
          console.log('📋 身高体重数据字段:', Object.keys(bodyData));

          // 🔧 关键修复：只显示有数据的基础指标
          console.log('🔄 检查基础指标数据...');
          Object.keys(config).forEach(basicKey => {
            if (!basicKey.startsWith('custom_')) {
              const hasBasicData = bodyData[basicKey] !== undefined &&
                bodyData[basicKey] !== null &&
                bodyData[basicKey].toString().trim() !== '';
              console.log(`  - 基础指标 ${basicKey}: 有数据=${hasBasicData}, 值=${bodyData[basicKey]}`);
              // 🔥 只有有数据的指标才显示
              config[basicKey] = hasBasicData;
            }
          });

          if (customSettingsRes.data && customSettingsRes.data.length > 0) {
            console.log('🔄 遍历自定义指标设置，检查数据...');
            customSettingsRes.data.forEach(item => {
              if (item.indicatorId.startsWith('custom_')) {
                // 检查当前日期的数据中是否有这个指标的值（优先检查customValues）
                const customValue = bodyData.customValues && bodyData.customValues[item.indicatorId];
                const directValue = bodyData[item.indicatorId];
                const hasData = (customValue !== undefined && customValue !== null && customValue !== '') ||
                  (directValue !== undefined && directValue !== null && directValue !== '');

                console.log(`  - ${item.indicatorId}(${item.name}): 直接值=${directValue}, 自定义值=${customValue}, 有数据=${hasData}`);
                config[item.indicatorId] = hasData;
              }
            });
          }
          console.log('📋 智能构建的配置:', config);
        } else {
          // 🔥 优先级3：既没有继承配置也没有数据，使用默认配置
          console.log('✅ 既没有继承配置也没有数据，使用默认配置');

          // 🔧 关键修复：明确地将所有自定义指标设置为false
          if (customSettingsRes.data && customSettingsRes.data.length > 0) {
            customSettingsRes.data.forEach(item => {
              if (item.indicatorId.startsWith('custom_')) {
                config[item.indicatorId] = false; // 明确设为false，不显示
                console.log(`  🚫 自定义指标 ${item.indicatorId} 设为不显示（无数据）`);
              }
            });
          }

          console.log('📋 默认配置（已明确设置自定义指标为false）:', config);
        }
      }

      // 🔧 移动端调试：详细输出最终配置状态
      console.log('🔍🔍🔍 最终配置对象详情 🔍🔍🔍');
      console.log('📋 config对象类型:', typeof config);
      console.log('📋 config对象内容:', config);
      Object.keys(config).forEach(key => {
        console.log(`  - ${key}: ${config[key]} (类型: ${typeof config[key]})`);
      });

      // 5. 构建自定义设置映射
      console.log('🔍 步骤5：构建自定义设置映射');
      const customSettings = {};
      if (customSettingsRes.data && customSettingsRes.data.length > 0) {
        customSettingsRes.data.forEach(item => {
          customSettings[item.indicatorId] = {
            name: item.name,
            min: item.minValue,
            max: item.maxValue,
            unit: item.unit
          };
        });
      }
      console.log('📋 自定义设置映射:', customSettings);

      // 6. 构建显示的指标列表
      console.log('🔍 步骤6：构建显示的指标列表');
      const basicIndicators = [];
      const customIndicators = [];

      // 预设指标定义
      const defaultIndicators = {
        height: { name: '身高', unit: 'cm' },
        weight: { name: '体重', unit: 'kg' }
      };

      // 🔧 移除强制显示逻辑，完全依赖用户配置或数据推断
      console.log('📋 最终配置（无强制修改）:', config);

      // 处理预设指标 - 移动端兼容性修复
      console.log('🔍 完整配置检查 - config对象:', config);
      console.log('🔍 完整配置检查 - defaultIndicators列表:', Object.keys(defaultIndicators));

      Object.keys(defaultIndicators).forEach(key => {
        console.log(`🔍 检查预设指标 ${key}:`, {
          configValue: config[key],
          configType: typeof config[key],
          isTrue: config[key] === true
        });

        if (config[key] === true) {
          const indicator = { ...defaultIndicators[key] };

          // 如果有自定义设置，应用自定义设置
          if (customSettings[key]) {
            indicator.name = customSettings[key].name;
            indicator.unit = customSettings[key].unit || indicator.unit;
          }

          basicIndicators.push({ id: key, ...indicator });
          console.log(`  ✅ 添加预设指标: ${key} (${indicator.name})`);
        } else {
          console.log(`  ❌ 跳过预设指标: ${key} (配置值: ${config[key]})`);
        }
      });

      console.log('🔍 完整配置检查 - 最终basicIndicators:', basicIndicators.map(i => `${i.id}(${i.name})`));

      // 处理自定义指标（只显示选中的）
      Object.keys(customSettings).forEach(indicatorId => {
        if (indicatorId.startsWith('custom_') && config[indicatorId] === true) {
          const setting = customSettings[indicatorId];
          customIndicators.push({
            id: indicatorId,
            name: setting.name,
            min: setting.min,
            max: setting.max,
            unit: setting.unit
          });
          console.log(`  + 自定义指标: ${indicatorId} (${setting.name})`);
        }
      });

      console.log(`📋 最终构建结果: ${basicIndicators.length} 个预设指标, ${customIndicators.length} 个自定义指标`);

      // 7. 初始化表单数据
      console.log('🔍 步骤7：初始化表单数据');
      const allIndicatorIds = []
        .concat(basicIndicators.map(item => item.id))
        .concat(customIndicators.map(item => item.id));

      const initialFormData = {};
      allIndicatorIds.forEach(id => {
        initialFormData[id] = '';
      });

      console.log('📋 初始化的表单字段:', allIndicatorIds);
      console.log('📋 初始化的表单数据:', initialFormData);

      // 8. 更新页面数据
      console.log('🔍 步骤8：更新页面数据');

      // 🔧 移动端保护：如果构建的指标为空，使用默认配置
      if (basicIndicators.length === 0 && customIndicators.length === 0) {
        console.log('⚠️ 构建的指标列表为空，使用默认配置避免移动端空白');

        // 强制使用默认配置
        const fallbackIndicators = [
          { id: 'height', name: '身高', min: '50', max: '250', unit: 'cm' },
          { id: 'weight', name: '体重', min: '10', max: '300', unit: 'kg' }
        ];

        const fallbackFormData = {};
        fallbackIndicators.forEach(indicator => {
          fallbackFormData[indicator.id] = '';
        });

        // 保护用户输入（只保留默认配置中的字段）
        const currentFormData = this.data.formData || {};
        const mergedFallbackData = { ...fallbackFormData };
        const fallbackIndicatorIds = fallbackIndicators.map(i => i.id);
        Object.keys(currentFormData).forEach(key => {
          if (fallbackIndicatorIds.includes(key) && currentFormData[key] !== undefined && currentFormData[key] !== null && currentFormData[key].toString().trim() !== '') {
            mergedFallbackData[key] = currentFormData[key];
          }
        });

        this.setData({
          bodyMeasurementIndicatorConfig: { height: true, weight: true },
          displayedBasicIndicators: fallbackIndicators,
          customIndicators: [],
          formData: mergedFallbackData
        });

        console.log('📋 已应用默认配置，开始加载数据');

        // 只有没有用户输入时才加载数据（允许0值）
        const hasUserInput = Object.values(mergedFallbackData).some(value =>
          value !== undefined && value !== null && value.toString().trim() !== ''
        );

        if (!hasUserInput) {
          if (this.data.recordId) {
            this.loadRecordData(this.data.recordId);
          } else {
            this.loadTodayData();
          }
        }

        return;
      }

      // 保护用户当前输入，不要被配置更新覆盖（只保留配置中的字段）
      const currentFormData = this.data.formData || {};
      const mergedFormData = { ...initialFormData };

      // 只保留用户已有的输入，且该字段在当前配置中
      Object.keys(currentFormData).forEach(key => {
        if (allIndicatorIds.includes(key) && currentFormData[key] !== undefined && currentFormData[key] !== null && currentFormData[key].toString().trim() !== '') {
          mergedFormData[key] = currentFormData[key];
        }
      });

      this.setData({
        bodyMeasurementIndicatorConfig: config,
        displayedBasicIndicators: basicIndicators || [],
        customIndicators: customIndicators || [],
        formData: mergedFormData
      });

      // 检查合并后的数据是否有用户输入（允许0值）
      const hasUserInput = Object.values(mergedFormData || {}).some(value =>
        value !== undefined && value !== null && value.toString().trim() !== ''
      );

      if (!hasUserInput) {
        if (this.data.recordId) {
          this.loadRecordData(this.data.recordId);
        } else {
          this.loadTodayData();
        }
      }



      console.log(`🎉🎉🎉 ${selectedDate} 的配置加载完成 🎉🎉🎉`);

    } catch (err) {
      console.error('❌❌❌ 配置加载失败 ❌❌❌', err);

      // 失败时使用默认配置
      console.log('🔧 使用默认配置作为兜底');
      const defaultIndicators = [
        { id: 'height', name: '身高', min: '50', max: '250', unit: 'cm' },
        { id: 'weight', name: '体重', min: '10', max: '300', unit: 'kg' }
      ];

      const initialFormData = {};
      defaultIndicators.forEach(indicator => {
        initialFormData[indicator.id] = '';
      });

      // 保护用户输入（只保留默认配置中的字段）
      const currentFormData = this.data.formData || {};
      const mergedInitialData = { ...initialFormData };
      const defaultIndicatorIds = defaultIndicators.map(i => i.id);
      Object.keys(currentFormData).forEach(key => {
        if (defaultIndicatorIds.includes(key) && currentFormData[key] !== undefined && currentFormData[key] !== null && currentFormData[key].toString().trim() !== '') {
          mergedInitialData[key] = currentFormData[key];
        }
      });

      this.setData({
        bodyMeasurementIndicatorConfig: { height: true, weight: true },
        displayedBasicIndicators: defaultIndicators || [],
        customIndicators: [],
        formData: mergedInitialData
      });

      // 只有没有用户输入时才加载数据（允许0值）
      const hasUserInput = Object.values(mergedInitialData).some(value =>
        value !== undefined && value !== null && value.toString().trim() !== ''
      );

      if (!hasUserInput) {
        this.loadTodayData();
      }


    } finally {
      wx.hideLoading();
    }
  },

  // 加载指定日期的数据
  async loadTodayData() {
    // 立即检查是否有用户输入，如果有就不加载数据（允许0值）
    const currentFormData = this.data.formData || {};
    const hasUserInput = Object.values(currentFormData).some(value =>
      value !== undefined && value !== null && value.toString().trim() !== ''
    );

    if (hasUserInput) {
      return; // 有用户输入就直接返回，不覆盖
    }

    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) {
      return;
    }

    console.log(`📊📊📊 开始加载 ${selectedDate} 的身高体重数据 📊📊📊`);

    try {
      const db = wx.cloud.database();

      console.log('🔍 数据库查询条件:', {
        openid: openid,
        profileId: currentProfileId,
        date: selectedDate
      });

      const res = await db.collection('bodyMeasurements')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      console.log(`🔍 查询结果: 找到 ${res.data.length} 条记录`);

      if (res.data.length > 0) {
        console.log('📋 查询到的记录详情:');
        res.data.forEach((record, index) => {
          console.log(`  记录${index + 1}:`, {
            _id: record._id,
            date: record.date,
            openid: record.openid,
            profileId: record.profileId,
            数据字段: Object.keys(record).filter(key => !['_id', '_openid', 'openid', 'profileId', 'date', 'createTime', 'updateTime', 'type'].includes(key))
          });
        });
      }

      if (res.data.length > 0) {
        const data = res.data[0];
        console.log('📋 数据库记录内容:', data);

        // 获取当前已配置的指标ID（包括预设和自定义）
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
        const allCustomIndicatorIds = customIndicators.map(item => item.id);
        const allConfiguredIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

        console.log('📋 当前配置的指标:');
        console.log(`  - 预设指标: ${allBasicIndicatorIds.join(', ')}`);
        console.log(`  - 自定义指标: ${allCustomIndicatorIds.join(', ')}`);
        console.log(`  - 所有配置指标: ${allConfiguredIds.join(', ')}`);

        // 构建完整的formData，包含数据库中所有存在的数据
        const formData = {};

        // 1. 首先从customValues加载（最高优先级）
        if (data.customValues) {
          Object.keys(data.customValues).forEach(key => {
            // 只加载用户配置的指标
            if (allConfiguredIds.includes(key)) {
              formData[key] = data.customValues[key];
            }
          });
        }

        // 2. 只加载当前配置中的指标数据（不加载其他字段）
        allConfiguredIds.forEach(indicatorId => {
          if (formData[indicatorId] === undefined) {
            // 🔥 修复：正确处理0值，不能用 || 运算符
            formData[indicatorId] = (data[indicatorId] !== undefined && data[indicatorId] !== null) ? data[indicatorId] : '';
          }
        });

        // 🔧 修复：不再加载数据库中未配置的字段，只显示用户配置的指标

        console.log('📋 最终构建的formData（只包含配置的指标）:', formData);

        // 保护用户当前的输入（只保留配置中的字段）
        const currentFormData = this.data.formData || {};
        const protectedFormData = { ...formData };

        Object.keys(currentFormData).forEach(key => {
          const currentValue = currentFormData[key];
          if (allConfiguredIds.includes(key) && currentValue !== undefined && currentValue !== null && currentValue.toString().trim() !== '') {
            protectedFormData[key] = currentValue;
          }
        });

        this.setData({
          recordId: data._id,
          formData: protectedFormData
        });

        console.log('✅ 数据加载完成，已更新到页面（保护了用户输入）');

      } else {
        console.log(`❌ ${selectedDate} 没有身高体重数据，开始清空表单`);

        console.log(`❌ ${selectedDate} 没有身高体重数据，清空表单但保持配置`);

        // 清空表单数据，但保持现有配置（包括自定义项）
        const { displayedBasicIndicators, customIndicators } = this.data;

        // 如果没有配置，确保有默认配置
        if ((!displayedBasicIndicators || displayedBasicIndicators.length === 0) &&
          (!customIndicators || customIndicators.length === 0)) {
          this.ensureHasValidConfiguration();
          return; // 让ensureHasValidConfiguration处理
        }

        // 有配置的情况下，只清空表单数据
        const allIndicatorIds = []
          .concat(displayedBasicIndicators.map(item => item.id))
          .concat(customIndicators.map(item => item.id));

        const emptyFormData = {};
        allIndicatorIds.forEach(indicatorId => {
          emptyFormData[indicatorId] = '';
        });

        this.setData({
          recordId: '',
          formData: emptyFormData
        });
      }
    } catch (err) {
      console.error('加载数据失败:', err);

      // 🔧 移动端修复：加载失败时也不覆盖配置，只清空表单数据
      const { displayedBasicIndicators, customIndicators } = this.data;
      const allIndicatorIds = []
        .concat(displayedBasicIndicators.map(item => item.id))
        .concat(customIndicators.map(item => item.id));

      // 只清空表单数据，绝不修改配置
      const emptyFormData = {};
      allIndicatorIds.forEach(indicatorId => {
        emptyFormData[indicatorId] = '';
      });

      this.setData({
        recordId: '',
        formData: emptyFormData
      });

      console.log('✅ 错误处理：已清空表单数据，配置保持不变');
    }
  },

  // 加载指定记录数据
  async loadRecordData(recordId) {
    // 立即检查是否有用户输入，如果有就不加载数据（允许0值）
    const currentFormData = this.data.formData || {};
    const hasUserInput = Object.values(currentFormData).some(value =>
      value !== undefined && value !== null && value.toString().trim() !== ''
    );

    if (hasUserInput) {
      return; // 有用户输入就直接返回，不覆盖
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('bodyMeasurements').doc(recordId).get();

      if (res.data) {
        const data = res.data;

        // 🔧 修复：加载完整的数据，不只是当前显示的指标
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
        const allCustomIndicatorIds = customIndicators.map(item => item.id);
        const allConfiguredIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

        // 构建完整的formData，优先级：customValues > 直接字段
        const formData = {};

        // 1. 首先从customValues加载（最高优先级）
        if (data.customValues) {
          Object.keys(data.customValues).forEach(key => {
            // 只加载用户配置的指标
            if (allConfiguredIds.includes(key)) {
              formData[key] = data.customValues[key];
            }
          });
        }

        // 2. 只加载当前配置中的指标数据（不加载其他字段）
        allConfiguredIds.forEach(indicatorId => {
          if (formData[indicatorId] === undefined) {
            // 🔥 修复：正确处理0值，不能用 || 运算符
            formData[indicatorId] = (data[indicatorId] !== undefined && data[indicatorId] !== null) ? data[indicatorId] : '';
          }
        });

        // 🔧 修复：不再加载数据库中未配置的字段，只显示用户配置的指标

        // 保护用户当前的输入（只保留配置中的字段）
        const currentFormData = this.data.formData || {};
        const protectedFormData = { ...formData };

        Object.keys(currentFormData).forEach(key => {
          const currentValue = currentFormData[key];
          if (allConfiguredIds.includes(key) && currentValue !== undefined && currentValue !== null && currentValue.toString().trim() !== '') {
            protectedFormData[key] = currentValue;
          }
        });

        this.setData({
          selectedDate: data.date,
          formData: protectedFormData
        });
      }
    } catch (err) {
      console.error('加载记录失败:', err);
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      fail: (err) => {
        console.error('身高体重页面返回失败:', err);
      }
    });
  },

  // 检查登录状态并加载数据
  checkLoginAndLoadData() {
    wx.showLoading({
      title: '初始化中...',
      mask: true
    });

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    if (!openid) {
      console.log('❌ 用户未登录');
      wx.hideLoading();
      this.setData({ isLoggedIn: false });
      wx.reLaunch({
        url: '/pages/profile/index'
      });
      return;
    }

    const currentProfileId = app.getCurrentProfileId();
    if (!currentProfileId) {
      console.log('❌ 未选择档案');
      wx.hideLoading();
      this.setData({ isLoggedIn: false });
      wx.reLaunch({
        url: '/pages/profile/index'
      });
      return;
    }

    // 设置用户信息
    this.setData({
      openid,
      currentProfileId,
      isLoggedIn: true
    });

    console.log('✅ 用户信息验证成功，加载用户配置');

    // 加载用户配置
    this.loadCompleteConfiguration().then(() => {
      wx.hideLoading();
    }).catch(err => {
      console.error('配置加载失败，保持默认配置:', err);
      wx.hideLoading();
    });
  },

  // 分享功能
  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png'
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })

    return {
      title: '暖白记事本 - 健康管理小程序',
      path: '/pages/daily-record/index',
      imageUrl: res.fileList[0].tempFileURL
    }
  }

});
