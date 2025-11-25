/**
 * 功能项自定义配置模块
 *
 * 核心逻辑：
 * 1. 配置存储：用户的功能项配置保存在云数据库 functionCustomConfig 集合中
 * 2. 配置加载：页面加载时从数据库读取配置，首次使用则用默认配置
 * 3. 配置更新：用户修改后保存到数据库，并立即刷新页面显示
 * 4. 疾病适配：淋巴瘤患者默认显示 LDH、EB病毒、巨细胞病毒
 *
 * 数据流：
 * - 保存：编辑弹窗 → 数据库 → 主页面刷新
 * - 加载：数据库 → 筛选可见项 → 主页面显示
 * - 刷新：等待 profileId 初始化 → 加载配置 → 显示
 */

const functionCustomModule = require('./function-custom');

const app = getApp()

const db = wx.cloud.database()



// 统一功能项配置生成器

function generateFunctionConfig(isLymphomaPatient = false, withDataKey = false) {

  const baseConfig = [

    { id: 'medication', name: '用药记录', icon: 'candy', visible: true, order: 1, navigate: 'navigateToMedicine' },

    { id: 'blood', name: '血常规', icon: 'blood-drop', visible: true, order: 2, navigate: 'navigateToBloodTest' },

    { id: 'clinic', name: '门诊记录', icon: 'hospital', visible: true, order: 3, navigate: 'navigateToClinic' },

    { id: 'checkReport', name: '检查报告', icon: 'assignment', visible: true, order: 4, navigate: 'navigateToCheckReport' },

    { id: 'liver', name: '肝功能', icon: 'liver', visible: false, order: 5, navigate: 'navigateToLiverFunction' },

    { id: 'kidney', name: '肾功能', icon: 'filter', visible: false, order: 6, navigate: 'navigateToKidneyFunction' },

    { id: 'ldh', name: '乳酸脱氢酶', icon: 'enzyme', visible: isLymphomaPatient, order: 7, navigate: 'navigateToLdh' },

    { id: 'ebv', name: 'EB病毒', icon: 'zoom-in', visible: isLymphomaPatient, order: 8, navigate: 'navigateToEbv' },

    { id: 'cmv', name: '巨细胞病毒', icon: 'search', visible: isLymphomaPatient, order: 9, navigate: 'navigateToCmv' },

    { id: 'bloodSugar', name: '血糖', icon: 'glucose', visible: isLymphomaPatient, order: 10, navigate: 'navigateToBloodSugar' },

    { id: 'urine', name: '尿量记录', icon: 'fill-color-1', visible: false, order: 11, navigate: 'navigateToUrine' },

    { id: 'stool', name: '排便记录', icon: 'layers', visible: false, order: 12, navigate: 'navigateToStool' },

    { id: 'expense', name: '费用记录', icon: 'wallet', visible: false, order: 13, navigate: 'navigateToExpense' }

  ]



  if (withDataKey) {

    return baseConfig.map(item => ({

      ...item,

      dataKey: `${item.id}Data`

    }))

  }



  return baseConfig

}



Page({

  data: {

    // 页面加载状态
    isPageLoading: true,
    hasLoadedBefore: false, // 标记页面是否已加载过数据


    // 轮播图数据
    bannerList: [],

    // 血常规指标名称映射

    bloodIndicatorNames: {

      wbc: '白细胞',

      neut: '中性粒细胞数',

      hgb: '血红蛋白',

      plt: '血小板',

      rbc: '红细胞',

      hct: '红细胞压积',

      lymph: '淋巴细胞绝对值',

      mono: '单核细胞绝对值'

    },

    // 暖光里程碑数据

    keyDate: {

      name: '骨髓移植',

      days: 58

    },

    // 新日历组件数据

    calendarExpanded: false, // 日历是否展开

    weekdayTitles: ['日', '一', '二', '三', '四', '五', '六'],

    currentYear: new Date().getFullYear(),

    currentMonth: new Date().getMonth() + 1,

    weekDays: [], // 周视图数据（最近7天）

    monthDays: [], // 月视图数据（完整月份）

    selectedDate: '', // 当前选中日期 YYYY-MM-DD

    selectedDateText: '', // 选中日期显示文本

    dateChanged: false, // 日期切换动画标志

    selectedDateData: {

      bloodData: null,

      ebvData: null,

      cmvData: null,

      liverData: null,

      kidneyData: null,

      ldhData: null,

      medicationData: null,

      clinicData: null,

      urineData: null,

      stoolData: null,

      checkReportData: null

    },

    // 今日事项

    todayTasks: [],

    showAddTask: false,

    newTaskText: '',

    date: '',

    datePickerVisible: false,

    transplantDatePickerVisible: false,

    checkupDatePickerVisible: false,

    bloodData: {

      wbc: '',

      hgb: '',

      plt: '',

      neut: ''

    },

    files: [],

    transplantDate: '',

    nextCheckupDate: '',

    daysSinceTransplant: 0,

    showKeyDatePopup: false,

    showKeyDateEditPopup: false,

    editingKeyDate: null,

    keyDateForm: {

      name: '', // 兼容性

      title: '',

      date: ''

    },

    keyDates: [],

    showDateDetailPopup: false,

    currentDate: null,

    firstUseDate: '', // 首次使用日期

    openid: '', // 用户唯一标识

    userInfo: {},

    hasUserInfo: false,

    newKeyDate: {

      name: '',

      date: '',

      type: 'birthday'

    },

    newTask: {

      name: '',

      dueTime: '',

      completed: false

    },





    isLoggedIn: false,



    // 🎨 美化功能数据

    latestBloodData: null, // 最近一次血常规数据

    latestMedicationData: null, // 今日用药数据

    todayClinicData: null, // 今日门诊数据

    todayUrineData: null, // 今日尿量数据

    todayStoolData: null, // 今日排便数据

    todayEbvData: null, // 今日EB病毒数据

    todayCmvData: null, // 今日巨细胞病毒数据

    todayLdhData: null, // 今日乳酸脱氢酶数据

    todayLiverData: null, // 今日肝功能数据

    todayKidneyData: null, // 今日肾功能数据



    animatedProgress: 0, // 动画进度值

    progressAnimationTimer: null, // 动画定时器



    // 🔥 关键：选中日期的数据（修复数据不显示问题）

    selectedDateData: {

      bloodData: null,

      ebvData: null,

      cmvData: null,

      liverData: null,

      kidneyData: null,

      ldhData: null,

      medicationData: null,

      clinicData: null,

      urineData: null,

      stoolData: null,

      checkReportData: null

    },



    // ✨ 功能项自定义编辑

    functionEditMode: false, // 功能项编辑模式

    showFunctionCustomPopup: false, // 功能项自定义弹窗



    // 主页面显示的功能项配置（按用户排序）
    mainPageFunctions: [],

    // iOS风格拖拽状态

    isDragging: false,

    dragStartIndex: -1,

    dragStartY: 0,

    currentTouchY: 0,

    dropLineIndex: -1,

    dragItemHeight: 96, // 单项高度(包括margin)

    customFunctionList: [ // 可自定义的功能项列表（仅调整现有10个功能项的顺序）

      {

        id: 'medication',

        name: '用药记录',

        icon: 'candy',

        visible: true,

        order: 1,

        navigate: 'navigateToMedicine'

      },

      {

        id: 'blood',

        name: '血常规',

        icon: 'blood-drop',

        visible: true,

        order: 2,

        navigate: 'navigateToBloodTest'

      },

      {

        id: 'clinic',

        name: '门诊记录',

        icon: 'hospital',

        visible: true,

        order: 3,

        navigate: 'navigateToClinic'

      },

      {

        id: 'checkReport',

        name: '检查报告',

        icon: 'assignment',

        visible: true,

        order: 4,

        navigate: 'navigateToCheckReport'

      },

      {

        id: 'liver',

        name: '肝功能',

        icon: 'liver',

        visible: false,

        order: 5,

        navigate: 'navigateToLiverFunction'

      },

      {

        id: 'kidney',

        name: '肾功能',

        icon: 'filter',

        visible: false,

        order: 6,

        navigate: 'navigateToKidneyFunction'

      },

      {

        id: 'ldh',

        name: '乳酸脱氢酶',

        icon: 'enzyme',

        visible: false,

        order: 7,

        navigate: 'navigateToLdh'

      },

      {

        id: 'ebv',

        name: 'EB病毒',

        icon: 'zoom-in',

        visible: false,

        order: 8,

        navigate: 'navigateToEbv'

      },

      {

        id: 'cmv',

        name: '巨细胞病毒',

        icon: 'search',

        visible: false,

        order: 9,

        navigate: 'navigateToCmv'

      },

      {

        id: 'bloodSugar',

        name: '血糖',

        icon: 'glucose',

        visible: false,

        order: 10,

        navigate: 'navigateToBloodSugar'

      },

      {

        id: 'urine',

        name: '尿量记录',

        icon: 'fill-color-1',

        visible: false,

        order: 11,

        navigate: 'navigateToUrine'

      },

      {

        id: 'stool',

        name: '排便记录',

        icon: 'layers',

        visible: false,

        order: 12,

        navigate: 'navigateToStool'

      },

      {

        id: 'expense',

        name: '费用记录',

        icon: 'wallet',

        visible: false,

        order: 13,

        navigate: 'navigateToExpense'

      }

    ],



    // 拖拽相关

    dragStartIndex: -1, // 拖拽开始位置

    dragCurrentIndex: -1, // 拖拽当前位置

    touchStartY: 0, // 触摸开始Y坐标

    isDragging: false // 是否正在拖拽

  },



  // 获取今天的日期字符串（YYYY-MM-DD）

  getTodayString() {

    const now = new Date()

    const year = now.getFullYear()

    const month = String(now.getMonth() + 1).padStart(2, '0')

    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`

  },



  onLoad() {

    // 初始化新日历组件

    this.initNewCalendar()



    // 计算拖拽区域高度

    const itemHeight = 120 // rpx

    const itemCount = this.data.customFunctionList.length

    const dragAreaHeight = itemCount * itemHeight


    // 🔧 立即设置默认功能项，确保页面有内容显示
    const defaultFunctions = generateFunctionConfig(false, true)
    const visibleDefaults = defaultFunctions.filter(f => f.visible).sort((a, b) => a.order - b.order)

    this.setData({

      currentDate: this.formatDate(new Date()),

      animatedProgress: 0, // 🌟 初始化动画进度

      dragAreaHeight: dragAreaHeight,

      mainPageFunctions: visibleDefaults // 立即显示默认功能项

    })



    // 🔧 延迟检查登录状态，确保app.js的onLaunch完成

    // 功能项配置在checkLoginAndLoadData中加载，确保有用户信息后再加载

    setTimeout(() => {

      this.checkLoginAndLoadData()

    }, 500)



    // 🛡️ 终极保护：5秒后强制隐藏骨架屏（防止页面永久卡住）

    setTimeout(() => {

      if (this.data.isPageLoading) {

        console.warn('⚠️ 页面加载超时，强制隐藏骨架屏');

        this.setData({ isPageLoading: false });

      }

    }, 5000)

  },

  // 加载轮播图数据
  async loadBanners() {
    try {
      // 添加时间戳避免缓存
      const res = await wx.cloud.callFunction({
        name: 'getBanners',
        data: {
          _t: Date.now() // 时间戳参数避免缓存
        }
      })

      if (res.result && res.result.success) {
        const banners = res.result.data || []

        // 处理轮播图数据格式
        const bannerList = banners.map(item => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.text || item.content || '',
              link: item.link || ''
            }
          } else {
            // 图片类型，确保有有效的图片URL
            const imageUrl = item.image || item.imageUrl || ''
            return {
              type: 'image',
              image: imageUrl,
              link: item.link || ''
            }
          }
        }).filter(item => {
          // 过滤掉无效的轮播图项
          if (item.type === 'text') {
            return item.text.trim() !== ''
          } else if (item.type === 'image') {
            return item.image.trim() !== ''
          }
          return false
        })

        // 如果没有配置的轮播图，使用默认文字轮播
        if (bannerList.length === 0) {
          this.setData({
            bannerList: [{
              type: 'text',
              text: '记录每一天，关注健康变化'
            }]
          })
        } else {
          this.setData({ bannerList })
        }
      }
    } catch (error) {
      console.error('加载轮播图失败:', error)
      // 失败时使用默认轮播图
      this.setData({
        bannerList: [{
          type: 'text',
          text: '记录每一天，关注健康变化'
        }]
      })
    }
  },

  // 轮播图点击事件 - 支持三种跳转方式
  onBannerTap(e) {
    const link = e.currentTarget.dataset.link
    if (!link) return

    // 1. 跳转其他小程序：miniprogram://appId?path=路径&extraData=数据
    if (link.startsWith('miniprogram://')) {
      try {
        const url = new URL(link)
        const appId = url.hostname
        const path = url.searchParams.get('path') || ''
        const extraDataStr = url.searchParams.get('extraData') || '{}'

        let extraData = {}
        try {
          extraData = JSON.parse(decodeURIComponent(extraDataStr))
        } catch (e) {
          console.warn('extraData解析失败:', e)
        }

        wx.navigateToMiniProgram({
          appId: appId,
          path: path,
          extraData: extraData,
          success: () => {
            console.log('跳转小程序成功')
          },
          fail: (err) => {
            console.error('跳转小程序失败:', err)
            wx.showToast({
              title: '跳转失败，请检查小程序配置',
              icon: 'none',
              duration: 2000
            })
          }
        })
      } catch (err) {
        console.error('解析小程序跳转链接失败:', err)
        wx.showToast({ title: '链接格式错误', icon: 'none' })
      }
      return
    }

    // 2. 跳转公众号：mp://公众号原始ID
    if (link.startsWith('mp://')) {
      const mpUsername = link.replace('mp://', '')
      wx.navigateToMiniProgram({
        appId: 'wx18a2ac992306a5a4', // 微信官方公众平台的固定AppID
        path: `/pages/home/home?userName=${mpUsername}`,
        envVersion: 'release',
        success: () => {
          console.log('跳转公众号成功')
        },
        fail: (err) => {
          console.error('跳转公众号失败:', err)
          wx.showToast({
            title: '无法打开公众号',
            icon: 'none',
            duration: 2000
          })
        }
      })
      return
    }

    // 3. 网页跳转：https://网址（需要配置业务域名白名单）
    if (link.startsWith('https://') || link.startsWith('http://')) {
      wx.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(link)}`,
        fail: (err) => {
          console.error('打开网页失败:', err)
          wx.showToast({
            title: '网页打开失败，请检查业务域名配置',
            icon: 'none',
            duration: 2000
          })
        }
      })
      return
    }

    // 不支持的协议
    wx.showToast({ title: '不支持的链接格式', icon: 'none' })
  },

  // 轮播图图片加载失败处理
  onBannerImageError(e) {
    console.error('轮播图图片加载失败:', e.detail)
    const index = e.currentTarget.dataset.index
    const bannerList = this.data.bannerList

    // 将失败的图片轮播替换为默认文字轮播
    if (index !== undefined && bannerList[index]) {
      bannerList[index] = {
        type: 'text',
        text: '记录每一天，关注健康变化',
        link: bannerList[index].link || ''
      }
      this.setData({ bannerList })
    }
  },




  onShow() {

    // 如果已经加载过，立即隐藏骨架屏（避免每次onShow都显示骨架屏）
    if (this.data.hasLoadedBefore) {
      this.setData({ isPageLoading: false })
    }

    // 设置tabBar选中状态

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {

      this.getTabBar().setData({

        selected: 1

      });

    }



    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()
    const isCurrentlyLoggedIn = !!openid
    const loginStateChanged = isCurrentlyLoggedIn !== this.data.isLoggedIn

    if (loginStateChanged) {
      if (!isCurrentlyLoggedIn) {
        // 刚退出登录，立即清空与登录相关的数据，避免展示旧内容
        this.setData({
          isLoggedIn: false,
          keyDates: [],
          todayTasks: [],
          selectedDateData: {
            bloodData: null,
            ebvData: null,
            cmvData: null,
            liverData: null,
            kidneyData: null,
            ldhData: null,
            medicationData: null,
            clinicData: null,
            urineData: null,
            stoolData: null,
            expenseData: null,
            checkReportData: null
          },
          hasLoadedBefore: true,
          isPageLoading: false
        }, () => {
          this.updateCalendarEvents()
        })
        return
      }

      // 刚登录，重新进入完整的初始化流程
      this.setData({
        isLoggedIn: true,
        isPageLoading: true,
        hasLoadedBefore: false
      })
      this.checkLoginAndLoadData()
      return
    }

    if (!isCurrentlyLoggedIn) {
      // 未登录状态下无需继续刷新数据
      return
    }

    if (!this.data.hasLoadedBefore) {
      // 登录状态已存在但尚未完成初始化，确保执行一次完整加载
      this.checkLoginAndLoadData()
      return
    }



    // 🔧 检查是否需要刷新数据（档案切换）

    if (app.globalData.needRefreshData) {

      console.log('🔄 onShow: 档案切换，重新加载所有数据')

      app.globalData.needRefreshData = false

      // 档案切换时需要完整重新加载，且重置hasLoadedBefore以显示骨架屏
      this.setData({
        isPageLoading: true, // 档案切换时显示骨架屏
        hasLoadedBefore: false // 重置加载状态
      })

      this.checkLoginAndLoadData()

      return // 档案切换时直接返回，不执行下面的逻辑

    }

    // 🔄 通用刷新逻辑：从功能项页面返回时刷新数据

    // 判断是否已完成初始加载（避免首次加载时重复请求）

    if (this.data.isLoggedIn && this.data.hasLoadedBefore) {

      // 🔥 检测是否需要刷新
      const needRefreshCalendar = app.globalData.needRefreshCalendar
      const needRefreshMedication = app.globalData?.needRefreshMedicationData

      // 判断是否需要显示骨架屏（从功能页面返回且有数据变更）
      const shouldShowSkeleton = needRefreshCalendar || needRefreshMedication

      if (needRefreshCalendar) {
        app.globalData.needRefreshCalendar = false
      }
      if (needRefreshMedication) {
        app.globalData.needRefreshMedicationData = false
      }

      // 刷新当前选中日期的数据（包含所有功能项数据）
      const currentDate = this.data.selectedDate || this.formatDate(new Date())
      this.loadDataForDate(currentDate, shouldShowSkeleton) // 从功能页面返回时显示骨架屏

      // 刷新日历事件标记（可能有新的记录）
      this.updateCalendarEvents()



      // 刷新今日待办和里程碑（可能在其他页面有变化）

      const openid = app.globalData.openid

      const profileId = app.globalData.currentProfile?.profileId



      if (openid && profileId) {

        this.loadKeyDates(openid, profileId)

        this.loadTodayTasks(openid, profileId)

      }



      // 启动数据同步检查器

      setTimeout(() => {

        this.startDataSyncChecker()

      }, 100)

    }

  },






  // 获取用户信息

  getUserInfo() {

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();






    if (!openid) {


      return null;

    }



    // 统一使用 profileId 字段（与配置保存/读取一致）

    let currentProfileId = '';

    if (app.globalData && app.globalData.currentProfile) {

      currentProfileId = app.globalData.currentProfile.profileId;

    } else if (app.getCurrentProfileId) {

      currentProfileId = app.getCurrentProfileId();

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



  // 检查登录状态并加载数据

  async checkLoginAndLoadData(retryCount = 0) {

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();



    if (!openid) {


      this.setData({

        isLoggedIn: false,

        keyDates: [],

        todayTasks: [],

        isPageLoading: false,

        hasLoadedBefore: true // 即使未登录，也标记为已加载，避免重复显示骨架屏

      });

      return;

    }



    const userInfo = this.getUserInfo();



    if (userInfo) {

      const { openid, currentProfileId } = userInfo;




      this.setData({

        isLoggedIn: true

      });



      try {

        // 只加载关键数据，避免重复查询

        this.loadKeyDates(openid, currentProfileId);

        this.loadTodayTasks(openid, currentProfileId);



        // 等待 profileId 初始化完成（最多等待1秒）
        // 🔧 Android兼容性：使用Promise.race确保不会永久阻塞
        if (!app.globalData.currentProfile?.profileId) {
          await Promise.race([
            (async () => {
              let retryCount = 0
              while (retryCount < 10 && !app.globalData.currentProfile?.profileId) {
                await new Promise(resolve => setTimeout(resolve, 100))
                retryCount++
              }
            })(),
            new Promise(resolve => setTimeout(resolve, 1500)) // 1.5秒超时保护
          ])
        }

        // 加载功能项配置（从数据库读取用户自定义配置）
        // 🔧 Android兼容性：添加超时保护，防止云数据库调用永久挂起
        await Promise.race([
          this.loadMainPageFunctionConfig(),
          new Promise((resolve) => setTimeout(resolve, 3000)) // 3秒超时
        ]);

        // 🔧 Android兼容性：如果超时导致数据未加载，使用默认配置
        if (!this.data.mainPageFunctions || this.data.mainPageFunctions.length === 0) {
          console.warn('⚠️ 功能项配置加载超时，使用默认配置');
          const defaultFunctions = generateFunctionConfig(false, true);
          const visibleDefaults = defaultFunctions.filter(f => f.visible).sort((a, b) => a.order - b.order);
          this.setData({ mainPageFunctions: visibleDefaults });
        }



        // 立即加载今日数据 - loadDataForDate 会处理所有功能项数据

        this.updateCalendarEvents();



        // 立即加载当前选中日期的数据（初始为今天），优化用户体验

        const currentSelectedDate = this.data.selectedDate || this.formatDate(new Date());


        this.loadDataForDate(currentSelectedDate);

      } catch (error) {

        console.error('❌ 加载数据时出错:', error);

      } finally {

        // 数据加载完成，隐藏骨架屏（确保一定会执行）

        setTimeout(() => {

          this.setData({
            isPageLoading: false,
            hasLoadedBefore: true // 标记已完成首次加载
          })

        }, 300)

      }



    } else {

      // 已登录但档案信息未就绪，进行重试

      if (retryCount < 3) {


        setTimeout(() => {

          this.checkLoginAndLoadData(retryCount + 1);

        }, 500 * (retryCount + 1)); // 递增延迟

      } else {


        this.setData({

          isLoggedIn: false,

          keyDates: [],

          todayTasks: [],

          isPageLoading: false

        });

      }

    }

  },



  // 加载暖光里程碑

  loadKeyDates(openid, currentProfileId) {



    // 使用传递的参数，避免重复获取

    if (!openid || !currentProfileId) {


      this.setData({

        keyDates: []

      });

      return Promise.resolve()

    }

    // 🔥 调试日志：检查查询条件
    console.log('=== 加载暖光里程碑 - 调试信息 ===')
    console.log('查询 openid:', openid)
    console.log('查询 currentProfileId:', currentProfileId)
    console.log('查询 currentProfileId 类型:', typeof currentProfileId)

    // 加载暖光里程碑

    return wx.cloud.database().collection('keyDates')

      .where({

        openid: openid,

        profileId: currentProfileId

      })

      .get()

      .then(res => {

        console.log('查询到的暖光里程碑数量:', res.data.length)
        console.log('查询结果:', res.data)


        const keyDates = res.data.map(item => {

          const statusObj = this.getStatusText(item.date)

          return {

            id: item._id,

            title: item.title || item.name, // 兼容新旧字段名

            date: item.date,

            days: this.calculateDays(item.date),

            statusText: statusObj.fullText, // 保持向后兼容

            statusObj: statusObj, // 新的结构化数据

            dateFormatted: this.formatDateForDisplay(item.date)

          }

        })



        // 🔧 修复排序逻辑：未来日期在上方按剩余天数排序，过去日期在下方按日期排序
        const sortedKeyDates = keyDates.sort((a, b) => {
          // 未来日期排在最上方，按剩余天数从少到大排
          if (a.days > 0 && b.days > 0) {
            return a.days - b.days;
          }
          // 过去日期排在最下方，按日期从近到远排
          if (a.days <= 0 && b.days <= 0) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          // 今天日期排在中间
          if (a.days === 0) return -1;
          if (b.days === 0) return 1;
          // 未来日期在过去日期之前
          return b.days - a.days;
        });

        this.setData({

          keyDates: sortedKeyDates,

          // 添加数量判断，用于CSS样式控制

          isSingleMilestone: sortedKeyDates.length === 1

        }, () => {

          // 数据更新后，更新日历事件标记

          this.updateCalendarEvents()

        })

      })

      .catch(err => {



        wx.showToast({

          title: '加载暖光里程碑失败',

          icon: 'none'

        })

        throw err

      })

  },



  // 加载今日任务（修改为加载选中日期的任务）

  loadTodayTasks(openid) {

    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()

    if (!currentProfileId) {

      this.setData({

        todayTasks: []

      })

      return

    }

    // 加载选中日期的任务（而不仅仅是今天）
    const selectedDate = this.data.selectedDate || this.formatDate(new Date())

    wx.cloud.database().collection('todayTasks')

      .where({

        openid: openid,

        profileId: currentProfileId,

        date: selectedDate

      })

      .orderBy('createTime', 'desc')

      .get()

      .then(res => {

        const todayTasks = res.data.map(item => ({

          _id: item._id,

          title: item.title,

          completed: item.completed,

          date: item.date

        }))

        this.setData({

          todayTasks

        }, () => {

          // 数据更新后，更新日历事件标记

          this.updateCalendarEvents()

        })

      })

      .catch(err => {

        console.error('加载任务失败:', err)

        wx.showToast({

          title: '加载任务失败',

          icon: 'none'

        })

      })

  },



  // 初始化日历

  initCalendar() {

    const {

      currentYear,

      currentMonth

    } = this.data;

    const days = this.generateDays(currentYear, currentMonth);

    this.setData({

      days

    }, () => {

      // 日历数据更新后，更新事件标记

      this.updateCalendarEvents();

    });

  },



  // 更新日历事件标记

  updateCalendarEvents() {

    if (!this.data.days || this.data.days.length === 0) {



      return

    }







    // 加载血常规数据

    const app = getApp()

    const openid = app.getOpenIdIfLoggedIn()

    const currentProfileId = app.getCurrentProfileId()



    if (openid && currentProfileId) {

      // 获取当前月份的第一天和最后一天

      const {

        currentYear,

        currentMonth

      } = this.data

      const firstDay = new Date(currentYear, currentMonth - 1, 1)

      const lastDay = new Date(currentYear, currentMonth, 0)



      // 格式化日期用于查询

      const startDate = this.formatDate(firstDay)

      const endDate = this.formatDate(lastDay)



      // 并行查询当月的血常规数据、用药记录和门诊记录

      Promise.all([

        // 查询血常规数据

        db.collection('bloodTests')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询用药记录

        db.collection('medications')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询门诊记录

        db.collection('clinicRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询尿量记录

        db.collection('urineRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询排便记录

        db.collection('stoolRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询费用记录

        db.collection('expenseRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询EBV检测记录

        db.collection('ebvRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询CMV检测记录

        db.collection('cmvRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询ldh检测记录

        db.collection('ldhRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询肝功能记录

        db.collection('liverFunctionTests')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询肾功能记录

        db.collection('kidneyFunctionTests')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询血糖记录

        db.collection('bloodSugars')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get(),

        // 查询检查报告记录

        db.collection('checkReports')

          .where({

            openid: openid,

            profileId: currentProfileId,

            date: db.command.gte(startDate).and(db.command.lte(endDate))

          })

          .get()

      ]).then(results => {

        const [bloodTestRes, medicationRes, clinicRes, urineRes, stoolRes, expenseRes, ebvRes, cmvRes, ldhRes, liverRes, kidneyRes, bloodSugarRes, checkReportRes] = results;





















        // 创建血常规数据映射 - 只显示当前配置中的指标

        const bloodTestMap = {}



        // 使用更直接的方式：只显示数据库中实际存在的字段

        bloodTestRes.data.forEach(item => {

          const bloodData = {}



          // 1. 优先从customValues加载

          if (item.customValues) {

            Object.keys(item.customValues).forEach(key => {

              bloodData[key] = item.customValues[key]

            })

          }



          // 2. 从直接字段加载基础指标（不覆盖customValues）

          const basicIndicators = ['wbc', 'neut', 'hgb', 'plt', 'rbc', 'hct', 'lymph', 'mono']

          basicIndicators.forEach(key => {

            if (bloodData[key] === undefined && item[key] !== undefined && item[key] !== null && item[key] !== '') {

              bloodData[key] = item[key]

            }

          })



          // 只保留有数据的指标（保留0值，因为0对某些检测是有意义的）

          const filteredBloodData = {}

          Object.keys(bloodData).forEach(key => {

            const value = bloodData[key]

            // 保留所有非 undefined、null 和非空字符串的值，包括0

            if (value !== undefined && value !== null && value !== '') {

              filteredBloodData[key] = value

            }

          })



          if (Object.keys(filteredBloodData).length > 0) {

            bloodTestMap[item.date] = filteredBloodData

          }

        })



        // 创建用药记录映射

        const medicationMap = {}

        console.log('🏥 月度查询：找到', medicationRes.data.length, '条用药记录')

        medicationRes.data.forEach(item => {

          console.log('📋 处理用药记录:', item.date, '- medicines count:', item.medicines?.length || 0)

          if (item.medicines && item.medicines.length > 0) {

            // 检查是否有在当天有效的药品

            const activeMedicines = item.medicines.filter(medicine =>

              new Date(medicine.startDate) <= new Date(item.date) &&

              new Date(medicine.endDate) >= new Date(item.date)

            );



            if (activeMedicines.length > 0) {

              // 计算总的服药时段和已完成时段

              let totalTimeSlots = 0;

              let completedTimeSlots = 0;



              // 为每个药品添加时间文本字段并计算完成状态

              const processedMedicines = activeMedicines.map(medicine => {

                const timeSlots = medicine.timesPerDay ? medicine.timesPerDay.length : 1;

                totalTimeSlots += timeSlots;



                // 计算实际完成的时段数

                let actualCompletedSlots = 0;

                if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

                  // 有分时段状态时，计算实际完成的时段

                  actualCompletedSlots = medicine.timesPerDay.filter(slot =>

                    medicine.timeSlotStatus[slot] === true

                  ).length;

                } else if (medicine.taken) {

                  // 没有分时段状态但标记为已服用时，算作全部完成

                  actualCompletedSlots = timeSlots;

                }



                completedTimeSlots += actualCompletedSlots;



                return {

                  ...medicine,

                  timesPerDayText: medicine.timesPerDay && medicine.timesPerDay.length > 0 ?

                    medicine.timesPerDay.join('、') :

                    ''

                };

              });



              // 计算已服用的药品数量（至少服用了一个时段的药品）

              const takenCount = activeMedicines.filter(medicine => {

                if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

                  // 有分时段状态时，检查是否至少有一个时段已服用

                  return medicine.timesPerDay.some(slot =>

                    medicine.timeSlotStatus[slot] === true

                  );

                } else {

                  // 没有分时段状态时，使用overall taken状态

                  return medicine.taken === true;

                }

              }).length;



              console.log('✅ 设置用药记录映射 for date:', item.date, '- activeMedicines:', activeMedicines.length, '- completedTimeSlots:', completedTimeSlots, '- totalTimeSlots:', totalTimeSlots)



              medicationMap[item.date] = {

                count: activeMedicines.length,

                taken: takenCount,

                medicines: processedMedicines,

                totalTimeSlots: totalTimeSlots,

                completedTimeSlots: completedTimeSlots,

                isFullyCompleted: completedTimeSlots === totalTimeSlots && totalTimeSlots > 0

              };

            }

          }

        });



        // 创建门诊记录映射

        const clinicMap = {}

        clinicRes.data.forEach(item => {

          if (!clinicMap[item.date]) {

            clinicMap[item.date] = [];

          }

          clinicMap[item.date].push({

            id: item._id,

            hospital: item.hospital,

            department: item.department,

            visitTime: item.visitTime,

            doctor: item.doctor,

            doctorTitle: item.doctorTitle,

            diagnosis: item.diagnosis,

            prescription: item.prescription,

            advice: item.advice,

            cost: item.cost,

            followUpDate: item.followUpDate,

            notes: item.notes

          });

        });



        // 创建检查报告记录映射

        const checkReportMap = {}

        checkReportRes.data.forEach(item => {

          if (!checkReportMap[item.date]) {

            checkReportMap[item.date] = [];

          }

          checkReportMap[item.date].push({

            id: item._id,

            reportType: item.reportType,

            hospital: item.hospital,

            department: item.department,

            doctor: item.doctor,

            reportDate: item.reportDate,

            checkDate: item.checkDate,

            items: item.items,

            conclusion: item.conclusion,

            suggestion: item.suggestion,

            images: item.images,

            notes: item.notes

          });

        });



        // 创建尿量记录映射

        const urineMap = {}

        urineRes.data.forEach(item => {

          if (!urineMap[item.date]) {

            urineMap[item.date] = [];

          }

          urineMap[item.date].push({

            id: item._id,

            time: item.time,

            volume: item.volume,

            color: item.color,

            notes: item.notes

          });

        });



        // 创建排便记录映射

        const stoolMap = {}

        stoolRes.data.forEach(item => {

          if (!stoolMap[item.date]) {

            stoolMap[item.date] = [];

          }

          stoolMap[item.date].push({

            id: item._id,

            time: item.time,

            type: item.type,

            color: item.color,

            hasBlood: item.hasBlood,

            hasMucus: item.hasMucus,

            notes: item.notes

          });

        });



        // 创建费用记录映射

        const expenseMap = {}

        expenseRes.data.forEach(item => {

          if (!expenseMap[item.date]) {

            expenseMap[item.date] = {

              total: 0,

              count: 0,

              records: []

            };

          }

          const amount = parseFloat(item.amount) || 0;

          expenseMap[item.date].total += amount;

          expenseMap[item.date].count += 1;

          expenseMap[item.date].records.push({

            id: item._id,

            time: item.time,

            amount: item.amount,

            projectName: item.projectName,

            hospital: item.hospital,

            expenseType: item.expenseType,

            paymentMethod: item.paymentMethod,

            notes: item.notes

          });

        });



        // 创建EBV检测记录映射

        const ebvMap = {}

        ebvRes.data.forEach(item => {

          const ebvData = {}

          // 1. 优先从customValues加载

          if (item.customValues) {

            Object.keys(item.customValues).forEach(key => {

              ebvData[key] = item.customValues[key]

            })

            delete item.customValues

          }

          if (!ebvMap[item.date]) {

            ebvMap[item.date] = [];

          }



          ebvMap[item.date].push({

            id: item._id,

            time: item.time,

            ...item,

            ...ebvData

          });

        });



        // 创建CMV检测记录映射

        const cmvMap = {}

        cmvRes.data.forEach(item => {

          const cmvData = {}

          // 1. 优先从customValues加载

          if (item.customValues) {

            Object.keys(item.customValues).forEach(key => {

              cmvData[key] = item.customValues[key]

            })

            delete item.customValues

          }

          if (!cmvMap[item.date]) {

            cmvMap[item.date] = [];

          }

          cmvMap[item.date].push({

            id: item._id,

            time: item.time,

            ...item,

            ...cmvData

          });

        });





        const ldhMap = {}

        ldhRes.data.forEach(item => {

          const values = {}                       // 临时收集字段

          if (item.customValues) {

            Object.assign(values, item.customValues)

          }

          if (!ldhMap[item.date]) {

            ldhMap[item.date] = []

          }

          ldhMap[item.date].push({

            id: item._id,

            time: item.time,

            ...item,

            ...values

          })

        })



        // 创建肝功能记录映射

        const liverMap = {}

        liverRes.data.forEach(item => {

          const liverData = {}

          // 1. 优先从customValues加载

          if (item.customValues) {

            Object.keys(item.customValues).forEach(key => {

              liverData[key] = item.customValues[key]

            })

            delete item.customValues

          }

          if (!liverMap[item.date]) {

            liverMap[item.date] = [];

          }

          liverMap[item.date].push({

            id: item._id,

            time: item.time,

            ...item,

            ...liverData

          });

        });



        // 创建肾功能记录映射

        const kidneyMap = {}

        kidneyRes.data.forEach(item => {

          const kidneyData = {}

          // 1. 优先从customValues加载

          if (item.customValues) {

            Object.keys(item.customValues).forEach(key => {

              kidneyData[key] = item.customValues[key]

            })

            delete item.customValues

          }

          if (!kidneyMap[item.date]) {

            kidneyMap[item.date] = [];

          }

          kidneyMap[item.date].push({

            id: item._id,

            time: item.time,

            ...item,

            ...kidneyData

          });

        });



        // 创建血糖数据映射

        const bloodSugarMap = {}

        bloodSugarRes.data.forEach(item => {

          if (!bloodSugarMap[item.date]) {

            bloodSugarMap[item.date] = [];

          }

          bloodSugarMap[item.date].push({

            id: item._id,

            ...item

          });

        });



        // 更新日历（包含所有记录数据）

        this.updateCalendarWithAllData(bloodTestMap, medicationMap, clinicMap, urineMap, stoolMap, ebvMap, cmvMap, liverMap, kidneyMap, ldhMap, bloodSugarMap)

      })

        .catch(err => {



          this.updateCalendarWithoutBloodData()

        })

    } else {

      // 没有登录或没有档案，只更新其他事件

      this.updateCalendarWithoutBloodData()

    }

  },



  // 获取当月所有日期的实际配置（简化逻辑）

  async getCurrentBloodTestConfig() {

    const app = getApp()

    const openid = app.getOpenIdIfLoggedIn()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {

      return {

        wbc: true,

        neut: true,

        hgb: true,

        plt: true

      }

    }



    try {

      const db = wx.cloud.database()



      // 获取当月所有血常规配置

      const {

        currentYear,

        currentMonth

      } = this.data

      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

      const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`



      const configRes = await db.collection('userIndicatorConfig')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: db.command.gte(monthStart).and(db.command.lt(monthEnd))

        })

        .get()



      // 合并所有配置：只显示在任何一天被配置为显示的指标

      const config = {

        wbc: true, // 基础指标永远显示

        neut: true,

        hgb: true,

        plt: true

      }



      // 收集所有配置过的指标

      configRes.data.forEach(dayConfig => {

        if (dayConfig.selectedIndicators) {

          Object.keys(dayConfig.selectedIndicators).forEach(key => {

            if (dayConfig.selectedIndicators[key] === true) {

              config[key] = true

            }

          })

        }

      })



      return config

    } catch (err) {



      return {

        wbc: true,

        neut: true,

        hgb: true,

        plt: true

      }

    }

  },



  // 更新日历（包含所有数据）

  updateCalendarWithAllData(bloodTestMap, medicationMap, clinicMap = {}, urineMap = {}, stoolMap = {}, ebvMap = {}, cmvMap = {}, liverMap = {}, kidneyMap = {}, ldhMap = {}, bloodSugarMap = {}) {

    const days = this.data.days.map(day => {

      if (!day.date) return day;

      // 检查是否有暖光

      const hasKeyDate = this.data.keyDates && this.data.keyDates.some(item => item.date === day.date);

      // 检查是否有今日待办

      const hasTask = this.data.todayTasks && this.data.todayTasks.some(item => item.date === day.date);

      // 获取血常规数据

      const bloodData = bloodTestMap[day.date] || null;

      // 获取用药数据

      const medicationData = medicationMap[day.date] || null;

      // 获取门诊数据

      const clinicData = clinicMap[day.date] || null;

      // 获取检查报告数据

      const checkReportData = checkReportMap[day.date] || null;

      // 获取尿量数据

      const urineData = urineMap[day.date] || null;

      // 获取排便数据

      const stoolData = stoolMap[day.date] || null;

      // 获取费用记录数据

      const expenseData = expenseMap[day.date] ? {

        total: expenseMap[day.date].total.toFixed(2),

        count: expenseMap[day.date].count

      } : null;

      // 获取EBV检测数据

      const ebvData = ebvMap[day.date] || null;

      // 获取CMV检测数据

      const cmvData = cmvMap[day.date] || null;

      // 获取肝功能数据

      const liverData = liverMap[day.date] || null;

      // 获取肾功能数据

      const kidneyData = kidneyMap[day.date] || null;

      const ldhData = ldhMap[day.date] || null

      // 获取血糖数据

      const bloodSugarData = bloodSugarMap[day.date] ? bloodSugarMap[day.date][0] : null



      const hasEvent = hasTask || hasKeyDate || bloodData || medicationData || clinicData || checkReportData || urineData || stoolData || expenseData || ebvData || cmvData || liverData || kidneyData || ldhData || bloodSugarData;



      return {

        ...day,

        hasEvent: hasEvent,

        top: hasKeyDate ? '●' : '',

        className: hasKeyDate ? 'calendar-mark' : '',

        bloodData: bloodData,

        medicationData: medicationData,

        clinicData: clinicData,

        checkReportData: checkReportData,

        urineData: urineData,

        stoolData: stoolData,

        expenseData: expenseData,

        ebvData: ebvData,

        cmvData: cmvData,

        ldhData: ldhData,

        liverData: liverData,

        kidneyData: kidneyData,

        bloodSugarData: bloodSugarData

      };

    });



    this.setData({

      days

    });

  },



  // 更新日历（带血常规数据）

  updateCalendarWithBloodData(bloodTestMap) {

    const days = this.data.days.map(day => {

      if (!day.date) return day;



      // 检查是否有暖光里程碑

      const hasKeyDate = this.data.keyDates && this.data.keyDates.some(item => item.date === day.date);

      // 检查是否有今日待办

      const hasTask = this.data.todayTasks && this.data.todayTasks.some(item => item.date === day.date);

      // 获取血常规数据

      const bloodData = bloodTestMap[day.date] || null;



      const hasEvent = hasTask || hasKeyDate || bloodData;



      return {

        ...day,

        hasEvent: hasEvent,

        top: hasKeyDate ? '●' : '',

        className: hasKeyDate ? 'calendar-mark' : '',

        bloodData: bloodData

      };

    });



    this.setData({

      days

    });

  },



  // 更新日历（使用所有血常规数据，兜底方案）

  updateCalendarWithAllBloodData(bloodTestData) {

    const bloodTestMap = {}

    bloodTestData.forEach(item => {

      const bloodData = {

        wbc: item.wbc,

        neut: item.neut,

        hgb: item.hgb,

        plt: item.plt,

        rbc: item.rbc,

        hct: item.hct,

        lymph: item.lymph,

        mono: item.mono,

      }



      if (item.customValues) {

        Object.assign(bloodData, item.customValues)

      }



      Object.keys(item).forEach(key => {

        if (key.startsWith('custom_')) {

          bloodData[key] = item[key]

        }

      })



      const filteredBloodData = {}

      Object.keys(bloodData).forEach(key => {

        if (bloodData[key] !== undefined && bloodData[key] !== null && bloodData[key] !== '') {

          filteredBloodData[key] = bloodData[key]

        }

      })



      if (Object.keys(filteredBloodData).length > 0) {

        bloodTestMap[item.date] = filteredBloodData

      }

    })



    this.updateCalendarWithBloodData(bloodTestMap)

  },



  // 不包含血常规数据的日历更新

  updateCalendarWithoutBloodData() {

    const days = this.data.days.map(day => {

      if (!day.date) return day;



      // 检查是否有暖光里程碑

      const hasKeyDate = this.data.keyDates && this.data.keyDates.some(item => item.date === day.date);

      // 检查是否有今日待办

      const hasTask = this.data.todayTasks && this.data.todayTasks.some(item => item.date === day.date);



      const hasEvent = hasTask || hasKeyDate;



      return {

        ...day,

        hasEvent: hasEvent,

        top: hasKeyDate ? '●' : '',

        className: hasKeyDate ? 'calendar-mark' : ''

      };

    });



    this.setData({

      days

    });

  },



  // 生成日历数据

  generateDays(year, month) {

    const days = [];

    const firstDay = new Date(year, month - 1, 1);

    const lastDay = new Date(year, month, 0);

    const firstDayWeek = firstDay.getDay();

    const lastDate = lastDay.getDate();



    // 填充上月剩余日期

    for (let i = 0; i < firstDayWeek; i++) {

      days.push({

        date: '',

        isSelected: false,

        hasEvent: false

      });

    }



    // 填充当月日期

    const today = new Date();

    const todayStr = this.getTodayString();

    for (let i = 1; i <= lastDate; i++) {

      const date = new Date(year, month - 1, i);

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      days.push({

        date: dateStr,

        isSelected: false,

        hasEvent: false

      });

    }



    return days;

  },



  // 获取指定日期的事件

  getEventsForDate(date) {

    // TODO: 从本地存储或云端获取该日期的事件

    return [];

  },





  // 处理血常规数据，添加指标名称

  async processBloodDataWithNames(rawBloodData) {

    const {

      bloodIndicatorNames

    } = this.data;

    const processedData = [];



    // 获取自定义指标名称和当前选中的指标配置

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    let customIndicatorNames = {};

    let selectedIndicators = {};



    if (openid && currentProfileId) {

      try {

        // 获取所有自定义指标名称（不过滤，让数据正常显示）

        const res = await db.collection('userIndicatorSettings')

          .where({

            openid: openid,

            profileId: currentProfileId

          })

          .get();



        res.data.forEach(item => {

          customIndicatorNames[item.indicatorId] = item.name;

        });

      } catch (err) {



      }

    }



    // 转换数据格式，添加名称

    Object.keys(rawBloodData).forEach(indicatorId => {

      const value = rawBloodData[indicatorId];

      let name = indicatorId;



      // 获取指标名称

      if (bloodIndicatorNames[indicatorId]) {

        name = bloodIndicatorNames[indicatorId];

      } else if (customIndicatorNames[indicatorId]) {

        name = customIndicatorNames[indicatorId];

      } else if (indicatorId.startsWith('custom_')) {

        name = indicatorId.replace('custom_', '自定义指标-');

      }



      processedData.push({

        id: indicatorId,

        name: name,

        value: value

      });

    });



    // 按照重要性排序：基础指标在前，自定义指标在后

    const orderPriority = ['wbc', 'neut', 'hgb', 'plt', 'rbc', 'hct', 'lymph', 'mono'];

    processedData.sort((a, b) => {

      const aIndex = orderPriority.indexOf(a.id);

      const bIndex = orderPriority.indexOf(b.id);



      if (aIndex !== -1 && bIndex !== -1) {

        return aIndex - bIndex;

      }

      if (aIndex !== -1) return -1;

      if (bIndex !== -1) return 1;

      return a.name.localeCompare(b.name);

    });



    return processedData;

  },



  // 打开添加事项弹窗

  addTodayTask() {

    this.checkLoginAndExecute(() => {

      this.setData({

        showAddTask: true,

        newTaskText: ''

      });

    }, '今日待办功能');

  },



  // 关闭弹窗

  onPopupClose() {

    this.setData({

      showAddTask: false,

      newTaskText: ''

    });

  },



  // 输入框内容变化

  onTaskInput(e) {

    this.setData({

      newTaskText: e.detail.value

    });

  },



  // 确认添加事项

  async confirmAddTask() {

    const {

      newTaskText

    } = this.data

    if (!newTaskText.trim()) {

      wx.showToast({

        title: '请输入事项内容',

        icon: 'none'

      })

      return

    }



    const app = getApp()

    const openid = app.getOpenIdIfLoggedIn()

    if (!openid) {

      wx.showToast({

        title: '请先登录',

        icon: 'none'

      })

      return

    }



    const today = this.formatDate(new Date())

    const db = wx.cloud.database()



    const currentProfileId = app.getCurrentProfileId()

    if (!currentProfileId) {

      wx.showToast({

        title: '请先选择档案',

        icon: 'none'

      })

      return

    }



    wx.showLoading({

      title: '添加中...',

      mask: true

    })



    try {

      const res = await db.collection('todayTasks').add({

        data: {

          title: newTaskText.trim(),

          completed: false,

          date: today,

          openid: openid,

          profileId: currentProfileId,

          createTime: db.serverDate()

        }

      })







      wx.showToast({

        title: '添加成功',

        icon: 'success'

      })



      this.setData({

        showAddTask: false,

        newTaskText: ''

      })



      // 重新加载今日待办

      this.loadTodayTasks(openid)

    } catch (err) {



      wx.showToast({

        title: '添加失败',

        icon: 'none'

      })

    } finally {

      wx.hideLoading()

    }

  },



  // 切换任务状态

  async toggleTask(e) {

    const {

      id

    } = e.currentTarget.dataset

    const task = this.data.todayTasks.find(t => t.id === id)

    if (!task) return



    const app = getApp()

    const db = wx.cloud.database()

    const openid = app.getOpenIdIfLoggedIn()



    wx.showLoading({

      title: '更新中...',

      mask: true

    })



    try {

      await db.collection('todayTasks').doc(id).update({

        data: {

          completed: !task.completed,

          updateTime: db.serverDate()

        }

      })



      wx.showToast({

        title: task.completed ? '未完成' : '已完成',

        icon: 'success'

      })



      this.loadTodayTasks(openid)

    } catch (err) {



      wx.showToast({

        title: '操作失败',

        icon: 'none'

      })

    } finally {

      wx.hideLoading()

    }

  },



  // 在弹窗中切换分时段服药状态

  async toggleTimeSlotInPopup(e) {

    const {

      medicineId,

      timeSlot

    } = e.currentTarget.dataset;



    // 获取用户信息

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    if (!openid || !currentProfileId) {

      wx.showToast({

        title: '请先登录并选择档案',

        icon: 'none'

      });

      return;

    }



    wx.showLoading({

      title: '更新中...',

      mask: true

    });



    try {

      const db = wx.cloud.database();



      // 查找包含该药品的记录

      const res = await db.collection('medications')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: this.data.currentDateDetail.date,

          'medicines.id': medicineId

        })

        .get();



      if (res.data.length === 0) {

        throw new Error('未找到用药记录');

      }



      const record = res.data[0];



      // 更新分时段状态

      const updatedMedicines = record.medicines.map(m => {

        if (m.id === medicineId) {

          const newTimeSlotStatus = {

            ...(m.timeSlotStatus || {})

          };

          newTimeSlotStatus[timeSlot] = !newTimeSlotStatus[timeSlot];



          // 检查是否全部时段都已服用

          const allTimeSlots = m.timesPerDay || [];

          const allTaken = allTimeSlots.every(slot => newTimeSlotStatus[slot] === true);



          return {

            ...m,

            timeSlotStatus: newTimeSlotStatus,

            taken: allTaken

          };

        }

        return m;

      });



      // 更新数据库

      await db.collection('medications')

        .doc(record._id)

        .update({

          data: {

            medicines: updatedMedicines,

            updateTime: db.serverDate()

          }

        });



      // 更新弹窗中的数据

      const updatedMedicationData = {

        ...this.data.currentDateDetail.medicationData,

        medicines: updatedMedicines.map(m => ({

          ...m,

          timesPerDayText: m.timesPerDay && m.timesPerDay.length > 0 ?

            m.timesPerDay.join('、') :

            ''

        }))

      };



      // 重新计算进度

      let totalTimeSlots = 0;

      let completedTimeSlots = 0;



      updatedMedicines.forEach(medicine => {

        const timeSlots = medicine.timesPerDay ? medicine.timesPerDay.length : 1;

        totalTimeSlots += timeSlots;



        if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

          completedTimeSlots += medicine.timesPerDay.filter(slot =>

            medicine.timeSlotStatus[slot] === true

          ).length;

        } else if (medicine.taken) {

          completedTimeSlots += timeSlots;

        }

      });



      // 计算已服用的药品数量（至少服用了一个时段的药品）

      const takenCount = updatedMedicines.filter(medicine => {

        if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

          // 有分时段状态时，检查是否至少有一个时段已服用

          return medicine.timesPerDay.some(slot =>

            medicine.timeSlotStatus[slot] === true

          );

        } else {

          // 没有分时段状态时，使用overall taken状态

          return medicine.taken === true;

        }

      }).length;



      updatedMedicationData.taken = takenCount;

      updatedMedicationData.totalTimeSlots = totalTimeSlots;

      updatedMedicationData.completedTimeSlots = completedTimeSlots;

      updatedMedicationData.isFullyCompleted = completedTimeSlots === totalTimeSlots && totalTimeSlots > 0;



      this.setData({

        'currentDateDetail.medicationData': updatedMedicationData

      });



      // 重新加载日历数据

      this.updateCalendarEvents();



      if (this.data.currentDateDetail.date === this.getTodayString()) {

        const openid = app.getOpenIdIfLoggedIn();

        if (openid) {

          this.loadTodayMedicationData(openid);

        }

      }



      wx.showToast({

        title: '更新成功',

        icon: 'success'

      });



    } catch (err) {



      wx.showToast({

        title: '更新失败，请重试',

        icon: 'error'

      });

    } finally {

      wx.hideLoading();

    }

  },



  // 弹窗中切换任务状态

  async toggleTaskInPopup(e) {

    const {

      id

    } = e.currentTarget.dataset

    const task = this.data.currentDateDetail.tasks.find(t => t.id === id)

    if (!task) return



    const app = getApp()

    const db = wx.cloud.database()

    const openid = app.getOpenIdIfLoggedIn()



    wx.showLoading({

      title: '更新中...',

      mask: true

    })



    try {

      await db.collection('todayTasks').doc(id).update({

        data: {

          completed: !task.completed,

          updateTime: db.serverDate()

        }

      })



      wx.showToast({

        title: task.completed ? '未完成' : '已完成',

        icon: 'success',

        duration: 1500

      })



      // 更新弹窗中的任务状态

      const updatedTasks = this.data.currentDateDetail.tasks.map(t => {

        if (t.id === id) {

          return {

            ...t,

            completed: !t.completed

          }

        }

        return t

      })



      this.setData({

        'currentDateDetail.tasks': updatedTasks

      })



      // 同时更新今日待办列表（如果是今天的任务）

      this.loadTodayTasks(openid)



      // 更新日历事件标记

      this.updateCalendarEvents()



    } catch (err) {



      wx.showToast({

        title: '操作失败',

        icon: 'none'

      })

    } finally {

      wx.hideLoading()

    }

  },



  // 处理滑动删除

  async onSwipeClick(e) {

    const {

      id

    } = e.currentTarget.dataset

    const {

      position,

      instance

    } = e.detail



    if (position === 'left') {

      wx.showModal({

        title: '提示',

        content: '确定要删除这个事项吗？',

        success: async (res) => {

          if (res.confirm) {

            const app = getApp()

            const db = wx.cloud.database()

            const openid = app.getOpenIdIfLoggedIn()



            wx.showLoading({

              title: '删除中...',

              mask: true

            })



            try {

              await db.collection('todayTasks').doc(id).remove()

              wx.showToast({

                title: '删除成功',

                icon: 'success'

              })

              this.loadTodayTasks(openid)

              this.updateCalendarEvents()

            } catch (err) {



              wx.showToast({

                title: '删除失败',

                icon: 'none'

              })

            } finally {

              wx.hideLoading()

            }

          }

        }

      })

    }

    instance.close()

  },



  // 页面导航

  navigateToKeyDate() {

    // TODO: key-date 页面不存在，需要创建或移除此功能

    wx.showToast({

      title: '功能开发中',

      icon: 'none'

    });

    // wx.navigateTo({

    //   url: '/pages/key-date/index'

    // });

  },



  navigateToMedicine() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageB/pages/medication/index?date=${selectedDate}`

    });

  },



  navigateToClinic() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageB/pages/clinic-record/index?date=${selectedDate}`

    });

  },



  navigateToCheckReport() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageB/pages/check-report/index?date=${selectedDate}`

    });

  },



  navigateToUrine() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageB/pages/urine-record/index?date=${selectedDate}`

    })

  },



  navigateToStool() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageB/pages/stool-record/index?date=${selectedDate}`

    })

  },



  navigateToExpense() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageB/pages/expense-record/index?date=${selectedDate}`

    })

  },



  navigateToEbv() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageC/pages/ebv-record/index?date=${selectedDate}`

    })

  },



  navigateToCmv() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageC/pages/cmv-record/index?date=${selectedDate}`

    })

  },



  navigateToLdh() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageC/pages/ldh-record/index?date=${selectedDate}`

    })

  },



  navigateToBloodSugar() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageA/pages/blood-sugar/index?date=${selectedDate}`

    })

  },



  navigateToOrgan() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageA/pages/organ-function-record/index?date=${selectedDate}`

    })

  },



  navigateToBloodTest() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageA/pages/blood-test/index?date=${selectedDate}`

    });

  },



  navigateToLiverFunction() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageA/pages/liver-function/index?date=${selectedDate}`

    });

  },



  navigateToKidneyFunction() {

    const selectedDate = this.data.selectedDate

    wx.navigateTo({

      url: `/packageA/pages/kidney-function/index?date=${selectedDate}`

    });

  },



  showKeyDateDetail() {

    // TODO: key-date 页面不存在，需要创建或移除此功能

    wx.showToast({

      title: '功能开发中',

      icon: 'none'

    });

    // wx.navigateTo({

    //   url: '/pages/key-date/index'

    // });

  },



  // 加载血液数据、移植日期、复查日期（云端）

  async loadData() {

    if (!this.data.openid) return

    try {

      const bloodRes = await db.collection('bloodData').where({

        _openid: this.data.openid

      }).get()

      const transplantRes = await db.collection('transplantDate').where({

        _openid: this.data.openid

      }).get()

      const checkupRes = await db.collection('nextCheckupDate').where({

        _openid: this.data.openid

      }).get()

      this.setData({

        bloodData: bloodRes.data[0] || {},

        transplantDate: transplantRes.data[0]?.date || '',

        nextCheckupDate: checkupRes.data[0]?.date || ''

      })

      if (transplantRes.data[0]?.date) {

        this.setData({

          daysSinceTransplant: this.calculateDaysSinceTransplant()

        })

      }

    } catch (err) {



    }

  },



  formatDate(date) {

    const year = date.getFullYear();

    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;

  },



  // 格式化日期显示 - 用于里程碑卡片

  formatDateForDisplay(dateString) {

    const date = new Date(dateString);

    const year = date.getFullYear();

    const month = date.getMonth() + 1;

    const day = date.getDate();

    return `${year}年${month}月${day}日`;

  },



  // 格式化短日期 - 显示月日格式

  formatDateShort(dateString) {

    if (!dateString || dateString.length < 10) return '';

    const month = parseInt(dateString.substring(5, 7), 10); // 去掉前导0

    const day = parseInt(dateString.substring(8, 10), 10);   // 去掉前导0

    return `${month}月${day}日`;

  },



  showDatePicker() {

    this.setData({

      datePickerVisible: true

    });

  },



  onDateConfirm(e) {

    this.setData({

      date: e.detail.value,

      datePickerVisible: false

    });

  },



  onDateCancel() {

    this.setData({

      datePickerVisible: false

    });

  },



  showTransplantDatePicker() {

    this.setData({

      transplantDatePickerVisible: true

    });

  },



  // 保存移植日期到云端

  async onTransplantDateConfirm(e) {

    const date = e.detail.value

    this.setData({

      transplantDate: date,

      transplantDatePickerVisible: false,

      daysSinceTransplant: this.calculateDaysSinceTransplant()

    })

    try {

      // 先查找是否已有

      const res = await db.collection('transplantDate').where({

        _openid: this.data.openid

      }).get()

      if (res.data.length > 0) {

        await db.collection('transplantDate').doc(res.data[0]._id).update({

          data: {

            date

          }

        })

      } else {

        await db.collection('transplantDate').add({

          data: {

            date

          }

        })

      }

    } catch (err) {

      wx.showToast({

        title: '保存失败',

        icon: 'error'

      })

    }

  },



  onTransplantDateCancel() {

    this.setData({

      transplantDatePickerVisible: false

    });

  },



  showCheckupDatePicker() {

    this.setData({

      checkupDatePickerVisible: true

    });

  },



  // 保存复查日期到云端

  async onCheckupDateConfirm(e) {

    const date = e.detail.value

    this.setData({

      nextCheckupDate: date,

      checkupDatePickerVisible: false

    })

    try {

      const res = await db.collection('nextCheckupDate').where({

        _openid: this.data.openid

      }).get()

      if (res.data.length > 0) {

        await db.collection('nextCheckupDate').doc(res.data[0]._id).update({

          data: {

            date

          }

        })

      } else {

        await db.collection('nextCheckupDate').add({

          data: {

            date

          }

        })

      }

    } catch (err) {

      wx.showToast({

        title: '保存失败',

        icon: 'error'

      })

    }

  },



  onCheckupDateCancel() {

    this.setData({

      checkupDatePickerVisible: false

    });

  },



  onWbcChange(e) {

    this.setData({

      'bloodData.wbc': e.detail.value

    });

  },



  onHgbChange(e) {

    this.setData({

      'bloodData.hgb': e.detail.value

    });

  },



  onPltChange(e) {

    this.setData({

      'bloodData.plt': e.detail.value

    });

  },



  onNeutChange(e) {

    this.setData({

      'bloodData.neut': e.detail.value

    });

  },



  onUploadSuccess(e) {

    const {

      files

    } = e.detail;

    this.setData({

      files: [...this.data.files, ...files]

    });

    // TODO: 调用图片识别API

  },



  onUploadRemove(e) {

    const {

      index

    } = e.detail;

    const files = this.data.files;

    files.splice(index, 1);

    this.setData({

      files

    });

  },



  onSubmit() {

    // 保存数据到本地存储

    wx.setStorageSync('bloodData', this.data.bloodData);



    Toast({

      context: this,

      selector: '#t-toast',

      message: '保存成功',

      theme: 'success',

    });

  },



  calculateDaysSinceTransplant() {

    if (!this.data.transplantDate) return 0;

    const transplant = new Date(this.data.transplantDate);

    const today = new Date();

    const diffTime = Math.abs(today - transplant);

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  },



  // 长按任务项

  onTaskLongPress(e) {

    const taskId = e.currentTarget.dataset.id;

    wx.showModal({

      title: '删除任务',

      content: '确定要删除这个任务吗？',

      success: async (res) => {

        if (res.confirm) {

          const app = getApp()

          const db = wx.cloud.database()

          const openid = app.getOpenIdIfLoggedIn()



          wx.showLoading({

            title: '删除中...',

            mask: true

          })



          try {

            await db.collection('todayTasks').doc(taskId).remove()

            wx.showToast({

              title: '删除成功',

              icon: 'success'

            })

            this.loadTodayTasks(openid)

            this.updateCalendarEvents()

          } catch (err) {



            wx.showToast({

              title: '删除失败',

              icon: 'none'

            })

          } finally {

            wx.hideLoading()

          }

        }

      }

    });

  },



  // 检查登录状态并执行回调

  checkLoginAndExecute(callback, actionName = '此功能') {

    const app = getApp()

    const openid = app.getOpenIdIfLoggedIn()



    if (openid) {

      // 已登录，直接执行回调

      callback()

      return

    }



    // 未登录，跳转到我的页面进行登录

    wx.switchTab({

      url: '/pages/profile/index',

      success: () => {

        wx.showToast({

          title: '请先登录',

          icon: 'none'

        });

      }

    });

  },



  // 显示暖光里程碑设置弹窗

  showKeyDatePopup() {

    this.checkLoginAndExecute(() => {

      const app = getApp();

      const openid = app.getOpenIdIfLoggedIn();

      const currentProfileId = app.getCurrentProfileId();



      // 显示弹窗前先加载最新数据

      this.loadKeyDates(openid, currentProfileId).then(() => {

        this.setData({

          showKeyDatePopup: true

        });

      }).catch(() => {

        // 即使加载失败也要显示弹窗

        this.setData({

          showKeyDatePopup: true

        });

      });

    }, '暖光里程碑功能');

  },



  // 关闭暖光里程碑设置弹窗

  closeKeyDatePopup(e) {

    // 处理弹窗组件的visible-change事件

    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {

      this.setData({

        showKeyDatePopup: e.detail.visible

      });

    } else {

      this.setData({

        showKeyDatePopup: false

      });

    }

  },



  // 显示添加/编辑暖光里程碑弹窗

  showKeyDateEditPopup() {

    // 使用选中的日期作为默认日期，如果没有选中日期则使用今天
    const defaultDate = this.data.selectedDate || new Date().toISOString().split('T')[0]

    this.setData({

      showKeyDatePopup: false,

      showKeyDateEditPopup: true,

      editingKeyDate: null,

      keyDateForm: {

        name: '', // 兼容性

        title: '',

        date: defaultDate

      }

    });

  },



  // 编辑暖光里程碑

  editKeyDate(e) {

    const id = e.currentTarget.dataset.id;

    const keyDate = this.data.keyDates.find(item => item.id === id);



    if (!keyDate) {

      wx.showToast({

        title: '暖光里程碑数据错误',

        icon: 'none'

      });

      return;

    }






    // 设置编辑状态和数据

    this.setData({

      showKeyDatePopup: false,

      showKeyDateEditPopup: true,

      editingKeyDate: keyDate,

      keyDateForm: {

        name: keyDate.title, // 兼容性

        title: keyDate.title,

        date: keyDate.date

      }

    }, () => {
      // 强制刷新表单输入框的值，确保编辑时能看到现有内容
      setTimeout(() => {
        this.setData({
          'keyDateForm.title': keyDate.title,
          'keyDateForm.date': keyDate.date
        });
      }, 100);
    });

  },



  // 删除暖光里程碑

  deleteKeyDate(e) {

    const id = e.currentTarget.dataset.id;

    const keyDate = this.data.keyDates.find(item => item.id === id);



    if (!keyDate) {

      wx.showToast({

        title: '暖光里程碑数据错误',

        icon: 'none'

      });

      return;

    }



    wx.showModal({

      title: '确认删除',

      content: `确定要删除"${keyDate.title}"吗？`,

      success: (res) => {

        if (res.confirm) {

          this.doDeleteKeyDate(id);

        }

      }

    });

  },



  // 执行删除暖光里程碑

  async doDeleteKeyDate(id) {

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();



    if (!openid) {

      wx.showToast({

        title: '请先登录',

        icon: 'none'

      });

      return;

    }



    wx.showLoading({

      title: '删除中...',

      mask: true

    });



    try {

      const db = wx.cloud.database();

      await db.collection('keyDates').doc(id).remove();



      wx.showToast({

        title: '删除成功',

        icon: 'success'

      });



      // 重新加载数据

      const currentProfileId = app.getCurrentProfileId();

      this.loadKeyDates(openid, currentProfileId);

    } catch (err) {



      wx.showToast({

        title: '删除失败',

        icon: 'none'

      });

    } finally {

      wx.hideLoading();

    }

  },



  // 关闭添加/编辑暖光里程碑弹窗

  closeKeyDateEditPopup(e) {

    // 处理弹窗组件的visible-change事件

    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {

      this.setData({

        showKeyDateEditPopup: e.detail.visible

      });

      if (!e.detail.visible) {

        this.setData({

          showKeyDatePopup: false,  // 🔧 修复：确保主列表弹窗也关闭

          editingKeyDate: null,

          keyDateForm: {

            name: '', // 兼容性

            title: '',

            date: ''

          }

        });

      }

    } else {

      // 直接调用或事件参数无效时，强制关闭弹窗

      this.setData({

        showKeyDateEditPopup: false,

        showKeyDatePopup: false,  // 🔧 修复：点击关闭按钮时也要关闭主列表弹窗

        editingKeyDate: null,

        keyDateForm: {

          name: '', // 兼容性

          title: '',

          date: ''

        }

      });

    }

  },



  // 从编辑弹窗返回到总编辑列表

  backToKeyDateList() {

    this.setData({

      showKeyDateEditPopup: false,

      showKeyDatePopup: true,  // 🔧 修复：返回到总编辑列表，而不是直接回主页面

      editingKeyDate: null,

      keyDateForm: {

        name: '', // 兼容性

        title: '',

        date: ''

      }

    });

  },



  // 暖光里程碑名称输入（保持兼容性）

  onKeyDateNameInput(e) {

    this.setData({

      'keyDateForm.name': e.detail.value

    });

  },

  // 暖光里程碑标题输入
  onKeyDateTitleInput(e) {
    let value = e.detail.value;
    // 限制标题长度为10个字符（中文输入完成后才限制）
    if (value.length > 10) {
      value = value.substring(0, 10);
      // 提示用户已达到长度限制
      wx.showToast({
        title: '标题最多10个字',
        icon: 'none',
        duration: 1500
      });
    }
    this.setData({
      'keyDateForm.title': value
    });
  },



  // 暖光里程碑日期选择

  onKeyDateChange(e) {

    this.setData({

      'keyDateForm.date': e.detail.value

    });

  },



  // 保存暖光里程碑

  async saveKeyDate() {

    const app = getApp()

    const openid = app.getOpenIdIfLoggedIn()

    if (!openid) {

      wx.showToast({

        title: '请先登录',

        icon: 'none'

      })

      return

    }



    const currentProfileId = app.getCurrentProfileId()

    // 🔥 调试日志：检查获取到的 profileId
    console.log('=== 保存暖光里程碑 - 调试信息 ===')
    console.log('openid:', openid)
    console.log('currentProfileId (from getCurrentProfileId):', currentProfileId)
    console.log('app.globalData.currentProfile:', app.globalData.currentProfile)
    console.log('Storage currentProfileId:', wx.getStorageSync('currentProfileId'))

    if (!currentProfileId) {

      wx.showToast({

        title: '请先选择档案',

        icon: 'none'

      })

      return

    }



    const db = wx.cloud.database()



    const {

      keyDateForm,

      editingKeyDate

    } = this.data



    if ((!keyDateForm.title && !keyDateForm.name) || !keyDateForm.date) {

      wx.showToast({

        title: '请填写完整信息',

        icon: 'none'

      })

      return

    }



    wx.showLoading({

      title: editingKeyDate ? '更新中...' : '保存中...',

      mask: true

    })



    try {

      const data = {

        title: keyDateForm.title || keyDateForm.name, // 兼容新旧字段名

        date: keyDateForm.date,

        openid: openid,

        profileId: currentProfileId

      }

      // 🔥 调试日志：检查即将保存的数据
      console.log('即将保存的数据:', data)
      console.log('profileId 值:', data.profileId)
      console.log('profileId 类型:', typeof data.profileId)



      let res;

      if (editingKeyDate) {

        // 编辑模式，更新数据

        data.updateTime = db.serverDate()

        res = await db.collection('keyDates').doc(editingKeyDate.id).update({

          data

        })



      } else {

        // 新增模式，添加数据

        data.createTime = db.serverDate()

        res = await db.collection('keyDates').add({

          data

        })



      }



      wx.showToast({

        title: editingKeyDate ? '更新成功' : '保存成功',

        icon: 'success'

      })



      // 先关闭弹窗并清空表单

      this.setData({

        showKeyDateEditPopup: false,

        showKeyDatePopup: false,

        editingKeyDate: null,

        keyDateForm: {

          name: '', // 兼容性

          title: '',

          date: ''

        }

      })



      // 延迟重新加载数据，确保弹窗已关闭

      setTimeout(() => {

        const currentProfileId = app.getCurrentProfileId();

        this.loadKeyDates(openid, currentProfileId)

      }, 100)

    } catch (err) {



      wx.showToast({

        title: '保存失败',

        icon: 'none'

      })

    } finally {

      wx.hideLoading()

    }

  },



  // 暖光里程碑 info 图标点击，展示所有同日暖光里程碑

  showDateDetail(e) {

    const id = e.currentTarget.dataset.id;

    const keyDate = this.data.keyDates.find(item => item.id === id);

    if (!keyDate) return;

    const date = keyDate.date;

    const tasks = wx.getStorageSync(`tasks_${date}`) || [];

    // 查找所有同日暖光里程碑

    const keyDates = this.data.keyDates.filter(item => item.date === date);

    if (tasks.length === 0 && keyDates.length === 0) return;

    this.setData({

      showDateDetailPopup: true,

      currentDateDetail: {

        date,

        keyDates,

        tasks

      }

    });

  },



  // 关闭日期详情弹窗

  onDateDetailPopupClose(e) {

    // 处理弹窗组件的visible-change事件

    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {

      this.setData({

        showDateDetailPopup: e.detail.visible

      });

      if (!e.detail.visible) {

        this.setData({

          currentDateDetail: null

        });

      }

    } else {

      // 直接调用或事件参数无效时，强制关闭弹窗

      this.setData({

        showDateDetailPopup: false,

        currentDateDetail: null

      });

    }

  },



  // 计算使用天数

  calculateUsageDays() {

    const firstUseDate = this.data.firstUseDate;

    if (!firstUseDate) return 0;



    const today = new Date();

    const firstDate = new Date(firstUseDate);

    const diffTime = Math.abs(today - firstDate);

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;

  },



  // 计算天数

  calculateDays(date) {

    const today = new Date()

    today.setHours(0, 0, 0, 0)

    const targetDate = new Date(date)

    targetDate.setHours(0, 0, 0, 0)

    const days = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24))

    return Math.abs(days)

  },



  // 获取状态文本

  getStatusText(date) {

    const today = new Date()

    today.setHours(0, 0, 0, 0)

    const targetDate = new Date(date)

    targetDate.setHours(0, 0, 0, 0)

    const days = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24))

    const absDays = Math.abs(days)






    // 当天的情况特殊处理

    if (days === 0) {

      return {

        fullText: '今天',

        prefix: '',

        daysNumber: '',

        suffix: '',

        isToday: true

      }

    }



    let daysText = ''



    if (absDays >= 365) {

      const years = Math.floor(absDays / 365)

      const remainingDays = absDays % 365

      if (remainingDays > 0) {

        daysText = `${years}年${remainingDays}天`

      } else {

        daysText = `${years}年`

      }

    } else {

      daysText = `${absDays}天`

    }



    // 分解为前缀、数字、后缀

    if (days < 0) {

      return {

        fullText: `已经过了${daysText}`,

        prefix: '已经过了',

        daysNumber: daysText,

        suffix: '',

        isToday: false

      }

    } else {

      return {

        fullText: `还有${daysText}`,

        prefix: '还有',

        daysNumber: daysText,

        suffix: '',

        isToday: false

      }

    }

  },



  // 显示添加待办弹窗

  showAddTaskPopup() {

    this.setData({

      showAddTask: true,

      newTask: {

        name: '',

        dueTime: ''

      }

    });

  },



  // 关闭添加待办弹窗

  closeAddTaskPopup() {

    this.setData({

      showAddTask: false,

      newTask: {

        name: '',

        dueTime: ''

      }

    });

  },



  // 待办名称输入

  onTaskNameInput(e) {

    this.setData({

      'newTask.name': e.detail.value

    });

  },



  // 待办时间选择

  onTaskTimeChange(e) {

    this.setData({

      'newTask.dueTime': e.detail.value

    });

  },



  // 🎨 加载最近一次血常规数据 - 美化功能

  async loadTodayBloodData() {



    const app = getApp()

    const openid = app.getOpenIdIfLoggedIn()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        latestBloodData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()

      // 查询最近一次血常规数据，按日期降序排列

      const res = await db.collection('bloodTests')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const bloodData = res.data[0]





        this.setData({

          latestBloodData: bloodData

        })





      } else {



        this.setData({

          latestBloodData: null

        })

      }



    } catch (err) {



      this.setData({

        latestBloodData: null

      })

    } finally { }

  },



  // 🎨 加载最近一次用药数据 - 美化功能

  async loadTodayMedicationData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        latestMedicationData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()

      const today = this.getTodayString()







      // 查询今日用药记录

      const res = await db.collection('medications')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: today

        })

        .get()







      if (res.data.length > 0) {

        const medicationRecord = res.data[0]

        const recordDate = today



        if (medicationRecord.medicines && medicationRecord.medicines.length > 0) {

          // 所有药品都应该是今日有效的（因为数据库设计已经确保了这一点）

          const activeMedicines = medicationRecord.medicines;







          if (activeMedicines.length > 0) {

            // 计算统计信息

            let totalTimeSlots = 0;

            let completedTimeSlots = 0;

            let continuousDays = 0;

            let lastMedicationTime = '';

            let nextMedicationTime = '';



            // 计算总时段和完成时段

            activeMedicines.forEach(medicine => {

              const timeSlots = medicine.timesPerDay ? medicine.timesPerDay.length : 1;

              totalTimeSlots += timeSlots;









              if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

                const completedSlotsCount = medicine.timesPerDay.filter(slot =>

                  medicine.timeSlotStatus[slot] === true

                ).length;

                completedTimeSlots += completedSlotsCount;





                // 查找最近一次服药时间（已完成的最晚时段）

                const completedSlots = medicine.timesPerDay.filter(slot =>

                  medicine.timeSlotStatus[slot] === true

                );

                if (completedSlots.length > 0) {

                  const lastSlot = completedSlots[completedSlots.length - 1];

                  if (!lastMedicationTime || this.compareTimeSlots(lastSlot, lastMedicationTime) > 0) {

                    lastMedicationTime = lastSlot;

                  }

                }



                // 查找下次服药时间（未完成的最早时段）

                const pendingSlots = medicine.timesPerDay.filter(slot =>

                  !medicine.timeSlotStatus[slot]

                );

                if (pendingSlots.length > 0) {

                  const nextSlot = pendingSlots[0];

                  if (!nextMedicationTime || this.compareTimeSlots(nextSlot, nextMedicationTime) < 0) {

                    nextMedicationTime = nextSlot;

                  }

                }

              } else if (medicine.taken) {

                completedTimeSlots += timeSlots;

              }

            });



            // 计算已服用的药品数量

            const takenCount = activeMedicines.filter(medicine => {

              if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

                return medicine.timesPerDay.some(slot =>

                  medicine.timeSlotStatus[slot] === true

                );

              } else {

                return medicine.taken === true;

              }

            }).length;



            // 计算连续服药天数（查询最近7天的记录作为示例）

            try {

              const weekAgo = new Date();

              weekAgo.setDate(weekAgo.getDate() - 7);

              const weekAgoStr = this.formatDate(weekAgo);



              const recentRes = await db.collection('medications')

                .where({

                  openid: openid,

                  profileId: currentProfileId,

                  date: db.command.gte(weekAgoStr).and(db.command.lte(today))

                })

                .orderBy('date', 'desc')

                .get();



              // 从今天开始往前数连续天数

              let consecutive = 0;

              const currentDate = new Date();



              for (let i = 0; i < 7; i++) {

                const checkDate = new Date(currentDate);

                checkDate.setDate(checkDate.getDate() - i);

                const checkDateStr = this.formatDate(checkDate);



                const dayRecord = recentRes.data.find(record => record.date === checkDateStr);

                if (dayRecord && dayRecord.medicines && dayRecord.medicines.length > 0) {

                  // 检查是否至少有一种药服用了

                  const hasAnyMedicationTaken = dayRecord.medicines.some(medicine => {

                    if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {

                      return medicine.timesPerDay.some(slot =>

                        medicine.timeSlotStatus[slot] === true

                      );

                    } else {

                      return medicine.taken === true;

                    }

                  });



                  if (hasAnyMedicationTaken) {

                    consecutive++;

                  } else {

                    break;

                  }

                } else {

                  break;

                }

              }



              continuousDays = consecutive;

            } catch (err) {



              continuousDays = 0;

            }



            const medicationData = {

              date: today,

              totalMedicines: activeMedicines.length,

              takenMedicines: takenCount,

              totalTimeSlots: totalTimeSlots,

              completedTimeSlots: completedTimeSlots,

              completionRate: totalTimeSlots > 0 ? Math.round((completedTimeSlots / totalTimeSlots) * 100) : 0,

              isFullyCompleted: completedTimeSlots === totalTimeSlots && totalTimeSlots > 0,

              lastMedicationTime: lastMedicationTime,

              nextMedicationTime: nextMedicationTime,

              continuousDays: continuousDays,

              medicines: activeMedicines

            };











            this.setData({

              latestMedicationData: medicationData

            }, () => {

              setTimeout(() => {

                this.animateProgress(parseInt(medicationData.completionRate));

              }, 50); // 短暂延迟确保DOM更新

            });

            return;

          }

        }

      }



      // 没有今日用药记录



      this.setData({

        latestMedicationData: null,

        animatedProgress: 0 // 🌟 直接重置动画进度，无需动画

      });



    } catch (err) {



      this.setData({

        latestMedicationData: null

      });

    }

  },



  // 辅助函数：比较时段时间

  compareTimeSlots(slot1, slot2) {

    const timeOrder = {

      '早': 1,

      '中': 2,

      '晚': 3,

      '睡前': 4

    };

    return (timeOrder[slot1] || 999) - (timeOrder[slot2] || 999);

  },



  animateProgress(targetProgress) {

    // 清除之前的动画

    if (this.data.progressAnimationTimer) {

      clearInterval(this.data.progressAnimationTimer);

    }



    const startProgress = this.data.animatedProgress || 0;

    const duration = 1200; // 动画持续时间 1.2秒

    const frameRate = 60; // 60fps

    const totalFrames = (duration / 1000) * frameRate;

    let currentFrame = 0;



    // 使用easeOutCubic缓动函数，营造专业的动画感

    const easeOutCubic = (t) => {

      return 1 - Math.pow(1 - t, 3);

    };



    const timer = setInterval(() => {

      currentFrame++;

      const progress = currentFrame / totalFrames;



      if (progress >= 1) {

        // 动画完成

        this.setData({

          animatedProgress: targetProgress,

          progressAnimationTimer: null

        });

        clearInterval(timer);

      } else {

        // 计算当前帧的进度值

        const easedProgress = easeOutCubic(progress);

        const currentProgress = Math.round(startProgress + (targetProgress - startProgress) * easedProgress);



        this.setData({

          animatedProgress: currentProgress

        });

      }

    }, 1000 / frameRate);



    this.setData({

      progressAnimationTimer: timer

    });

  },



  // 🎨 加载最近一次门诊数据 - 美化功能

  async loadTodayClinicData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayClinicData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()

      const res = await db.collection('clinicRecords')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      if (res.data && res.data.length > 0) {

        // 获取最近一次门诊记录

        const latestRecord = res.data[0]






        this.setData({

          todayClinicData: {

            count: 1,

            latestRecord: latestRecord,

            hospitals: [latestRecord.hospital].filter(h => h),

            departments: [latestRecord.department].filter(d => d),

            hasMultipleHospitals: false,

            hasMultipleDepartments: false

          }

        })

      } else {



        this.setData({

          todayClinicData: null

        })

      }

    } catch (err) {



      this.setData({

        todayClinicData: null

      })

    }

  },



  // 🎨 加载今日尿量数据 - 美化功能

  async loadTodayUrineData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayUrineData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()

      const today = this.getTodayString() // 获取今日日期







      const res = await db.collection('urineRecords')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: today // 🔧 关键修复：添加今日日期筛选

        })

        .orderBy('createTime', 'desc') // 按创建时间排序，获取最新记录

        .get() // 🔧 移除limit(1)，获取今日所有记录



      if (res.data.length > 0) {

        // 🔧 计算今日的总尿量和记录次数

        const todayRecords = res.data

        const totalVolume = todayRecords.reduce((sum, record) => sum + (record.volume || 0), 0)

        const recordCount = todayRecords.length

        const latestRecord = todayRecords[0] // 最新的一次记录






        this.setData({

          todayUrineData: {

            count: recordCount, // 今日记录次数

            totalVolume: totalVolume, // 今日总尿量

            latestRecord: latestRecord // 最新记录

          }

        })

      } else {



        await this.loadRecentUrineData(openid, currentProfileId, today)

      }

    } catch (err) {



      this.setData({

        todayUrineData: null

      })

    }

  },



  // 👑 加载最近尿量记录（今日无数据时的备选方案）

  async loadRecentUrineData(openid, currentProfileId, today) {

    try {





      const db = wx.cloud.database()

      const res = await db.collection('urineRecords')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: db.command.lt(today) // 查找今日之前的记录

        })

        .orderBy('date', 'desc')

        .orderBy('createTime', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const recentRecord = res.data[0]

        const daysDiff = this.calculateDaysDiff(recentRecord.date, today)






        this.setData({

          todayUrineData: {

            isRecent: true, // 标记为历史记录

            daysDiff: daysDiff,

            count: 0, // 今日次数为0

            totalVolume: 0, // 今日总量为0

            recentRecord: recentRecord, // 最近记录

            hintText: `${daysDiff}天前最后一次记录`

          }

        })

      } else {



        this.setData({

          todayUrineData: null

        })

      }

    } catch (err) {



      this.setData({

        todayUrineData: null

      })

    }

  },



  // 🎨 加载今日费用数据 - 美化功能

  async loadTodayExpenseData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayExpenseData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()

      const today = this.getTodayString() // 获取今日日期





      const res = await db.collection('expenseRecords')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: today // 🔧 关键修复：添加今日日期筛选

        })

        .orderBy('createTime', 'desc') // 按创建时间排序，获取最新记录

        .get() // 🔧 获取今日所有记录





      if (res.data.length > 0) {

        let total = 0;

        res.data.forEach(item => {

          total += parseFloat(item.amount) || 0;

        });



        this.setData({

          todayExpenseData: {

            count: res.data.length,

            total: total.toFixed(2)

          }

        })

      } else {



        this.setData({

          todayExpenseData: null

        })

      }

    } catch (err) {



      this.setData({

        todayExpenseData: null

      })

    }

  },



  // 🎨 加载今日排便数据 - 美化功能

  async loadTodayStoolData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayStoolData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()

      const today = this.getTodayString() // 获取今日日期







      const res = await db.collection('stoolRecords')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: today // 🔧 关键修复：添加今日日期筛选

        })

        .orderBy('createTime', 'desc') // 按创建时间排序，获取最新记录

        .get() // 🔧 移除limit(1)，获取今日所有记录



      if (res.data.length > 0) {

        // 🔧 计算今日的排便次数和异常情况

        const todayRecords = res.data

        const recordCount = todayRecords.length

        const latestRecord = todayRecords[0] // 最新的一次记录



        // 检查今日所有记录是否有异常指标

        const hasAbnormalToday = todayRecords.some(record => record.hasBlood || record.hasMucus)

        let abnormalInfo = ''

        if (hasAbnormalToday) {

          const abnormalItems = []

          const hasBloodToday = todayRecords.some(record => record.hasBlood)

          const hasMucusToday = todayRecords.some(record => record.hasMucus)

          if (hasBloodToday) abnormalItems.push('血液')

          if (hasMucusToday) abnormalItems.push('粘液')

          abnormalInfo = abnormalItems.join('、')

        }






        this.setData({

          todayStoolData: {

            count: recordCount, // 今日记录次数

            latestRecord: latestRecord, // 最新记录

            hasAbnormal: hasAbnormalToday, // 今日是否有异常

            abnormalInfo: abnormalInfo // 异常信息

          }

        })

      } else {



        await this.loadRecentStoolData(openid, currentProfileId, today)

      }

    } catch (err) {



      this.setData({

        todayStoolData: null

      })

    }

  },



  // 👑 加载最近排便记录（今日无数据时的备选方案）

  async loadRecentStoolData(openid, currentProfileId, today) {

    try {





      const db = wx.cloud.database()

      const res = await db.collection('stoolRecords')

        .where({

          openid: openid,

          profileId: currentProfileId,

          date: db.command.lt(today) // 查找今日之前的记录

        })

        .orderBy('date', 'desc')

        .orderBy('createTime', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const recentRecord = res.data[0]

        const daysDiff = this.calculateDaysDiff(recentRecord.date, today)



        // 检查最近记录的异常情况

        const hasAbnormal = recentRecord.hasBlood || recentRecord.hasMucus

        let abnormalInfo = ''

        if (hasAbnormal) {

          const abnormalItems = []

          if (recentRecord.hasBlood) abnormalItems.push('血液')

          if (recentRecord.hasMucus) abnormalItems.push('粘液')

          abnormalInfo = abnormalItems.join('、')

        }






        this.setData({

          todayStoolData: {

            isRecent: true, // 标记为历史记录

            daysDiff: daysDiff,

            count: 0, // 今日次数为0

            recentRecord: recentRecord, // 最近记录

            hasAbnormal: hasAbnormal,

            abnormalInfo: abnormalInfo,

            hintText: `${daysDiff}天前最后一次记录`

          }

        })

      } else {



        this.setData({

          todayStoolData: null

        })

      }

    } catch (err) {



      this.setData({

        todayStoolData: null

      })

    }

  },



  // 📅 计算日期差值

  calculateDaysDiff(fromDate, toDate) {

    const from = new Date(fromDate)

    const to = new Date(toDate)

    const diffTime = to.getTime() - from.getTime()

    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays

  },



  // 🎨 加载最近一次EB病毒检测数据 - 美化功能

  async loadTodayEbvData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayEbvData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()



      const res = await db.collection('ebvRecords')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const latestRecord = res.data[0]



        // 🔧 修复：根据数值判断阴性/阳性，而不是依赖result字段

        let result = '阴性'

        let hasAbnormal = false



        // 检查是否有数值数据

        if (latestRecord.ebvDna !== undefined && latestRecord.ebvDna !== null && latestRecord.ebvDna !== '') {

          const dnaValue = parseFloat(latestRecord.ebvDna)

          if (!isNaN(dnaValue)) {

            // 根据EBV DNA载量判断（一般 > 0 为阳性）

            if (dnaValue > 0) {

              result = '阳性'

              hasAbnormal = true

            }

          }

        }



        // 如果有明确的result字段，优先使用

        if (latestRecord.result && latestRecord.result !== '') {

          result = latestRecord.result

          hasAbnormal = result === '阳性' || result === '强阳性'

        }



        let abnormalInfo = ''

        if (hasAbnormal) {

          abnormalInfo = `EB病毒${result}`

        }



        console.log('🎨 最近一次EB病毒检测数据处理完成:', {

          date: latestRecord.date,

          ebvDna: latestRecord.ebvDna,

          result: result,

          hasAbnormal: hasAbnormal,

          abnormalInfo: abnormalInfo

        })



        this.setData({

          todayEbvData: {

            date: latestRecord.date,

            ebvDna: (latestRecord.ebvDna === 0 || latestRecord.ebvDna) ? latestRecord.ebvDna : '',

            result: result,

            hasAbnormal: hasAbnormal,

            abnormalInfo: abnormalInfo

          }

        })

      } else {



        this.setData({

          todayEbvData: null

        })

      }

    } catch (err) {



      this.setData({

        todayEbvData: null

      })

    }

  },



  // 🎨 加载最近一次巨细胞病毒检测数据 - 美化功能

  async loadTodayCmvData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayCmvData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()



      const res = await db.collection('cmvRecords')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const latestRecord = res.data[0]



        // 🔧 修复：根据数值判断阴性/阳性，而不是依赖result字段

        let result = '阴性'

        let hasAbnormal = false



        // 检查是否有数值数据

        if (latestRecord.hcmvDna !== undefined && latestRecord.hcmvDna !== null && latestRecord.hcmvDna !== '') {

          const dnaValue = parseFloat(latestRecord.hcmvDna)

          if (!isNaN(dnaValue)) {

            // 根据HCMV DNA载量判断（一般 > 0 为阳性）

            if (dnaValue > 0) {

              result = '阳性'

              hasAbnormal = true

            }

          }

        }



        // 如果有明确的result字段，优先使用

        if (latestRecord.result && latestRecord.result !== '') {

          result = latestRecord.result

          hasAbnormal = result === '阳性' || result === '强阳性'

        }



        let abnormalInfo = ''

        if (hasAbnormal) {

          abnormalInfo = `巨细胞病毒${result}`

        }



        console.log('🎨 最近一次巨细胞病毒检测数据处理完成:', {

          date: latestRecord.date,

          hcmvDna: latestRecord.hcmvDna,

          result: result,

          hasAbnormal: hasAbnormal,

          abnormalInfo: abnormalInfo

        })



        this.setData({

          todayCmvData: {

            date: latestRecord.date,

            hcmvDna: (latestRecord.hcmvDna === 0 || latestRecord.hcmvDna) ? latestRecord.hcmvDna : '',

            result: result,

            hasAbnormal: hasAbnormal,

            abnormalInfo: abnormalInfo

          }

        })

      } else {



        this.setData({

          todayCmvData: null

        })

      }

    } catch (err) {



      this.setData({

        todayCmvData: null

      })

    }

  },



  // 🎨 加载最近一次乳酸脱氢酶数据 - 美化功能

  async loadTodayLdhData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayLdhData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()



      const res = await db.collection('ldhRecords')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const latestRecord = res.data[0]



        // 检查是否有异常值

        let hasAbnormal = false

        let abnormalInfo = ''



        // 检查主要指标是否异常（这里可以根据医学参考值调整）

        if (latestRecord.ldh && latestRecord.ldh !== '') {

          const ldhValue = parseFloat(latestRecord.ldh)

          if (!isNaN(ldhValue)) {

            // 乳酸脱氢酶正常参考值为100-300 U/L

            if (ldhValue > 300) {

              hasAbnormal = true

              abnormalInfo = `乳酸脱氢酶偏高(${ldhValue})`

            } else if (ldhValue < 100) {

              hasAbnormal = true

              abnormalInfo = `乳酸脱氢酶偏低(${ldhValue})`

            }

          }

        }



        console.log('🎨 最近一次乳酸脱氢酶检测数据处理完成:', {

          date: latestRecord.date,

          ldh: latestRecord.ldh,

          ldhRatio: latestRecord.ldhRatio,

          aHbdh: latestRecord.aHbdh,

          hasAbnormal: hasAbnormal,

          abnormalInfo: abnormalInfo

        })



        this.setData({

          todayLdhData: {

            date: latestRecord.date,

            ldh: latestRecord.ldh || '',

            ldhRatio: latestRecord.ldhRatio || '',

            αHbdh: latestRecord.αHbdh || '',

            hasAbnormal: hasAbnormal,

            abnormalInfo: abnormalInfo

          }

        })

      } else {



        this.setData({

          todayLdhData: null

        })

      }

    } catch (err) {



      this.setData({

        todayLdhData: null

      })

    }

  },



  // 🎨 加载最近一次肝功能数据 - 美化功能

  async loadTodayLiverData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayLiverData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()



      // 🔧 修复：从肝功能独立集合和器官功能集合中查找数据

      let res = await db.collection('liverFunctionTests')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      // 如果肝功能独立集合没有数据，从器官功能集合查找

      if (res.data.length === 0) {



        res = await db.collection('organFunctionRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            $or: [{

              alt: db.command.neq('')

            },

            {

              ast: db.command.neq('')

            },

            {

              tbil: db.command.neq('')

            },

            {

              dbil: db.command.neq('')

            },

            {

              totalBilirubin: db.command.neq('')

            },

            {

              directBilirubin: db.command.neq('')

            },

            {

              bilirubin: db.command.neq('')

            },

            {

              albumin: db.command.neq('')

            },

            {

              totalProtein: db.command.neq('')

            },

            {

              alb: db.command.neq('')

            },

            {

              tp: db.command.neq('')

            },

            {

              ggt: db.command.neq('')

            },

            {

              alp: db.command.neq('')

            }

            ]

          })

          .orderBy('date', 'desc')

          .limit(1)

          .get()

      }



      if (res.data.length > 0) {

        const latestRecord = res.data[0]



        // 🔧 修复：提取所有可能的肝功能指标，优先显示4个必选指标

        const liverData = {}







        // 标准指标映射 - 支持多种字段名

        if (latestRecord.alt) liverData.alt = latestRecord.alt

        if (latestRecord.ast) liverData.ast = latestRecord.ast



        // 总胆红素：支持多种字段名

        if (latestRecord.tbil) {

          liverData.tbil = latestRecord.tbil

        } else if (latestRecord.totalBilirubin) {

          liverData.tbil = latestRecord.totalBilirubin

        } else if (latestRecord.total_bilirubin) {

          liverData.tbil = latestRecord.total_bilirubin

        } else if (latestRecord.bilirubin) {

          liverData.tbil = latestRecord.bilirubin

        }



        // 直接胆红素：支持多种字段名

        if (latestRecord.dbil) {

          liverData.dbil = latestRecord.dbil

        } else if (latestRecord.directBilirubin) {

          liverData.dbil = latestRecord.directBilirubin

        } else if (latestRecord.direct_bilirubin) {

          liverData.dbil = latestRecord.direct_bilirubin

        }



        // 其他肝功能指标

        if (latestRecord.alb || latestRecord.albumin) {

          liverData.alb = latestRecord.alb || latestRecord.albumin

        }

        if (latestRecord.tp || latestRecord.totalProtein) {

          liverData.tp = latestRecord.tp || latestRecord.totalProtein

        }

        if (latestRecord.ggt) {

          liverData.ggt = latestRecord.ggt

        }

        if (latestRecord.alp) {

          liverData.alp = latestRecord.alp

        }



        // 🔧 修复：从customValues中加载自定义指标

        if (latestRecord.customValues) {

          Object.keys(latestRecord.customValues).forEach(key => {

            if (latestRecord.customValues[key] !== undefined && latestRecord.customValues[key] !== null && latestRecord.customValues[key] !== '') {

              liverData[key] = latestRecord.customValues[key]

            }

          })

        }



        // 🚀 智能检测：自动发现所有非空的肝功能相关字段

        const liverRelatedFields = ['alt', 'ast', 'tbil', 'dbil', 'alb', 'tp', 'ggt', 'alp', 'che', 'pa', 'tba', 'totalBilirubin', 'directBilirubin', 'albumin', 'totalProtein', 'bilirubin', 'total_bilirubin', 'direct_bilirubin']

        liverRelatedFields.forEach(field => {

          if (latestRecord[field] !== undefined && latestRecord[field] !== null && latestRecord[field] !== '' && !liverData[field]) {



            // 映射到标准字段名

            if (field === 'totalBilirubin' || field === 'total_bilirubin' || field === 'bilirubin') {

              liverData.tbil = latestRecord[field]

            } else if (field === 'directBilirubin' || field === 'direct_bilirubin') {

              liverData.dbil = latestRecord[field]

            } else if (field === 'albumin') {

              liverData.alb = latestRecord[field]

            } else if (field === 'totalProtein') {

              liverData.tp = latestRecord[field]

            } else {

              liverData[field] = latestRecord[field]

            }

          }

        })







        // 只有当有实际数据时才设置

        if (Object.keys(liverData).length > 0) {

          this.setData({

            todayLiverData: {

              date: latestRecord.date,

              ...liverData

            }

          })



          console.log('🎨 最近一次肝功能数据处理完成:', {

            date: latestRecord.date,

            indicators: Object.keys(liverData),

            data: liverData

          })

        } else {



          this.setData({

            todayLiverData: null

          })

        }

      } else {



        this.setData({

          todayLiverData: null

        })

      }

    } catch (err) {



      this.setData({

        todayLiverData: null

      })

    }

  },



  // 🎨 加载最近一次肾功能数据 - 美化功能

  async loadTodayKidneyData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayKidneyData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()



      // 🔧 修复：从肾功能独立集合和器官功能集合中查找数据

      let res = await db.collection('kidneyFunctionTests')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      // 如果肾功能独立集合没有数据，从器官功能集合查找

      if (res.data.length === 0) {



        res = await db.collection('organFunctionRecords')

          .where({

            openid: openid,

            profileId: currentProfileId,

            $or: [{

              cr: db.command.neq('')

            },

            {

              creatinine: db.command.neq('')

            },

            {

              serum_creatinine: db.command.neq('')

            },

            {

              bun: db.command.neq('')

            },

            {

              urea: db.command.neq('')

            },

            {

              urea_nitrogen: db.command.neq('')

            },

            {

              blood_urea_nitrogen: db.command.neq('')

            },

            {

              ua: db.command.neq('')

            },

            {

              uricAcid: db.command.neq('')

            },

            {

              uric_acid: db.command.neq('')

            },

            {

              serum_uric_acid: db.command.neq('')

            },

            {

              egfr: db.command.neq('')

            },

            {

              gfr: db.command.neq('')

            },

            {

              estimated_gfr: db.command.neq('')

            },

            {

              cysc: db.command.neq('')

            },

            {

              cystatinC: db.command.neq('')

            },

            {

              cystatin_c: db.command.neq('')

            }

            ]

          })

          .orderBy('date', 'desc')

          .limit(1)

          .get()

      }



      if (res.data.length > 0) {

        const latestRecord = res.data[0]



        // 🔧 修复：提取所有可能的肾功能指标，优先显示3个必选指标

        const kidneyData = {}







        // 肌酐：支持多种字段名

        if (latestRecord.cr) {

          kidneyData.cr = latestRecord.cr

        } else if (latestRecord.creatinine) {

          kidneyData.cr = latestRecord.creatinine

        } else if (latestRecord.serum_creatinine) {

          kidneyData.cr = latestRecord.serum_creatinine

        }



        // 尿素氮：支持多种字段名

        if (latestRecord.bun) {

          kidneyData.bun = latestRecord.bun

        } else if (latestRecord.urea) {

          kidneyData.bun = latestRecord.urea

        } else if (latestRecord.urea_nitrogen) {

          kidneyData.bun = latestRecord.urea_nitrogen

        } else if (latestRecord.blood_urea_nitrogen) {

          kidneyData.bun = latestRecord.blood_urea_nitrogen

        }



        // 尿酸：支持多种字段名

        if (latestRecord.ua) {

          kidneyData.ua = latestRecord.ua

        } else if (latestRecord.uricAcid) {

          kidneyData.ua = latestRecord.uricAcid

        } else if (latestRecord.uric_acid) {

          kidneyData.ua = latestRecord.uric_acid

        } else if (latestRecord.serum_uric_acid) {

          kidneyData.ua = latestRecord.serum_uric_acid

        }



        // eGFR：支持多种字段名

        if (latestRecord.egfr) {

          kidneyData.egfr = latestRecord.egfr

        } else if (latestRecord.gfr) {

          kidneyData.egfr = latestRecord.gfr

        } else if (latestRecord.estimated_gfr) {

          kidneyData.egfr = latestRecord.estimated_gfr

        }



        // 胱抑素C

        if (latestRecord.cysc) {

          kidneyData.cysc = latestRecord.cysc

        } else if (latestRecord.cystatinC) {

          kidneyData.cysc = latestRecord.cystatinC

        } else if (latestRecord.cystatin_c) {

          kidneyData.cysc = latestRecord.cystatin_c

        }



        // 🔧 修复：从customValues中加载自定义指标

        if (latestRecord.customValues) {

          Object.keys(latestRecord.customValues).forEach(key => {

            if (latestRecord.customValues[key] !== undefined && latestRecord.customValues[key] !== null && latestRecord.customValues[key] !== '') {

              kidneyData[key] = latestRecord.customValues[key]

            }

          })

        }



        // 🚀 智能检测：自动发现所有非空的肾功能相关字段

        const kidneyRelatedFields = ['cr', 'bun', 'ua', 'egfr', 'cysc', 'b2mg', 'rtn', 'upro', 'microalb', 'creatinine', 'urea', 'uricAcid', 'gfr', 'cystatinC', 'serum_creatinine', 'urea_nitrogen', 'blood_urea_nitrogen', 'uric_acid', 'serum_uric_acid', 'estimated_gfr', 'cystatin_c']

        kidneyRelatedFields.forEach(field => {

          if (latestRecord[field] !== undefined && latestRecord[field] !== null && latestRecord[field] !== '' && !kidneyData[field]) {



            // 映射到标准字段名

            if (field === 'creatinine' || field === 'serum_creatinine') {

              kidneyData.cr = latestRecord[field]

            } else if (field === 'urea' || field === 'urea_nitrogen' || field === 'blood_urea_nitrogen') {

              kidneyData.bun = latestRecord[field]

            } else if (field === 'uricAcid' || field === 'uric_acid' || field === 'serum_uric_acid') {

              kidneyData.ua = latestRecord[field]

            } else if (field === 'gfr' || field === 'estimated_gfr') {

              kidneyData.egfr = latestRecord[field]

            } else if (field === 'cystatinC' || field === 'cystatin_c') {

              kidneyData.cysc = latestRecord[field]

            } else {

              kidneyData[field] = latestRecord[field]

            }

          }

        })







        // 只有当有实际数据时才设置

        if (Object.keys(kidneyData).length > 0) {

          this.setData({

            todayKidneyData: {

              date: latestRecord.date,

              ...kidneyData

            }

          })



          console.log('🎨 最近一次肾功能数据处理完成:', {

            date: latestRecord.date,

            indicators: Object.keys(kidneyData),

            data: kidneyData

          })

        } else {



          this.setData({

            todayKidneyData: null

          })

        }

      } else {



        this.setData({

          todayKidneyData: null

        })

      }

    } catch (err) {



      this.setData({

        todayKidneyData: null

      })

    }

  },



  // 🎨 加载最近一次肝肾功能数据 - 美化功能

  async loadTodayOrganData(openid) {



    const app = getApp()

    const currentProfileId = app.getCurrentProfileId()



    if (!openid || !currentProfileId) {



      this.setData({

        todayOrganData: null

      })

      return

    }



    try {

      const db = wx.cloud.database()



      const res = await db.collection('organFunctionRecords')

        .where({

          openid: openid,

          profileId: currentProfileId

        })

        .orderBy('date', 'desc')

        .limit(1)

        .get()



      if (res.data.length > 0) {

        const latestRecord = res.data[0]

        // 检查是否有异常指标

        const abnormalItems = []



        // 检查肝功能异常

        if (latestRecord.alt && parseFloat(latestRecord.alt) > 40) abnormalItems.push('ALT偏高')

        if (latestRecord.ast && parseFloat(latestRecord.ast) > 40) abnormalItems.push('AST偏高')

        if (latestRecord.bilirubin && parseFloat(latestRecord.bilirubin) > 17) abnormalItems.push('胆红素偏高')

        if (latestRecord.albumin && parseFloat(latestRecord.albumin) < 35) abnormalItems.push('白蛋白偏低')



        // 检查肾功能异常

        if (latestRecord.creatinine && parseFloat(latestRecord.creatinine) > 104) abnormalItems.push('肌酐偏高')

        if (latestRecord.urea && parseFloat(latestRecord.urea) > 8.2) abnormalItems.push('尿素偏高')

        if (latestRecord.gfr && parseFloat(latestRecord.gfr) < 90) abnormalItems.push('GFR偏低')



        const hasAbnormal = abnormalItems.length > 0

        const abnormalInfo = abnormalItems.join('、')



        console.log('🎨 最近一次肝肾功能数据处理完成:', {

          date: latestRecord.date,

          hasAbnormal: hasAbnormal,

          abnormalInfo: abnormalInfo

        })



        this.setData({

          todayOrganData: {

            count: 1,

            latestRecord: latestRecord,

            hasAbnormal: hasAbnormal,

            abnormalInfo: abnormalInfo

          }

        })

      } else {



        this.setData({

          todayOrganData: null

        })

      }

    } catch (err) {



      this.setData({

        todayOrganData: null

      })

    }

  },



  // 等待云数据库初始化

  async waitForCloudInit() {

    // 这里可以根据实际情况实现等待云数据库初始化的逻辑

    // 例如，检查云函数是否已经部署完成，或者检查网络连接等

    // 这里只是一个示例，实际实现需要根据具体情况来调整

    await new Promise(resolve => setTimeout(resolve, 1000));

  },



  // 处理EBV检测数据，添加指标名称

  async processEbvDataWithNames(rawEbvData) {

    const processedData = [];



    // 获取自定义指标名称和当前选中的指标配置

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    let customIndicatorNames = {};

    let selectedIndicators = {};



    if (openid && currentProfileId) {

      try {

        // 获取所有EBV自定义指标名称（不过滤，让数据正常显示）

        const res = await db.collection('ebvIndicatorSettings')

          .where({

            openid: openid,

            profileId: currentProfileId

          })

          .get();



        res.data.forEach(item => {

          customIndicatorNames[item.indicatorId] = item.name;

        });

      } catch (err) {



      }

    }



    // EBV基础指标名称映射 - 只保留必选项

    const ebvIndicatorNames = {

      'ebvDna': 'EBV-DNA'

    };



    // 转换数据格式，添加名称（只处理当前选中的指标）

    Object.keys(rawEbvData).forEach(indicatorId => {

      if (indicatorId === '_id' || indicatorId === 'openid' || indicatorId === 'profileId' || indicatorId === 'date' || indicatorId === 'time' || indicatorId === 'createTime' || indicatorId === 'updateTime' || indicatorId === 'hospital' || indicatorId === 'notes' || indicatorId === 'id' || indicatorId === 'type' || indicatorId === 'testType' || indicatorId === 'sampleType' || indicatorId === '_openid' || indicatorId === 'referenceValue') return;



      const value = rawEbvData[indicatorId];

      if (!value) return;



      // 检查指标是否在当前配置中选中

      const isPresetIndicator = ebvIndicatorNames.hasOwnProperty(indicatorId);

      const isSelectedInConfig = selectedIndicators[indicatorId] === true;



      let name = indicatorId;



      // 获取指标名称

      if (ebvIndicatorNames[indicatorId]) {

        name = ebvIndicatorNames[indicatorId];

      } else if (customIndicatorNames[indicatorId]) {

        name = customIndicatorNames[indicatorId];

      } else if (indicatorId.startsWith('custom_')) {

        name = indicatorId.replace('custom_', '自定义指标-');

      }



      processedData.push({

        id: indicatorId,

        name: name,

        value: value

      });

    });



    return processedData;

  },



  // 处理CMV检测数据，添加指标名称

  async processCmvDataWithNames(rawCmvData) {

    const processedData = [];



    // 获取自定义指标名称

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    let customIndicatorNames = {};

    if (openid && currentProfileId) {

      try {

        const res = await db.collection('cmvIndicatorSettings')

          .where({

            openid: openid,

            profileId: currentProfileId

          })

          .get();



        res.data.forEach(item => {

          customIndicatorNames[item.indicatorId] = item.name;

        });

      } catch (err) {



      }

    }



    // CMV基础指标名称映射

    const cmvIndicatorNames = {

      'hcmvDna': 'HCMV-DNA'



    };



    // 转换数据格式，添加名称

    Object.keys(rawCmvData).forEach(indicatorId => {

      if (indicatorId === '_id' || indicatorId === 'openid' || indicatorId === 'profileId' || indicatorId === 'date' || indicatorId === 'time' || indicatorId === 'createTime' || indicatorId === 'updateTime' || indicatorId === 'hospital' || indicatorId === 'notes' || indicatorId === 'id' || indicatorId === 'type' || indicatorId === 'testType' || indicatorId === 'sampleType' || indicatorId === '_openid' || indicatorId === 'referenceValue') return;



      const value = rawCmvData[indicatorId];

      if (!value) return;



      let name = indicatorId;



      // 获取指标名称

      if (cmvIndicatorNames[indicatorId]) {

        name = cmvIndicatorNames[indicatorId];

      } else if (customIndicatorNames[indicatorId]) {

        name = customIndicatorNames[indicatorId];

      } else if (indicatorId.startsWith('custom_')) {

        name = customIndicatorNames[indicatorId] || indicatorId.replace('custom_', '自定义指标-');

      }



      processedData.push({

        id: indicatorId,

        name: name,

        value: value

      });

    });



    // 检查是否有异常值

    let hasAbnormal = false;

    const hcmvDnaValue = rawCmvData.hcmvDna || rawCmvData.HCMV;

    if (hcmvDnaValue && hcmvDnaValue !== '阴性' && hcmvDnaValue !== '未检出') {

      hasAbnormal = true;

    }



    // 给数组添加hasAbnormal属性

    processedData.hasAbnormal = hasAbnormal;



    return processedData;

  },



  // 处理LDH检测数据，添加指标名称

  async processLdhDataWithNames(rawLdhData) {

    const processedData = [];



    // 获取自定义指标名称

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    let customIndicatorNames = {};

    if (openid && currentProfileId) {

      try {

        const res = await db.collection('ldhIndicatorSettings')

          .where({

            openid: openid,

            profileId: currentProfileId

          })

          .get();



        res.data.forEach(item => {

          customIndicatorNames[item.indicatorId] = item.fullName || item.name;

        });

      } catch (err) {



      }

    }



    // 乳酸脱氢酶基础指标名称映射

    const ldhIndicatorNames = {

      'ldh': '乳酸脱氢酶',

      'ldhRatio': '乳酸脱氢酶比值',

      'aHbdh': 'α-HBDH'

    };



    // 转换数据格式，添加名称

    Object.keys(rawLdhData).forEach(indicatorId => {

      if (indicatorId === '_id' || indicatorId === 'openid' || indicatorId === 'profileId' || indicatorId === 'date' || indicatorId === 'time' || indicatorId === 'createTime' || indicatorId === 'updateTime' || indicatorId === 'hospital' || indicatorId === 'notes' || indicatorId === 'id' || indicatorId === 'type' || indicatorId === 'testType' || indicatorId === 'sampleType' || indicatorId === '_openid' || indicatorId === 'referenceValue' || indicatorId === 'customValues') return;

      console.log(rawLdhData, 'rawLdhData')

      const value = rawLdhData[indicatorId];

      if (!value) return;



      let name = indicatorId;



      // 获取指标名称

      if (ldhIndicatorNames[indicatorId]) {

        name = ldhIndicatorNames[indicatorId];

      } else if (customIndicatorNames[indicatorId]) {

        name = customIndicatorNames[indicatorId];

      } else if (indicatorId.startsWith('custom_')) {

        name = customIndicatorNames[indicatorId] || indicatorId.replace('custom_', '自定义指标-');

      }



      processedData.push({

        id: indicatorId,

        name: name,

        value: value

      });

    });





    // 检查是否有异常值

    let hasAbnormal = false;

    const ldhValue = rawLdhData.ldh || rawLdhData.LDH;

    if (ldhValue) {

      const numValue = parseFloat(ldhValue);

      if (!isNaN(numValue) && (numValue < 100 || numValue > 240)) {

        hasAbnormal = true;

      }

    }



    // 给数组添加hasAbnormal属性

    processedData.hasAbnormal = hasAbnormal;



    return processedData;

  },



  // 处理肝功能数据，添加指标名称

  async processLiverDataWithNames(rawLiverData) {

    const processedData = [];



    // 获取自定义指标名称

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    let customIndicatorNames = {};

    if (openid && currentProfileId) {

      try {

        const res = await db.collection('liverFunctionSettings')

          .where({

            openid: openid,

            profileId: currentProfileId

          })

          .get();



        res.data.forEach(item => {

          customIndicatorNames[item.indicatorId] = item.name;

        });

      } catch (err) {



      }

    }



    // 肝功能基础指标名称映射

    const liverIndicatorNames = {

      'alt': 'ALT',

      'ast': 'AST',

      'tbil': '总胆红素',

      'dbil': '直接胆红素',

      'alb': '白蛋白',

      'tp': '总蛋白',

      'alp': '碱性磷酸酶',

      'ggt': 'γ-谷氨酰基转移酶'

    };



    // 转换数据格式，添加名称

    Object.keys(rawLiverData).forEach(indicatorId => {

      if (indicatorId === '_id' || indicatorId === 'openid' || indicatorId === 'profileId' || indicatorId === 'date' || indicatorId === 'time' || indicatorId === 'createTime' || indicatorId === 'updateTime' || indicatorId === 'hospital' || indicatorId === 'notes' || indicatorId === 'id' || indicatorId === 'type' || indicatorId === 'testType' || indicatorId === 'sampleType' || indicatorId === '_openid' || indicatorId === 'referenceValue') return;



      const value = rawLiverData[indicatorId];

      if (!value) return;



      let name = indicatorId;



      // 获取指标名称

      if (liverIndicatorNames[indicatorId]) {

        name = liverIndicatorNames[indicatorId];

      } else if (customIndicatorNames[indicatorId]) {

        name = customIndicatorNames[indicatorId];

      } else if (indicatorId.startsWith('custom_')) {

        name = indicatorId.replace('custom_', '自定义指标-');

      }



      processedData.push({

        id: indicatorId,

        name: name,

        value: value

      });

    });



    return processedData;

  },



  // 处理肾功能数据，添加指标名称

  async processKidneyDataWithNames(rawKidneyData) {

    const processedData = [];



    // 获取自定义指标名称

    const app = getApp();

    const openid = app.getOpenIdIfLoggedIn();

    const currentProfileId = app.getCurrentProfileId();



    let customIndicatorNames = {};

    if (openid && currentProfileId) {

      try {

        const res = await db.collection('kidneyFunctionSettings')

          .where({

            openid: openid,

            profileId: currentProfileId

          })

          .get();



        res.data.forEach(item => {

          customIndicatorNames[item.indicatorId] = item.name;

        });

      } catch (err) {



      }

    }



    // 肾功能基础指标名称映射

    const kidneyIndicatorNames = {

      'cr': '肌酐',

      'bun': '尿素氮',

      'ua': '尿酸',

      'gfr': 'eGFR',

      'cysc': '胱氨酸C'

    };



    // 转换数据格式，添加名称

    Object.keys(rawKidneyData).forEach(indicatorId => {

      if (indicatorId === '_id' || indicatorId === 'openid' || indicatorId === 'profileId' || indicatorId === 'date' || indicatorId === 'time' || indicatorId === 'createTime' || indicatorId === 'updateTime' || indicatorId === 'hospital' || indicatorId === 'notes' || indicatorId === 'id' || indicatorId === 'type' || indicatorId === 'testType' || indicatorId === 'sampleType' || indicatorId === '_openid' || indicatorId === 'referenceValue') return;



      const value = rawKidneyData[indicatorId];

      if (!value) return;



      let name = indicatorId;



      // 获取指标名称

      if (kidneyIndicatorNames[indicatorId]) {

        name = kidneyIndicatorNames[indicatorId];

      } else if (customIndicatorNames[indicatorId]) {

        name = customIndicatorNames[indicatorId];

      } else if (indicatorId.startsWith('custom_')) {

        name = indicatorId.replace('custom_', '自定义指标-');

      }



      processedData.push({

        id: indicatorId,

        name: name,

        value: value

      });

    });



    return processedData;

  },



  // ==================== 🚀 新日历组件系统 ====================



  // 初始化新日历组件

  initNewCalendar() {

    const today = new Date()

    const todayStr = this.formatDate(today)

    const dayNames = ['日', '一', '二', '三', '四', '五', '六']



    this.setData({

      selectedDate: todayStr,

      selectedDateText: this.formatDateText(today),

      selectedDateShort: this.formatDateShort(todayStr),

      selectedDayName: dayNames[today.getDay()],

      selectedDayNumber: today.getDate(),

      calendarExpanded: false,

      currentYear: today.getFullYear(),

      currentMonth: today.getMonth() + 1

    })



    // 生成周视图和月视图数据

    this.generateWeekView()

    this.generateMonthView()



    // 数据加载会在登录检查完成后进行

  },



  // 生成周视图数据（可指定目标日期）

  generateWeekView(targetDate = null) {

    // 如果没有指定目标日期，使用今天
    const target = targetDate ? new Date(targetDate) : new Date()

    const weekDays = []



    // 生成包含目标日期的完整一周（以周一为起始）
    const dayOfWeek = target.getDay() // 0=周日, 1=周一, ..., 6=周六
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 转换为周一起始的偏移量
    const weekStart = new Date(target)
    weekStart.setDate(target.getDate() - mondayOffset)



    for (let i = 0; i < 7; i++) {

      const date = new Date(weekStart)

      date.setDate(weekStart.getDate() + i)



      const dateStr = this.formatDate(date)

      const dayNames = ['日', '一', '二', '三', '四', '五', '六']



      weekDays.push({

        date: dateStr,

        day: date.getDate(),

        dayName: dayNames[date.getDay()],

        isSelected: dateStr === this.data.selectedDate

      })

    }



    this.setData({ weekDays })

  },



  // 生成月视图数据

  generateMonthView() {

    const { currentYear, currentMonth } = this.data

    const monthDays = []



    // 获取当月第一天和最后一天

    const firstDay = new Date(currentYear, currentMonth - 1, 1)

    const lastDay = new Date(currentYear, currentMonth, 0)

    const firstDayOfWeek = firstDay.getDay()

    const lastDate = lastDay.getDate()



    // 填充上月的空白日期

    for (let i = 0; i < firstDayOfWeek; i++) {

      monthDays.push({

        date: '',

        day: '',

        isEmpty: true,

        isSelected: false

      })

    }



    // 填充当月日期

    for (let day = 1; day <= lastDate; day++) {

      const date = new Date(currentYear, currentMonth - 1, day)

      const dateStr = this.formatDate(date)



      monthDays.push({

        date: dateStr,

        day: day,

        isEmpty: false,

        isSelected: dateStr === this.data.selectedDate

      })

    }



    this.setData({ monthDays })

  },



  // 切换日历展开/收起

  toggleCalendarExpanded() {

    const expanded = !this.data.calendarExpanded

    this.setData({ calendarExpanded: expanded })



    if (expanded) {

      // 展开时重新生成月视图

      this.generateMonthView()

    } else {

      // 收起时检查选中日期是否在当前周视图范围内
      this.adjustWeekViewToSelectedDate()

    }

  },



  // 调整周视图以显示选中的日期
  adjustWeekViewToSelectedDate() {
    const selectedDate = this.data.selectedDate
    if (!selectedDate) return

    // 检查选中日期是否在当前周视图范围内
    const weekDays = this.data.weekDays || []
    const isSelectedInCurrentWeek = weekDays.some(day => day.date === selectedDate)

    // 如果选中日期不在当前周视图中，重新生成以选中日期为中心的周视图
    if (!isSelectedInCurrentWeek) {
      this.generateWeekView(selectedDate)
    }
  },



  // 选择日期

  selectDate(e) {

    const { date } = e.currentTarget.dataset

    if (!date) return



    // 添加轻微震动反馈

    try {

      wx.vibrateShort({

        type: 'light'

      })

    } catch (error) {

      // 静默处理震动API异常

      console.log('震动API调用失败:', error)

    }



    const dateObj = new Date(date)

    const dateText = this.formatDateText(dateObj)

    const dayNames = ['日', '一', '二', '三', '四', '五', '六']



    this.setData({

      selectedDate: date,

      selectedDateText: dateText,

      selectedDateShort: this.formatDateShort(date),

      selectedDayName: dayNames[dateObj.getDay()],

      selectedDayNumber: dateObj.getDate(),

      dateChanged: true // 🎬 触发动画

    })

    // 🎬 动画结束后重置标志
    setTimeout(() => {
      this.setData({ dateChanged: false })
    }, 600)



    // 更新周视图和月视图的选中状态

    this.updateDateSelection()

    // 🔥 加载选中日期的最新数据（用户切换日期时不显示骨架屏）
    this.loadDataForDate(date, false)



    // 如果日历收起状态下选择日期，确保周视图显示选中日期
    if (!this.data.calendarExpanded) {
      this.adjustWeekViewToSelectedDate()
    }

  },



  // 更新日期选择状态

  updateDateSelection() {

    const { selectedDate, weekDays, monthDays } = this.data



    // 更新周视图

    const updatedWeekDays = weekDays.map(day => ({

      ...day,

      isSelected: day.date === selectedDate

    }))



    // 更新月视图

    const updatedMonthDays = monthDays.map(day => ({

      ...day,

      isSelected: day.date === selectedDate

    }))



    this.setData({

      weekDays: updatedWeekDays,

      monthDays: updatedMonthDays

    })

  },



  // 上一个月

  prevMonth() {

    let { currentYear, currentMonth } = this.data

    if (currentMonth === 1) {

      currentYear--

      currentMonth = 12

    } else {

      currentMonth--

    }



    this.setData({ currentYear, currentMonth })

    this.generateMonthView()

  },



  // 下一个月

  nextMonth() {

    let { currentYear, currentMonth } = this.data

    if (currentMonth === 12) {

      currentYear++

      currentMonth = 1

    } else {

      currentMonth++

    }



    this.setData({ currentYear, currentMonth })

    this.generateMonthView()

  },



  // 格式化日期显示文本

  formatDateText(date) {

    const today = new Date()

    const yesterday = new Date(today)

    yesterday.setDate(yesterday.getDate() - 1)



    if (this.isSameDate(date, today)) {

      return '今天'

    } else if (this.isSameDate(date, yesterday)) {

      return '昨天'

    } else {

      const month = date.getMonth() + 1

      const day = date.getDate()

      return `${month}月${day}日`

    }

  },



  // 判断是否是同一天

  isSameDate(date1, date2) {

    return date1.getFullYear() === date2.getFullYear() &&

      date1.getMonth() === date2.getMonth() &&

      date1.getDate() === date2.getDate()

  },



  // 显示日期选择器

  showDatePicker() {

    wx.showModal({

      title: '选择日期',

      content: '请通过快捷按钮或日期选择器选择日期',

      showCancel: false,

      confirmText: '知道了'

    })

  },



  // 选择快捷日期

  selectQuickDate(e) {

    const selectedDate = e.currentTarget.dataset.date

    const date = new Date(selectedDate)



    this.setData({

      selectedDate: selectedDate,

      selectedDateText: this.formatDateText(date)

    })



    // 加载选定日期的数据（快捷日期切换时不显示骨架屏）

    this.loadDataForDate(selectedDate, false)

  },



  // 根据日期加载数据

  async loadDataForDate(dateStr, showSkeleton = true) {

    try {

      // 🔥 根据参数决定是否显示骨架图
      if (showSkeleton) {
        this.setData({
          isPageLoading: true
        })
      }

      // 🔧 强制清除旧数据，防止缓存问题
      this.setData({
        selectedDateData: {
          bloodData: null,
          ebvData: null,
          cmvData: null,
          liverData: null,
          kidneyData: null,
          ldhData: null,
          medicationData: null,
          clinicData: null,
          urineData: null,
          stoolData: null,
          expenseData: null,
          checkReportData: null
        }
      })



      // 检查基础条件

      const app = getApp()

      if (!app || !app.globalData) {

        console.error('应用数据未初始化')

        wx.showToast({

          title: '应用未初始化',

          icon: 'none'

        })

        this.setData({ isPageLoading: false }) // 🔥 隐藏骨架图

        return

      }



      if (!app.globalData.openid) {

        console.error('用户未登录')

        wx.showToast({

          title: '请先登录',

          icon: 'none'

        })

        this.setData({ isPageLoading: false }) // 🔥 隐藏骨架图

        return

      }



      console.log('=== 档案检查 ===')

      console.log('当前档案信息:', app.globalData.currentProfile)

      console.log('档案ID:', app.globalData.currentProfile?.profileId)



      // 如果档案信息还未初始化，等待一段时间后重试

      if (!app.globalData.currentProfile?.profileId) {

        console.log('档案信息未就绪，等待初始化...')

        // 等待档案信息初始化完成，最多等待2秒

        let retryCount = 0

        const maxRetries = 4



        while (retryCount < maxRetries && !app.globalData.profileInitialized) {

          await new Promise(resolve => setTimeout(resolve, 500))

          retryCount++

          console.log(`⏳ [loadDataForDate] 等待档案初始化... (${retryCount}/${maxRetries})`)
          
          // 如果初始化完成，再检查一次 profileId
          if (app.globalData.profileInitialized && app.globalData.currentProfile?.profileId) {
            console.log('✅ [loadDataForDate] 档案初始化完成，profileId:', app.globalData.currentProfile.profileId);
            break;
          }

        }



        // 如果还是没有档案信息，显示空数据（不显示弹窗）

        if (!app.globalData.currentProfile?.profileId) {

          console.log('档案信息初始化超时，显示空数据')

          this.setData({

            selectedDateData: {

              bloodData: null,

              ebvData: null,

              cmvData: null,

              liverData: null,

              kidneyData: null,

              ldhData: null,

              medicationData: null,

              clinicData: null,

              urineData: null,

              stoolData: null,

              expenseData: null

            },

            isPageLoading: false // 🔥 隐藏骨架图

          })

          return

        }



        console.log('档案信息初始化成功:', app.globalData.currentProfile.name)

      }






      // 并行加载所有数据

      const [

        bloodData,

        ebvData,

        cmvData,

        liverData,

        kidneyData,

        ldhData,

        medicationData,

        clinicData,

        urineData,

        stoolData,

        expenseData,

        checkReportData,

        bloodSugarData

      ] = await Promise.all([

        this.getBloodDataForDate(dateStr),

        this.getEbvDataForDate(dateStr),

        this.getCmvDataForDate(dateStr),

        this.getLiverDataForDate(dateStr),

        this.getKidneyDataForDate(dateStr),

        this.getLdhDataForDate(dateStr),

        this.getMedicationDataForDate(dateStr),

        this.getClinicDataForDate(dateStr),

        this.getUrineDataForDate(dateStr),

        this.getStoolDataForDate(dateStr),

        this.getExpenseDataForDate(dateStr),

        this.getCheckReportDataForDate(dateStr),

        this.getBloodSugarDataForDate(dateStr)

      ])






      console.log('巨细胞病毒数据:', cmvData)

      console.log('🔥 肝功能数据:', liverData)

      console.log('🔥 肾功能数据:', kidneyData)

      console.log('LDH数据:', ldhData)

      console.log('💊 用药记录数据 for', dateStr, ':', medicationData)

      console.log('🏥 门诊记录数据:', clinicData)

      console.log('🚽 排便记录数据:', stoolData)

      console.log('💧 尿量记录数据:', urineData)

      console.log('🩸 血糖数据:', bloodSugarData)



      const selectedDateData = {

        bloodData,

        ebvData,

        cmvData,

        liverData,

        kidneyData,

        ldhData,

        medicationData,

        clinicData,

        urineData,

        stoolData,

        expenseData,

        checkReportData,

        bloodSugarData

      }



      console.log('📋 构建 selectedDateData for', dateStr, '- medicationData:', medicationData)

      console.log('🔍 详细分析 medicationData for', dateStr, ':')
      if (medicationData) {
        console.log('  - 总药品数:', medicationData.totalMedicines)
        console.log('  - 已服用:', medicationData.takenMedicines)
        console.log('  - 总时段数:', medicationData.totalTimeSlots)
        console.log('  - 完成时段:', medicationData.completedTimeSlots)
        console.log('  - 进度:', medicationData.progress, '%')
        console.log('  - 药品列表:', medicationData.medicines?.map(m => ({ name: m.name, taken: m.taken, timeSlotStatus: m.timeSlotStatus })))
      } else {
        console.log('  - 无用药数据')
      }






      this.setData({

        selectedDateData,

        ...(showSkeleton ? { isPageLoading: false } : {}) // 🔥 只在显示过骨架图时才隐藏

      })



      console.log('数据设置完成')



    } catch (error) {

      console.error('加载日期数据失败:', error)

      wx.showToast({

        title: `数据加载失败: ${error.message}`,

        icon: 'none'

      })



      // 即使出错也要设置空数据，避免界面卡住

      this.setData({

        selectedDateData: {

          bloodData: null,

          ebvData: null,

          cmvData: null,

          liverData: null,

          kidneyData: null,

          ldhData: null,

          medicationData: null,

          clinicData: null,

          urineData: null,

          stoolData: null

        },

        ...(showSkeleton ? { isPageLoading: false } : {}) // 🔥 只在显示过骨架图时才隐藏

      })

    }

  },



  // 获取指定日期的血常规数据

  async getBloodDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()




      console.log('查询日期:', dateStr)

      console.log('openid:', app.globalData?.openid)

      console.log('profileId:', app.globalData?.currentProfile?.profileId)



      if (!app.globalData.currentProfile?.profileId) {


        return null

      }



      const queryCondition = {

        openid: app.globalData.openid,

        profileId: app.globalData.currentProfile.profileId,

        date: dateStr

      }

      console.log('查询条件:', queryCondition)



      const res = await db.collection('bloodTests')

        .where(queryCondition)

        .limit(1)

        .get()



      console.log('血常规查询结果:', res)

      console.log('数据数量:', res.data.length)



      if (res.data.length > 0) {

        const bloodData = res.data[0]


        return bloodData

      } else {


        return null

      }

    } catch (error) {

      console.error('获取血常规数据失败:', error)

      return null

    }

  },

  // 获取指定日期的血糖数据
  async getBloodSugarDataForDate(dateStr) {
    try {
      const app = getApp()
      const db = wx.cloud.database()

      console.log('🩸 查询血糖数据 - 日期:', dateStr)
      console.log('🩸 openid:', app.globalData?.openid)
      console.log('🩸 profileId:', app.globalData?.currentProfile?.profileId)

      if (!app.globalData.currentProfile?.profileId) {
        console.log('🩸 profileId不存在，返回null')
        return null
      }

      const queryCondition = {
        openid: app.globalData.openid,
        profileId: app.globalData.currentProfile.profileId,
        date: dateStr
      }
      console.log('🩸 查询条件:', queryCondition)

      const res = await db.collection('bloodSugars')
        .where(queryCondition)
        .limit(1)
        .get()

      console.log('🩸 血糖查询结果:', res)
      console.log('🩸 数据数量:', res.data.length)

      if (res.data.length > 0) {
        const bloodSugarData = res.data[0]
        console.log('🩸 血糖数据内容:', bloodSugarData)
        return bloodSugarData
      } else {
        console.log('🩸 未找到血糖数据')
        return null
      }
    } catch (error) {
      console.error('❌ 获取血糖数据失败:', error)
      return null
    }
  },

  // 获取指定日期的EB病毒数据

  async getEbvDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('ebvRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .limit(1)

        .get()



      return res.data.length > 0 ? res.data[0] : null

    } catch (error) {

      console.error('获取EB病毒数据失败:', error)

      return null

    }

  },



  // 获取指定日期的用药数据

  async getMedicationDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      console.log('🔍 查询用药记录 - 参数:', {
        openid: app.globalData.openid,
        profileId: app.globalData.currentProfile.profileId,
        date: dateStr
      })

      const res = await db.collection('medications')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .get()

      console.log('📊 查询用药记录结果 for', dateStr, '- 找到', res.data.length, '条记录')
      res.data.forEach((record, index) => {
        console.log(`  记录${index + 1}:`, {
          _id: record._id,
          date: record.date,
          medicinesCount: record.medicines?.length || 0,
          medicines: record.medicines?.map(m => ({
            name: m.name,
            taken: m.taken,
            timeSlotStatus: m.timeSlotStatus
          }))
        })
      })






      if (res.data.length === 0) {

        console.log('🚫 没有找到用药记录 for date:', dateStr)

        return null

      }



      // 获取当天的药物记录（medicines数组在第一个记录中）

      const dayRecord = res.data[0]

      const medicines = dayRecord.medicines || []

      const totalMedicines = medicines.length

      // 🔧 修复：按时间段计算进度，而不是按药品数量
      let totalTimeSlots = 0
      let completedTimeSlots = 0

      medicines.forEach(medicine => {
        const timeSlots = medicine.timesPerDay ? medicine.timesPerDay.length : 1
        totalTimeSlots += timeSlots

        if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {
          // 有分时段状态时，计算实际完成的时段数
          const completedSlotsCount = medicine.timesPerDay.filter(slot =>
            medicine.timeSlotStatus[slot] === true
          ).length
          completedTimeSlots += completedSlotsCount
        } else if (medicine.taken) {
          // 没有分时段状态但标记为已服用时，算作全部完成
          completedTimeSlots += timeSlots
        }
      })

      // 计算已服用药品数量（至少服用了一个时段的药品）
      const takenMedicines = medicines.filter(medicine => {
        if (medicine.timesPerDay && medicine.timesPerDay.length > 0 && medicine.timeSlotStatus) {
          return medicine.timesPerDay.some(slot =>
            medicine.timeSlotStatus[slot] === true
          )
        } else {
          return medicine.taken === true
        }
      }).length

      const progress = totalTimeSlots > 0 ? Math.round((completedTimeSlots / totalTimeSlots) * 100) : 0



      const result = {

        date: dateStr,

        totalMedicines,

        takenMedicines,

        totalTimeSlots,

        completedTimeSlots,

        progress,

        medicines

      }



      console.log('✅ 找到用药记录 for date:', dateStr, 'result:', result)






      return result

    } catch (error) {


      return null

    }

  },



  // 获取指定日期的巨细胞病毒数据

  async getCmvDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('cmvRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .limit(1)

        .get()



      return res.data.length > 0 ? res.data[0] : null

    } catch (error) {


      return null

    }

  },



  // 进度条已移除：保留位置以便将来扩展（如迷你趋势）



  // 获取指定日期的肝功能数据

  async getLiverDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      console.log('=== 肝功能数据查询开始 ===')

      console.log('查询日期:', dateStr)



      if (!app.globalData.currentProfile?.profileId) return null



      // 🔧 修复：先从肝功能独立集合查询

      let res = await db.collection('liverFunctionTests')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .limit(1)

        .get()



      console.log('独立肝功能集合查询结果:', res)



      // 如果独立集合没有数据，从器官功能统一集合查找

      if (res.data.length === 0) {

        console.log('独立集合无数据，查询器官功能统一集合...')

        res = await db.collection('organFunctionRecords')

          .where({

            openid: app.globalData.openid,

            profileId: app.globalData.currentProfile.profileId,

            date: dateStr,

            testType: db.RegExp({

              regexp: '肝',

              options: 'i'

            })

          })

          .limit(1)

          .get()



        console.log('器官功能统一集合查询结果:', res)

      }



      console.log('最终肝功能查询结果:', res)

      return res.data.length > 0 ? res.data[0] : null

    } catch (error) {

      console.error('获取肝功能数据失败:', error)

      return null

    }

  },



  // 获取指定日期的肾功能数据

  async getKidneyDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      console.log('=== 肾功能数据查询开始 ===')

      console.log('查询日期:', dateStr)



      if (!app.globalData.currentProfile?.profileId) return null



      // 🔧 修复：先从肾功能独立集合查询

      let res = await db.collection('kidneyFunctionTests')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .limit(1)

        .get()



      console.log('独立肾功能集合查询结果:', res)



      // 如果独立集合没有数据，从器官功能统一集合查找

      if (res.data.length === 0) {

        console.log('独立集合无数据，查询器官功能统一集合...')

        res = await db.collection('organFunctionRecords')

          .where({

            openid: app.globalData.openid,

            profileId: app.globalData.currentProfile.profileId,

            date: dateStr,

            testType: db.RegExp({

              regexp: '肾',

              options: 'i'

            })

          })

          .limit(1)

          .get()



        console.log('器官功能统一集合查询结果:', res)

      }



      console.log('最终肾功能查询结果:', res)

      return res.data.length > 0 ? res.data[0] : null

    } catch (error) {

      console.error('获取肾功能数据失败:', error)

      return null

    }

  },



  // 获取指定日期的LDH数据

  async getLdhDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('ldhRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .limit(1)

        .get()



      return res.data.length > 0 ? res.data[0] : null

    } catch (error) {

      console.error('获取LDH数据失败:', error)

      return null

    }

  },



  // 获取指定日期的门诊数据

  async getClinicDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('clinicRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .limit(1)

        .get()



      console.log(`🏥 门诊记录数据 ${dateStr}:`, res.data)



      if (res.data.length === 0) {

        console.log(`❌ 门诊记录 ${dateStr}: 无数据`)

        return null

      }



      const clinicRecord = res.data[0]

      console.log(`✅ 门诊记录 ${dateStr} 处理结果:`, clinicRecord)



      return clinicRecord

    } catch (error) {

      console.error('获取门诊数据失败:', error)

      return null

    }

  },



  // 获取指定日期的检查报告数据

  async getCheckReportDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      // 查询当天所有的检查报告记录

      const res = await db.collection('checkReports')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .orderBy('createTime', 'desc')

        .get()



      console.log(`📋 检查报告数据 ${dateStr}:`, res.data)



      if (res.data.length === 0) {

        console.log(`❌ 检查报告 ${dateStr}: 无数据`)

        return null

      }



      // 获取第一条记录作为显示内容

      const checkReportRecord = res.data[0]



      // 添加总记录数

      checkReportRecord.totalCount = res.data.length



      // 处理详细结果文本截断

      if (checkReportRecord.detailedResults && typeof checkReportRecord.detailedResults === 'string') {

        const maxLength = 12

        if (checkReportRecord.detailedResults.length > maxLength) {

          checkReportRecord.detailedResultsDisplay = checkReportRecord.detailedResults.slice(0, maxLength) + '...'

        } else {

          checkReportRecord.detailedResultsDisplay = checkReportRecord.detailedResults

        }

      } else {

        checkReportRecord.detailedResultsDisplay = '无详细结果'

      }



      // 格式化记录日期为 "x月x日" 格式

      if (checkReportRecord.recordDate) {

        checkReportRecord.recordDateShort = this.formatDateShort(checkReportRecord.recordDate)

      }



      console.log(`✅ 检查报告 ${dateStr} 处理结果:`, checkReportRecord, `共 ${checkReportRecord.totalCount} 条`)



      return checkReportRecord

    } catch (error) {

      console.error('获取检查报告数据失败:', error)

      return null

    }

  },



  // 获取指定日期的尿量数据

  async getUrineDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('urineRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .get()



      if (res.data.length === 0) return null



      const records = res.data

      const totalVolume = records.reduce((sum, record) => sum + (record.volume || 0), 0)



      return {

        date: dateStr,

        count: records.length,

        times: records.length, // 排尿次数，用于页面显示

        totalVolume,

        total: totalVolume, // 总尿量，用于页面显示

        records

      }

    } catch (error) {

      console.error('获取尿量数据失败:', error)

      return null

    }

  },



  // 获取指定日期的排便数据

  async getStoolDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('stoolRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .get()



      if (res.data.length === 0) return null



      const records = res.data

      const hasAbnormal = records.some(record => record.hasBlood || record.hasMucus)



      return {

        date: dateStr,

        count: records.length,

        hasAbnormal,

        records

      }

    } catch (error) {

      console.error('获取排便数据失败:', error)

      return null

    }

  },



  // 获取费用记录数据

  async getExpenseDataForDate(dateStr) {

    try {

      const app = getApp()

      const db = wx.cloud.database()



      if (!app.globalData.currentProfile?.profileId) return null



      const res = await db.collection('expenseRecords')

        .where({

          openid: app.globalData.openid,

          profileId: app.globalData.currentProfile.profileId,

          date: dateStr

        })

        .get()



      if (res.data.length === 0) return null



      const records = res.data

      let total = 0

      records.forEach(record => {

        total += parseFloat(record.amount) || 0

      })



      return {

        date: dateStr,

        count: records.length,

        total: total.toFixed(2),

        records

      }

    } catch (error) {

      console.error('获取费用数据失败:', error)

      return null

    }

  },



  // ========== 功能项自定义编辑方法 ==========



  // 切换功能项编辑模式

  /**
   * 打开功能项编辑弹窗
   */
  async toggleFunctionEditMode() {

    if (this.data.functionEditMode) {

      this.setData({

        functionEditMode: false

      })

    } else {

      this.setData({

        functionEditMode: true

      })

      // 先加载配置，加载完成后再显示弹窗
      await this.loadFunctionCustomConfig()

      this.setData({
        showFunctionCustomPopup: true
      })

    }

  },



  /**
   * 加载主页面功能项配置
   * 1. 优先从数据库读取用户自定义配置
   * 2. 如果没有配置，使用默认配置（根据疾病类型）
   * 3. 只显示 visible=true 的功能项
   */
  async loadMainPageFunctionConfig() {

    try {
      console.log('📥 [主页面配置] 开始加载功能项配置')

      const app = getApp()

      const openid = app.globalData.openid

      const profileId = app.globalData.currentProfile?.profileId

      console.log('📥 [主页面配置] 用户信息:', {
        openid: openid ? '已获取' : '未获取',
        profileId: profileId || '无'
      })

      // 未登录用户使用默认配置

      if (!openid || !profileId) {
        console.log('⚠️ [主页面配置] 未登录，使用默认配置')

        const defaultFunctions = generateFunctionConfig(false, true)

        const visibleDefaults = defaultFunctions.filter(f => f.visible).sort((a, b) => a.order - b.order)

        this.setData({ mainPageFunctions: visibleDefaults })

        return

      }

      // 从数据库查询用户配置
      // 🔧 Android兼容性：对数据库查询添加超时保护
      console.log('🔍 [主页面配置] 查询数据库配置...')
      const db = wx.cloud.database()

      const res = await Promise.race([
        db.collection('functionCustomConfig').where({ openid, profileId }).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('数据库查询超时')), 2500))
      ])

      console.log('📦 [主页面配置] 数据库查询结果:', {
        找到配置: res.data.length > 0 ? '是' : '否',
        配置数量: res.data.length
      })

      let functionList = []

      if (res.data.length > 0) {

        // 使用数据库配置，补充必要字段

        const config = res.data[0]
        let needsUpdate = false; // 标记是否需要更新数据库

        // 🎨 图标映射表：根据功能 id 获取对应图标（图标只存在代码中，不存储到数据库）
        const ICON_MAP = {
          'medication': 'candy',
          'blood': 'blood-drop',
          'clinic': 'hospital',
          'checkReport': 'assignment',
          'liver': 'liver',
          'kidney': 'filter',
          'ldh': 'enzyme',
          'ebv': 'zoom-in',
          'cmv': 'search',
          'bloodSugar': 'glucose',
          'urine': 'fill-color-1',
          'stool': 'layers',
          'expense': 'wallet'
        };

        functionList = (config.functionList || []).map(item => {
          // 🔧 数据迁移：将旧的 LDH 名称更新为乳酸脱氢酶
          let displayName = item.name;
          if (item.id === 'ldh' && item.name === 'LDH') {
            displayName = '乳酸脱氢酶';
            needsUpdate = true;
          }

          // 🎨 从代码中根据 id 获取图标，不再使用数据库中的图标
          const iconName = ICON_MAP[item.id] || 'help-circle';

          return {
            id: item.id,
            name: displayName,
            icon: iconName, // 图标来自代码映射，不是数据库
            visible: item.visible !== undefined ? item.visible : true,
            order: item.order || 1,
            navigate: item.navigate,
            dataKey: `${item.id}Data`
          };
        })

        // 🔧 如果发现旧数据（名称需要更新），更新到数据库（不包含 icon 字段）
        if (needsUpdate) {
          db.collection('functionCustomConfig')
            .doc(config._id)
            .update({
              data: {
                functionList: functionList.map(item => ({
                  id: item.id,
                  name: item.name,
                  // 不再保存 icon 字段到数据库
                  visible: item.visible,
                  order: item.order,
                  navigate: item.navigate
                })),
                updateTime: db.serverDate()
              }
            })
            .then(() => {
              console.log('✅ 主页面配置已自动更新');
            })
            .catch(err => {
              console.error('⚠️ 自动更新主页面配置失败:', err);
            });
        }

      } else {

        // 首次使用，根据疾病类型生成默认配置
        console.log('📝 [主页面配置] 首次使用，生成默认配置')

        const currentProfile = app.globalData.currentProfile

        const isLymphomaPatient = currentProfile?.primaryDiseaseCategory === 'lymphoma'

        console.log('🏥 [主页面配置] 患者类型:', isLymphomaPatient ? '淋巴瘤患者' : '普通患者')

        functionList = generateFunctionConfig(isLymphomaPatient, true)

      }

      console.log('📋 [主页面配置] 完整功能列表:', functionList.map(item => ({
        id: item.id,
        name: item.name,
        visible: item.visible
      })))

      // 筛选可见的功能项并按顺序显示

      const visibleFunctions = functionList

        .filter(f => f.visible)

        .sort((a, b) => a.order - b.order)

      console.log('✅ [主页面配置] 可见功能项:', visibleFunctions.map(item => ({
        id: item.id,
        name: item.name
      })))

      this.setData({

        mainPageFunctions: visibleFunctions

      })

      console.log('✅ [主页面配置] 配置加载完成')

    } catch (error) {

      console.error('❌ [主页面配置] 加载配置失败:', error)

      // 🔧 Android兼容性：出错时使用默认配置，确保页面可用

      const defaultFunctions = generateFunctionConfig(false, true)

      const visibleDefaults = defaultFunctions.filter(f => f.visible).sort((a, b) => a.order - b.order)

      this.setData({ mainPageFunctions: visibleDefaults })

    }

  },






  // 根据功能ID获取数据键
  getDataKeyById(functionId) {
    return `${functionId}Data`;
  },

  // 动态调用导航方法

  handleFunctionTap(e) {

    const { navigate, functionId } = e.currentTarget.dataset



    console.log('功能项点击:', {

      navigate,

      functionId,

      dataset: e.currentTarget.dataset

    })



    // 🔥 所有功能项都直接跳转到记录页面，不显示弹窗
    if (navigate && typeof this[navigate] === 'function') {
      this[navigate]()
    } else {
      console.error('导航方法不存在:', navigate)
    }

  },



  // 显示功能项详情弹窗

  showFunctionDetailPopup() {

    const selectedDate = this.data.selectedDate

    const selectedDateData = this.data.selectedDateData



    // 构建详情弹窗数据，包含当前选中日期的所有数据

    const currentDateDetail = {

      date: selectedDate,

      keyDates: this.data.keyDates.filter(item => item.date === selectedDate),

      tasks: wx.getStorageSync(`tasks_${selectedDate}`) || [],

      bloodData: selectedDateData.bloodData,

      bloodSugarData: selectedDateData.bloodSugarData,

      medicationData: selectedDateData.medicationData,

      clinicData: selectedDateData.clinicData,

      urineData: selectedDateData.urineData,

      stoolData: selectedDateData.stoolData,

      checkReportData: selectedDateData.checkReportData,

      virusData: selectedDateData.ebvData || selectedDateData.cmvData || selectedDateData.ldhData,

      organData: selectedDateData.liverData || selectedDateData.kidneyData

    }



    this.setData({

      showDateDetailPopup: true,

      currentDateDetail: currentDateDetail

    })

  },



  /**
   * 加载编辑弹窗的功能项配置
   * 用于显示所有功能项（包括隐藏的），供用户编辑
   */
  async loadFunctionCustomConfig() {

    try {
      console.log('📝 [编辑弹窗] 开始加载配置')

      const app = getApp()

      const openid = app.globalData.openid

      const profileId = app.globalData.currentProfile?.profileId

      console.log('📝 [编辑弹窗] 用户信息:', {
        openid: openid ? '已获取' : '未获取',
        profileId: profileId || '无'
      })

      if (!openid || !profileId) {
        console.log('⚠️ [编辑弹窗] 未登录，使用默认配置')

        const defaultFunctions = generateFunctionConfig(false, false)

        this.setData({ customFunctionList: defaultFunctions })

        return

      }

      console.log('🔍 [编辑弹窗] 查询数据库配置...')
      const db = wx.cloud.database()

      const res = await db.collection('functionCustomConfig')

        .where({ openid, profileId })

        .get()

      console.log('📦 [编辑弹窗] 查询结果:', {
        找到配置: res.data.length > 0 ? '是' : '否',
        配置数量: res.data.length
      })

      let functionList = []

      if (res.data.length > 0) {

        // 使用数据库配置，确保字段完整
        let needsUpdate = false; // 标记是否需要更新数据库

        functionList = (res.data[0].functionList || []).map(item => {
          // 🔧 数据迁移：将旧的 LDH 名称更新为乳酸脱氢酶
          let displayName = item.name;
          if (item.id === 'ldh' && item.name === 'LDH') {
            displayName = '乳酸脱氢酶';
            needsUpdate = true; // 发现需要迁移的数据
          }

          return {
            id: item.id,
            name: displayName,
            icon: item.icon,
            visible: item.visible !== undefined ? item.visible : true,
            order: item.order || 1,
            navigate: item.navigate
          };
        })

        // 🔧 配置合并：检查是否有新增的功能项（如血糖）
        const currentProfile = app.globalData.currentProfile
        const isLymphomaPatient = currentProfile?.primaryDiseaseCategory === 'lymphoma'
        const latestConfig = generateFunctionConfig(isLymphomaPatient, false)

        // 获取用户配置中的所有ID
        const existingIds = new Set(functionList.map(item => item.id))

        // 查找新增的功能项
        const newItems = latestConfig.filter(item => !existingIds.has(item.id))

        if (newItems.length > 0) {
          console.log('🆕 发现新增功能项:', newItems.map(item => item.name))
          // 将新增项添加到列表末尾
          functionList = [...functionList, ...newItems]
          needsUpdate = true
        }

        // 🔧 如果发现旧数据或新增项，自动更新到数据库
        if (needsUpdate) {
          db.collection('functionCustomConfig')
            .doc(res.data[0]._id)
            .update({
              data: {
                functionList: functionList,
                updateTime: db.serverDate()
              }
            })
            .then(() => {
              console.log('✅ 配置已自动更新');
            })
            .catch(err => {
              console.error('⚠️ 自动更新配置失败:', err);
            });
        }

      } else {

        // 首次使用，根据疾病类型生成默认配置
        console.log('📝 [编辑弹窗] 首次使用，生成默认配置')

        const currentProfile = app.globalData.currentProfile

        const isLymphomaPatient = currentProfile?.primaryDiseaseCategory === 'lymphoma'

        console.log('🏥 [编辑弹窗] 患者类型:', isLymphomaPatient ? '淋巴瘤患者' : '普通患者')

        functionList = generateFunctionConfig(isLymphomaPatient, false)

      }

      console.log('✅ [编辑弹窗] 配置加载完成，功能项数量:', functionList.length)
      console.log('📋 [编辑弹窗] 功能列表:', functionList.map(item => ({
        id: item.id,
        name: item.name,
        visible: item.visible
      })))

      this.setData({

        customFunctionList: functionList

      })

    } catch (error) {

      console.error('❌ [编辑弹窗] 加载配置失败:', error)

    }

  },






  // 长按开始拖拽 - iOS风格

  onItemLongPress(e) {

    const index = e.currentTarget.dataset.index

    wx.vibrateShort({ type: 'medium' }) // 震动反馈



    const customFunctionList = [...this.data.customFunctionList]

    customFunctionList[index] = { ...customFunctionList[index], dragging: true, offsetX: 0, offsetY: 0 }



    this.setData({

      customFunctionList,

      dragStartIndex: index,

      isDragging: true

    })

  },



  // 触摸开始

  onItemTouchStart(e) {

    if (!this.data.isDragging) return



    const touch = e.touches[0]

    this.setData({

      touchStartX: touch.clientX,

      touchStartY: touch.clientY

    })

  },



  // 拖拽移动 - 完全跟手

  onItemTouchMove(e) {

    if (!this.data.isDragging || this.data.dragStartIndex === -1) return



    const touch = e.touches[0]

    const moveX = touch.clientX - this.data.touchStartX

    const moveY = touch.clientY - this.data.touchStartY



    // iOS风格：完全跟手，实时更新位置

    const customFunctionList = [...this.data.customFunctionList]

    const dragIndex = this.data.dragStartIndex



    if (customFunctionList[dragIndex]) {

      customFunctionList[dragIndex] = {

        ...customFunctionList[dragIndex],

        offsetX: moveX,

        offsetY: moveY

      }

    }



    this.setData({ customFunctionList })

  },



  // 拖拽结束 - iOS风格

  onItemTouchEnd(e) {

    if (!this.data.isDragging || this.data.dragStartIndex === -1) return



    wx.vibrateShort({ type: 'light' })



    const { dragStartIndex, customFunctionList } = this.data



    // 清除拖拽状态，恢复原位

    const cleanList = customFunctionList.map((item, index) => ({

      ...item,

      dragging: false,

      offsetX: 0,

      offsetY: 0

    }))



    this.setData({

      customFunctionList: cleanList,

      dragStartIndex: -1,

      isDragging: false,

      touchStartX: 0,

      touchStartY: 0

    })

  },






  /**
   * 保存功能项自定义配置到数据库
   * 保存后重新加载主页面配置以立即生效
   */
  async saveFunctionCustom() {
    const nowFunctionList = this.data.customFunctionList.filter(item => item.visible)

    if (nowFunctionList.length === 0) {
      wx.showToast({ title: '请至少选择一项', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...', mask: true })

      const app = getApp()
      // 🔧 修复：使用更可靠的获取方法
      const openid = app.getOpenIdIfLoggedIn ? app.getOpenIdIfLoggedIn() : app.globalData.openid
      const profileId = app.getCurrentProfileId ? app.getCurrentProfileId() : app.globalData.currentProfile?.profileId

      console.log('💾 保存功能配置 - 开始保存')
      console.log('📋 当前配置:', this.data.customFunctionList.map(item => ({
        id: item.id,
        name: item.name,
        visible: item.visible
      })))
      console.log('👤 用户信息:', { openid: openid ? '已获取' : '未获取', profileId })

      if (!openid || !profileId) {
        wx.hideLoading()
        wx.showToast({
          title: '请先登录并选择档案',
          icon: 'none',
          duration: 2000
        })
        // 延迟返回到健康档案页面
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/health-profile/index'
          })
        }, 2000)
        return
      }

      const db = wx.cloud.database()

      // 标准化配置数据（不再保存 icon 字段，icon 由代码根据 id 决定）
      const functionListToSave = this.data.customFunctionList.map(item => ({
        id: item.id,
        name: item.name,
        // 不再保存 icon 到数据库
        visible: item.visible !== undefined ? item.visible : true,
        order: item.order || 1,
        navigate: item.navigate
      }))

      // 查询是否已存在配置
      const existRes = await db.collection('functionCustomConfig')
        .where({ openid, profileId })
        .get()

      if (existRes.data.length > 0) {
        // 更新现有配置
        await db.collection('functionCustomConfig')
          .doc(existRes.data[0]._id)
          .update({
            data: {
              functionList: functionListToSave,
              updateTime: db.serverDate()
            }
          })
      } else {
        // 创建新配置
        await db.collection('functionCustomConfig').add({
          data: {
            openid,
            profileId,
            functionList: functionListToSave,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })
      }

      console.log('✅ 功能配置已保存到数据库')

      // 重新加载配置使其立即生效
      console.log('🔄 开始重新加载主页面配置...')
      await this.loadMainPageFunctionConfig()
      console.log('✅ 主页面配置已重新加载')
      console.log('📊 当前主页面功能项:', this.data.mainPageFunctions.map(item => ({
        id: item.id,
        name: item.name,
        visible: item.visible
      })))

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })

      // 关闭弹窗
      this.setData({
        showFunctionCustomPopup: false,
        functionEditMode: false
      })

    } catch (error) {
      console.error('❌ 保存功能项配置失败:', error)
      wx.hideLoading()
      wx.showToast({ title: '保存失败，请重试', icon: 'none', duration: 2000 })
    }
  },



  // 关闭功能项自定义弹窗

  closeFunctionCustomPopup() {

    this.setData({

      showFunctionCustomPopup: false,

      functionEditMode: false

    })



    // 🔧 关闭弹窗时不需要刷新配置，避免覆盖用户设置

    // 配置已在保存时更新

  },



  // 弹窗显示状态变化

  onFunctionCustomPopupClose(e) {

    if (!e.detail.visible) {

      this.setData({

        showFunctionCustomPopup: false,

        functionEditMode: false

      })



      // 🔧 弹窗关闭时不需要刷新配置，避免覆盖用户设置

      // 配置已在保存时更新

    }

  },



  // iOS风格拖拽相关方法

  onItemLongPress(e) {

    const result = functionCustomModule.handleLongPress(e, this.data.customFunctionList)

    if (result) {

      this.setData(result)

    }

  },



  onItemTouchStart(e) {

    // 记录触摸开始位置

    this.touchStartY = e.touches[0].clientY

  },



  onItemTouchMove(e) {

    // 只在拖拽状态下处理移动事件，否则允许正常滚动

    if (!this.data.isDragging) {

      return

    }

    const result = functionCustomModule.handleTouchMove(e, {

      ...this.data,

      dragStartY: this.touchStartY || this.data.dragStartY

    })

    if (result) {

      this.setData(result)

    }

  },



  onItemTouchEnd(e) {

    const result = functionCustomModule.handleTouchEnd(this.data)

    if (result) {

      this.setData(result)

    }

  },



  // 切换功能项显示状态

  onFunctionToggle(e) {

    const itemId = e.currentTarget.dataset.id

    console.log('🔘 [开关切换] 点击功能项:', itemId)
    console.log('📋 [开关切换] 切换前配置:', this.data.customFunctionList.map(item => ({
      id: item.id,
      name: item.name,
      visible: item.visible
    })))

    const updatedList = functionCustomModule.toggleItemVisible(itemId, this.data.customFunctionList)

    console.log('📋 [开关切换] 切换后配置:', updatedList.map(item => ({
      id: item.id,
      name: item.name,
      visible: item.visible
    })))

    this.setData({

      customFunctionList: updatedList

    })

    // 震动反馈
    wx.vibrateShort({ type: 'light' })

  },



  // 重置功能项顺序

  resetFunctionOrder() {

    wx.showModal({

      title: '恢复默认设置',

      content: '确定要恢复默认的功能项设置吗？',

      success: (res) => {

        if (res.confirm) {

          console.log('🔄 [恢复默认] 开始恢复默认配置')

          // 获取用户疾病类型

          const app = getApp()

          const currentProfile = app.globalData.currentProfile

          const isLymphomaPatient = currentProfile?.primaryDiseaseCategory === 'lymphoma'

          console.log('🏥 [恢复默认] 患者类型:', isLymphomaPatient ? '淋巴瘤患者' : '普通患者')

          // 使用统一的功能项配置生成器

          const defaultList = generateFunctionConfig(isLymphomaPatient, false)

          console.log('📋 [恢复默认] 默认配置:', defaultList.map(item => ({
            id: item.id,
            name: item.name,
            visible: item.visible
          })))

          this.setData({

            customFunctionList: defaultList

          })

          wx.showToast({

            title: '已恢复默认设置',

            icon: 'success'

          })

          console.log('✅ [恢复默认] 配置已恢复')

        }

      }

    })

  },



  // movable-view 移动事件

  onItemDragChange(e) {

    if (!this.data.isDragging) return



    const currentIndex = parseInt(e.currentTarget.dataset.index)

    const { y } = e.detail

    const itemHeight = 120 // 单个项高度(rpx)

    const targetIndex = Math.round(y / itemHeight)



    // 计算目标位置

    if (targetIndex !== this.data.dragTargetIndex && targetIndex >= 0 && targetIndex < this.data.customFunctionList.length) {

      this.setData({ dragTargetIndex: targetIndex })



      // 轻微震动反馈

      wx.vibrateShort({ type: 'light' })

    }

  },



  // movable-view 拖拽结束

  onItemDragEnd(e) {

    if (!this.data.isDragging) return



    const { dragStartIndex, dragTargetIndex, customFunctionList } = this.data



    // 如果有有效的目标位置，执行交换

    if (dragTargetIndex >= 0 && dragTargetIndex !== dragStartIndex) {

      const newList = [...customFunctionList]

      const dragItem = newList.splice(dragStartIndex, 1)[0]

      newList.splice(dragTargetIndex, 0, dragItem)



      // 更新 y 位置和order

      const updatedList = newList.map((item, index) => ({

        ...item,

        order: index + 1, // 更新顺序

        isDragging: false

      }))



      this.setData({ customFunctionList: updatedList })

      wx.vibrateShort({ type: 'medium' })

    } else {

      // 恢复拖拽状态

      const restoredList = customFunctionList.map(item => ({

        ...item,

        isDragging: false

      }))

      this.setData({ customFunctionList: restoredList })

    }



    // 清理拖拽状态

    this.setData({

      dragStartIndex: -1,

      dragTargetIndex: -1,

      isDragging: false

    })

  },

  // 优化的数据同步检查器
  startDataSyncChecker() {
    if (this.dataSyncChecker) {
      clearInterval(this.dataSyncChecker)
    }

    // 🔧 立即检查一次，避免等待2秒
    this.checkAndRefreshData()

    // 然后启动定时器
    this.dataSyncChecker = setInterval(() => {
      this.checkAndRefreshData()
    }, 2000)
  },

  // 检查并刷新数据的方法
  checkAndRefreshData() {
    const app = getApp()
    if (app.globalData?.needRefreshMedicationData) {
      app.globalData.needRefreshMedicationData = false
      const openid = app.getOpenIdIfLoggedIn()
      if (openid) {
        console.log('🔄 检测到用药数据更新，刷新当前日期数据')
        this.loadDataForDate(this.data.selectedDate, false) // 静默刷新，不显示骨架屏
      }
    }
  },

  onHide() {
    if (this.dataSyncChecker) {
      clearInterval(this.dataSyncChecker)
      this.dataSyncChecker = null
    }
  },

  onUnload() {
    if (this.dataSyncChecker) {
      clearInterval(this.dataSyncChecker)
      this.dataSyncChecker = null
    }
  },

  // 导航到健康图谱页面
  navigateToHealthChart() {
    wx.navigateTo({
      url: '/pages/health-chart/index'
    })
  },

  // ==================== 今日事项管理 ====================

  // 显示添加事项对话框
  showAddTaskDialog() {
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    this.setData({
      showAddTask: true,
      newTaskText: ''
    })
  },

  // 事项输入变化
  onTaskInput(e) {
    this.setData({
      newTaskText: e.detail.value
    })
  },

  // 确认添加事项
  async confirmAddTask() {
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()
    const profileId = app.getCurrentProfileId()

    if (!openid || !profileId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    const taskText = this.data.newTaskText.trim()
    if (!taskText) {
      wx.showToast({
        title: '请输入事项内容',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '添加中...' })

      const db = wx.cloud.database()
      await db.collection('todayTasks').add({
        data: {
          openid: openid,
          profileId: profileId,
          title: taskText,
          completed: false,
          date: this.data.selectedDate,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      })

      this.setData({
        showAddTask: false,
        newTaskText: ''
      })

      // 重新加载事项列表
      this.loadTodayTasks(openid)

    } catch (err) {
      console.error('添加事项失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
    }
  },

  // 切换事项完成状态
  async toggleTaskComplete(e) {
    const taskId = e.currentTarget.dataset.id
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 找到对应的任务
    const task = this.data.todayTasks.find(t => t._id === taskId)
    if (!task) return

    try {
      const db = wx.cloud.database()
      await db.collection('todayTasks').doc(taskId).update({
        data: {
          completed: !task.completed,
          updateTime: db.serverDate()
        }
      })

      // 更新本地数据
      const todayTasks = this.data.todayTasks.map(t => {
        if (t._id === taskId) {
          return { ...t, completed: !t.completed }
        }
        return t
      })

      this.setData({ todayTasks })

      wx.showToast({
        title: task.completed ? '已标记未完成' : '已完成',
        icon: 'success',
        duration: 1000
      })

    } catch (err) {
      console.error('更新事项失败:', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 确认删除事项
  confirmDeleteTask(e) {
    const taskId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个事项吗？',
      confirmColor: '#FF9800',
      success: (res) => {
        if (res.confirm) {
          this.deleteTask(taskId)
        }
      }
    })
  },

  // 删除事项
  async deleteTask(taskId) {
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '删除中...' })

      await wx.cloud.database().collection('todayTasks').doc(taskId).remove()

      wx.hideLoading()
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // 重新加载事项列表
      this.loadTodayTasks(openid)

    } catch (err) {
      console.error('删除事项失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // ==================== 今日事项管理结束 ====================

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
