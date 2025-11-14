  onShow() {

    // 如果已经加载过，立即隐藏骨架屏（避免每次onShow都显示骨架屏）
    if (this.data.hasLoadedBefore) {
      this.setData({ isPageLoading: false })
    }

    // 设置tabBar选中状态

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {

      this.getTabBar().setData({

        selected: 0

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
  loadHealthOverview() // 加载健康概览
