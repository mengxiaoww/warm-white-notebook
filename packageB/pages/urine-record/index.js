// 尿液记录页面 - 多次记录模式
const app = getApp();
const { getTodayLocalDate } = require("../../../utils/util.js");

Page({
  data: {
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,
    urineRecords: [],
    totalVolume: 0,
    avgVolume: 0,
    showRecordDialog: false,
    isEditMode: false,
    editingRecordId: '',
    recordForm: {
      time: '',
      volume: '',
      color: '',
      clarity: '',
      notes: ''
    },
    colorOptions: [
      { label: '正常黄色', value: '正常黄色' },
      { label: '深黄色', value: '深黄色' },
      { label: '浅黄色', value: '浅黄色' },
      { label: '无色', value: '无色' },
      { label: '红色', value: '红色' },
      { label: '茶色', value: '茶色' }
    ],
    clarityOptions: [
      { label: '清澈', value: '清澈' },
      { label: '轻度浑浊', value: '轻度浑浊' },
      { label: '浑浊', value: '浑浊' }
    ]
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
      this.loadUrineRecords();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadUrineRecords();
    }
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.loadUrineRecords();
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

  async loadUrineRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;
    if (!openid || !currentProfileId) return;
    wx.showLoading({ title: '加载中...', mask: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('urineRecords')
        .where({ openid, profileId: currentProfileId, date: selectedDate })
        .orderBy('createTime', 'desc')
        .get();
      let totalVolume = 0;
      let count = 0;
      res.data.forEach(item => {
        if (item.volume) {
          totalVolume += Number(item.volume);
          count++;
        }
      });
      const avgVolume = count > 0 ? Math.round(totalVolume / count) : 0;
      this.setData({
        urineRecords: res.data,
        totalVolume,
        avgVolume
      });
    } catch (err) {
      console.error('加载尿液记录失败:', err);
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
    this.loadUrineRecords();
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
      recordForm: { time: timeStr, volume: '', color: '', clarity: '', notes: '' }
    });
  },

  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.urineRecords.find(r => r._id === id);
    if (!record) return;
    this.setData({
      showRecordDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordForm: {
        time: record.time || '',
        volume: record.volume || '',
        color: record.color || '',
        clarity: record.clarity || '',
        notes: record.notes || ''
      }
    });
  },

  async deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条尿液记录吗？'
    });
    if (!res.confirm) return;
    try {
      wx.showLoading({ title: '删除中...' });
      const db = wx.cloud.database();
      await db.collection('urineRecords').doc(id).remove();
      wx.showToast({ title: '删除成功', icon: 'success' });
      this.loadUrineRecords();
    } catch (err) {
      console.error('删除失败:', err);
      wx.showToast({ title: '删除失败，请重试', icon: 'error' });
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
    this.setData({
      [`recordForm.${field}`]: e.detail.value
    });
  },

  onTimePickerChange(e) {
    this.setData({
      'recordForm.time': e.detail.value
    });
  },

  onColorSelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'recordForm.color': value
    });
  },

  onClaritySelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'recordForm.clarity': value
    });
  },

  async saveRecord() {
    const { recordForm, selectedDate, openid, currentProfileId, isEditMode, editingRecordId } = this.data;

    if (!recordForm.time) {
      wx.showToast({ title: '请选择记录时间', icon: 'none' });
      return;
    }

    if (!recordForm.volume) {
      wx.showToast({ title: '请输入尿量', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: isEditMode ? '保存中...' : '添加中...' });
      const db = wx.cloud.database();
      const recordData = {
        openid,
        profileId: currentProfileId,
        date: selectedDate,
        time: recordForm.time,
        volume: Number(recordForm.volume),
        color: recordForm.color,
        clarity: recordForm.clarity,
        notes: recordForm.notes,
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        await db.collection('urineRecords').doc(editingRecordId).update({
          data: recordData
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        recordData.createTime = db.serverDate();
        await db.collection('urineRecords').add({
          data: recordData
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }

      this.setData({ showRecordDialog: false });
      this.loadUrineRecords();
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  navigateBack() {
    wx.navigateBack();
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
