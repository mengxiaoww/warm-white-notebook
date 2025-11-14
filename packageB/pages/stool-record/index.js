const app = getApp();

Page({
  data: {
    // 页面数据
    openid: '',
    currentProfileId: '',
    selectedDate: '',
    selectedDateTimestamp: Date.now(),

    // 日期选择器
    datePickerVisible: false,

    // 粪便记录列表
    stoolRecords: [],
    hasAbnormal: false,

    // 粪便记录弹窗
    showStoolDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 粪便记录表单
    stoolForm: {
      time: '',
      type: '',
      color: '',
      consistency: '',
      hasBlood: false,
      hasMucus: false,
      notes: ''
    },


    // 选择器选项
    typeOptions: [
      { label: '正常', value: '正常' },
      { label: '条状', value: '条状' },
      { label: '块状', value: '块状' },
      { label: '糊状', value: '糊状' },
      { label: '水样', value: '水样' },
      { label: '干燥', value: '干燥' }
    ],

    colorOptions: [
      { label: '黄褐色', value: '黄褐色' },
      { label: '褐色', value: '褐色' },
      { label: '深褐色', value: '深褐色' },
      { label: '绿色', value: '绿色' },
      { label: '黄色', value: '黄色' },
      { label: '黑色', value: '黑色' },
      { label: '红色', value: '红色' }
    ],

    consistencyOptions: [
      { label: '正常', value: '正常' },
      { label: '偏软', value: '偏软' },
      { label: '偏硬', value: '偏硬' },
      { label: '很软', value: '很软' },
      { label: '很硬', value: '很硬' }
    ],

    // 选择器状态
    showTypePicker: false,
    showColorPicker: false,
    showConsistencyPicker: false
  },

  onLoad(options) {
    // 设置今天的日期
    const today = new Date();
    const dateStr = this.formatDate(today);

    // 如果从日历跳转过来，使用传入的日期
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

    // 🔧 修复：延迟加载数据，确保 app.globalData.currentProfile 已初始化
    setTimeout(() => {
      this.getUserInfo();
      this.loadStoolRecords();
    }, 300);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadStoolRecords();
    }
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

    console.log('排便记录页面 - 获取用户信息:', {
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

  // 加载粪便记录
  async loadStoolRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) return;

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 查询当前日期的粪便记录
      const res = await db.collection('stoolRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('createTime', 'desc')
        .get();



      // 检查是否有异常和处理备注预览
      let hasAbnormal = false;
      const processedData = res.data.map(item => {
        if (item.hasBlood || item.hasMucus) {
          hasAbnormal = true;
        }
        // 处理备注预览
        if (item.notes && item.notes.length > 30) {
          item.notesPreview = item.notes.substring(0, 30) + '...';
        } else {
          item.notesPreview = item.notes || '';
        }
        return item;
      });

      this.setData({
        stoolRecords: processedData,
        hasAbnormal: hasAbnormal
      });

    } catch (err) {

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

    // 重新加载数据
    this.loadStoolRecords();
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

  // 添加粪便记录
  addStoolRecord() {
    // 设置默认时间为当前时间
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.setData({
      showStoolDialog: true,
      isEditMode: false,
      editingRecordId: '',
      stoolForm: {
        time: timeStr,
        type: '正常',        // 默认选中正常状态
        color: '黄褐色',      // 默认选中正常颜色
        consistency: '正常',  // 默认选中正常质地
        hasBlood: false,
        hasMucus: false,
        notes: ''
      }
    });
  },

  // 编辑粪便记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.stoolRecords.find(r => r._id === id);

    if (!record) return;

    this.setData({
      showStoolDialog: true,
      isEditMode: true,
      editingRecordId: id,
      stoolForm: {
        time: record.time || '',
        type: record.type || '',
        color: record.color || '',
        consistency: record.consistency || '',
        hasBlood: record.hasBlood || false,
        hasMucus: record.hasMucus || false,
        notes: record.notes || ''
      }
    });
  },

  // 删除粪便记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.stoolRecords.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条排便记录吗？`,
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

          await db.collection('stoolRecords').doc(id).remove();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          // 重新加载数据
          this.loadStoolRecords();

          // 通知首页刷新日历和数据
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
            app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
          }

        } catch (err) {

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

  // 关闭粪便记录弹窗
  closeStoolDialog() {
    this.setData({
      showStoolDialog: false,
      // 同时关闭所有选择器
      showTimePicker: false,
      showTypePicker: false,
      showColorPicker: false,
      showConsistencyPicker: false
    });
  },

  // 弹窗显示状态变化
  onDialogVisibleChange(e) {
    this.setData({
      showStoolDialog: e.detail.visible
    });

    // 如果弹窗关闭，同时关闭所有子弹窗
    if (!e.detail.visible) {
      this.setData({
        showTimePicker: false,
        showTypePicker: false,
        showColorPicker: false,
        showConsistencyPicker: false
      });
    }
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`stoolForm.${field}`]: value
    });
  },

  // 显示时间选择器
  // 原生时间选择器change事件
  onTimePickerChange(e) {
    this.setData({
      'stoolForm.time': e.detail.value
    });
  },

  // 切换开关
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`stoolForm.${field}`]: value
    });
  },

  // 性状选择 - 直接在表单中选择
  onTypeSelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'stoolForm.type': value
    });
  },

  // 颜色选择 - 直接在表单中选择
  onColorSelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'stoolForm.color': value
    });
  },

  // 硬度选择 - 直接在表单中选择
  onConsistencySelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'stoolForm.consistency': value
    });
  },

  // 保存粪便记录
  async saveStoolRecord() {
    const { stoolForm, isEditMode, editingRecordId, openid, currentProfileId, selectedDate } = this.data;

    // 验证必填字段
    if (!stoolForm.time.trim()) {
      wx.showToast({
        title: '请选择记录时间',
        icon: 'none'
      });
      return;
    }

    if (!stoolForm.type.trim()) {
      wx.showToast({
        title: '请选择粪便性状',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: isEditMode ? '保存中...' : '添加中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 计算当日排便次数
      const todayRecords = await db.collection('stoolRecords')
        .where({
          openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      let frequency = todayRecords.data.length;
      if (!isEditMode) {
        frequency += 1; // 新增记录，次数+1
      }

      const recordData = {
        openid,
        profileId: currentProfileId,
        date: selectedDate,
        time: stoolForm.time.trim(),
        type: stoolForm.type.trim(),
        color: stoolForm.color.trim(),
        consistency: stoolForm.consistency.trim(),
        frequency: frequency,
        hasBlood: stoolForm.hasBlood,
        hasMucus: stoolForm.hasMucus,
        notes: stoolForm.notes.trim(),
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新现有记录
        await db.collection('stoolRecords')
          .doc(editingRecordId)
          .update({
            data: recordData
          });
      } else {
        // 添加新记录
        recordData.createTime = db.serverDate();
        await db.collection('stoolRecords').add({
          data: recordData
        });
      }

      wx.showToast({
        title: isEditMode ? '保存成功' : '添加成功',
        icon: 'success'
      });

      // 关闭弹窗
      this.setData({
        showStoolDialog: false
      });

      // 重新加载数据
      this.loadStoolRecords();

      // 通知首页刷新日历和数据
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
      }

    } catch (err) {

      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
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