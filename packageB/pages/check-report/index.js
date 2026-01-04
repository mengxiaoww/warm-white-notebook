Page({
  data: {
    // 用户信息
    openid: '',
    currentProfileId: '',

    // 日期相关
    selectedDate: '',
    selectedDateTimestamp: Date.now(),
    datePickerVisible: false,

    // 检查报告列表
    checkReports: [],

    // 检查报告弹窗
    showCheckReportDialog: false,
    isEditMode: false,
    editingRecordId: '',

    // 检查报告表单
    checkReportForm: {
      recordDate: '',
      projectName: '',
      detailedResults: '',
      resultType: '',
      resultTypeLabel: '',
      images: [],
      notes: ''
    },

    // 记录日期选择器
    recordDatePickerVisible: false,
    recordDateTimestamp: Date.now(),

    // 检查结果选项
    resultTypeOptions: [
      { value: 'normal', label: '正常' },
      { value: 'abnormal', label: '异常' },
      { value: 'borderline', label: '临界值' },
      { value: 'pending', label: '待复查' },
      { value: 'inconclusive', label: '结果不明确' }
    ],

    // 报告类型选项
    reportTypeOptions: [
      { value: 'blood', label: '血液检查' },
      { value: 'urine', label: '尿液检查' },
      { value: 'imaging', label: '影像检查' },
      { value: 'pathology', label: '病理检查' },
      { value: 'function', label: '功能检查' },
      { value: 'other', label: '其他检查' }
    ],

    // 图片上传配置
    imageGridConfig: {
      column: 3,
      width: 200,
      height: 200
    },

    reportTypePickerVisible: false,
    selectedReportType: '',

    // 检查项目名称快捷提示词
    projectNameSuggestions: [
      '血常规', '肝功能', '肾功能', 'CT检查', 'MRI检查',
      'X光检查', 'B超检查', '心电图', '尿常规', '凝血功能'
    ]

  },

  // 获取报告类型的中文标签
  getReportTypeLabel(reportType) {
    const option = this.data.reportTypeOptions.find(item => item.value === reportType);
    return option ? option.label : reportType;
  },

  // 获取检查结果类型的中文标签
  getResultTypeLabel(resultType) {
    const option = this.data.resultTypeOptions.find(item => item.value === resultType);
    return option ? option.label : resultType;
  },

  onLoad(options) {
    // 设置今天的日期
    const today = new Date();
    const dateStr = this.formatDate(today);

    // 🔧 修复：延迟加载数据，确保 app.globalData.currentProfile 已初始化
    setTimeout(() => {
      // 获取用户信息
      this.getUserInfo();

      // 如果从健康档案通过id跳转过来，加载该记录
      if (options.id) {
        this.loadCheckReportById(options.id);
      }
      // 如果从日历跳转过来，使用传入的日期
      else if (options.date) {
        this.setData({
          selectedDate: options.date,
          selectedDateTimestamp: new Date(options.date).getTime()
        });
        // 加载检查报告数据
        this.loadCheckReports();
      }
      // 默认加载今天的日期
      else {
        this.setData({
          selectedDate: dateStr,
          selectedDateTimestamp: today.getTime()
        });
        // 加载检查报告数据
        this.loadCheckReports();
      }
    }, 300);
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.openid && this.data.currentProfileId) {
      this.loadCheckReports();
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

    console.log('检查报告 - 获取用户信息:', {
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

  // 加载检查报告
  async loadCheckReports() {
    const { openid, currentProfileId, selectedDate } = this.data;

    console.log('检查报告 - 开始加载数据:', {
      openid: openid ? '已设置' : '未设置',
      currentProfileId,
      selectedDate
    });

    if (!openid || !currentProfileId) {
      console.log('检查报告 - 缺少必要参数，停止加载');
      return;
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 查询当前日期的检查报告
      const res = await db.collection('checkReports')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .orderBy('createTime', 'desc')
        .get();

      console.log('检查报告 - 查询结果:', {
        总数: res.data.length,
        查询条件: {
          openid: openid ? '已设置' : '未设置',
          profileId: currentProfileId,
          date: selectedDate
        }
      });

      // 处理检查结果数据
      const processedData = res.data.map(item => ({
        ...item,
        resultTypeLabel: item.resultTypeLabel || this.getResultTypeLabel(item.resultType)
      }));

      this.setData({
        checkReports: processedData
      });

    } catch (err) {
      console.error('检查报告 - 加载失败:', err);
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
    this.loadCheckReports();
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

  // 添加检查报告
  addCheckRecord() {
    // 使用页面选择的日期作为默认记录日期
    const defaultDate = this.data.selectedDate || this.formatDate(new Date());
    this.setData({
      showCheckReportDialog: true,
      isEditMode: false,
      editingRecordId: '',
      checkReportForm: {
        recordDate: defaultDate,
        projectName: '',
        detailedResults: '',
        resultType: 'normal',
        resultTypeLabel: '正常',
        images: [],
        notes: ''
      },
      recordDateTimestamp: new Date(defaultDate).getTime()
    });
  },

  // 编辑检查报告
  editRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.checkReports.find(r => r._id === id);

    if (!record) return;

    const recordDateTimestamp = record.recordDate ? new Date(record.recordDate).getTime() : Date.now();

    this.setData({
      showCheckReportDialog: true,
      isEditMode: true,
      editingRecordId: id,
      recordDateTimestamp,
      checkReportForm: {
        recordDate: record.recordDate || '',
        projectName: record.projectName || '',
        detailedResults: record.detailedResults || '',
        resultType: record.resultType || '',
        resultTypeLabel: record.resultTypeLabel || this.getResultTypeLabel(record.resultType) || '',
        images: record.images || [],
        notes: record.notes || ''
      }
    });
  },

  // 删除检查报告
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.checkReports.find(r => r._id === id);

    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条检查报告吗？`,
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

          await db.collection('checkReports').doc(id).remove();

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          // 重新加载数据
          this.loadCheckReports();

          // 通知首页刷新日历
          const app = getApp();
          if (app.globalData) {
            app.globalData.needRefreshCalendar = true;
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

  // 关闭检查报告弹窗
  closeCheckReportDialog() {
    this.setData({
      showCheckReportDialog: false
    });
  },

  // 弹窗显示状态变化
  onDialogVisibleChange(e) {
    this.setData({
      showCheckReportDialog: e.detail.visible
    });
  },

  // 表单输入
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;

    this.setData({
      [`checkReportForm.${field}`]: value
    });
  },

  // 显示复诊日期选择器
  showFollowUpDatePicker() {
    this.setData({
      reportDatePickerVisible: true
    });
  },

  // 复诊日期选择确认
  onFollowUpDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      'checkReportForm.reportDate': dateStr,
      reportDateTimestamp: date.getTime(),
      reportDatePickerVisible: false
    });
  },

  // 复诊日期选择取消
  onFollowUpDateCancel() {
    this.setData({
      reportDatePickerVisible: false
    });
  },

  // 复诊日期选择器显示状态变化
  onFollowUpDateVisibleChange(e) {
    this.setData({
      reportDatePickerVisible: e.detail.visible
    });
  },

  // 显示就诊时间选择器
  showVisitTimePicker() {
    this.setData({
      checkDatePickerVisible: true
    });
  },

  // 就诊时间选择确认
  onVisitTimeConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      'checkReportForm.checkDate': dateStr,
      checkDateTimestamp: date.getTime(),
      checkDatePickerVisible: false
    });
  },

  // 就诊时间选择取消
  onVisitTimeCancel() {
    this.setData({
      checkDatePickerVisible: false
    });
  },

  // 就诊时间选择器显示状态变化
  onVisitTimeVisibleChange(e) {
    this.setData({
      checkDatePickerVisible: e.detail.visible
    });
  },

  // 显示报告类型选择器
  showReportTypePicker() {
    this.setData({
      reportTypePickerVisible: true
    });
  },

  // 选择报告类型项 - 直接选择并关闭弹窗
  selectReportType(e) {
    const { value, label } = e.currentTarget.dataset;
    this.setData({
      'checkReportForm.reportType': value,
      'checkReportForm.reportTypeLabel': label,
      reportTypePickerVisible: false,
      selectedReportType: value
    });
  },

  // 确认选择报告类型
  onReportTypeConfirm(e) {
    const { selectedReportType } = this.data;
    if (selectedReportType) {
      const selectedOption = this.data.reportTypeOptions.find(item => item.value === selectedReportType);
      this.setData({
        'checkReportForm.reportType': selectedReportType,
        'checkReportForm.reportTypeLabel': selectedOption.label,
        reportTypePickerVisible: false
      });
    }
  },

  // 取消报告类型选择
  onReportTypeCancel() {
    this.setData({
      reportTypePickerVisible: false
    });
  },

  // 报告类型选择器状态变化
  onReportTypePickerChange(e) {
    this.setData({
      reportTypePickerVisible: e.detail.visible
    });
  },

  // 显示记录日期选择器
  showRecordDatePicker() {
    this.setData({
      recordDatePickerVisible: true
    });
  },

  // 记录日期选择确认
  onRecordDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      'checkReportForm.recordDate': dateStr,
      recordDateTimestamp: date.getTime(),
      recordDatePickerVisible: false
    });
  },

  // 取消记录日期选择
  onRecordDateCancel() {
    this.setData({
      recordDatePickerVisible: false
    });
  },

  // 记录日期选择器状态变化
  onRecordDateVisibleChange(e) {
    this.setData({
      recordDatePickerVisible: e.detail.visible
    });
  },

  // 选择检查结果类型 - 按钮组直接选择
  selectResultType(e) {
    const { value, label } = e.currentTarget.dataset;
    this.setData({
      'checkReportForm.resultType': value,
      'checkReportForm.resultTypeLabel': label
    });
  },

  // 选择项目名称提示词
  selectProjectName(e) {
    const { name } = e.currentTarget.dataset;
    this.setData({
      'checkReportForm.projectName': name
    });
  },

  // 选择并上传图片到云存储
  async chooseAndUploadImage() {
    try {
      const currentCount = this.data.checkReportForm.images?.length || 0;
      const maxCount = 9 - currentCount;

      if (maxCount <= 0) {
        wx.showToast({
          title: '最多上传9张图片',
          icon: 'none'
        });
        return;
      }

      const res = await wx.chooseMedia({
        count: maxCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        maxDuration: 30,
        camera: 'back'
      });

      console.log('选择的图片:', res.tempFiles);

      if (!res.tempFiles || res.tempFiles.length === 0) {
        return;
      }

      wx.showLoading({ title: '上传图片中...', mask: true });

      // 上传所有图片到云存储
      const uploadPromises = res.tempFiles.map(async (tempFile, index) => {
        try {
          const fileExtension = tempFile.tempFilePath.split('.').pop().toLowerCase();
          const cloudPath = `check-reports/${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

          console.log(`上传第${index + 1}张图片:`, tempFile.tempFilePath);

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFile.tempFilePath
          });

          console.log(`第${index + 1}张图片上传成功:`, uploadResult.fileID);

          return {
            url: uploadResult.fileID,
            fileID: uploadResult.fileID,
            name: `image-${index + 1}.${fileExtension}`,
            size: tempFile.size,
            type: 'image'
          };
        } catch (error) {
          console.error(`第${index + 1}张图片上传失败:`, error);
          return null;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const validFiles = uploadedFiles.filter(file => file !== null);

      wx.hideLoading();

      if (validFiles.length === 0) {
        wx.showToast({
          title: '图片上传失败，请重试',
          icon: 'error'
        });
        return;
      }

      // 合并到现有图片列表
      const currentImages = this.data.checkReportForm.images || [];
      const newImages = [...currentImages, ...validFiles];

      this.setData({
        'checkReportForm.images': newImages
      });

      const successCount = validFiles.length;
      const failCount = res.tempFiles.length - successCount;

      if (failCount > 0) {
        wx.showToast({
          title: `成功${successCount}张，失败${failCount}张`,
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: `成功上传${successCount}张图片`,
          icon: 'success'
        });
      }

      console.log('所有图片已上传到云存储:', newImages);

    } catch (error) {
      wx.hideLoading();

      if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('用户取消选择图片');
        return;
      }

      console.error('选择或上传图片失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    }
  },

  // 预览上传的图片
  previewUploadImage(e) {
    const { images, current } = e.currentTarget.dataset;

    if (!images || !Array.isArray(images)) {
      console.error('图片数据无效:', images);
      return;
    }

    // 提取所有有效的云存储URL
    const urls = images
      .map(img => {
        if (typeof img === 'string') {
          return img;
        }
        return img.url || img.fileID;
      })
      .filter(url => url && url.startsWith('cloud://'));

    console.log('预览图片URLs:', urls);
    console.log('当前图片:', current);

    if (urls.length === 0) {
      wx.showToast({
        title: '暂无有效图片',
        icon: 'none'
      });
      return;
    }

    // 确保当前图片在URLs列表中
    let currentUrl = current;
    if (!urls.includes(currentUrl)) {
      currentUrl = urls[0];
    }

    wx.previewImage({
      urls: urls,
      current: currentUrl,
      fail: (err) => {
        console.error('图片预览失败:', err);
        wx.showToast({
          title: '图片预览失败',
          icon: 'none'
        });
      }
    });
  },

  // 删除上传的图片
  async removeUploadImage(e) {
    const { index } = e.currentTarget.dataset;
    const currentImages = [...(this.data.checkReportForm.images || [])];

    if (index < 0 || index >= currentImages.length) {
      return;
    }

    const deletedImage = currentImages[index];

    // 从云存储删除
    if (deletedImage && deletedImage.fileID) {
      try {
        await wx.cloud.deleteFile({
          fileList: [deletedImage.fileID]
        });
        console.log('从云存储删除图片成功:', deletedImage.fileID);
      } catch (error) {
        console.error('从云存储删除图片失败:', error);
      }
    }

    // 从列表删除
    currentImages.splice(index, 1);

    this.setData({
      'checkReportForm.images': currentImages
    });
  },

  // 图片上传失败
  onImageUploadFail(e) {
    console.error('图片上传失败:', e.detail);
    wx.showToast({
      title: '图片上传失败，请重试',
      icon: 'none'
    });
  },

  // 图片文件变化（包括上传、删除等操作）
  onImageChange(e) {
    console.log('onImageChange 被调用, event detail:', e.detail);
    const { files, trigger } = e.detail;

    if (trigger === 'remove') {
      console.log('通过 onImageChange 检测到删除操作');
      // 直接更新文件列表
      this.setData({
        'checkReportForm.images': files || []
      });
    } else if (trigger === 'add') {
      console.log('通过 onImageChange 检测到添加操作');
      this.setData({
        'checkReportForm.images': files || []
      });
    }
  },

  // 删除图片（同时删除云存储中的文件）
  async onImageRemove(e) {
    console.log('onImageRemove 被调用, event detail:', e.detail);

    const { index } = e.detail;

    // 获取当前图片列表
    const currentImages = [...(this.data.checkReportForm.images || [])];
    console.log('当前图片列表:', currentImages);

    // 验证索引有效性
    if (typeof index !== 'number' || index < 0 || index >= currentImages.length) {
      console.error('无效的删除索引:', index, '当前图片数量:', currentImages.length);
      return;
    }

    console.log('准备删除索引为', index, '的图片');

    // 获取要删除的图片
    const deletedImage = currentImages[index];

    // 如果是云存储的图片，尝试从云存储删除
    if (deletedImage && (deletedImage.fileID || (deletedImage.url && deletedImage.url.startsWith('cloud://')))) {
      try {
        const fileID = deletedImage.fileID || deletedImage.url;
        await wx.cloud.deleteFile({
          fileList: [fileID]
        });
        console.log('从云存储删除图片成功:', fileID);
      } catch (error) {
        console.error('从云存储删除图片失败:', error);
        // 删除失败不影响继续操作
      }
    }

    // 手动删除指定索引的图片
    currentImages.splice(index, 1);

    // 更新数据
    this.setData({
      'checkReportForm.images': currentImages
    });

    console.log('删除图片成功，剩余图片数量:', currentImages.length);
  },

  // 点击图片预览
  onImageClick(e) {
    const { files, index } = e.detail;

    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('图片列表无效:', files);
      wx.showToast({
        title: '图片数据错误',
        icon: 'none'
      });
      return;
    }

    // 过滤出有效的云存储图片
    const validFiles = files.filter(file =>
      file && file.url && file.url.startsWith('cloud://')
    );

    if (validFiles.length === 0) {
      wx.showModal({
        title: '无法预览',
        content: '图片尚未上传到云存储，或已失效。请稍后重试。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    const urls = validFiles.map(file => file.url);

    // 确保当前索引有效
    const currentIndex = index < urls.length ? index : 0;

    wx.previewImage({
      current: urls[currentIndex],
      urls: urls
    });
  },

  // 预览报告图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    const imageUrls = urls.map(img => img.url || img);

    wx.previewImage({
      current: current,
      urls: imageUrls
    });
  },

  // 预览记录中的报告图片  
  previewReportImage(e) {
    const { images, current } = e.currentTarget.dataset;

    if (!images || !Array.isArray(images) || images.length === 0) {
      console.error('图片数据无效:', images);
      wx.showToast({
        title: '图片数据错误',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '加载图片中...',
      mask: true
    });

    try {
      const imageUrls = images.map(img => {
        // 处理不同的图片数据格式
        let url = '';
        if (typeof img === 'string') {
          url = img;
        } else if (img && img.url) {
          url = img.url;
        } else if (img && img.fileID) {
          url = img.fileID;
        } else if (img && img.tempFilePath) {
          url = img.tempFilePath;
        }

        // 过滤掉本地临时文件（已失效，会导致一直loading）
        if (url && url.startsWith('http://tmp/')) {
          console.warn('检测到临时文件路径，已失效:', url);
          return ''; // 返回空字符串，稍后过滤掉
        }

        return url;
      }).filter(url => url && url.startsWith('cloud://')); // 只保留云存储的图片

      console.log('预览图片URLs:', imageUrls);
      console.log('当前图片:', current);

      wx.hideLoading();

      if (imageUrls.length === 0) {
        wx.showModal({
          title: '无法预览',
          content: '图片为本地临时文件，已失效。\n\n解决方法：\n1. 删除此记录\n2. 重新添加并上传图片\n3. 新上传的图片会自动保存到云存储',
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }

      // 处理当前图片URL
      let currentUrl = current;
      if (!imageUrls.includes(currentUrl)) {
        currentUrl = imageUrls[0];
      }

      wx.previewImage({
        current: currentUrl,
        urls: imageUrls,
        fail: (err) => {
          console.error('图片预览失败:', err);
          wx.showModal({
            title: '图片预览失败',
            content: '图片可能已失效或网络问题。请检查网络后重试，或删除此记录后重新添加。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('图片预览处理错误:', error);
      wx.showToast({
        title: '预览失败',
        icon: 'none'
      });
    }
  },

  // 图片加载成功
  onImageLoad(e) {
    console.log('图片加载成功:', e.detail);
  },

  // 图片加载失败
  onImageError(e) {
    console.error('图片加载失败:', e.detail);
    const { src } = e.currentTarget.dataset;
    wx.showToast({
      title: '图片加载失败',
      icon: 'none',
      duration: 2000
    });
  },

  // 显示检查日期选择器
  showCheckDatePicker() {
    this.setData({
      checkDatePickerVisible: true
    });
  },

  // 检查日期选择确认
  onCheckDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      'checkReportForm.checkDate': dateStr,
      checkDateTimestamp: date.getTime(),
      checkDatePickerVisible: false
    });
  },

  // 取消检查日期选择
  onCheckDateCancel() {
    this.setData({
      checkDatePickerVisible: false
    });
  },

  // 检查日期选择器状态变化
  onCheckDateVisibleChange(e) {
    this.setData({
      checkDatePickerVisible: e.detail.visible
    });
  },

  // 显示报告日期选择器
  showReportDatePicker() {
    this.setData({
      reportDatePickerVisible: true
    });
  },

  // 报告日期选择确认
  onReportDateConfirm(e) {
    const date = new Date(e.detail.value);
    const dateStr = this.formatDate(date);

    this.setData({
      'checkReportForm.reportDate': dateStr,
      reportDateTimestamp: date.getTime(),
      reportDatePickerVisible: false
    });
  },

  // 取消报告日期选择
  onReportDateCancel() {
    this.setData({
      reportDatePickerVisible: false
    });
  },

  // 报告日期选择器状态变化
  onReportDateVisibleChange(e) {
    this.setData({
      reportDatePickerVisible: e.detail.visible
    });
  },

  // 保存检查报告
  async saveCheckReport() {
    const { checkReportForm, isEditMode, editingRecordId, openid, currentProfileId, selectedDate } = this.data;

    // 验证必填字段
    if (!checkReportForm.recordDate) {
      wx.showToast({
        title: '请选择记录日期',
        icon: 'none'
      });
      return;
    }

    if (!checkReportForm.projectName.trim()) {
      wx.showToast({
        title: '请输入检查项目名称',
        icon: 'none'
      });
      return;
    }

    if (!checkReportForm.resultType) {
      wx.showToast({
        title: '请选择检查结果',
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

      const recordData = {
        openid,
        profileId: currentProfileId,
        date: checkReportForm.recordDate, // 使用表单中选择的记录日期作为主日期
        recordDate: checkReportForm.recordDate,
        projectName: checkReportForm.projectName.trim(),
        detailedResults: checkReportForm.detailedResults.trim(),
        resultType: checkReportForm.resultType,
        resultTypeLabel: checkReportForm.resultTypeLabel,
        images: checkReportForm.images || [],
        notes: checkReportForm.notes.trim(),
        updateTime: db.serverDate()
      };

      if (isEditMode) {
        // 更新现有记录
        await db.collection('checkReports')
          .doc(editingRecordId)
          .update({
            data: recordData
          });
      } else {
        // 添加新记录
        recordData.createTime = db.serverDate();
        await db.collection('checkReports').add({
          data: recordData
        });
      }

      wx.showToast({
        title: isEditMode ? '保存成功' : '添加成功',
        icon: 'success'
      });

      // 关闭弹窗
      this.setData({
        showCheckReportDialog: false
      });

      // 重新加载数据
      this.loadCheckReports();

      // 通知首页刷新日历
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
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

  // 通过ID加载检查报告
  async loadCheckReportById(reportId) {
    const { openid, currentProfileId } = this.data;

    if (!openid || !currentProfileId) {
      console.error('用户信息缺失，无法加载检查报告');
      return;
    }

    try {
      wx.showLoading({ title: '加载中...' });

      const db = wx.cloud.database();
      const res = await db.collection('checkReports')
        .doc(reportId)
        .get();

      if (res.data) {
        const report = res.data;

        // 设置日期选择器到该报告的日期
        this.setData({
          selectedDate: report.date,
          selectedDateTimestamp: new Date(report.date).getTime()
        });

        // 加载该日期的所有检查报告
        await this.loadCheckReports();
      } else {
        wx.showToast({
          title: '未找到该检查报告',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载检查报告失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
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