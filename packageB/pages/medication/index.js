

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

    // 药品表单
    medicineForm: {
      name: '',
      dosage: '',
      timesPerDay: [],
      timesPerDayText: '',
      startDate: '',
      endDate: '',
      notes: ''
    },

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

    // 🔧 优化：开始日期和结束日期都默认为当前页面的日期
    // 用户在某个日期的用药记录页面添加药品，开始日期就是当前日期
    this.setData({
      showMedicineDialog: true,
      isEditMode: false,
      editingMedicineId: '',
      medicineForm: {
        name: '',
        dosage: '',
        timesPerDay: [],
        timesPerDayText: '',
        startDate: selectedDate,     // 开始日期 = 当前页面日期
        endDate: selectedDate,       // 结束日期 = 当前页面日期（默认单次用药）
        notes: ''
      },
      startDateTimestamp: new Date(selectedDate).getTime(),
      endDateTimestamp: new Date(selectedDate).getTime()
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

    wx.showLoading({
      title: '保存中...',
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
            // 如果还有其他药品，更新记录
            updateOperations.push(
              db.collection('medications').doc(doc._id).update({
                data: {
                  medicines: updatedMedicines,
                  updateTime: db.serverDate()
                }
              })
            );
          } else {
            // 如果没有其他药品了，删除整条记录
            updateOperations.push(
              db.collection('medications').doc(doc._id).remove()
            );
          }
        }

        await Promise.all(updateOperations);

        // 然后按新的日期范围添加药品
        const startDate = new Date(medicineForm.startDate);
        const endDate = new Date(medicineForm.endDate);
        const addOperations = [];

        // 批量查询编辑模式下的所有日期记录
        const editDateStrings = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          editDateStrings.push(this.formatDate(d));
        }

        const editExistingRecordsRes = await db.collection('medications')
          .where({
            openid: openid,
            profileId: currentProfileId,
            date: db.command.in(editDateStrings)
          })
          .get();

        // 创建现有记录的映射
        const editExistingRecordsMap = {};
        editExistingRecordsRes.data.forEach(record => {
          editExistingRecordsMap[record.date] = record;
        });

        // 遍历日期范围进行操作
        const today = this.formatDate(new Date());
        editDateStrings.forEach(dateStr => {
          const existingRecord = editExistingRecordsMap[dateStr];

          // 🔧 修复：历史日期默认已服用，今天及未来日期默认未服用
          const isHistoricalDate = dateStr < today;
          const medicineDataForDate = { ...medicineData };
          medicineDataForDate.taken = isHistoricalDate;
          // 设置所有时段的状态
          if (medicineForm.timesPerDay && medicineForm.timesPerDay.length > 0) {
            medicineForm.timesPerDay.forEach(timeSlot => {
              medicineDataForDate.timeSlotStatus[timeSlot] = isHistoricalDate;
            });
          }

          if (existingRecord) {
            // 编辑模式下保留现有药品状态
            const updatedMedicines = [...(existingRecord.medicines || []), medicineDataForDate];

            addOperations.push(
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
            addOperations.push(
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

        await Promise.all(addOperations);
      } else {
        // 新增模式：为药品有效期内的每一天创建或更新记录
        const startDate = new Date(medicineForm.startDate);
        const endDate = new Date(medicineForm.endDate);

        // 批量操作数组
        const operations = [];

        // 先批量查询所有日期的现有记录
        const dateStrings = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dateStrings.push(this.formatDate(d));
        }

        const existingRecordsRes = await db.collection('medications')
          .where({
            openid: openid,
            profileId: currentProfileId,
            date: db.command.in(dateStrings)
          })
          .get();

        // 创建现有记录的映射
        const existingRecordsMap = {};
        existingRecordsRes.data.forEach(record => {
          existingRecordsMap[record.date] = record;
        });

        // 遍历日期范围，基于现有记录映射进行操作
        const today = this.formatDate(new Date());
        dateStrings.forEach(dateStr => {
          const existingRecord = existingRecordsMap[dateStr];

          // 🔧 修复：历史日期默认已服用，今天及未来日期默认未服用
          const isHistoricalDate = dateStr < today;
          const medicineDataForDate = { ...medicineData };
          medicineDataForDate.taken = isHistoricalDate;
          // 设置所有时段的状态
          if (medicineForm.timesPerDay && medicineForm.timesPerDay.length > 0) {
            medicineForm.timesPerDay.forEach(timeSlot => {
              medicineDataForDate.timeSlotStatus[timeSlot] = isHistoricalDate;
            });
          }

          if (existingRecord) {
            // 更新现有记录 - 保留现有药品状态
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

        // 执行所有操作
        await Promise.all(operations);
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

      wx.showToast({
        title: '保存失败，请重试',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
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
    wx.showToast({
      title: '输入完成',
      icon: 'success',
      duration: 1000
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