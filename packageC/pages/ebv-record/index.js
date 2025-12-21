const app = getApp();

Page({
  data: {
    // 基础数据
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),

    // 日期选择器
    datePickerVisible: false,

    // 指标配置和显示 - EB病毒相关指标
    basicIndicators: [
      { id: 'ebvDna', name: '数值', min: '', max: '', unit: 'IU/mL' }
    ],

    displayedBasicIndicators: [],
    customIndicators: [],

    // 表单数据
    formData: {},

    // 页面状态
    isEditingExistingRecord: false,
    existingRecordId: '',
    hasExistingData: false,

    // 临时配置相关
    isTemporaryConfig: false,
    tempConfigMessage: '',

    // 异常值提示
    abnormalIndicators: [],
    hasAbnormal: false,

    // 输入验证错误
    inputErrors: {},

    // 焦点索引
    focusIndex: -1,

    // AI智能导入相关
    aiImportMenuVisible: false,
    voiceRecordingVisible: false,
    isRecording: false,
    recordDuration: 0,
    recognizedText: '',
    aiRecognizedData: [],
    aiResultVisible: false,
    voiceRecognitionManager: null,
    recordDurationTimer: null,
    lastImportMethod: '' // 'camera', 'album', 'voice'
  },

  onLoad(options) {


    // 设置今天的日期
    const today = new Date();
    const dateStr = this.formatDate(today);

    // 如果从日历跳转过来，使用传入的日期
    if (options.date) {
      this.setData({
        selectedDate: options.date,
        selectedDateTimestamp: new Date(options.date).getTime()
      });
    } else {
      this.setData({
        selectedDate: dateStr,
        selectedDateTimestamp: today.getTime()
      });
    }

    // 🔧 修复：延迟加载数据，确保 app.globalData.currentProfile 已初始化
    setTimeout(() => {
      // 获取用户信息
      this.getUserInfo();

      // 初始化页面
      this.initializePage();
    }, 300);
  },

  onShow() {


    const app = getApp();
    if (app.globalData) {
      // 检查临时配置（从配置页面返回）
      if (app.globalData.temporaryEbvConfig) {

        this.loadTemporaryConfiguration();

        // 🔧 关键修复：恢复用户之前的输入
        this.restoreTemporaryUserInput();
      }
      // 检查配置刷新标志
      else if (app.globalData.needRefreshEbvConfig) {

        app.globalData.needRefreshEbvConfig = false;

        wx.showLoading({ title: '刷新配置中...' });
        this.loadIndicatorConfiguration().then(() => {
          wx.hideLoading();
        });
      }
    }

    // 检查是否有用户信息，如果有就加载数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadExistingData();
    }
  },

  // 页面隐藏
  onHide() {
    // 清理临时配置（如果未保存）
    this.cleanupTemporaryConfigIfNotSaved();
  },

  // 页面卸载
  onUnload() {
    // 清理临时配置（如果未保存）
    this.cleanupTemporaryConfigIfNotSaved();
  },

  // 清理临时配置（如果未保存）
  cleanupTemporaryConfigIfNotSaved() {
    const app = getApp();
    if (app.globalData && app.globalData.temporaryEbvConfig && this.data.isTemporaryConfig) {

      delete app.globalData.temporaryEbvConfig;

      // 如果页面还在显示，重新加载原有配置
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.route === 'pages/ebv-record/index') {
        this.loadIndicatorConfiguration();
      }
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

    console.log('EBV记录页面 - 获取用户信息:', {
      openid: openid ? '已获取' : '未获取',
      currentProfileId,
      globalDataProfile: app.globalData?.currentProfile
    });

    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
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


    return true;
  },

  // 初始化页面
  async initializePage() {


    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      // 加载指标配置
      await this.loadIndicatorConfiguration();

      // 加载现有数据
      await this.loadExistingData();


    } catch (err) {

    } finally {
      wx.hideLoading();
    }
  },

  // 加载指标配置 - 按照血常规模式重写
  async loadIndicatorConfiguration() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) {

      return;
    }

    try {
      const db = wx.cloud.database();

      // 1. 查询当前日期的特定配置
      const configRes = await db.collection('ebvIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      // 2. 查询自定义指标设置
      let customSettings = {};
      try {
        const settingsRes = await db.collection('ebvIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .get();

        settingsRes.data.forEach(item => {
          customSettings[item.indicatorId] = {
            name: item.name,
            min: item.minValue,
            max: item.maxValue,
            unit: item.unit,
            shortName: item.shortName,
            fullName: item.fullName
          };
        });

      } catch (settingsErr) {

      }

      // 3. 确定最终配置
      let selectedIndicators = { ebvDna: true }; // 默认只选EBV-DNA

      if (configRes.data.length > 0) {
        const config = configRes.data[0];
        selectedIndicators = config.selectedIndicators || selectedIndicators;

      } else {
        // 如果没有当前日期配置，尝试继承最近配置
        const inheritedConfigRes = await db.collection('ebvIndicatorConfig')
          .where({
            openid: openid,
            profileId: currentProfileId,
            date: db.command.lte(selectedDate)
          })
          .orderBy('date', 'desc')
          .limit(1)
          .get();

        if (inheritedConfigRes.data.length > 0) {
          selectedIndicators = inheritedConfigRes.data[0].selectedIndicators || selectedIndicators;

        } else {

        }
      }

      // 4. 构建显示的基础指标列表
      const displayedBasicIndicators = [];
      this.data.basicIndicators.forEach(indicator => {
        if (selectedIndicators[indicator.id]) {
          const finalIndicator = { ...indicator };
          // 应用自定义设置
          if (customSettings[indicator.id]) {
            const custom = customSettings[indicator.id];
            finalIndicator.name = custom.name || finalIndicator.name;
            finalIndicator.min = custom.min || finalIndicator.min;
            finalIndicator.max = custom.max || finalIndicator.max;
            finalIndicator.unit = custom.unit || finalIndicator.unit;
          }
          displayedBasicIndicators.push(finalIndicator);
        }
      });

      // 5. 构建自定义指标列表
      const customIndicators = [];
      Object.keys(customSettings).forEach(indicatorId => {
        if (indicatorId.startsWith('custom_') && selectedIndicators[indicatorId]) {
          const setting = customSettings[indicatorId];
          customIndicators.push({
            id: indicatorId,
            name: setting.fullName || setting.name,
            min: setting.min,
            max: setting.max,
            unit: setting.unit
          });
        }
      });




      this.setData({
        displayedBasicIndicators,
        customIndicators
      });

    } catch (err) {

      // 使用默认配置
      const defaultBasicIndicators = this.data.basicIndicators.filter(indicator =>
        indicator.id === 'ebvDna'
      );

      this.setData({
        displayedBasicIndicators: defaultBasicIndicators,
        customIndicators: []
      });
    }
  },

  // 加载现有数据
  async loadExistingData() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) return;

    try {
      const db = wx.cloud.database();

      // 查询当前日期的EB病毒记录
      const res = await db.collection('ebvRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (res.data.length > 0) {
        const record = res.data[0];


        // 构建表单数据
        const formData = {};

        // 加载基础指标数据
        this.data.basicIndicators.forEach(indicator => {
          if (record[indicator.id] !== undefined) {
            formData[indicator.id] = record[indicator.id].toString();
          } else if (indicator.id === 'ebvDna') {
            // 🔧 修复：对于EB病毒DNA，如果数据库中是undefined，设置为"0"以保持与健康档案页面显示的一致性
            formData[indicator.id] = '0';
          }
        });

        // 加载自定义指标数据
        if (record.customValues) {
          Object.keys(record.customValues).forEach(key => {
            formData[key] = record.customValues[key].toString();
          });
        }

        this.setData({
          formData,
          isEditingExistingRecord: true,
          existingRecordId: record._id,
          hasExistingData: true
        });
      } else {
        // 没有现有数据，formData保持为空
        this.setData({
          formData: {},
          isEditingExistingRecord: false,
          existingRecordId: '',
          hasExistingData: false
        });
      }

    } catch (err) {

    }
  },

  // 加载临时配置
  loadTemporaryConfiguration() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryEbvConfig;

    if (!tempConfig || !tempConfig.isTemporary) {

      // 清理无效的临时配置
      if (tempConfig && !tempConfig.isTemporary) {
        delete app.globalData.temporaryEbvConfig;
      }
      return;
    }






    // 根据临时配置构建显示的指标列表
    const { selectedIndicators, customIndicators, indicatorConfigs } = tempConfig;

    // 过滤出被选中的基础指标
    const displayedBasicIndicators = this.data.basicIndicators.filter(indicator => {
      const isSelected = selectedIndicators[indicator.id];
      if (isSelected && indicatorConfigs[indicator.id]) {
        // 使用自定义配置覆盖默认值
        const customConfig = indicatorConfigs[indicator.id];
        indicator.name = customConfig.name || indicator.name;
        indicator.min = customConfig.min || indicator.min;
        indicator.max = customConfig.max || indicator.max;
        indicator.unit = customConfig.unit || indicator.unit;
      }
      return isSelected;
    });

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
      isTemporaryConfig: true,
      tempConfigMessage: '正在预览配置效果，点击"完成"保存后生效'
    });




  },

  // 🔧 新增：恢复用户临时输入
  restoreTemporaryUserInput() {
    const app = getApp();
    const tempInput = app.globalData.temporaryEbvInput;

    if (!tempInput || !tempInput.formData) {

      return;
    }

    // 检查时间戳，超过10分钟就忽略
    const now = Date.now();
    const savedTime = tempInput.savedAt || 0;
    const isValid = (now - savedTime) < 10 * 60 * 1000; // 10分钟

    if (!isValid) {

      delete app.globalData.temporaryEbvInput;
      return;
    }

    // 检查日期是否匹配
    if (tempInput.selectedDate === this.data.selectedDate) {


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



    }
    // 总是清理临时输入，无论是否恢复
    delete app.globalData.temporaryEbvInput;
  },

  // 输入框值改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;

    // EBV-DNA自动判断阴性阳性
    if (field === 'ebvDna' && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const result = numValue > 0 ? '阳性' : '阴性';
        this.setData({
          ebvResult: result
        });
      }
    }

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
    this.setData({
      focusIndex: nextIndex
    });
  },

  // 点击"完成"按钮收起键盘
  completeInput() {
    this.setData({
      focusIndex: -1
    });
    // 输入完成提示已移除
  },

  // 配置指标
  configIndicators() {
    // 检查用户登录状态
    const { openid, currentProfileId, selectedDate, formData } = this.data;
    if (!openid || !currentProfileId) {
      wx.showToast({
//         title: '请先登录并选择档案',
//         icon: 'none'
//       });
      return;
    }

    // 分析当前日期的数据状态
    const hasDataIndicators = [];
    Object.keys(formData).forEach(indicatorId => {
      const value = formData[indicatorId];
      if (value && value.toString().trim() !== '') {
        hasDataIndicators.push(indicatorId);
      }
    });

    // 只保存有意义的用户输入
    const cleanFormData = {};
    const { displayedBasicIndicators, customIndicators } = this.data;
    const allCurrentIndicatorIds = []
      .concat(displayedBasicIndicators.map(item => item.id))
      .concat(customIndicators.map(item => item.id));

    // 只保存当前配置中显示的指标的非空值
    allCurrentIndicatorIds.forEach(indicatorId => {
      const value = formData[indicatorId];
      if (value && value.toString().trim() !== '') {
        cleanFormData[indicatorId] = value.toString().trim();
      }
    });

    const app = getApp();
    if (app.globalData) {
      // 只有当用户真的有输入时才保存临时数据
      if (Object.keys(cleanFormData).length > 0) {
        app.globalData.temporaryEbvInput = {
          formData: cleanFormData,
          selectedDate: this.data.selectedDate,
          recordId: this.data.recordId,
          savedAt: Date.now()
        };

      } else {
        delete app.globalData.temporaryEbvInput;

      }

      // 保存当前日期的数据状态信息和日期
      app.globalData.currentDateContext = {
        selectedDate: selectedDate,
        hasDataIndicators: hasDataIndicators,
        totalDisplayedCount: Object.keys(formData).length
      };
    }

    // 传递当前日期给配置页面
    wx.navigateTo({
      url: `/packageC/pages/ebv-config/index?date=${selectedDate}`,
      fail: (err) => {

        wx.showToast({
//           title: '打开配置页面失败',
//           icon: 'none'
//         });
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
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      selectedDate: dateStr,
      selectedDateTimestamp: date.getTime(),
      datePickerVisible: false
    });

    // 重新加载数据
    wx.showLoading({
      title: '切换日期中...',
      mask: true
    });

    Promise.all([
      this.loadIndicatorConfiguration(),
      this.loadExistingData()
    ]).then(() => {
      wx.hideLoading();
    }).catch(err => {

      wx.hideLoading();
    });
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({
      datePickerVisible: false
    });
  },

  // 日期选择器显示状态变化
  onDateVisibleChange(e) {
    this.setData({
      datePickerVisible: e.detail.visible
    });
  },

  // 保存临时配置（如果存在）
  async saveTemporaryConfigIfExists() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryEbvConfig;

    if (!tempConfig || !tempConfig.isTemporary) {

      return;
    }



    const { openid, currentProfileId, selectedDate } = this.data;
    const { selectedIndicators, customIndicators, dateType: configDateType } = tempConfig;

    // 使用临时配置中的日期类型，或者重新判断
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateType = configDateType || (selectedDate === todayStr ? 'today' : selectedDate < todayStr ? 'past' : 'future');

    try {
      const db = wx.cloud.database();

      // 1. 保存自定义指标设置（如果有新增的）
      const newCustomIndicators = customIndicators.filter(indicator =>
        indicator.id.startsWith('custom_')
      );

      for (const indicator of newCustomIndicators) {
        // 检查是否已存在
        const existingRes = await db.collection('ebvIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId,
            indicatorId: indicator.id
          })
          .get();

        if (existingRes.data.length === 0) {
          // 新增自定义指标
          await db.collection('ebvIndicatorSettings').add({
            data: {
              openid: openid,
              profileId: currentProfileId,
              indicatorId: indicator.id,
              shortName: indicator.shortName,
              fullName: indicator.fullName || indicator.name,
              name: indicator.name,
              minValue: indicator.min,
              maxValue: indicator.max,
              unit: indicator.unit,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });

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
      const existingConfigRes = await db.collection('ebvIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (existingConfigRes.data.length > 0) {
        // 更新现有配置
        await db.collection('ebvIndicatorConfig')
          .doc(existingConfigRes.data[0]._id)
          .update({
            data: configData
          });

      } else {
        // 创建新配置
        await db.collection('ebvIndicatorConfig').add({
          data: {
            openid: openid,
            profileId: currentProfileId,
            date: selectedDate,
            ...configData
          }
        });

      }

      // 3. 如果是今日配置，应用到未来日期
      if (dateType === 'today') {

        await this.applyTodayConfigToFuture(selectedDate, selectedIndicators, openid, currentProfileId, db);
      }

      // 4. 清理临时配置数据
      delete app.globalData.temporaryEbvConfig;
      this.setData({ isTemporaryConfig: false });



      // 5. 设置刷新标志，让其他页面知道配置已更新
      if (app.globalData) {
        app.globalData.needRefreshEbvConfig = true;
      }

    } catch (err) {

      // 不影响主流程，只是警告
      wx.showToast({
//         title: 'EB病毒配置保存部分失败',
//         icon: 'none',
//         duration: 2000
      });
    }
  },

  // 将今日配置应用到未来日期
  async applyTodayConfigToFuture(selectedDate, selectedIndicators, openid, currentProfileId, db) {
    try {
      // 查找未来日期的配置记录
      const futureConfigsRes = await db.collection('ebvIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gt(selectedDate)
        })
        .get();

      // 批量更新未来日期的配置
      const updatePromises = futureConfigsRes.data.map(config => {
        return db.collection('ebvIndicatorConfig')
          .doc(config._id)
          .update({
            data: {
              selectedIndicators: selectedIndicators,
              updateTime: db.serverDate(),
              configType: 'inherited',
              inheritedFrom: selectedDate
            }
          });
      });

      await Promise.all(updatePromises);


    } catch (err) {

    }
  },

  // 保存数据
  async saveData() {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    // 🔧 关键逻辑：如果存在临时配置，现在保存它
    await this.saveTemporaryConfigIfExists();

    const { openid, currentProfileId, selectedDate, formData, existingRecordId } = this.data;

    if (!openid || !currentProfileId) {
      wx.hideLoading();
      wx.showToast({
//         title: '请先登录并选择档案',
//         icon: 'error'
//       });
      return;
    }

    // 获取所有已配置的指标ID
    const { displayedBasicIndicators, customIndicators } = this.data;
    const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
    const allCustomIndicatorIds = customIndicators.map(item => item.id);
    const allIndicatorIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

    // 数据校验
    const validationErrors = [];

    for (const indicatorId of allIndicatorIds) {
      const value = formData[indicatorId];
      const indicator = [].concat(displayedBasicIndicators).concat(customIndicators).find(item => item.id === indicatorId);
      const indicatorName = indicator ? indicator.name : indicatorId;

      if (!value || value.toString().trim() === '') {
        validationErrors.push(`${indicatorName}: 必须填写数值`);
        continue;
      }

      const trimmedValue = value.toString().trim();

      if (!/^\d+(\.\d+)?$/.test(trimmedValue)) {
        validationErrors.push(`${indicatorName}: 只能输入数字`);
        continue;
      }

      const parts = trimmedValue.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';

      if (integerPart.length > 6) {
        validationErrors.push(`${indicatorName}: 整数部分不能超过6位数`);
        continue;
      }

      if (decimalPart.length > 3) {
        validationErrors.push(`${indicatorName}: 小数部分不能超过3位`);
        continue;
      }

      const numValue = parseFloat(trimmedValue);
      if (isNaN(numValue)) {
        validationErrors.push(`${indicatorName}: 请输入有效的数字`);
      } else if (numValue < 0) {
        // EBV 允许输入 0，表示阴性
        validationErrors.push(`${indicatorName}: 数值不能小于0`);
      } else if (numValue > 999999) {
        validationErrors.push(`${indicatorName}: 数值不能超过999999`);
      }
    }

    if (validationErrors.length > 0) {
      wx.hideLoading();
      wx.showToast({
//         title: validationErrors[0],
//         icon: 'error',
//         duration: 3000
      });
      return;
    }

    try {
      const db = wx.cloud.database();

      // 检查是否已存在记录
      const existingRes = await db.collection('ebvRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      let isNewRecord = existingRes.data.length === 0;
      let targetRecordId = isNewRecord ? null : existingRes.data[0]._id;

      if (isNewRecord) {
        // 新增数据
        const saveData = {
          openid,
          profileId: currentProfileId,
          date: selectedDate,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          type: 'ebv-record'
        };

        const currentDisplayedData = {};
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value && value.toString().trim() !== '') {
            currentDisplayedData[indicatorId] = parseFloat(value);
          }
        });

        // 处理基础指标
        allBasicIndicatorIds.forEach(indicatorId => {
          if (currentDisplayedData[indicatorId] !== undefined) {
            saveData[indicatorId] = currentDisplayedData[indicatorId];
          }
        });

        // 处理自定义指标
        if (allCustomIndicatorIds.length > 0) {
          saveData.customValues = {};
          allCustomIndicatorIds.forEach(indicatorId => {
            if (currentDisplayedData[indicatorId] !== undefined) {
              saveData.customValues[indicatorId] = currentDisplayedData[indicatorId];
            }
          });
        }

        await db.collection('ebvRecords').add({
          data: saveData
        });


      } else {
        // 更新数据
        const updateData = {
          updateTime: db.serverDate()
        };

        const currentDisplayedData = {};
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value && value.toString().trim() !== '') {
            currentDisplayedData[indicatorId] = parseFloat(value);
          }
        });

        // 更新基础指标
        allBasicIndicatorIds.forEach(indicatorId => {
          updateData[indicatorId] = currentDisplayedData[indicatorId] || db.command.remove();
        });

        // 更新自定义指标
        if (allCustomIndicatorIds.length > 0) {
          const customValues = {};
          allCustomIndicatorIds.forEach(indicatorId => {
            if (currentDisplayedData[indicatorId] !== undefined) {
              customValues[indicatorId] = currentDisplayedData[indicatorId];
            }
          });
          updateData.customValues = Object.keys(customValues).length > 0 ? customValues : db.command.remove();
        } else {
          updateData.customValues = db.command.remove();
        }

        await db.collection('ebvRecords')
          .doc(targetRecordId)
          .update({
            data: updateData
          });


      }

      // 清理临时配置
      const app = getApp();
      if (app.globalData && app.globalData.temporaryEbvConfig) {

        delete app.globalData.temporaryEbvConfig;
        this.setData({
          isTemporaryConfig: false,
          tempConfigMessage: ''
        });
      }

      // 清理临时输入
      if (app.globalData && app.globalData.temporaryEbvInput) {
        delete app.globalData.temporaryEbvInput;
      }

      // 通知首页刷新日历和数据
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
      }

      wx.hideLoading();
      wx.showToast({
//         title: '保存成功',
//         icon: 'success'
//       });

      // 更新记录状态
      this.setData({
        isEditingExistingRecord: true,
        existingRecordId: targetRecordId || targetRecordId,
        hasExistingData: true
      });

      // 保存成功后返回上一页面
      setTimeout(() => {
        wx.navigateBack({
          fail: (err) => {

          }
        });
      }, 1000);

    } catch (err) {

      wx.hideLoading();
      wx.showToast({
//         title: '保存失败，请重试',
//         icon: 'error'
//       });
    }
  },

  // 删除记录
  deleteRecord() {
    if (!this.data.hasExistingData) {
      wx.showToast({
//         title: '没有可删除的记录',
//         icon: 'none'
//       });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条EB病毒记录吗？',
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({
          title: '删除中...',
          mask: true
        });

        try {
          const db = wx.cloud.database();

          await db.collection('ebvRecords')
            .doc(this.data.existingRecordId)
            .remove();

          wx.hideLoading();
          wx.showToast({
//             title: '删除成功',
//             icon: 'success'
//           });

          // 重置表单
          this.setData({
            formData: {},
            isEditingExistingRecord: false,
            existingRecordId: '',
            hasExistingData: false
          });

          // 通知首页和健康档案刷新
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
            // 🔧 关键修复：通知健康档案也需要刷新
            app.globalData.needRefreshHealthProfile = true;
          }

        } catch (err) {

          wx.hideLoading();
          wx.showToast({
//             title: '删除失败，请重试',
//             icon: 'error'
//           });
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // OCR扫描录入
  scanOCR() {
    const that = this;

    // 让用户选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];

        wx.showLoading({
          title: '识别中...',
          mask: true
        });

        // 获取图片信息
        wx.getImageInfo({
          src: tempFilePath,
          success: function (imgInfo) {
            console.log('图片信息:', imgInfo);

            // 压缩图片以减少数据大小
            wx.compressImage({
              src: tempFilePath,
              quality: 80,
              success: function (compressRes) {
                console.log('压缩后图片路径:', compressRes.tempFilePath);

                // 调用OCR接口
                wx.getFileSystemManager().readFile({
                  filePath: compressRes.tempFilePath,
                  encoding: 'base64',
                  success: function (fileRes) {
                    // 检查数据大小，云函数限制约为1MB
                    const dataSize = fileRes.data.length;
                    console.log('Base64数据大小:', dataSize, 'bytes');

                    if (dataSize > 800000) { // 800KB限制
                      wx.hideLoading();
                      wx.showToast({
//                         title: '图片过大，请选择更小的图片',
//                         icon: 'none',
//                         duration: 2500
                      });
                      return;
                    }

                    wx.cloud.callFunction({
                      name: 'ocrFunction',
                      data: {
                        imgBase64: fileRes.data,
                        imgType: imgInfo.type || 'png'
                      },
                      success: function (cloudRes) {
                        wx.hideLoading();
                        console.log('OCR云函数返回:', cloudRes);

                        if (cloudRes.result) {
                          // 检查云函数是否正确处理了请求
                          if (cloudRes.result.success === false) {
                            console.error('OCR识别失败:', cloudRes.result.error);
                            wx.showToast({
//                               title: '识别失败: ' + (cloudRes.result.error || '未知错误'),
//                               icon: 'none',
//                               duration: 2500
                            });
                          } else if (cloudRes.result.items && cloudRes.result.items.length > 0) {
                            // 解析OCR结果
                            that.parseOCRResult(cloudRes.result.items);
                          } else {
                            wx.showToast({
//                               title: '未识别到有效内容',
//                               icon: 'none'
//                             });
                          }
                        } else {
                          console.error('云函数返回异常:', cloudRes);
                          if (cloudRes.errMsg) {
                            wx.showToast({
//                               title: '识别服务异常: ' + cloudRes.errMsg,
//                               icon: 'none',
//                               duration: 2500
                            });
                          } else {
                            wx.showToast({
//                               title: '识别服务异常，请重新部署云函数',
//                               icon: 'none',
//                               duration: 3000
                            });
                          }
                        }
                      },
                      fail: function (err) {
                        wx.hideLoading();
                        console.error('调用云函数失败:', err);

                        // 处理数据过大错误
                        if (err.errMsg && err.errMsg.includes('data exceed max size')) {
                          wx.showToast({
//                             title: '图片数据过大，请选择更小的图片',
//                             icon: 'none',
//                             duration: 3000
                          });
                        } else {
                          wx.showToast({
//                             title: '调用识别服务失败',
//                             icon: 'none'
//                           });
                        }
                      }
                    });
                  },
                  fail: function (err) {
                    wx.hideLoading();
                    console.error('读取图片失败:', err);
                    wx.showToast({
//                       title: '读取图片失败',
//                       icon: 'none'
//                     });
                  }
                });
              },
              fail: function (err) {
                wx.hideLoading();
                console.error('压缩图片失败:', err);
                wx.showToast({
//                   title: '压缩图片失败',
//                   icon: 'none'
//                 });
              }
            });
          },
          fail: function (err) {
            wx.hideLoading();
            console.error('获取图片信息失败:', err);
            wx.showToast({
//               title: '获取图片信息失败',
//               icon: 'none'
//             });
          }
        });
      },
      fail: function (err) {
        console.error('选择图片失败:', err);
        wx.showToast({
//           title: '选择图片失败',
//           icon: 'none'
//         });
      }
    });
  },

  // 解析OCR结果
  parseOCRResult(items) {
    const that = this;
    let recognizedCount = 0;
    const newFormData = { ...that.data.formData };

    // EBV相关关键词映射
    const ebvKeywordMap = {
      'EBV-DNA': ['ebvDna'],
      'EBV': ['ebvDna'],
      'EB病毒': ['ebvDna'],
      'EB': ['ebvDna'],
      'DNA': ['ebvDna']
    };

    console.log('开始解析OCR结果:', items);

    items.forEach(item => {
      const text = item.text;
      console.log('处理文本:', text);

      // 检查每个关键词
      Object.keys(ebvKeywordMap).forEach(keyword => {
        if (text.includes(keyword)) {
          console.log('找到关键词:', keyword, '在文本:', text);

          // 尝试提取数值
          const numberMatch = text.match(/[\d.,]+/);
          if (numberMatch) {
            const value = numberMatch[0];
            console.log('提取到数值:', value);

            // 映射到对应的表单字段
            ebvKeywordMap[keyword].forEach(fieldName => {
              if (that.data.basicIndicators.find(ind => ind.id === fieldName) ||
                that.data.customIndicators.find(ind => ind.id === fieldName)) {
                newFormData[fieldName] = value;
                recognizedCount++;
                console.log('设置字段:', fieldName, '值:', value);
              }
            });
          }
        }
      });
    });

    // 更新表单数据
    if (recognizedCount > 0) {
      that.setData({
        formData: newFormData
      });

      wx.showToast({
//         title: `成功识别${recognizedCount}个指标`,
//         icon: 'success'
//       });
    } else {
      wx.showToast({
//         title: '未识别到相关指标',
//         icon: 'none'
//       });
    }
  },


  // ==================== AI智能导入功能 ====================

  // 显示AI导入选项菜单
  showAIIdentifyOptions() {
    this.setData({
      aiImportMenuVisible: true
    });
  },

  // 关闭AI导入菜单
  onAIImportMenuClose() {
    this.setData({
      aiImportMenuVisible: false
    });
  },

  // 处理拍照识别
  handleAICamera() {
    this.setData({
      aiImportMenuVisible: false,
      lastImportMethod: 'camera'
    });

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.recognizeImageWithAI(tempFilePath);
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          wx.showToast({
//             title: '拍照失败',
//             icon: 'none'
//           });
        }
      }
    });
  },

  // 处理相册选择
  handleAIAlbum() {
    this.setData({
      aiImportMenuVisible: false,
      lastImportMethod: 'album'
    });

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.recognizeImageWithAI(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          wx.showToast({
//             title: '选择图片失败',
//             icon: 'none'
//           });
        }
      }
    });
  },

  // 处理语音输入
  handleAIVoice() {
    this.setData({
      aiImportMenuVisible: false,
      voiceRecordingVisible: true,
      lastImportMethod: 'voice'
    });

    // 初始化语音识别
    this.initVoiceRecognition();
  },

  // 初始化语音识别
  initVoiceRecognition() {
    // 获取插件
    const plugin = requirePlugin('WechatSI');
    const manager = plugin.getRecordRecognitionManager();

    this.data.voiceRecognitionManager = manager;

    // 监听识别开始
    manager.onStart = () => {
      console.log('语音识别开始');
      this.setData({
        isRecording: true,
        recordDuration: 0,
        recognizedText: ''
      });

      // 开始计时
      this.data.recordDurationTimer = setInterval(() => {
        this.setData({
          recordDuration: this.data.recordDuration + 1
        });
      }, 1000);
    };

    // 监听识别结果
    manager.onRecognize = (res) => {
      console.log('识别中:', res.result);
      this.setData({
        recognizedText: res.result
      });
    };

    // 监听识别结束
    manager.onStop = (res) => {
      console.log('识别结束:', res.result);

      // 停止计时
      if (this.data.recordDurationTimer) {
        clearInterval(this.data.recordDurationTimer);
        this.data.recordDurationTimer = null;
      }

      this.setData({
        isRecording: false,
        recognizedText: res.result
      });
    };

    // 监听识别错误
    manager.onError = (err) => {
      console.error('识别错误:', err);

      // 停止计时
      if (this.data.recordDurationTimer) {
        clearInterval(this.data.recordDurationTimer);
        this.data.recordDurationTimer = null;
      }

      this.setData({
        isRecording: false
      });

      wx.showToast({
//         title: '识别失败，请重试',
//         icon: 'none'
//       });
    };
  },

  // 切换录音状态
  toggleRecording() {
    const { isRecording, voiceRecognitionManager, recognizedText } = this.data;

    if (!isRecording) {
      // 开始录音
      if (voiceRecognitionManager) {
        voiceRecognitionManager.start({
          lang: 'zh_CN'
        });
      }
    } else {
      // 停止录音
      if (voiceRecognitionManager) {
        voiceRecognitionManager.stop();
      }

      // 处理识别结果
      if (recognizedText && recognizedText.trim() !== '') {
        this.handleVoiceRecordComplete(recognizedText);
      } else {
        wx.showToast({
//           title: '未识别到内容',
//           icon: 'none'
//         });
      }
    }
  },

  // 取消录音
  cancelRecording() {
    const { voiceRecognitionManager } = this.data;

    if (voiceRecognitionManager) {
      voiceRecognitionManager.stop();
    }

    // 停止计时
    if (this.data.recordDurationTimer) {
      clearInterval(this.data.recordDurationTimer);
      this.data.recordDurationTimer = null;
    }

    this.setData({
      voiceRecordingVisible: false,
      isRecording: false,
      recordDuration: 0,
      recognizedText: ''
    });
  },

  // 关闭语音录音弹窗
  onVoiceRecordClose() {
    this.cancelRecording();
  },

  // 处理语音录音完成
  async handleVoiceRecordComplete(text) {
    this.setData({
      voiceRecordingVisible: false
    });

    wx.showLoading({
      title: 'AI识别中...',
      mask: true
    });

    try {
      await this.parseVoiceTextWithAI(text);
    } catch (err) {
      console.error('AI解析失败:', err);
      wx.hideLoading();
      wx.showToast({
//         title: 'AI解析失败',
//         icon: 'none'
//       });
    }
  },

  // 使用AI解析语音文本
  async parseVoiceTextWithAI(text) {
    try {
      // 调用云函数进行AI解析
      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: [
            {
              role: 'user',
              content: `请从以下语音描述中提取EB病毒相关的检验数据：\n\n"${text}"\n\n请返回JSON格式：{ "indicators": [{ "id": "ebvDna", "label": "EB病毒DNA", "value": "数值", "unit": "IU/mL", "confidence": 90 }] }`
            }
          ],
          mode: 'unified'
        }
      });

      console.log('AI解析结果:', res);

      if (res.result && res.result.success && res.result.content) {
        const content = res.result.content;

        // 尝试提取JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);

          if (data.indicators && data.indicators.length > 0) {
            // 匹配当前配置的指标
            const { displayedBasicIndicators, customIndicators } = this.data;
            const allConfiguredIndicators = []
              .concat(displayedBasicIndicators)
              .concat(customIndicators);

            console.log('🔍 开始匹配AI识别的指标...');
            console.log('AI识别到的指标:', data.indicators);
            console.log('当前配置的指标:', allConfiguredIndicators);

            // 只保留能匹配到当前配置项的指标,并补充正确的中文label
            const matchedIndicators = data.indicators.map(aiItem => {
              // 尝试匹配配置的指标
              const matchedIndicator = allConfiguredIndicators.find(indicator =>
                aiItem.id === indicator.id || this.fuzzyMatch(aiItem.label, indicator.name)
              );

              if (matchedIndicator) {
                console.log(`✅ 匹配成功: ${aiItem.label} -> ${matchedIndicator.name}`);
                // 返回数据时,使用配置的中文名称作为label
                return {
                  ...aiItem,
                  id: matchedIndicator.id,
                  label: matchedIndicator.name,  // 使用配置的中文名称
                  unit: aiItem.unit || matchedIndicator.unit  // 优先使用AI识别的单位,否则使用配置的单位
                };
              } else {
                console.log(`❌ 未匹配: ${aiItem.label}`);
                return null;
              }
            }).filter(item => item !== null);  // 过滤掉未匹配的项

            console.log('🎯 最终匹配结果:', matchedIndicators);

            if (matchedIndicators.length > 0) {
              this.setData({
                aiRecognizedData: matchedIndicators
              });

              wx.hideLoading();

              // 显示识别结果
              this.setData({
                aiResultVisible: true
              });
            } else {
              wx.hideLoading();
              wx.showToast({
//                 title: '未识别到有效数据',
//                 icon: 'none'
//               });
            }
          } else {
            wx.hideLoading();
            wx.showToast({
//               title: '未识别到有效数据',
//               icon: 'none'
//             });
          }
        } else {
          wx.hideLoading();
          wx.showToast({
//             title: 'AI解析格式错误',
//             icon: 'none'
//           });
        }
      } else {
        wx.hideLoading();
        wx.showToast({
//           title: 'AI解析失败',
//           icon: 'none'
//         });
      }
    } catch (err) {
      console.error('AI解析错误:', err);
      wx.hideLoading();
      wx.showToast({
//         title: 'AI解析失败',
//         icon: 'none'
//       });
    }
  },

  // 模糊匹配指标名称
  fuzzyMatch(aiLabel, configName) {
    if (!aiLabel || !configName) return false;

    // 转小写比较
    const label = aiLabel.toLowerCase().trim();
    const name = configName.toLowerCase().trim();

    // 完全匹配
    if (label === name) return true;

    // 包含关系
    if (label.includes(name) || name.includes(label)) return true;

    // EBV相关的特殊匹配规则
    const ebvKeywords = [
      ['ebv', 'eb病毒', 'eb', 'ebvdna', 'ebv-dna', 'ebv dna'],
      ['数值', 'dna', 'dna数值']
    ];

    for (const keywords of ebvKeywords) {
      const labelMatches = keywords.some(keyword => label.includes(keyword));
      const nameMatches = keywords.some(keyword => name.includes(keyword));
      if (labelMatches && nameMatches) return true;
    }

    return false;
  },

  // 使用AI识别图片
  async recognizeImageWithAI(tempFilePath) {
    wx.showLoading({
      title: 'AI识别中...',
      mask: true
    });

    try {
      // 读取图片文件为base64
      const fileSystemManager = wx.getFileSystemManager();
      const base64 = await new Promise((resolve, reject) => {
        fileSystemManager.readFile({
          filePath: tempFilePath,
          encoding: 'base64',
          success: (res) => resolve(res.data),
          fail: reject
        });
      });

      // 调用云函数进行OCR识别
      const ocrRes = await wx.cloud.callFunction({
        name: 'ocrFunction',
        data: {
          imgBase64: base64,
          imgType: 'png'
        }
      });

      console.log('OCR识别结果:', ocrRes);

      if (ocrRes.result && ocrRes.result.items && ocrRes.result.items.length > 0) {
        // 提取OCR文本
        const ocrText = ocrRes.result.items.map(item => item.text).join('\n');
        console.log('OCR文本:', ocrText);

        // 使用AI解析OCR文本
        const aiRes = await wx.cloud.callFunction({
          name: 'callSiliconFlowAI',
          data: {
            messages: [
              {
                role: 'user',
                content: `请从以下检验报告文本中提取EB病毒相关的数据：\n\n${ocrText}\n\n请返回JSON格式：{ "indicators": [{ "id": "ebvDna", "label": "EB病毒DNA", "value": "数值", "unit": "IU/mL", "confidence": 90 }] }`
              }
            ],
            mode: 'unified'
          }
        });

        console.log('AI解析结果:', aiRes);

        if (aiRes.result && aiRes.result.success && aiRes.result.content) {
          const content = aiRes.result.content;

          // 尝试提取JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);

            if (data.indicators && data.indicators.length > 0) {
              // 匹配当前配置的指标
              const { displayedBasicIndicators, customIndicators } = this.data;
              const allConfiguredIndicators = []
                .concat(displayedBasicIndicators)
                .concat(customIndicators);

              console.log('🔍 开始匹配AI识别的指标...');
              console.log('AI识别到的指标:', data.indicators);
              console.log('当前配置的指标:', allConfiguredIndicators);

              // 只保留能匹配到当前配置项的指标,并补充正确的中文label
              const matchedIndicators = data.indicators.map(aiItem => {
                // 尝试匹配配置的指标
                const matchedIndicator = allConfiguredIndicators.find(indicator =>
                  aiItem.id === indicator.id || this.fuzzyMatch(aiItem.label, indicator.name)
                );

                if (matchedIndicator) {
                  console.log(`✅ 匹配成功: ${aiItem.label} -> ${matchedIndicator.name}`);
                  // 返回数据时,使用配置的中文名称作为label
                  return {
                    ...aiItem,
                    id: matchedIndicator.id,
                    label: matchedIndicator.name,  // 使用配置的中文名称
                    unit: aiItem.unit || matchedIndicator.unit,  // 优先使用AI识别的单位,否则使用配置的单位
                    confidence: aiItem.confidence || 85,
                    confidenceColor: this.getConfidenceColor(aiItem.confidence || 85)
                  };
                } else {
                  console.log(`❌ 未匹配: ${aiItem.label}`);
                  return null;
                }
              }).filter(item => item !== null);  // 过滤掉未匹配的项

              console.log('🎯 最终匹配结果:', matchedIndicators);

              if (matchedIndicators.length > 0) {
                this.setData({
                  aiRecognizedData: matchedIndicators
                });

                wx.hideLoading();

                // 显示识别结果
                this.setData({
                  aiResultVisible: true
                });
              } else {
                wx.hideLoading();
                wx.showToast({
//                   title: '未识别到有效数据',
//                   icon: 'none'
//                 });
              }
            } else {
              wx.hideLoading();
              wx.showToast({
//                 title: '未识别到有效数据',
//                 icon: 'none'
//               });
            }
          } else {
            wx.hideLoading();
            wx.showToast({
//               title: 'AI解析格式错误',
//               icon: 'none'
//             });
          }
        } else {
          wx.hideLoading();
          wx.showToast({
//             title: 'AI解析失败',
//             icon: 'none'
//           });
        }
      } else {
        wx.hideLoading();
        wx.showToast({
//           title: 'OCR识别失败',
//           icon: 'none'
//         });
      }
    } catch (err) {
      console.error('图片识别错误:', err);
      wx.hideLoading();
      wx.showToast({
//         title: '识别失败，请重试',
//         icon: 'none'
//       });
    }
  },

  // 根据置信度获取颜色
  getConfidenceColor(confidence) {
    if (confidence >= 90) {
      return '#4CAF50'; // 绿色 - 高置信度
    } else if (confidence >= 70) {
      return '#FF9800'; // 橙色 - 中等置信度
    } else {
      return '#F44336'; // 红色 - 低置信度
    }
  },

  // 关闭AI识别结果弹窗
  onAIResultClose() {
    this.setData({
      aiResultVisible: false
    });
  },

  // 重新识别
  retryAIIdentify() {
    this.setData({
      aiResultVisible: false
    });

    // 根据上次的导入方式重新识别
    const { lastImportMethod } = this.data;

    if (lastImportMethod === 'camera') {
      this.handleAICamera();
    } else if (lastImportMethod === 'album') {
      this.handleAIAlbum();
    } else if (lastImportMethod === 'voice') {
      this.handleAIVoice();
    } else {
      // 默认显示选项菜单
      this.showAIIdentifyOptions();
    }
  },

  // 确认AI识别结果并填充
  confirmAIResult() {
    const { aiRecognizedData, formData } = this.data;

    if (aiRecognizedData.length === 0) {
      wx.showToast({
//         title: '没有可填充的数据',
//         icon: 'none'
//       });
      return;
    }

    // 填充数据到表单
    const newFormData = { ...formData };

    aiRecognizedData.forEach(item => {
      if (item.id && item.value) {
        newFormData[item.id] = item.value.toString();
      }
    });

    this.setData({
      formData: newFormData,
      aiResultVisible: false
    });

    wx.showToast({
//       title: `已填充${aiRecognizedData.length}个指标`,
//       icon: 'success'
//     });
  },

  // ==================== 原有功能 ====================

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
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
