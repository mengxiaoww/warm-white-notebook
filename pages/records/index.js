// pages/health-profile/index.js
import { formatTime } from '../../utils/util.js';

Page({

  
  data: {
    isLoggedIn: false,
    isPageLoading: true, // 页面加载状态
    activeTab: 'health', // 'health' | 'medication' | 'checkReport' | 'expense'
    isFirstLoad: true, // 标记是否首次加载
    isFirstShow: true, // 标记是否是首次onShow（用于避免启动时设置TabBar）
    hasShownLoginTip: false, // 控制未登录提示只展示一次

    // 追踪每个Tab是否已加载过
    tabLoadedStatus: {
      health: false,
      medication: false,
      checkReport: false,
      expense: false
    },

    // 视图模式相关
    viewMode: 'timeline', // 'timeline' | 'table'
    selectedTestType: 'blood', // 当前选中的检测项目类型

    // 筛选相关
    showDateFilterPopup: false,
    showDataTypeFilterPopup: false,
    // 日历视图
    showCalendarPopup: false,
    calendarValue: Date.now(),
    markedDates: [], // 有记录的日期列表
    // 使用原生滚动条，移除自定义指示器
    // 移除自定义滚动指示器
    selectedDateFilter: '30', // 30天
    selectedDataTypeFilter: 'all', // 全部
    dateFilterText: '最近30天',
    dataTypeFilterText: '全部类型',

    // 详情弹窗
    showHealthDetailPopup: false,
    currentHealthDetail: {},

    // 筛选选项
    dateFilterOptions: [
      { label: '最近30天', value: '30' },
      { label: '最近90天', value: '90' },
      { label: '最近180天', value: '180' },
      { label: '最近一年', value: '365' },
      { label: '全部', value: 'all' }
    ],
    dataTypeFilterOptions: [
      { label: '全部类型', value: 'all' },
      { label: '血常规', value: 'blood' },
      { label: '检查报告', value: 'checkReport' },
      { label: 'EB病毒', value: 'ebv' },
      { label: '巨细胞病毒', value: 'cmv' },
      { label: '乳酸脱氢酶', value: 'ldh' },
      { label: '肝功能', value: 'liver' },
      { label: '肾功能', value: 'kidney' },
      { label: '尿量记录', value: 'urine' },
      { label: '排便记录', value: 'stool' },
      { label: '血糖', value: 'bloodSugar' },
      { label: '血氧', value: 'bloodOxygen' },
      { label: '血压', value: 'bloodPressure' },
      { label: '饮水', value: 'water' },
      { label: '体温', value: 'temperature' },
      { label: '体重', value: 'bodyMeasurement' },
      { label: '饮食', value: 'diet' }
    ],

    // 健康统计
    healthStats: {
      totalRecords: 0,
      recentDays: 0,
      abnormalCount: 0
    },

    // 健康记录
    healthRecords: [],

    // 表格视图数据
    tableViewData: [],
    tableContainerClass: 'table-container',

    // 检测项目配置（动态加载，包含自定义指标）
    testTypeOptions: [],

    // 数据类型图标配置映射（与每日记录页面保持一致）
    dataTypeIconMap: {
      'blood': 'blood-drop',
      'checkReport': 'assignment',
      'ebv': 'zoom-in',
      'cmv': 'search',
      'ldh': 'enzyme',
      'liver': 'liver',
      'kidney': 'relativity',
      'urine': 'fill-color-1',
      'stool': 'layers',
      'bloodSugar': 'glucose',
      'bloodOxygen': 'oxygen',
      'bloodPressure': 'blood-pressure',
      'water': 'tea',
      'temperature': 'thermometer',
      'bodyMeasurement': 'dashboard',
      'diet': 'bread'
    },

    // 数据类型标题配置
    dataTypeTitleMap: {
      'blood': '血常规',
      'checkReport': '检查报告',
      'ebv': 'EB病毒',
      'cmv': '巨细胞病毒',
      'ldh': '乳酸脱氢酶',
      'liver': '肝功能',
      'kidney': '肾功能',
      'urine': '尿量记录',
      'stool': '排便记录',
      'bloodSugar': '血糖',
      'bloodOxygen': '血氧',
      'bloodPressure': '血压',
      'water': '饮水',
      'temperature': '体温',
      'bodyMeasurement': '身高体重',
      'diet': '饮食'
    },

    // 用药统计 - 新结构
    medicationStats: {
      totalDays: 0,
      totalMedicationsTaken: 0,
      uniqueMedicineCount: 0,
      averagePerDay: 0
    },

    // 按日期显示的实际服药记录
    dailyMedicationRecords: [],

    // 保持兼容性的旧数据结构
    currentMedications: [],
    medicationHistory: [],

    // 检查报告数据
    checkReports: [],
    checkReportStats: {
      totalReports: 0,
      normalCount: 0,
      abnormalCount: 0
    },

    // 就医档案类型筛选
    selectedMedicalRecordTypeFilter: 'all',
    medicalRecordTypeFilterText: '全部类型',
    showMedicalRecordTypeFilterPopup: false,
    medicalRecordTypeFilterOptions: [
      { label: '全部类型', value: 'all' },
      { label: '检查报告', value: 'checkReport' },
      { label: '门诊记录', value: 'clinic' }
    ],
    allMedicalRecords: [], // 存储所有记录（未筛选）

    // 费用记录数据
    expenseRecords: [],
    expenseStats: {
      totalExpense: 0,        // 总费用
      recordCount: 0,         // 记录数
      avgExpensePerDay: 0     // 日均费用
    },
    expenseChartData: {
      categories: [],  // 费用类型
      amounts: []      // 对应金额
    },

    // 费用类型筛选
    selectedExpenseTypeFilter: 'all',
    expenseTypeFilterText: '全部费用',
    showExpenseTypeFilterPopup: false,
    expenseTypeFilterOptions: [
      { label: '全部费用', value: 'all' },
      { label: '检查费', value: '检查费' },
      { label: '治疗费', value: '治疗费' },
      { label: '药品费', value: '药品费' },
      { label: '住院费', value: '住院费' },
      { label: '手术费', value: '手术费' },
      { label: '护理费', value: '护理费' },
      { label: '其他', value: '其他' }
    ]
  },

  
  onLoad(options) {
    console.log('健康档案页面 - onLoad');
    const canLoadData = this.checkLoginAndRedirect();

    // 首次加载数据
    if (canLoadData) {
      this.refreshAllData();
    }

    // 🛡️ Android兼容性：5秒后强制隐藏骨架屏
    setTimeout(() => {
      if (this.data.isPageLoading) {
        console.warn('⚠️ health-profile页面加载超时，强制隐藏骨架屏');
        this.setData({ isPageLoading: false });
      }
    }, 5000);
  },

  
  onReady() {

  },

  
  onShow() {
    console.log('健康档案页面 - onShow');

    // 🔧 修复：只在非首次onShow时才设置TabBar，避免启动时覆盖首页的TabBar设置
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];

    // 如果是首次onShow，跳过TabBar设置
    if (this.data.isFirstShow) {
      this.setData({ isFirstShow: false });
    } else {
      // 只有当确实是当前页面时才设置TabBar
      if (currentPage && currentPage.route === 'pages/records/index') {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({
            selected: 3
          });
        }
      }
    }

    // 每次页面显示时都检查登录状态
    const canLoadData = this.checkLoginAndRedirect();

    // 如果是首次加载，跳过（onLoad已经加载过了）
    if (this.data.isFirstLoad) {
      this.setData({ isFirstLoad: false });
      if (canLoadData) {
        this.refreshAllData();
      }
      return;
    }

    // 非首次显示时刷新数据，确保数据是最新的
    if (canLoadData) {
      console.log('onShow - 刷新数据');
      this.refreshAllData();
    }
  },

  // 未登录时重置页面数据，避免展示旧内容
  resetDataForGuest() {
    this.setData({
      healthRecords: [],
      healthStats: {
        totalRecords: 0,
        recentDays: 0,
        abnormalCount: 0
      },
      tableViewData: [],
      dailyMedicationRecords: [],
      medicationStats: {
        totalDays: 0,
        totalMedicationsTaken: 0,
        uniqueMedicineCount: 0,
        averagePerDay: 0
      },
      currentMedications: [],
      medicationHistory: [],
      checkReports: [],
      checkReportStats: {
        totalReports: 0,
        normalCount: 0,
        abnormalCount: 0
      },
      allMedicalRecords: [],
      expenseRecords: [],
      expenseStats: {
        totalExpense: 0,
        recordCount: 0,
        avgExpensePerDay: 0
      },
      expenseChartData: {
        categories: [],
        amounts: []
      },
      isPageLoading: false,
      'tabLoadedStatus.health': false,
      'tabLoadedStatus.medication': false,
      'tabLoadedStatus.checkReport': false,
      'tabLoadedStatus.expense': false
    });
  },

  // 刷新所有数据
  refreshAllData() {
    if (!this.data.isLoggedIn) {
      return;
    }

    const { activeTab } = this.data;

    console.log(`刷新数据 - 当前Tab: ${activeTab}`);

    // 根据当前Tab加载对应数据
    if (activeTab === 'health') {
      this.loadHealthData();
    } else if (activeTab === 'medication') {
      this.loadMedicationData();
    } else if (activeTab === 'checkReport') {
      this.loadCheckReportArchiveData();
    } else if (activeTab === 'expense') {
      this.loadExpenseData();
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

    console.log('健康档案页面 - 获取用户信息:', {
      openid: openid ? '已获取' : '未获取',
      currentProfileId,
      globalDataProfile: app.globalData?.currentProfile
    });

    if (!openid) {
      return null;
    }

    if (!currentProfileId) {
      return null;
    }

    this.setData({
      openid,
      currentProfileId
    });

    return { openid, currentProfileId };
  },

  // 检查登录状态，未登录时只提示不跳转
  checkLoginAndRedirect() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    const isLoggedIn = !!openid;
    const loginStateChanged = isLoggedIn !== this.data.isLoggedIn;

    if (!isLoggedIn) {
      if (!this.data.hasShownLoginTip) {
        wx.showToast({
          title: '登录后可查看个人数据',
          icon: 'none'
        });
      }

      if (loginStateChanged) {
        this.resetDataForGuest();
      } else {
        this.setData({ isPageLoading: false });
      }

      this.setData({
        isLoggedIn: false,
        hasShownLoginTip: true
      });
      return false;
    }

    if (this.data.hasShownLoginTip) {
      this.setData({ hasShownLoginTip: false });
    }

    if (loginStateChanged) {
      this.setData({
        isLoggedIn: true,
        isPageLoading: true,
        'tabLoadedStatus.health': false,
        'tabLoadedStatus.medication': false,
        'tabLoadedStatus.checkReport': false,
        'tabLoadedStatus.expense': false
      });
    } else if (!this.data.isLoggedIn) {
      this.setData({ isLoggedIn: true });
    }

    this.getUserInfo();

    return true;
  },

  // 导航栏返回
  goBack() {
    wx.navigateBack();
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;

    console.log(`切换Tab: ${this.data.activeTab} -> ${tab}`);

    // 🔥 只在该Tab首次加载时显示骨架图
    const hasLoadedBefore = this.data.tabLoadedStatus[tab];
    const shouldShowSkeleton = this.data.isLoggedIn && !hasLoadedBefore;

    this.setData({
      activeTab: tab,
      isPageLoading: shouldShowSkeleton // 只有未加载过的Tab才显示骨架屏
    });

    // 切换Tab时重新加载对应数据
    if (tab === 'health') {
      this.loadHealthData();
    } else if (tab === 'medication') {
      this.loadMedicationData();
    } else if (tab === 'checkReport') {
      this.loadCheckReportArchiveData();
    } else if (tab === 'expense') {
      this.loadExpenseData();
    }
  },

  // 切换视图模式
  switchViewMode() {
    const newMode = this.data.viewMode === 'timeline' ? 'table' : 'timeline';

    // 🔥 显示骨架图
    this.setData({
      isPageLoading: true
    });

    // 如果切换到表格模式，需要处理类型筛选
    if (newMode === 'table') {
      // 如果当前是全部类型，自动切换到血常规
      if (this.data.selectedDataTypeFilter === 'all') {
        this.setData({
          viewMode: newMode,
          selectedDataTypeFilter: 'blood',
          dataTypeFilterText: '血常规'
        });
        // 重新加载数据以应用血常规筛选
        this.loadHealthData();
      } else {
        // 保持当前筛选类型
        this.setData({
          viewMode: newMode
        });
        this.generateTableViewData(); // 异步调用，不需要等待
      }
    } else {
      // 🔥 修复：切换回时间轴模式时，确保数据正确显示
      this.setData({
        viewMode: newMode
      });

      // 🔥 检查healthRecords是否存在且不为空
      if (!this.data.healthRecords || this.data.healthRecords.length === 0) {
        console.log('⚠️ 切换回时间轴时healthRecords为空，重新加载数据');
        this.loadHealthData();
      } else {
        // 🔥 数据存在，但需要检查dataTypes是否完整
        const firstRecord = this.data.healthRecords[0];
        console.log('✅ 切换回时间轴，healthRecords已存在');
        console.log('📊 第一条记录的dataTypes:', firstRecord.dataTypes);

        // 🔥 如果dataTypes为空或不存在，说明数据结构不完整，需要重新加载
        if (!firstRecord.dataTypes || firstRecord.dataTypes.length === 0) {
          console.log('⚠️ healthRecords的dataTypes为空，重新加载数据');
          this.loadHealthData();
        } else {
          // 数据完整，立即隐藏骨架图
          console.log('✅ 数据完整，直接显示');
          setTimeout(() => {
            this.setData({ isPageLoading: false });
          }, 100);
        }
      }
    }
  },

  // 切换检测项目类型
  async switchTestType(e) {
    const testType = e.currentTarget.dataset.type;
    this.setData({
      selectedTestType: testType
    });

    // 重新生成表格数据
    await this.generateTableViewData();
  },

  // 显示日期筛选
  showDateFilter() {
    this.setData({
      showDateFilterPopup: true
    });
  },

  // 关闭日期筛选
  closeDateFilter() {
    this.setData({
      showDateFilterPopup: false
    });
  },

  // 选择日期筛选
  selectDateFilter(e) {
    const value = e.currentTarget.dataset.value;
    const option = this.data.dateFilterOptions.find(item => item.value === value);

    // 🔥 显示骨架图
    this.setData({
      selectedDateFilter: value,
      dateFilterText: option.label,
      showDateFilterPopup: false,
      isPageLoading: true
    });

    // 重新加载数据 - 根据当前Tab加载对应数据
    const { activeTab } = this.data;

    if (activeTab === 'health') {
      this.loadHealthData();
    } else if (activeTab === 'medication') {
      this.loadMedicationData();
    } else if (activeTab === 'checkReport') {
      this.loadCheckReportArchiveData();
    }
  },

  // 显示数据类型筛选
  showDataTypeFilter() {
    this.setData({
      showDataTypeFilterPopup: true
    });
  },

  // 关闭数据类型筛选
  closeDataTypeFilter() {
    this.setData({
      showDataTypeFilterPopup: false
    });
  },

  // 选择数据类型筛选
  selectDataTypeFilter(e) {
    const value = e.currentTarget.dataset.value;
    const option = this.data.dataTypeFilterOptions.find(item => item.value === value);

    // 如果选择了全部类型，且当前是表格模式，则切换回时间轴模式
    let newViewMode = this.data.viewMode;
    if (value === 'all' && this.data.viewMode === 'table') {
      newViewMode = 'timeline';
    }

    // 🔥 显示骨架图
    this.setData({
      selectedDataTypeFilter: value,
      dataTypeFilterText: option.label,
      viewMode: newViewMode,
      showDataTypeFilterPopup: false,
      isPageLoading: true
    });

    // 重新加载数据
    this.loadHealthData();
  },

  // 显示日历视图
  async showCalendarView() {
    await this.loadMarkedDates();
    this.setData({
      showCalendarPopup: true
    });
  },

  // 关闭日历视图
  closeCalendarView() {
    this.setData({
      showCalendarPopup: false
    });
  },

  // 加载有记录标记的日期
  async loadMarkedDates() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    const profileId = app.getCurrentProfileId();

    if (!openid || !profileId) {
      return;
    }

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 查询所有记录集合的日期
      const collections = [
        'bloodTests',
        'liverFunctionTests',
        'kidneyFunctionTests',
        'ebvRecords',
        'cmvRecords',
        'ldhRecords',
        'bloodSugars',
        'bloodOxygens',
        'bloodPressures',
        'urineRecords',
        'stoolRecords',
        'clinicRecords',
        'waterIntakes',
        'temperatures',
        'bodyMeasurements',
        'dietRecords'
      ];

      const allDates = new Set();

      // 并发查询所有集合
      await Promise.all(
        collections.map(async (collectionName) => {
          try {
            const res = await db.collection(collectionName)
              .where({
                openid,
                profileId
              })
              .field({
                date: true
              })
              .get();

            res.data.forEach(record => {
              if (record.date) {
                allDates.add(record.date);
              }
            });
          } catch (err) {
            console.error(`查询${collectionName}失败:`, err);
          }
        })
      );

      // 转换为数组并排序
      const markedDates = Array.from(allDates).sort();

      console.log('加载有记录的日期:', markedDates);

      this.setData({
        markedDates
      });

    } catch (err) {
      console.error('加载标记日期失败:', err);
    }
  },

  // 日历日期确认
  onCalendarDaySelect(e) {
    const selectedDate = e.detail.date;

    // 关闭日历弹窗
    this.setData({
      showCalendarPopup: false
    });

    // 检查选中日期是否有记录
    if (!this.data.markedDates.includes(selectedDate)) {
      wx.showToast({
        title: '该日期无记录',
        icon: 'none'
      });
      return;
    }

    // 跳转到该日期的记录详情
    wx.showToast({
      title: `查看 ${selectedDate} 的记录`,
      icon: 'none'
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 显示费用类型筛选
  showExpenseTypeFilter() {
    this.setData({
      showExpenseTypeFilterPopup: true
    });
  },

  // 关闭费用类型筛选
  closeExpenseTypeFilter() {
    this.setData({
      showExpenseTypeFilterPopup: false
    });
  },

  // 选择费用类型筛选
  selectExpenseTypeFilter(e) {
    const value = e.currentTarget.dataset.value;
    const option = this.data.expenseTypeFilterOptions.find(item => item.value === value);

    // 🔥 显示骨架图
    this.setData({
      selectedExpenseTypeFilter: value,
      expenseTypeFilterText: option.label,
      showExpenseTypeFilterPopup: false,
      isPageLoading: true
    });

    // 重新加载费用数据
    this.loadExpenseData();
  },

  // 显示就医档案类型筛选
  showMedicalRecordTypeFilter() {
    this.setData({
      showMedicalRecordTypeFilterPopup: true
    });
  },

  // 关闭就医档案类型筛选
  closeMedicalRecordTypeFilter() {
    this.setData({
      showMedicalRecordTypeFilterPopup: false
    });
  },

  // 选择就医档案类型筛选
  selectMedicalRecordTypeFilter(e) {
    const value = e.currentTarget.dataset.value;
    const option = this.data.medicalRecordTypeFilterOptions.find(item => item.value === value);

    this.setData({
      selectedMedicalRecordTypeFilter: value,
      medicalRecordTypeFilterText: option.label,
      showMedicalRecordTypeFilterPopup: false
    });

    // 应用筛选
    this.applyMedicalRecordTypeFilter();
  },

  // 应用就医档案类型筛选
  applyMedicalRecordTypeFilter() {
    const { allMedicalRecords, selectedMedicalRecordTypeFilter } = this.data;

    let filteredRecords = allMedicalRecords;

    if (selectedMedicalRecordTypeFilter === 'checkReport') {
      filteredRecords = allMedicalRecords.filter(r => r.recordType === 'checkReport');
    } else if (selectedMedicalRecordTypeFilter === 'clinic') {
      filteredRecords = allMedicalRecords.filter(r => r.recordType === 'clinic');
    }

    this.setData({
      checkReports: filteredRecords
    });
  },

  // 加载健康数据
  async loadHealthData() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {

      return;
    }

    const { openid, currentProfileId } = userInfo;

    try {
      // 计算时间范围
      const timeRange = this.getTimeRange();

      // 并行加载所有数据
      // 🔧 Android兼容性：添加3秒超时保护
      const [
        bloodRecords,
        checkReportRecords,
        ebvRecords,
        cmvRecords,
        ldhRecords,
        liverRecords,
        kidneyRecords,
        urineRecords,
        stoolRecords,
        bloodSugarRecords,
        bloodOxygenRecords,
        bloodPressureRecords,
        waterIntakeRecords,
        temperatureRecords,
        bodyMeasurementRecords,
        dietRecords
      ] = await Promise.race([
        Promise.all([
          this.loadBloodData(openid, timeRange),
          this.loadCheckReportData(openid, timeRange),
          this.loadEbvData(openid, timeRange),
          this.loadCmvData(openid, timeRange),
          this.loadLdhData(openid, timeRange),
          this.loadLiverData(openid, timeRange),
          this.loadKidneyData(openid, timeRange),
          this.loadUrineData(openid, timeRange),
          this.loadStoolData(openid, timeRange),
          this.loadBloodSugarData(openid, timeRange),
          this.loadBloodOxygenData(openid, timeRange),
          this.loadBloodPressureData(openid, timeRange),
          this.loadWaterIntakeData(openid, timeRange),
          this.loadTemperatureData(openid, timeRange),
          this.loadBodyMeasurementData(openid, timeRange),
          this.loadDietData(openid, timeRange)
        ]),
        new Promise((resolve) =>
          setTimeout(() => resolve([[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []]), 3000)
        )
      ]);

      console.log('数据加载结果:', {
        血常规: bloodRecords.length,
        检查报告: checkReportRecords.length,
        EBV检测: ebvRecords.length,
        CMV检测: cmvRecords.length,
        LDH检测: ldhRecords.length,
        肝功能: liverRecords.length,
        肾功能: kidneyRecords.length,
        尿量记录: urineRecords.length,
        排便记录: stoolRecords.length,
        血糖: bloodSugarRecords.length,
        血氧: bloodOxygenRecords.length,
        血压: bloodPressureRecords.length,
        饮水: waterIntakeRecords.length,
        体温: temperatureRecords.length,
        身体测量: bodyMeasurementRecords.length,
        饮食: dietRecords.length
      });

      // 🔍 调试：打印前几条新数据类型的记录
      if (bloodSugarRecords.length > 0) {
        console.log('📊 血糖数据示例:', bloodSugarRecords[0]);
      }
      if (bloodPressureRecords.length > 0) {
        console.log('📊 血压数据示例:', bloodPressureRecords[0]);
      }
      if (waterIntakeRecords.length > 0) {
        console.log('📊 饮水数据示例:', waterIntakeRecords[0]);
      }

      // 合并并处理数据
      const healthRecords = this.mergeHealthRecords({
        bloodRecords,
        checkReportRecords,
        ebvRecords,
        cmvRecords,
        ldhRecords,
        liverRecords,
        kidneyRecords,
        urineRecords,
        stoolRecords,
        bloodSugarRecords,
        bloodOxygenRecords,
        bloodPressureRecords,
        waterIntakeRecords,
        temperatureRecords,
        bodyMeasurementRecords,
        dietRecords
      });

      // 🔍 调试：打印合并后的数据
      console.log('📊 合并后的健康记录数量:', healthRecords.length);
      if (healthRecords.length > 0) {
        console.log('📊 第一条记录包含的数据类型:', Object.keys(healthRecords[0]).filter(key => key.endsWith('Data')));
      }

      // 按类型筛选记录
      const filteredRecords = this.filterRecordsByType(healthRecords);

      // 基于筛选后的数据计算统计数据
      const healthStats = this.calculateHealthStats(filteredRecords);

      this.setData({
        healthRecords: filteredRecords,
        healthStats
      });

      // 无论什么模式都生成表格数据，以备切换使用
      this.generateTableViewData(); // 异步调用，不需要等待

      // 首次加载完成，隐藏骨架屏
      setTimeout(() => {
        this.setData({
          isPageLoading: false,
          'tabLoadedStatus.health': true // 标记健康档案Tab已加载
        });
      }, 300);

    } catch (error) {
      console.error('加载健康数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({
        isPageLoading: false,
        'tabLoadedStatus.health': true // 即使失败，也标记为已加载
      });
    }
  },

  // 获取时间范围
  getTimeRange() {
    const { selectedDateFilter } = this.data;
    if (selectedDateFilter === 'all') return null;

    const days = parseInt(selectedDateFilter);
    const today = new Date();
    const startTime = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    // 🔧 修复：结束时间延长到未来30天，包含未来录入的数据
    const endTime = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      startTime: this.formatDateKey(startTime),
      endTime: this.formatDateKey(endTime)
    };
  },

  // 加载血常规数据
  loadBloodData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('bloodTests').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {

        // 检查每条记录的customValues
        res.data.forEach((record, index) => {

        });
        resolve(res.data || []);
      }).catch(err => {

        resolve([]);
      });
    });
  },

  // 加载检查报告数据
  loadCheckReportData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('checkReports').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        console.log('检查报告数据查询结果:', res.data);
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载检查报告数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载EBV检测数据
  loadEbvData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('ebvRecords').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载EBV数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载CMV检测数据
  loadCmvData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('cmvRecords').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载CMV数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载LDH检测数据
  loadLdhData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('ldhRecords').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载LDH数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载肝功能数据（从liverFunctionTests集合）
  loadLiverData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('liverFunctionTests').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载肝功能数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载肾功能数据
  loadKidneyData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('kidneyFunctionTests').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载肾功能数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载尿量数据
  loadUrineData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('urineRecords').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载尿液数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载排便数据
  loadStoolData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      let query = db.collection('stoolRecords').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        query = query.where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime))
        });
      }

      query.orderBy('date', 'desc').orderBy('createTime', 'desc').get().then(res => {
        resolve(res.data || []);
      }).catch(err => {
        console.error('加载排便数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载血糖数据
  loadBloodSugarData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('bloodSugars').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 血糖数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载血糖数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载血氧数据
  loadBloodOxygenData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('bloodOxygens').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 血氧数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载血氧数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载血压数据
  loadBloodPressureData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('bloodPressures').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 血压数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载血压数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载饮水数据
  loadWaterIntakeData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('waterIntakes').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 饮水数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载饮水数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载体温数据
  loadTemperatureData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('temperatures').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 体温数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载体温数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载身体测量数据
  loadBodyMeasurementData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('bodyMeasurements').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 身体测量数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载身体测量数据失败:', err);
        resolve([]);
      });
    });
  },

  // 加载饮食数据
  loadDietData(openid, timeRange) {
    return new Promise((resolve) => {
      const app = getApp();
      const currentProfileId = app.getCurrentProfileId();

      if (!currentProfileId) {
        resolve([]);
        return;
      }

      const db = wx.cloud.database();
      const whereCondition = {
        openid: openid,
        profileId: currentProfileId
      };

      if (timeRange) {
        whereCondition.date = db.command.gte(timeRange.startTime).and(db.command.lte(timeRange.endTime));
      }

      db.collection('diets').where(whereCondition).orderBy('date', 'desc').get().then(res => {
        console.log('✅ 饮食数据加载成功:', res.data.length);
        resolve(res.data || []);
      }).catch(err => {
        console.error('❌ 加载饮食数据失败:', err);
        resolve([]);
      });
    });
  },

  // 合并健康记录
  mergeHealthRecords(records) {
    const dateMap = new Map();

    // 处理血常规数据
    records.bloodRecords.forEach(record => {

      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      const hasAbnormal = this.checkBloodAbnormal(record);

      // 🔥 修复：正确处理0值，不能用 || 运算符
      const getValueWithFallback = (...values) => {
        for (let val of values) {
          if (val !== undefined && val !== null) return val;
        }
        return '-';
      };

      const processedData = {
        ...record, // 保留原始记录的所有字段，包括customValues
        type: 'blood-test', // 添加类型标识
        wbc: getValueWithFallback(record.wbc, record.customValues?.wbc),
        // rbc: getValueWithFallback(record.rbc, record.customValues?.rbc), // 不再显示红细胞
        hemoglobin: getValueWithFallback(record.hemoglobin, record.hgb, record.customValues?.hemoglobin, record.customValues?.hgb),
        platelets: getValueWithFallback(record.platelets, record.plt, record.customValues?.platelets, record.customValues?.plt),
        neutrophil: getValueWithFallback(record.neutrophil, record.neut, record.customValues?.neutrophil, record.customValues?.neut),
        hasAbnormal,
        // 确保customValues被保留
        customValues: record.customValues || {}
      };

      dateMap.get(dateKey).bloodData = processedData;
    });

    // 处理检查报告数据
    records.checkReportRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      // 检查是否有异常（如果结果类型不是正常）
      const hasAbnormal = record.resultType && record.resultType !== 'normal';

      // 保存检查报告数据
      dateMap.get(dateKey).checkReportData = {
        ...record,
        type: 'check-report',
        hasAbnormal
      };
    });

    // 处理EBV检测数据 - 按照血常规逻辑，只保存实际录入的数据
    records.ebvRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      // 简单检查是否有异常（DNA载量大于0）
      const hasAbnormal = this.checkEbvAbnormal(record);

      // 只保存原始数据，添加类型标识
      dateMap.get(dateKey).ebvData = {
        ...record,
        type: 'ebv-test',
        hasAbnormal
      };
    });

    // 处理CMV检测数据 - 按照血常规逻辑，只保存实际录入的数据
    records.cmvRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      // 简单检查是否有异常（DNA载量大于0）
      const hasAbnormal = this.checkCmvAbnormal(record);

      // 只保存原始数据，添加类型标识
      dateMap.get(dateKey).cmvData = {
        ...record,
        type: 'cmv-test',
        hasAbnormal
      };
    });

    // 处理LDH检测数据 - 按照血常规逻辑，只保存实际录入的数据
    records.ldhRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      // 简单检查是否有异常（LDH值大于正常范围）
      const hasAbnormal = this.checkLdhAbnormal(record);

      // 只保存原始数据，添加类型标识
      dateMap.get(dateKey).ldhData = {
        ...record,
        type: 'ldh-test',
        hasAbnormal
      };
    });

    // 处理肝功能数据 - 按照血常规逻辑，只保存实际录入的数据
    records.liverRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      const hasAbnormal = this.checkLiverAbnormal(record);

      // 只保存原始数据，添加类型标识
      dateMap.get(dateKey).liverData = {
        ...record,
        type: 'liver-test',
        hasAbnormal
      };
    });

    // 处理肾功能数据 - 按照血常规逻辑，只保存实际录入的数据
    records.kidneyRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      const hasAbnormal = this.checkKidneyAbnormal(record);

      // 只保存原始数据，添加类型标识
      dateMap.get(dateKey).kidneyData = {
        ...record,
        type: 'kidney-test',
        hasAbnormal
      };
    });

    // 处理尿量数据 - 按日期汇总
    const urineByDate = this.groupUrineByDate(records.urineRecords);
    urineByDate.forEach((urineData, dateKey) => {
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        // 从dateKey字符串创建显示日期
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          const [year, month, day] = dateKey.split('-').map(num => parseInt(num));
          dateMap.set(dateKey, {
            date: `${month}月${day}日`,
            weekday: this.getWeekday(dateKey),
            originalDateKey: dateKey
          });
        }
      }

      if (dateMap.has(dateKey)) {
        dateMap.get(dateKey).urineData = urineData;
      }
    });

    // 处理排便数据 - 按日期汇总
    const stoolByDate = this.groupStoolByDate(records.stoolRecords);
    stoolByDate.forEach((stoolData, dateKey) => {
      if (!dateKey) return; // 跳过无效日期

      if (!dateMap.has(dateKey)) {
        // 从dateKey字符串创建显示日期
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          const [year, month, day] = dateKey.split('-').map(num => parseInt(num));
          dateMap.set(dateKey, {
            date: `${month}月${day}日`,
            weekday: this.getWeekday(dateKey),
            originalDateKey: dateKey
          });
        }
      }

      if (dateMap.has(dateKey)) {
        dateMap.get(dateKey).stoolData = stoolData;
      }
    });

    // 处理血糖数据
    records.bloodSugarRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).bloodSugarData = {
        ...record, // 保留所有字段，包括 customValues
        bloodSugar: record.bloodSugar,
        hasData: true
      };
    });

    // 处理血氧数据
    records.bloodOxygenRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).bloodOxygenData = {
        ...record, // 保留所有字段，包括 customValues
        spo2: record.spo2,
        hasData: true
      };
    });

    // 处理血压数据
    records.bloodPressureRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).bloodPressureData = {
        ...record, // 保留所有字段，包括 customValues
        systolic: record.systolic,
        diastolic: record.diastolic,
        hasData: true
      };
    });

    // 处理饮水数据
    records.waterIntakeRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).waterIntakeData = {
        ...record, // 保留所有字段，包括 customValues
        water: record.water,
        hasData: true
      };
    });

    // 处理体温数据
    records.temperatureRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).temperatureData = {
        ...record, // 保留所有字段，包括 customValues
        temperature: record.temperature,
        hasData: true
      };
    });

    // 处理身体测量数据
    records.bodyMeasurementRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).bodyMeasurementData = {
        ...record, // 保留所有字段，包括 customValues
        weight: record.weight,
        height: record.height,
        hasData: true
      };
    });

    // 处理饮食数据
    records.dietRecords.forEach(record => {
      const dateKey = this.formatDateKey(record.date);
      if (!dateKey) return;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: this.formatDisplayDate(record.date),
          weekday: this.getWeekday(record.date),
          originalDateKey: dateKey
        });
      }

      dateMap.get(dateKey).dietData = {
        ...record, // 保留所有字段，包括 customValues
        calories: record.calories,
        protein: record.protein,
        carbs: record.carbs,
        hasData: true
      };
    });

    // 转换为数组并排序
    const results = Array.from(dateMap.values()).filter(item => {
      // 确保每个记录都有有效的数据
      return item.bloodData || item.ebvData || item.cmvData || item.ldhData || item.liverData || item.kidneyData || item.urineData || item.stoolData || item.bloodSugarData || item.bloodOxygenData || item.bloodPressureData || item.waterIntakeData || item.temperatureData || item.bodyMeasurementData || item.dietData;
    });

    // 按原始日期键排序（降序）
    results.sort((a, b) => {
      const dateA = a.originalDateKey || '';
      const dateB = b.originalDateKey || '';
      return dateB.localeCompare(dateA);
    });

    // 🔥 为每条记录添加数据类型列表和显示配置（用于动态渲染）
    results.forEach(item => {
      const dataTypes = [];

      // 检查各种数据类型并构建显示配置
      if (item.bloodData) {
        dataTypes.push({
          id: 'blood',
          dataKey: 'bloodData',
          icon: this.data.dataTypeIconMap['blood'],
          title: this.data.dataTypeTitleMap['blood'],
          navigateMethod: 'navigateToBlood'
        });
      }
      if (item.checkReportData) {
        dataTypes.push({
          id: 'checkReport',
          dataKey: 'checkReportData',
          icon: this.data.dataTypeIconMap['checkReport'],
          title: this.data.dataTypeTitleMap['checkReport'],
          navigateMethod: 'navigateToCheckReport'
        });
      }
      if (item.ebvData) {
        dataTypes.push({
          id: 'ebv',
          dataKey: 'ebvData',
          icon: this.data.dataTypeIconMap['ebv'],
          title: this.data.dataTypeTitleMap['ebv'],
          navigateMethod: 'navigateToEbv'
        });
      }
      if (item.cmvData) {
        dataTypes.push({
          id: 'cmv',
          dataKey: 'cmvData',
          icon: this.data.dataTypeIconMap['cmv'],
          title: this.data.dataTypeTitleMap['cmv'],
          navigateMethod: 'navigateToCmv'
        });
      }
      if (item.ldhData) {
        dataTypes.push({
          id: 'ldh',
          dataKey: 'ldhData',
          icon: this.data.dataTypeIconMap['ldh'],
          title: this.data.dataTypeTitleMap['ldh'],
          navigateMethod: 'navigateToLdh'
        });
      }
      if (item.liverData) {
        dataTypes.push({
          id: 'liver',
          dataKey: 'liverData',
          icon: this.data.dataTypeIconMap['liver'],
          title: this.data.dataTypeTitleMap['liver'],
          navigateMethod: 'navigateToLiver'
        });
      }
      if (item.kidneyData) {
        dataTypes.push({
          id: 'kidney',
          dataKey: 'kidneyData',
          icon: this.data.dataTypeIconMap['kidney'],
          title: this.data.dataTypeTitleMap['kidney'],
          navigateMethod: 'navigateToKidney'
        });
      }
      if (item.urineData) {
        dataTypes.push({
          id: 'urine',
          dataKey: 'urineData',
          icon: this.data.dataTypeIconMap['urine'],
          title: this.data.dataTypeTitleMap['urine'],
          navigateMethod: 'navigateToUrine'
        });
      }
      if (item.stoolData) {
        dataTypes.push({
          id: 'stool',
          dataKey: 'stoolData',
          icon: this.data.dataTypeIconMap['stool'],
          title: this.data.dataTypeTitleMap['stool'],
          navigateMethod: 'navigateToStool'
        });
      }
      if (item.bloodSugarData) {
        dataTypes.push({
          id: 'bloodSugar',
          dataKey: 'bloodSugarData',
          icon: this.data.dataTypeIconMap['bloodSugar'],
          title: this.data.dataTypeTitleMap['bloodSugar'],
          navigateMethod: 'navigateToBloodSugar'
        });
      }
      if (item.bloodOxygenData) {
        dataTypes.push({
          id: 'bloodOxygen',
          dataKey: 'bloodOxygenData',
          icon: this.data.dataTypeIconMap['bloodOxygen'],
          title: this.data.dataTypeTitleMap['bloodOxygen'],
          navigateMethod: 'navigateToBloodOxygen'
        });
      }
      if (item.bloodPressureData) {
        dataTypes.push({
          id: 'bloodPressure',
          dataKey: 'bloodPressureData',
          icon: this.data.dataTypeIconMap['bloodPressure'],
          title: this.data.dataTypeTitleMap['bloodPressure'],
          navigateMethod: 'navigateToBloodPressure'
        });
      }
      if (item.waterIntakeData) {
        dataTypes.push({
          id: 'water',
          dataKey: 'waterIntakeData',
          icon: this.data.dataTypeIconMap['water'],
          title: this.data.dataTypeTitleMap['water'],
          navigateMethod: 'navigateToWaterIntake'
        });
      }
      if (item.temperatureData) {
        dataTypes.push({
          id: 'temperature',
          dataKey: 'temperatureData',
          icon: this.data.dataTypeIconMap['temperature'],
          title: this.data.dataTypeTitleMap['temperature'],
          navigateMethod: 'navigateToTemperature'
        });
      }
      if (item.bodyMeasurementData) {
        dataTypes.push({
          id: 'bodyMeasurement',
          dataKey: 'bodyMeasurementData',
          icon: this.data.dataTypeIconMap['bodyMeasurement'],
          title: this.data.dataTypeTitleMap['bodyMeasurement'],
          navigateMethod: 'navigateToBodyMeasurement'
        });
      }
      if (item.dietData) {
        dataTypes.push({
          id: 'diet',
          dataKey: 'dietData',
          icon: this.data.dataTypeIconMap['diet'],
          title: this.data.dataTypeTitleMap['diet'],
          navigateMethod: 'navigateToDiet'
        });
      }

      // 将数据类型列表添加到记录中
      item.dataTypes = dataTypes;

      // 为每个数据类型格式化显示的指标内容
      item.dataTypes.forEach(dataType => {
        const data = item[dataType.dataKey];
        dataType.displayItems = this.formatDataTypeDisplay(dataType.id, data);
      });
    });

    return results;
  },

  // 格式化数据类型的显示内容（返回要显示的指标列表）
  formatDataTypeDisplay(dataTypeId, data) {
    if (!data) return [];

    const items = [];

    switch (dataTypeId) {
      case 'blood':
        // 血常规：显示常用指标
        if (data.wbc !== undefined && data.wbc !== null && data.wbc !== '-') {
          items.push({ label: '白细胞', value: data.wbc });
        }
        if (data.hgb !== undefined && data.hgb !== null && data.hgb !== '-' && data.hgb !== '') {
          items.push({ label: '血红蛋白', value: data.hgb });
        }
        if (data.plt !== undefined && data.plt !== null && data.plt !== '-') {
          items.push({ label: '血小板', value: data.plt });
        }
        // 显示自定义指标
        if (data.customValues) {
          Object.keys(data.customValues).forEach(key => {
            const value = data.customValues[key];
            if (value !== undefined && value !== null && value !== '' && value !== '-') {
              // 自定义指标直接显示key作为label（实际使用时会从配置中获取真实名称）
              items.push({ label: key, value });
            }
          });
        }
        break;

      case 'checkReport':
        if (data.projectName) {
          items.push({ label: '检查项目', value: data.projectName || '未填写' });
        }
        if (data.resultTypeLabel) {
          items.push({ label: '检查结果', value: data.resultTypeLabel || '未知' });
        }
        break;

      case 'ebv':
        items.push({ label: '病毒载量', value: data.ebvDna || '0' });
        items.push({
          label: '检测结果',
          value: (data.ebvDna == '0' || data.ebvDna === 0 || !data.ebvDna) ? '阴性' : '阳性'
        });
        break;

      case 'cmv':
        items.push({ label: '病毒载量', value: data.hcmvDna || '0' });
        items.push({
          label: '检测结果',
          value: (data.hcmvDna == '0' || data.hcmvDna === 0 || !data.hcmvDna) ? '阴性' : '阳性'
        });
        break;

      case 'ldh':
        if (data.ldh !== undefined && data.ldh !== null && data.ldh !== '') {
          items.push({ label: '数值', value: data.ldh });
        }
        break;

      case 'liver':
        if (data.alt !== undefined && data.alt !== null && data.alt !== '') {
          items.push({ label: 'ALT', value: data.alt });
        }
        if (data.ast !== undefined && data.ast !== null && data.ast !== '') {
          items.push({ label: 'AST', value: data.ast });
        }
        if (data.tbil !== undefined && data.tbil !== null && data.tbil !== '') {
          items.push({ label: '总胆红素', value: data.tbil });
        }
        break;

      case 'kidney':
        const crValue = data.cr || data.creatinine;
        if (crValue !== undefined && crValue !== null && crValue !== '') {
          items.push({ label: '肌酐', value: crValue });
        }
        if (data.bun !== undefined && data.bun !== null && data.bun !== '') {
          items.push({ label: '尿素氮', value: data.bun });
        }
        if (data.ua !== undefined && data.ua !== null && data.ua !== '') {
          items.push({ label: '尿酸', value: data.ua });
        }
        break;

      case 'urine':
        if (data.count !== undefined) {
          items.push({ label: '记录次数', value: `${data.count}次` });
        }
        if (data.totalVolume !== undefined) {
          items.push({ label: '总尿量', value: `${data.totalVolume}ml` });
        }
        break;

      case 'stool':
        if (data.count !== undefined) {
          items.push({ label: '排便次数', value: `${data.count}次` });
        }
        if (data.hasAbnormal) {
          items.push({ label: '状态', value: '有异常' });
        }
        break;

      case 'bloodSugar':
        if (data.bloodSugar !== undefined && data.bloodSugar !== null && data.bloodSugar !== '') {
          items.push({ label: '数值', value: data.bloodSugar });
        }
        break;

      case 'bloodOxygen':
        if (data.spo2 !== undefined && data.spo2 !== null && data.spo2 !== '') {
          items.push({ label: '数值', value: data.spo2 });
        }
        break;

      case 'bloodPressure':
        if (data.systolic !== undefined && data.systolic !== null && data.systolic !== '') {
          items.push({ label: '收缩压', value: data.systolic });
        }
        if (data.diastolic !== undefined && data.diastolic !== null && data.diastolic !== '') {
          items.push({ label: '舒张压', value: data.diastolic });
        }
        break;

      case 'water':
        if (data.water !== undefined && data.water !== null && data.water !== '') {
          items.push({ label: '饮水量', value: data.water });
        }
        break;

      case 'temperature':
        if (data.temperature !== undefined && data.temperature !== null && data.temperature !== '') {
          items.push({ label: '体温', value: data.temperature });
        }
        break;

      case 'bodyMeasurement':
        if (data.weight !== undefined && data.weight !== null && data.weight !== '') {
          items.push({ label: '体重', value: data.weight });
        }
        if (data.height !== undefined && data.height !== null && data.height !== '') {
          items.push({ label: '身高', value: data.height });
        }
        break;

      case 'diet':
        if (data.calories !== undefined && data.calories !== null && data.calories !== '') {
          items.push({ label: '热量', value: data.calories });
        }
        if (data.protein !== undefined && data.protein !== null && data.protein !== '') {
          items.push({ label: '蛋白质', value: data.protein });
        }
        if (data.carbs !== undefined && data.carbs !== null && data.carbs !== '') {
          items.push({ label: '碳水化合物', value: data.carbs });
        }
        break;
    }

    return items;
  },

  // 按日期分组尿量数据
  groupUrineByDate(records) {
    const dateMap = new Map();

    records.forEach(record => {
      // 优先使用date字段，如果没有则使用time字段的日期部分
      let dateKey = '';
      if (record.date) {
        if (typeof record.date === 'string' && record.date.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
          dateKey = record.date;
        } else {
          dateKey = this.formatDateKey(record.date);
        }
      } else if (record.time) {
        dateKey = this.formatDateKey(record.time);
      }

      if (!dateKey) {

        return; // 跳过没有有效日期的记录
      }

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          type: 'urine-record', // 添加类型标识
          date: dateKey, // 添加日期字段供弹窗显示使用
          count: 0,
          totalVolume: 0,
          records: [] // 保存所有记录用于详情显示
        });
      }

      const group = dateMap.get(dateKey);
      group.count++;
      group.totalVolume += record.volume || 0;
      group.records.push(record); // 保存完整记录
    });

    return dateMap;
  },

  // 按日期分组排便数据
  groupStoolByDate(records) {
    const dateMap = new Map();

    records.forEach(record => {
      // 优先使用date字段，如果没有则使用time字段的日期部分
      let dateKey = '';
      if (record.date) {
        if (typeof record.date === 'string' && record.date.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
          dateKey = record.date;
        } else {
          dateKey = this.formatDateKey(record.date);
        }
      } else if (record.time) {
        dateKey = this.formatDateKey(record.time);
      }

      if (!dateKey) {

        return; // 跳过没有有效日期的记录
      }

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          type: 'stool-record', // 添加类型标识
          date: dateKey, // 添加日期字段供弹窗显示使用
          count: 0,
          hasAbnormal: false,
          // 保留最后一条记录的详细信息供详情显示使用
          lastRecord: null
        });
      }

      const group = dateMap.get(dateKey);
      group.count++;
      group.lastRecord = record; // 保存完整记录信息

      // 检查是否有异常
      if (record.type && record.type !== '正常' && record.type !== '1') {
        group.hasAbnormal = true;
      }
      if (record.color && record.color !== '正常' && record.color !== '黄褐色') {
        group.hasAbnormal = true;
      }
      if (record.hasBlood) {
        group.hasAbnormal = true;
      }
      if (record.hasMucus) {
        group.hasAbnormal = true;
      }
    });

    return dateMap;
  },

  // 计算健康统计
  calculateHealthStats(records) {
    let totalRecords = 0;
    let abnormalCount = 0;
    let recordDays = 0; // 记录实际有数据的天数

    records.forEach(dayRecord => {
      let hasRecordThisDay = false;

      // 检查血常规数据
      if (dayRecord.bloodData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.bloodData.hasAbnormal) abnormalCount++;
      }

      // 检查EB病毒数据
      if (dayRecord.ebvData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.ebvData.hasAbnormal) abnormalCount++;
      }

      // 检查CMV病毒数据
      if (dayRecord.cmvData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.cmvData.hasAbnormal) abnormalCount++;
      }

      // 检查LDH数据
      if (dayRecord.ldhData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.ldhData.hasAbnormal) abnormalCount++;
      }

      // 检查肝功能数据
      if (dayRecord.liverData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.liverData.hasAbnormal) abnormalCount++;
      }

      // 检查肾功能数据
      if (dayRecord.kidneyData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.kidneyData.hasAbnormal) abnormalCount++;
      }

      // 检查尿量数据
      if (dayRecord.urineData) {
        totalRecords++;
        hasRecordThisDay = true;
        // 尿量记录一般不算异常，除非总量异常
      }

      // 检查排便数据
      if (dayRecord.stoolData) {
        totalRecords++;
        hasRecordThisDay = true;
        if (dayRecord.stoolData.hasAbnormal) abnormalCount++;
      }

      // 检查血糖数据
      if (dayRecord.bloodSugarData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 检查血氧数据
      if (dayRecord.bloodOxygenData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 检查血压数据
      if (dayRecord.bloodPressureData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 检查饮水数据
      if (dayRecord.waterIntakeData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 检查体温数据
      if (dayRecord.temperatureData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 检查身体测量数据
      if (dayRecord.bodyMeasurementData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 检查饮食数据
      if (dayRecord.dietData) {
        totalRecords++;
        hasRecordThisDay = true;
      }

      // 如果这一天有任何记录，增加记录天数
      if (hasRecordThisDay) {
        recordDays++;
      }
    });

    // 计算连续记录天数（基于筛选后的数据）
    const recentDays = this.calculateConsecutiveDays(records);

    return {
      totalRecords: recordDays, // 改为记录实际有数据的天数
      recentDays,
      abnormalCount
    };
  },

  // 计算连续记录天数
  calculateConsecutiveDays(records) {
    if (records.length === 0) return 0;

    let consecutiveDays = 0;
    const today = new Date();

    // 从今天开始向前查找连续的记录
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const checkDateStr = this.formatDateKey(checkDate);

      if (!checkDateStr) continue; // 跳过无效日期

      const hasRecord = records.some(record => {
        // 从record对象中提取日期，可能来自不同的数据源
        let recordDate = '';
        if (record.originalDateKey) {
          recordDate = record.originalDateKey;
        } else if (record.date) {
          recordDate = this.formatDateKey(record.date);
        }
        return recordDate === checkDateStr;
      });

      if (hasRecord) {
        consecutiveDays++;
      } else if (i > 0) {
        // 如果不是今天且没有记录，则中断
        break;
      }
    }

    return consecutiveDays;
  },

  // 生成网格布局的扁平化记录数据

  // 按类型筛选记录
  filterRecordsByType(records) {
    const { selectedDataTypeFilter } = this.data;

    if (selectedDataTypeFilter === 'all') {
      return records;
    }

    const filteredRecords = records.map(dayRecord => {
      const filteredRecord = {
        date: dayRecord.date,
        weekday: dayRecord.weekday,
        originalDateKey: dayRecord.originalDateKey // 确保保留原始日期键，用于页面跳转
      };

      switch (selectedDataTypeFilter) {
        case 'blood':
          if (dayRecord.bloodData) filteredRecord.bloodData = dayRecord.bloodData;
          break;
        case 'checkReport':
          if (dayRecord.checkReportData) filteredRecord.checkReportData = dayRecord.checkReportData;
          break;
        case 'ebv':
          if (dayRecord.ebvData) filteredRecord.ebvData = dayRecord.ebvData;
          break;
        case 'cmv':
          if (dayRecord.cmvData) filteredRecord.cmvData = dayRecord.cmvData;
          break;
        case 'ldh':
          if (dayRecord.ldhData) filteredRecord.ldhData = dayRecord.ldhData;
          break;
        case 'liver':
          if (dayRecord.liverData) filteredRecord.liverData = dayRecord.liverData;
          break;
        case 'kidney':
          if (dayRecord.kidneyData) filteredRecord.kidneyData = dayRecord.kidneyData;
          break;
        case 'urine':
          if (dayRecord.urineData) filteredRecord.urineData = dayRecord.urineData;
          break;
        case 'stool':
          if (dayRecord.stoolData) filteredRecord.stoolData = dayRecord.stoolData;
          break;
        case 'bloodSugar':
          if (dayRecord.bloodSugarData) filteredRecord.bloodSugarData = dayRecord.bloodSugarData;
          break;
        case 'bloodOxygen':
          if (dayRecord.bloodOxygenData) filteredRecord.bloodOxygenData = dayRecord.bloodOxygenData;
          break;
        case 'bloodPressure':
          if (dayRecord.bloodPressureData) filteredRecord.bloodPressureData = dayRecord.bloodPressureData;
          break;
        case 'water':
          if (dayRecord.waterIntakeData) filteredRecord.waterIntakeData = dayRecord.waterIntakeData;
          break;
        case 'temperature':
          if (dayRecord.temperatureData) filteredRecord.temperatureData = dayRecord.temperatureData;
          break;
        case 'bodyMeasurement':
          if (dayRecord.bodyMeasurementData) filteredRecord.bodyMeasurementData = dayRecord.bodyMeasurementData;
          break;
        case 'diet':
          if (dayRecord.dietData) filteredRecord.dietData = dayRecord.dietData;
          break;
      }

      return filteredRecord;
    }).filter(record => {
      // 只保留有数据的记录
      return record.bloodData || record.checkReportData || record.ebvData || record.cmvData || record.ldhData || record.liverData || record.kidneyData || record.urineData || record.stoolData || record.bloodSugarData || record.bloodOxygenData || record.bloodPressureData || record.waterIntakeData || record.temperatureData || record.bodyMeasurementData || record.dietData;
    });

    // 🔥 关键修复：为筛选后的记录重新构建dataTypes
    filteredRecords.forEach(item => {
      const dataTypes = [];

      // 检查各种数据类型并构建显示配置
      if (item.bloodData) {
        dataTypes.push({
          id: 'blood',
          dataKey: 'bloodData',
          icon: this.data.dataTypeIconMap['blood'],
          title: this.data.dataTypeTitleMap['blood'],
          navigateMethod: 'navigateToBlood'
        });
      }
      if (item.checkReportData) {
        dataTypes.push({
          id: 'checkReport',
          dataKey: 'checkReportData',
          icon: this.data.dataTypeIconMap['checkReport'],
          title: this.data.dataTypeTitleMap['checkReport'],
          navigateMethod: 'navigateToCheckReport'
        });
      }
      if (item.ebvData) {
        dataTypes.push({
          id: 'ebv',
          dataKey: 'ebvData',
          icon: this.data.dataTypeIconMap['ebv'],
          title: this.data.dataTypeTitleMap['ebv'],
          navigateMethod: 'navigateToEbv'
        });
      }
      if (item.cmvData) {
        dataTypes.push({
          id: 'cmv',
          dataKey: 'cmvData',
          icon: this.data.dataTypeIconMap['cmv'],
          title: this.data.dataTypeTitleMap['cmv'],
          navigateMethod: 'navigateToCmv'
        });
      }
      if (item.ldhData) {
        dataTypes.push({
          id: 'ldh',
          dataKey: 'ldhData',
          icon: this.data.dataTypeIconMap['ldh'],
          title: this.data.dataTypeTitleMap['ldh'],
          navigateMethod: 'navigateToLdh'
        });
      }
      if (item.liverData) {
        dataTypes.push({
          id: 'liver',
          dataKey: 'liverData',
          icon: this.data.dataTypeIconMap['liver'],
          title: this.data.dataTypeTitleMap['liver'],
          navigateMethod: 'navigateToLiver'
        });
      }
      if (item.kidneyData) {
        dataTypes.push({
          id: 'kidney',
          dataKey: 'kidneyData',
          icon: this.data.dataTypeIconMap['kidney'],
          title: this.data.dataTypeTitleMap['kidney'],
          navigateMethod: 'navigateToKidney'
        });
      }
      if (item.urineData) {
        dataTypes.push({
          id: 'urine',
          dataKey: 'urineData',
          icon: this.data.dataTypeIconMap['urine'],
          title: this.data.dataTypeTitleMap['urine'],
          navigateMethod: 'navigateToUrine'
        });
      }
      if (item.stoolData) {
        dataTypes.push({
          id: 'stool',
          dataKey: 'stoolData',
          icon: this.data.dataTypeIconMap['stool'],
          title: this.data.dataTypeTitleMap['stool'],
          navigateMethod: 'navigateToStool'
        });
      }
      if (item.bloodSugarData) {
        dataTypes.push({
          id: 'bloodSugar',
          dataKey: 'bloodSugarData',
          icon: this.data.dataTypeIconMap['bloodSugar'],
          title: this.data.dataTypeTitleMap['bloodSugar'],
          navigateMethod: 'navigateToBloodSugar'
        });
      }
      if (item.bloodOxygenData) {
        dataTypes.push({
          id: 'bloodOxygen',
          dataKey: 'bloodOxygenData',
          icon: this.data.dataTypeIconMap['bloodOxygen'],
          title: this.data.dataTypeTitleMap['bloodOxygen'],
          navigateMethod: 'navigateToBloodOxygen'
        });
      }
      if (item.bloodPressureData) {
        dataTypes.push({
          id: 'bloodPressure',
          dataKey: 'bloodPressureData',
          icon: this.data.dataTypeIconMap['bloodPressure'],
          title: this.data.dataTypeTitleMap['bloodPressure'],
          navigateMethod: 'navigateToBloodPressure'
        });
      }
      if (item.waterIntakeData) {
        dataTypes.push({
          id: 'water',
          dataKey: 'waterIntakeData',
          icon: this.data.dataTypeIconMap['water'],
          title: this.data.dataTypeTitleMap['water'],
          navigateMethod: 'navigateToWaterIntake'
        });
      }
      if (item.temperatureData) {
        dataTypes.push({
          id: 'temperature',
          dataKey: 'temperatureData',
          icon: this.data.dataTypeIconMap['temperature'],
          title: this.data.dataTypeTitleMap['temperature'],
          navigateMethod: 'navigateToTemperature'
        });
      }
      if (item.bodyMeasurementData) {
        dataTypes.push({
          id: 'bodyMeasurement',
          dataKey: 'bodyMeasurementData',
          icon: this.data.dataTypeIconMap['bodyMeasurement'],
          title: this.data.dataTypeTitleMap['bodyMeasurement'],
          navigateMethod: 'navigateToBodyMeasurement'
        });
      }
      if (item.dietData) {
        dataTypes.push({
          id: 'diet',
          dataKey: 'dietData',
          icon: this.data.dataTypeIconMap['diet'],
          title: this.data.dataTypeTitleMap['diet'],
          navigateMethod: 'navigateToDiet'
        });
      }

      // 将数据类型列表添加到记录中
      item.dataTypes = dataTypes;

      // 为每个数据类型格式化显示的指标内容
      item.dataTypes.forEach(dataType => {
        const data = item[dataType.dataKey];
        dataType.displayItems = this.formatDataTypeDisplay(dataType.id, data);
      });
    });

    return filteredRecords;
  },

  // 加载用药数据 - 按日期显示实际服用记录
  async loadMedicationData() {
    const userInfo = this.getUserInfo();

    if (!userInfo) return;

    const { openid, currentProfileId } = userInfo;

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 获取时间范围过滤条件
      const timeRange = this.getTimeRange();

      let query = db.collection('medications').where({
        openid: openid,
        profileId: currentProfileId
      });

      // 应用时间范围过滤
      if (timeRange) {
        query = query.where({
          date: _.gte(timeRange.startTime).and(_.lte(timeRange.endTime))
        });
      }

      const res = await query
        .orderBy('date', 'desc')
        .orderBy('createTime', 'desc')
        .get();

      const medications = res.data || [];

      // 按日期分组显示实际服用的药品记录
      const dailyMedicationRecords = [];
      const medicationStats = {
        totalDays: 0,
        totalTaken: 0,
        uniqueMedicines: new Set()
      };

      medications.forEach(record => {
        if (record.medicines && record.medicines.length > 0) {
          const dailyRecord = {
            date: record.date,
            originalDateKey: record.date,
            displayDate: this.formatDisplayDate(new Date(record.date)),
            weekday: this.getWeekday(record.date),
            relativeTime: this.getRelativeTime(record.date),
            takenMedicines: [],
            totalMedicines: 0,
            takenCount: 0
          };

          record.medicines.forEach(medicine => {
            // 检查该药品在当天是否被服用
            const isTaken = this.checkMedicineTakenOnDate(medicine, record.date);

            if (isTaken) {
              // 只显示已服用的药品
              dailyRecord.takenMedicines.push({
                id: medicine.id,
                name: medicine.name,
                dosage: medicine.dosage,
                timesPerDay: medicine.timesPerDay || [],
                timesPerDayText: medicine.timesPerDay ? medicine.timesPerDay.join('、') : '待设置',
                takenTimes: this.getTakenTimesOnDate(medicine, record.date),
                completionRate: this.calculateDayCompletionRate(medicine, record.date)
              });
              dailyRecord.takenCount++;
              medicationStats.totalTaken++;
              medicationStats.uniqueMedicines.add(medicine.name);
            }
            dailyRecord.totalMedicines++;
          });

          // 只添加有服用记录的日期
          if (dailyRecord.takenCount > 0) {
            dailyMedicationRecords.push(dailyRecord);
            medicationStats.totalDays++;
          }
        }
      });

      // 按日期倒序排列（最新的在前）
      dailyMedicationRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

      // 计算整体统计
      const finalStats = {
        totalDays: medicationStats.totalDays,
        totalMedicationsTaken: medicationStats.totalTaken,
        uniqueMedicineCount: medicationStats.uniqueMedicines.size,
        averagePerDay: medicationStats.totalDays > 0 ?
          Math.round(medicationStats.totalTaken / medicationStats.totalDays * 10) / 10 : 0
      };

      console.log('实际服药记录:', {
        总天数: finalStats.totalDays,
        总服药次数: finalStats.totalMedicationsTaken,
        不同药品数: finalStats.uniqueMedicineCount,
        平均每天服药: finalStats.averagePerDay,
        详细记录: dailyMedicationRecords
      });

      this.setData({
        dailyMedicationRecords,
        medicationStats: finalStats,
        // 保持兼容性，清空原有数据
        currentMedications: [],
        medicationHistory: [],
        isPageLoading: false, // 🔥 隐藏骨架图
        'tabLoadedStatus.medication': true // 标记用药Tab已加载
      });

    } catch (error) {
      console.error('加载用药数据失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
      this.setData({
        isPageLoading: false, // 🔥 隐藏骨架图
        'tabLoadedStatus.medication': true // 即使失败，也标记为已加载
      });
    }
  },

  // 检查药品在特定日期是否被服用
  checkMedicineTakenOnDate(medicine, date) {
    // 检查是否有时间段服用状态
    if (medicine.timeSlotStatus) {
      // 如果有时间段状态，检查是否至少有一个时间段被标记为已服用
      return Object.values(medicine.timeSlotStatus).some(status => status === true);
    }

    // 检查简单的taken状态
    if (typeof medicine.taken === 'boolean') {
      return medicine.taken;
    }

    // 如果没有明确的服用状态，默认为未服用
    return false;
  },

  // 获取特定日期的服用时间
  getTakenTimesOnDate(medicine, date) {
    const takenTimes = [];

    if (medicine.timeSlotStatus && medicine.timesPerDay) {
      medicine.timesPerDay.forEach(time => {
        if (medicine.timeSlotStatus[time] === true) {
          takenTimes.push(time);
        }
      });
    }

    return takenTimes;
  },

  // 计算某天的完成率
  calculateDayCompletionRate(medicine, date) {
    if (!medicine.timesPerDay || medicine.timesPerDay.length === 0) {
      // 如果没有设置服药时间，基于taken状态
      return medicine.taken ? 100 : 0;
    }

    if (medicine.timeSlotStatus) {
      const totalSlots = medicine.timesPerDay.length;
      const takenSlots = medicine.timesPerDay.filter(time =>
        medicine.timeSlotStatus[time] === true
      ).length;

      return Math.round((takenSlots / totalSlots) * 100);
    }

    return 0;
  },

  // 查看某天的详细用药记录
  viewDayDetail(e) {
    const { date } = e.currentTarget.dataset;
    const record = this.data.dailyMedicationRecords.find(r => r.date === date);

    if (!record) return;

    // 构建清晰的药品列表显示
    const medicineList = record.takenMedicines.map((medicine, index) => {
      const medicineInfo = [
        `${index + 1}. ${medicine.name}`,
        `   剂量：${medicine.dosage}`,
        `   服用时间：${medicine.takenTimes.length > 0 ? medicine.takenTimes.join('、') : '已服用（未记录具体时间）'}`,
        medicine.completionRate < 100 ? `   完成率：${medicine.completionRate}%` : `   完成率：100%（完成）`
      ];
      return medicineInfo.join('\n');
    }).join('\n\n');

    const summary = `当日服用了 ${record.takenCount} 种药品：\n\n${medicineList}`;

    // 显示详情弹窗
    wx.showModal({
      title: `📅 ${record.displayDate} 用药详情`,
      content: summary,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 计算用药状态（与medication页面逻辑一致）
  calculateMedicationStatus(medication) {
    const today = this.formatDate(new Date());
    const startDate = new Date(medication.startDate);
    const endDate = new Date(medication.endDate);

    let totalDays = 0;
    let completedDays = 0;
    let partiallyCompletedDays = 0;
    let missedDays = 0;

    // 遍历用药期间的每一天，计算状态
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      totalDays++;

      // 这里需要根据实际的用药记录来判断状态
      // 但由于是在健康档案中处理，我们使用估算方法
      const isHistoricalDate = new Date(dateStr) < new Date(today);

      if (isHistoricalDate) {
        // 历史日期的状态判断
        if (medication.timeSlotStatus) {
          const dayTotalSlots = medication.timesPerDay ? medication.timesPerDay.length : 1;
          const dayCompletedSlots = medication.timesPerDay ?
            medication.timesPerDay.filter(slot => medication.timeSlotStatus[slot] === true).length :
            (medication.taken ? 1 : 0);

          if (dayCompletedSlots === dayTotalSlots) {
            completedDays++;
          } else if (dayCompletedSlots > 0) {
            partiallyCompletedDays++;
          } else {
            missedDays++;
          }
        } else {
          // 简单的taken状态
          if (medication.taken) {
            completedDays++;
          } else {
            missedDays++;
          }
        }
      }
    }

    const overallCompletionRate = totalDays > 0 ?
      Math.round(((completedDays + partiallyCompletedDays * 0.5) / totalDays) * 100) : 0;

    let statusText = '';
    let statusClass = '';

    if (new Date(endDate) < new Date(today)) {
      // 已结束的用药
      if (overallCompletionRate >= 90) {
        statusText = '按时完成';
        statusClass = 'status-completed';
      } else if (overallCompletionRate >= 70) {
        statusText = '基本完成';
        statusClass = 'status-partial';
      } else {
        statusText = '依从性差';
        statusClass = 'status-missed';
      }
    } else if (new Date(startDate) <= new Date(today)) {
      // 进行中的用药
      statusText = '服用中';
      statusClass = 'status-ongoing';
    } else {
      // 未来的用药
      statusText = '未开始';
      statusClass = 'status-planned';
    }

    return {
      totalDays,
      completedDays,
      partiallyCompletedDays,
      missedDays,
      overallCompletionRate,
      statusText,
      statusClass
    };
  },

  // 日期格式化方法
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 保留原来的依从性计算方法（用于统计）
  calculateCompletionRate(medication) {
    // 简化计算，后期可以根据实际服药记录优化
    const today = new Date();
    const startDate = new Date(medication.startDate);
    const endDate = new Date(medication.endDate);

    if (today < startDate) return 0;

    const actualEndDate = today < endDate ? today : endDate;
    const totalDays = Math.ceil((actualEndDate - startDate) / (24 * 60 * 60 * 1000)) + 1;

    if (totalDays <= 0) return 0;

    // 基于用药记录计算依从性，这里使用模拟数据
    // 实际应用中应该基于真实的服药记录计算
    const baseRate = 85 + Math.random() * 10; // 85-95%之间
    return Math.min(95, Math.max(80, baseRate));
  },

  // 计算用药统计
  calculateMedicationStats(medications) {
    const today = new Date();
    let activeMedications = 0;
    let totalCompletionRate = 0;

    medications.forEach(medication => {
      const endDate = new Date(medication.endDate);
      if (endDate >= today) {
        activeMedications++;
      }
      totalCompletionRate += this.calculateCompletionRate(medication);
    });

    return {
      totalMedications: medications.length,
      activeMedications,
      completionRate: medications.length > 0 ?
        Math.round(totalCompletionRate / medications.length) : 0
    };
  },

  // 检查血常规异常
  checkBloodAbnormal(record) {
    const { wbc, rbc, hemoglobin, platelets } = record;

    // 简化的异常判断逻辑
    if (wbc && (wbc < 4 || wbc > 10)) return true;
    if (rbc && (rbc < 4.3 || rbc > 5.8)) return true;
    if (hemoglobin && (hemoglobin < 130 || hemoglobin > 175)) return true;
    if (platelets && (platelets < 125 || platelets > 350)) return true;

    // C反应蛋白异常判断
    const { crp } = record;
    if (crp && parseFloat(crp) > 3.0) return true;

    return false;
  },

  // 检查EBV异常
  checkEbvAbnormal(record) {
    // 检查DNA载量是否有异常（大于0通常表示阳性）
    const dnaValue = record.ebvDna || record.dnaLoad || record.EBV_DNA || record.ebv_dna;
    return dnaValue && parseFloat(dnaValue) > 0;
  },

  // 检查CMV异常
  checkCmvAbnormal(record) {
    // 检查DNA载量是否有异常（大于0通常表示阳性）
    const dnaValue = record.hcmvDna || record.dnaLoad || record.HCMV_DNA || record.hcmv_dna;
    return dnaValue && parseFloat(dnaValue) > 0;
  },

  // 检查LDH异常
  checkLdhAbnormal(record) {
    // 检查乳酸脱氢酶值是否异常（正常范围100-300 U/L）
    const ldhValue = record.ldh || record.LDH;
    if (ldhValue) {
      const numValue = parseFloat(ldhValue);
      if (!isNaN(numValue) && (numValue < 100 || numValue > 300)) {
        return true;
      }
    }

    // 检查其他LDH相关指标
    const { ldh1, ldh2, ldh3, ldh4, ldh5, aHbdh } = record;
    if ((ldh1 && parseFloat(ldh1) > 60) ||
      (ldh2 && parseFloat(ldh2) > 80) ||
      (aHbdh && parseFloat(aHbdh) > 180)) {
      return true;
    }

    return false;
  },

  // 检查肝功能异常
  checkLiverAbnormal(record) {
    const { alt, ast, tbil, dbil } = record;

    // 简化的异常判断逻辑
    if (alt && parseFloat(alt) > 50) return true;
    if (ast && parseFloat(ast) > 40) return true;
    if (tbil && parseFloat(tbil) > 17.1) return true;
    if (dbil && parseFloat(dbil) > 6.8) return true;

    return false;
  },

  // 检查肾功能异常
  checkKidneyAbnormal(record) {
    const { cr, creatinine, bun, urea, ua, egfr, gfr } = record;

    // 简化的异常判断逻辑
    const crValue = cr || creatinine;
    if (crValue && parseFloat(crValue) > 133) return true;
    if (bun && parseFloat(bun) > 8.2) return true;
    if (ua && parseFloat(ua) > 428) return true;
    const gfrValue = egfr || gfr;
    if (gfrValue && parseFloat(gfrValue) < 90) return true;

    return false;
  },

  // 格式化日期键值
  formatDateKey(date) {
    if (!date) return '';

    if (typeof date === 'string') {
      // 如果已经是YYYY-MM-DD格式，直接返回
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }

      // 处理中文日期格式 "X月X日"
      const chineseDateMatch = date.match(/^(\d{1,2})月(\d{1,2})日$/);
      if (chineseDateMatch) {
        const currentYear = new Date().getFullYear();
        const month = parseInt(chineseDateMatch[1]);
        const day = parseInt(chineseDateMatch[2]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      // 如果是其他字符串格式，尝试解析
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {

        return '';
      }
      date = parsed;
    }

    if (!(date instanceof Date)) {
      date = new Date(date);
    }

    if (isNaN(date.getTime())) {

      return '';
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 格式化显示日期
  formatDisplayDate(date) {
    if (!date) return '';

    if (typeof date === 'string') {
      // 如果已经是"X月X日"格式，直接返回
      if (/^\d{1,2}月\d{1,2}日$/.test(date)) {
        return date;
      }

      // 如果是YYYY-MM-DD格式，直接解析
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(num => parseInt(num));
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${month}月${day}日`;
        }
      }

      // 尝试解析其他格式
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {

        return date; // 返回原始字符串
      }
      date = parsed;
    }

    if (!(date instanceof Date)) {
      date = new Date(date);
    }

    if (isNaN(date.getTime())) {

      return '';
    }

    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 获取星期
  getWeekday(date) {
    if (!date) return '';

    if (typeof date === 'string') {
      // 处理中文日期格式 "X月X日"
      const chineseDateMatch = date.match(/^(\d{1,2})月(\d{1,2})日$/);
      if (chineseDateMatch) {
        const currentYear = new Date().getFullYear();
        const month = parseInt(chineseDateMatch[1]) - 1; // 月份从0开始
        const day = parseInt(chineseDateMatch[2]);
        date = new Date(currentYear, month, day, 12, 0, 0); // 使用中午时间避免时区问题
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // 如果是YYYY-MM-DD格式，添加时间部分避免时区问题
        date = new Date(date + 'T12:00:00');
      } else {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {

          return '';
        }
        date = parsed;
      }
    }

    if (!(date instanceof Date)) {
      date = new Date(date);
    }

    if (isNaN(date.getTime())) {

      return '';
    }

    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `周${weekdays[date.getDay()]}`;
  },

  // 获取相对时间显示（今天、昨天等）
  getRelativeTime(dateInput) {
    if (!dateInput) return '';

    let targetDate;
    if (typeof dateInput === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        targetDate = new Date(dateInput + 'T12:00:00');
      } else {
        targetDate = new Date(dateInput);
      }
    } else {
      targetDate = new Date(dateInput);
    }

    if (isNaN(targetDate.getTime())) {
      return '';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) {
      return '今天';
    } else if (target.getTime() === yesterday.getTime()) {
      return '昨天';
    } else if (target.getTime() === tomorrow.getTime()) {
      return '明天';
    } else {
      // 计算天数差
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0 && diffDays <= 7) {
        return `${diffDays}天后`;
      } else if (diffDays < 0 && diffDays >= -7) {
        return `${Math.abs(diffDays)}天前`;
      } else {
        // 超过7天就显示周几
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        return `周${weekdays[target.getDay()]}`;
      }
    }
  },

  showBloodDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showEbvDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showCmvDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showOrganDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showLiverDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showKidneyDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showUrineDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showStoolDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.showRecordDetail({ currentTarget: { dataset: { record: item } } });
  },

  showMedicationDetail(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '/pages/medication/index'
    });
  },

  // 关闭健康详情弹窗
  closeHealthDetail() {
    this.setData({
      showHealthDetailPopup: false,
      currentHealthDetail: {}
    });
  },

  // 确保用户信息已设置
  ensureUserInfo() {
    const { openid, currentProfileId } = this.data;

    if (!openid || !currentProfileId) {

      try {
        const app = getApp();
        const newOpenid = app.getOpenIdIfLoggedIn();
        const newCurrentProfileId = app.getCurrentProfileId();

        if (newOpenid && newCurrentProfileId) {
          this.setData({
            openid: newOpenid,
            currentProfileId: newCurrentProfileId
          });

        } else {

        }
      } catch (err) {

      }
    } else {

    }
  },

  // 显示记录详情 - 统一按照血常规逻辑处理
  async showRecordDetail(e) {
    const { record } = e.currentTarget.dataset;

    this.ensureUserInfo();

    let details = [];
    let hasAbnormal = false;

    try {
      if (record.type === 'blood-test') {
        // 血常规检测详情 - 标准逻辑
        const standardIndicators = [
          { key: 'wbc', name: '白细胞(WBC)', min: 4.0, max: 10.0, unit: '×10⁹/L' },
          { key: 'rbc', name: '红细胞(RBC)', min: 4.3, max: 5.8, unit: '×10¹²/L' },
          { key: 'hemoglobin', name: '血红蛋白(HGB)', min: 130, max: 175, unit: 'g/L' },
          { key: 'platelets', name: '血小板(PLT)', min: 125, max: 350, unit: '×10⁹/L' },
          { key: 'neutrophil', name: '中性粒细胞(NEUT)', min: 2.0, max: 7.0, unit: '×10⁹/L' },
          { key: 'lymphocyte', name: '淋巴细胞(LYMPH)', min: 0.8, max: 4.0, unit: '×10⁹/L' },
          { key: 'monocyte', name: '单核细胞(MONO)', min: 0.12, max: 0.8, unit: '×10⁹/L' },
          { key: 'hematocrit', name: '红细胞压积(HCT)', min: 40, max: 50, unit: '%' }
        ];

        // 添加标准指标
        standardIndicators.forEach(indicator => {
          let value = record[indicator.key];
          if ((!value || value === '' || value === '-') && record.customValues) {
            value = record.customValues[indicator.key];
          }

          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            const numValue = parseFloat(value);
            const isAbnormal = !isNaN(numValue) && (numValue < indicator.min || numValue > indicator.max);
            if (isAbnormal) hasAbnormal = true;

            details.push({
              name: indicator.name,
              value: `${value}${indicator.unit ? ' ' + indicator.unit : ''}`,
              reference: `${indicator.min}-${indicator.max}${indicator.unit ? ' ' + indicator.unit : ''}`,
              isAbnormal
            });
          }
        });

        // 处理自定义指标（按照血常规的逻辑）
        if (record.customValues && Object.keys(record.customValues).length > 0) {
          const standardIndicatorKeys = standardIndicators.map(ind => ind.key);
          const result = await this.processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal);
          details = result.details;
          hasAbnormal = result.hasAbnormal;
        }

      } else if (record.type === 'ebv-test') {
        // EB病毒检测详情 - 只保留必选项，其他让用户自己添加
        const standardIndicators = [
          { key: 'ebvDna', name: 'EBV-DNA', min: 0, max: 0, unit: 'IU/mL' }
        ];

        // 添加标准指标
        standardIndicators.forEach(indicator => {
          let value = record[indicator.key];
          if ((!value || value === '' || value === '-') && record.customValues) {
            value = record.customValues[indicator.key];
          }

          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            const numValue = parseFloat(value);
            const isDna = indicator.key.toLowerCase().includes('dna');
            const isAbnormal = isDna ? (!isNaN(numValue) && numValue > 0) : (!isNaN(numValue) && numValue > indicator.max);
            if (isAbnormal) hasAbnormal = true;

            details.push({
              name: indicator.name,
              value: `${value}${indicator.unit ? ' ' + indicator.unit : ''}`,
              reference: isDna ? '阴性 (≤0)' : `≤${indicator.max}${indicator.unit ? ' ' + indicator.unit : ''}`,
              isAbnormal
            });
          }
        });

        // 处理自定义指标（按照血常规的逻辑）
        if (record.customValues && Object.keys(record.customValues).length > 0) {
          const standardIndicatorKeys = standardIndicators.map(ind => ind.key);
          const result = await this.processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal);
          details = result.details;
          hasAbnormal = result.hasAbnormal;
        }

      } else if (record.type === 'cmv-test') {
        // 巨细胞病毒检测详情 - 按照血常规逻辑（包含所有指标）
        const standardIndicators = [
          { key: 'hcmvDna', name: 'HCMV-DNA', min: 0, max: 0, unit: 'IU/mL' },
          { key: 'dnaLoad', name: 'DNA载量', min: 0, max: 0, unit: 'IU/mL' },
          { key: 'pp65', name: 'PP65抗原', min: 0, max: 0, unit: '个/10万细胞' },
          { key: 'cmvIgM', name: 'CMV-IgM', min: 0, max: 1.0, unit: 'COI' },
          { key: 'igM', name: '巨细胞病毒IgM', min: 0, max: 1.0, unit: 'COI' },
          { key: 'cmvIgG', name: 'CMV-IgG', min: 0, max: 1.0, unit: 'COI' },
          { key: 'igG', name: '巨细胞病毒IgG', min: 0, max: 1.0, unit: 'COI' },
          { key: 'avidity', name: 'IgG亲和力', min: 0, max: 100, unit: '%' },
          { key: 'immediate', name: '即早基因', min: 0, max: 1.0, unit: 'COI' },
          { key: 'late', name: '晚期基因', min: 0, max: 1.0, unit: 'COI' },
          { key: 'igA', name: 'IgA抗体', min: 0, max: 1.0, unit: 'COI' },
          { key: 'antigenP52', name: 'P52抗原', min: 0, max: 1.0, unit: 'COI' },
          { key: 'earlyAntigen', name: '早期抗原', min: 0, max: 1.0, unit: 'COI' }
        ];

        // 添加标准指标
        standardIndicators.forEach(indicator => {
          let value = record[indicator.key];
          if ((!value || value === '' || value === '-') && record.customValues) {
            value = record.customValues[indicator.key];
          }

          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            const numValue = parseFloat(value);
            const isDna = indicator.key.toLowerCase().includes('dna') || indicator.key === 'pp65';
            const isAbnormal = isDna ? (!isNaN(numValue) && numValue > 0) : (!isNaN(numValue) && numValue > indicator.max);
            if (isAbnormal) hasAbnormal = true;

            details.push({
              name: indicator.name,
              value: `${value}${indicator.unit ? ' ' + indicator.unit : ''}`,
              reference: isDna ? '阴性 (≤0)' : `≤${indicator.max}${indicator.unit ? ' ' + indicator.unit : ''}`,
              isAbnormal
            });
          }
        });

        // 处理自定义指标（按照血常规的逻辑）
        if (record.customValues && Object.keys(record.customValues).length > 0) {
          const standardIndicatorKeys = standardIndicators.map(ind => ind.key);
          const result = await this.processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal);
          details = result.details;
          hasAbnormal = result.hasAbnormal;
        }

      } else if (record.type === 'ldh-test') {
        // 乳酸脱氢酶检测详情 - 按照血常规逻辑（包含所有指标）
        const standardIndicators = [
          { key: 'ldh', name: '数值', min: 100, max: 300, unit: 'U/L' },
        ];

        // 添加标准指标
        standardIndicators.forEach(indicator => {
          let value = record[indicator.key];
          if ((!value || value === '' || value === '-') && record.customValues) {
            value = record.customValues[indicator.key];
          }

          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            const numValue = parseFloat(value);
            const isAbnormal = !isNaN(numValue) && (numValue < indicator.min || numValue > indicator.max);
            if (isAbnormal) hasAbnormal = true;

            details.push({
              name: indicator.name,
              value: `${value}${indicator.unit ? ' ' + indicator.unit : ''}`,
              unit: indicator.unit,
              isAbnormal: isAbnormal,
              reference: `${indicator.min}-${indicator.max}${indicator.unit ? ' ' + indicator.unit : ''}`
            });
          }
        });

        // 处理自定义指标（按照血常规的逻辑）
        if (record.customValues && Object.keys(record.customValues).length > 0) {
          const standardIndicatorKeys = standardIndicators.map(ind => ind.key);
          const result = await this.processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal);
          details = result.details;
          hasAbnormal = result.hasAbnormal;
        }

      } else if (record.type === 'liver-test') {
        // 肝功能检测详情 - 按照血常规逻辑（包含所有指标）
        const standardIndicators = [
          { key: 'alt', name: 'ALT', min: 9, max: 50, unit: 'U/L' },
          { key: 'ast', name: 'AST', min: 15, max: 40, unit: 'U/L' },
          { key: 'tbil', name: '总胆红素', min: 5.1, max: 17.1, unit: 'μmol/L' },
          { key: 'dbil', name: '直接胆红素', min: 0, max: 6.8, unit: 'μmol/L' },
          { key: 'alb', name: '白蛋白', min: 40, max: 55, unit: 'g/L' },
          { key: 'tp', name: '总蛋白', min: 65, max: 85, unit: 'g/L' },
          { key: 'ggt', name: 'GGT', min: 7, max: 45, unit: 'U/L' },
          { key: 'alp', name: 'ALP', min: 50, max: 135, unit: 'U/L' },
          { key: 'che', name: '胆碱酯酶', min: 5320, max: 12920, unit: 'U/L' },
          { key: 'pa', name: '前白蛋白', min: 200, max: 400, unit: 'mg/L' },
          { key: 'tba', name: '总胆汁酸', min: 0, max: 15, unit: 'μmol/L' }
        ];

        // 添加标准指标
        standardIndicators.forEach(indicator => {
          let value = record[indicator.key];
          if ((!value || value === '' || value === '-') && record.customValues) {
            value = record.customValues[indicator.key];
          }

          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            const numValue = parseFloat(value);
            const isAbnormal = !isNaN(numValue) && (numValue < indicator.min || numValue > indicator.max);
            if (isAbnormal) hasAbnormal = true;

            details.push({
              name: indicator.name,
              value: `${value}${indicator.unit ? ' ' + indicator.unit : ''}`,
              reference: `${indicator.min}-${indicator.max}${indicator.unit ? ' ' + indicator.unit : ''}`,
              isAbnormal
            });
          }
        });

        // 处理自定义指标（按照血常规的逻辑）
        if (record.customValues && Object.keys(record.customValues).length > 0) {
          const standardIndicatorKeys = standardIndicators.map(ind => ind.key);
          const result = await this.processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal);
          details = result.details;
          hasAbnormal = result.hasAbnormal;
        }

      } else if (record.type === 'kidney-test') {
        // 肾功能检测详情 - 按照血常规逻辑（包含所有指标）
        const standardIndicators = [
          { key: 'cr', name: '肌酐', min: 44, max: 133, unit: 'μmol/L' },
          { key: 'creatinine', name: '肌酐', min: 44, max: 133, unit: 'μmol/L' },
          { key: 'bun', name: '尿素氮', min: 2.9, max: 8.2, unit: 'mmol/L' },
          { key: 'urea', name: '尿素', min: 2.9, max: 8.2, unit: 'mmol/L' },
          { key: 'ua', name: '尿酸', min: 208, max: 428, unit: 'μmol/L' },
          { key: 'egfr', name: 'eGFR', min: 90, max: 120, unit: 'ml/min/1.73m²' },
          { key: 'gfr', name: 'eGFR', min: 90, max: 120, unit: 'ml/min/1.73m²' },
          { key: 'cysc', name: '胱抑素C', min: 0.51, max: 1.09, unit: 'mg/L' },
          { key: 'b2mg', name: 'β2微球蛋白', min: 0.7, max: 1.8, unit: 'mg/L' },
          { key: 'rtn', name: '视黄醇结合蛋白', min: 20, max: 60, unit: 'mg/L' },
          { key: 'upro', name: '尿蛋白', min: 0, max: 150, unit: 'mg/L' },
          { key: 'microalb', name: '微量白蛋白', min: 0, max: 30, unit: 'mg/L' }
        ];

        // 添加标准指标
        standardIndicators.forEach(indicator => {
          let value = record[indicator.key];
          if ((!value || value === '' || value === '-') && record.customValues) {
            value = record.customValues[indicator.key];
          }

          if (value !== undefined && value !== null && value !== '' && value !== '-') {
            const numValue = parseFloat(value);
            let isAbnormal = false;

            // 特殊处理肾小球滤过率（数值越高越好）
            if (indicator.key === 'egfr' || indicator.key === 'gfr') {
              isAbnormal = !isNaN(numValue) && numValue < indicator.min;
            } else {
              isAbnormal = !isNaN(numValue) && (numValue < indicator.min || numValue > indicator.max);
            }

            if (isAbnormal) hasAbnormal = true;

            details.push({
              name: indicator.name,
              value: `${value}${indicator.unit ? ' ' + indicator.unit : ''}`,
              reference: indicator.key === 'egfr' || indicator.key === 'gfr' ?
                `≥${indicator.min}${indicator.unit ? ' ' + indicator.unit : ''}` :
                `${indicator.min}-${indicator.max}${indicator.unit ? ' ' + indicator.unit : ''}`,
              isAbnormal
            });
          }
        });

        // 处理自定义指标（按照血常规的逻辑）
        if (record.customValues && Object.keys(record.customValues).length > 0) {
          const standardIndicatorKeys = standardIndicators.map(ind => ind.key);
          const result = await this.processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal);
          details = result.details;
          hasAbnormal = result.hasAbnormal;
        }

      } else if (record.type === 'stool-record') {
        // 排便记录详情 - 显示完整信息
        const detailRecord = record.lastRecord || record;

        if (detailRecord.recordTime || detailRecord.time) {
          details.push({ name: '记录时间', value: detailRecord.recordTime || detailRecord.time || '未记录' });
        }

        if (detailRecord.consistency) {
          details.push({ name: '粪便性状', value: detailRecord.consistency });
        }

        if (detailRecord.color) {
          details.push({ name: '颜色', value: detailRecord.color });
        }

        if (detailRecord.hardness) {
          details.push({ name: '硬度', value: detailRecord.hardness });
        }

        // 血丝和粘液标红显示
        if (detailRecord.hasBlood) {
          details.push({
            name: '血丝',
            value: '有',
            isAbnormal: true
          });
          hasAbnormal = true;
        } else {
          details.push({ name: '血丝', value: '无' });
        }

        if (detailRecord.hasMucus) {
          details.push({
            name: '粘液',
            value: '有',
            isAbnormal: true
          });
          hasAbnormal = true;
        } else {
          details.push({ name: '粘液', value: '无' });
        }

        if (detailRecord.notes) {
          details.push({ name: '备注', value: detailRecord.notes });
        }

      } else if (record.type === 'urine-record') {
        // 尿量记录详情 - 显示完整信息
        if (record.count !== undefined && record.totalVolume !== undefined) {
          details.push({
            name: '记录次数',
            value: `${record.count}次`
          });

          details.push({
            name: '总尿量',
            value: `${record.totalVolume}ml`
          });

          if (record.count > 0) {
            details.push({
              name: '平均单次尿量',
              value: `${Math.round(record.totalVolume / record.count)}ml`
            });
          }

          // 判断是否异常（24小时尿量少于400ml或大于3000ml）
          if (record.totalVolume < 400 || record.totalVolume > 3000) {
            hasAbnormal = true;
          }
        } else {
          // 单条记录
          const detailRecord = record.lastRecord || record;

          if (detailRecord.time || detailRecord.recordTime) {
            details.push({
              name: '记录时间',
              value: detailRecord.time || detailRecord.recordTime
            });
          }

          if (detailRecord.volume) {
            details.push({
              name: '尿量',
              value: `${detailRecord.volume}ml`
            });
          }

          if (detailRecord.frequency) {
            details.push({ name: '排尿次数', value: `${detailRecord.frequency}次` });
          }
          if (detailRecord.avgVolume) {
            details.push({ name: '平均单次尿量', value: `${detailRecord.avgVolume}ml` });
          }
          if (detailRecord.nightFrequency) {
            details.push({ name: '夜间排尿次数', value: `${detailRecord.nightFrequency}次` });
          }
          if (detailRecord.urgency && detailRecord.urgency !== '无') {
            details.push({
              name: '尿急情况',
              value: detailRecord.urgency,
              isAbnormal: detailRecord.urgency !== '无'
            });
            if (detailRecord.urgency !== '无') hasAbnormal = true;
          }
          if (detailRecord.color) {
            details.push({ name: '尿液颜色', value: detailRecord.color });
          }
          if (detailRecord.notes) {
            details.push({ name: '备注', value: detailRecord.notes });
          }
        }
      } else {
        // 处理其他类型记录或已有details数组的记录(如健康档案记录)
        if (record.details && Array.isArray(record.details)) {
          // 处理已有details数组的记录(如健康档案记录)

          // 获取用户信息用于查询自定义指标名称
          const { openid, currentProfileId } = this.data;

          if (openid && currentProfileId) {
            try {
              const db = wx.cloud.database();

              // 查询所有自定义指标设置以获取真实名称
              const settingsRes = await db.collection('userIndicatorSettings')
                .where({
                  openid: openid,
                  profileId: currentProfileId
                })
                .get();

              // 创建 indicatorId 到真实名称的映射
              const indicatorNameMap = {};
              settingsRes.data.forEach(setting => {
                indicatorNameMap[setting.indicatorId] = {
                  name: setting.name,
                  unit: setting.unit || ''
                };
              });

              // 处理每个详情项
              record.details.forEach(detail => {
                const setting = indicatorNameMap[detail.name];
                const displayName = setting ? setting.name : detail.name;

                // 检查是否异常
                const numValue = parseFloat(detail.value);
                // 使用简化的异常判断（暂时不进行异常检测）
                const isAbnormal = false;

                details.push({
                  name: displayName,
                  value: detail.value + (setting && setting.unit ? ` ${setting.unit}` : ''),
                  reference: detail.reference || '参考范围待设定',
                  isAbnormal: isAbnormal
                });
              });

            } catch (err) {

              // 如果查询失败，仍然显示原始数据
              record.details.forEach(detail => {
                details.push({
                  name: detail.name,
                  value: detail.value,
                  reference: detail.reference || '暂无参考范围',
                  isAbnormal: detail.isAbnormal || false
                });
                if (detail.isAbnormal) hasAbnormal = true;
              });
            }
          } else {
            // 用户信息缺失，显示原始数据
            record.details.forEach(detail => {
              details.push({
                name: detail.name,
                value: detail.value,
                reference: detail.reference || '暂无参考范围',
                isAbnormal: detail.isAbnormal || false
              });
              if (detail.isAbnormal) hasAbnormal = true;
            });
          }
        }
      }

      const displayInfo = this.getDisplayInfo(record.type);

      this.setData({
        showHealthDetailPopup: true,
        currentHealthDetail: {
          ...displayInfo,
          date: this.formatDisplayDate(record.date),
          time: record.time || '',
          hospital: record.hospital || '', // 只显示实际录入的医院信息
          data: record,
          notes: record.notes || '',
          details: details,
          hasAbnormal: hasAbnormal
        }
      });
    } catch (error) {

      wx.showToast({
        title: '加载详情失败',
        icon: 'error'
      });
    }
  },

  // 统一处理自定义指标的函数（基于血常规的逻辑）
  async processCustomIndicatorsUnified(record, standardIndicatorKeys, details, hasAbnormal) {
    if (!record.customValues || Object.keys(record.customValues).length === 0) {
      return { details, hasAbnormal };
    }

    const { openid, currentProfileId } = this.data;
    if (!openid || !currentProfileId) {
      return { details, hasAbnormal };
    }

    try {
      const db = wx.cloud.database();

      // 根据记录类型选择正确的设置集合
      let collectionName = 'userIndicatorSettings'; // 默认为血常规
      if (record.type === 'ebv-test') {
        collectionName = 'ebvIndicatorSettings';
      } else if (record.type === 'cmv-test') {
        collectionName = 'cmvIndicatorSettings';
      } else if (record.type === 'ldh-test') {
        collectionName = 'ldhIndicatorSettings';
      } else if (record.type === 'liver-test') {
        collectionName = 'liverFunctionSettings';
      } else if (record.type === 'kidney-test') {
        collectionName = 'kidneyFunctionSettings';
      }

      const settingsRes = await db.collection(collectionName)
        .where({ openid: openid, profileId: currentProfileId })
        .get();

      const indicatorNameMap = {};
      settingsRes.data.forEach(setting => {
        indicatorNameMap[setting.indicatorId] = {
          name: setting.name,
          unit: setting.unit || ''
        };
      });

      // 处理自定义指标数据
      Object.keys(record.customValues).forEach(indicatorId => {
        // 跳过已经在标准指标中处理的项
        if (standardIndicatorKeys.includes(indicatorId)) {
          return;
        }

        const value = record.customValues[indicatorId];
        if (!value || value === '' || value === '-') {
          return;
        }

        const setting = indicatorNameMap[indicatorId];
        const displayName = setting ? setting.name : indicatorId;

        // 检查是否异常
        const numValue = parseFloat(value);
        // 使用简化的异常判断（暂时不进行异常检测）
        const isAbnormal = false;

        details.push({
          name: displayName,
          value: `${value}${setting && setting.unit ? ' ' + setting.unit : ''}`,
          reference: '参考范围待设定',
          isAbnormal: isAbnormal
        });
      });

    } catch (error) {

    }

    return { details, hasAbnormal };
  },

  getDisplayInfo(type) {
    const infoMap = {
      'blood-test': { title: '血常规', icon: 'blood-drop', iconColor: '#FFB84D' },
      'ebv-test': { title: 'EB病毒', icon: 'zoom-in', iconColor: '#FFB84D' },
      'cmv-test': { title: '巨细胞病毒', icon: 'search', iconColor: '#FFB84D' },
      'ldh-test': { title: '乳酸脱氢酶', icon: 'enzyme', iconColor: '#FFB84D' },
      'liver-test': { title: '肝功能检测', icon: 'liver', iconColor: '#FFB84D' },
      'kidney-test': { title: '肾功能检测', icon: 'filter', iconColor: '#FFB84D' },
      'stool-record': { title: '排便记录', icon: 'layers', iconColor: '#FFB84D' },
      'urine-record': { title: '尿量记录', icon: 'fill-color-1', iconColor: '#FFB84D' }
    };
    return infoMap[type] || { title: type, icon: 'layers', iconColor: '#FFB84D' };
  },

  isValidValue(value) {
    return value !== undefined && value !== null && value !== '' && value !== '-';
  },

  // 跳转到血常规页面
  navigateToBlood(e) {
    console.log('navigateToBlood called', e);
    wx.showToast({
      title: '点击血常规成功',
      icon: 'success'
    });

    const date = e.currentTarget.dataset.date;
    console.log('date:', date);

    // 先测试简单跳转
    wx.navigateTo({
      url: `/packageA/pages/blood-test/index?date=${date}`,
      success: () => {
        console.log('血常规页面跳转成功');
      },
      fail: (err) => {
        console.error('导航失败:', err);
        wx.showToast({
          title: `跳转失败: ${err.errMsg}`,
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 跳转到检查报告页面
  navigateToCheckReport(e) {
    console.log('navigateToCheckReport called', e);

    const date = e.currentTarget.dataset.date;
    console.log('date:', date);

    wx.navigateTo({
      url: `/packageB/pages/check-report/index?date=${date}`,
      success: () => {
        console.log('检查报告页面跳转成功');
      },
      fail: (err) => {
        console.error('检查报告导航失败:', err);
        wx.showToast({
          title: `跳转失败: ${err.errMsg}`,
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 跳转到就医档案详情（区分检查报告和门诊记录）
  navigateToMedicalRecordDetail(e) {
    const { id, date, recordType } = e.currentTarget.dataset;
    console.log('navigateToMedicalRecordDetail:', { id, date, recordType });

    if (recordType === 'clinic') {
      // 跳转到门诊记录页面
      wx.navigateTo({
        url: `/packageB/pages/clinic-record/index?date=${date}&editId=${id}`,
        success: () => {
          console.log('门诊记录详情页面跳转成功');
        },
        fail: (err) => {
          console.error('门诊记录详情导航失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } else {
      // 跳转到检查报告页面
      const urlParam = id ? `id=${id}` : `date=${date}`;
      wx.navigateTo({
        url: `/packageB/pages/check-report/index?${urlParam}`,
        success: () => {
          console.log('检查报告详情页面跳转成功');
        },
        fail: (err) => {
          console.error('检查报告详情导航失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },

  // 跳转到检查报告详情页面（从检查报告Tab）
  navigateToCheckReportDetail(e) {
    const { id, date } = e.currentTarget.dataset;
    console.log('navigateToCheckReportDetail:', { id, date });

    // 优先使用id，如果没有id则使用date
    const urlParam = id ? `id=${id}` : `date=${date}`;

    wx.navigateTo({
      url: `/packageB/pages/check-report/index?${urlParam}`,
      success: () => {
        console.log('检查报告详情页面跳转成功');
      },
      fail: (err) => {
        console.error('检查报告详情导航失败:', err);
        wx.showToast({
          title: `跳转失败: ${err.errMsg}`,
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { images, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls: images,
      current: current
    });
  },

  // 预览检查报告图片
  previewReportImage(e) {
    // catchtap 已经阻止了事件冒泡，无需手动调用 stopPropagation
    const { images, current } = e.currentTarget.dataset;

    // 处理图片URL数组：支持对象数组 [{url: 'xxx'}] 和字符串数组 ['xxx']
    const imageUrls = images.map(img => {
      let url = '';
      if (typeof img === 'string') {
        url = img;
      } else if (img && img.url) {
        url = img.url;
      }

      // 处理本地临时文件路径，过滤掉无效的本地路径
      if (url && url.startsWith('http://tmp/')) {
        return ''; // 本地临时文件已失效，过滤掉
      }

      return url;
    }).filter(url => url && url.startsWith('cloud://')); // 只保留云存储图片

    console.log('预览检查报告图片:', imageUrls, '当前:', current);

    if (imageUrls.length === 0) {
      wx.showModal({
        title: '无法预览',
        content: '图片为本地临时文件，已失效。请重新编辑此记录并上传图片。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    // 处理当前图片URL
    let currentUrl = current;
    if (!imageUrls.includes(currentUrl)) {
      currentUrl = imageUrls[0];
    }

    wx.previewImage({
      urls: imageUrls,
      current: currentUrl,
      fail: (err) => {
        console.error('图片预览失败:', err);
        wx.showModal({
          title: '图片预览失败',
          content: '图片可能已失效。建议重新编辑此记录并上传图片。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  // 跳转到EB病毒页面
  navigateToEbv(e) {
    console.log('navigateToEbv called', e);
    const date = e.currentTarget.dataset.date;
    console.log('ebv date:', date);
    wx.navigateTo({
      url: `/packageC/pages/ebv-record/index?date=${date}`,
      fail: (err) => {
        console.error('EB病毒页面导航失败:', err);
        wx.showToast({
          title: 'EB病毒页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到CMV病毒页面
  navigateToCmv(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageC/pages/cmv-record/index?date=${date}`
    });
  },

  // 跳转到LDH页面
  navigateToLdh(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageC/pages/ldh-record/index?date=${date}`
    });
  },

  // 跳转到肝功能页面
  navigateToLiver(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/liver-function/index?date=${date}`
    });
  },

  // 跳转到肾功能页面
  navigateToKidney(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/kidney-function/index?date=${date}`
    });
  },

  // 跳转到尿量记录页面
  navigateToUrine(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageB/pages/urine-record/index?date=${date}`
    });
  },

  // 跳转到排便记录页面
  navigateToStool(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageB/pages/stool-record/index?date=${date}`
    });
  },

  // 跳转到血糖页面
  navigateToBloodSugar(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/blood-sugar/index?date=${date}`
    });
  },

  // 跳转到血氧页面
  navigateToBloodOxygen(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/blood-oxygen/index?date=${date}`
    });
  },

  // 跳转到血压页面
  navigateToBloodPressure(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/blood-pressure/index?date=${date}`
    });
  },

  // 跳转到饮水页面
  navigateToWaterIntake(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/water-intake/index?date=${date}`
    });
  },

  // 跳转到体温页面
  navigateToTemperature(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/temperature/index?date=${date}`
    });
  },

  // 跳转到身体测量页面
  navigateToBodyMeasurement(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/body-measurement/index?date=${date}`
    });
  },

  // 跳转到饮食页面
  navigateToDiet(e) {
    const date = e.currentTarget.dataset.date;
    wx.navigateTo({
      url: `/packageA/pages/diet/index?date=${date}`
    });
  },

  // 跳转到用药记录页面
  navigateToMedication(e) {
    console.log('navigateToMedication called', e);
    const date = e.currentTarget.dataset.date;
    console.log('medication date:', date);
    wx.navigateTo({
      url: `/packageB/pages/medication/index?date=${date}`,
      success: () => {
        console.log('用药记录页面跳转成功');
      },
      fail: (err) => {
        console.error('用药记录页面导航失败:', err);
        wx.showToast({
          title: '用药记录页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 加载就医档案数据（包括检查报告和门诊记录）
  async loadCheckReportArchiveData() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {
      console.log('用户信息缺失，无法加载就医档案');
      return;
    }

    const { openid, currentProfileId } = userInfo;

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 获取时间范围过滤条件
      const timeRange = this.getTimeRange();

      // 构建检查报告查询
      let checkReportQuery = db.collection('checkReports').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        checkReportQuery = checkReportQuery.where({
          date: _.gte(timeRange.startTime).and(_.lte(timeRange.endTime))
        });
      }

      // 构建门诊记录查询
      let clinicRecordQuery = db.collection('clinicRecords').where({
        openid: openid,
        profileId: currentProfileId
      });

      if (timeRange) {
        clinicRecordQuery = clinicRecordQuery.where({
          date: _.gte(timeRange.startTime).and(_.lte(timeRange.endTime))
        });
      }

      // 并行查询
      const [checkReportRes, clinicRecordRes] = await Promise.all([
        checkReportQuery.orderBy('date', 'desc').orderBy('createTime', 'desc').get(),
        clinicRecordQuery.orderBy('date', 'desc').orderBy('updateTime', 'desc').get()
      ]);

      const reports = checkReportRes.data || [];
      const clinicRecords = clinicRecordRes.data || [];

      // 处理检查报告数据
      const resultTypeMap = {
        'normal': '正常',
        'abnormal': '异常',
        'borderline': '临界值',
        'pending': '待复查',
        'inconclusive': '结果不明确'
      };

      const processedReports = reports.map(report => ({
        ...report,
        displayDate: this.formatDisplayDate(new Date(report.date)),
        weekday: this.getWeekday(report.date),
        relativeTime: this.getRelativeTime(report.date),
        resultTypeLabel: resultTypeMap[report.resultType] || report.resultType || '未知',
        id: report._id,
        recordType: 'checkReport',
        projectName: report.projectName || '检查报告',
        detailedResults: report.detailedResults || ''
      }));

      // 处理门诊记录数据
      const processedClinicRecords = clinicRecords.map(record => ({
        ...record,
        displayDate: this.formatDisplayDate(new Date(record.date)),
        weekday: this.getWeekday(record.date),
        relativeTime: this.getRelativeTime(record.date),
        id: record._id,
        recordType: 'clinic',
        projectName: record.hospitalName || '门诊记录',
        resultTypeLabel: record.departmentName || '',
        detailedResults: `${record.doctorName ? '医生：' + record.doctorName : ''}`
      }));

      // 合并并按日期排序
      const allRecords = [...processedReports, ...processedClinicRecords].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateB - dateA;
        const timeA = new Date(a.createTime || a.updateTime || 0).getTime();
        const timeB = new Date(b.createTime || b.updateTime || 0).getTime();
        return timeB - timeA;
      });

      // 计算统计数据
      const stats = {
        totalReports: allRecords.length,
        checkReportCount: processedReports.length,
        clinicRecordCount: processedClinicRecords.length,
        normalCount: processedReports.filter(r => r.resultType === 'normal').length,
        abnormalCount: processedReports.filter(r => r.resultType === 'abnormal').length
      };

      // 存储所有记录和应用筛选
      this.setData({
        allMedicalRecords: allRecords,
        checkReportStats: stats,
        isPageLoading: false,
        'tabLoadedStatus.checkReport': true // 标记就医档案Tab已加载
      }, () => {
        // 应用类型筛选
        this.applyMedicalRecordTypeFilter();
      });

      console.log('就医档案数据加载完成:', {
        总记录: stats.totalReports,
        检查报告: stats.checkReportCount,
        门诊记录: stats.clinicRecordCount
      });

    } catch (error) {
      console.error('加载就医档案失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
      this.setData({
        isPageLoading: false,
        'tabLoadedStatus.checkReport': true // 即使失败，也标记为已加载
      });
    }
  },

  
  onReachBottom() {
    // 可以实现分页加载
  },

  // 动态加载测试类型配置（包括必选项、默认配置项和自定义选项）
  async loadTestTypeConfig(testType) {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    const currentProfileId = app.getCurrentProfileId();

    if (!openid || !currentProfileId) {
      console.log('❌ 用户信息缺失，使用默认配置');
      return this.getDefaultTestConfig(testType);
    }

    try {
      const db = wx.cloud.database();

      // 获取基础配置定义
      const baseConfig = this.getDefaultTestConfig(testType);

      // 查询用户的指标选择配置（如果有的话）
      let selectedConfig = null;
      try {
        // 尝试获取最近的配置
        const configRes = await db.collection('userIndicatorConfig')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .orderBy('updateTime', 'desc')
          .limit(1)
          .get();

        if (configRes.data.length > 0) {
          selectedConfig = configRes.data[0].selectedIndicators || {};
          console.log(`📋 ${testType} 用户指标选择配置:`, selectedConfig);
        }
      } catch (err) {
        console.log(`⚠️ 查询 ${testType} 用户配置失败，使用默认配置`);
      }

      // 构建动态列配置
      const dynamicColumns = [...baseConfig.columns];

      // 🔥 针对血常规：添加用户选择的基础扩展指标（如CRP、RBC等）
      if (testType === 'blood' && selectedConfig) {
        const extendedBloodIndicators = [
          { key: 'rbc', label: '红细胞', unit: '×10¹²/L' },
          { key: 'crp', label: 'C反应蛋白', unit: 'mg/L' },
          { key: 'hct', label: '红细胞压积', unit: '%' },
          { key: 'lymph', label: '淋巴细胞', unit: '×10⁹/L' },
          { key: 'mono', label: '单核细胞', unit: '×10⁹/L' }
        ];

        extendedBloodIndicators.forEach(indicator => {
          // 如果用户选择了该指标，且列中还没有该指标，则添加
          if (selectedConfig[indicator.key] && !dynamicColumns.find(col => col.key === indicator.key)) {
            dynamicColumns.push(indicator);
            console.log(`✅ 添加血常规扩展指标: ${indicator.label} (${indicator.key})`);
          }
        });
      }

      // 查询用户的自定义指标配置
      const collectionMap = {
        'blood': 'userIndicatorSettings',
        'ebv': 'ebvIndicatorSettings',
        'cmv': 'cmvIndicatorSettings',
        'ldh': 'ldhIndicatorSettings',
        'liver': 'liverIndicatorSettings',
        'kidney': 'kidneyIndicatorSettings',
        'bloodSugar': 'bloodSugarIndicatorSettings',
        'bloodOxygen': 'bloodOxygenIndicatorSettings',
        'bloodPressure': 'bloodPressureIndicatorSettings',
        'water': 'waterIntakeIndicatorSettings',
        'temperature': 'temperatureIndicatorSettings',
        'bodyMeasurement': 'bodyMeasurementIndicatorSettings',
        'diet': 'dietIndicatorSettings'
      };

      const collection = collectionMap[testType];
      if (collection) {
        // 查询自定义指标
        const customRes = await db.collection(collection)
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .get();

        console.log(`📋 ${testType} 自定义指标查询结果:`, customRes.data.length, '条');

        // 添加自定义指标列
        if (customRes.data && customRes.data.length > 0) {
          customRes.data.forEach(customIndicator => {
            // 🔥 数据验证：确保自定义指标配置完整且有效
            if (!customIndicator.indicatorId) {
              console.warn(`⚠️ 跳过无效的自定义指标配置（缺少indicatorId）:`, customIndicator);
              return;
            }

            if (!customIndicator.name || typeof customIndicator.name !== 'string' || customIndicator.name.trim() === '') {
              console.warn(`⚠️ 跳过无效的自定义指标配置（name无效）:`, customIndicator);
              return;
            }

            // 🔥 验证name不是纯数字（很可能是数据错误）
            const trimmedName = customIndicator.name.trim();
            if (/^\d+$/.test(trimmedName)) {
              console.warn(`⚠️ 跳过可能错误的自定义指标配置（name为纯数字"${trimmedName}"）:`, customIndicator);
              return;
            }

            const customKey = customIndicator.indicatorId;

            // 检查是否在用户配置中被选中（如果有配置的话）
            const isSelected = selectedConfig ? selectedConfig[customKey] : true; // 默认显示自定义指标

            if (isSelected) {
              dynamicColumns.push({
                key: customKey,
                label: trimmedName,
                unit: customIndicator.unit || '',
                isCustom: true
              });
            }
          });
        }
      }

      console.log(`📋 ${testType} 最终列配置 (${dynamicColumns.length}列):`, dynamicColumns.map(col => `${col.key}(${col.label})`).join(', '));

      return {
        ...baseConfig,
        columns: dynamicColumns
      };

    } catch (error) {
      console.error(`❌ 加载 ${testType} 配置失败:`, error);
      return this.getDefaultTestConfig(testType);
    }
  },

  // 获取默认测试配置
  getDefaultTestConfig(testType) {
    const configs = {
      'blood': {
        name: '血常规',
        columns: [
          { key: 'wbc', label: '白细胞', unit: '×10⁹/L' },
          { key: 'neut', label: '中性粒', unit: '×10⁹/L' },
          { key: 'hgb', label: '血红蛋白', unit: 'g/L' },
          { key: 'plt', label: '血小板', unit: '×10⁹/L' }
        ]
      },
      'checkReport': {
        name: '检查报告',
        columns: [
          { key: 'projectName', label: '检查项目', unit: '' },
          { key: 'resultType', label: '检测结果', unit: '' }
        ]
      },
      'ebv': {
        name: 'EB病毒',
        columns: [
          { key: 'ebvDna', label: 'EB病毒DNA', unit: 'IU/mL' }
        ]
      },
      'cmv': {
        name: '巨细胞病毒',
        columns: [
          { key: 'hcmvDna', label: 'HCMV-DNA', unit: 'IU/mL' }
        ]
      },
      'ldh': {
        name: '乳酸脱氢酶',
        columns: [
          { key: 'ldh', label: '数值', unit: 'U/L' }
        ]
      },
      'liver': {
        name: '肝功能',
        columns: [
          { key: 'alt', label: 'ALT', unit: 'U/L' },
          { key: 'ast', label: 'AST', unit: 'U/L' },
          { key: 'tbil', label: '总胆红素', unit: 'μmol/L' },
          { key: 'dbil', label: '直接胆红素', unit: 'μmol/L' }
        ]
      },
      'kidney': {
        name: '肾功能',
        columns: [
          { key: 'cr', label: '肌酐', unit: 'μmol/L' },
          { key: 'bun', label: '尿素氮', unit: 'mmol/L' },
          { key: 'ua', label: '尿酸', unit: 'μmol/L' }
        ]
      },
      'urine': {
        name: '尿量记录',
        columns: [
          { key: 'volume', label: '尿量', unit: 'ml' },
          { key: 'color', label: '颜色', unit: '' },
          { key: 'clarity', label: '清澈度', unit: '' }
        ]
      },
      'stool': {
        name: '排便记录',
        columns: [
          { key: 'type', label: '类型', unit: '' },
          { key: 'color', label: '颜色', unit: '' },
          { key: 'hasBlood', label: '血便', unit: '' }
        ]
      },
      'bloodSugar': {
        name: '血糖',
        columns: [
          { key: 'bloodSugar', label: '数值', unit: 'mmol/L' }
        ]
      },
      'bloodOxygen': {
        name: '血氧',
        columns: [
          { key: 'spo2', label: '数值', unit: '%' }
        ]
      },
      'bloodPressure': {
        name: '血压',
        columns: [
          { key: 'systolic', label: '高压', unit: 'mmHg' },
          { key: 'diastolic', label: '低压', unit: 'mmHg' }
        ]
      },
      'water': {
        name: '饮水',
        columns: [
          { key: 'water', label: '饮水', unit: 'ml' }
        ]
      },
      'temperature': {
        name: '体温',
        columns: [
          { key: 'temperature', label: '体温', unit: '℃' }
        ]
      },
      'bodyMeasurement': {
        name: '体重',
        columns: [
          { key: 'weight', label: '体重', unit: 'kg' },
          { key: 'height', label: '身高', unit: 'cm' }
        ]
      },
      'diet': {
        name: '饮食',
        columns: [
          { key: 'calories', label: '总热量', unit: 'kcal' },
          { key: 'protein', label: '蛋白质', unit: 'g' },
          { key: 'carbs', label: '碳水化合物', unit: 'g' }
        ]
      }
    };

    return configs[testType] || configs['blood'];
  },

  // 已删除自定义滚动提示检查，使用原生滚动条

  // 已删除自定义表格滚动处理，使用原生滚动

  // 生成表格视图数据 - 基于当前筛选状态
  async generateTableViewData() {
    const { healthRecords, selectedDataTypeFilter } = this.data;

    if (!healthRecords || healthRecords.length === 0) {
      this.setData({
        tableViewData: [],
        currentTestConfig: null,
        isPageLoading: false // 🔥 隐藏骨架图
      });
      return;
    }

    // 根据当前筛选确定表格类型
    let testType = selectedDataTypeFilter === 'all' ? 'blood' : selectedDataTypeFilter;

    // 动态加载配置
    const currentTestConfig = await this.loadTestTypeConfig(testType);

    // 生成表格数据
    const tableData = [];

    healthRecords.forEach(record => {
      // 根据测试类型获取对应的数据
      const dataKey = testType + 'Data';
      const recordData = record[dataKey];

      console.log('表格数据处理:', {
        testType,
        dataKey,
        recordData,
        currentTestConfig: currentTestConfig.name
      });

      if (recordData) {
        // 使用现有的格式化方法
        const formattedData = this.formatTestDataForTable(recordData, currentTestConfig);

        console.log('格式化后的数据:', formattedData);

        if (formattedData && Object.keys(formattedData).length > 0) {
          tableData.push({
            date: this.formatDateForTable(record.date),
            originalDate: record.originalDateKey || record.date,
            testData: formattedData,
            hasAbnormal: recordData.hasAbnormal || false
          });
        }
      }
    });

    // 按日期倒序排序
    tableData.sort((a, b) => new Date(b.originalDate) - new Date(a.originalDate));

    this.setData({
      tableViewData: tableData,
      currentTestConfig: currentTestConfig,
      isPageLoading: false // 🔥 隐藏骨架图
    });

    // 根据列数动态调整表格样式
    this.adjustTableLayout(currentTestConfig);
  },

  // 根据列数调整表格布局
  adjustTableLayout(testConfig) {
    if (!testConfig || !testConfig.columns) return;

    const columnCount = testConfig.columns.length + 1; // +1 for date column

    // 当列数大于等于5列时，使用固定宽度布局触发横向滚动
    // 当列数较少时，使用自适应布局撑满整个宽度
    const useManyColumnsLayout = columnCount >= 5;

    console.log(`📊 表格布局调整:
      - 测试类型: ${testConfig.name}
      - 数据列数: ${testConfig.columns.length}
      - 总列数: ${columnCount}
      - 布局模式: ${useManyColumnsLayout ? '固定宽度(many-columns)' : '自适应宽度(normal)'}`);

    // 使用更直接的方式：通过setData设置CSS类名
    const className = useManyColumnsLayout ? 'table-container many-columns' : 'table-container';
    console.log(`🎨 应用CSS类名: ${className}`);

    this.setData({
      tableContainerClass: className
    });
  },

  // 格式化日期用于表格显示
  formatDateForTable(dateStr) {
    if (!dateStr) return '';

    // 处理不同的日期格式
    let date;
    if (typeof dateStr === 'string') {
      // 如果是"X月X日"格式，转换为标准日期
      const chineseDateMatch = dateStr.match(/^(\d{1,2})月(\d{1,2})日$/);
      if (chineseDateMatch) {
        const currentYear = new Date().getFullYear();
        const month = parseInt(chineseDateMatch[1]) - 1; // 月份从0开始
        const day = parseInt(chineseDateMatch[2]);
        date = new Date(currentYear, month, day);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateStr);
      return dateStr; // 返回原始字符串
    }

    return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 格式化检测数据
  formatTestDataForTable(recordData, testConfig) {
    const formattedData = {};

    testConfig.columns.forEach(column => {
      let value = '';

      // 优先检查是否是自定义指标
      if (column.isCustom && recordData.customValues && recordData.customValues[column.key] !== undefined) {
        value = recordData.customValues[column.key];
        console.log(`📋 自定义指标 ${column.key}: ${value}`);
      } else {
        // 根据不同的数据类型和字段获取值
        if (testConfig.name === '血常规') {
          value = this.getBloodValue(recordData, column.key);
        } else if (testConfig.name === '检查报告') {
          if (column.key === 'projectName') {
            value = recordData.projectName || '';
          } else if (column.key === 'resultType') {
            // 结果类型转换为中文 - 与检查报告页面保持一致
            const resultTypeMap = {
              'normal': '正常',
              'abnormal': '异常',
              'borderline': '临界值',
              'pending': '待复查',
              'inconclusive': '结果不明确'
            };
            value = resultTypeMap[recordData.resultType] || recordData.resultType || '未知';
          }
        } else if (testConfig.name === 'EB病毒') {
          // EBV记录中字段名是 ebvDna，也要检查自定义值
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '巨细胞病毒') {
          // CMV记录中字段名是 hcmvDna，也要检查自定义值
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '乳酸脱氢酶') {
          // LDH记录中字段名是 ldh，也要检查自定义值
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '肝功能') {
          // 肝功能检测包含所有肝功能指标，也要检查自定义值
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '肾功能') {
          // 肾功能字段：cr, bun, ua - 直接使用字段名，也要检查自定义值
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '尿量记录') {
          // 尿液记录字段：volume(尿量), color(颜色), clarity(清澈度), frequency(次数)
          // 尿液记录数据存储在 records 数组中，取最后一条记录
          const actualRecord = recordData.records && recordData.records.length > 0 ? recordData.records[recordData.records.length - 1] : recordData;
          if (column.key === 'volume') {
            value = actualRecord.volume !== undefined && actualRecord.volume !== null ? `${actualRecord.volume}ml` : '';
          } else if (column.key === 'frequency') {
            value = recordData.count !== undefined ? recordData.count : (actualRecord.frequency !== undefined ? actualRecord.frequency : '');
          } else {
            value = actualRecord[column.key] !== undefined ? actualRecord[column.key] : '';
          }
        } else if (testConfig.name === '排便记录') {
          // 排便记录字段：type(类型), color(颜色), hasBlood(有血液)
          // 排便记录数据存储在 lastRecord 中
          const actualRecord = recordData.lastRecord || recordData;
          if (column.key === 'hasBlood') {
            value = actualRecord.hasBlood ? '有' : '无';
          } else {
            value = actualRecord[column.key] !== undefined ? actualRecord[column.key] : '';
          }
        } else if (testConfig.name === '血糖') {
          // 血糖记录字段：bloodSugar
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '血氧') {
          // 血氧记录字段：spo2, heartRate
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '血压') {
          // 血压记录字段：systolic, diastolic
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '饮水') {
          // 饮水记录字段：water
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '体温') {
          // 体温记录字段：temperature
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '体重') {
          // 体重记录字段：weight, height
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else if (testConfig.name === '饮食') {
          // 饮食记录字段：calories, protein, carbs
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        } else {
          // 默认情况，也要检查自定义值
          value = recordData[column.key] !== undefined ? recordData[column.key] :
            (recordData.customValues && recordData.customValues[column.key] !== undefined ? recordData.customValues[column.key] : '');
        }
      }

      // 先按原逻辑设置值
      formattedData[column.key] = (value !== undefined && value !== null && value !== '') ? value : '-';

      // 然后对于病毒载量等数值字段，如果最终是"-"就替换为"0"
      if (formattedData[column.key] === '-' &&
        (testConfig.name === 'EB病毒' || testConfig.name === '巨细胞病毒' || testConfig.name === '乳酸脱氢酶')) {
        formattedData[column.key] = '0';
        console.log('替换-为0:', testConfig.name, column.key);
      }
    });

    return formattedData;
  },

  // 获取血常规数据值
  getBloodValue(recordData, key) {
    let value;
    switch (key) {
      case 'wbc':
        value = recordData.wbc !== undefined ? recordData.wbc : (recordData.customValues?.wbc !== undefined ? recordData.customValues.wbc : '');
        break;
      case 'neut':
        value = recordData.neutrophil !== undefined ? recordData.neutrophil :
          (recordData.neut !== undefined ? recordData.neut :
            (recordData.customValues?.neutrophil !== undefined ? recordData.customValues.neutrophil :
              (recordData.customValues?.neut !== undefined ? recordData.customValues.neut : '')));
        break;
      case 'hgb':
        value = recordData.hemoglobin !== undefined ? recordData.hemoglobin :
          (recordData.hgb !== undefined ? recordData.hgb :
            (recordData.customValues?.hemoglobin !== undefined ? recordData.customValues.hemoglobin :
              (recordData.customValues?.hgb !== undefined ? recordData.customValues.hgb : '')));
        break;
      case 'plt':
        value = recordData.platelets !== undefined ? recordData.platelets :
          (recordData.plt !== undefined ? recordData.plt :
            (recordData.customValues?.platelets !== undefined ? recordData.customValues.platelets :
              (recordData.customValues?.plt !== undefined ? recordData.customValues.plt : '')));
        break;
      case 'rbc':
        value = recordData.rbc !== undefined ? recordData.rbc :
          (recordData.customValues?.rbc !== undefined ? recordData.customValues.rbc : '');
        break;
      case 'crp':
        value = recordData.crp !== undefined ? recordData.crp :
          (recordData.customValues?.crp !== undefined ? recordData.customValues.crp : '');
        break;
      case 'hct':
        value = recordData.hct !== undefined ? recordData.hct :
          (recordData.customValues?.hct !== undefined ? recordData.customValues.hct : '');
        break;
      case 'lymph':
        value = recordData.lymph !== undefined ? recordData.lymph :
          (recordData.customValues?.lymph !== undefined ? recordData.customValues.lymph : '');
        break;
      case 'mono':
        value = recordData.mono !== undefined ? recordData.mono :
          (recordData.customValues?.mono !== undefined ? recordData.customValues.mono : '');
        break;
      default:
        // 对于其他字段（包括自定义字段），先检查直接字段，再检查customValues
        value = recordData[key] !== undefined ? recordData[key] :
          (recordData.customValues && recordData.customValues[key] !== undefined ? recordData.customValues[key] : '');
    }
    return value;
  },

  // 获取肾功能数据值
  getKidneyValue(recordData, key) {
    switch (key) {
      case 'cr':
        return (recordData.cr !== undefined && recordData.cr !== null) ? recordData.cr :
          ((recordData.creatinine !== undefined && recordData.creatinine !== null) ? recordData.creatinine : '');
      default:
        return (recordData[key] !== undefined && recordData[key] !== null) ? recordData[key] : '';
    }
  },

  // 格式化血常规数据
  formatBloodDataForTable(bloodData) {
    if (!bloodData) return { wbc: '', plt: '', hgb: '', neut: '' };
    return {
      wbc: (bloodData.wbc !== undefined && bloodData.wbc !== null) ? bloodData.wbc : '',
      plt: (bloodData.platelets !== undefined && bloodData.platelets !== null) ? bloodData.platelets : ((bloodData.plt !== undefined && bloodData.plt !== null) ? bloodData.plt : ''),
      hgb: (bloodData.hemoglobin !== undefined && bloodData.hemoglobin !== null) ? bloodData.hemoglobin : ((bloodData.hgb !== undefined && bloodData.hgb !== null) ? bloodData.hgb : ''),
      neut: (bloodData.neutrophil !== undefined && bloodData.neutrophil !== null) ? bloodData.neutrophil : ((bloodData.neut !== undefined && bloodData.neut !== null) ? bloodData.neut : '')
    };
  },

  // 格式化检查报告数据
  formatCheckReportForTable(checkReportData) {
    if (!checkReportData) return '';
    return (checkReportData.projectName !== undefined && checkReportData.projectName !== null) ? checkReportData.projectName : '';
  },

  // 格式化EB病毒数据
  formatEbvDataForTable(ebvData) {
    if (!ebvData) return '';
    return (ebvData.ebvDna !== undefined && ebvData.ebvDna !== null) ? ebvData.ebvDna : '';
  },

  // 格式化CMV数据
  formatCmvDataForTable(cmvData) {
    if (!cmvData) return '';
    return (cmvData.hcmvDna !== undefined && cmvData.hcmvDna !== null) ? cmvData.hcmvDna : '';
  },

  // 格式化LDH数据
  formatLdhDataForTable(ldhData) {
    if (!ldhData) return '';
    return (ldhData.ldh !== undefined && ldhData.ldh !== null) ? ldhData.ldh : '';
  },

  // 格式化肝功能数据
  formatLiverDataForTable(liverData) {
    if (!liverData) return { alt: '', ast: '', tbil: '' };
    return {
      alt: (liverData.alt !== undefined && liverData.alt !== null) ? liverData.alt : '',
      ast: (liverData.ast !== undefined && liverData.ast !== null) ? liverData.ast : '',
      tbil: (liverData.tbil !== undefined && liverData.tbil !== null) ? liverData.tbil : ''
    };
  },

  // 格式化肾功能数据
  formatKidneyDataForTable(kidneyData) {
    if (!kidneyData) return { cr: '', bun: '', ua: '' };
    return {
      cr: (kidneyData.cr !== undefined && kidneyData.cr !== null) ? kidneyData.cr : ((kidneyData.creatinine !== undefined && kidneyData.creatinine !== null) ? kidneyData.creatinine : ''),
      bun: (kidneyData.bun !== undefined && kidneyData.bun !== null) ? kidneyData.bun : '',
      ua: (kidneyData.ua !== undefined && kidneyData.ua !== null) ? kidneyData.ua : ''
    };
  },

  // 格式化尿量数据
  formatUrineDataForTable(urineData) {
    if (!urineData) return '';
    return (urineData.totalVolume !== undefined && urineData.totalVolume !== null) ? urineData.totalVolume : '';
  },

  // 格式化排便数据
  formatStoolDataForTable(stoolData) {
    if (!stoolData) return '';
    return (stoolData.count !== undefined && stoolData.count !== null) ? stoolData.count : '';
  },

  
  onHide() {

  },

  
  onUnload() {

  },

  // 获取标准参考范围
  getStandardReference(fieldKey, unit) {
    const standardRanges = {
      // 血常规
      'wbc': '4.0-10.0',
      'rbc': '4.3-5.8',
      'hgb': '130-175',
      'plt': '125-350',
      'neut': '2.0-7.0',
      'crp': '≤3.0',
      'lymph': '0.8-4.0',
      'hct': '35-45',
      'mono': '0.12-0.8',
      // 肝功能
      'alt': '≤50',
      'ast': '≤40',
      'tbil': '≤17.1',
      'dbil': '≤6.8',
      // 肝功能其他
      'alb': '35-50',
      'tp': '60-80',
      'ggt': '≤50',
      'alp': '40-150',
      'che': '5000-12000',
      // 肾功能
      'cr': '≤133',
      'bun': '≤8.2',
      'ua': '≤428',
      'egfr': '≥90',
      'cysc': '0.6-1.1',
      'b2mg': '≤2.4',
      'rtn': '10-40',
      'upro': '≤150',
      // 乳酸脱氢酶
      'ldh': '100-300'
    };

    const range = standardRanges[fieldKey] || '参考范围待设定';
    return unit ? `${range} ${unit}` : range;
  },

  // ==================== 费用记录相关方法 ====================

  
  async loadExpenseData() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {
      console.log('用户信息缺失，无法加载费用记录');
      return;
    }

    const { openid, currentProfileId } = userInfo;

    if (!openid || !currentProfileId) {
      console.log('未获取到用户信息或档案ID，无法加载费用记录');
      return;
    }

    const { selectedDateFilter } = this.data;

    try {
      console.log('开始加载费用记录数据...');

      const db = wx.cloud.database();
      const _ = db.command;

      // 计算时间范围
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // 明天0点
      let startDate = new Date(endDate);

      switch (selectedDateFilter) {
        case '7':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '180':
          startDate.setDate(endDate.getDate() - 180);
          break;
        case '365':
          startDate.setDate(endDate.getDate() - 365);
          break;
        case 'all':
          startDate = new Date('2000-01-01'); // 足够早的日期
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const startDateStr = this.formatDateForDB(startDate);
      const endDateStr = this.formatDateForDB(endDate);

      console.log(`费用记录时间范围: ${startDateStr} 到 ${endDateStr}`);

      // 查询费用记录
      const expenseRes = await db.collection('expenseRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: _.gte(startDateStr).and(_.lt(endDateStr))
        })
        .orderBy('date', 'desc')
        .orderBy('time', 'desc')
        .get();

      console.log(`查询到 ${expenseRes.data.length} 条费用记录`);

      // 处理费用记录数据
      await this.processExpenseRecords(expenseRes.data, selectedDateFilter);

    } catch (error) {
      console.error('加载费用记录失败:', error);
      wx.showToast({
        title: '加载费用数据失败',
        icon: 'none'
      });
      this.setData({
        isPageLoading: false, // 🔥 隐藏骨架图
        'tabLoadedStatus.expense': true // 即使失败，也标记为已加载
      });
    }
  },

  
  async processExpenseRecords(records, dateFilter) {
    // 根据费用类型筛选
    const { selectedExpenseTypeFilter } = this.data;
    let filteredRecords = records;

    if (selectedExpenseTypeFilter && selectedExpenseTypeFilter !== 'all') {
      filteredRecords = records.filter(record =>
        record.expenseType === selectedExpenseTypeFilter
      );
    }

    if (!filteredRecords || filteredRecords.length === 0) {
      this.setData({
        expenseRecords: [],
        expenseStats: {
          totalExpense: 0,
          recordCount: 0,
          avgExpensePerDay: 0
        },
        expenseChartData: {
          categories: [],
          amounts: []
        },
        isPageLoading: false, // 🔥 隐藏骨架图
        'tabLoadedStatus.expense': true // 标记费用Tab已加载
      });
      return;
    }

    // 计算统计数据
    let totalExpense = 0;
    const expenseTypeMap = {}; // 费用类型统计
    const dateSet = new Set(); // 记录有费用的日期

    filteredRecords.forEach(record => {
      const amount = parseFloat(record.amount) || 0;
      totalExpense += amount;

      // 按费用类型分类
      const expenseType = record.expenseType || '其他';
      if (!expenseTypeMap[expenseType]) {
        expenseTypeMap[expenseType] = 0;
      }
      expenseTypeMap[expenseType] += amount;

      // 记录日期
      dateSet.add(record.date);
    });

    // 计算日均费用
    const dayCount = this.calculateDaysInRange(dateFilter);
    const avgExpensePerDay = dayCount > 0 ? totalExpense / dayCount : 0;

    // 准备图表数据
    const chartCategories = Object.keys(expenseTypeMap);
    const chartAmounts = chartCategories.map(cat => expenseTypeMap[cat].toFixed(2));

    // 按日期分组处理记录，用于时间轴展示
    const recordsByDate = this.groupExpenseRecordsByDate(filteredRecords);

    // 更新数据
    this.setData({
      expenseRecords: recordsByDate,
      expenseStats: {
        totalExpense: totalExpense.toFixed(2),
        recordCount: filteredRecords.length,
        avgExpensePerDay: avgExpensePerDay.toFixed(2)
      },
      expenseChartData: {
        categories: chartCategories,
        amounts: chartAmounts
      },
      isPageLoading: false, // 🔥 隐藏骨架图
      'tabLoadedStatus.expense': true // 标记费用Tab已加载
    });

    console.log('费用记录数据处理完成:', {
      总费用: totalExpense.toFixed(2),
      记录数: filteredRecords.length,
      日均费用: avgExpensePerDay.toFixed(2),
      筛选类型: selectedExpenseTypeFilter
    });
  },

  
  groupExpenseRecordsByDate(records) {
    const groupedMap = {};

    records.forEach(record => {
      const date = record.date;
      if (!groupedMap[date]) {
        groupedMap[date] = {
          date: date,
          displayDate: this.formatDisplayDate(date),
          relativeTime: this.getRelativeTime(date),
          weekday: this.getWeekday(date),
          originalDateKey: date,
          records: [],
          totalAmount: 0
        };
      }

      // 不再添加支付方式类名
      const recordWithClass = {
        ...record
      };

      groupedMap[date].records.push(recordWithClass);
      groupedMap[date].totalAmount += parseFloat(record.amount) || 0;
    });

    // 转换为数组并排序
    const groupedArray = Object.values(groupedMap);
    groupedArray.sort((a, b) => b.date.localeCompare(a.date));

    // 格式化总金额
    groupedArray.forEach(group => {
      group.totalAmount = group.totalAmount.toFixed(2);
    });

    return groupedArray;
  },

  
  calculateDaysInRange(dateFilter) {
    switch (dateFilter) {
      case '7': return 7;
      case '30': return 30;
      case '90': return 90;
      case '180': return 180;
      case '365': return 365;
      case 'all': return 365; // 默认按一年计算
      default: return 30;
    }
  },

  
  formatDateForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  
  navigateToExpenseDetail(e) {
    const { date } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/packageB/pages/expense-record/index?date=${date}`
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

})
