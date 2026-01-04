// 引入ID生成工具
const { generateCustomIndicatorId } = require('../../utils/idGenerator');

Page({
  data: {
    // 选中的指标
    selectedIndicators: {
      wbc: true,   // 默认选中
      neut: true,  // 默认选中
      hgb: true,   // 默认选中
      plt: true,   // 默认选中
      rbc: false,  // 可选指标
      crp: false,  // 可选指标 - C反应蛋白
      hct: false,  // 可选指标
      lymph: false, // 可选指标
      mono: false  // 可选指标
    },

    // 当前日期数据状态
    currentDateInfo: {
      date: '',
      hasDataIndicators: [],
      totalDisplayedCount: 0,
      hasAnyData: false
    },

    // 必选指标（不能取消勾选）
    requiredIndicators: ['wbc', 'neut', 'hgb', 'plt'],

    // 所有指标的配置信息
    indicatorConfigs: {
      wbc: { name: '白细胞', unit: '×10⁹/L' },
      neut: { name: '中性粒', unit: '×10⁹/L' },
      hgb: { name: '血红蛋白', unit: 'g/L' },
      plt: { name: '血小板', unit: '×10⁹/L' },
      rbc: { name: '红细胞', unit: '×10¹²/L' },
      crp: { name: 'C反应蛋白', unit: 'mg/L' },
      hct: { name: '红细胞压积', unit: '%' },
      lymph: { name: '淋巴细胞绝对值', unit: '×10⁹/L' },
      mono: { name: '单核细胞绝对值', unit: '×10⁹/L' }
    },

    // 自定义指标列表
    customIndicators: [],

    // 用户信息
    openid: '',
    currentProfileId: '',

    // 🔧 当前编辑的日期
    editingDate: '',

    // 📅 日期类型：today, past, future
    dateType: '',

    // 📋 配置继承信息
    configInheritInfo: {
      isInherited: false,
      inheritedFrom: ''
    },

    // 🔧 状态管理：区分原始配置和临时修改
    originalConfig: {
      selectedIndicators: {},
      customIndicators: [],
      indicatorConfigs: {}
    },


    // 编辑弹窗相关
    editDialogVisible: false,
    editingIndicator: null,
    isAddMode: false, // 是否为添加模式
    isCustomIndicator: false, // 是否为自定义指标（用于显示删除按钮）
    editForm: {
      name: '',
      unit: ''
    }
  },

  onLoad(options) {
    // 获取要编辑的日期
    const editingDate = options.date || '';
    if (editingDate) {
      const dateType = this.determineDateType(editingDate);
      this.setData({
        editingDate,
        dateType
      });
    }

    // 获取用户信息并加载配置
    const userInfoSuccess = this.getUserInfo();
    if (userInfoSuccess) {
      // 🔧 关键修复：检查是否有临时配置（用户之前的未保存修改）
      const app = getApp();
      if (app.globalData && app.globalData.temporaryBloodTestConfig &&
        app.globalData.temporaryBloodTestConfig.configDate === editingDate) {

        this.loadTemporaryBloodTestConfigToPage();
      } else {

        this.loadIndicatorConfig();
      }
    }
  },

  // 判断日期类型
  determineDateType(targetDate) {
    // 使用本地时区获取今天的日期
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (targetDate === todayStr) {
      return 'today';
    } else if (targetDate < todayStr) {
      return 'past';
    } else {
      return 'future';
    }
  },

  // 页面卸载
  onUnload() {

  },

  // 页面隐藏
  onHide() {

  },

  // 🔧 清理临时配置数据
  cleanupTemporaryConfig() {
    const app = getApp();
    if (app.globalData && app.globalData.temporaryBloodTestConfig) {

      delete app.globalData.temporaryBloodTestConfig;
    }
  },

  // 确保设置刷新标志的统一方法
  ensureRefreshFlag() {
    const app = getApp();
    if (app.globalData) {
      // 只要页面被访问过，就设置刷新标志，确保血常规页面会重新加载
      app.globalData.needRefreshBloodTestConfig = true;

    }
  },

  onShow() {


    // 🆕 检查是否有血常规数据删除事件
    this.handleBloodTestDataDeleted();

    // 加载当前日期的数据状态
    this.loadCurrentDateContext();

    // 🔧 修复配置回显问题：优先从数据库加载最新配置，只有在用户正在编辑时才使用临时配置
    const app = getApp();
    const hasTemporaryConfig = app.globalData && app.globalData.temporaryBloodTestConfig && app.globalData.temporaryBloodTestConfig.isTemporary;

    // 首先总是尝试从数据库加载最新配置
    if (this.data.openid && this.data.currentProfileId) {

      this.loadIndicatorConfig().then(() => {
        // 数据库配置加载完成后，如果有有效的临时配置，则用临时配置覆盖
        if (hasTemporaryConfig && this.shouldUseTemporaryConfig()) {

          this.loadTemporaryConfigurationToPage();
        }
      });
    } else {
      // 如果没有用户信息，尝试重新获取
      const userInfoSuccess = this.getUserInfo();
      if (userInfoSuccess) {
        this.loadIndicatorConfig();
      }
    }
  },

  // 🆕 处理血常规数据删除事件
  handleBloodTestDataDeleted() {
    const app = getApp();
    if (app.globalData && app.globalData.bloodTestDataDeleted) {
      const deleteInfo = app.globalData.bloodTestDataDeleted;
      const { date, configAlsoDeleted, timestamp } = deleteInfo;



      // 检查事件是否还有效（1分钟内）
      const isValid = (Date.now() - timestamp) < 60 * 1000;
      if (!isValid) {

        delete app.globalData.bloodTestDataDeleted;
        return;
      }

      // 检查是否是当前编辑的日期
      if (date === this.data.editingDate) {


        if (configAlsoDeleted) {

          // 重置选中状态到默认
          this.setData({
            selectedIndicators: {
              wbc: true,   // 必选指标
              neut: true,  // 必选指标
              hgb: true,   // 必选指标
              plt: true,   // 必选指标
              rbc: false,  // 可选指标
              crp: false,  // 可选指标 - C反应蛋白
              hct: false,  // 可选指标
              lymph: false, // 可选指标
              mono: false  // 可选指标
            }
          });

          wx.showToast({
            title: `${date} 的配置已重置`,
            icon: 'none',
            duration: 2000
          });
        } else {

          // 只需要更新数据状态显示
          this.setData({
            currentDateInfo: {
              ...this.data.currentDateInfo,
              hasDataIndicators: [],
              totalDisplayedCount: 0,
              hasAnyData: false
            }
          });

          wx.showToast({
            title: `${date} 的数据已删除`,
            icon: 'none',
            duration: 1500
          });
        }
      } else {

      }

      // 清除已处理的事件
      delete app.globalData.bloodTestDataDeleted;
    }
  },

  // 🔧 判断是否应该使用临时配置
  shouldUseTemporaryConfig() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBloodTestConfig;

    if (!tempConfig || !tempConfig.isTemporary) {
      return false;
    }

    // 检查临时配置的日期是否匹配当前编辑日期
    if (tempConfig.configDate !== this.data.editingDate) {

      return false;
    }

    // 检查是否是最近的临时配置（30分钟内创建的）
    const now = Date.now();
    const configTime = tempConfig.createdAt || 0;
    const isRecent = (now - configTime) < 30 * 60 * 1000; // 30分钟

    if (!isRecent) {

      // 清理过期的临时配置
      delete app.globalData.temporaryBloodTestConfig;
      return false;
    }


    return true;
  },

  // 🆕 加载临时配置到配置页面（用于回显）
  loadTemporaryConfigurationToPage() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBloodTestConfig;

    if (!tempConfig || !tempConfig.isTemporary) {

      return;
    }



    // 从临时配置中恢复状态
    const { selectedIndicators, customIndicators, indicatorConfigs } = tempConfig;

    this.setData({
      selectedIndicators: JSON.parse(JSON.stringify(selectedIndicators)),
      customIndicators: JSON.parse(JSON.stringify(customIndicators)),
      indicatorConfigs: JSON.parse(JSON.stringify(indicatorConfigs))
    });

    // 也更新原始配置状态，防止被认为有变更
    this.setData({
      originalConfig: {
        selectedIndicators: JSON.parse(JSON.stringify(selectedIndicators)),
        customIndicators: JSON.parse(JSON.stringify(customIndicators)),
        indicatorConfigs: JSON.parse(JSON.stringify(indicatorConfigs))
      }
    });


  },

  // 加载当前日期数据状态
  loadCurrentDateContext() {
    const app = getApp();
    if (app.globalData && app.globalData.currentDateContext) {
      const context = app.globalData.currentDateContext;


      this.setData({
        currentDateInfo: {
          date: context.selectedDate,
          hasDataIndicators: context.hasDataIndicators || [],
          totalDisplayedCount: context.totalDisplayedCount || 0,
          hasAnyData: context.hasDataIndicators && context.hasDataIndicators.length > 0
        }
      });


    } else {

      // 清空状态
      this.setData({
        currentDateInfo: {
          date: '',
          hasDataIndicators: [],
          totalDisplayedCount: 0,
          hasAnyData: false
        }
      });
    }
  },

  // 🔧 从临时配置恢复页面状态
  loadTemporaryBloodTestConfigToPage() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBloodTestConfig;

    if (!tempConfig) {

      this.loadIndicatorConfig();
      return;
    }



    // 设置页面数据
    this.setData({
      selectedIndicators: tempConfig.selectedIndicators || {},
      customIndicators: tempConfig.customIndicators || [],
      indicatorConfigs: tempConfig.indicatorConfigs || this.data.indicatorConfigs
    });

    // 加载当前日期的数据状态
    this.loadCurrentDateContext();


  },

  // 获取用户信息
  getUserInfo() {
    try {
      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();
      const currentProfileId = app.getCurrentProfileId();

      if (!openid || !currentProfileId) {

        // 不再显示modal和跳转，只返回false
        return false;
      }

      this.setData({
        openid,
        currentProfileId
      });

      return true;
    } catch (err) {

      return false;
    }
  },

  // 加载已选指标配置
  async loadIndicatorConfig() {
    const { openid, currentProfileId, editingDate } = this.data;

    if (!openid || !currentProfileId) {
      return;
    }

    try {

      const db = wx.cloud.database();

      // 1. 智能加载配置（支持继承）

      let configRes;

      if (editingDate) {
        // 🔧 优先查询当前日期的专用配置
        configRes = await db.collection('userIndicatorConfig')
          .where({
            openid: openid,
            profileId: currentProfileId,
            date: editingDate
          })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();



        // 如果当前日期没有配置，且是未来日期，尝试继承最近的配置
        if (configRes.data.length === 0 && this.data.dateType === 'future') {


          // 查找最近的有效配置（包括今日和历史配置）
          const inheritableConfigRes = await db.collection('userIndicatorConfig')
            .where({
              openid: openid,
              profileId: currentProfileId,
              date: db.command.lte(editingDate) // 小于等于当前日期
            })
            .orderBy('date', 'desc') // 按日期降序，找最近的
            .limit(1)
            .get();

          if (inheritableConfigRes.data.length > 0) {

            configRes = inheritableConfigRes;

            // 标记这是继承的配置
            configRes.isInherited = true;
            configRes.inheritedFrom = inheritableConfigRes.data[0].date;
          } else {

          }
        }
      } else {
        // 兼容：如果没有指定日期，查询最新配置
        configRes = await db.collection('userIndicatorConfig')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();
      }



      // 2. 加载自定义指标设置

      let customSettings = {};
      try {
        const settingsRes = await db.collection('userIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .get();




        if (settingsRes.data && settingsRes.data.length > 0) {
          settingsRes.data.forEach(setting => {
            console.log(`🔍 处理指标 ${setting.indicatorId}:`, {
              name: setting.name,
              unit: setting.unit
            });

            customSettings[setting.indicatorId] = {
              name: setting.name,
              unit: setting.unit
            };
          });

        } else {

        }

      } catch (settingsErr) {
        if (settingsErr.errCode === -502005) {


        } else {

        }
        // 无论什么错误，都继续使用默认设置，不中断流程
        customSettings = {};
      }

      // 3. 分离自定义指标和预设指标的设置



      const updatedConfigs = { ...this.data.indicatorConfigs };
      const customIndicators = [];
      const updatedSelected = { ...this.data.selectedIndicators };

      Object.keys(customSettings).forEach(indicatorId => {
        if (indicatorId.startsWith('custom_')) {
          // 这是自定义指标，添加到 customIndicators 数组


          const customIndicator = {
            id: indicatorId,
            fullName: customSettings[indicatorId].name,
            min: customSettings[indicatorId].min,
            max: customSettings[indicatorId].max,
            unit: customSettings[indicatorId].unit
          };

          customIndicators.push(customIndicator);


        } else if (updatedConfigs[indicatorId]) {
          // 这是预设指标的自定义设置




          updatedConfigs[indicatorId] = {
            ...updatedConfigs[indicatorId],
            ...customSettings[indicatorId]
          };


        }
      });




      // 4. 更新页面数据

      const updateData = {
        indicatorConfigs: updatedConfigs,
        customIndicators: customIndicators,
        configInheritInfo: {
          isInherited: configRes.isInherited || false,
          inheritedFrom: configRes.inheritedFrom || ''
        }
      };

      if (configRes.data.length > 0) {
        const config = configRes.data[0];


        // 合并选中状态：使用数据库中的状态，但保留自定义指标的默认选中状态
        const finalSelectedIndicators = { ...this.data.selectedIndicators };

        // 应用数据库中的选中状态
        Object.assign(finalSelectedIndicators, config.selectedIndicators || {});

        // 🔧 对于自定义指标，如果数据库中没有配置，默认为不选中状态
        customIndicators.forEach(indicator => {
          if (finalSelectedIndicators[indicator.id] === undefined) {
            finalSelectedIndicators[indicator.id] = false; // 默认不选中
          }
        });

        updateData.selectedIndicators = finalSelectedIndicators;


      } else {


        // 🔧 为新加载的自定义指标设置默认不选中状态
        const finalSelectedIndicators = { ...this.data.selectedIndicators };
        customIndicators.forEach(indicator => {
          if (finalSelectedIndicators[indicator.id] === undefined) {
            finalSelectedIndicators[indicator.id] = false; // 默认不选中
          }
        });
        updateData.selectedIndicators = finalSelectedIndicators;
      }



      this.setData(updateData);

      // 🔧 保存原始配置状态（用于检测更改和回滚）
      this.setData({
        originalConfig: {
          selectedIndicators: JSON.parse(JSON.stringify(updateData.selectedIndicators || {})),
          customIndicators: JSON.parse(JSON.stringify(updateData.customIndicators || [])),
          indicatorConfigs: JSON.parse(JSON.stringify(updateData.indicatorConfigs || {}))
        }
      });







    } catch (err) {

      // 即使加载失败，也保持默认配置，不阻止页面显示
      wx.showToast({
        title: '配置加载失败，使用默认配置',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 加载自定义指标
  async loadCustomIndicators() {
    const { openid, currentProfileId } = this.data;
    if (!openid || !currentProfileId) return;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('bloodTestIndicators')
        .where({
          openid: openid,
          profileId: currentProfileId
        })
        .orderBy('createTime', 'asc')
        .get();

      this.setData({
        customIndicators: res.data || []
      });

      // 初始化自定义指标的选中状态
      if (res.data && res.data.length > 0) {
        const selectedIndicators = { ...this.data.selectedIndicators };
        res.data.forEach(indicator => {
          if (selectedIndicators[indicator.id] === undefined) {
            selectedIndicators[indicator.id] = indicator.isActive || false;
          }
        });
        this.setData({ selectedIndicators });
      }

    } catch (err) {

      // 即使加载失败，也设置空数组，不阻止页面显示
      this.setData({
        customIndicators: []
      });
    }
  },

  // 返回方法 - 立即同步配置到血常规页面预览
  async goBack() {


    // 立即同步当前配置状态到全局数据，供血常规页面预览
    this.syncConfigToBloodTestPage();

    wx.navigateBack({
      fail: (err) => {

      }
    });
  },

  // 同步配置到血常规页面进行预览
  syncConfigToBloodTestPage() {
    const { selectedIndicators, customIndicators, indicatorConfigs, editingDate, dateType } = this.data;

    const app = getApp();
    if (app.globalData) {
      // 设置临时配置数据，供血常规页面预览使用
      app.globalData.temporaryBloodTestConfig = {
        selectedIndicators: JSON.parse(JSON.stringify(selectedIndicators)),
        customIndicators: JSON.parse(JSON.stringify(customIndicators)),
        indicatorConfigs: JSON.parse(JSON.stringify(indicatorConfigs)),
        configDate: editingDate,
        dateType: dateType, // 传递日期类型
        isTemporary: true, // 标记为临时配置
        createdAt: Date.now() // 🔧 添加创建时间戳，用于判断配置新鲜度
      };

      // 设置刷新标志，让血常规页面重新加载
      app.globalData.needRefreshBloodTestConfig = true;

      console.log('📋 已同步临时配置到血常规页面:', {
        selectedCount: Object.keys(selectedIndicators).filter(key => selectedIndicators[key]).length,
        customCount: customIndicators.length,
        dateType: dateType,
        isTemporary: true
      });
    }
  },

  // 切换指标选中状态
  toggleIndicator(e) {

    const { id, type } = e.currentTarget.dataset;


    // 检查是否为必选指标
    if (this.data.requiredIndicators.includes(id)) {
      const currentSelected = this.data.selectedIndicators[id];
      if (currentSelected) {
        // 必选指标不能取消勾选
        wx.showToast({
          title: '该指标为必选项，无法取消',
          icon: 'none',
          duration: 2000
        });

        return;
      }
    }

    const selectedIndicators = { ...this.data.selectedIndicators };
    const oldValue = selectedIndicators[id];
    selectedIndicators[id] = !selectedIndicators[id];




    // 🔧 立即更新选中状态，供界面显示
    this.setData({
      selectedIndicators
    });

    // 🔄 立即同步到血常规页面预览（不保存到数据库）
    this.syncConfigToBloodTestPage();


  },


  // 更新自定义指标状态
  async updateCustomIndicatorStatus(indicatorId, isActive) {
    try {
      const db = wx.cloud.database();
      await db.collection('bloodTestIndicators')
        .doc(indicatorId)
        .update({
          data: {
            isActive: isActive,
            updateTime: db.serverDate()
          }
        });
    } catch (err) {

    }
  },

  // 保存配置（智能继承版）
  async saveConfigSimple() {
    const { openid, currentProfileId, selectedIndicators, editingDate, dateType } = this.data;

    if (!openid || !currentProfileId) {
      wx.showToast({
        title: '请先登录并选择档案',
        icon: 'none'
      });
      return;
    }

    if (!editingDate) {
      wx.showToast({
        title: '配置保存失败：未指定日期',
        icon: 'none'
      });
      return false;
    }

    try {
      const db = wx.cloud.database();



      // 1. 获取旧配置，找出被取消勾选的指标
      const existingRes = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: editingDate
        })
        .get();

      let removedIndicators = [];
      if (existingRes.data.length > 0) {
        const oldConfig = existingRes.data[0].selectedIndicators || {};
        // 找出从true变为false或undefined的指标
        Object.keys(oldConfig).forEach(key => {
          if (oldConfig[key] === true && (selectedIndicators[key] !== true)) {
            removedIndicators.push(key);
          }
        });
      }

      // 2. 构建配置数据
      const configData = {
        selectedIndicators: selectedIndicators,
        updateTime: db.serverDate(),
        configType: dateType, // 标记配置类型
        effectiveScope: dateType === 'today' ? 'future' : 'single' // 生效范围
      };

      // 3. 保存当前日期的配置
      if (existingRes.data.length > 0) {
        await db.collection('userIndicatorConfig')
          .doc(existingRes.data[0]._id)
          .update({
            data: configData
          });
      } else {
        await db.collection('userIndicatorConfig').add({
          data: {
            openid: openid,
            profileId: currentProfileId,
            date: editingDate,
            ...configData
          }
        });
      }

      // 4. 🎯 核心逻辑：今日修改对未来生效
      if (dateType === 'today') {

        await this.applyConfigToFuture(selectedIndicators);
      }

      // 5. 清理被取消勾选的指标数据和设置
      if (removedIndicators.length > 0) {
        await this.cleanupRemovedIndicatorData(removedIndicators, editingDate);
        await this.cleanupRemovedIndicatorSettings(removedIndicators);
      }

      // 6. 设置刷新标志
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshBloodTestConfig = true;
        delete app.globalData.currentDateContext;
      }

      return true;

    } catch (err) {

      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
      return false;
    }
  },

  // 🎯 将今日配置应用到未来日期（智能继承）
  async applyConfigToFuture(selectedIndicators) {
    const { openid, currentProfileId, editingDate } = this.data;

    try {
      const db = wx.cloud.database();
      const today = editingDate; // 当前编辑的日期就是今天



      // 查询所有未来日期的配置（大于今天的日期）
      const futureConfigsRes = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gt(today)
        })
        .get();



      // 批量更新未来日期的配置
      const batchUpdatePromises = futureConfigsRes.data.map(config => {

        return db.collection('userIndicatorConfig')
          .doc(config._id)
          .update({
            data: {
              selectedIndicators: selectedIndicators,
              updateTime: db.serverDate(),
              inheritedFrom: today, // 标记继承来源
              configType: 'inherited' // 标记为继承配置
            }
          });
      });

      if (batchUpdatePromises.length > 0) {
        await Promise.all(batchUpdatePromises);


        wx.showToast({
          title: `已同步到${batchUpdatePromises.length}个未来日期`,
          icon: 'success',
          duration: 2000
        });
      } else {

      }

    } catch (err) {

      // 不影响主流程，只是提示
      wx.showToast({
        title: '部分未来日期同步失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 清理被移除指标的设置数据
  async cleanupRemovedIndicatorSettings(removedIndicators) {
    const { openid, currentProfileId } = this.data;

    try {
      const db = wx.cloud.database();



      // 清理设置集合中的指标配置
      for (const indicatorId of removedIndicators) {
        const settingsRes = await db.collection('userIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId,
            indicatorId: indicatorId
          })
          .get();

        if (settingsRes.data.length > 0) {
          for (const setting of settingsRes.data) {
            await db.collection('userIndicatorSettings')
              .doc(setting._id)
              .remove();
          }

        }
      }



    } catch (err) {

    }
  },

  // 清理被移除指标的数据
  async cleanupRemovedIndicatorData(removedIndicators, date) {
    const { openid, currentProfileId } = this.data;

    try {
      const db = wx.cloud.database();

      // 查询该日期的血常规数据
      const bloodRes = await db.collection('bloodTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: date
        })
        .get();

      if (bloodRes.data.length > 0) {
        const bloodData = bloodRes.data[0];
        const updateData = { updateTime: db.serverDate() };
        let needUpdate = false;

        // 清理直接字段
        removedIndicators.forEach(indicatorId => {
          if (bloodData[indicatorId] !== undefined) {
            updateData[indicatorId] = db.command.remove();
            needUpdate = true;
          }
        });

        // 重建customValues字段（只保留未被删除的）
        if (bloodData.customValues) {
          const newCustomValues = {};
          Object.keys(bloodData.customValues).forEach(key => {
            if (!removedIndicators.includes(key)) {
              newCustomValues[key] = bloodData.customValues[key];
            }
          });

          if (Object.keys(newCustomValues).length > 0) {
            updateData.customValues = newCustomValues;
          } else {
            updateData.customValues = db.command.remove();
          }
          needUpdate = true;
        }

        // 执行数据清理
        if (needUpdate) {
          await db.collection('bloodTests')
            .doc(bloodData._id)
            .update({
              data: updateData
            });

          wx.showToast({
            title: '数据已清理',
            icon: 'success',
            duration: 1500
          });
        }
      }

    } catch (err) {

      wx.showToast({
        title: '数据清理失败',
        icon: 'error'
      });
    }
  },

  // 原保存配置方法
  async saveConfig() {
    const { openid, currentProfileId, selectedIndicators } = this.data;




    if (!openid || !currentProfileId) {

      return;
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();


      // 查询是否已有配置
      const res = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId
        })
        .get();



      const configData = {
        selectedIndicators,
        updateTime: db.serverDate()
      };

      if (res.data.length > 0) {

        // 更新配置
        const updateResult = await db.collection('userIndicatorConfig')
          .doc(res.data[0]._id)
          .update({
            data: configData
          });

      } else {

        // 新建配置
        const addResult = await db.collection('userIndicatorConfig').add({
          data: {
            openid,
            profileId: currentProfileId,
            selectedIndicators,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

      }



      // 给一个小延迟确保数据库操作完成
      await new Promise(resolve => setTimeout(resolve, 300));

      wx.showToast({
        title: '配置已保存',
        icon: 'success',
        duration: 1000
      });

    } catch (err) {

      wx.showToast({
        title: '保存失败',
        icon: 'error',
        duration: 1000
      });
      throw err; // 重新抛出错误，让调用方知道保存失败
    } finally {
      wx.hideLoading();
    }
  },

  // 编辑指标
  async editIndicator(e) {
    const { id } = e.currentTarget.dataset;


    // 检查是否为自定义指标
    const customIndicator = this.data.customIndicators.find(item => item.id === id);
    if (customIndicator) {

      this.setData({
        editDialogVisible: true,
        editingIndicator: id,
        isAddMode: false,
        isCustomIndicator: true,
        editForm: {
          name: customIndicator.fullName,
          unit: customIndicator.unit || ''
        }
      });
      return;
    }

    // 默认指标信息
    const defaultIndicators = {
      rbc: { name: '红细胞', unit: '×10¹²/L' },
      crp: { name: 'C反应蛋白', unit: 'mg/L' },
      hct: { name: '红细胞压积', unit: '%' },
      lymph: { name: '淋巴细胞绝对值', unit: '×10⁹/L' },
      mono: { name: '单核细胞绝对值', unit: '×10⁹/L' }
    };

    let indicator = defaultIndicators[id];
    if (!indicator) {

      return;
    }

    // 尝试从数据库加载用户自定义的指标设置
    try {
      const { openid, currentProfileId } = this.data;
      if (openid && currentProfileId) {
        const db = wx.cloud.database();
        const res = await db.collection('userIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId,
            indicatorId: id
          })
          .get();

        if (res.data.length > 0) {
          const customSettings = res.data[0];
          indicator = {
            name: customSettings.name || indicator.name,
            unit: customSettings.unit || indicator.unit
          };

        } else {

        }
      }
    } catch (err) {
      // 处理集合不存在或其他数据库错误
      if (err.errCode === -502005) {

      } else {

      }
      // 不管什么错误，都继续使用默认设置
    }

    console.log('🎯 设置编辑表单数据:', {
      name: indicator.name,
      unit: indicator.unit
    });

    this.setData({
      editDialogVisible: true,
      editingIndicator: id,
      isAddMode: false,
      isCustomIndicator: false,
      editForm: {
        name: indicator.name,
        unit: indicator.unit
      },
      autoGeneratedShortName: ''
    });
  },

  // 编辑表单输入
  onEditFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`editForm.${field}`]: value
    }, () => {
      // 当名称改变时的处理逻辑
    });
  },



  // 确认编辑
  async confirmEdit() {
    const { editingIndicator, editForm, openid, currentProfileId, isAddMode } = this.data;







    // 验证输入
    if (!editForm.name.trim()) {
      wx.showToast({
        title: '请输入指标名称',
        icon: 'none'
      });
      return;
    }

    // 单位是必填项
    if (!editForm.unit || !editForm.unit.trim()) {
      wx.showToast({
        title: '请输入单位',
        icon: 'none'
      });
      return;
    }


    // 已移除参考范围验证逻辑

    // 验证用户信息
    if (!openid || !currentProfileId) {
      wx.showToast({
        title: '用户信息缺失，无法保存',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: isAddMode ? '添加中...' : '保存中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      let targetIndicatorId = editingIndicator;

      // 如果是添加模式，生成新的指标ID
      if (isAddMode) {
        // 使用指标名称生成更有意义的ID
        targetIndicatorId = generateCustomIndicatorId(editForm.name.trim());

      }


      console.log('保存数据:', {
        openid,
        profileId: currentProfileId,
        indicatorId: targetIndicatorId,
        name: editForm.name.trim(),
        unit: editForm.unit.trim()
      });

      // 查询是否已有该指标的自定义设置（添加模式跳过查询）
      let existingRes = null;
      let collectionExists = true;

      if (isAddMode) {

        existingRes = { data: [] };
      } else {
        try {

          existingRes = await db.collection('userIndicatorSettings')
            .where({
              openid: openid,
              profileId: currentProfileId,
              indicatorId: targetIndicatorId
            })
            .get();

        } catch (queryErr) {
          // 集合不存在时查询会失败，标记需要创建集合
          if (queryErr.errCode === -502005) {

            collectionExists = false;
            existingRes = { data: [] };
          } else {

            throw queryErr;
          }
        }
      }

      const settingData = {
        name: editForm.name.trim(),
        unit: editForm.unit.trim(),
        updateTime: db.serverDate()
      };



      let dbResult;

      // 如果集合不存在，先尝试创建集合
      if (!collectionExists) {

        try {
          // 通过添加第一条记录来创建集合
          dbResult = await db.collection('userIndicatorSettings').add({
            data: {
              openid: openid,
              profileId: currentProfileId,
              indicatorId: targetIndicatorId,
              ...settingData,
              createTime: db.serverDate()
            }
          });

        } catch (createErr) {

          throw createErr;
        }
      } else if (existingRes.data.length > 0) {
        // 更新现有设置

        try {
          dbResult = await db.collection('userIndicatorSettings')
            .doc(existingRes.data[0]._id)
            .update({
              data: settingData
            });

        } catch (updateErr) {

          throw updateErr;
        }
      } else {
        // 集合存在但没有该记录，创建新记录

        try {
          dbResult = await db.collection('userIndicatorSettings').add({
            data: {
              openid: openid,
              profileId: currentProfileId,
              indicatorId: targetIndicatorId,
              ...settingData,
              createTime: db.serverDate()
            }
          });

        } catch (addErr) {

          throw addErr;
        }
      }

      // 等待数据库操作完全完成
      await new Promise(resolve => setTimeout(resolve, 200));


      // 立即更新当前页面的指标配置
      const updatedConfigs = { ...this.data.indicatorConfigs };
      const updatedCustomIndicators = [...this.data.customIndicators];
      const updatedSelected = { ...this.data.selectedIndicators };

      if (isAddMode) {
        // 添加模式：创建新的自定义指标
        const newIndicator = {
          id: targetIndicatorId,
          fullName: editForm.name.trim(),
          unit: editForm.unit.trim()
        };

        updatedCustomIndicators.push(newIndicator);
        updatedSelected[targetIndicatorId] = true; // 🔧 修复：新建的自定义指标默认选中


      } else {
        // 编辑模式：更新现有配置
        if (updatedConfigs[targetIndicatorId]) {
          // 更新预设指标配置
          const newConfig = {
            ...updatedConfigs[targetIndicatorId],
            name: editForm.name.trim(),
            unit: editForm.unit.trim()
          };
          updatedConfigs[targetIndicatorId] = newConfig;

        } else {
          // 更新自定义指标
          const customIndex = updatedCustomIndicators.findIndex(item => item.id === targetIndicatorId);
          if (customIndex >= 0) {
            updatedCustomIndicators[customIndex] = {
              ...updatedCustomIndicators[customIndex],
              fullName: editForm.name.trim(),
              unit: editForm.unit.trim()
            };

          }
        }
      }






      // 关闭弹窗并更新配置
      this.setData({
        editDialogVisible: false,
        editingIndicator: null,
        isAddMode: false,
        isCustomIndicator: false,
        editForm: {
          name: '',
          unit: ''
        },
        indicatorConfigs: updatedConfigs,
        customIndicators: updatedCustomIndicators,
        selectedIndicators: updatedSelected
      });



      // 🔄 立即同步配置到血常规页面预览
      this.syncConfigToBloodTestPage();

      if (isAddMode) {

        wx.showToast({
          title: '指标添加成功，可在血常规页面预览',
          icon: 'success',
          duration: 2500
        });
      } else {
        // 编辑模式，只是修改了指标设置
        wx.showToast({
          title: '指标设置保存成功',
          icon: 'success'
        });
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

    } catch (err) {

      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      editDialogVisible: false,
      editingIndicator: null,
      isAddMode: false,
      isCustomIndicator: false,
      editForm: {
        name: '',
        minValue: '',
        maxValue: '',
        unit: ''
      }
    });
  },

  // 弹窗可见性变化
  onPopupVisibleChange(e) {
    const { visible } = e.detail;
    if (!visible) {
      // 弹窗关闭时清理数据
      this.setData({
        editDialogVisible: false,
        editingIndicator: null,
        isAddMode: false,
        isCustomIndicator: false,
        editForm: {
          name: '',
          unit: ''
        },
        autoGeneratedShortName: ''
      });
    }
  },

  // 定义更多指标
  defineMoreIndicators() {


    // 复用编辑弹窗，但设置为添加模式
    this.setData({
      editDialogVisible: true,
      editingIndicator: null, // null表示添加模式
      isAddMode: true, // 添加标识
      isCustomIndicator: false, // 新增的不显示删除按钮
      editForm: {
        name: '',
        unit: ''
      },
      autoGeneratedShortName: ''
    });
  },

  // 删除自定义指标
  async deleteCustomIndicator() {
    const { editingIndicator, openid, currentProfileId } = this.data;

    if (!editingIndicator || !openid || !currentProfileId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个自定义指标吗？删除后无法恢复。',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...',
            mask: true
          });

          try {


            const db = wx.cloud.database();

            // 从数据库删除指标设置
            await db.collection('userIndicatorSettings')
              .where({
                openid: openid,
                profileId: currentProfileId,
                indicatorId: editingIndicator
              })
              .remove();



            // 从页面数据中移除
            const updatedCustomIndicators = this.data.customIndicators.filter(
              item => item.id !== editingIndicator
            );
            const updatedSelected = { ...this.data.selectedIndicators };
            delete updatedSelected[editingIndicator];

            // 关闭弹窗并更新数据
            this.setData({
              editDialogVisible: false,
              editingIndicator: null,
              isAddMode: false,
              isCustomIndicator: false,
              editForm: {
                name: '',
                unit: ''
              },
              autoGeneratedShortName: '',
              customIndicators: updatedCustomIndicators,
              selectedIndicators: updatedSelected
            });

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });



          } catch (err) {

            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
  ,
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
