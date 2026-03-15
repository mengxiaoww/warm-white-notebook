Page({
  data: {
    openid: '',
    currentProfileId: '',
    records: [],
    showDialog: false,
    isEditMode: false,
    editingRecordId: '',
    form: {
      recordType: 'normal',
      admissionDate: '',
      dischargeDate: '',
      hospital: '',
      department: '',
      cost: '',
      notes: ''
    },
    admissionPickerVisible: false,
    admissionTimestamp: Date.now(),
    dischargePickerVisible: false,
    dischargeTimestamp: Date.now()
  },

  formatDate(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatDateTime(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  },

  onLoad() {
    setTimeout(() => {
      this.getUserInfo();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadRecords();
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
    if (!openid) {
      wx.showModal({ title: '提示', content: '请先登录', showCancel: false, success: () => wx.navigateBack() });
      return;
    }
    if (!currentProfileId) {
      wx.showModal({ title: '提示', content: '请先选择档案', showCancel: false, success: () => wx.navigateBack() });
      return;
    }
    this.setData({ openid, currentProfileId });
    this.loadRecords();
  },

  async loadRecords() {
    const { openid, currentProfileId } = this.data;
    if (!openid || !currentProfileId) return;
    wx.showLoading({ title: '加载中...', mask: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('hospitalizationRecords')
        .where({ openid, profileId: currentProfileId })
        .orderBy('admissionDate', 'desc')
        .get();
      const records = res.data.map(item => ({
        ...item,
        updateTime: item.updateTime ? this.formatDateTime(new Date(item.updateTime)) : ''
      }));
      this.setData({ records });
    } catch (err) {
      wx.showToast({ title: '加载失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  addRecord() {
    this.setData({
      showDialog: true,
      isEditMode: false,
      editingRecordId: '',
      admissionTimestamp: Date.now(),
      dischargeTimestamp: Date.now(),
      form: {
        recordType: 'normal',
        admissionDate: '',
        dischargeDate: '',
        hospital: '',
        department: '',
        cost: '',
        notes: ''
      }
    });
  },

  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.records.find(r => r._id === id);
    if (!record) return;
    this.setData({
      showDialog: true,
      isEditMode: true,
      editingRecordId: id,
      admissionTimestamp: record.admissionDate ? new Date(record.admissionDate).getTime() : Date.now(),
      dischargeTimestamp: record.dischargeDate ? new Date(record.dischargeDate).getTime() : Date.now(),
      form: {
        recordType: record.recordType || 'normal',
        admissionDate: record.admissionDate || '',
        dischargeDate: record.dischargeDate || '',
        hospital: record.hospital || '',
        department: record.department || '',
        cost: record.cost || '',
        notes: record.notes || ''
      }
    });
  },

  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除', content: '确定要删除这条住院记录吗？',
      confirmText: '删除', confirmColor: '#ff4757', cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...', mask: true });
        try {
          await wx.cloud.database().collection('hospitalizationRecords').doc(id).remove();
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadRecords();
        } catch (err) {
          wx.showToast({ title: '删除失败，请重试', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  closeDialog() { this.setData({ showDialog: false }); },
  onDialogVisibleChange(e) { this.setData({ showDialog: e.detail.visible }); },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  selectType(e) {
    this.setData({ 'form.recordType': e.currentTarget.dataset.value });
  },

  showAdmissionPicker() { this.setData({ admissionPickerVisible: true }); },
  onAdmissionConfirm(e) {
    const date = new Date(e.detail.value);
    this.setData({ 'form.admissionDate': this.formatDate(date), admissionTimestamp: date.getTime(), admissionPickerVisible: false });
  },
  onAdmissionCancel() { this.setData({ admissionPickerVisible: false }); },
  onAdmissionVisibleChange(e) { this.setData({ admissionPickerVisible: e.detail.visible }); },

  showDischargePicker() { this.setData({ dischargePickerVisible: true }); },
  onDischargeConfirm(e) {
    const date = new Date(e.detail.value);
    this.setData({ 'form.dischargeDate': this.formatDate(date), dischargeTimestamp: date.getTime(), dischargePickerVisible: false });
  },
  onDischargeCancel() { this.setData({ dischargePickerVisible: false }); },
  onDischargeVisibleChange(e) { this.setData({ dischargePickerVisible: e.detail.visible }); },

  async saveRecord() {
    const { form, isEditMode, editingRecordId, openid, currentProfileId } = this.data;
    if (!form.admissionDate) {
      wx.showToast({ title: '请选择住院日期', icon: 'none' }); return;
    }
    if (!form.hospital.trim()) {
      wx.showToast({ title: '请填写就诊医院', icon: 'none' }); return;
    }
    wx.showLoading({ title: isEditMode ? '保存中...' : '添加中...', mask: true });
    try {
      const db = wx.cloud.database();
      const data = {
        openid, profileId: currentProfileId,
        recordType: form.recordType,
        admissionDate: form.admissionDate,
        dischargeDate: form.dischargeDate,
        hospital: form.hospital.trim(),
        department: form.department.trim(),
        cost: form.cost,
        notes: form.notes.trim(),
        updateTime: db.serverDate()
      };
      if (isEditMode) {
        await db.collection('hospitalizationRecords').doc(editingRecordId).update({ data });
      } else {
        data.createTime = db.serverDate();
        await db.collection('hospitalizationRecords').add({ data });
      }
      wx.showToast({ title: isEditMode ? '保存成功' : '添加成功', icon: 'success' });
      this.setData({ showDialog: false });
      this.loadRecords();
    } catch (err) {
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  navigateBack() { wx.navigateBack(); }
});
