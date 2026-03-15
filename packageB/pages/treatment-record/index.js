Page({
  data: {
    openid: '',
    currentProfileId: '',

    // 日期相关
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,

    // 治疗记录列表
    treatmentRecords: [],

    // 弹窗
    showDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 表单
    form: {
      recordDate: '',
      recordType: 'medication', // medication | discharge
      // 用药字段
      treatmentPlan: '',
      medicationName: '',
      dosage: '',
      medicationTime: '',
      // 出院小结字段
      admissionInfo: '',
      dischargeDiagnosis: '',
      dischargeSummary: '',
      // 通用字段
      notes: '',
      isHospitalized: false,
      isInWard: false
    },

    // 日期/时间选择器
    recordDatePickerVisible: false,
    recordDateTimestamp: Date.now(),

    // 快捷提示词
    treatmentPlanSuggestions: [
      'CCCG2020方案', 'CAR-T', '贝林妥欧单抗',
      '异基因移植', '自体移植'
    ],
    medicationNameSuggestions: [
      '阿司匹林', '布洛芬', '头孢克肟', '阿莫西林',
      '氨氯地平', '阿托伐他汀', '二甲双胍', '奥美拉唑'
    ]
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

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  },

  onLoad(options) {
    setTimeout(() => {
      this.getUserInfo();
      const today = new Date();
      const dateStr = this.formatDate(today);
      if (options.date) {
        this.setData({
          selectedDate: options.date,
          selectedDateTimestamp: new Date(options.date).getTime()
        });
      } else {
        this.setData({
          selectedDate: dateStr,
          selectedDateTimestamp: today.getTime()
        });
      }
      this.loadRecords();
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
  },

  async loadRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;
    if (!openid || !currentProfileId) return;
    wx.showLoading({ title: '加载中...', mask: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('treatmentRecords')
        .where({ openid, profileId: currentProfileId, date: selectedDate })
        .orderBy('createTime', 'desc')
        .get();
      const records = res.data.map(item => ({
        ...item,
        updateTime: item.updateTime ? this.formatDateTime(new Date(item.updateTime)) : ''
      }));
      this.setData({ treatmentRecords: records });
    } catch (err) {
      wx.showToast({ title: '加载失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // 日期选择器
  showDatePicker() { this.setData({ datePickerVisible: true }); },
  onDateConfirm(e) {
    const date = new Date(e.detail.value);
    this.setData({ selectedDate: this.formatDate(date), selectedDateTimestamp: date.getTime(), datePickerVisible: false });
    this.loadRecords();
  },
  onDateCancel() { this.setData({ datePickerVisible: false }); },
  onDateVisibleChange(e) { this.setData({ datePickerVisible: e.detail.visible }); },

  // 添加记录
  addRecord() {
    const defaultDate = this.data.selectedDate || this.formatDate(new Date());
    this.setData({
      showDialog: true,
      isEditMode: false,
      editingRecordId: '',
      recordDateTimestamp: new Date(defaultDate).getTime(),
      form: {
        recordDate: defaultDate,
        recordType: 'medication',
        treatmentPlan: '',
        medicationName: '',
        dosage: '',
        medicationTime: '',
        admissionInfo: '',
        dischargeDiagnosis: '',
        dischargeSummary: '',
        notes: '',
        isHospitalized: false,
        isInWard: false
      }
    });
  },

  // 编辑记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.treatmentRecords.find(r => r._id === id);
    if (!record) return;
    this.setData({
      showDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordDateTimestamp: record.recordDate ? new Date(record.recordDate).getTime() : Date.now(),
      form: {
        recordDate: record.recordDate || '',
        recordType: record.recordType || 'medication',
        treatmentPlan: record.treatmentPlan || '',
        medicationName: record.medicationName || '',
        dosage: record.dosage || '',
        medicationTime: record.medicationTime || '',
        admissionInfo: record.admissionInfo || '',
        dischargeDiagnosis: record.dischargeDiagnosis || '',
        dischargeSummary: record.dischargeSummary || '',
        notes: record.notes || '',
        isHospitalized: record.isHospitalized || false,
        isInWard: record.isInWard || false
      }
    });
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除', content: '确定要删除这条治疗记录吗？',
      confirmText: '删除', confirmColor: '#ff4757', cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...', mask: true });
        try {
          await wx.cloud.database().collection('treatmentRecords').doc(id).remove();
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadRecords();
          const app = getApp();
          if (app.globalData) app.globalData.needRefreshCalendar = true;
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

  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  selectRecordType(e) {
    this.setData({ 'form.recordType': e.currentTarget.dataset.value });
  },

  toggleBool(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: !this.data.form[field] });
  },

  selectSuggestion(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: value });
  },

  // 记录日期选择器
  showRecordDatePicker() { this.setData({ recordDatePickerVisible: true }); },
  onRecordDateConfirm(e) {
    const date = new Date(e.detail.value);
    this.setData({ 'form.recordDate': this.formatDate(date), recordDateTimestamp: date.getTime(), recordDatePickerVisible: false });
  },
  onRecordDateCancel() { this.setData({ recordDatePickerVisible: false }); },
  onRecordDateVisibleChange(e) { this.setData({ recordDatePickerVisible: e.detail.visible }); },

  // 用药时间选择器
  onMedicationTimeChange(e) {
    this.setData({ 'form.medicationTime': e.detail.value });
  },

  async saveRecord() {
    const { form, isEditMode, editingRecordId, openid, currentProfileId } = this.data;
    if (!form.recordDate) {
      wx.showToast({ title: '请选择记录日期', icon: 'none' }); return;
    }
    if (form.recordType === 'medication') {
      if (!form.treatmentPlan.trim() && !form.medicationName.trim()) {
        wx.showToast({ title: '请填写治疗方案或用药名称', icon: 'none' }); return;
      }
    } else {
      if (!form.dischargeDiagnosis.trim()) {
        wx.showToast({ title: '请填写出院诊断', icon: 'none' }); return;
      }
    }
    wx.showLoading({ title: isEditMode ? '保存中...' : '添加中...', mask: true });
    try {
      const db = wx.cloud.database();
      const data = {
        openid, profileId: currentProfileId,
        date: form.recordDate,
        recordDate: form.recordDate,
        recordType: form.recordType,
        treatmentPlan: form.treatmentPlan.trim(),
        medicationName: form.medicationName.trim(),
        dosage: form.dosage.trim(),
        medicationTime: form.medicationTime,
        admissionInfo: form.admissionInfo.trim(),
        dischargeDiagnosis: form.dischargeDiagnosis.trim(),
        dischargeSummary: form.dischargeSummary.trim(),
        notes: form.notes.trim(),
        isHospitalized: form.isHospitalized,
        isInWard: form.isInWard,
        updateTime: db.serverDate()
      };
      if (isEditMode) {
        await db.collection('treatmentRecords').doc(editingRecordId).update({ data });
      } else {
        data.createTime = db.serverDate();
        await db.collection('treatmentRecords').add({ data });
      }
      wx.showToast({ title: isEditMode ? '保存成功' : '添加成功', icon: 'success' });
      this.setData({ showDialog: false });
      this.loadRecords();
      const app = getApp();
      if (app.globalData) app.globalData.needRefreshCalendar = true;
    } catch (err) {
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  navigateBack() { wx.navigateBack(); },

  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png';
    const res = await wx.cloud.getTempFileURL({ fileList: [fileID] });
    return { title: '暖白记事本 - 健康管理小程序', path: '/pages/daily-record/index', imageUrl: res.fileList[0].tempFileURL };
  }
});
