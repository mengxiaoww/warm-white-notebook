Page({
  data: {
    // 选中的日期
    selectedDate: '',
    maxDate: '',

    // 日期选择器状态
    datePickerVisible: false,

    // 表单数据
    formData: {
      fbg: '',    // 空腹血糖
      pbg: '',    // 餐后2小时血糖
      rbg: '',    // 随机血糖
      hba1c: '',  // 糖化血红蛋白
      notes: ''   // 备注
    },

    // 用户信息
    openid: '',
    currentProfileId: '',

    // 当前记录ID（编辑模式）
    recordId: '',
    isLoggedIn: false
  },

  // 页面初始化
  onLoad(options) {
    console.log('🎯 血糖页面 onLoad，传入参数:', options);

    // 设置基础数据
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = options.date || today;

    this.setData({
      selectedDate: selectedDate,
      maxDate: today,
      recordId: options.recordId || ''
    });

    console.log('✅ 页面初始化完成');
  },

  // 页面渲染完成后加载数据
  onReady() {
    setTimeout(() => {
      this.checkLoginAndLoadData();
    }, 100);
  },

  // 页面显示时触发
  onShow() {
    const app = getApp();
    if (app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.checkLoginAndLoadData();
    }
  },

  // 检查登录并加载数据
  checkLoginAndLoadData() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    if (!openid) {
      console.log('❌ 用户未登录');
      this.setData({ isLoggedIn: false });
      return;
    }

    const currentProfileId = app.getCurrentProfileId();
    if (!currentProfileId) {
      console.log('❌ 未选择档案');
      wx.showToast({
        title: '请先选择档案',
        icon: 'none'
      });
      return;
    }

    this.setData({
      openid: openid,
      currentProfileId: currentProfileId,
      isLoggedIn: true
    });

    // 如果是编辑模式，加载已有记录
    if (this.data.recordId) {
      this.loadExistingRecord();
    }
  },

  // 加载已有记录
  async loadExistingRecord() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('bloodSugarRecords')
        .doc(this.data.recordId)
        .get();

      if (res.data) {
        const record = res.data;
        this.setData({
          formData: {
            fbg: record.fbg || '',
            pbg: record.pbg || '',
            rbg: record.rbg || '',
            hba1c: record.hba1c || '',
            notes: record.notes || ''
          },
          selectedDate: record.date
        });
      }
    } catch (error) {
      console.error('❌ 加载记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 表单输入处理
  onFbgChange(e) {
    this.setData({
      'formData.fbg': e.detail.value
    });
  },

  onPbgChange(e) {
    this.setData({
      'formData.pbg': e.detail.value
    });
  },

  onRbgChange(e) {
    this.setData({
      'formData.rbg': e.detail.value
    });
  },

  onHba1cChange(e) {
    this.setData({
      'formData.hba1c': e.detail.value
    });
  },

  onNotesChange(e) {
    this.setData({
      'formData.notes': e.detail.value
    });
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ datePickerVisible: true });
  },

  // 关闭日期选择器
  onDatePickerClose(e) {
    this.setData({ datePickerVisible: e.detail.visible });
  },

  // 确认日期选择
  onDateConfirm(e) {
    this.setData({
      selectedDate: e.detail.value,
      datePickerVisible: false
    });
  },

  // 保存记录
  async saveRecord() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const { fbg, pbg, rbg, hba1c, notes } = this.data.formData;

    // 验证至少输入一项
    if (!fbg && !pbg && !rbg && !hba1c) {
      wx.showToast({
        title: '请至少输入一项血糖数据',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const db = wx.cloud.database();
      const data = {
        openid: this.data.openid,
        profileId: this.data.currentProfileId,
        date: this.data.selectedDate,
        fbg: fbg ? parseFloat(fbg) : null,
        pbg: pbg ? parseFloat(pbg) : null,
        rbg: rbg ? parseFloat(rbg) : null,
        hba1c: hba1c ? parseFloat(hba1c) : null,
        notes: notes || '',
        updateTime: db.serverDate()
      };

      if (this.data.recordId) {
        // 更新已有记录
        await db.collection('bloodSugarRecords')
          .doc(this.data.recordId)
          .update({ data });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        // 创建新记录
        data.createTime = db.serverDate();
        await db.collection('bloodSugarRecords').add({ data });

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }

      // 标记需要刷新数据
      const app = getApp();
      app.globalData.needRefreshData = true;

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('❌ 保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});
