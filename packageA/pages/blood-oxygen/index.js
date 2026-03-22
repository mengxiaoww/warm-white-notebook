// 血氧记录页面 - 多次记录模式
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

    // 血氧记录列表
    bloodOxygenRecords: [],

    // 统计数据
    avgSpo2: 0,
    avgHeartRate: 0,

    // 血氧记录弹窗
    showRecordDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 血氧记录表单
    recordForm: {
      time: '',
      spo2: '',        // 血氧饱和度
      heartRate: '',   // 心率
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
      this.loadBloodOxygenRecords();
    }, 300);
  },

  onShow() {
    if (this.data.openid && this.data.currentProfileId) {
      this.loadBloodOxygenRecords();
    }

    // 检查是否需要刷新数据
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.loadBloodOxygenRecords();
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

    console.log('血氧记录页面 - 获取用户信息:', {
      openid: openid ? '已获取' : '未获取',
      currentProfileId
    });

    if (!openid) {
      wx.showModal({
        title: '提示',
        content: '请先去【我的】登录',
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

  // 加载血氧记录
  async loadBloodOxygenRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) return;

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 查询当前日期的血氧记录
      const res = await db.collection('bloodOxygens')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('createTime', 'desc')
        .get();

      console.log('血氧记录查询结果:', res.data.length, '条');

      // 计算统计数据
      let totalSpo2 = 0;
      let totalHeartRate = 0;
      let spo2Count = 0;
      let heartRateCount = 0;

      res.data.forEach(item => {
        if (item.spo2) {
          totalSpo2 += Number(item.spo2);
          spo2Count++;
        }
        if (item.heartRate) {
          totalHeartRate += Number(item.heartRate);
          heartRateCount++;
        }
      });

      const avgSpo2 = spo2Count > 0 ? (totalSpo2 / spo2Count).toFixed(1) : 0;
      const avgHeartRate = heartRateCount > 0 ? Math.round(totalHeartRate / heartRateCount) : 0;

      this.setData({
        bloodOxygenRecords: res.data,
        avgSpo2,
        avgHeartRate
      });

    } catch (err) {
      console.error('加载血氧记录失败:', err);
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

    this.loadBloodOxygenRecords();
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

  // 添加血氧记录
  addRecord() {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.setData({
      showRecordDialog: true,
      isEditMode: false,
      editingRecordId: '',
      recordForm: {
        time: timeStr,
        spo2: '',
        heartRate: '',
        notes: ''
      }
    });
  },

  // 编辑血氧记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.bloodOxygenRecords.find(r => r._id === id);

    if (!record) return;

    this.setData({
      showRecordDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordForm: {
        time: record.time || '',
        spo2: record.spo2 || '',
        heartRate: record.heartRate || '',
        notes: record.notes || ''
      }
    });
  },

  // 删除血氧记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.bloodOxygenRecords.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条血氧记录吗？`,
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
          await db.collection('bloodOxygens').doc(id).remove();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          this.loadBloodOxygenRecords();

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

  // 保存血氧记录
  async saveRecord() {
    const { recordForm, selectedDate, openid, currentProfileId, isEditMode, editingRecordId } = this.data;

    // 验证：必须填写血氧饱和度
    if (!recordForm.spo2) {
      wx.showToast({
        title: '请填写血氧饱和度',
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
        spo2: recordForm.spo2 ? parseFloat(recordForm.spo2) : null,
        heartRate: recordForm.heartRate ? parseInt(recordForm.heartRate) : null,
        notes: recordForm.notes || '',
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新现有记录
        await db.collection('bloodOxygens').doc(editingRecordId).update({
          data: saveData
        });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        // 新增记录
        await db.collection('bloodOxygens').add({
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

      this.loadBloodOxygenRecords();

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
      // 只允许数字和一个小数点
      value = value.replace(/[^0-9.]/g, '');

      // 确保只有一个小数点
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }

      // 整数部分限制3位，小数部分限制1位
      if (parts.length > 1) {
        const integerPart = parts[0].substring(0, 3);
        const decimalPart = parts[1].substring(0, 1);
        value = integerPart + '.' + decimalPart;
      } else if (value.length > 3) {
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
    const record = this.data.bloodOxygenRecords.find(r => r._id === id);

    if (!record) return;

    // 构建详情文本
    let detailText = `时间：${record.time}\n`;
    if (record.spo2) detailText += `血氧饱和度：${record.spo2}%\n`;
    if (record.heartRate) detailText += `心率：${record.heartRate} 次/分\n`;
    if (record.notes) detailText += `备注：${record.notes}`;

    wx.showModal({
      title: '血氧记录详情',
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
