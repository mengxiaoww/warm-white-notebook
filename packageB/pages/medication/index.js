
Page({
  data: {
    // 用户信息
    openid: '',
    currentProfileId: '',

    // 日期相关
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,

    // 药品列表
    medicines: [],
    todayMedicineCount: 0,
    takenCount: 0,
    pendingCount: 0,

    // 药品弹窗
    showMedicineDialog: false,
    isEditMode: false,
    editingMedicineId: '',

    // 最近使用的药品名称
    recentMedicineNames: [],

    // 药品表单
    medicineForm: {
      name: '',
      dosage: '',
      frequency: 'daily', // 服药频率：daily(每天), alternate(隔天), weekly(每周), custom(自定义)
      frequencyText: '每天',
      customTakeDays: 0, // 自定义：吃N天
      customStopDays: 0, // 自定义：停N天
      timesPerDay: [],
      timesPerDayText: '',
      startDate: '',
      endDate: '',
      notes: ''
    },

    // 频率选择
    showFrequencySelector: false,
    tempFrequency: 'daily',
    customTakeDays: 3,
    customStopDays: 4,

    // 时间选择
    showTimeSelector: false,
    tempTimesPerDay: [],

    // 日期选择器
    startDatePickerVisible: false,
    endDatePickerVisible: false,
    startDateTimestamp: Date.now(),
    endDateTimestamp: Date.now(),

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
      this.loadMedicines();
    }, 300);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadMedicines();
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

    console.log('用药记录 - 获取用户信息:', {
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

  // 加载药品列表
  async loadMedicines() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) return;

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 查询当前日期的用药记录
      const res = await db.collection('medications')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      // 处理药品数据
      const medicines = [];
      let todayMedicineCount = 0;
      let takenCount = 0;
      let pendingCount = 0;

      if (res.data.length > 0) {
        const record = res.data[0];

        // 遍历所有药品，检查是否在有效期内
        for (const medicine of record.medicines || []) {
          if (new Date(medicine.startDate) <= new Date(selectedDate) &&
            new Date(medicine.endDate) >= new Date(selectedDate)) {

            // 计算用药状态信息
            const medicineStatus = this.calculateMedicineStatus(medicine, selectedDate);

            medicines.push({
              ...medicine,
              recordId: record._id,
              ...medicineStatus
            });

            todayMedicineCount++;

            if (medicineStatus.isPartiallyTaken) {
              takenCount++;
            } else {
              pendingCount++;
            }
          }
        }
      }

      this.setData({
        medicines,
        todayMedicineCount,
        takenCount,
        pendingCount
      });

    } catch (err) {
      console.error('加载用药记录失败:', err);
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
    this.loadMedicines();
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({
      datePickerVisible: false
    });
  },

  // 添加药品
  addMedicine() {
    const selectedDate = this.data.selectedDate;

    // 加载最近使用的药品名称
    this.loadRecentMedicineNames();

    // 🔧 优化：开始日期和结束日期都默认为当前页面的日期
    // 用户在某个日期的用药记录页面添加药品，开始日期就是当前日期
    this.setData({
      showMedicineDialog: true,
      isEditMode: false,
      editingMedicineId: '',
      medicineForm: {
        name: '',
        dosage: '',
        frequency: 'daily',
        frequencyText: '每天',
        customTakeDays: 0,
        customStopDays: 0,
        timesPerDay: [],
        timesPerDayText: '',
        startDate: selectedDate,     // 开始日期 = 当前页面日期
        endDate: selectedDate,       // 结束日期 = 当前页面日期（默认单次用药）
        notes: ''
      },
      tempFrequency: 'daily',
      startDateTimestamp: new Date(selectedDate).getTime(),
      endDateTimestamp: new Date(selectedDate).getTime()
    });
  },

  // 🔧 新增：加载最近使用的药品名称（最多15个）
  async loadRecentMedicineNames() {
    try {
      const db = wx.cloud.database();

      // 查询最近15天的用药记录
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const startDate = this.formatDate(fifteenDaysAgo);

      const res = await db.collection('medications')
        .where({
          openid: this.data.openid,
          profileId: this.data.currentProfileId,
          date: db.command.gte(startDate)
        })
        .get();

      // 提取药品名称并去重
      const medicineNames = new Set();
      res.data.forEach(record => {
        if (record.medicines && Array.isArray(record.medicines)) {
          record.medicines.forEach(med => {
            if (med.name) {
              medicineNames.add(med.name);
            }
          });
        }
      });

      // 转换为数组并限制最多15个
      const recentNames = Array.from(medicineNames).slice(0, 15);

      this.setData({
        recentMedicineNames: recentNames
      });
    } catch (err) {
      console.error('加载最近药品名称失败:', err);
    }
  },

  // 🔧 新增：选择最近使用的药品
  selectRecentMedicine(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({
      'medicineForm.name': name
    });
  },

  // 🔧 新增：选择常用剂量
  selectDosage(e) {
    const dosage = e.currentTarget.dataset.dosage;
    this.setData({
      'medicineForm.dosage': dosage
    });
  },

  // 🔧 新增：显示频率选择器
  showFrequencySelector() {
    this.setData({
      showFrequencySelector: true,
      tempFrequency: this.data.medicineForm.frequency || 'daily',
      customTakeDays: this.data.medicineForm.customTakeDays || 3,
      customStopDays: this.data.medicineForm.customStopDays || 4
    });
  },

  // 🔧 新增：频率选择器关闭事件
  onFrequencySelectorVisibleChange(e) {
    if (!e.detail.visible) {
      this.setData({
        showFrequencySelector: false
      });
    }
  },

  // 🔧 新增：选择频率
  selectFrequency(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      tempFrequency: value
    });
  },

  // 🔧 新增：频率选择
  onFrequencySelect(e) {
    this.setData({
      tempFrequency: e.detail.value
    });
  },

  // 🔧 新增：自定义吃药天数输入
  onCustomTakeDaysInput(e) {
    this.setData({
      customTakeDays: parseInt(e.detail.value) || 0
    });
  },

  // 🔧 新增：自定义停药天数输入
  onCustomStopDaysInput(e) {
    this.setData({
      customStopDays: parseInt(e.detail.value) || 0
    });
  },

  // 🔧 新增：确认频率选择
  confirmFrequencySelection() {
    const { tempFrequency, customTakeDays, customStopDays } = this.data;

    let frequencyText = '';
    switch (tempFrequency) {
      case 'daily':
        frequencyText = '每天';
        break;
      case 'alternate':
        frequencyText = '隔天';
        break;
      case 'weekly':
        frequencyText = '每周一次';
        break;
      case 'custom':
        if (customTakeDays > 0 && customStopDays > 0) {
          frequencyText = `吃${customTakeDays}天停${customStopDays}天`;
        } else {
          wx.showToast({
            title: '请输入吃药和停药天数',
            icon: 'none'
          });
          return;
        }
        break;
    }

    this.setData({
      'medicineForm.frequency': tempFrequency,
      'medicineForm.frequencyText': frequencyText,
      'medicineForm.customTakeDays': tempFrequency === 'custom' ? customTakeDays : 0,
      'medicineForm.customStopDays': tempFrequency === 'custom' ? customStopDays : 0,
      showFrequencySelector: false
    });
  },

  // 编辑药品
  editMedicine(e) {
    const { id } = e.currentTarget.dataset;
    const medicine = this.data.medicines.find(m => m.id === id);

    if (!medicine) return;

    const medicineTimesPerDay = medicine.timesPerDay || [];
    this.setData({
      showMedicineDialog: true,
      isEditMode: true,
      editingMedicineId: id,
      medicineForm: {
        name: medicine.name,
        dosage: medicine.dosage,
        timesPerDay: medicineTimesPerDay,
        timesPerDayText: medicineTimesPerDay.join('、'),
        startDate: medicine.startDate,
        endDate: medicine.endDate,
        notes: medicine.notes || ''
      },
      startDateTimestamp: new Date(medicine.startDate).getTime(),
      endDateTimestamp: new Date(medicine.endDate).getTime()
    });
  },

  // 停止用药
  stopMedicine(e) {
    const { id } = e.currentTarget.dataset;
    const medicine = this.data.medicines.find(m => m.id === id);

    if (!medicine) return;

    const today = this.data.selectedDate;
    const isToday = today === this.formatDate(new Date());
    const endDate = medicine.endDate;

    let title, content, confirmText;

    if (isToday) {
      // 今天停止用药
      title = '停止用药';
      content = `确定要停止服用"${medicine.name}"吗？\n服用期间：${medicine.startDate} 至 ${endDate}\n\n停止后，今天及之后的用药记录将不再显示，但历史服用记录会保留。`;
      confirmText = '停止用药';
    } else if (new Date(today) < new Date()) {
      // 历史日期 - 提供删除选项
      title = '删除用药记录';
      content = `选择删除范围：\n药品："${medicine.name}"\n服用期间：${medicine.startDate} 至 ${endDate}`;
      confirmText = '选择删除范围';
    } else {
      // 未来日期
      title = '停止用药';
      content = `确定要从${today}开始停止服用"${medicine.name}"吗？`;
      confirmText = '停止用药';
    }

    if (new Date(today) < new Date()) {
      // 历史日期显示选择对话框
      this.showDeleteOptions(medicine, today);
    } else {
      // 今天或未来日期直接确认
      wx.showModal({
        title,
        content,
        confirmText,
        cancelText: '取消',
        success: async (res) => {
          if (!res.confirm) return;
          await this.handleStopMedicine(id, today);
        }
      });
    }
  },

  // 显示删除选项
  showDeleteOptions(medicine, currentDate) {
    const options = [
      '仅删除今天的记录',
      '删除今天及之后的记录',
      '删除所有记录'
    ];

    wx.showActionSheet({
      itemList: options,
      success: async (res) => {
        const { tapIndex } = res;
        let confirmMsg = '';

        switch (tapIndex) {
          case 0:
            confirmMsg = `仅删除${currentDate}的"${medicine.name}"用药记录`;
            break;
          case 1:
            confirmMsg = `删除${currentDate}及之后的"${medicine.name}"用药记录，保留${currentDate}之前的历史记录`;
            break;
          case 2:
            confirmMsg = `删除所有"${medicine.name}"的用药记录（${medicine.startDate} - ${medicine.endDate}）`;
            break;
        }

        wx.showModal({
          title: '确认删除',
          content: confirmMsg,
          confirmText: '确认删除',
          confirmColor: '#ff4757',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              await this.handleDeleteWithRange(medicine.id, currentDate, tapIndex);
            }
          }
        });
      }
    });
  },

  // 处理不同范围的删除
  async handleDeleteWithRange(medicineId, currentDate, deleteType) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      switch (deleteType) {
        case 0: // 仅删除今天
          await this.deleteSingleDayRecord(medicineId, currentDate);
          break;
        case 1: // 删除今天及之后
          await this.handleStopMedicine(medicineId, currentDate);
          break;
        case 2: // 删除所有记录
          await this.deleteAllRecords(medicineId);
          break;
      }

      wx.showToast({
        title: '操作成功',
        icon: 'success'
      });

      this.loadMedicines();
      this.notifyCalendarRefresh();

    } catch (err) {
      console.error('删除用药记录失败:', err);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 停止用药处理
  async handleStopMedicine(medicineId, stopDate) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 查找所有包含该药品的记录
      const allRecords = await db.collection('medications')
        .where({
          openid: this.data.openid,
          profileId: this.data.currentProfileId,
          'medicines.id': medicineId
        })
        .get();

      const operations = [];

      for (const doc of allRecords.data) {
        const recordDate = doc.date;

        if (new Date(recordDate) >= new Date(stopDate)) {
          // 对于停止日期及之后的记录，移除该药品
          const updatedMedicines = doc.medicines.filter(m => m.id !== medicineId);

          if (updatedMedicines.length > 0) {
            operations.push(
              db.collection('medications').doc(doc._id).update({
                data: {
                  medicines: updatedMedicines,
                  updateTime: db.serverDate()
                }
              })
            );
          } else {
            operations.push(
              db.collection('medications').doc(doc._id).remove()
            );
          }
        }
        // 保留停止日期之前的记录不变
      }

      await Promise.all(operations);

      wx.showToast({
        title: '停止成功',
        icon: 'success'
      });

      this.loadMedicines();
      this.notifyCalendarRefresh();

    } catch (err) {
      console.error('停止用药失败:', err);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除单天记录
  async deleteSingleDayRecord(medicineId, targetDate) {
    const db = wx.cloud.database();

    const record = await db.collection('medications')
      .where({
        openid: this.data.openid,
        profileId: this.data.currentProfileId,
        date: targetDate
      })
      .get();

    if (record.data.length > 0) {
      const doc = record.data[0];
      const updatedMedicines = doc.medicines.filter(m => m.id !== medicineId);

      if (updatedMedicines.length > 0) {
        await db.collection('medications').doc(doc._id).update({
          data: {
            medicines: updatedMedicines,
            updateTime: db.serverDate()
          }
        });
      } else {
        await db.collection('medications').doc(doc._id).remove();
      }
    }
  },

  // 删除所有记录（原有逻辑）
  async deleteAllRecords(medicineId) {
    const db = wx.cloud.database();

    const allRecords = await db.collection('medications')
      .where({
        openid: this.data.openid,
        profileId: this.data.currentProfileId,
        'medicines.id': medicineId
      })
      .get();

    const operations = [];

    for (const doc of allRecords.data) {
      const updatedMedicines = doc.medicines.filter(m => m.id !== medicineId);

      if (updatedMedicines.length > 0) {
        operations.push(
          db.collection('medications').doc(doc._id).update({
            data: {
              medicines: updatedMedicines,
              updateTime: db.serverDate()
            }
          })
        );
      } else {
        operations.push(
          db.collection('medications').doc(doc._id).remove()
        );
      }
    }

    await Promise.all(operations);
  },

  // 通知日历刷新
  notifyCalendarRefresh() {
    const app = getApp();
    if (app.globalData) {
      app.globalData.needRefreshCalendar = true;
    }
  },

  // 删除药品（保留原方法名以兼容WXML）
  deleteMedicine(e) {
    this.stopMedicine(e);
  },

  // 计算用药状态
  calculateMedicineStatus(medicine, currentDate) {
    const today = this.formatDate(new Date());
    const isHistoricalDate = new Date(currentDate) < new Date(today);
    const isFutureDate = new Date(currentDate) > new Date(today);

    // 统计已服用的药品数量（至少服用了一个时段的药品）
    let isPartiallyTaken = false;
    let allTimeslotsCompleted = false;
    let takenTimeslots = 0;
    let totalTimeslots = 0;

    if (medicine.timesPerDay && medicine.timesPerDay.length > 0) {
      totalTimeslots = medicine.timesPerDay.length;

      if (medicine.timeSlotStatus) {
        takenTimeslots = medicine.timesPerDay.filter(slot =>
          medicine.timeSlotStatus[slot] === true
        ).length;
        isPartiallyTaken = takenTimeslots > 0;
        allTimeslotsCompleted = takenTimeslots === totalTimeslots;
      }
    } else {
      // 没有分时段状态时，使用overall taken状态
      isPartiallyTaken = medicine.taken === true;
      allTimeslotsCompleted = medicine.taken === true;
      totalTimeslots = 1;
      takenTimeslots = medicine.taken ? 1 : 0;
    }

    // 生成状态描述
    let statusText = '';
    let statusClass = '';
    let showMissedWarning = false;

    if (isHistoricalDate) {
      if (isPartiallyTaken) {
        if (allTimeslotsCompleted) {
          statusText = '已完成';
          statusClass = 'status-completed';
        } else {
          statusText = `部分完成 (${takenTimeslots}/${totalTimeslots})`;
          statusClass = 'status-partial';
        }
      } else {
        statusText = '未服用';
        statusClass = 'status-missed';
        showMissedWarning = true;
      }
    } else if (currentDate === today) {
      if (isPartiallyTaken) {
        if (allTimeslotsCompleted) {
          statusText = '今日已完成';
          statusClass = 'status-completed';
        } else {
          statusText = `进行中 (${takenTimeslots}/${totalTimeslots})`;
          statusClass = 'status-partial';
        }
      } else {
        statusText = '待服用';
        statusClass = 'status-pending';
      }
    } else {
      // 未来日期
      statusText = '计划服用';
      statusClass = 'status-planned';
    }

    return {
      isPartiallyTaken,
      allTimeslotsCompleted,
      takenTimeslots,
      totalTimeslots,
      statusText,
      statusClass,
      showMissedWarning,
      isHistoricalDate,
      isFutureDate
    };
  },

  // 切换分时段服药状态
  async toggleTimeSlotTaken(e) {
    const { id, timeSlot } = e.currentTarget.dataset;
    const taken = e.detail.value;
    const medicine = this.data.medicines.find(m => m.id === id);

    if (!medicine) return;

    wx.showLoading({
      title: '更新中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();
      const { openid, currentProfileId, selectedDate } = this.data;

      // 先获取完整记录
      const recordRes = await db.collection('medications').doc(medicine.recordId).get();
      const record = recordRes.data;

      // 更新指定药品的分时段服药状态
      const updatedMedicines = record.medicines.map(m => {
        if (m.id === id) {
          const newTimeSlotStatus = { ...(m.timeSlotStatus || {}) };
          newTimeSlotStatus[timeSlot] = taken;

          // 检查是否全部时段都已服用
          const allTimeSlots = m.timesPerDay || [];
          const allTaken = allTimeSlots.every(slot => newTimeSlotStatus[slot] === true);

          return {
            ...m,
            timeSlotStatus: newTimeSlotStatus,
            taken: allTaken
          };
        }
        return m;
      });

      // 更新当前日期的数据库记录
      await db.collection('medications')
        .doc(medicine.recordId)
        .update({
          data: {
            medicines: updatedMedicines,
            updateTime: db.serverDate()
          }
        });

      // 🔧 移除错误的同步更新逻辑 - 每个日期的用药记录应该独立

      // 更新本地数据，避免重新加载
      const medicines = this.data.medicines.map(m => {
        if (m.id === id) {
          const newTimeSlotStatus = { ...(m.timeSlotStatus || {}) };
          newTimeSlotStatus[timeSlot] = taken;

          // 检查是否全部时段都已服用
          const allTimeSlots = m.timesPerDay || [];
          const allTaken = allTimeSlots.every(slot => newTimeSlotStatus[slot] === true);

          const updatedMedicine = {
            ...m,
            timeSlotStatus: newTimeSlotStatus,
            taken: allTaken
          };

          // 🔧 关键修复：重新计算状态文字和类
          const status = this.calculateMedicineStatus(updatedMedicine, this.data.selectedDate);
          return {
            ...updatedMedicine,
            statusText: status.statusText,
            statusClass: status.statusClass,
            showMissedWarning: status.showMissedWarning
          };
        }
        return m;
      });

      // 重新计算统计数据（与每日记录页面保持一致）
      let takenCount = 0;
      let pendingCount = 0;
      medicines.forEach(m => {
        let isPartiallyTaken = false;
        if (m.timesPerDay && m.timesPerDay.length > 0 && m.timeSlotStatus) {
          // 有分时段状态时，检查是否至少有一个时段已服用
          isPartiallyTaken = m.timesPerDay.some(slot =>
            m.timeSlotStatus[slot] === true
          );
        } else {
          // 没有分时段状态时，使用overall taken状态
          isPartiallyTaken = m.taken === true;
        }

        if (isPartiallyTaken) {
          takenCount++;
        } else {
          pendingCount++;
        }
      });

      this.setData({
        medicines,
        takenCount,
        pendingCount
      });

      wx.showToast({
        title: taken ? `已标记${timeSlot}已服用` : `已标记${timeSlot}未服用`,
        icon: 'success'
      });

      // 通知首页刷新用药数据
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshMedicationData = true;
      }

    } catch (err) {
      console.error('更新服药状态失败:', err);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换服药状态
  async toggleMedicineTaken(e) {
    const { id } = e.currentTarget.dataset;
    const taken = e.detail.value;
    const medicine = this.data.medicines.find(m => m.id === id);

    if (!medicine) return;

    wx.showLoading({
      title: '更新中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();
      const { openid, currentProfileId, selectedDate } = this.data;

      // 先更新当前日期的记录
      const recordRes = await db.collection('medications').doc(medicine.recordId).get();
      const record = recordRes.data;

      // 更新指定药品的服药状态
      const updatedMedicines = record.medicines.map(m => {
        if (m.id === id) {
          return { ...m, taken };
        }
        return m;
      });

      // 更新当前日期的数据库记录
      await db.collection('medications')
        .doc(medicine.recordId)
        .update({
          data: {
            medicines: updatedMedicines,
            updateTime: db.serverDate()
          }
        });

      // 🔧 移除错误的同步更新逻辑 - 每个日期的用药记录应该独立

      // 更新本地数据并重新计算状态
      const medicines = this.data.medicines.map(m => {
        if (m.id === id) {
          const updatedMedicine = { ...m, taken };
          // 🔧 关键修复：重新计算状态文字和类
          const status = this.calculateMedicineStatus(updatedMedicine, this.data.selectedDate);
          return {
            ...updatedMedicine,
            statusText: status.statusText,
            statusClass: status.statusClass,
            showMissedWarning: status.showMissedWarning
          };
        }
        return m;
      });

      // 重新计算统计数据（与每日记录页面保持一致）
      let takenCount = 0;
      let pendingCount = 0;
      medicines.forEach(m => {
        let isPartiallyTaken = false;
        if (m.timesPerDay && m.timesPerDay.length > 0 && m.timeSlotStatus) {
          // 有分时段状态时，检查是否至少有一个时段已服用
          isPartiallyTaken = m.timesPerDay.some(slot =>
            m.timeSlotStatus[slot] === true
          );
        } else {
          // 没有分时段状态时，使用overall taken状态
          isPartiallyTaken = m.taken === true;
        }

        if (isPartiallyTaken) {
          takenCount++;
        } else {
          pendingCount++;
        }
      });

      this.setData({
        medicines,
        takenCount,
        pendingCount
      });

      wx.showToast({
        title: taken ? '已标记为已服用' : '已标记为未服用',
        icon: 'success'
      });

      // 通知首页刷新用药数据
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshMedicationData = true;
      }

    } catch (err) {
      console.error('切换服药状态失败:', err);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`medicineForm.${field}`]: value
    });
  },



  // 显示时间选择器
  showTimeSelector() {
    // 确保tempTimesPerDay是数组
    const currentTimes = this.data.medicineForm.timesPerDay || [];
    this.setData({
      showTimeSelector: true,
      tempTimesPerDay: [...currentTimes]
    });

  },

  // 时间选择
  onTimeSelect(e) {

    this.setData({
      tempTimesPerDay: e.detail.value
    });
  },

  // 确认时间选择
  confirmTimeSelection() {
    const timeOrder = { '早': 1, '中': 2, '晚': 3, '睡前': 4 };
    const newTimes = [...this.data.tempTimesPerDay].sort((a, b) => {
      return (timeOrder[a] || 999) - (timeOrder[b] || 999);
    });

    // 先更新medicineForm对象，然后整体设置
    const updatedForm = {
      ...this.data.medicineForm,
      timesPerDay: newTimes,
      timesPerDayText: newTimes.join('、') // 预处理文本
    };

    this.setData({
      medicineForm: updatedForm,
      showTimeSelector: false
    }, () => {
      // 设置完成后的回调


    });



  },

  // 时间选择器关闭
  onTimeSelectorVisibleChange(e) {
    if (!e.detail.visible) {
      this.setData({
        showTimeSelector: false
      });
    }
  },

  // 显示开始日期选择器
  showStartDatePicker() {
    this.setData({
      startDatePickerVisible: true
    });
  },

  // 开始日期确认
  onStartDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    // 只有在结束日期存在时才检查开始日期不能晚于结束日期
    if (this.data.medicineForm.endDate && dateStr > this.data.medicineForm.endDate) {
      wx.showToast({
title: '开始日期不能晚于结束日期',
icon: 'error'
});
      return;
    }

    this.setData({
      'medicineForm.startDate': dateStr,
      startDateTimestamp: date.getTime(),
      startDatePickerVisible: false
    });
  },

  // 开始日期取消
  onStartDateCancel() {
    this.setData({
      startDatePickerVisible: false
    });
  },

  // 显示结束日期选择器
  showEndDatePicker() {
    this.setData({
      endDatePickerVisible: true
    });
  },

  // 结束日期确认
  onEndDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);
    const today = new Date();
    const todayStr = this.formatDate(today);

    // 只有在开始日期存在时才检查结束日期不能早于开始日期
    if (this.data.medicineForm.startDate && dateStr < this.data.medicineForm.startDate) {
      wx.showToast({
title: '结束日期不能早于开始日期',
icon: 'error'
});
      return;
    }

    // 🔧 移除自动标记历史日期为已服用的逻辑提示

    this.setData({
      'medicineForm.endDate': dateStr,
      endDateTimestamp: date.getTime(),
      endDatePickerVisible: false
    });
  },

  // 结束日期取消
  onEndDateCancel() {
    this.setData({
      endDatePickerVisible: false
    });
  },

  // 快速设置结束日期
  setQuickEndDate(e) {
    const days = e.currentTarget.dataset.days;

    // 如果没有开始日期,使用今天
    let startDate = this.data.medicineForm.startDate;
    if (!startDate) {
      const today = new Date();
      startDate = this.formatDate(today);
      this.setData({
        'medicineForm.startDate': startDate,
        startDateTimestamp: today.getTime()
      });
    }

    if (days === 'pending') {
      // 待定：设置为99年后（表示长期服用）
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 99);
      const endDateStr = this.formatDate(endDate);

      this.setData({
        'medicineForm.endDate': endDateStr,
        endDateTimestamp: endDate.getTime()
      });

      wx.showToast({
title: '已设置为长期服用',
icon: 'success'
});
    } else {
      // 根据天数计算结束日期
      const numDays = parseInt(days);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + numDays - 1); // -1是因为包含开始日期当天
      const endDateStr = this.formatDate(endDate);

      this.setData({
        'medicineForm.endDate': endDateStr,
        endDateTimestamp: endDate.getTime()
      });

      wx.showToast({
title: `已设置${days}天疗程`,
icon: 'success'
});
    }
  },

  // 关闭药品弹窗
  closeMedicineDialog() {
    this.setData({
      showMedicineDialog: false,
      showTimeSelector: false // 同时关闭时间选择器
    });
  },

  // 弹窗关闭事件
  onDialogVisibleChange(e) {
    if (!e.detail.visible) {
      this.setData({
        showMedicineDialog: false,
        showTimeSelector: false // 同时关闭时间选择器
      });
    }
  },
  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },
  // 保存药品
  async saveMedicine() {
    const { medicineForm, isEditMode, editingMedicineId, openid, currentProfileId, selectedDate } = this.data;

    if (!medicineForm.name.trim()) {
      wx.showToast({
title: '请填写完整信息',
icon: 'error'
});
      return;
    }

    if (!medicineForm.dosage.trim()) {
      wx.showToast({
title: '请填写完整信息',
icon: 'error'
});
      return;
    }

    if (!medicineForm.timesPerDay || medicineForm.timesPerDay.length === 0) {
      wx.showToast({
title: '请填写完整信息',
icon: 'error'
});
      return;
    }

    if (!medicineForm.startDate) {
      wx.showToast({
title: '请填写完整信息',
icon: 'error'
});
      return;
    }

    if (!medicineForm.endDate) {
      wx.showToast({
title: '请选择结束日期',
icon: 'error'
});
      return;
    }

    // 🔧 计算日期跨度，防止操作过多
    const startDate = new Date(medicineForm.startDate);
    const endDate = new Date(medicineForm.endDate);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // 如果跨度超过2年（730天），给出警告
    if (daysDiff > 730) {
      const confirmResult = await new Promise((resolve) => {
        wx.showModal({
          title: '提示',
          content: `用药时间跨度较大（${daysDiff}天），保存可能需要较长时间。是否继续？`,
          confirmText: '继续保存',
          cancelText: '取消',
          success: (res) => {
            resolve(res.confirm);
          }
        });
      });

      if (!confirmResult) {
        return;
      }
    }

    wx.showLoading({
      title: daysDiff > 365 ? '处理中，请稍候...' : '保存中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 构建药品数据
      const medicineData = {
        id: isEditMode ? editingMedicineId : `medicine_${Date.now()}`,
        name: medicineForm.name.trim(),
        dosage: medicineForm.dosage.trim(),
        timesPerDay: medicineForm.timesPerDay,
        timesPerDayText: medicineForm.timesPerDayText,
        startDate: medicineForm.startDate,
        endDate: medicineForm.endDate,
        notes: medicineForm.notes.trim(),
        taken: false, // 新添加的药品默认未服用
        timeSlotStatus: {} // 分时段服药状态
      };

      // 初始化分时段状态
      if (medicineForm.timesPerDay && medicineForm.timesPerDay.length > 0) {
        medicineForm.timesPerDay.forEach(timeSlot => {
          medicineData.timeSlotStatus[timeSlot] = false;
        });
      }

      if (isEditMode) {
        // 编辑模式：需要更新所有相关日期的记录
        await this.handleEditMedicine(db, medicineData, editingMedicineId, openid, currentProfileId);
      } else {
        // 新增模式：为药品有效期内的每一天创建或更新记录
        await this.handleAddMedicine(db, medicineData, openid, currentProfileId);
      }

      wx.showToast({
title: isEditMode ? '编辑成功' : '添加成功',
icon: 'success'
});

      // 关闭弹窗
      this.setData({
        showMedicineDialog: false
      });

      // 重新加载数据
      this.loadMedicines();

      // 通知首页刷新用药数据（不设置 needRefreshCalendar 避免冲突）
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshMedicationData = true;
      }

    } catch (err) {
      console.error('保存用药记录失败:', err);
      wx.showToast({
title: '保存失败，请重试',
icon: 'error'
});
    } finally {
      wx.hideLoading();
    }
  },

  // 🔧 新增：处理编辑药品（分批处理）
  async handleEditMedicine(db, medicineData, editingMedicineId, openid, currentProfileId) {
    // 先删除所有包含该药品的记录
    const deleteRes = await db.collection('medications')
      .where({
        openid: openid,
        profileId: currentProfileId,
        'medicines.id': editingMedicineId
      })
      .get();

    // 批量更新操作
    const updateOperations = [];

    for (const doc of deleteRes.data) {
      const updatedMedicines = doc.medicines.filter(m => m.id !== editingMedicineId);

      if (updatedMedicines.length > 0) {
        updateOperations.push(
          db.collection('medications').doc(doc._id).update({
            data: {
              medicines: updatedMedicines,
              updateTime: db.serverDate()
            }
          })
        );
      } else {
        updateOperations.push(
          db.collection('medications').doc(doc._id).remove()
        );
      }
    }

    await Promise.all(updateOperations);

    // 然后按新的日期范围添加药品（使用分批处理）
    await this.batchCreateMedicineRecords(db, medicineData, openid, currentProfileId);
  },

  // 🔧 新增：处理新增药品（分批处理）
  async handleAddMedicine(db, medicineData, openid, currentProfileId) {
    await this.batchCreateMedicineRecords(db, medicineData, openid, currentProfileId);
  },

  // 🔧 新增：分批创建药品记录
  async batchCreateMedicineRecords(db, medicineData, openid, currentProfileId) {
    const startDate = new Date(medicineData.startDate);
    const endDate = new Date(medicineData.endDate);
    const today = this.formatDate(new Date());

    // 🔧 根据频率筛选需要创建记录的日期
    const allDates = [];
    const frequency = medicineData.frequency || 'daily';
    const customTakeDays = medicineData.customTakeDays || 0;
    const customStopDays = medicineData.customStopDays || 0;

    let dayIndex = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      let shouldInclude = false;

      switch (frequency) {
        case 'daily':
          // 每天都创建记录
          shouldInclude = true;
          break;

        case 'alternate':
          // 隔天：从开始日期算起，第0、2、4天...有记录
          shouldInclude = (dayIndex % 2 === 0);
          break;

        case 'weekly':
          // 每周一次：从开始日期算起，第0、7、14天...有记录
          shouldInclude = (dayIndex % 7 === 0);
          break;

        case 'custom':
          // 自定义：吃N天停M天循环
          if (customTakeDays > 0 && customStopDays > 0) {
            const cycleLength = customTakeDays + customStopDays;
            const positionInCycle = dayIndex % cycleLength;
            shouldInclude = (positionInCycle < customTakeDays);
          } else {
            // 如果没有设置自定义天数，默认每天
            shouldInclude = true;
          }
          break;

        default:
          shouldInclude = true;
      }

      if (shouldInclude) {
        allDates.push(dateStr);
      }

      dayIndex++;
    }

    // 🔧 分批处理，每批最多500条（避免超过云数据库限制）
    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < allDates.length; i += BATCH_SIZE) {
      batches.push(allDates.slice(i, i + BATCH_SIZE));
    }

    // 逐批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      // 更新进度提示
      if (batches.length > 1) {
        wx.showLoading({
          title: `处理中 ${batchIndex + 1}/${batches.length}`,
          mask: true
        });
      }

      // 批量查询当前批次的现有记录
      const existingRecordsRes = await db.collection('medications')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.in(batch)
        })
        .get();

      // 创建现有记录的映射
      const existingRecordsMap = {};
      existingRecordsRes.data.forEach(record => {
        existingRecordsMap[record.date] = record;
      });

      // 构建当前批次的操作
      const operations = [];

      batch.forEach(dateStr => {
        const existingRecord = existingRecordsMap[dateStr];

        // 历史日期默认已服用，今天及未来日期默认未服用
        const isHistoricalDate = dateStr < today;
        const medicineDataForDate = { ...medicineData };
        medicineDataForDate.taken = isHistoricalDate;

        // 设置所有时段的状态
        if (medicineData.timesPerDay && medicineData.timesPerDay.length > 0) {
          medicineData.timesPerDay.forEach(timeSlot => {
            medicineDataForDate.timeSlotStatus[timeSlot] = isHistoricalDate;
          });
        }

        if (existingRecord) {
          // 更新现有记录
          const updatedMedicines = [...(existingRecord.medicines || []), medicineDataForDate];

          operations.push(
            db.collection('medications')
              .doc(existingRecord._id)
              .update({
                data: {
                  medicines: updatedMedicines,
                  updateTime: db.serverDate()
                }
              })
          );
        } else {
          // 创建新记录
          operations.push(
            db.collection('medications').add({
              data: {
                openid,
                profileId: currentProfileId,
                date: dateStr,
                medicines: [medicineDataForDate],
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            })
          );
        }
      });

      // 执行当前批次的所有操作
      await Promise.all(operations);
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