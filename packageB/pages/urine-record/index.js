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

    // 尿量记录列表
    urineRecords: [],
    totalVolume: 0,

    // 尿量记录弹窗
    showUrineDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 尿量记录表单
    urineForm: {
      time: '',
      volume: '',
      color: '',
      clarity: '',
      notes: ''
    },

    // 详情弹窗
    showRecordDetailPopup: false,
    selectedRecord: null,

    // 选择器选项
    colorOptions: [
      { label: '淡黄色', value: '淡黄色' },
      { label: '黄色', value: '黄色' },
      { label: '深黄色', value: '深黄色' },
      { label: '橙色', value: '橙色' },
      { label: '红色', value: '红色' },
      { label: '褐色', value: '褐色' },
      { label: '无色', value: '无色' }
    ],

    clarityOptions: [
      { label: '清澈', value: '清澈' },
      { label: '轻微浑浊', value: '轻微浑浊' },
      { label: '浑浊', value: '浑浊' },
      { label: '非常浑浊', value: '非常浑浊' }
    ],

    // 选择器状态
    showColorPicker: false,
    showClarityPicker: false,

    // 输入框焦点控制
    focusVolumeInput: false,

    // 弹窗输入框焦点索引
    popupFocusIndex: -1
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
      this.loadUrineRecords();
    }, 300);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadUrineRecords();
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

    console.log('尿量记录页面 - 获取用户信息:', {
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

  // 加载尿量记录
  async loadUrineRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) return;

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 查询当前日期的尿量记录
      const res = await db.collection('urineRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('createTime', 'desc')
        .get();



      // 计算总尿量和处理备注预览
      let totalVolume = 0;
      const processedData = res.data.map(item => {
        totalVolume += item.volume || 0;
        // 处理备注预览
        if (item.notes && item.notes.length > 30) {
          item.notesPreview = item.notes.substring(0, 30) + '...';
        } else {
          item.notesPreview = item.notes || '';
        }
        return item;
      });

      this.setData({
        urineRecords: processedData,
        totalVolume: totalVolume
      });

    } catch (err) {

      wx.showToast({
//         title: '加载失败，请重试',
//         icon: 'error'
//       });
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
    this.loadUrineRecords();
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

  // 添加尿量记录
  addUrineRecord() {
    // 设置默认时间为当前时间
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.setData({
      showUrineDialog: true,
      isEditMode: false,
      editingRecordId: '',
      urineForm: {
        time: timeStr,
        volume: '',
        color: '淡黄色',    // 默认选中正常颜色
        clarity: '清澈',   // 默认选中正常清晰度
        notes: ''
      }
    }, () => {
      // 弹窗打开后，延迟一下让尿量输入框获得焦点
      setTimeout(() => {
        // 使用微信小程序的API设置输入框焦点
        this.setData({
          focusVolumeInput: true
        });
      }, 300);
    });
  },

  // 编辑尿量记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.urineRecords.find(r => r._id === id);

    if (!record) return;

    this.setData({
      showUrineDialog: true,
      isEditMode: true,
      editingRecordId: id,
      urineForm: {
        time: record.time || '',
        volume: record.volume || '',
        color: record.color || '',
        clarity: record.clarity || '',
        notes: record.notes || ''
      }
    });
  },

  // 删除尿量记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.urineRecords.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条尿量记录吗？`,
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

          await db.collection('urineRecords').doc(id).remove();

          wx.showToast({
//             title: '删除成功',
//             icon: 'success'
//           });

          // 重新加载数据
          this.loadUrineRecords();

          // 通知首页刷新日历和数据
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
            app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
          }

        } catch (err) {

          wx.showToast({
//             title: '删除失败，请重试',
//             icon: 'error'
//           });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // 关闭尿量记录弹窗
  closeUrineDialog() {
    this.setData({
      showUrineDialog: false
    });
  },

  // 弹窗显示状态变化
  onDialogVisibleChange(e) {
    this.setData({
      showUrineDialog: e.detail.visible
    });

    // 如果弹窗关闭，同时关闭所有子弹窗
    if (!e.detail.visible) {
      this.setData({
        showColorPicker: false,
        showClarityPicker: false
      });
    }
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`urineForm.${field}`]: value
    });
  },

  // 尿量输入框失去焦点时重置焦点状态
  onVolumeInputBlur() {
    this.setData({
      focusVolumeInput: false
    });
  },

  // 颜色选择 - 直接在表单中选择
  onColorSelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'urineForm.color': value
    });
  },

  // 清澈度选择 - 直接在表单中选择
  onClaritySelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'urineForm.clarity': value
    });
  },

  // 原生时间选择器change事件
  onTimePickerChange(e) {
    this.setData({
      'urineForm.time': e.detail.value
    });
  },

  // 保存尿量记录
  async saveUrineRecord() {
    const { urineForm, isEditMode, editingRecordId, openid, currentProfileId, selectedDate } = this.data;

    // 验证必填字段
    if (!urineForm.time.trim()) {
      wx.showToast({
//         title: '请输入记录时间',
//         icon: 'none'
//       });
      return;
    }

    if (!urineForm.volume || urineForm.volume < 0) {
      wx.showToast({
//         title: '尿量不能为负数',
//         icon: 'none'
//       });
      return;
    }

    wx.showLoading({
      title: isEditMode ? '保存中...' : '添加中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 计算当日排尿次数
      const todayRecords = await db.collection('urineRecords')
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
        time: urineForm.time.trim(),
        volume: Number(urineForm.volume),
        color: urineForm.color.trim(),
        clarity: urineForm.clarity.trim(),
        frequency: frequency,
        notes: urineForm.notes.trim(),
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新现有记录
        await db.collection('urineRecords')
          .doc(editingRecordId)
          .update({
            data: recordData
          });
      } else {
        // 添加新记录
        recordData.createTime = db.serverDate();
        await db.collection('urineRecords').add({
          data: recordData
        });
      }

      wx.showToast({
//         title: isEditMode ? '保存成功' : '添加成功',
//         icon: 'success'
//       });

      // 关闭弹窗
      this.setData({
        showUrineDialog: false
      });

      // 重新加载数据
      this.loadUrineRecords();

      // 通知首页刷新日历和数据
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
      }

    } catch (err) {

      wx.showToast({
//         title: '保存失败，请重试',
//         icon: 'error'
//       });
    } finally {
      wx.hideLoading();
    }
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 显示记录详情
  showRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.urineRecords.find(r => r._id === id);

    if (record) {
      this.setData({
        selectedRecord: record,
        showRecordDetailPopup: true
      });
    }
  },

  // 关闭记录详情
  closeRecordDetail() {
    this.setData({
      showRecordDetailPopup: false,
      selectedRecord: null
    });
  },

  // 详情弹窗显示状态变化
  onRecordDetailVisibleChange(e) {
    this.setData({
      showRecordDetailPopup: e.detail.visible
    });

    if (!e.detail.visible) {
      this.setData({
        selectedRecord: null
      });
    }
  },

  // 设置弹窗输入框焦点（点击容器时触发）
  setPopupFocus(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      popupFocusIndex: index
    });
  },

  // 弹窗输入框获得焦点
  onPopupInputFocus(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      popupFocusIndex: index
    });
  },

  // 弹窗输入框失去焦点
  onPopupInputBlur(e) {
    // 立即清除焦点索引，避免placeholder浮动bug
    // catchtap已经能防止按钮点击时的冲突
    const index = parseInt(e.currentTarget.dataset.index);
    if (this.data.popupFocusIndex === index) {
      this.setData({
        popupFocusIndex: -1
      });
    }
  },

  // 弹窗中点击"下一项"按钮
  goToNextPopupInput(e) {
    const currentIndex = parseInt(e.currentTarget.dataset.index);

    // 隐藏浮动按钮，让键盘收起
    // 用户可以自然地点击下一个输入框
    this.setData({
      popupFocusIndex: -1
    });
  },

  // 弹窗中点击"完成"按钮
  completePopupInput() {
    this.setData({
      popupFocusIndex: -1
    });
    // 输入完成提示已移除
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