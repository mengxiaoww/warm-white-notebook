// pages/virus-record/index.js
const app = getApp()

Page({
  data: {
    records: [],
    showAddPopup: false,
    showDetailPopup: false,
    selectedRecord: null,

    // 表单数据
    formData: {
      date: '',
      time: '',
      ebvDNA: '',
      ebvResult: '',
      cmvDNA: '',
      cmvResult: '',
      testMethod: '',
      hospital: '',
      notes: ''
    },

    // 选择器状态
    showDatePicker: false,
    showTimePicker: false,
    showEbvResultPicker: false,
    showCmvResultPicker: false,
    showTestMethodPicker: false,

    // 选择器选项
    ebvResultOptions: [
      { value: '阴性', label: '阴性' },
      { value: '阳性', label: '阳性' },
      { value: '弱阳性', label: '弱阳性' },
      { value: '强阳性', label: '强阳性' }
    ],
    cmvResultOptions: [
      { value: '阴性', label: '阴性' },
      { value: '阳性', label: '阳性' },
      { value: '弱阳性', label: '弱阳性' },
      { value: '强阳性', label: '强阳性' }
    ],
    testMethodOptions: [
      { value: 'PCR', label: 'PCR检测' },
      { value: '血清学', label: '血清学检测' },
      { value: '免疫荧光', label: '免疫荧光' },
      { value: '酶联免疫', label: '酶联免疫检测' }
    ],

    // 当前选中的选项
    currentEbvResult: '',
    currentCmvResult: '',
    currentTestMethod: '',

    // 今日统计
    todayStats: {
      count: 0,
      hasAbnormal: false,
      abnormalInfo: ''
    },

    // 页面状态
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

    console.log('病毒记录页面 - 获取用户信息:', {
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

  // 初始化页面
  initPage() {
    const today = this.formatDate(new Date());
    const now = this.formatTime(new Date());

    this.setData({
      'formData.date': today,
      'formData.time': now
    });
  },

  // 加载数据
  async loadData() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {
      this.setData({ records: [] });
      return;
    }

    const { openid, currentProfileId } = userInfo;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('virusRecords')
        .where({
          openid: openid,
          profileId: currentProfileId
        })
        .orderBy('date', 'desc')
        .orderBy('time', 'desc')
        .get();

      // 处理记录数据
      const processedRecords = res.data.map(record => ({
        ...record,
        hasAbnormal: record.ebvResult === '阳性' || record.ebvResult === '强阳性' ||
          record.cmvResult === '阳性' || record.cmvResult === '强阳性',
        displayDate: this.formatDisplayDate(record.date),
        notesPreview: record.notes ? (record.notes.length > 20 ? record.notes.substring(0, 20) + '...' : record.notes) : ''
      }));

      // 计算今日统计
      const today = this.formatDate(new Date());
      const todayRecords = processedRecords.filter(record => record.date === today);
      const hasAbnormal = todayRecords.some(record => record.hasAbnormal);
      const abnormalList = [];

      todayRecords.forEach(record => {
        if (record.ebvResult === '阳性' || record.ebvResult === '强阳性') {
          abnormalList.push('EB病毒阳性');
        }
        if (record.cmvResult === '阳性' || record.cmvResult === '强阳性') {
          abnormalList.push('巨细胞病毒阳性');
        }
      });

      this.setData({
        records: processedRecords,
        todayStats: {
          count: todayRecords.length,
          hasAbnormal: hasAbnormal,
          abnormalInfo: abnormalList.join('、')
        }
      });

    } catch (error) {

      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 显示添加弹窗
  showAddDialog() {
    const userInfo = this.getUserInfo();

    if (!userInfo) {
      return;
    }

    this.initPage();
    this.setData({
      showAddPopup: true,
      isEditing: false,
      editingId: null
    });
  },

  // 关闭添加弹窗
  closeAddDialog() {
    this.setData({
      showAddPopup: false,
      showDatePicker: false,
      showTimePicker: false,
      showEbvResultPicker: false,
      showCmvResultPicker: false,
      showTestMethodPicker: false
    });
  },

  // 输入框事件
  onEbvDNAInput(e) {
    this.setData({ 'formData.ebvDNA': e.detail.value });
  },

  onCmvDNAInput(e) {
    this.setData({ 'formData.cmvDNA': e.detail.value });
  },

  onHospitalInput(e) {
    this.setData({ 'formData.hospital': e.detail.value });
  },

  onNotesInput(e) {
    this.setData({ 'formData.notes': e.detail.value });
  },

  // 日期时间选择
  showDateSelector() {
    this.setData({ showDatePicker: true });
  },

  onDateConfirm(e) {
    this.setData({
      'formData.date': e.detail.value,
      showDatePicker: false
    });
  },

  onDateCancel() {
    this.setData({ showDatePicker: false });
  },

  showTimeSelector() {
    this.setData({ showTimePicker: true });
  },

  onTimeConfirm(e) {
    this.setData({
      'formData.time': e.detail.value,
      showTimePicker: false
    });
  },

  onTimeCancel() {
    this.setData({ showTimePicker: false });
  },

  // EB病毒结果选择
  showEbvResultSelector() {
    this.setData({
      showEbvResultPicker: true,
      currentEbvResult: this.data.formData.ebvResult
    });
  },

  selectEbvResult(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.ebvResult': value,
      currentEbvResult: value,
      showEbvResultPicker: false
    });
  },

  closeEbvResultPicker() {
    this.setData({ showEbvResultPicker: false });
  },

  // 巨细胞病毒结果选择
  showCmvResultSelector() {
    this.setData({
      showCmvResultPicker: true,
      currentCmvResult: this.data.formData.cmvResult
    });
  },

  selectCmvResult(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.cmvResult': value,
      currentCmvResult: value,
      showCmvResultPicker: false
    });
  },

  closeCmvResultPicker() {
    this.setData({ showCmvResultPicker: false });
  },

  // 检测方法选择
  showTestMethodSelector() {
    this.setData({
      showTestMethodPicker: true,
      currentTestMethod: this.data.formData.testMethod
    });
  },

  selectTestMethod(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.testMethod': value,
      currentTestMethod: value,
      showTestMethodPicker: false
    });
  },

  closeTestMethodPicker() {
    this.setData({ showTestMethodPicker: false });
  },

  // 保存记录
  async saveRecord() {
    const { formData, isEditing, editingId } = this.data;
    // 必填项校验
    if (!formData.date || !formData.time || !formData.testMethod || !formData.hospital || !formData.ebvDNA || !formData.ebvResult || !formData.cmvDNA || !formData.cmvResult) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
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
      const recordData = {
        ...formData,
        openid: openid,
        profileId: currentProfileId,
        updateTime: db.serverDate()
      };

      if (isEditing && editingId) {
        await db.collection('virusRecords').doc(editingId).update({
          data: recordData
        });
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        await db.collection('virusRecords').add({
          data: {
            ...recordData,
            createTime: db.serverDate()
          }
        });
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }

      this.closeAddDialog();
      this.loadData();

    } catch (error) {

      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示详情
  showDetail(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r._id === id);
    if (record) {
      this.setData({
        selectedRecord: record,
        showDetailPopup: true
      });
    }
  },

  // 关闭详情弹窗
  closeDetailDialog() {
    this.setData({
      showDetailPopup: false,
      selectedRecord: null
    });
  },

  // 编辑记录
  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r._id === id);

    if (record) {
      this.setData({
        formData: {
          date: record.date,
          time: record.time,
          ebvDNA: record.ebvDNA || '',
          ebvResult: record.ebvResult || '',
          cmvDNA: record.cmvDNA || '',
          cmvResult: record.cmvResult || '',
          testMethod: record.testMethod || '',
          hospital: record.hospital || '',
          notes: record.notes || ''
        },
        isEditing: true,
        editingId: id,
        showAddPopup: true,
        showDetailPopup: false
      });
    }
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条病毒检测记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...', mask: true });

            const db = wx.cloud.database();
            await db.collection('virusRecords').doc(id).remove();

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            this.setData({ showDetailPopup: false });
            this.loadData();

          } catch (error) {

            wx.showToast({
              title: '删除失败',
              icon: 'error'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 格式化时间
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 格式化显示日期
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

});