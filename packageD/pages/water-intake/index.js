// 饮水记录页面 - 多次记录模式
const app = getApp();
const { getTodayLocalDate } = require("../../../utils/util.js");

Page({
  data: {
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,
    waterIntakeRecords: [],
    totalWater: 0,
    avgWater: 0,
    showRecordDialog: false,
    isEditMode: false,
    editingRecordId: '',
    recordForm: {
      time: '',
      water: '',
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
      this.loadWaterIntakeRecords();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadWaterIntakeRecords();
    }
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.loadWaterIntakeRecords();
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
        content: !openid ? '请先去【我的】登录' : '请先选择档案',
        showCancel: false,
        success: () => wx.navigateBack()
      });
      return;
    }
    this.setData({ openid, currentProfileId });
  },

  async loadWaterIntakeRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;
    if (!openid || !currentProfileId) return;
    wx.showLoading({ title: '加载中...', mask: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('waterIntakes')
        .where({ openid, profileId: currentProfileId, date: selectedDate })
        .orderBy('createTime', 'desc')
        .get();
      let totalWater = 0;
      let count = 0;
      res.data.forEach(item => {
        if (item.water) {
          totalWater += Number(item.water);
          count++;
        }
      });
      const avgWater = count > 0 ? Math.round(totalWater / count) : 0;
      this.setData({
        waterIntakeRecords: res.data,
        totalWater,
        avgWater
      });
    } catch (err) {
      console.error('加载饮水记录失败:', err);
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
    this.loadWaterIntakeRecords();
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
      recordForm: { time: timeStr, water: '', notes: '' }
    });
  },

  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.waterIntakeRecords.find(r => r._id === id);
    if (!record) return;
    this.setData({
      showRecordDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordForm: {
        time: record.time || '',
        water: record.water || '',
        notes: record.notes || ''
      }
    });
  },

  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条饮水记录吗？`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...', mask: true });
        try {
          const db = wx.cloud.database();
          await db.collection('waterIntakes').doc(id).remove();
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadWaterIntakeRecords();
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
    if (!recordForm.water) {
      wx.showToast({ title: '请填写饮水量', icon: 'none' });
      return;
    }
    if (!recordForm.time) {
      wx.showToast({ title: '请选择记录时间', icon: 'none' });
      return;
    }
    wx.showLoading({ title: isEditMode ? '更新中...' : '保存中...', mask: true });
    try {
      const db = wx.cloud.database();
      const saveData = {
        time: recordForm.time,
        water: recordForm.water ? parseInt(recordForm.water) : null,
        notes: recordForm.notes || '',
        updateTime: db.serverDate()
      };
      if (isEditMode) {
        await db.collection('waterIntakes').doc(editingRecordId).update({ data: saveData });
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        await db.collection('waterIntakes').add({
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
      this.loadWaterIntakeRecords();
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
    let value = e.detail.value;
    if (field !== 'notes' && field !== 'time') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length > 4) {
        value = value.substring(0, 4);
      }
    }
    this.setData({ [`recordForm.${field}`]: value });
  },

  quickInput(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({ 'recordForm.water': value });
  },

  onTimePickerChange(e) {
    this.setData({ 'recordForm.time': e.detail.value });
  },

  showRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.waterIntakeRecords.find(r => r._id === id);
    if (!record) return;
    let detailText = `时间：${record.time}\n`;
    if (record.water) detailText += `饮水量：${record.water} ml\n`;
    if (record.notes) detailText += `备注：${record.notes}`;
    wx.showModal({
      title: '饮水记录详情',
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
