// 移除Toast import，使用wx.showToast替代

Page({
  data: {
    // 选中的日期
    selectedDate: '',

    // 日期选择器状态
    datePickerVisible: false,

    // 基础表单数据
    formData: {
      cr: '',
      bun: '',
      ua: ''
    },

    // 正常范围参考值
    normalRanges: {
      cr: { min: '57', max: '111' },
      bun: { min: '3.6', max: '9.5' }
    },

    // 自定义指标列表
    customIndicators: [],

    // 用户选中的指标配置
    userIndicatorConfig: {
      cr: true,
      bun: true
    },

    // 显示的基础指标
    displayedBasicIndicators: [
      { id: 'cr', name: '肌酐', min: '44', max: '133', unit: 'μmol/L' },
      { id: 'bun', name: '尿素氮', min: '2.9', max: '8.2', unit: 'mmol/L' },
      { id: 'ua', name: '尿酸', min: '208', max: '428', unit: 'μmol/L' }
    ],

    // 用户信息
    openid: '',
    currentProfileId: '',

    // 当前记录ID（编辑模式）
    recordId: '',
    isLoggedIn: false,

    // 焦点索引
    focusIndex: -1
  },

  // 页面初始化
  onLoad(options) {


    // 设置基础数据
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const selectedDate = options.date || todayStr; // 如果有传入日期就使用传入的，否则使用今天

    this.setData({
      selectedDate: selectedDate,
      recordId: options.recordId || ''
    });


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
    if (app.globalData.temporaryKidneyFunctionConfig) {

      this.loadTemporaryConfiguration();

      // 🔧 关键修复：恢复用户之前的输入
      this.restoreTemporaryUserInput();
    } else if (app.globalData.needRefreshKidneyFunctionConfig || app.globalData.indicatorConfigChanged) {
      app.globalData.needRefreshKidneyFunctionConfig = false;
      app.globalData.indicatorConfigChanged = false;

      wx.showLoading({
        title: '刷新配置中...',
        mask: true
      });

      this.loadCompleteConfiguration().then(() => {
        wx.hideLoading();
      }).catch(err => {

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
    // 清理临时配置（如果未保存）
    this.cleanupTemporaryConfigIfNotSaved();
  },

  // 加载临时配置预览
  loadTemporaryConfiguration() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryKidneyFunctionConfig;

    if (!tempConfig || !tempConfig.isTemporary) {

      return;
    }



    // 根据临时配置构建显示的指标列表
    const { selectedIndicators, customIndicators, indicatorConfigs } = tempConfig;

    // 构建基础指标列表
    const basicIndicators = [
      { id: 'cr', name: '肌酐', min: '44', max: '133', unit: 'μmol/L' },
      { id: 'bun', name: '尿素氮', min: '2.9', max: '8.2', unit: 'mmol/L' },
      { id: 'ua', name: '尿酸', min: '208', max: '428', unit: 'μmol/L' },
      { id: 'egfr', name: 'eGFR', min: '90', max: '120', unit: 'ml/min/1.73m²' },
      { id: 'cysc', name: '胱抑素C', min: '0.51', max: '1.09', unit: 'mg/L' },
      { id: 'b2mg', name: 'β2微球蛋白', min: '0.7', max: '1.8', unit: 'mg/L' },
      { id: 'rtn', name: '视黄醇结合蛋白', min: '20', max: '60', unit: 'mg/L' },
      { id: 'upro', name: '尿蛋白', min: '0', max: '150', unit: 'mg/L' },
      { id: 'microalb', name: '微量白蛋白', min: '0', max: '30', unit: 'mg/L' }
    ];

    // 过滤出被选中的基础指标
    const displayedBasicIndicators = basicIndicators.filter(indicator => {
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
      isTemporaryConfig: true // 标记当前使用临时配置
    });

    // 显示预览提示
    wx.showToast({
      title: '加载配置预览，保存后生效',
      icon: 'none',
      duration: 2500
    });

    console.log('✅ 肾功能临时配置预览加载完成:', {
      basicCount: displayedBasicIndicators.length,
      customCount: displayedCustomIndicators.length
    });
  },

  // 恢复用户之前的输入
  restoreTemporaryUserInput() {
    const app = getApp();
    const tempInput = app.globalData.temporaryKidneyFunctionInput;

    if (!tempInput || !tempInput.formData) {

      return;
    }

    // 检查时间戳，超过10分钟就忽略
    const now = Date.now();
    const savedTime = tempInput.savedAt || 0;
    const isValid = (now - savedTime) < 10 * 60 * 1000; // 10分钟

    if (!isValid) {

      delete app.globalData.temporaryKidneyFunctionInput;
      return;
    }

    // 检查日期是否匹配
    if (tempInput.selectedDate === this.data.selectedDate) {


      // 恢复表单数据，但不覆盖现有数据（如果有的话）
      const currentFormData = this.data.formData || {};
      const restoredFormData = { ...currentFormData };

      Object.keys(tempInput.formData).forEach(key => {
        if (!restoredFormData[key] || restoredFormData[key].trim() === '') {
          restoredFormData[key] = tempInput.formData[key];
        }
      });

      this.setData({
        formData: restoredFormData
      });
    }
  },

  // 清理临时配置（如果未保存）
  cleanupTemporaryConfigIfNotSaved() {
    const app = getApp();
    if (app.globalData.temporaryKidneyFunctionConfig) {

      delete app.globalData.temporaryKidneyFunctionConfig;
    }
    if (app.globalData.temporaryKidneyFunctionInput) {

      delete app.globalData.temporaryKidneyFunctionInput;
    }
  },

  // 保存临时配置到数据库（当用户点击完成时）
  async saveTemporaryConfigIfExists() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryKidneyFunctionConfig;

    if (!tempConfig || !tempConfig.isTemporary) {

      return;
    }



    const { openid, currentProfileId, selectedDate } = this.data;
    const { selectedIndicators, customIndicators, dateType: configDateType } = tempConfig;

    try {
      const db = wx.cloud.database();

      // 1. 保存自定义指标设置（如果有新增的）
      const newCustomIndicators = customIndicators.filter(indicator =>
        indicator.id.startsWith('custom_')
      );

      for (const indicator of newCustomIndicators) {
        // 检查是否已存在
        const existingRes = await db.collection('kidneyFunctionSettings')
          .where({
            openid: openid,
            profileId: currentProfileId,
            indicatorId: indicator.id
          })
          .get();

        if (existingRes.data.length === 0) {
          // 新增自定义指标
          await db.collection('kidneyFunctionSettings').add({
            data: {
              openid: openid,
              profileId: currentProfileId,
              indicatorId: indicator.id,
              name: indicator.fullName,
              shortName: indicator.shortName,
              minValue: indicator.min,
              maxValue: indicator.max,
              unit: indicator.unit,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });

        }
      }

      // 2. 保存配置选择状态
      const existingConfigRes = await db.collection('kidneyFunctionConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (existingConfigRes.data.length > 0) {
        // 更新现有配置
        await db.collection('kidneyFunctionConfig')
          .doc(existingConfigRes.data[0]._id)
          .update({
            data: {
              selectedIndicators: selectedIndicators,
              updateTime: db.serverDate()
            }
          });
      } else {
        // 创建新配置
        await db.collection('kidneyFunctionConfig').add({
          data: {
            openid: openid,
            profileId: currentProfileId,
            date: selectedDate,
            selectedIndicators: selectedIndicators,
            updateTime: db.serverDate()
          }
        });
      }

      // 3. 清理临时配置数据
      delete app.globalData.temporaryKidneyFunctionConfig;
      this.setData({ isTemporaryConfig: false });



      // 4. 设置刷新标志，让其他页面知道配置已更新
      if (app.globalData) {
        app.globalData.needRefreshKidneyFunctionConfig = true;
      }

    } catch (err) {

      // 不影响主流程，只是警告
      wx.showToast({
        title: '配置保存部分失败',
        icon: 'none',
        duration: 2000
      });
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
        cr: '',
        bun: '',
        ua: ''
      },
      displayedBasicIndicators: [
        { id: 'cr', name: '肌酐', min: '44', max: '133', unit: 'μmol/L' },
        { id: 'bun', name: '尿素氮', min: '2.9', max: '8.2', unit: 'mmol/L' },
        { id: 'ua', name: '尿酸', min: '208', max: '428', unit: 'μmol/L' }
      ],
      customIndicators: []
    });

    // 加载真正的配置
    this.loadCompleteConfiguration().then(() => {
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
                        title: '图片过大，请选择更小的图片',
                        icon: 'none',
                        duration: 2500
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
                              title: '识别失败: ' + (cloudRes.result.error || '未知错误'),
                              icon: 'none',
                              duration: 2500
                            });
                          } else if (cloudRes.result.items && cloudRes.result.items.length > 0) {
                            // 解析OCR结果
                            that.parseOCRResult(cloudRes.result.items);
                          } else {
                            wx.showToast({
                              title: '未识别到有效内容',
                              icon: 'none'
                            });
                          }
                        } else {
                          console.error('云函数返回异常:', cloudRes);
                          if (cloudRes.errMsg) {
                            wx.showToast({
                              title: '识别服务异常: ' + cloudRes.errMsg,
                              icon: 'none',
                              duration: 2500
                            });
                          } else {
                            wx.showToast({
                              title: '识别服务异常，请重新部署云函数',
                              icon: 'none',
                              duration: 3000
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
                            title: '图片数据过大，请选择更小的图片',
                            icon: 'none',
                            duration: 3000
                          });
                        } else {
                          wx.showToast({
                            title: '调用识别服务失败',
                            icon: 'none'
                          });
                        }
                      }
                    });
                  },
                  fail: function (err) {
                    wx.hideLoading();
                    console.error('读取图片失败:', err);
                    wx.showToast({
                      title: '读取图片失败',
                      icon: 'none'
                    });
                  }
                });
              },
              fail: function (err) {
                wx.hideLoading();
                console.error('压缩图片失败:', err);
                wx.showToast({
                  title: '压缩图片失败',
                  icon: 'none'
                });
              }
            });
          },
          fail: function (err) {
            wx.hideLoading();
            console.error('获取图片信息失败:', err);
            wx.showToast({
              title: '获取图片信息失败',
              icon: 'none'
            });
          }
        });
      },
      fail: function (err) {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 解析OCR结果
  parseOCRResult(items) {
    const that = this;
    let recognizedCount = 0;
    const newFormData = { ...that.data.formData };

    // 肾功能相关关键词映射
    const kidneyKeywordMap = {
      'CR': ['cr'],
      'Cr': ['cr'],
      'cr': ['cr'],
      '肌酐': ['cr'],
      'BUN': ['bun'],
      'Bun': ['bun'],
      'bun': ['bun'],
      '尿素氮': ['bun'],
      'UA': ['ua'],
      'Ua': ['ua'],
      'ua': ['ua'],
      '尿酸': ['ua']
    };

    console.log('开始解析OCR结果:', items);

    items.forEach(item => {
      const text = item.text;
      console.log('处理文本:', text);

      // 检查每个关键词
      Object.keys(kidneyKeywordMap).forEach(keyword => {
        if (text.includes(keyword)) {
          console.log('找到关键词:', keyword, '在文本:', text);

          // 尝试提取数值
          const numberMatch = text.match(/[\d.,]+/);
          if (numberMatch) {
            const value = numberMatch[0];
            console.log('提取到数值:', value);

            // 映射到对应的表单字段
            kidneyKeywordMap[keyword].forEach(fieldName => {
              if (that.data.userIndicatorConfig[fieldName] ||
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
        title: `成功识别${recognizedCount}个指标`,
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '未识别到相关指标',
        icon: 'none'
      });
    }
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
    this.setData({
      focusIndex: nextIndex
    });
  },

  // 点击"完成"按钮收起键盘
  completeInput() {
    this.setData({
      focusIndex: -1
    });
    wx.showToast({
      title: '输入完成',
      icon: 'success',
      duration: 1000
    });
  },

  // 配置指标
  configIndicators() {
    // 检查用户登录状态
    const { openid, currentProfileId, selectedDate, formData } = this.data;
    if (!openid || !currentProfileId) {
      wx.showToast({
        title: '请先登录并选择档案',
        icon: 'none'
      });
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

    // 🔧 修复：只保存有意义的用户输入，避免保存残留数据
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
        app.globalData.temporaryKidneyFunctionInput = {
          formData: cleanFormData,
          selectedDate: this.data.selectedDate,
          recordId: this.data.recordId,
          savedAt: Date.now()
        };

      } else {
        // 如果没有用户输入，清除可能存在的临时数据
        delete app.globalData.temporaryKidneyFunctionInput;

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
      url: `/packageA/pages/kidney-function-config/index?date=${selectedDate}`,
      fail: (err) => {

        wx.showToast({
          title: '打开配置页面失败',
          icon: 'none'
        });
      }
    });
  },

  // 查看历史记录
  viewHistory() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
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
        title: '请先登录并选择档案',
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

      // 检查是否为空
      if (!value || value.toString().trim() === '') {
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

      return;
    }

    try {
      const db = wx.cloud.database();

      // 🔧 重新设计：总是根据日期查询记录，不依赖recordId，确保操作正确的记录
      const existingRes = await db.collection('kidneyFunctionTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      let isNewRecord = existingRes.data.length === 0;
      let targetRecordId = isNewRecord ? null : existingRes.data[0]._id;

      if (isNewRecord) {
        // 🔧 新增数据
        const saveData = {
          openid,
          profileId: currentProfileId,
          date: selectedDate,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          type: 'kidney-function'
        };

        // 保存当前显示且有值的指标
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value && value.toString().trim() !== '') {
            saveData[indicatorId] = parseFloat(value);
          }
        });

        const res = await db.collection('kidneyFunctionTests').add({
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
        // 更新现有记录
        const updateData = {
          updateTime: db.serverDate()
        };

        // 更新当前显示且有值的指标
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value && value.toString().trim() !== '') {
            updateData[indicatorId] = parseFloat(value);
          }
        });

        await db.collection('kidneyFunctionTests')
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

          }
        });
      }, 1000); // 给用户1秒时间看到成功提示

    } catch (err) {

      wx.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 删除记录
  async deleteRecord() {
    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    const { openid, currentProfileId, selectedDate } = this.data;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('kidneyFunctionTests')
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
        content: `确定要删除 ${selectedDate} 的肾功能记录吗？`,
        confirmText: '删除',
        cancelText: '取消',
        success: async (modalRes) => {
          if (!modalRes.confirm) {
            wx.hideLoading();
            return;
          }

          if (modalRes.confirm) {
            try {
              // 删除肾功能记录
              await db.collection('kidneyFunctionTests').doc(actualRecordId).remove();

              // 通知首页和健康档案刷新
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

              // 删除成功后返回每日记录页面
              setTimeout(() => {
                wx.navigateBack({
                  fail: (err) => {

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

    console.log('肾功能页面 - 获取用户信息:', {
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

  // 加载配置的主方法
  async loadCompleteConfiguration() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId || !selectedDate) {

      return;
    }



    wx.showLoading({
      title: '加载配置...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 🔥 1. 查询当前日期的配置
      let currentDateConfigRes;
      let customSettingsRes;

      try {
        currentDateConfigRes = await db.collection('kidneyFunctionConfig')
          .where({
            openid: openid,
            profileId: currentProfileId,
            date: selectedDate
          })
          .get();

      } catch (configErr) {

        currentDateConfigRes = { data: [] };
      }

      // 🔥 2. 查询自定义指标设置
      try {
        customSettingsRes = await db.collection('kidneyFunctionSettings')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .get();

      } catch (customErr) {

        customSettingsRes = { data: [] };
      }





      // 🔥 3. 构建配置的优先级逻辑（与配置页面保持一致）
      let config = {
        cr: true,
        bun: true,
        ua: true,
        egfr: false,
        cysc: false,
        b2mg: false,
        rtn: false,
        upro: false,
        microalb: false
      };

      if (currentDateConfigRes.data.length > 0) {
        // 优先级1：如果有当前日期的专用配置，直接使用

        config = currentDateConfigRes.data[0].selectedIndicators || config;

      } else {
        // 🔥 尝试继承今日或最近的配置（对照血常规逻辑）

        try {
          // 查找今日的配置（如果当前不是今日）
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          if (selectedDate !== todayStr) {
            const todayConfigRes = await db.collection('kidneyFunctionConfig')
              .where({
                openid: openid,
                profileId: currentProfileId,
                date: today
              })
              .get();

            if (todayConfigRes.data.length > 0) {

              config = todayConfigRes.data[0].selectedIndicators || config;

            } else {

              // 查找最近的配置
              const recentConfigRes = await db.collection('kidneyFunctionConfig')
                .where({
                  openid: openid,
                  profileId: currentProfileId
                })
                .orderBy('date', 'desc')
                .limit(1)
                .get();

              if (recentConfigRes.data.length > 0) {

                config = recentConfigRes.data[0].selectedIndicators || config;

              } else {

              }
            }
          } else {

          }
        } catch (inheritErr) {

        }
      }

      // 🔥 4. 构建基础指标列表（与配置页面保持一致）
      const basicIndicators = [
        { id: 'cr', name: '肌酐', min: '44', max: '133', unit: 'μmol/L' },
        { id: 'bun', name: '尿素氮', min: '2.9', max: '8.2', unit: 'mmol/L' },
        { id: 'ua', name: '尿酸', min: '208', max: '428', unit: 'μmol/L' },
        { id: 'egfr', name: 'eGFR', min: '90', max: '120', unit: 'ml/min/1.73m²' },
        { id: 'cysc', name: '胱抑素C', min: '0.51', max: '1.09', unit: 'mg/L' },
        { id: 'b2mg', name: 'β2微球蛋白', min: '0.7', max: '1.8', unit: 'mg/L' },
        { id: 'rtn', name: '视黄醇结合蛋白', min: '20', max: '60', unit: 'mg/L' },
        { id: 'upro', name: '尿蛋白', min: '0', max: '150', unit: 'mg/L' },
        { id: 'microalb', name: '微量白蛋白', min: '0', max: '30', unit: 'mg/L' }
      ];

      // 🔥 5. 过滤出被选中的基础指标
      const displayedBasicIndicators = basicIndicators.filter(indicator => {
        return config[indicator.id] === true;
      });

      // 🔥 6. 构建自定义指标列表
      const customIndicators = customSettingsRes.data
        .filter(setting => setting.indicatorId && setting.indicatorId.startsWith('custom_'))
        .filter(setting => config[setting.indicatorId] === true)
        .map(setting => ({
          id: setting.indicatorId,
          name: setting.name,
          min: setting.minValue,
          max: setting.maxValue,
          unit: setting.unit
        }));

      // 🔥 7. 初始化表单数据
      const allIndicatorIds = [].concat(
        displayedBasicIndicators.map(item => item.id),
        customIndicators.map(item => item.id)
      );
      const initialFormData = {};
      allIndicatorIds.forEach(id => {
        initialFormData[id] = '';
      });

      // 保护用户当前输入，不要被配置更新覆盖
      const currentFormData = this.data.formData || {};
      const mergedFormData = { ...initialFormData };

      // 保留用户已有的输入
      Object.keys(currentFormData).forEach(key => {
        if (currentFormData[key] && currentFormData[key].toString().trim() !== '') {
          mergedFormData[key] = currentFormData[key];
        }
      });

      this.setData({
        userIndicatorConfig: config,
        displayedBasicIndicators: displayedBasicIndicators || [],
        customIndicators: customIndicators || [],
        formData: mergedFormData
      });

      // 检查合并后的数据是否有用户输入
      const hasUserInput = Object.values(mergedFormData || {}).some(value =>
        value && value.toString().trim() !== ''
      );

      if (!hasUserInput) {
        if (this.data.recordId) {
          this.loadRecordData(this.data.recordId);
        } else {
          this.loadTodayData();
        }
      }





    } catch (err) {

      // 发生错误时使用默认配置，不阻塞用户使用
      const defaultBasicIndicators = [
        { id: 'cr', name: '肌酐', min: '44', max: '133', unit: 'μmol/L' },
        { id: 'bun', name: '尿素氮', min: '2.9', max: '8.2', unit: 'mmol/L' },
        { id: 'ua', name: '尿酸', min: '208', max: '428', unit: 'μmol/L' }
      ];

      this.setData({
        userIndicatorConfig: {
          cr: true, bun: true, ua: true,
          egfr: false, cysc: false, b2mg: false,
          rtn: false, upro: false, microalb: false
        },
        displayedBasicIndicators: [
          { id: 'cr', name: '肌酐', min: '44', max: '133', unit: 'μmol/L' },
          { id: 'bun', name: '尿素氮', min: '2.9', max: '8.2', unit: 'mmol/L' },
          { id: 'ua', name: '尿酸', min: '208', max: '428', unit: 'μmol/L' }
        ],
        customIndicators: [],
        formData: { cr: '', bun: '', ua: '' }
      });

      wx.showToast({
        title: '配置加载部分失败，使用默认配置',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载指定日期的数据
  async loadTodayData() {
    // 立即检查是否有用户输入，如果有就不加载数据
    const currentFormData = this.data.formData || {};
    const hasUserInput = Object.values(currentFormData).some(value =>
      value && value.toString().trim() !== ''
    );

    if (hasUserInput) {
      return; // 有用户输入就直接返回，不覆盖
    }

    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) {
      return;
    }



    try {
      const db = wx.cloud.database();

      const res = await db.collection('kidneyFunctionTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();



      if (res.data.length > 0) {
        const data = res.data[0];


        // 获取当前已配置的指标ID
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
        const allCustomIndicatorIds = customIndicators.map(item => item.id);
        const allConfiguredIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

        // 构建完整的formData，包含数据库中所有存在的数据
        const formData = {};

        // 加载当前配置中的指标数据
        allConfiguredIds.forEach(indicatorId => {
          // 🔥 修复：正确处理0值，不能用 || 运算符
          formData[indicatorId] = (data[indicatorId] !== undefined && data[indicatorId] !== null) ? data[indicatorId] : '';
        });

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



      } else {


        // 清空表单数据，但保持现有配置
        const { displayedBasicIndicators, customIndicators } = this.data;

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

    }
  },

  // 加载指定记录数据
  async loadRecordData(recordId) {
    // 立即检查是否有用户输入，如果有就不加载数据
    const currentFormData = this.data.formData || {};
    const hasUserInput = Object.values(currentFormData).some(value =>
      value && value.toString().trim() !== ''
    );

    if (hasUserInput) {
      return; // 有用户输入就直接返回，不覆盖
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('kidneyFunctionTests').doc(recordId).get();

      if (res.data) {
        const data = res.data;

        // 获取当前已配置的指标ID
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
        const allCustomIndicatorIds = customIndicators.map(item => item.id);
        const allConfiguredIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

        // 构建完整的formData
        const formData = {};

        // 加载当前配置中的指标数据
        allConfiguredIds.forEach(indicatorId => {
          // 🔥 修复：正确处理0值，不能用 || 运算符
          formData[indicatorId] = (data[indicatorId] !== undefined && data[indicatorId] !== null) ? data[indicatorId] : '';
        });

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

    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      fail: (err) => {

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

      wx.hideLoading();
      this.setData({ isLoggedIn: false });
      wx.reLaunch({
        url: '/pages/profile/index'
      });
      return;
    }

    const currentProfileId = app.getCurrentProfileId();
    if (!currentProfileId) {

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



    // 加载用户配置
    this.loadCompleteConfiguration().then(() => {
      wx.hideLoading();
    }).catch(err => {

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