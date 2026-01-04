const app = getApp();

Page({
  data: {
    // 页面数据
    openid: '',
    currentProfileId: '',
    selectedDate: '',

    // 日期选择器状态
    datePickerVisible: false,

    // 费用记录列表
    expenseRecords: [],
    totalAmount: 0,

    // 费用记录弹窗
    showExpenseDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 费用记录表单
    expenseForm: {
      amount: '',
      projectName: '',
      hospital: '',
      expenseType: '',
      notes: ''
    },

    // 选择器选项
    expenseTypeOptions: [
      { label: '检查费', value: '检查费' },
      { label: '治疗费', value: '治疗费' },
      { label: '药品费', value: '药品费' },
      { label: '住院费', value: '住院费' },
      { label: '手术费', value: '手术费' },
      { label: '护理费', value: '护理费' },
      { label: '其他', value: '其他' }
    ],

    // 弹窗输入框焦点索引
    popupFocusIndex: -1
  },

  onLoad(options) {
    // 设置今天的日期
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // 格式：YYYY-MM-DD

    // 如果从日历跳转过来，使用传入的日期
    const selectedDate = options.date || dateStr;

    this.setData({
      selectedDate: selectedDate
    });

    // 🔧 修复：延迟加载数据，确保 app.globalData.currentProfile 已初始化
    setTimeout(() => {
      this.getUserInfo();
      this.loadExpenseRecords();
    }, 300);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadExpenseRecords();
    }
  },

  // 获取用户信息
  getUserInfo() {
    const app = getApp();
    const openid = app.globalData.openid;
    const currentProfileId = app.globalData.currentProfile?._id;

    if (openid && currentProfileId) {
      this.setData({
        openid: openid,
        currentProfileId: currentProfileId
      });
    }
  },

  // 加载费用记录
  async loadExpenseRecords() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) {
      return;
    }

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 查询当天的费用记录
      const res = await db.collection('expenseRecords')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('time', 'desc')
        .get();

      let totalAmount = 0;

      // 处理费用记录数据
      const records = res.data.map(record => {
        // 累计总金额
        const amount = parseFloat(record.amount) || 0;
        totalAmount += amount;

        return {
          ...record,
          notesPreview: record.notes && record.notes.length > 20
            ? record.notes.substring(0, 20) + '...'
            : record.notes
        };
      });

      this.setData({
        expenseRecords: records,
        totalAmount: totalAmount.toFixed(2)
      });

    } catch (err) {
      console.error('加载费用记录失败', err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
    }
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({
      datePickerVisible: true
    });
  },

  // 日期选择确认
  onDateConfirm(e) {
    let selectedDate = e.detail.value;

    // 确保日期格式为 YYYY-MM-DD
    if (selectedDate.includes(' ') || selectedDate.includes('T')) {
      selectedDate = selectedDate.split(' ')[0].split('T')[0];
    }

    console.log(`🔄 用户切换日期到: ${selectedDate}`);

    this.setData({
      selectedDate,
      datePickerVisible: false
    });

    // 重新加载该日期的数据
    this.loadExpenseRecords();
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({
      datePickerVisible: false
    });
  },


  // 添加费用记录
  addExpenseRecord() {
    this.setData({
      showExpenseDialog: true,
      isEditMode: false,
      editingRecordId: '',
      expenseForm: {
        amount: '',
        projectName: '',
        hospital: '',
        expenseType: '检查费',
        notes: ''
      }
    });
  },

  // 编辑费用记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.expenseRecords.find(r => r._id === id);

    if (!record) return;

    this.setData({
      showExpenseDialog: true,
      isEditMode: true,
      editingRecordId: id,
      expenseForm: {
        amount: record.amount || '',
        projectName: record.projectName || '',
        hospital: record.hospital || '',
        expenseType: record.expenseType || '',
        notes: record.notes || ''
      }
    });
  },

  // 删除费用记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.expenseRecords.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条费用记录吗？`,
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

          await db.collection('expenseRecords').doc(id).remove();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          // 重新加载数据
          this.loadExpenseRecords();

          // 通知首页刷新日历
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
          }

        } catch (err) {
          console.error('删除失败', err);
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

  // 关闭费用记录弹窗
  closeExpenseDialog() {
    this.setData({
      showExpenseDialog: false
    });
  },

  // 弹窗显示状态变化
  onDialogVisibleChange(e) {
    this.setData({
      showExpenseDialog: e.detail.visible
    });
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`expenseForm.${field}`]: value
    });
  },

  // 费用类型选择
  onExpenseTypeSelect(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      'expenseForm.expenseType': value
    });
  },

  // 设置弹窗输入框焦点
  setPopupFocus(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      popupFocusIndex: parseInt(index)
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
    const index = parseInt(e.currentTarget.dataset.index);
    if (this.data.popupFocusIndex === index) {
      this.setData({
        popupFocusIndex: -1
      });
    }
  },

  // 前往下一个弹窗输入项
  goToNextPopupInput(e) {
    const currentIndex = this.data.popupFocusIndex;
    const total = 4; // 总共4个输入项

    if (currentIndex < total - 1) {
      this.setData({
        popupFocusIndex: currentIndex + 1
      });
    }
  },

  // 完成弹窗输入
  completePopupInput() {
    this.setData({
      popupFocusIndex: -1
    });
    // 关闭键盘
    wx.hideKeyboard();
  },

  // 保存费用记录
  async saveExpenseRecord() {
    const { expenseForm, isEditMode, editingRecordId, openid, currentProfileId, selectedDate } = this.data;

    // 验证必填字段
    if (!expenseForm.amount) {
      wx.showToast({
        title: '请输入费用金额',
        icon: 'none'
      });
      return;
    }

    if (!expenseForm.expenseType) {
      wx.showToast({
        title: '请选择费用类型',
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

      // 自动生成当前时间（时:分格式）
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const recordData = {
        openid: openid,
        profileId: currentProfileId,
        date: selectedDate,
        time: timeStr, // 自动使用当前时间
        amount: expenseForm.amount,
        projectName: expenseForm.projectName,
        hospital: expenseForm.hospital,
        expenseType: expenseForm.expenseType,
        notes: expenseForm.notes,
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新记录
        await db.collection('expenseRecords').doc(editingRecordId).update({
          data: recordData
        });

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      } else {
        // 添加记录
        recordData.createTime = db.serverDate();

        await db.collection('expenseRecords').add({
          data: recordData
        });

        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      }

      // 关闭弹窗
      this.setData({
        showExpenseDialog: false
      });

      // 重新加载数据
      this.loadExpenseRecords();

      // 通知首页刷新日历
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
      }

    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
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
