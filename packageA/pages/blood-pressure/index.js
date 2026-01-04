// 血压记录页面 - 多次记录模式
const app = getApp();
const { getTodayLocalDate } = require("../../../utils/util.js");

Page({
  data: {
    // 页面数据
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),

    // 日期选择器
    datePickerVisible: false,

    // 血压记录列表
    bloodPressureRecords: [],

    // 统计数据
    avgSystolic: 0,
    avgDiastolic: 0,

    // 血压记录弹窗
    showRecordDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 血压记录表单
    recordForm: {
      time: '',
      systolic: '',    // 高压/收缩压
      diastolic: '',   // 低压/舒张压
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
      this.loadBloodPressureRecords();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadBloodPressureRecords();
    }

    // 检查是否需要刷新数据
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.loadBloodPressureRecords();
    }
  },

  // 获取用户信息
  getUserInfo() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    let currentProfileId = '';
    if (app.globalData && app.globalData.currentProfile && app.globalData.currentProfile.profileId) {
      currentProfileId = app.globalData.currentProfile.profileId;
    } else if (app.getCurrentProfileId) {
      currentProfileId = app.getCurrentProfileId();
    }

    console.log('血压记录页面 - 获取用户信息:', {
      openid: openid ? '已获取' : '未获取',
      currentProfileId
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
      return;
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
      return;
    }

    this.setData({
      openid,
      currentProfileId
    });
  },

  // 加载血压记录
  async loadBloodPressureRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) return;

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 查询当前日期的血压记录
      const res = await db.collection('bloodPressures')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('createTime', 'desc')
        .get();

      console.log('血压记录查询结果:', res.data.length, '条');

      // 计算统计数据
      let totalSystolic = 0;
      let totalDiastolic = 0;
      let systolicCount = 0;
      let diastolicCount = 0;

      res.data.forEach(item => {
        if (item.systolic) {
          totalSystolic += Number(item.systolic);
          systolicCount++;
        }
        if (item.diastolic) {
          totalDiastolic += Number(item.diastolic);
          diastolicCount++;
        }
      });

      const avgSystolic = systolicCount > 0 ? Math.round(totalSystolic / systolicCount) : 0;
      const avgDiastolic = diastolicCount > 0 ? Math.round(totalDiastolic / diastolicCount) : 0;

      this.setData({
        bloodPressureRecords: res.data,
        avgSystolic,
        avgDiastolic
      });

    } catch (err) {
      console.error('加载血压记录失败:', err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({
      datePickerVisible: true
    });
  },

  // 日期选择确认
  onDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      selectedDate: dateStr,
      selectedDateTimestamp: date.getTime(),
      datePickerVisible: false
    });

    this.loadBloodPressureRecords();
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({
      datePickerVisible: false
    });
  },

  // 日期选择器显示状态变化
  onDateVisibleChange(e) {
    this.setData({
      datePickerVisible: e.detail.visible
    });
  },

  // 添加血压记录
  addRecord() {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.setData({
      showRecordDialog: true,
      isEditMode: false,
      editingRecordId: '',
      recordForm: {
        time: timeStr,
        systolic: '',
        diastolic: '',
        notes: ''
      }
    });
  },

  // 编辑血压记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.bloodPressureRecords.find(r => r._id === id);

    if (!record) return;

    this.setData({
      showRecordDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordForm: {
        time: record.time || '',
        systolic: record.systolic || '',
        diastolic: record.diastolic || '',
        notes: record.notes || ''
      }
    });
  },

  // 删除血压记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.bloodPressureRecords.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条血压记录吗？`,
      confirmText: '删除',
      confirmColor: '#ff4757',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({
          title: '删除中...',
          mask: true
        });

        try {
          const db = wx.cloud.database();
          await db.collection('bloodPressures').doc(id).remove();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          this.loadBloodPressureRecords();

          // 通知首页刷新
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
            app.globalData.needRefreshData = true;
          }

        } catch (err) {
          console.error('删除失败:', err);
          wx.showToast({
            title: '删除失败，请重试',
            icon: 'error'
          });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // 保存血压记录
  async saveRecord() {
    const { recordForm, selectedDate, openid, currentProfileId, isEditMode, editingRecordId } = this.data;

    // 验证：必须填写高压和低压
    if (!recordForm.systolic || !recordForm.diastolic) {
      wx.showToast({
        title: '请填写高压和低压',
        icon: 'none'
      });
      return;
    }

    // 验证：时间必填
    if (!recordForm.time) {
      wx.showToast({
        title: '请选择记录时间',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: isEditMode ? '更新中...' : '保存中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 构建保存数据
      const saveData = {
        time: recordForm.time,
        systolic: recordForm.systolic ? parseInt(recordForm.systolic) : null,
        diastolic: recordForm.diastolic ? parseInt(recordForm.diastolic) : null,
        notes: recordForm.notes || '',
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新现有记录
        await db.collection('bloodPressures').doc(editingRecordId).update({
          data: saveData
        });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        // 新增记录
        await db.collection('bloodPressures').add({
          data: {
            ...saveData,
            openid,
            profileId: currentProfileId,
            date: selectedDate,
            createTime: db.serverDate()
          }
        });

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }

      // 关闭弹窗，刷新列表
      this.setData({
        showRecordDialog: false
      });

      this.loadBloodPressureRecords();

      // 通知首页刷新
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true;
      }

    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 关闭记录弹窗
  closeRecordDialog() {
    this.setData({
      showRecordDialog: false
    });
  },

  // 弹窗显示状态变化
  onDialogVisibleChange(e) {
    this.setData({
      showRecordDialog: e.detail.visible
    });
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    let value = e.detail.value;

    // 数字输入框限制
    if (field !== 'notes' && field !== 'time') {
      // 只允许数字
      value = value.replace(/[^0-9]/g, '');

      // 限制3位数字
      if (value.length > 3) {
        value = value.substring(0, 3);
      }
    }

    this.setData({
      [`recordForm.${field}`]: value
    });
  },

  // 时间选择器change事件
  onTimePickerChange(e) {
    this.setData({
      'recordForm.time': e.detail.value
    });
  },

  // 查看记录详情
  showRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.bloodPressureRecords.find(r => r._id === id);

    if (!record) return;

    // 构建详情文本
    let detailText = `时间：${record.time}\n`;
    if (record.systolic) detailText += `高压：${record.systolic} mmHg\n`;
    if (record.diastolic) detailText += `低压：${record.diastolic} mmHg\n`;
    if (record.notes) detailText += `备注：${record.notes}`;

    wx.showModal({
      title: '血压记录详情',
      content: detailText,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/daily-record/index'
        });
      }
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 分享功能
  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png';
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    });

    return {
      title: '暖白记事本 - 健康管理小程序',
      path: '/pages/daily-record/index',
      imageURL: res.fileList[0].tempFileURL
    };
  }
});
