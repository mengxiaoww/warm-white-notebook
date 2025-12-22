// 体温记录页面 - 多次记录模式
const app = getApp();
const { getTodayLocalDate } = require("../../../utils/util.js");

Page({
  data: {
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,
    temperatureRecords: [],
    avgTemperature: 0,
    showRecordDialog: false,
    isEditMode: false,
    editingRecordId: '',
    recordForm: {
      time: '',
      temperature: '',
      customValues: {},
      notes: ''
    },
    customIndicators: []
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
      this.loadCustomIndicators();
      this.loadTemperatureRecords();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadTemperatureRecords();
    }
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.loadCustomIndicators();
      this.loadTemperatureRecords();
    }
    if (app.globalData && app.globalData.needRefreshTemperatureConfig) {
      app.globalData.needRefreshTemperatureConfig = false;
      this.loadCustomIndicators();
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

  async loadCustomIndicators() {
    const { openid, currentProfileId } = this.data;
    if (!openid || !currentProfileId) return;
    try {
      const db = wx.cloud.database();
      const res = await db.collection('temperatureIndicatorSettings')
        .where({ openid, profileId: currentProfileId })
        .orderBy('customOrder', 'asc')
        .get();
      this.setData({ customIndicators: res.data || [] });
    } catch (err) {
      console.error('加载自定义指标失败:', err);
    }
  },

  async loadTemperatureRecords() {
    const { openid, currentProfileId, selectedDate, customIndicators } = this.data;
    if (!openid || !currentProfileId) return;
    wx.showLoading({ title: '加载中...', mask: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('temperatures')
        .where({ openid, profileId: currentProfileId, date: selectedDate })
        .orderBy('createTime', 'desc')
        .get();

      let totalTemp = 0;
      let count = 0;
      const processedRecords = res.data.map(item => {
        if (item.temperature) {
          totalTemp += Number(item.temperature);
          count++;
        }

        const customValuesList = [];
        if (item.customValues) {
          customIndicators.forEach(indicator => {
            const value = item.customValues[indicator.id];
            if (value !== undefined && value !== null && value !== '') {
              customValuesList.push({
                key: indicator.id,
                name: indicator.name,
                value: value,
                unit: indicator.unit
              });
            }
          });
        }

        return {
          ...item,
          customValuesList
        };
      });

      const avgTemperature = count > 0 ? (totalTemp / count).toFixed(1) : 0;
      this.setData({
        temperatureRecords: processedRecords,
        avgTemperature
      });
    } catch (err) {
      console.error('加载体温记录失败:', err);
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
    this.loadTemperatureRecords();
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
      recordForm: { time: timeStr, temperature: '', customValues: {}, notes: '' }
    });
  },

  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.temperatureRecords.find(r => r._id === id);
    if (!record) return;
    this.setData({
      showRecordDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordForm: {
        time: record.time || '',
        temperature: record.temperature || '',
        customValues: record.customValues || {},
        notes: record.notes || ''
      }
    });
  },

  async deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条体温记录吗？'
    });
    if (!res.confirm) return;
    try {
      wx.showLoading({ title: '删除中...' });
      const db = wx.cloud.database();
      await db.collection('temperatures').doc(id).remove();
      wx.showToast({ title: '删除成功', icon: 'success' });
      this.loadTemperatureRecords();
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

  onCustomInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`recordForm.customValues.${field}`]: e.detail.value
    });
  },

  onTimePickerChange(e) {
    this.setData({
      'recordForm.time': e.detail.value
    });
  },

  async saveRecord() {
    const { recordForm, selectedDate, openid, currentProfileId, isEditMode, editingRecordId } = this.data;

    if (!recordForm.time) {
      wx.showToast({ title: '请选择记录时间', icon: 'none' });
      return;
    }

    if (!recordForm.temperature) {
      wx.showToast({ title: '请输入体温', icon: 'none' });
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
        temperature: Number(recordForm.temperature),
        customValues: recordForm.customValues,
        notes: recordForm.notes,
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        await db.collection('temperatures').doc(editingRecordId).update({
          data: recordData
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        recordData.createTime = db.serverDate();
        await db.collection('temperatures').add({
          data: recordData
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }

      this.setData({ showRecordDialog: false });
      this.loadTemperatureRecords();
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  showRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    this.editRecord({ currentTarget: { dataset: { id } } });
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
