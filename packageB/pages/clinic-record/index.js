Page({
  data: {
    // 用户信息
    openid: '',
    currentProfileId: '',

    // 日期相关
    selectedDate: '', // 当前页面选中的就诊日期
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,

    // 门诊记录列表
    clinicRecords: [],

    // 门诊记录弹窗
    showClinicDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 门诊记录表单
    clinicForm: {
      hospital: '',
      department: '',
      visitTime: '',
      doctor: '',
      doctorTitle: '',
      condition: '', // 病情描述
      diagnosis: '',
      prescription: '',
      advice: '',
      cost: '',
      followUpDate: '',
      notes: '',
      images: [] // 门诊病历照片数组
    },

    // 复诊日期选择器
    followUpDatePickerVisible: false,
    followUpDateTimestamp: Date.now(),

    // 弹窗输入框焦点索引
    popupFocusIndex: -1

  },

  onLoad(options) {
    // 如果从每日记录页面跳转过来，使用传入的日期作为默认就诊日期
    const defaultDate = options.date || this.formatDate(new Date());

    this.setData({
      selectedDate: defaultDate,
      selectedDateTimestamp: new Date(defaultDate).getTime()
    });

    // 🔧 修复：延迟加载数据，确保 app.globalData.currentProfile 已初始化
    setTimeout(() => {
      this.getUserInfo();
      this.loadClinicRecords();
    }, 300);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadClinicRecords();
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

    console.log('门诊记录 - 获取用户信息:', {
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

  // 加载门诊记录
  async loadClinicRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;

    console.log('门诊记录 - 开始加载数据:', {
      openid: openid ? '已设置' : '未设置',
      currentProfileId,
      selectedDate
    });

    if (!openid || !currentProfileId) {
      console.log('门诊记录 - 缺少必要参数，停止加载');
      return;
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 🔧 根据选中日期筛选门诊记录
      const res = await db.collection('clinicRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('createTime', 'desc')
        .get();

      console.log('门诊记录 - 查询结果:', {
        总数: res.data.length,
        查询条件: {
          openid: openid ? '已设置' : '未设置',
          profileId: currentProfileId,
          date: selectedDate
        }
      });

      this.setData({
        clinicRecords: res.data
      });

    } catch (err) {
      console.error('门诊记录 - 加载失败:', err);
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
    this.loadClinicRecords();
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

  // 添加门诊记录
  async addClinicRecord() {
    const { openid, currentProfileId } = this.data;

    // 查询最近一次的门诊记录，用于自动填充医院、科室和医生
    let lastRecord = null;
    try {
      const db = wx.cloud.database();
      const res = await db.collection('clinicRecords')
        .where({
          openid: openid,
          profileId: currentProfileId
        })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();

      if (res.data && res.data.length > 0) {
        lastRecord = res.data[0];
      }
    } catch (err) {
      console.error('查询最近门诊记录失败:', err);
    }

    this.setData({
      showClinicDialog: true,
      isEditMode: false,
      editingRecordId: '',
      clinicForm: {
        hospital: lastRecord?.hospital || '',
        department: lastRecord?.department || '',
        doctor: lastRecord?.doctor || '',
        doctorTitle: '',
        condition: '',
        diagnosis: '',
        prescription: '',
        advice: '',
        cost: '',
        followUpDate: '',
        notes: '',
        images: []
      }
    });
  },

  // 编辑门诊记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.clinicRecords.find(r => r._id === id);

    if (!record) return;

    // 计算复诊时间的timestamp
    const followUpDateTimestamp = record.followUpDate ? new Date(record.followUpDate).getTime() : Date.now();

    this.setData({
      showClinicDialog: true,
      isEditMode: true,
      editingRecordId: id,
      followUpDateTimestamp,
      clinicForm: {
        hospital: record.hospital || '',
        department: record.department || '',
        doctor: record.doctor || '',
        doctorTitle: record.doctorTitle || '',
        condition: record.condition || '',
        diagnosis: record.diagnosis || '',
        prescription: record.prescription || '',
        advice: record.advice || '',
        cost: record.cost || '',
        followUpDate: record.followUpDate || '',
        notes: record.notes || '',
        images: record.images || []
      }
    });
  },

  // 删除门诊记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.clinicRecords.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条门诊记录吗？`,
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

          await db.collection('clinicRecords').doc(id).remove();

          wx.showToast({
//             title: '删除成功',
//             icon: 'success'
//           });

          // 重新加载数据
          this.loadClinicRecords();

          // 通知首页刷新日历
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
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

  // 关闭门诊记录弹窗
  closeClinicDialog() {
    this.setData({
      showClinicDialog: false
    });
  },

  // 弹窗显示状态变化
  onDialogVisibleChange(e) {
    this.setData({
      showClinicDialog: e.detail.visible
    });
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`clinicForm.${field}`]: value
    });
  },

  // 显示复诊日期选择器
  showFollowUpDatePicker() {
    this.setData({
      followUpDatePickerVisible: true
    });
  },

  // 复诊日期选择确认
  onFollowUpDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      'clinicForm.followUpDate': dateStr,
      followUpDateTimestamp: date.getTime(),
      followUpDatePickerVisible: false
    });
  },

  // 复诊日期选择取消
  onFollowUpDateCancel() {
    this.setData({
      followUpDatePickerVisible: false
    });
  },

  // 复诊日期选择器显示状态变化
  onFollowUpDateVisibleChange(e) {
    this.setData({
      followUpDatePickerVisible: e.detail.visible
    });
  },


  // 保存门诊记录
  async saveClinicRecord() {
    const { clinicForm, isEditMode, editingRecordId, openid, currentProfileId, selectedDate } = this.data;

    // 验证必填字段 - 只有医院是必填的
    if (!clinicForm.hospital.trim()) {
      wx.showToast({
//         title: '请输入医院名称',
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

      // 🔧 使用页面选中的日期作为就诊日期
      const recordData = {
        openid,
        profileId: currentProfileId,
        date: selectedDate, // 使用左上角选中的日期作为就诊日期
        visitTime: selectedDate, // 同步visitTime字段，保持兼容性
        hospital: clinicForm.hospital.trim(),
        department: clinicForm.department.trim(),
        doctor: clinicForm.doctor.trim(),
        doctorTitle: clinicForm.doctorTitle.trim(),
        condition: clinicForm.condition.trim(), // 病情描述
        diagnosis: clinicForm.diagnosis.trim(),
        prescription: clinicForm.prescription.trim(),
        advice: clinicForm.advice.trim(),
        cost: clinicForm.cost.trim(),
        followUpDate: clinicForm.followUpDate,
        notes: clinicForm.notes.trim(),
        images: clinicForm.images || [], // 门诊病历照片
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新现有记录
        await db.collection('clinicRecords')
          .doc(editingRecordId)
          .update({
            data: recordData
          });
      } else {
        // 添加新记录
        recordData.createTime = db.serverDate();
        await db.collection('clinicRecords').add({
          data: recordData
        });
      }

      wx.showToast({
//         title: isEditMode ? '保存成功' : '添加成功',
//         icon: 'success'
//       });

      // 关闭弹窗
      this.setData({
        showClinicDialog: false
      });

      // 重新加载数据
      this.loadClinicRecords();

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



  // 弹窗输入框获得焦点
  // 设置弹窗输入框焦点（点击容器时触发）
  setPopupFocus(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      popupFocusIndex: index
    });
  },

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

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 9 - (this.data.clinicForm.images?.length || 0), // 最多9张
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      });

      if (res.tempFiles && res.tempFiles.length > 0) {
        wx.showLoading({
          title: '上传中...',
          mask: true
        });

        const uploadPromises = res.tempFiles.map(file => {
          return wx.cloud.uploadFile({
            cloudPath: `clinic-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.tempFilePath.split('.').pop()}`,
            filePath: file.tempFilePath
          });
        });

        const uploadResults = await Promise.all(uploadPromises);
        const imageUrls = uploadResults.map(result => result.fileID);

        this.setData({
          'clinicForm.images': [...(this.data.clinicForm.images || []), ...imageUrls]
        });

        wx.hideLoading();
        wx.showToast({
//           title: '上传成功',
//           icon: 'success'
//         });
      }
    } catch (err) {
      console.error('选择图片失败:', err);
      wx.hideLoading();
      wx.showToast({
//         title: '上传失败',
//         icon: 'error'
//       });
    }
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.clinicForm.images || []
    });
  },

  // 预览记录中的图片
  previewRecordImage(e) {
    const url = e.currentTarget.dataset.url;
    const images = e.currentTarget.dataset.images;
    wx.previewImage({
      current: url,
      urls: images || []
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...(this.data.clinicForm.images || [])];

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          images.splice(index, 1);
          this.setData({
            'clinicForm.images': images
          });
        }
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