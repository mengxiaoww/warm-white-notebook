// 饮食记录页面 - 多次记录模式
const app = getApp();
const { getTodayLocalDate } = require("../../../utils/util.js");

Page({
  data: {
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,
    dietRecords: [],
    showRecordDialog: false,
    isEditMode: false,
    editingRecordId: '',
    mealTypes: [
      { label: '早餐', value: 'breakfast' },
      { label: '午餐', value: 'lunch' },
      { label: '晚餐', value: 'dinner' },
      { label: '加餐', value: 'snack' }
    ],
    mealTypeIndex: 0,
    recordForm: {
      time: '',
      mealType: '',
      content: '',
      notes: ''
    }
  },

  onLoad(options) {
    const today = getTodayLocalDate();
    const selectedDate = options.date || today;
    this.setData({
      selectedDate: selectedDate,
      selectedDateTimestamp: new Date(selectedDate).getTime()
    });
    setTimeout(() => {
      this.getUserInfo();
      this.loadDietRecords();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadDietRecords();
    }
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.loadDietRecords();
    }
  },

  getUserInfo() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    let currentProfileId = '';
    if (app.globalData && app.globalData.currentProfile && app.globalData.currentProfile.profileId) {
      currentProfileId = app.globalData.currentProfile.profileId;
    } else if (app.getCurrentProfileId) {
      currentProfileId = app.getCurrentProfileId();
    }
    if (!openid || !currentProfileId) {
      wx.showModal({
        title: '提示',
        content: !openid ? '请先登录' : '请先选择档案',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }
    this.setData({ openid, currentProfileId });
  },

  async loadDietRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;
    if (!openid || !currentProfileId) return;
    wx.showLoading({ title: '加载中...', mask: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('diets')
        .where({ openid, profileId: currentProfileId, date: selectedDate })
        .orderBy('createTime', 'desc')
        .get();
      this.setData({ dietRecords: res.data });
    } catch (err) {
      console.error('加载饮食记录失败:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  showDatePicker() {
    this.setData({ datePickerVisible: true });
  },

  onDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);
    this.setData({
      selectedDate: dateStr,
      selectedDateTimestamp: date.getTime(),
      datePickerVisible: false
    });
    this.loadDietRecords();
  },

  onDateCancel() {
    this.setData({ datePickerVisible: false });
  },

  onDateVisibleChange(e) {
    this.setData({ datePickerVisible: e.detail.visible });
  },

  addRecord() {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({
      showRecordDialog: true,
      isEditMode: false,
      editingRecordId: '',
      mealTypeIndex: 0,
      recordForm: { time: timeStr, mealType: '早餐', content: '', notes: '' }
    });
  },

  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.dietRecords.find(r => r._id === id);
    if (!record) return;
    const mealTypeIndex = this.data.mealTypes.findIndex(m => m.label === record.mealType);
    this.setData({
      showRecordDialog: true,
      isEditMode: true,
      editingRecordId: id,
      mealTypeIndex: mealTypeIndex >= 0 ? mealTypeIndex : 0,
      recordForm: {
        time: record.time || '',
        mealType: record.mealType || '',
        content: record.content || '',
        notes: record.notes || ''
      }
    });
  },

  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条饮食记录吗？`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...', mask: true });
        try {
          const db = wx.cloud.database();
          await db.collection('diets').doc(id).remove();
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadDietRecords();
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
            app.globalData.needRefreshData = true;
          }
        } catch (err) {
          wx.showToast({ title: '删除失败，请重试', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  async saveRecord() {
    const { recordForm, selectedDate, openid, currentProfileId, isEditMode, editingRecordId } = this.data;
    if (!recordForm.mealType) {
      wx.showToast({ title: '请选择餐次', icon: 'none' });
      return;
    }
    if (!recordForm.time) {
      wx.showToast({ title: '请选择记录时间', icon: 'none' });
      return;
    }
    if (!recordForm.content || !recordForm.content.trim()) {
      wx.showToast({ title: '请输入饮食内容', icon: 'none' });
      return;
    }
    wx.showLoading({ title: isEditMode ? '更新中...' : '保存中...', mask: true });
    try {
      const db = wx.cloud.database();
      const saveData = {
        time: recordForm.time,
        mealType: recordForm.mealType,
        content: recordForm.content || '',
        notes: recordForm.notes || '',
        updateTime: db.serverDate()
      };
      if (isEditMode) {
        await db.collection('diets').doc(editingRecordId).update({ data: saveData });
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await db.collection('diets').add({
          data: {
            ...saveData,
            openid,
            profileId: currentProfileId,
            date: selectedDate,
            createTime: db.serverDate()
          }
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
      }
      this.setData({ showRecordDialog: false });
      this.loadDietRecords();
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true;
      }
    } catch (err) {
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  closeRecordDialog() {
    this.setData({ showRecordDialog: false });
  },

  onDialogVisibleChange(e) {
    this.setData({ showRecordDialog: e.detail.visible });
  },

  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({ [`recordForm.${field}`]: value });
  },

  onMealTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      mealTypeIndex: index,
      'recordForm.mealType': this.data.mealTypes[index].label
    });
  },

  selectMealType(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      mealTypeIndex: index,
      'recordForm.mealType': this.data.mealTypes[index].label
    });
  },

  onTimePickerChange(e) {
    this.setData({ 'recordForm.time': e.detail.value });
  },

  showRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.dietRecords.find(r => r._id === id);
    if (!record) return;
    let detailText = `时间：${record.time}\n`;
    if (record.mealType) detailText += `餐次：${record.mealType}\n`;
    if (record.content) detailText += `内容：${record.content}\n`;
    if (record.notes) detailText += `备注：${record.notes}`;
    wx.showModal({
      title: '饮食记录详情',
      content: detailText,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  navigateBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/daily-record/index' });
      }
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png';
    const res = await wx.cloud.getTempFileURL({ fileList: [fileID] });
    return {
      title: '暖白记事本 - 健康管理小程序',
      path: '/pages/daily-record/index',
      imageURL: res.fileList[0].tempFileURL
    };
  }
});
