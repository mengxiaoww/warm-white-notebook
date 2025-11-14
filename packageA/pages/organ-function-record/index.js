const app = getApp()

Page({
  data: {
    records: [],
    showAddPopup: false,
    showDetailPopup: false,
    selectedRecord: null,

    formData: {
      date: '',
      time: '',
      alt: '',
      ast: '',
      bilirubin: '',
      albumin: '',
      creatinine: '',
      urea: '',
      gfr: '',
      testType: '',
      hospital: '',
      notes: ''
    },

    showDatePicker: false,
    showTimePicker: false,
    showTestTypePicker: false,

    testTypeOptions: [
      { value: '肝功能', label: '肝功能' },
      { value: '肾功能', label: '肾功能' },
      { value: '肝肾功能', label: '肝肾功能' }
    ],

    currentTestType: '',
    showLiverFunction: false,
    showKidneyFunction: false,

    todayStats: {
      count: 0,
      hasAbnormal: false,
      abnormalInfo: ''
    },

    isEditing: false,
    editingId: null
  },

  onLoad() {
    // 🔧 修复：延迟初始化，确保 app.globalData.currentProfile 已初始化
    setTimeout(() => {
      this.initPage();
    }, 300);
  },

  onShow() {
    this.loadData();
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

    console.log('肝肾功能记录页面 - 获取用户信息:', {
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
      return null;
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
      return null;
    }

    this.setData({
      openid,
      currentProfileId
    });

    return { openid, currentProfileId };
  },

  initPage() {
    const today = this.formatDate(new Date());
    const now = this.formatTime(new Date());

    this.setData({
      'formData.date': today,
      'formData.time': now
    });
  },

  async loadData() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {
      this.setData({ records: [] });
      return;
    }

    const { openid, currentProfileId } = userInfo;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('organFunctionRecords')
        .where({
          openid: openid,
          profileId: currentProfileId
        })
        .orderBy('date', 'desc')
        .orderBy('time', 'desc')
        .get();

      const processedRecords = res.data.map(record => {
        const abnormalList = [];

        if (record.alt && parseFloat(record.alt) > 50) abnormalList.push('ALT偏高');
        if (record.ast && parseFloat(record.ast) > 40) abnormalList.push('AST偏高');
        if (record.bilirubin && parseFloat(record.bilirubin) > 17.1) abnormalList.push('胆红素偏高');
        if (record.albumin && parseFloat(record.albumin) < 35) abnormalList.push('白蛋白偏低');
        if (record.creatinine && parseFloat(record.creatinine) > 104) abnormalList.push('肌酐偏高');
        if (record.urea && parseFloat(record.urea) > 8.2) abnormalList.push('尿素偏高');
        if (record.gfr && parseFloat(record.gfr) < 90) abnormalList.push('GFR偏低');

        return {
          ...record,
          hasAbnormal: abnormalList.length > 0,
          abnormalList: abnormalList,
          displayDate: this.formatDisplayDate(record.date),
          notesPreview: record.notes ? (record.notes.length > 20 ? record.notes.substring(0, 20) + '...' : record.notes) : ''
        };
      });

      const today = this.formatDate(new Date());
      const todayRecords = processedRecords.filter(record => record.date === today);
      const hasAbnormal = todayRecords.some(record => record.hasAbnormal);
      const abnormalList = [];

      todayRecords.forEach(record => {
        abnormalList.push(...record.abnormalList);
      });

      this.setData({
        records: processedRecords,
        todayStats: {
          count: todayRecords.length,
          hasAbnormal: hasAbnormal,
          abnormalInfo: [...new Set(abnormalList)].join('、')
        }
      });

    } catch (error) {

      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  showAddDialog() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {
      return;
    }

    this.initPage();
    this.setData({
      showAddPopup: true,
      isEditing: false,
      editingId: null,
      showLiverFunction: false,
      showKidneyFunction: false
    });
  },

  closeAddDialog() {
    this.setData({
      showAddPopup: false,
      showDatePicker: false,
      showTimePicker: false,
      showTestTypePicker: false
    });
  },

  selectTestType(e) {
    const value = e.currentTarget.dataset.value;

    let showLiver = false;
    let showKidney = false;

    if (value === '肝功能') {
      showLiver = true;
      showKidney = false;
    } else if (value === '肾功能') {
      showLiver = false;
      showKidney = true;
    } else if (value === '肝肾功能') {
      showLiver = true;
      showKidney = true;
    }

    this.setData({
      'formData.testType': value,
      currentTestType: value,
      showTestTypePicker: false,
      showLiverFunction: showLiver,
      showKidneyFunction: showKidney
    });
  },

  onAltInput(e) { this.setData({ 'formData.alt': e.detail.value }); },
  onAstInput(e) { this.setData({ 'formData.ast': e.detail.value }); },
  onBilirubinInput(e) { this.setData({ 'formData.bilirubin': e.detail.value }); },
  onAlbuminInput(e) { this.setData({ 'formData.albumin': e.detail.value }); },
  onCreatinineInput(e) { this.setData({ 'formData.creatinine': e.detail.value }); },
  onUreaInput(e) { this.setData({ 'formData.urea': e.detail.value }); },
  onGfrInput(e) { this.setData({ 'formData.gfr': e.detail.value }); },
  onHospitalInput(e) { this.setData({ 'formData.hospital': e.detail.value }); },
  onNotesInput(e) { this.setData({ 'formData.notes': e.detail.value }); },

  showDateSelector() { this.setData({ showDatePicker: true }); },
  onDateConfirm(e) { this.setData({ 'formData.date': e.detail.value, showDatePicker: false }); },
  onDateCancel() { this.setData({ showDatePicker: false }); },

  showTimeSelector() { this.setData({ showTimePicker: true }); },
  onTimeConfirm(e) { this.setData({ 'formData.time': e.detail.value, showTimePicker: false }); },
  onTimeCancel() { this.setData({ showTimePicker: false }); },

  showTestTypeSelector() {
    this.setData({
      showTestTypePicker: true,
      currentTestType: this.data.formData.testType
    });
  },
  closeTestTypePicker() { this.setData({ showTestTypePicker: false }); },

  async saveRecord() {
    const { formData, isEditing, editingId } = this.data;

    if (!formData.date || !formData.time) {
      wx.showToast({ title: '请填写日期和时间', icon: 'none' });
      return;
    }

    if (!formData.testType) {
      wx.showToast({ title: '请选择检测类型', icon: 'none' });
      return;
    }

    let hasRequiredValue = false;

    if (formData.testType === '肝功能') {
      hasRequiredValue = formData.alt || formData.ast || formData.bilirubin || formData.albumin;
    } else if (formData.testType === '肾功能') {
      hasRequiredValue = formData.creatinine || formData.urea || formData.gfr;
    } else if (formData.testType === '肝肾功能') {
      hasRequiredValue = formData.alt || formData.ast || formData.bilirubin ||
        formData.albumin || formData.creatinine || formData.urea || formData.gfr;
    }

    if (!hasRequiredValue) {
      const typeText = formData.testType === '肝功能' ? '肝功能' :
        formData.testType === '肾功能' ? '肾功能' : '肝肾功能';
      wx.showToast({ title: `请至少填写一个${typeText}指标`, icon: 'none' });
      return;
    }

    const userInfo = this.getUserInfo();

    if (!userInfo) {
      return;
    }

    const { openid, currentProfileId } = userInfo;

    wx.showLoading({ title: isEditing ? '更新中...' : '保存中...', mask: true });

    try {
      const db = wx.cloud.database();
      const recordData = { ...formData, openid, profileId: currentProfileId, updateTime: db.serverDate() };

      if (isEditing && editingId) {
        await db.collection('organFunctionRecords').doc(editingId).update({ data: recordData });
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await db.collection('organFunctionRecords').add({ data: { ...recordData, createTime: db.serverDate() } });
        wx.showToast({ title: '保存成功', icon: 'success' });
      }

      this.closeAddDialog();
      this.loadData();
    } catch (error) {

      wx.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  showDetail(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r._id === id);
    if (record) {
      this.setData({ selectedRecord: record, showDetailPopup: true });
    }
  },

  closeDetailDialog() {
    this.setData({ showDetailPopup: false, selectedRecord: null });
  },

  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r._id === id);

    if (record) {
      let showLiver = false, showKidney = false;

      if (record.testType === '肝功能') {
        showLiver = true;
      } else if (record.testType === '肾功能') {
        showKidney = true;
      } else if (record.testType === '肝肾功能') {
        showLiver = showKidney = true;
      }

      this.setData({
        formData: {
          date: record.date, time: record.time, alt: record.alt || '', ast: record.ast || '',
          bilirubin: record.bilirubin || '', albumin: record.albumin || '',
          creatinine: record.creatinine || '', urea: record.urea || '', gfr: record.gfr || '',
          testType: record.testType || '', hospital: record.hospital || '', notes: record.notes || ''
        },
        isEditing: true, editingId: id, showAddPopup: true, showDetailPopup: false,
        showLiverFunction: showLiver, showKidneyFunction: showKidney
      });
    }
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...', mask: true });
            await wx.cloud.database().collection('organFunctionRecords').doc(id).remove();
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.setData({ showDetailPopup: false });
            this.loadData();
          } catch (error) {

            wx.showToast({ title: '删除失败', icon: 'error' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (dateStr === this.formatDate(today)) {
      return '今天';
    } else if (dateStr === this.formatDate(yesterday)) {
      return '昨天';
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}-${day}`;
    }
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

})
