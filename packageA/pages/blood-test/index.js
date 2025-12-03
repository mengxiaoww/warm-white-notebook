// 移除Toast import，使用wx.showToast替代

// 引入微信同声传译插件
const plugin = requirePlugin("WechatSI");
const manager = plugin.getRecordRecognitionManager();

Page({
  data: {
    // 选中的日期
    selectedDate: '',

    // 日期选择器状态
    datePickerVisible: false,

    // 基础表单数据
    formData: {
      wbc: '',
      neut: '',
      hgb: '',
      plt: '',
      rbc: '',
      crp: '',
      hct: '',
      lymph: '',
      mono: ''
    },

    // 正常范围参考值
    normalRanges: {
      wbc: { min: '4.0', max: '10.0' },
      neut: { min: '2.0', max: '7.0' },
      hgb: { min: '120', max: '160' }, // 男性参考值
      plt: { min: '100', max: '300' }
    },

    // 自定义指标列表
    customIndicators: [],

    // 用户选中的指标配置
    userIndicatorConfig: {
      wbc: true,
      neut: true,
      hgb: true,
      plt: true
    },

    // 显示的基础指标
    displayedBasicIndicators: [
      { id: 'wbc', name: '白细胞', unit: '×10⁹/L' },
      { id: 'neut', name: '中性粒细胞数', unit: '×10⁹/L' },
      { id: 'hgb', name: '血红蛋白', unit: 'g/L' },
      { id: 'plt', name: '血小板', unit: '×10⁹/L' }
    ],

    // 用户信息
    openid: '',
    currentProfileId: '',

    // 当前记录ID（编辑模式）
    recordId: '',
    isLoggedIn: false,

    // 当前聚焦的输入框索引（用于键盘切换）
    focusIndex: -1,

    // AI识别相关
    aiImportMenuVisible: false, // AI导入方式选择弹窗
    aiResultVisible: false,  // AI结果弹窗显示状态
    aiRecognizedData: [],    // AI识别的数据
    currentImagePath: '',     // 当前识别的图片路径

    // 语音录音相关
    voiceRecordingVisible: false, // 语音录音弹窗显示状态
    isRecording: false,           // 是否正在录音
    recordDuration: 0,            // 录音时长（秒）
    recognizedText: ''            // 实时识别的文字
  },

  // 页面初始化
  onLoad(options) {
    console.log('🎯 血常规页面 onLoad，传入参数:', options);

    // 设置基础数据
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = options.date || today; // 如果有传入日期就使用传入的，否则使用今天

    console.log('🗓️ 设置日期:', selectedDate, '(今天:', today, ')');

    this.setData({
      selectedDate: selectedDate,
      recordId: options.recordId || ''
    });

    console.log('✅ 页面初始化完成，当前数据:', this.data);
  },

  // 页面渲染完成后再加载用户配置
  onReady() {

    // 异步加载用户配置，不阻塞页面显示
    setTimeout(() => {
      this.checkLoginAndLoadData();
    }, 100);
  },

  // 页面显示/切入前台时触发
  onShow() {

    // 检查是否需要刷新数据
    const app = getApp();
    if (app.globalData.needRefreshData) {
      app.globalData.needRefreshData = false;
      this.checkLoginAndLoadData();
    }

    // 检查是否有临时配置预览（从配置页面返回）
    if (app.globalData.temporaryBloodTestConfig) {
      this.loadTemporaryConfiguration();

      // 🔧 关键修复：恢复用户之前的输入
      this.restoreTemporaryUserInput();
    } else if (app.globalData.needRefreshBloodTestConfig || app.globalData.indicatorConfigChanged) {
      app.globalData.needRefreshBloodTestConfig = false;
      app.globalData.indicatorConfigChanged = false;

      wx.showLoading({
        title: '刷新配置中...',
        mask: true
      });

      this.loadCompleteConfiguration().then(() => {
        wx.hideLoading();
      }).catch(err => {
        console.error('配置刷新失败:', err);
        wx.hideLoading();
      });
    }
  },

  // 页面卸载
  onUnload() {
    // 清理临时配置（如果未保存）
    this.cleanupTemporaryConfigIfNotSaved();
  },

  // 页面隐藏
  onHide() {
    // 清理临时配置（如果未保存）
    this.cleanupTemporaryConfigIfNotSaved();
  },

  // 加载临时配置预览
  loadTemporaryConfiguration() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBloodTestConfig;

    if (!tempConfig || !tempConfig.isTemporary) {
      return;
    }


    // 根据临时配置构建显示的指标列表
    const { selectedIndicators, customIndicators, indicatorConfigs } = tempConfig;

    // 构建基础指标列表
    const basicIndicators = [
      { id: 'wbc', name: '白细胞', unit: '×10⁹/L' },
      { id: 'neut', name: '中性粒细胞数', unit: '×10⁹/L' },
      { id: 'hgb', name: '血红蛋白', unit: 'g/L' },
      { id: 'plt', name: '血小板', unit: '×10⁹/L' },
      { id: 'rbc', name: '红细胞', unit: '×10¹²/L' },
      { id: 'crp', name: 'C反应蛋白', unit: 'mg/L' },
      { id: 'hct', name: '红细胞压积', unit: '%' },
      { id: 'lymph', name: '淋巴细胞绝对值', unit: '×10⁹/L' },
      { id: 'mono', name: '单核细胞绝对值', unit: '×10⁹/L' }
    ];

    // 过滤出被选中的基础指标
    console.log('🔍 selectedIndicators配置:', selectedIndicators);
    console.log('🔍 basicIndicators列表:', basicIndicators.map(i => i.id));

    const displayedBasicIndicators = basicIndicators.filter(indicator => {
      const isSelected = selectedIndicators[indicator.id];
      console.log(`🔍 检查指标 ${indicator.id}(${indicator.name}): 选中=${isSelected}`);

      if (isSelected && indicatorConfigs[indicator.id]) {
        // 使用自定义配置覆盖默认值
        const customConfig = indicatorConfigs[indicator.id];
        indicator.name = customConfig.name || indicator.name;
        indicator.unit = customConfig.unit || indicator.unit;
      }
      return isSelected;
    });

    console.log('🔍 最终显示的基础指标:', displayedBasicIndicators.map(i => `${i.id}(${i.name})`));

    // 过滤出被选中的自定义指标
    const displayedCustomIndicators = customIndicators.filter(indicator => {
      return selectedIndicators[indicator.id];
    }).map(indicator => ({
      id: indicator.id,
      name: indicator.fullName,
      min: indicator.min,
      max: indicator.max,
      unit: indicator.unit
    }));

    // 更新页面数据
    this.setData({
      displayedBasicIndicators,
      customIndicators: displayedCustomIndicators,
      isTemporaryConfig: true // 标记当前使用临时配置
    });

    // 显示预览提示
    wx.showToast({
      title: '加载配置预览，保存后生效',
      icon: 'none',
      duration: 2500
    });

  },

  // 🔧 关键修复：恢复用户之前的输入（从配置页面返回后）
  restoreTemporaryUserInput() {
    const app = getApp();
    const tempInput = app.globalData.temporaryBloodTestInput;

    if (!tempInput || !tempInput.formData) {
      return;
    }

    // 检查时间戳，超过10分钟就忽略
    const now = Date.now();
    const savedTime = tempInput.savedAt || 0;
    const isValid = (now - savedTime) < 10 * 60 * 1000; // 10分钟

    if (!isValid) {
      delete app.globalData.temporaryBloodTestInput;
      return;
    }

    // 检查日期是否匹配
    if (tempInput.selectedDate === this.data.selectedDate) {
      console.log('🔄 恢复血常规用户临时输入:', tempInput.formData);

      // 恢复表单数据，但不覆盖现有数据（如果有的话）
      const currentFormData = this.data.formData || {};
      const restoredFormData = { ...currentFormData };

      Object.keys(tempInput.formData).forEach(key => {
        // 只有当前字段为空时才恢复
        if (!restoredFormData[key] || restoredFormData[key].toString().trim() === '') {
          restoredFormData[key] = tempInput.formData[key];
        }
      });

      this.setData({
        formData: restoredFormData
      });

      console.log('✅ 血常规用户输入已恢复');
    } else {
      console.log('📅 血常规临时输入日期不匹配，忽略恢复');
    }

    // 清理临时输入（无论是否恢复都要清理）
    delete app.globalData.temporaryBloodTestInput;
  },

  // 清理临时配置（如果未保存）
  cleanupTemporaryConfigIfNotSaved() {
    const app = getApp();
    if (app.globalData && app.globalData.temporaryBloodTestConfig && this.data.isTemporaryConfig) {
      console.log('🧹 清理未保存的临时配置');
      delete app.globalData.temporaryBloodTestConfig;

      // 重新加载原有配置
      this.loadCompleteConfiguration();
    }
  },

  // 显示更多菜单
  showMoreMenu() {
    wx.showActionSheet({
      itemList: ['查看历史记录', '导出数据'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.viewHistory();
        } else if (res.tapIndex === 1) {
          this.exportData();
        }
      }
    });
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

    wx.showLoading({
      title: '切换日期中...',
      mask: true
    });

    // 立即设置默认配置
    this.setData({
      selectedDate,
      datePickerVisible: false,
      recordId: '',
      formData: {
        wbc: '',
        neut: '',
        hgb: '',
        plt: '',
        rbc: '',
        crp: '',
        hct: '',
        lymph: '',
        mono: ''
      },
      displayedBasicIndicators: [
        { id: 'wbc', name: '白细胞', unit: '×10⁹/L' },
        { id: 'neut', name: '中性粒细胞数', unit: '×10⁹/L' },
        { id: 'hgb', name: '血红蛋白', unit: 'g/L' },
        { id: 'plt', name: '血小板', unit: '×10⁹/L' }
      ],
      customIndicators: []
    });

    // 加载真正的配置
    this.loadCompleteConfiguration().then(() => {
      wx.hideLoading();
    }).catch(err => {
      console.error('切换日期时配置加载失败:', err);
      wx.hideLoading();
    });
  },

  // 日期选择取消
  onDateCancel() {
    this.setData({
      datePickerVisible: false
    });
  },

  // OCR扫描录入
  scanOCR() {
    // 直接调用新的分片上传OCR方法
    this.chooseImageAndOCR();
  },

  // 解析OCR识别结果
  parseOCRResult(items) {
    const formData = { ...this.data.formData };
    let hasMatch = false;
    let detectedDate = null;

    // 1. 先尝试识别日期
    detectedDate = this.extractDateFromOCR(items);
    if (detectedDate) {
      console.log(`🗓️ OCR识别到日期: ${detectedDate}`);
    }

    // 2. 精确匹配规则 - 只进行精确匹配，避免错误匹配
    const indicatorRules = {
      'wbc': {
        // 只保留精确匹配的关键词
        keywords: ['WBC', '白细胞计数', '白细胞（WBC）', '白细胞数', '白细胞(WBC)', '★白细胞'],
        englishKeywords: ['WBC'] // 英文关键词优先
      },
      'hgb': {
        keywords: ['HGB', '红蛋白', '血红蛋白', 'Hb', 'HB', '血红蛋白（HGB）', '★血红蛋白', '血红蛋白浓度', '血红蛋白(HGB)', '血红素'],
        englishKeywords: ['HGB', 'Hb', 'HB']
      },
      'plt': {
        keywords: ['PLT', 'Plt', '血小板', '血小板计数', '血小板（PLT）', '血小板数', '血小板(PLT)', '★血小板', '血小板数目'],
        englishKeywords: ['PLT', 'Plt']
      },
      'neut': {
        keywords: ['NEUT#', 'Neu#', '中性粒细胞数', '中性粒细胞绝对值', '中性粒细胞#', '中性粒细胞计数'],
        englishKeywords: ['NEUT#', 'Neu#']
      },
      'lymph': {
        keywords: ['LYMPH#', 'Lym#', '淋巴细胞数', '淋巴细胞绝对值', '淋巴细胞#', '淋巴细胞计数'],
        englishKeywords: ['LYMPH#', 'Lym#']
      },
      'mono': {
        keywords: ['MONO#', 'Mon#', '单核细胞数', '单核细胞绝对值', '单核细胞#', '单核细胞计数'],
        englishKeywords: ['MONO#', 'Mon#']
      },
      'crp': {
        keywords: ['CRP', 'C反应蛋白', 'C-反应蛋白', 'C反应蛋白(CRP)'],
        englishKeywords: ['CRP']
      }
    };

    // 跟踪已经找到的指标，避免重复赋值
    const foundIndicators = new Set();

    // 3. 新的简化匹配逻辑 - 专门适配5张血常规图片
    Object.keys(indicatorRules).forEach(field => {
      if (foundIndicators.has(field)) return;

      const rules = indicatorRules[field];
      let matchedValue = null;
      let matchedKeyword = null;

      console.log(`🔍 开始匹配指标: ${field}`);
      console.log(`  关键词: [${rules.keywords.join(', ')}]`);
      console.log(`  英文关键词: [${rules.englishKeywords.join(', ')}]`);

      // 新策略：智能匹配任何包含关键词的行
      const result = this.smartMatchIndicator(items, rules, field);
      if (result) {
        matchedValue = result.value;
        matchedKeyword = result.keyword;
        console.log(`✅ 智能匹配找到 ${field} -> 关键词: "${matchedKeyword}" -> 值: ${matchedValue}`);
      } else {
        console.log(`  ✗ ${field} 匹配失败`);
      }

      // 更新表单数据
      if (matchedValue) {
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allIndicatorIds = []
          .concat(displayedBasicIndicators.map(i => i.id))
          .concat(customIndicators.map(i => i.id));

        if (allIndicatorIds.includes(field)) {
          formData[field] = matchedValue;
          foundIndicators.add(field);
          hasMatch = true;
        }
      }
    });

    // 5. 输出识别结果摘要
    console.log('📊 OCR识别结果摘要:');
    console.log(`• 检测到日期: ${detectedDate || '未检测到'}`);
    console.log(`• 识别到指标数量: ${foundIndicators.size}`);
    console.log(`• 尝试匹配的指标: ${Object.keys(indicatorRules).join(', ')}`);
    if (foundIndicators.size > 0) {
      Array.from(foundIndicators).forEach(field => {
        console.log(`  ✓ ${field}: ${formData[field]}`);
      });
      // 显示未匹配到的指标
      const missedIndicators = Object.keys(indicatorRules).filter(field => !foundIndicators.has(field));
      if (missedIndicators.length > 0) {
        console.log(`  ✗ 未匹配到: ${missedIndicators.join(', ')}`);
      }
    } else {
      console.log(`  ✗ 所有指标都未匹配到`);
    }

    // 输出所有OCR识别到的文本内容（供调试）
    console.log('🔍 包含数字的文本行（可能的检测值）:');
    console.log('🔍 寻找遗漏的关键数值（108, 290, 3.29, 1.71）:');
    items.forEach((item, index) => {
      const text = item.text.trim();
      if (/\d+(\.\d+)?/.test(text) && !text.includes('姓名') && !text.includes('编号') &&
        !text.includes('年龄') && !text.includes('岁') && !text.includes('电话') &&
        !text.includes('床号') && !text.includes('日期') && !text.includes('时间')) {
        const hasTargetValue = text.includes('108') || text.includes('290') || text.includes('3.29') || text.includes('1.71');
        console.log(`  ${index + 1}. "${text}" ${/^\d+(\.\d+)?$/.test(text) ? '(纯数值)' : '(含数值)'} ${hasTargetValue ? '🎯 关键数值!' : ''}`);
      }
    });

    console.log('🔍 OCR识别到的所有文本:');
    items.forEach((item, index) => {
      const text = item.text.trim();
      console.log(`  ${index + 1}. "${text}"`);
      // 特别标记包含血小板相关内容的行
      if (text.includes('血小板') || text.includes('PLT') || text.includes('Plt') || text.includes('plt')) {
        console.log(`    ⚠️ 此行包含血小板相关关键词`);
      }
      // 特别标记包含中性粒细胞的行
      if (text.includes('中性粒细胞') || text.includes('中性细胞') || text.includes('NEUT')) {
        console.log(`    ⚠️ 此行包含中性粒细胞相关关键词`);
        if (text.includes('%') || text.includes('％')) {
          console.log(`    🚫 此行是百分比值，应该跳过`);
        }
      }
    });

    // 专门检查血小板计数匹配
    console.log('🔍 血小板计数专项检查:');
    const plateletTexts = items.filter(item =>
      item.text.includes('血小板') || item.text.includes('PLT') || item.text.includes('plt') || item.text.includes('Plt') || item.text.includes('小板')
    );
    plateletTexts.forEach((item, index) => {
      console.log(`  血小板文本 ${index + 1}: "${item.text}"`);
      if (item.text.includes('血小板计数')) {
        console.log(`    ✅ 找到血小板计数文本`);
      }
    });

    console.log('🔍 血红蛋白专项检查:');
    const hemoglobinTexts = items.filter(item =>
      item.text.includes('血红蛋白') || item.text.includes('HGB') || item.text.includes('Hb') ||
      item.text.includes('HB') || item.text.includes('红蛋白') || item.text.includes('血红') ||
      item.text.includes('红细胞') || item.text.includes('RBC')
    );
    hemoglobinTexts.forEach((item, index) => {
      console.log(`  血红蛋白文本 ${index + 1}: "${item.text}"`);
      if (item.text.includes('血红蛋白') || item.text.includes('HGB')) {
        console.log(`    ✅ 找到血红蛋白文本`);
      }
    });

    // 专门检查中性粒细胞匹配
    console.log('🔍 中性粒细胞专项检查:');
    const neutrophilTexts = items.filter(item =>
      item.text.includes('中性粒细胞') || item.text.includes('中性细胞') || item.text.includes('NEUT')
    );
    neutrophilTexts.forEach((item, index) => {
      const text = item.text.trim();
      console.log(`  中性粒细胞文本 ${index + 1}: "${text}"`);
      if (text.includes('%') || text.includes('％')) {
        console.log(`    🚫 这是百分比值，应该被跳过`);
      } else {
        console.log(`    ✅ 这是绝对值，应该被匹配`);
      }
    });

    // 4. 处理识别结果和日期
    if (hasMatch) {
      // 如果识别到了日期，询问用户是否使用该日期
      if (detectedDate && detectedDate !== this.data.selectedDate) {
        wx.showModal({
          title: '检测到报告日期',
          content: `识别到报告日期为 ${detectedDate}，是否使用该日期？当前选择的是 ${this.data.selectedDate}`,
          confirmText: '使用',
          cancelText: '保持当前',
          success: (res) => {
            if (res.confirm) {
              // 用户选择使用识别到的日期
              this.setData({
                selectedDate: detectedDate,
                formData
              });
              console.log(`📅 用户选择使用识别日期: ${detectedDate}`);
            } else {
              // 用户选择保持当前日期
              this.setData({ formData });
              console.log(`📅 用户选择保持当前日期: ${this.data.selectedDate}`);
            }

            const successMsg = foundIndicators.size > 1 ?
              `识别成功，共${foundIndicators.size}个指标` : '识别成功';
            wx.showToast({
              title: successMsg,
              icon: 'success'
            });
          }
        });
      } else {
        // 没有检测到日期或日期相同，直接更新数据
        this.setData({ formData });
        const successMsg = foundIndicators.size > 1 ?
          `识别成功，共${foundIndicators.size}个指标` : '识别成功';
        wx.showToast({
          title: successMsg,
          icon: 'success'
        });
      }
    } else {
      wx.showToast({
        title: '未识别到血常规数据',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 从OCR结果中提取日期
  extractDateFromOCR(items) {
    const dateKeywords = ['报告日期', '审核日期', '检查日期', '检验日期', '采样日期'];

    for (let i = 0; i < items.length; i++) {
      const text = items[i].text.trim();

      // 检查是否包含日期关键词
      const hasDateKeyword = dateKeywords.some(keyword => text.includes(keyword));

      if (hasDateKeyword) {
        // 在当前行查找日期
        let dateMatch = this.extractDateFromText(text);
        if (dateMatch) {
          return dateMatch;
        }

        // 在下一行查找日期
        if (i < items.length - 1) {
          const nextText = items[i + 1].text.trim();
          dateMatch = this.extractDateFromText(nextText);
          if (dateMatch) {
            return dateMatch;
          }
        }
      } else {
        // 直接在文本中查找日期格式
        const dateMatch = this.extractDateFromText(text);
        if (dateMatch) {
          return dateMatch;
        }
      }
    }

    return null;
  },

  // 从文本中提取日期
  extractDateFromText(text) {
    // 支持多种日期格式：2024-01-15, 2024/01/15, 2024.01.15, 2024年01月15日
    const datePatterns = [
      /(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})/,  // 2024-01-15, 2024/01/15, 2024.01.15
      /(\d{4}年\d{1,2}月\d{1,2}日)/,          // 2024年01月15日
      /(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4})/   // 15-01-2024格式
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];

        // 标准化日期格式为 YYYY-MM-DD
        let normalizedDate = dateStr;

        if (dateStr.includes('年')) {
          // 处理中文格式：2024年01月15日 -> 2024-01-15
          normalizedDate = dateStr
            .replace(/年/, '-')
            .replace(/月/, '-')
            .replace(/日/, '');
        } else if (dateStr.includes('/')) {
          // 处理斜杠格式：2024/01/15 -> 2024-01-15
          normalizedDate = dateStr.replace(/\//g, '-');
        } else if (dateStr.includes('.')) {
          // 处理点格式：2024.01.15 -> 2024-01-15
          normalizedDate = dateStr.replace(/\./g, '-');
        }

        // 验证日期是否有效
        if (this.isValidDate(normalizedDate)) {
          return normalizedDate;
        }
      }
    }

    return null;
  },
  // 验证日期格式是否有效
  isValidDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return false;
    }

    // 检查年份是否合理（2010-2030）
    const year = date.getFullYear();
    if (year < 2010 || year > 2030) {
      return false;
    }

    return true;
  },

  // 简化版指标数值查找
  findIndicatorValue(items, keywords, isExactMatch, indicatorRule = null) {
    console.log(`🔍 查找关键词: ${keywords.join(', ')} (范围: ${indicatorRule?.range?.min}-${indicatorRule?.range?.max})`);

    // 遍历所有文本，查找包含关键词的行
    for (let i = 0; i < items.length; i++) {
      const text = items[i].text.trim();

      // 检查是否包含任何关键词（优先匹配英文关键词）
      const matchedKeywords = keywords.filter(keyword => {
        // 精确匹配：文本完全等于关键词，或者关键词作为完整词出现
        return text === keyword ||
          text.match(new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
      });
      if (matchedKeywords.length === 0) continue;

      // 优先选择英文关键词（大写字母组成的），否则选择最长的中文关键词
      const englishKeywords = matchedKeywords.filter(keyword =>
        /^[A-Z]{2,}#?$/.test(keyword) || // WBC, PLT, NEUT#, 等
        /^[A-Z][a-z]+#?$/.test(keyword)  // Lym#, Mon#, Neu#, 等
      );
      const matchedKeyword = englishKeywords.length > 0
        ? englishKeywords[0]  // 有英文关键词就用英文的
        : matchedKeywords.reduce((longest, current) =>
          current.length > longest.length ? current : longest
        );

      console.log(`  🎯 在文本 "${text}" 中找到关键词: "${matchedKeyword}" (从候选: [${matchedKeywords.join(', ')}])`);
      console.log(`  📋 英文关键词列表: [${englishKeywords.join(', ')}]`);
      console.log(`  📋 最终选择的关键词: "${matchedKeyword}"`);

      // 特别调试白细胞
      if (matchedKeywords.some(k => k.includes('白细胞')) || matchedKeywords.includes('WBC')) {
        console.log(`  🚨 [白细胞特殊调试] 关键词: "${matchedKeyword}", 文本: "${text}"`);
        console.log(`  🚨 [白细胞特殊调试] 所有匹配的关键词: [${matchedKeywords.join(', ')}]`);
        console.log(`  🚨 [白细胞特殊调试] 筛选出的英文关键词: [${englishKeywords.join(', ')}]`);
      }

      // 排除百分比行（对于绝对值指标）
      if (this.shouldSkipPercentage(matchedKeyword, text)) {
        console.log(`  跳过百分比: "${text}"`);
        continue;
      }

      // 尝试从当前行提取数值
      let value = this.extractNumber(text, indicatorRule);
      if (value) {
        const formattedValue = this.formatValue(value);
        console.log(`  🎯 当前行找到数值: ${value} → 格式化后: ${formattedValue}`);

        // 特别调试白细胞
        if (matchedKeyword.includes('白细胞')) {
          console.log(`  🚨 [白细胞特殊调试] 最终返回值: ${formattedValue}`);
        }

        return { value: formattedValue, keyword: matchedKeyword };
      }

      // 尝试从相邻行提取数值
      for (let offset = -1; offset <= 1; offset++) {
        if (offset === 0) continue;
        const adjIndex = i + offset;
        if (adjIndex < 0 || adjIndex >= items.length) continue;

        const adjText = items[adjIndex].text.trim();
        if (adjText.includes('%') || adjText.includes('％')) continue;

        value = this.extractNumber(adjText, indicatorRule);
        if (value) {
          console.log(`  🎯 相邻行找到数值: ${value} (第${adjIndex + 1}行: "${adjText}")`);
          return { value: this.formatValue(value), keyword: matchedKeyword };
        }
      }
    }

    console.log(`  ❌ 未找到匹配数值`);
    return null;
  },

  // 检查是否应该跳过百分比行
  shouldSkipPercentage(keyword, text) {
    const isAbsoluteValueIndicator = keyword.includes('中性粒细胞') ||
      keyword.includes('淋巴细胞') ||
      keyword.includes('单核细胞') ||
      keyword.includes('嗜酸') ||
      keyword.includes('嗜碱');

    const hasPercentage = text.includes('%') ||
      text.includes('％') ||
      text.includes('比率') ||
      text.includes('比例') ||
      text.includes('百分比');

    return isAbsoluteValueIndicator && hasPercentage;
  },

  // 重新设计的数值提取逻辑 - 针对5张血常规图片优化
  extractNumber(text, indicatorRule) {
    console.log(`    📊 从文本提取数值: "${text}"`);

    // 完全重新设计的匹配策略：
    // 1. 英文缩写优先：如果有WBC、PLT等，优先取其后面的数值
    // 2. 处理多种箭头格式：↑↓
    // 3. 处理小数点和整数
    // 4. 支持不同分隔符

    // 策略1：英文缩写后直接跟数值（最高优先级）
    const englishDirectPatterns = [
      /\bWBC\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i,
      /\bPLT\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i,
      /\bHGB\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i,
      /\bNEUT#?\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i,
      /\bLYM#?\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i,
      /\bMON#?\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i,
      /\bCRP\s+(\d+(?:\.\d+)?)\s*[↑↓]?/i
    ];

    for (const pattern of englishDirectPatterns) {
      const match = text.match(pattern);
      if (match) {
        const valueStr = match[1];
        const num = parseFloat(valueStr);
        console.log(`    🎯 英文直接匹配: "${match[0]}" → 数值: "${valueStr}"`);

        if (this.isValidNumber(num, indicatorRule)) {
          console.log(`    ✅ 英文直接匹配成功: ${valueStr}`);
          return valueStr;
        }
      }
    }

    // 策略2：中文关键词后跟数值
    const chinesePatterns = [
      /白细胞[计数]*\s*[（(]?[WBC]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/,
      /血红蛋白\s*[（(]?[HGB]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/,
      /血小板[计数]*\s*[（(]?[PLT]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/,
      /中性[粒]*细胞[数计数绝对值#]*\s*[（(]?[NEUT#]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/,
      /淋巴细胞[数计数绝对值#]*\s*[（(]?[LYM#]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/,
      /单核细胞[数计数绝对值#]*\s*[（(]?[MON#]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/,
      /C反应蛋白\s*[（(]?[CRP]*[)）]?\s*(\d+(?:\.\d+)?)\s*[↑↓]?/
    ];

    for (const pattern of chinesePatterns) {
      const match = text.match(pattern);
      if (match) {
        const valueStr = match[1];
        const num = parseFloat(valueStr);
        console.log(`    🎯 中文匹配: "${match[0]}" → 数值: "${valueStr}"`);

        if (this.isValidNumber(num, indicatorRule)) {
          console.log(`    ✅ 中文匹配成功: ${valueStr}`);
          return valueStr;
        }
      }
    }

    // 策略3：通用数值匹配（最后的兜底）
    const generalPatterns = [
      /(\d+\.\d+)\s*[↑↓]?/,  // 优先匹配小数
      /[↑↓]\s*(\d+\.\d+)/,   // 箭头后的小数
      /(\d+)\s*[↑↓]?/,       // 整数
      /[↑↓]\s*(\d+)/         // 箭头后的整数
    ];

    for (const pattern of generalPatterns) {
      const match = text.match(pattern);
      if (match) {
        const valueStr = match[1];
        const num = parseFloat(valueStr);
        console.log(`    🎯 通用匹配: "${match[0]}" → 数值: "${valueStr}"`);

        if (this.isValidNumber(num, indicatorRule)) {
          console.log(`    ✅ 通用匹配成功: ${valueStr}`);
          return valueStr;
        }
      }
    }

    console.log(`    ❌ 所有策略都未找到有效数值`);
    return null;
  },

  // 数值有效性验证（移除范围限制，允许所有正数值）
  isValidNumber(num, indicatorRule) {
    console.log(`      🔢 验证数值: ${num}`);

    // 只做基本验证：必须是正数
    if (isNaN(num)) {
      console.log(`      ❌ 数值验证失败: NaN`);
      return false;
    }
    if (num <= 0) {
      console.log(`      ❌ 数值验证失败: 数值小于等于0`);
      return false;
    }
    if (num > 100000) { // 放宽上限到100000
      console.log(`      ❌ 数值验证失败: 数值过大 (>${100000})`);
      return false;
    }

    console.log(`      ✅ 数值验证通过: ${num}`);
    return true;
  },

  // 新的智能匹配方法 - 专门针对5张血常规图片优化
  smartMatchIndicator(items, rules, fieldName) {
    console.log(`🎯 开始智能匹配 ${fieldName}...`);

    // 新策略：先找到关键词行，然后在该行及后续几行中寻找数值
    for (let i = 0; i < items.length; i++) {
      const text = items[i].text.trim();
      if (!text) continue;

      // 检查是否精确匹配任何关键词（完整词匹配）
      const matchedKeywords = rules.keywords.filter(keyword => {
        // 精确匹配：文本完全等于关键词，或者关键词作为完整词出现
        return text === keyword ||
          text.match(new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
      });
      if (matchedKeywords.length === 0) continue;

      console.log(`  🔍 文本行 "${text}" 包含关键词: [${matchedKeywords.join(', ')}]`);

      // 优先选择英文关键词
      let selectedKeyword = null;
      for (const englishKeyword of rules.englishKeywords) {
        if (matchedKeywords.includes(englishKeyword)) {
          selectedKeyword = englishKeyword;
          console.log(`  ✨ 优先选择英文关键词: "${selectedKeyword}"`);
          break;
        }
      }

      // 如果没有英文关键词，选择最长的中文关键词
      if (!selectedKeyword) {
        selectedKeyword = matchedKeywords.reduce((longest, current) =>
          current.length > longest.length ? current : longest
        );
        console.log(`  📝 选择中文关键词: "${selectedKeyword}"`);
      }

      // 跳过百分比行（对于绝对值指标）
      if (this.shouldSkipPercentage(selectedKeyword, text)) {
        console.log(`  ⏭️  跳过百分比行: "${text}"`);
        continue;
      }

      // 策略：在找到关键词的行开始，检查当前行和后续5行寻找数值
      for (let searchOffset = 0; searchOffset <= 5; searchOffset++) {
        const searchIndex = i + searchOffset;
        if (searchIndex >= items.length) break;

        const searchText = items[searchIndex].text.trim();
        if (!searchText) continue;

        console.log(`    🔎 检查第${searchIndex + 1}行: "${searchText}"`);

        // 特殊处理：如果是WBC，优先在包含"WBC"的行或其后面寻找
        if (fieldName === 'wbc' && searchText === 'WBC') {
          console.log(`    🎯 找到WBC行，检查后续行的数值...`);
          // 检查WBC行后面的几行
          for (let wbcOffset = 1; wbcOffset <= 3; wbcOffset++) {
            const wbcIndex = searchIndex + wbcOffset;
            if (wbcIndex >= items.length) break;
            const wbcText = items[wbcIndex].text.trim();
            console.log(`      📊 WBC后第${wbcOffset}行: "${wbcText}"`);
            if (/^\d+(\.\d+)?$/.test(wbcText)) {
              const num = parseFloat(wbcText);
              if (this.isValidNumber(num, rules)) {
                const formattedValue = this.formatValue(wbcText);
                console.log(`    ✅ WBC匹配成功: "${selectedKeyword}" -> "${formattedValue}"`);
                return { value: formattedValue, keyword: selectedKeyword };
              }
            }
          }
          continue;
        }

        // 对于中性粒细胞，严格只匹配绝对值行
        if (fieldName === 'neut') {
          // 首先跳过所有百分比行
          if (searchText.includes('NEUT%') || searchText.includes('%') || searchText.includes('比值')) {
            console.log(`    ⏭️ 跳过中性粒细胞百分比行: "${searchText}"`);
            continue;
          }
          // 只匹配包含NEUT#（绝对值）或"中性粒细胞计数"的行
          if (searchText.includes('NEUT#') || searchText.includes('中性粒细胞计数')) {
            console.log(`    🎯 找到中性粒细胞绝对值行: "${searchText}"`);
            // 检查这行后面的数值
            for (let neutOffset = 1; neutOffset <= 3; neutOffset++) {
              const neutIndex = searchIndex + neutOffset;
              if (neutIndex >= items.length) break;
              const neutText = items[neutIndex].text.trim();
              console.log(`      📊 NEUT#后第${neutOffset}行: "${neutText}"`);
              if (/^\d+(\.\d+)?$/.test(neutText)) {
                const num = parseFloat(neutText);
                if (this.isValidNumber(num, rules)) {
                  const formattedValue = this.formatValue(neutText);
                  console.log(`    ✅ 中性粒细胞绝对值匹配成功: "${selectedKeyword}" -> "${formattedValue}"`);
                  return { value: formattedValue, keyword: selectedKeyword };
                }
              }
            }
          }
          // 如果既不是NEUT#也不是中性粒细胞计数，跳过
          console.log(`    ⏭️ 跳过非绝对值的中性粒细胞行: "${searchText}"`);
          continue;
        }

        // 对于淋巴细胞，严格只匹配绝对值行
        if (fieldName === 'lymph') {
          // 首先跳过所有百分比行
          if (searchText.includes('LYMPH%') || searchText.includes('%') || searchText.includes('比值')) {
            console.log(`    ⏭️ 跳过淋巴细胞百分比行: "${searchText}"`);
            continue;
          }
          // 只匹配包含LYMPH#（绝对值）或"淋巴细胞计数"的行
          if (searchText.includes('LYMPH#') || searchText.includes('淋巴细胞计数')) {
            console.log(`    🎯 找到淋巴细胞绝对值行: "${searchText}"`);
            // 检查这行后面的数值
            for (let lymphOffset = 1; lymphOffset <= 3; lymphOffset++) {
              const lymphIndex = searchIndex + lymphOffset;
              if (lymphIndex >= items.length) break;
              const lymphText = items[lymphIndex].text.trim();
              console.log(`      📊 LYMPH#后第${lymphOffset}行: "${lymphText}"`);
              if (/^\d+(\.\d+)?$/.test(lymphText)) {
                const num = parseFloat(lymphText);
                if (this.isValidNumber(num, rules)) {
                  const formattedValue = this.formatValue(lymphText);
                  console.log(`    ✅ 淋巴细胞绝对值匹配成功: "${selectedKeyword}" -> "${formattedValue}"`);
                  return { value: formattedValue, keyword: selectedKeyword };
                }
              }
            }
          }
          // 如果既不是LYMPH#也不是淋巴细胞计数，跳过
          console.log(`    ⏭️ 跳过非绝对值的淋巴细胞行: "${searchText}"`);
          continue;
        }

        // 对于单核细胞，严格只匹配绝对值行
        if (fieldName === 'mono') {
          // 首先跳过所有百分比行
          if (searchText.includes('MON%') || searchText.includes('MONO%') || searchText.includes('%') || searchText.includes('比值')) {
            console.log(`    ⏭️ 跳过单核细胞百分比行: "${searchText}"`);
            continue;
          }
          // 只匹配包含MONO#（绝对值）或"单核细胞计数"的行
          if (searchText.includes('MONO#') || searchText.includes('单核细胞计数')) {
            console.log(`    🎯 找到单核细胞绝对值行: "${searchText}"`);
            // 检查这行后面的数值
            for (let monoOffset = 1; monoOffset <= 3; monoOffset++) {
              const monoIndex = searchIndex + monoOffset;
              if (monoIndex >= items.length) break;
              const monoText = items[monoIndex].text.trim();
              console.log(`      📊 MONO#后第${monoOffset}行: "${monoText}"`);
              if (/^\d+(\.\d+)?$/.test(monoText)) {
                const num = parseFloat(monoText);
                if (this.isValidNumber(num, rules)) {
                  const formattedValue = this.formatValue(monoText);
                  console.log(`    ✅ 单核细胞绝对值匹配成功: "${selectedKeyword}" -> "${formattedValue}"`);
                  return { value: formattedValue, keyword: selectedKeyword };
                }
              }
            }
          }
          // 如果既不是MONO#也不是单核细胞计数，跳过
          console.log(`    ⏭️ 跳过非绝对值的单核细胞行: "${searchText}"`);
          continue;
        }

        // 对于CRP，严格只匹配独立的CRP指标行
        if (fieldName === 'crp') {
          // 跳过包含"检查项目"、"设备"、"仪器"、"患者编号"等的行
          if (searchText.includes('检查项目') || searchText.includes('设备') ||
            searchText.includes('仪器') || searchText.includes('XN350L') ||
            searchText.includes('血球仪') || searchText.includes('全血常规') ||
            searchText.includes('患者编号') || searchText.includes('标本号') ||
            searchText.includes('姓名') || searchText.includes('年龄')) {
            console.log(`    ⏭️ 跳过CRP无关行: "${searchText}"`);
            continue;
          }
          // 只在纯CRP行或包含"C反应蛋白"的行匹配
          if (searchText === 'CRP' || searchText.includes('C反应蛋白')) {
            console.log(`    🎯 找到CRP指标行: "${searchText}"`);
            // 检查这行后面的数值
            for (let crpOffset = 1; crpOffset <= 3; crpOffset++) {
              const crpIndex = searchIndex + crpOffset;
              if (crpIndex >= items.length) break;
              const crpText = items[crpIndex].text.trim();
              console.log(`      📊 CRP后第${crpOffset}行: "${crpText}"`);
              if (/^\d+(\.\d+)?$/.test(crpText)) {
                const num = parseFloat(crpText);
                if (this.isValidNumber(num, rules)) {
                  const formattedValue = this.formatValue(crpText);
                  console.log(`    ✅ CRP匹配成功: "${selectedKeyword}" -> "${formattedValue}"`);
                  return { value: formattedValue, keyword: selectedKeyword };
                }
              }
            }
          }
          // 如果不是纯CRP行，跳过
          console.log(`    ⏭️ 跳过非CRP指标行: "${searchText}"`);
          continue;
        }

        // 通用数值检查
        const extractedValue = this.extractNumber(searchText, rules);
        if (extractedValue) {
          const formattedValue = this.formatValue(extractedValue);
          console.log(`    ✅ 通用匹配成功: "${selectedKeyword}" -> "${formattedValue}" (第${searchIndex + 1}行)`);
          return { value: formattedValue, keyword: selectedKeyword };
        }
      }
    }

    console.log(`  ❌ ${fieldName} 智能匹配失败`);
    return null;
  },

  // 格式化数值（保留两位小数）
  formatValue(value) {
    const num = parseFloat(value);
    return num.toFixed(2);
  },


  // 语音录入
  voiceInput() {
    wx.showToast({
      title: '语音录入功能开发中',
      icon: 'none'
    });
    // TODO: 实现语音录入功能
  },

  // 输入框值改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;

    // 实时验证输入长度和格式
    if (value) {
      // 只允许数字和一个小数点
      value = value.replace(/[^0-9.]/g, '');

      // 确保只有一个小数点
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }

      // 检查长度限制
      if (parts.length > 1) {
        // 有小数点的情况
        const integerPart = parts[0];
        const decimalPart = parts[1];

        // 整数部分限制6位
        if (integerPart.length > 6) {
          value = integerPart.substring(0, 6) + '.' + decimalPart;
        }

        // 小数部分限制3位
        if (decimalPart.length > 3) {
          value = (integerPart.length > 6 ? integerPart.substring(0, 6) : integerPart) + '.' + decimalPart.substring(0, 3);
        }
      } else {
        // 没有小数点的情况，整数部分限制6位
        if (value.length > 6) {
          value = value.substring(0, 6);
        }
      }
    }

    // 强制刷新显示
    this.setData({
      [`formData.${field}`]: value
    }, () => {
      // 验证是否设置成功
      if (this.data.formData[field] !== value) {
        // 如果设置失败，强制重新设置
        const newFormData = { ...this.data.formData };
        newFormData[field] = value;
        this.setData({ formData: newFormData });
      }
    });
  },

  // 输入框获得焦点
  onInputFocus(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      focusIndex: index
    });
  },

  // 输入框失去焦点
  onInputBlur(e) {
    // 立即清除焦点索引，避免placeholder浮动bug
    // catchtap已经能防止按钮点击时的冲突
    const index = parseInt(e.currentTarget.dataset.index);
    if (this.data.focusIndex === index) {
      this.setData({
        focusIndex: -1
      });
    }
  },

  // 点击"下一项"按钮跳转到下一个输入框
  goToNextInput(e) {
    const currentIndex = parseInt(e.currentTarget.dataset.index);
    const nextIndex = currentIndex + 1;

    // 跳转到下一个输入框
    this.setData({
      focusIndex: nextIndex
    });
  },

  // 点击"完成"按钮收起键盘
  completeInput() {
    // 收起键盘
    this.setData({
      focusIndex: -1
    });
    // 触发自动保存
    wx.showToast({
      title: '输入完成',
      icon: 'success',
      duration: 1000
    });
  },

  // 自动保存数据
  async autoSaveData() {
    const { formData } = this.data;

    // 检查是否所有字段都有值（允许0值）
    const allFilled = Object.values(formData).every(value =>
      value !== undefined && value !== null && value.toString().trim() !== ''
    );

    if (allFilled) {
      await this.saveData();
    }
  },

  // 配置指标
  configIndicators() {
    // 检查用户登录状态
    const { openid, currentProfileId, selectedDate, formData } = this.data;
    if (!openid || !currentProfileId) {
      wx.showToast({
        title: '请先登录并选择档案',
        icon: 'none'
      });
      return;
    }

    // 分析当前日期的数据状态
    const hasDataIndicators = [];
    Object.keys(formData).forEach(indicatorId => {
      const value = formData[indicatorId];
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        hasDataIndicators.push(indicatorId);
      }
    });

    // 🔧 修复：只保存有意义的用户输入，避免保存残留数据
    const cleanFormData = {};
    const { displayedBasicIndicators, customIndicators } = this.data;
    const allCurrentIndicatorIds = []
      .concat(displayedBasicIndicators.map(item => item.id))
      .concat(customIndicators.map(item => item.id));

    // 只保存当前配置中显示的指标的非空值（允许0值）
    allCurrentIndicatorIds.forEach(indicatorId => {
      const value = formData[indicatorId];
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        cleanFormData[indicatorId] = value.toString().trim();
      }
    });

    console.log('💾 准备保存的干净用户输入:', cleanFormData);
    console.log('💾 当前显示的指标:', allCurrentIndicatorIds);

    const app = getApp();
    if (app.globalData) {
      // 只有当用户真的有输入时才保存临时数据
      if (Object.keys(cleanFormData).length > 0) {
        app.globalData.temporaryBloodTestInput = {
          formData: cleanFormData,
          selectedDate: this.data.selectedDate,
          recordId: this.data.recordId,
          savedAt: Date.now()
        };
        console.log('✅ 已保存有效的用户输入到临时变量');
      } else {
        // 如果没有用户输入，清除可能存在的临时数据
        delete app.globalData.temporaryBloodTestInput;
        console.log('🧹 没有用户输入，清除临时变量');
      }

      // 保存当前日期的数据状态信息和日期
      app.globalData.currentDateContext = {
        selectedDate: selectedDate,
        hasDataIndicators: hasDataIndicators,
        totalDisplayedCount: Object.keys(formData).length
      };
    }

    // 🔧 重要：传递当前日期给配置页面
    wx.navigateTo({
      url: `/packageA/pages/blood-test-config/index?date=${selectedDate}`,
      fail: (err) => {
        console.error('跳转到配置页面失败:', err);
        wx.showToast({
          title: '打开配置页面失败',
          icon: 'none'
        });
      }
    });
  },

  // 查看历史记录
  viewHistory() {
    wx.navigateTo({
      url: '/pages/blood-test-history/index'
    });
  },

  // 导出数据
  exportData() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 保存数据
  async saveData() {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    const { openid, currentProfileId, selectedDate, formData, recordId } = this.data;

    if (!openid || !currentProfileId) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录并选择档案',
        icon: 'none'
      });
      return;
    }

    // 获取所有已配置的指标ID（包括预设和自定义）
    const { displayedBasicIndicators, customIndicators } = this.data;
    const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
    const allCustomIndicatorIds = customIndicators.map(item => item.id);
    const allIndicatorIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

    // 数据校验 - 所有显示的指标都必须填写
    const validationErrors = [];

    // 检查每个显示的指标是否都已填写
    for (const indicatorId of allIndicatorIds) {
      const value = formData[indicatorId];
      const indicator = [].concat(displayedBasicIndicators).concat(customIndicators).find(item => item.id === indicatorId);
      const indicatorName = indicator ? indicator.name : indicatorId;

      // 检查是否为空（允许0值）
      if (value === undefined || value === null || value.toString().trim() === '') {
        validationErrors.push(`${indicatorName}: 必须填写数值`);
        continue;
      }

      // 更严格的数字校验：只接受纯数字
      const trimmedValue = value.toString().trim();

      // 检查是否包含非数字字符（除了小数点）
      if (!/^\d+(\.\d+)?$/.test(trimmedValue)) {
        validationErrors.push(`${indicatorName}: 只能输入数字`);
        continue;
      }

      // 检查数字长度（包括小数点前后的位数）
      const parts = trimmedValue.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';

      // 整数部分不能超过6位
      if (integerPart.length > 6) {
        validationErrors.push(`${indicatorName}: 整数部分不能超过6位数`);
        continue;
      }

      // 小数部分不能超过3位
      if (decimalPart.length > 3) {
        validationErrors.push(`${indicatorName}: 小数部分不能超过3位`);
        continue;
      }

      // 转换为数字后校验
      const numValue = parseFloat(trimmedValue);
      if (isNaN(numValue)) {
        validationErrors.push(`${indicatorName}: 请输入有效的数字`);
      } else if (numValue < 0) {
        validationErrors.push(`${indicatorName}: 数值不能为负数`);
      } else if (numValue > 999999) {
        validationErrors.push(`${indicatorName}: 数值不能超过999999`);
      }
    }

    // 检查校验错误
    if (validationErrors.length > 0) {
      wx.hideLoading();

      // 显示第一个错误信息，让用户明确知道哪个字段有问题
      const firstError = validationErrors[0];
      wx.showToast({
        title: firstError,
        icon: 'none'
      });

      // 如果有多个错误，在控制台输出所有错误信息
      if (validationErrors.length > 1) {
        console.log('所有验证错误:', validationErrors);
      }

      return;
    }

    try {
      const db = wx.cloud.database();

      // 🔧 重新设计：总是根据日期查询记录，不依赖recordId，确保操作正确的记录
      const existingRes = await db.collection('bloodTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      let isNewRecord = existingRes.data.length === 0;
      let targetRecordId = isNewRecord ? null : existingRes.data[0]._id;

      if (isNewRecord) {
        // 🔧 新增数据：使用同样保守的策略
        const saveData = {
          openid,
          profileId: currentProfileId,
          date: selectedDate,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          type: 'blood-test'
        };

        // 🔥 安全策略：只保存当前显示且有值的指标（允许0值）
        const currentDisplayedData = {};
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value !== undefined && value !== null && value.toString().trim() !== '') {
            currentDisplayedData[indicatorId] = parseFloat(value);
          }
        });

        // 分别处理直接字段和customValues字段

        // 1. 处理直接字段
        allBasicIndicatorIds.forEach(indicatorId => {
          if (currentDisplayedData[indicatorId] !== undefined) {
            saveData[indicatorId] = currentDisplayedData[indicatorId];
          }
        });

        // 2. 处理自定义指标：同时保存到直接字段和customValues字段
        if (allCustomIndicatorIds.length > 0) {
          const customValues = {};
          allCustomIndicatorIds.forEach(indicatorId => {
            if (currentDisplayedData[indicatorId] !== undefined) {
              const value = currentDisplayedData[indicatorId];
              // 同时保存到直接字段和customValues字段
              saveData[indicatorId] = value;
              customValues[indicatorId] = value;
            }
          });

          if (Object.keys(customValues).length > 0) {
            saveData.customValues = customValues;
          }
        }

        // 🔥 安全日志：记录新增操作
        console.log('安全新增操作：', {
          targetDate: selectedDate,
          savedFields: Object.keys(saveData).filter(key => !['openid', 'profileId', 'date', 'createTime', 'updateTime', 'type'].includes(key)),
          currentDisplayed: Object.keys(currentDisplayedData)
        });

        const res = await db.collection('bloodTests').add({
          data: saveData
        });

        // 更新recordId
        this.setData({ recordId: res._id });

        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'none'
        });

      } else {
        // 🔥 重新设计：绝对安全的更新策略
        const existingData = existingRes.data[0];

        // 🔧 安全验证：确保我们更新的是正确的记录
        if (existingData.date !== selectedDate) {
          console.error('严重错误：查询到的记录日期不匹配！', {
            expectedDate: selectedDate,
            actualDate: existingData.date,
            recordId: existingData._id
          });
          wx.showToast({
            title: '数据错误，请重试',
            icon: 'none'
          });
          return;
        }

        // 🔧 构建极其保守的更新数据：只包含当前显示且有值的指标
        const updateData = {
          updateTime: db.serverDate()
        };

        // 🔥 新策略：使用增量更新，避免覆盖任何现有数据（允许0值）
        const currentDisplayedData = {};
        allIndicatorIds.forEach(indicatorId => {
          const value = formData[indicatorId];
          if (value !== undefined && value !== null && value.toString().trim() !== '') {
            currentDisplayedData[indicatorId] = parseFloat(value);
          }
        });



        // 🔧 分别处理直接字段和customValues字段

        // 1. 处理直接字段：只更新当前显示且有值的指标
        allBasicIndicatorIds.forEach(indicatorId => {
          if (currentDisplayedData[indicatorId] !== undefined) {
            updateData[indicatorId] = currentDisplayedData[indicatorId];
          }
        });

        // 2. 处理自定义指标：同时更新直接字段和customValues字段
        if (allCustomIndicatorIds.length > 0) {
          const customValues = {};

          // 更新自定义指标的值
          allCustomIndicatorIds.forEach(indicatorId => {
            if (currentDisplayedData[indicatorId] !== undefined) {
              const value = currentDisplayedData[indicatorId];
              // 同时更新直接字段和customValues字段，确保一致性
              updateData[indicatorId] = value;
              customValues[indicatorId] = value;
            }
          });

          // 保留其他现有的自定义值（不在当前显示中的）
          if (existingData.customValues) {
            Object.keys(existingData.customValues).forEach(key => {
              if (!allCustomIndicatorIds.includes(key)) {
                customValues[key] = existingData.customValues[key];
                // 也保留到直接字段
                if (existingData[key] !== undefined) {
                  updateData[key] = existingData[key];
                }
              }
            });
          }

          updateData.customValues = customValues;
        }

        // 🔥 安全日志：记录更新操作
        console.log('安全更新操作：', {
          targetDate: selectedDate,
          targetRecordId: targetRecordId,
          updateFields: Object.keys(updateData).filter(key => key !== 'updateTime'),
          currentDisplayed: Object.keys(currentDisplayedData)
        });

        await db.collection('bloodTests')
          .doc(targetRecordId)
          .update({
            data: updateData
          });

        // 更新recordId（确保一致性）
        this.setData({ recordId: targetRecordId });

        wx.hideLoading();
        wx.showToast({
          title: '更新成功',
          icon: 'none'
        });
      }

      // 🔧 关键逻辑：如果存在临时配置，现在保存它
      await this.saveTemporaryConfigIfExists();

      // 通知首页刷新日历数据（通过全局变量）
      const app = getApp();
      if (app.globalData) {
        app.globalData.needRefreshCalendar = true;
        app.globalData.needRefreshData = true; // 🔥 添加通用刷新标志
      }

      // 保存成功后返回首页
      setTimeout(() => {
        wx.navigateBack({
          fail: (err) => {
            console.error('返回失败:', err);
          }
        });
      }, 1000); // 给用户1秒时间看到成功提示

    } catch (err) {
      console.error('保存数据失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 查找继承的配置（向前查找最近的配置）
  async findInheritedConfig(targetDate, openid, currentProfileId) {
    try {
      const db = wx.cloud.database();

      console.log(`🔍 开始查找 ${targetDate} 的继承配置...`);

      // 查找所有小于等于目标日期的配置，按日期降序排列
      const configRes = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.lte(targetDate)
        })
        .orderBy('date', 'desc')
        .limit(10) // 限制查询10条，防止数据过多
        .get();

      console.log(`📊 查找到 ${configRes.data.length} 条历史配置`);

      if (configRes.data.length === 0) {
        console.log('🚫 未找到任何历史配置');
        return null;
      }

      // 逐个检查配置，找到第一个有效的配置
      for (let i = 0; i < configRes.data.length; i++) {
        const config = configRes.data[i];
        const configDate = config.date;
        const selectedIndicators = config.selectedIndicators;

        if (!selectedIndicators) {
          console.log(`⚠️ ${configDate} 的配置数据为空，跳过`);
          continue;
        }

        // 检查是否有自定义指标被选中
        const hasCustomIndicators = Object.keys(selectedIndicators).some(key => {
          return key.startsWith('custom_') && selectedIndicators[key] === true;
        });

        const totalSelected = Object.keys(selectedIndicators).filter(key => selectedIndicators[key] === true).length;

        console.log(`📝 ${configDate} 的配置: 总选中=${totalSelected}, 有自定义=${hasCustomIndicators}`);

        // 如果配置有意义（不只是默认甴4项），就使用它
        if (hasCustomIndicators || totalSelected > 4) {
          console.log(`✅ 使用 ${configDate} 的配置作为继承配置`);
          return selectedIndicators;
        }
      }

      // 如果所有配置都是默认的，使用最近的一个
      if (configRes.data.length > 0) {
        const latestConfig = configRes.data[0];
        console.log(`🔄 所有配置都是默认的，使用最近的配置: ${latestConfig.date}`);
        return latestConfig.selectedIndicators;
      }

      console.log('🚫 未找到可用的继承配置');
      return null;

    } catch (err) {
      console.error('查找继承配置失败:', err);
      return null;
    }
  },

  // 保存临时配置（如果存在）
  async saveTemporaryConfigIfExists() {
    const app = getApp();
    const tempConfig = app.globalData.temporaryBloodTestConfig;

    if (!tempConfig || !tempConfig.isTemporary) {
      console.log('✅ 无临时配置需要保存');
      return;
    }

    console.log('💾 保存临时配置到数据库...');

    const { openid, currentProfileId, selectedDate } = this.data;
    const { selectedIndicators, customIndicators, dateType: configDateType } = tempConfig;

    // 使用临时配置中的日期类型，或者重新判断
    const today = new Date().toISOString().split('T')[0];
    const dateType = configDateType || this.determineDateType(selectedDate, today);

    try {
      const db = wx.cloud.database();

      // 1. 保存自定义指标设置（如果有新增的）
      const newCustomIndicators = customIndicators.filter(indicator =>
        indicator.id.startsWith('custom_')
      );

      for (const indicator of newCustomIndicators) {
        // 检查是否已存在
        const existingRes = await db.collection('bloodTestIndicators')
          .where({
            openid: openid,
            profileId: currentProfileId,
            id: indicator.id
          })
          .get();

        if (existingRes.data.length === 0) {
          // 新增自定义指标
          await db.collection('bloodTestIndicators').add({
            data: {
              openid: openid,
              profileId: currentProfileId,
              id: indicator.id,
              shortName: indicator.shortName,
              fullName: indicator.fullName,
              min: indicator.min,
              max: indicator.max,
              unit: indicator.unit,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });
          console.log(`➕ 已新增自定义指标: ${indicator.fullName}`);
        }
      }

      // 2. 保存选中状态配置
      const configData = {
        selectedIndicators: selectedIndicators,
        updateTime: db.serverDate(),
        configType: dateType || 'today',
        effectiveScope: (dateType === 'today') ? 'future' : 'single'
      };

      // 查询现有配置
      const existingConfigRes = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (existingConfigRes.data.length > 0) {
        // 更新现有配置
        await db.collection('userIndicatorConfig')
          .doc(existingConfigRes.data[0]._id)
          .update({
            data: configData
          });
        console.log(`📝 已更新 ${selectedDate} 的配置`);
      } else {
        // 创建新配置
        await db.collection('userIndicatorConfig').add({
          data: {
            openid: openid,
            profileId: currentProfileId,
            date: selectedDate,
            ...configData
          }
        });
        console.log(`➕ 已创建 ${selectedDate} 的配置`);
      }

      // 3. 如果是今日配置，应用到未来日期
      if (dateType === 'today') {
        console.log('📎 今日配置，开始应用到未来日期...');
        await this.applyTodayConfigToFuture(selectedDate, selectedIndicators, openid, currentProfileId, db);
      }

      // 4. 清理临时配置数据
      delete app.globalData.temporaryBloodTestConfig;
      this.setData({ isTemporaryConfig: false });

      console.log('✅ 临时配置已成功保存并清理');

      // 5. 设置刷新标志，让其他页面知道配置已更新
      if (app.globalData) {
        app.globalData.needRefreshBloodTestConfig = true;
        app.globalData.indicatorConfigChanged = true;
      }

    } catch (err) {
      console.error('保存临时配置失败:', err);
      // 不影响主流程，只是警告
      wx.showToast({
        title: '配置保存部分失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 判断日期类型
  determineDateType(targetDate, today) {
    if (targetDate === today) {
      return 'today';
    } else if (targetDate < today) {
      return 'past';
    } else {
      return 'future';
    }
  },

  // 将今日配置应用到未来日期
  async applyTodayConfigToFuture(todayDate, selectedIndicators, openid, currentProfileId, db) {
    try {
      // 查找所有未来日期的配置
      const futureConfigsRes = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: db.command.gt(todayDate)
        })
        .get();

      if (futureConfigsRes.data.length === 0) {
        console.log('📋 暂无未来日期配置需要更新');
        return;
      }

      // 批量更新未来日期的配置
      const batchUpdatePromises = futureConfigsRes.data.map(config => {
        console.log(`📎 更新未来日期配置: ${config.date}`);
        return db.collection('userIndicatorConfig')
          .doc(config._id)
          .update({
            data: {
              selectedIndicators: selectedIndicators,
              updateTime: db.serverDate(),
              inheritedFrom: todayDate,
              configType: 'inherited'
            }
          });
      });

      await Promise.all(batchUpdatePromises);
      console.log(`✅ 成功更新 ${batchUpdatePromises.length} 个未来日期的配置`);

      // 显示成功提示
      if (batchUpdatePromises.length > 0) {
        wx.showToast({
          title: `已同步到${batchUpdatePromises.length}个未来日期`,
          icon: 'success',
          duration: 2000
        });
      }

    } catch (err) {
      console.error('应用今日配置到未来日期失败:', err);
      // 不影响主流程
    }
  },

  // 删除记录
  async deleteRecord() {
    // 重新获取用户信息，确保数据是最新的
    const success = this.getUserInfo();
    if (!success) {
      wx.showToast({
        title: '请先登录并选择档案',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    const { openid, currentProfileId, selectedDate } = this.data;

    try {
      const db = wx.cloud.database();
      const res = await db.collection('bloodTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      if (res.data.length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '当天没有可删除的记录',
          icon: 'none'
        });
        return;
      }

      const recordToDelete = res.data[0];
      const actualRecordId = recordToDelete._id;

      // 简化版删除确认
      wx.showModal({
        title: '确认删除',
        content: `确定要删除 ${selectedDate} 的血常规记录吗？`,
        confirmText: '删除',
        cancelText: '取消',
        success: async (modalRes) => {
          if (!modalRes.confirm) {
            wx.hideLoading();
            return;
          }

          if (modalRes.confirm) {
            try {
              // 1. 删除血常规记录
              await db.collection('bloodTests').doc(actualRecordId).remove();

              // 2. 🔧 关键修复：同时删除该日期的专用配置，避免重新进入时配置还在
              try {
                await db.collection('userIndicatorConfig')
                  .where({
                    openid: openid,
                    profileId: currentProfileId,
                    date: selectedDate
                  })
                  .remove();
              } catch (configErr) {
                // 配置删除失败不影响主流程
                console.log('配置删除失败（可能没有配置记录）:', configErr);
              }

              // 3. 通知首页和健康档案刷新
              const app = getApp();
              if (app.globalData) {
                app.globalData.needRefreshCalendar = true;
                // 🔧 关键修复：通知健康档案也需要刷新
                app.globalData.needRefreshHealthProfile = true;
              }

              this.setData({ recordId: '' });

              wx.hideLoading();
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });

              // 重新加载配置（这会重新评估哪些指标应该显示）
              setTimeout(() => {
                this.loadCompleteConfiguration();
              }, 100);

              // 删除成功后返回每日记录页面
              setTimeout(() => {
                wx.navigateBack({
                  fail: (err) => {
                    console.error('返回失败:', err);
                  }
                });
              }, 1000);

            } catch (err) {
              wx.hideLoading();
              wx.showToast({
                title: '删除失败，请重试',
                icon: 'error'
              });
            }
          }
        }
      });

    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'error'
      });
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

    console.log('血常规页面 - 获取用户信息:', {
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
      return false;
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
      return false;
    }

    this.setData({
      openid,
      currentProfileId
    });

    console.log('✅ 血常规页面：用户信息获取成功');
    return true;
  },

  // 加载配置的主方法
  async loadCompleteConfiguration() {
    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId || !selectedDate) {
      console.log('❌ 参数缺失，无法加载配置:', { openid, currentProfileId, selectedDate });
      return;
    }

    console.log(`🔄🔄🔄 开始加载 ${selectedDate} 的完整配置 🔄🔄🔄`);

    wx.showLoading({
      title: '加载配置...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 1. 查询当前日期的专用配置
      console.log('🔍 步骤1：查询当前日期的专用配置');
      const currentDateConfigRes = await db.collection('userIndicatorConfig')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      // 2. 查询当前日期的血常规数据
      console.log('🔍 步骤2：查询当前日期的血常规数据');
      console.log('🔍 查询参数确认:', { openid, profileId: currentProfileId, date: selectedDate });

      const bloodTestRes = await db.collection('bloodTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      console.log('📋 血常规数据查询结果:', bloodTestRes.data.length, '条记录');
      if (bloodTestRes.data.length > 0) {
        console.log('📋 找到的数据:', bloodTestRes.data[0]);
      }

      // 3. 查询所有自定义指标设置
      console.log('🔍 步骤3：查询所有自定义指标设置');
      let customSettingsRes = { data: [] };
      try {
        customSettingsRes = await db.collection('userIndicatorSettings')
          .where({
            openid: openid,
            profileId: currentProfileId
          })
          .get();
        console.log('✅ 自定义指标设置查询成功');
      } catch (customErr) {
        console.error('⚠️ 自定义指标设置查询失败，继续使用默认配置:', customErr);
        // 移动端可能查询失败，使用空结果继续
        customSettingsRes = { data: [] };
      }

      console.log('📊 查询结果汇总:');
      console.log(`  - 专用配置: ${currentDateConfigRes.data ? currentDateConfigRes.data.length : '查询失败'} 条`);
      console.log(`  - 血常规数据: ${bloodTestRes.data ? bloodTestRes.data.length : '查询失败'} 条`);
      console.log(`  - 自定义设置: ${customSettingsRes.data ? customSettingsRes.data.length : '查询失败'} 条`);

      // 🔧 移动端安全性检查：验证查询结果格式
      if (!currentDateConfigRes || !currentDateConfigRes.data || !Array.isArray(currentDateConfigRes.data)) {
        console.error('❌ 专用配置查询结果格式异常:', currentDateConfigRes);
        throw new Error('专用配置查询结果格式异常');
      }
      if (!bloodTestRes || !bloodTestRes.data || !Array.isArray(bloodTestRes.data)) {
        console.error('❌ 血常规数据查询结果格式异常:', bloodTestRes);
        throw new Error('血常规数据查询结果格式异常');
      }
      if (!customSettingsRes || !customSettingsRes.data || !Array.isArray(customSettingsRes.data)) {
        console.error('❌ 自定义设置查询结果格式异常:', customSettingsRes);
        customSettingsRes = { data: [] }; // 修正为空数组
      }

      // 4. 构建配置的优先级逻辑（新增继承逻辑）
      let config = {
        wbc: true,
        neut: true,
        hgb: true,
        plt: true,
        rbc: false,
        crp: false,
        hct: false,
        lymph: false,
        mono: false
      };

      if (currentDateConfigRes.data.length > 0) {
        // 🔥 优先级1：如果有当前日期的专用配置，直接使用
        console.log('✅ 找到当前日期的专用配置，直接使用');
        config = currentDateConfigRes.data[0].selectedIndicators || config;
        console.log('📋 专用配置内容:', config);
      } else {
        // 🔥 新增：尝试继承今日或最近的配置
        console.log('🔍 未找到当前日期的专用配置，尝试查找继承配置...');
        const inheritedConfig = await this.findInheritedConfig(selectedDate, openid, currentProfileId);

        if (inheritedConfig) {
          console.log('✅ 找到继承配置，使用继承配置');
          config = inheritedConfig;
          console.log('📋 继承配置内容:', config);
        } else if (bloodTestRes.data.length > 0) {
          // 🔥 优先级2：如果没有专用配置但有数据，根据数据构建配置
          console.log('✅ 没有专用配置但有数据，根据数据构建配置');
          const bloodData = bloodTestRes.data[0];
          console.log('📋 血常规数据字段:', Object.keys(bloodData));

          // 🔧 关键修复：只显示有数据的基础指标
          console.log('🔄 检查基础指标数据...');
          Object.keys(config).forEach(basicKey => {
            if (!basicKey.startsWith('custom_')) {
              const hasBasicData = bloodData[basicKey] !== undefined &&
                bloodData[basicKey] !== null &&
                bloodData[basicKey].toString().trim() !== '';
              console.log(`  - 基础指标 ${basicKey}: 有数据=${hasBasicData}, 值=${bloodData[basicKey]}`);
              // 🔥 只有有数据的指标才显示
              config[basicKey] = hasBasicData;
            }
          });

          if (customSettingsRes.data && customSettingsRes.data.length > 0) {
            console.log('🔄 遍历自定义指标设置，检查数据...');
            customSettingsRes.data.forEach(item => {
              if (item.indicatorId.startsWith('custom_')) {
                // 检查当前日期的数据中是否有这个指标的值（优先检查customValues）
                const customValue = bloodData.customValues && bloodData.customValues[item.indicatorId];
                const directValue = bloodData[item.indicatorId];
                const hasData = (customValue !== undefined && customValue !== null && customValue !== '') ||
                  (directValue !== undefined && directValue !== null && directValue !== '');

                console.log(`  - ${item.indicatorId}(${item.name}): 直接值=${directValue}, 自定义值=${customValue}, 有数据=${hasData}`);
                config[item.indicatorId] = hasData;
              }
            });
          }
          console.log('📋 智能构建的配置:', config);
        } else {
          // 🔥 优先级3：既没有继承配置也没有数据，使用默认配置
          console.log('✅ 既没有继承配置也没有数据，使用默认配置');

          // 🔧 关键修复：明确地将所有自定义指标设置为false
          if (customSettingsRes.data && customSettingsRes.data.length > 0) {
            customSettingsRes.data.forEach(item => {
              if (item.indicatorId.startsWith('custom_')) {
                config[item.indicatorId] = false; // 明确设为false，不显示
                console.log(`  🚫 自定义指标 ${item.indicatorId} 设为不显示（无数据）`);
              }
            });
          }

          console.log('📋 默认配置（已明确设置自定义指标为false）:', config);
        }
      }

      // 🔧 移动端调试：详细输出最终配置状态
      console.log('🔍🔍🔍 最终配置对象详情 🔍🔍🔍');
      console.log('📋 config对象类型:', typeof config);
      console.log('📋 config对象内容:', config);
      Object.keys(config).forEach(key => {
        console.log(`  - ${key}: ${config[key]} (类型: ${typeof config[key]})`);
      });

      // 5. 构建自定义设置映射
      console.log('🔍 步骤5：构建自定义设置映射');
      const customSettings = {};
      if (customSettingsRes.data && customSettingsRes.data.length > 0) {
        customSettingsRes.data.forEach(item => {
          customSettings[item.indicatorId] = {
            name: item.name,
            min: item.minValue,
            max: item.maxValue,
            unit: item.unit
          };
        });
      }
      console.log('📋 自定义设置映射:', customSettings);

      // 6. 构建显示的指标列表
      console.log('🔍 步骤6：构建显示的指标列表');
      const basicIndicators = [];
      const customIndicators = [];

      // 预设指标定义
      const defaultIndicators = {
        wbc: { name: '白细胞', unit: '×10⁹/L' },
        neut: { name: '中性粒细胞数', unit: '×10⁹/L' },
        hgb: { name: '血红蛋白', unit: 'g/L' },
        plt: { name: '血小板', unit: '×10⁹/L' },
        rbc: { name: '红细胞', unit: '×10¹²/L' },
        crp: { name: 'C反应蛋白', unit: 'mg/L' },
        hct: { name: '红细胞压积', unit: '%' },
        lymph: { name: '淋巴细胞绝对值', unit: '×10⁹/L' },
        mono: { name: '单核细胞绝对值', unit: '×10⁹/L' }
      };

      // 🔧 移除强制显示逻辑，完全依赖用户配置或数据推断
      console.log('📋 最终配置（无强制修改）:', config);

      // 处理预设指标 - 移动端兼容性修复
      console.log('🔍 完整配置检查 - config对象:', config);
      console.log('🔍 完整配置检查 - defaultIndicators列表:', Object.keys(defaultIndicators));

      Object.keys(defaultIndicators).forEach(key => {
        console.log(`🔍 检查预设指标 ${key}:`, {
          configValue: config[key],
          configType: typeof config[key],
          isTrue: config[key] === true
        });

        if (config[key] === true) {
          const indicator = { ...defaultIndicators[key] };

          // 如果有自定义设置，应用自定义设置
          if (customSettings[key]) {
            indicator.name = customSettings[key].name;
            indicator.unit = customSettings[key].unit || indicator.unit;
          }

          basicIndicators.push({ id: key, ...indicator });
          console.log(`  ✅ 添加预设指标: ${key} (${indicator.name})`);
        } else {
          console.log(`  ❌ 跳过预设指标: ${key} (配置值: ${config[key]})`);
        }
      });

      console.log('🔍 完整配置检查 - 最终basicIndicators:', basicIndicators.map(i => `${i.id}(${i.name})`));

      // 处理自定义指标（只显示选中的）
      Object.keys(customSettings).forEach(indicatorId => {
        if (indicatorId.startsWith('custom_') && config[indicatorId] === true) {
          const setting = customSettings[indicatorId];
          customIndicators.push({
            id: indicatorId,
            name: setting.name,
            min: setting.min,
            max: setting.max,
            unit: setting.unit
          });
          console.log(`  + 自定义指标: ${indicatorId} (${setting.name})`);
        }
      });

      console.log(`📋 最终构建结果: ${basicIndicators.length} 个预设指标, ${customIndicators.length} 个自定义指标`);

      // 7. 初始化表单数据
      console.log('🔍 步骤7：初始化表单数据');
      const allIndicatorIds = []
        .concat(basicIndicators.map(item => item.id))
        .concat(customIndicators.map(item => item.id));

      const initialFormData = {};
      allIndicatorIds.forEach(id => {
        initialFormData[id] = '';
      });

      console.log('📋 初始化的表单字段:', allIndicatorIds);
      console.log('📋 初始化的表单数据:', initialFormData);

      // 8. 更新页面数据
      console.log('🔍 步骤8：更新页面数据');

      // 🔧 移动端保护：如果构建的指标为空，使用默认配置
      if (basicIndicators.length === 0 && customIndicators.length === 0) {
        console.log('⚠️ 构建的指标列表为空，使用默认配置避免移动端空白');

        // 强制使用默认配置
        const fallbackIndicators = [
          { id: 'wbc', name: '白细胞', min: '4.0', max: '10.0', unit: '×10⁹/L' },
          { id: 'neut', name: '中性粒细胞数', min: '2.0', max: '7.0', unit: '×10⁹/L' },
          { id: 'hgb', name: '血红蛋白', min: '120', max: '160', unit: 'g/L' },
          { id: 'plt', name: '血小板', min: '100', max: '300', unit: '×10⁹/L' }
        ];

        const fallbackFormData = {};
        fallbackIndicators.forEach(indicator => {
          fallbackFormData[indicator.id] = '';
        });

        // 保护用户输入（只保留默认配置中的字段）
        const currentFormData = this.data.formData || {};
        const mergedFallbackData = { ...fallbackFormData };
        const fallbackIndicatorIds = fallbackIndicators.map(i => i.id);
        Object.keys(currentFormData).forEach(key => {
          if (fallbackIndicatorIds.includes(key) && currentFormData[key] !== undefined && currentFormData[key] !== null && currentFormData[key].toString().trim() !== '') {
            mergedFallbackData[key] = currentFormData[key];
          }
        });

        this.setData({
          userIndicatorConfig: { wbc: true, neut: true, hgb: true, plt: true },
          displayedBasicIndicators: fallbackIndicators,
          customIndicators: [],
          formData: mergedFallbackData
        });

        console.log('📋 已应用默认配置，开始加载数据');

        // 只有没有用户输入时才加载数据（允许0值）
        const hasUserInput = Object.values(mergedFallbackData).some(value =>
          value !== undefined && value !== null && value.toString().trim() !== ''
        );

        if (!hasUserInput) {
          if (this.data.recordId) {
            this.loadRecordData(this.data.recordId);
          } else {
            this.loadTodayData();
          }
        }

        return;
      }

      // 保护用户当前输入，不要被配置更新覆盖（只保留配置中的字段）
      const currentFormData = this.data.formData || {};
      const mergedFormData = { ...initialFormData };

      // 只保留用户已有的输入，且该字段在当前配置中
      Object.keys(currentFormData).forEach(key => {
        if (allIndicatorIds.includes(key) && currentFormData[key] !== undefined && currentFormData[key] !== null && currentFormData[key].toString().trim() !== '') {
          mergedFormData[key] = currentFormData[key];
        }
      });

      this.setData({
        userIndicatorConfig: config,
        displayedBasicIndicators: basicIndicators || [],
        customIndicators: customIndicators || [],
        formData: mergedFormData
      });

      // 检查合并后的数据是否有用户输入（允许0值）
      const hasUserInput = Object.values(mergedFormData || {}).some(value =>
        value !== undefined && value !== null && value.toString().trim() !== ''
      );

      if (!hasUserInput) {
        if (this.data.recordId) {
          this.loadRecordData(this.data.recordId);
        } else {
          this.loadTodayData();
        }
      }



      console.log(`🎉🎉🎉 ${selectedDate} 的配置加载完成 🎉🎉🎉`);

    } catch (err) {
      console.error('❌❌❌ 配置加载失败 ❌❌❌', err);

      // 失败时使用默认配置
      console.log('🔧 使用默认配置作为兜底');
      const defaultIndicators = [
        { id: 'wbc', name: '白细胞', min: '4.0', max: '10.0', unit: '×10⁹/L' },
        { id: 'neut', name: '中性粒细胞数', min: '2.0', max: '7.0', unit: '×10⁹/L' },
        { id: 'hgb', name: '血红蛋白', min: '120', max: '160', unit: 'g/L' },
        { id: 'plt', name: '血小板', min: '100', max: '300', unit: '×10⁹/L' }
      ];

      const initialFormData = {};
      defaultIndicators.forEach(indicator => {
        initialFormData[indicator.id] = '';
      });

      // 保护用户输入（只保留默认配置中的字段）
      const currentFormData = this.data.formData || {};
      const mergedInitialData = { ...initialFormData };
      const defaultIndicatorIds = defaultIndicators.map(i => i.id);
      Object.keys(currentFormData).forEach(key => {
        if (defaultIndicatorIds.includes(key) && currentFormData[key] !== undefined && currentFormData[key] !== null && currentFormData[key].toString().trim() !== '') {
          mergedInitialData[key] = currentFormData[key];
        }
      });

      this.setData({
        userIndicatorConfig: { wbc: true, neut: true, hgb: true, plt: true },
        displayedBasicIndicators: defaultIndicators || [],
        customIndicators: [],
        formData: mergedInitialData
      });

      // 只有没有用户输入时才加载数据（允许0值）
      const hasUserInput = Object.values(mergedInitialData).some(value =>
        value !== undefined && value !== null && value.toString().trim() !== ''
      );

      if (!hasUserInput) {
        this.loadTodayData();
      }


    } finally {
      wx.hideLoading();
    }
  },

  // 加载指定日期的数据
  async loadTodayData() {
    // 立即检查是否有用户输入，如果有就不加载数据（允许0值）
    const currentFormData = this.data.formData || {};
    const hasUserInput = Object.values(currentFormData).some(value =>
      value !== undefined && value !== null && value.toString().trim() !== ''
    );

    if (hasUserInput) {
      return; // 有用户输入就直接返回，不覆盖
    }

    const { openid, currentProfileId, selectedDate } = this.data;

    if (!openid || !currentProfileId) {
      return;
    }

    console.log(`📊📊📊 开始加载 ${selectedDate} 的血常规数据 📊📊📊`);

    try {
      const db = wx.cloud.database();

      console.log('🔍 数据库查询条件:', {
        openid: openid,
        profileId: currentProfileId,
        date: selectedDate
      });

      const res = await db.collection('bloodTests')
        .where({
          openid: openid,
          profileId: currentProfileId,
          date: selectedDate
        })
        .get();

      console.log(`🔍 查询结果: 找到 ${res.data.length} 条记录`);

      if (res.data.length > 0) {
        console.log('📋 查询到的记录详情:');
        res.data.forEach((record, index) => {
          console.log(`  记录${index + 1}:`, {
            _id: record._id,
            date: record.date,
            openid: record.openid,
            profileId: record.profileId,
            数据字段: Object.keys(record).filter(key => !['_id', '_openid', 'openid', 'profileId', 'date', 'createTime', 'updateTime', 'type'].includes(key))
          });
        });
      }

      if (res.data.length > 0) {
        const data = res.data[0];
        console.log('📋 数据库记录内容:', data);

        // 获取当前已配置的指标ID（包括预设和自定义）
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
        const allCustomIndicatorIds = customIndicators.map(item => item.id);
        const allConfiguredIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

        console.log('📋 当前配置的指标:');
        console.log(`  - 预设指标: ${allBasicIndicatorIds.join(', ')}`);
        console.log(`  - 自定义指标: ${allCustomIndicatorIds.join(', ')}`);
        console.log(`  - 所有配置指标: ${allConfiguredIds.join(', ')}`);

        // 构建完整的formData，包含数据库中所有存在的数据
        const formData = {};

        // 1. 首先从customValues加载（最高优先级）
        if (data.customValues) {
          Object.keys(data.customValues).forEach(key => {
            // 只加载用户配置的指标
            if (allConfiguredIds.includes(key)) {
              formData[key] = data.customValues[key];
            }
          });
        }

        // 2. 只加载当前配置中的指标数据（不加载其他字段）
        allConfiguredIds.forEach(indicatorId => {
          if (formData[indicatorId] === undefined) {
            // 🔥 修复：正确处理0值，不能用 || 运算符
            formData[indicatorId] = (data[indicatorId] !== undefined && data[indicatorId] !== null) ? data[indicatorId] : '';
          }
        });

        // 🔧 修复：不再加载数据库中未配置的字段，只显示用户配置的指标

        console.log('📋 最终构建的formData（只包含配置的指标）:', formData);

        // 保护用户当前的输入（只保留配置中的字段）
        const currentFormData = this.data.formData || {};
        const protectedFormData = { ...formData };

        Object.keys(currentFormData).forEach(key => {
          const currentValue = currentFormData[key];
          if (allConfiguredIds.includes(key) && currentValue !== undefined && currentValue !== null && currentValue.toString().trim() !== '') {
            protectedFormData[key] = currentValue;
          }
        });

        this.setData({
          recordId: data._id,
          formData: protectedFormData
        });

        console.log('✅ 数据加载完成，已更新到页面（保护了用户输入）');

      } else {
        console.log(`❌ ${selectedDate} 没有血常规数据，开始清空表单`);

        console.log(`❌ ${selectedDate} 没有血常规数据，清空表单但保持配置`);

        // 清空表单数据，但保持现有配置（包括自定义项）
        const { displayedBasicIndicators, customIndicators } = this.data;

        // 如果没有配置，确保有默认配置
        if ((!displayedBasicIndicators || displayedBasicIndicators.length === 0) &&
          (!customIndicators || customIndicators.length === 0)) {
          this.ensureHasValidConfiguration();
          return; // 让ensureHasValidConfiguration处理
        }

        // 有配置的情况下，只清空表单数据
        const allIndicatorIds = []
          .concat(displayedBasicIndicators.map(item => item.id))
          .concat(customIndicators.map(item => item.id));

        const emptyFormData = {};
        allIndicatorIds.forEach(indicatorId => {
          emptyFormData[indicatorId] = '';
        });

        this.setData({
          recordId: '',
          formData: emptyFormData
        });
      }
    } catch (err) {
      console.error('加载数据失败:', err);

      // 🔧 移动端修复：加载失败时也不覆盖配置，只清空表单数据
      const { displayedBasicIndicators, customIndicators } = this.data;
      const allIndicatorIds = []
        .concat(displayedBasicIndicators.map(item => item.id))
        .concat(customIndicators.map(item => item.id));

      // 只清空表单数据，绝不修改配置
      const emptyFormData = {};
      allIndicatorIds.forEach(indicatorId => {
        emptyFormData[indicatorId] = '';
      });

      this.setData({
        recordId: '',
        formData: emptyFormData
      });

      console.log('✅ 错误处理：已清空表单数据，配置保持不变');
    }
  },

  // 加载指定记录数据
  async loadRecordData(recordId) {
    // 立即检查是否有用户输入，如果有就不加载数据（允许0值）
    const currentFormData = this.data.formData || {};
    const hasUserInput = Object.values(currentFormData).some(value =>
      value !== undefined && value !== null && value.toString().trim() !== ''
    );

    if (hasUserInput) {
      return; // 有用户输入就直接返回，不覆盖
    }

    try {
      const db = wx.cloud.database();
      const res = await db.collection('bloodTests').doc(recordId).get();

      if (res.data) {
        const data = res.data;

        // 🔧 修复：加载完整的数据，不只是当前显示的指标
        const { displayedBasicIndicators, customIndicators } = this.data;
        const allBasicIndicatorIds = displayedBasicIndicators.map(item => item.id);
        const allCustomIndicatorIds = customIndicators.map(item => item.id);
        const allConfiguredIds = [].concat(allBasicIndicatorIds).concat(allCustomIndicatorIds);

        // 构建完整的formData，优先级：customValues > 直接字段
        const formData = {};

        // 1. 首先从customValues加载（最高优先级）
        if (data.customValues) {
          Object.keys(data.customValues).forEach(key => {
            // 只加载用户配置的指标
            if (allConfiguredIds.includes(key)) {
              formData[key] = data.customValues[key];
            }
          });
        }

        // 2. 只加载当前配置中的指标数据（不加载其他字段）
        allConfiguredIds.forEach(indicatorId => {
          if (formData[indicatorId] === undefined) {
            // 🔥 修复：正确处理0值，不能用 || 运算符
            formData[indicatorId] = (data[indicatorId] !== undefined && data[indicatorId] !== null) ? data[indicatorId] : '';
          }
        });

        // 🔧 修复：不再加载数据库中未配置的字段，只显示用户配置的指标

        // 保护用户当前的输入（只保留配置中的字段）
        const currentFormData = this.data.formData || {};
        const protectedFormData = { ...formData };

        Object.keys(currentFormData).forEach(key => {
          const currentValue = currentFormData[key];
          if (allConfiguredIds.includes(key) && currentValue !== undefined && currentValue !== null && currentValue.toString().trim() !== '') {
            protectedFormData[key] = currentValue;
          }
        });

        this.setData({
          selectedDate: data.date,
          formData: protectedFormData
        });
      }
    } catch (err) {
      console.error('加载记录失败:', err);
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      fail: (err) => {
        console.error('血常规页面返回失败:', err);
      }
    });
  },

  // 检查登录状态并加载数据
  checkLoginAndLoadData() {
    wx.showLoading({
      title: '初始化中...',
      mask: true
    });

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    if (!openid) {
      console.log('❌ 用户未登录');
      wx.hideLoading();
      this.setData({ isLoggedIn: false });
      wx.reLaunch({
        url: '/pages/profile/index'
      });
      return;
    }

    const currentProfileId = app.getCurrentProfileId();
    if (!currentProfileId) {
      console.log('❌ 未选择档案');
      wx.hideLoading();
      this.setData({ isLoggedIn: false });
      wx.reLaunch({
        url: '/pages/profile/index'
      });
      return;
    }

    // 设置用户信息
    this.setData({
      openid,
      currentProfileId,
      isLoggedIn: true
    });

    console.log('✅ 用户信息验证成功，加载用户配置');

    // 加载用户配置
    this.loadCompleteConfiguration().then(() => {
      wx.hideLoading();
    }).catch(err => {
      console.error('配置加载失败，保持默认配置:', err);
      wx.hideLoading();
    });
  },



  // 分片传输OCR功能（当图片还是太大时使用）


  // 执行OCR识别
  async performOCR(imagePath) {
    try {
      console.log('开始执行OCR，图片路径:', imagePath);

      // 先进行适度压缩
      const compressedPath = await new Promise((resolve, reject) => {
        wx.compressImage({
          src: imagePath,
          quality: 70, // 适度压缩质量
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        });
      });

      console.log('压缩后图片路径:', compressedPath);

      // 获取压缩后文件信息
      const fileInfo = await new Promise((resolve, reject) => {
        wx.getFileInfo({
          filePath: compressedPath,
          success: resolve,
          fail: reject
        });
      });

      console.log('压缩后文件大小:', fileInfo.size, 'bytes');

      // 读取压缩后文件数据
      const fileData = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: compressedPath,
          encoding: 'base64',
          success: resolve,
          fail: reject
        });
      });

      const base64Data = fileData.data;
      console.log('压缩后Base64数据长度:', base64Data.length);

      // 统一使用分片上传
      return await this.chunkUploadOCR(base64Data);

    } catch (error) {
      console.error('OCR处理失败:', error);
      wx.showToast({
        title: 'OCR识别失败',
        icon: 'none'
      });
      throw error;
    }
  },

  // 分片上传OCR
  async chunkUploadOCR(base64Data) {
    try {
      console.log('使用分片上传，数据长度:', base64Data.length);

      const chunkSize = 200 * 1024; // 200KB每片，更安全的大小
      const chunks = [];

      // 分割数据
      for (let i = 0; i < base64Data.length; i += chunkSize) {
        chunks.push(base64Data.slice(i, i + chunkSize));
      }

      console.log(`分割为${chunks.length}个片段，第一片大小:`, chunks[0].length);

      // 确保第一个片段不超过150KB
      let firstChunk = chunks[0];
      if (firstChunk.length > 150 * 1024) {
        firstChunk = firstChunk.slice(0, 150 * 1024);
        console.log('第一片仍然过大，截取为:', firstChunk.length);
      }

      // 上传第一个片段进行OCR
      const result = await new Promise((resolve, reject) => {
        wx.cloud.callFunction({
          name: 'ocrFunction',
          data: {
            imgBase64: firstChunk, // 使用处理后的第一个片段
            imgType: 'jpg'
          },
          success: resolve,
          fail: reject
        });
      });

      console.log('OCR云函数返回:', result);

      if (result.result) {
        if (result.result.success === false) {
          throw new Error(result.result.error || 'OCR识别失败');
        } else if (result.result.items && result.result.items.length > 0) {
          return result.result.items;
        } else if (result.result.itemCount !== undefined) {
          return []; // 未识别到内容
        } else {
          throw new Error('识别服务异常');
        }
      } else {
        throw new Error('云函数返回格式错误');
      }

    } catch (error) {
      console.error('分片上传OCR失败:', error);
      throw error;
    }
  },

  // 选择图片并执行OCR
  chooseImageAndOCR() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 优先使用压缩图片
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFilePaths[0];
        console.log('选择的图片路径:', tempFilePath);

        // 显示加载提示
        wx.showLoading({
          title: '正在识别...',
          mask: true
        });

        // 执行OCR
        that.performOCR(tempFilePath)
          .then(ocrResult => {
            wx.hideLoading();
            console.log('OCR识别结果:', ocrResult);

            if (ocrResult && ocrResult.length > 0) {
              // 处理OCR结果
              that.parseOCRResult(ocrResult);
              wx.showToast({
                title: '识别成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: '未识别到数据',
                icon: 'none'
              });
            }
          })
          .catch(error => {
            wx.hideLoading();
            console.error('OCR处理失败:', error);
            wx.showToast({
              title: '识别失败，请重试',
              icon: 'none'
            });
          });
      },
      fail: function (error) {
        console.error('选择图片失败:', error);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // ==================== AI识别功能 ====================

  // 显示AI识别选项
  showAIIdentifyOptions() {
    this.setData({ aiImportMenuVisible: true });
  },

  // 关闭AI导入方式选择弹窗
  onAIImportMenuClose() {
    this.setData({ aiImportMenuVisible: false });
  },

  // 拍照识别
  handleAICamera() {
    this.setData({ aiImportMenuVisible: false });
    setTimeout(() => {
      this.handleAIImageInput('camera');
    }, 300);
  },

  // 相册选择
  handleAIAlbum() {
    this.setData({ aiImportMenuVisible: false });
    setTimeout(() => {
      this.handleAIImageInput('album');
    }, 300);
  },

  // 语音输入
  handleAIVoice() {
    this.setData({
      aiImportMenuVisible: false,
      voiceRecordingVisible: true,
      isRecording: false,
      recordDuration: 0,
      recognizedText: ''
    });

    // 初始化语音识别管理器的事件监听
    this.initVoiceRecognition();
  },

  // 初始化语音识别
  initVoiceRecognition() {
    // 监听识别开始
    manager.onStart = () => {
      console.log('📢 语音识别开始');
      this.setData({ isRecording: true });
      this.startDurationTimer();
    };

    // 监听实时识别结果
    manager.onRecognize = (res) => {
      console.log('📝 实时识别:', res.result);
      this.setData({
        recognizedText: res.result
      });
    };

    // 监听识别结束
    manager.onStop = (res) => {
      console.log('✅ 识别结束:', res.result);
      this.stopDurationTimer();
      this.handleVoiceRecordComplete(res.result);
    };

    // 监听错误
    manager.onError = (error) => {
      console.error('❌ 识别错误:', error);
      this.stopDurationTimer();
      this.setData({
        isRecording: false,
        voiceRecordingVisible: false
      });

      wx.showToast({
        title: '语音识别失败，请重试',
        icon: 'none'
      });
    };
  },

  // 开始/停止录音切换
  toggleRecording() {
    const { isRecording } = this.data;

    if (!isRecording) {
      // 开始语音识别
      manager.start({
        lang: 'zh_CN', // 中文识别
        duration: 60000 // 最长60秒
      });
    } else {
      // 停止语音识别
      manager.stop();
    }
  },

  // 取消录音
  cancelRecording() {
    manager.stop();
    this.stopDurationTimer();
    this.setData({
      isRecording: false,
      voiceRecordingVisible: false,
      recordDuration: 0,
      recognizedText: ''
    });
  },

  // 关闭语音录音弹窗
  onVoiceRecordClose() {
    const { isRecording } = this.data;

    if (isRecording) {
      // 如果正在录音，先停止
      this.cancelRecording();
    } else {
      this.setData({
        voiceRecordingVisible: false,
        recordDuration: 0
      });
    }
  },

  // 开始录音计时
  startDurationTimer() {
    this.stopDurationTimer(); // 先清除可能存在的计时器

    const timer = setInterval(() => {
      this.setData({
        recordDuration: this.data.recordDuration + 1
      });
    }, 1000);

    this.setData({ durationTimer: timer });
  },

  // 停止录音计时
  stopDurationTimer() {
    const { durationTimer } = this.data;

    if (durationTimer) {
      clearInterval(durationTimer);
      this.setData({ durationTimer: null });
    }
  },

  // 处理录音完成
  async handleVoiceRecordComplete(recognizedText) {
    console.log('📢 语音识别完成，识别文字:', recognizedText);

    // 关闭录音弹窗
    this.setData({
      isRecording: false,
      voiceRecordingVisible: false
    });

    // 检查识别文本是否有效
    if (!recognizedText || recognizedText.trim() === '') {
      wx.showToast({
        title: '未识别到有效内容，请重试',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: 'AI解析中...',
      mask: true
    });

    try {
      // 使用AI解析识别的文字
      const parsedData = await this.parseVoiceTextWithAI(recognizedText);

      wx.hideLoading();

      if (!parsedData || parsedData.length === 0) {
        wx.showToast({
          title: '未识别到有效数据',
          icon: 'none'
        });
        return;
      }

      // 显示识别结果
      this.setData({
        aiRecognizedData: parsedData,
        aiResultVisible: true
      });
    } catch (error) {
      wx.hideLoading();
      console.error('AI解析失败:', error);
      wx.showToast({
        title: 'AI识别失败，请重试',
        icon: 'none'
      });
    }
  },

  // 使用AI解析语音文字
  async parseVoiceTextWithAI(voiceText) {
    try {
      // 获取当前页面配置的所有指标（基础+自定义）
      const { displayedBasicIndicators, customIndicators } = this.data;

      // 构建指标列表描述
      const allIndicators = [
        ...displayedBasicIndicators.map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit
        })),
        ...(customIndicators || []).map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit
        }))
      ];

      // 构建指标描述文本
      const indicatorDesc = allIndicators.map(item =>
        `   - ${item.name}（id: ${item.id}，单位：${item.unit}）`
      ).join('\n');

      console.log('📋 当前页面配置的指标:', allIndicators);
      console.log('🎤 语音文字:', voiceText);

      // 调用AI云函数解析语音文字
      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: [
            {
              role: 'system',
              content: `你是一个专业的医疗数据识别助手。你的任务是从用户的语音描述中提取血常规指标数据。

**当前页面需要识别的指标**：
${indicatorDesc}

**识别规则**：
1. 从用户的语音文字中提取上述指标的数值
2. 智能匹配指标名称，例如：
   - "白细胞5点2" → 白细胞: 5.2
   - "血红蛋白134" → 血红蛋白: 134
   - "血小板两百五" → 血小板: 250
3. 识别各种口语表达：
   - "点"代表小数点
   - "五点二"="5.2"
   - "一百三十四"="134"
   - "两百五"="250"
4. 对于每个识别的指标，给予95的置信度

**返回格式**（必须严格遵守）：
{
  "indicators": [
    {
      "id": "wbc",
      "label": "白细胞",
      "value": "5.2",
      "unit": "×10⁹/L",
      "confidence": 95
    }
  ]
}

**重要**：
- 只返回JSON，不要有任何其他文字
- 如果没有识别到任何指标，返回空数组：{"indicators": []}`
            },
            {
              role: 'user',
              content: `请从以下语音识别的文字中提取血常规数据：\n\n${voiceText}`
            }
          ],
          mode: 'unified',
          stream: false
        },
        config: {
          timeout: 30000  // 30秒超时
        }
      });

      console.log('🤖 AI解析响应:', res.result);

      if (!res.result || (!res.result.reply && !res.result.content)) {
        throw new Error('AI响应格式错误');
      }

      // 解析AI返回的JSON - 兼容reply和content两种字段
      let aiResponse = res.result.reply || res.result.content;

      console.log('📝 原始AI响应:', aiResponse);

      // 清理可能的markdown代码块标记（包括换行符）
      aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

      // 清理可能的json=前缀（有些AI模型会返回这种格式）
      if (aiResponse.startsWith('json=')) {
        aiResponse = aiResponse.substring(5);
      }

      console.log('🧹 清理后的响应:', aiResponse);

      const parsed = JSON.parse(aiResponse);

      console.log('📦 解析后的数据:', parsed);

      // 兼容两种返回格式：indicators数组 或 values对象
      let indicators = [];

      if (parsed.indicators && Array.isArray(parsed.indicators)) {
        // 格式1: {indicators: [{id, label, value, unit, confidence}]}
        indicators = parsed.indicators;
      } else if (parsed.values && typeof parsed.values === 'object') {
        // 格式2: {values: {"白细胞": 5.2, ...}}
        indicators = Object.entries(parsed.values).map(([label, value]) => ({
          id: '',
          label: label,
          value: value,
          unit: '',
          confidence: 95
        }));
      } else {
        throw new Error('AI返回数据格式不支持');
      }

      console.log('✅ AI识别结果:', indicators);

      // 已经在函数开头获取了 displayedBasicIndicators 和 customIndicators
      const allConfiguredIndicators = [
        ...displayedBasicIndicators,
        ...(customIndicators || [])
      ];

      console.log('📋 当前配置的指标:', allConfiguredIndicators);

      // 只保留能匹配到当前配置项的指标，并补充正确的中文label
      const matchedIndicators = indicators.map(aiItem => {
        // 尝试匹配配置的指标
        const matchedIndicator = allConfiguredIndicators.find(indicator =>
          aiItem.id === indicator.id || this.fuzzyMatch(aiItem.label, indicator.name)
        );

        if (matchedIndicator) {
          console.log(`✅ 匹配成功: ${aiItem.label} -> ${matchedIndicator.name}`);
          // 返回数据时，使用配置的中文名称作为label
          return {
            ...aiItem,
            id: matchedIndicator.id,
            label: matchedIndicator.name,  // 使用配置的中文名称
            unit: aiItem.unit || matchedIndicator.unit  // 优先使用AI识别的单位，否则使用配置的单位
          };
        } else {
          console.log(`❌ 未匹配: ${aiItem.label}`);
          return null;
        }
      }).filter(item => item !== null);  // 过滤掉未匹配的项

      console.log('🎯 过滤后的匹配指标:', matchedIndicators);

      if (matchedIndicators.length === 0) {
        throw new Error('未识别到当前配置项的数据');
      }

      // 根据置信度给进度条上色（使用暖色调：橙色系）
      const result = matchedIndicators.map(item => ({
        ...item,
        confidenceColor: item.confidence >= 80 ? '#FF9800' :  // 橙色
                        item.confidence >= 60 ? '#FFB84D' : '#FFA726'  // 淡橙色
      }));

      return result;

    } catch (error) {
      console.error('语音解析失败:', error);
      throw error;
    }
  },

  // 处理AI图片输入
  handleAIImageInput(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: async (res) => {
        const imagePath = res.tempFilePaths[0];
        this.setData({ currentImagePath: imagePath });

        wx.showLoading({
          title: 'AI识别中...',
          mask: true
        });

        try {
          // 直接使用AI识别图片（不用OCR）
          const parsedData = await this.recognizeImageWithAI(imagePath);

          wx.hideLoading();

          if (!parsedData || parsedData.length === 0) {
            wx.showToast({
              title: '未识别到血常规数据',
              icon: 'none'
            });
            return;
          }

          // 显示识别结果
          this.setData({
            aiRecognizedData: parsedData,
            aiResultVisible: true
          });

        } catch (error) {
          wx.hideLoading();
          console.error('AI识别失败:', error);
          wx.showToast({
            title: 'AI识别失败，请重试',
            icon: 'none'
          });
        }
      }
    });
  },

  // 使用AI直接识别图片中的血常规数据
  async recognizeImageWithAI(imagePath) {
    try {
      // 先上传图片到云存储获取HTTPS URL
      const imageUrl = await this.uploadImageToCloud(imagePath);

      // 获取当前页面配置的所有指标（基础+自定义）
      const { displayedBasicIndicators, customIndicators } = this.data;

      // 构建指标列表描述
      const allIndicators = [
        ...displayedBasicIndicators.map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit
        })),
        ...(customIndicators || []).map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit
        }))
      ];

      // 构建指标描述文本
      const indicatorDesc = allIndicators.map(item =>
        `   - ${item.name}（id: ${item.id}，单位：${item.unit}）`
      ).join('\n');

      console.log('📋 当前页面配置的指标:', allIndicators);
      console.log('📸 图片URL:', imageUrl);

      // 调用AI云函数，直接识别图片
      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: [
            {
              role: 'system',
              content: `你是一个专业的医疗数据识别助手。你的任务是从血常规检验报告图片中识别并提取关键指标数据。

**当前页面需要识别的指标**：
${indicatorDesc}

**识别规则**：
1. 仔细查看图片中的所有指标数据
2. 只提取上述列表中存在的指标（根据指标名称匹配）
3. 如果图片中的指标名称与列表中的不完全一致，使用智能匹配：
   - 例如："白细胞计数" 可以匹配 "白细胞"
   - 例如："NEUT#" 或 "中性粒细胞绝对值" 可以匹配 "中性粒细胞数"
   - 例如："HGB" 可以匹配 "血红蛋白"
4. 跳过百分比指标（如NEUT%、LYMPH%等），只要绝对值
5. 对于每个识别的指标，评估识别置信度（0-100分）

**返回格式**（必须严格遵守）：
{
  "indicators": [
    {
      "id": "wbc",
      "label": "白细胞",
      "value": "5.2",
      "unit": "×10⁹/L",
      "confidence": 95
    }
  ]
}

**重要要求**：
- 只返回JSON，不要任何其他说明文字
- id必须使用上述列表中的id（准确匹配）
- label是指标的中文名称
- value必须是纯数字字符串（不要包含单位）
- unit是单位
- confidence必须是0-100的整数
- 如果某个指标无法识别或图片中不存在，不要包含在结果中
- 如果图片不是血常规报告，返回空数组：{"indicators": []}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,  // 使用云存储HTTPS URL
                    detail: 'auto'
                  }
                },
                {
                  type: 'text',
                  text: '请识别这张血常规检验报告，提取所有可识别的指标数据。'
                }
              ]
            }
          ],
          mode: 'unified',
          stream: false
        },
        config: {
          timeout: 60000  // 60秒超时
        }
      });

      console.log('🤖 AI识别响应:', res.result);

      if (!res.result || (!res.result.reply && !res.result.content)) {
        throw new Error('AI响应格式错误');
      }

      // 解析AI返回的JSON - 兼容reply和content两种字段
      let aiResponse = res.result.reply || res.result.content;

      console.log('📝 原始AI响应:', aiResponse);

      // 清理可能的markdown代码块标记（包括换行符）
      aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

      // 清理可能的json=前缀（有些AI模型会返回这种格式）
      if (aiResponse.startsWith('json=')) {
        aiResponse = aiResponse.substring(5);
      }

      console.log('🧹 清理后的响应:', aiResponse);

      const parsed = JSON.parse(aiResponse);

      console.log('📦 解析后的数据:', parsed);

      // 兼容两种返回格式：indicators数组 或 values对象
      let indicators = [];

      if (parsed.indicators && Array.isArray(parsed.indicators)) {
        // 格式1: {indicators: [{id, label, value, unit, confidence}]}
        indicators = parsed.indicators;
      } else if (parsed.values && typeof parsed.values === 'object') {
        // 格式2: {values: {"白细胞计数": 6.18, ...}}
        // 需要将values对象转换为indicators数组
        indicators = Object.entries(parsed.values).map(([label, value]) => ({
          id: '', // 稍后通过匹配来确定
          label: label,
          value: value,
          unit: '', // 稍后通过匹配来确定
          confidence: 95 // AI直接识别的值，给予较高置信度
        }));
      } else {
        throw new Error('AI返回数据格式不支持');
      }

      console.log('✅ AI识别结果:', indicators);

      // 已经在函数开头获取了 displayedBasicIndicators 和 customIndicators
      const allConfiguredIndicators = [
        ...displayedBasicIndicators,
        ...(customIndicators || [])
      ];

      console.log('📋 当前配置的指标:', allConfiguredIndicators);

      // 只保留能匹配到当前配置项的指标，并补充正确的中文label
      const matchedIndicators = indicators.map(aiItem => {
        // 尝试匹配配置的指标
        const matchedIndicator = allConfiguredIndicators.find(indicator =>
          aiItem.id === indicator.id || this.fuzzyMatch(aiItem.label, indicator.name)
        );

        if (matchedIndicator) {
          console.log(`✅ 匹配成功: ${aiItem.label} -> ${matchedIndicator.name}`);
          // 返回数据时，使用配置的中文名称作为label
          return {
            ...aiItem,
            id: matchedIndicator.id,
            label: matchedIndicator.name,  // 使用配置的中文名称
            unit: aiItem.unit || matchedIndicator.unit  // 优先使用AI识别的单位，否则使用配置的单位
          };
        } else {
          console.log(`❌ 未匹配: ${aiItem.label}`);
          return null;
        }
      }).filter(item => item !== null);  // 过滤掉未匹配的项

      console.log('🎯 过滤后的匹配指标:', matchedIndicators);

      if (matchedIndicators.length === 0) {
        throw new Error('未识别到当前配置项的数据');
      }

      // 根据置信度给进度条上色（使用暖色调：橙色系）
      const result = matchedIndicators.map(item => ({
        ...item,
        confidenceColor: item.confidence >= 80 ? '#FF9800' :  // 橙色
                        item.confidence >= 60 ? '#FFB84D' : '#FFA726'  // 淡橙色
      }));

      return result;

    } catch (error) {
      console.error('AI识别失败:', error);
      throw error;
    }
  },

  // 上传图片到云存储并获取HTTPS URL
  uploadImageToCloud(imagePath) {
    return new Promise((resolve, reject) => {
      const cloudPath = `blood-test-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      console.log('开始上传图片到云存储:', cloudPath);

      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath,
        success: async (uploadRes) => {
          console.log('图片上传成功，fileID:', uploadRes.fileID);

          // 获取临时链接（HTTPS URL）
          try {
            const tempUrlRes = await wx.cloud.getTempFileURL({
              fileList: [uploadRes.fileID]
            });

            if (tempUrlRes.fileList && tempUrlRes.fileList.length > 0) {
              const tempUrl = tempUrlRes.fileList[0].tempFileURL;
              console.log('获取临时URL成功:', tempUrl);
              resolve(tempUrl);
            } else {
              reject(new Error('获取临时URL失败'));
            }
          } catch (error) {
            console.error('获取临时URL失败:', error);
            reject(error);
          }
        },
        fail: (error) => {
          console.error('图片上传失败:', error);
          reject(error);
        }
      });
    });
  },

  // 使用AI解析血常规数据
  async parseBloodTestWithAI(ocrItems) {
    try {
      // 提取OCR文本
      const ocrText = ocrItems.map(item => item.text).join('\n');

      console.log('📋 OCR识别文本:', ocrText);

      // 调用AI云函数解析
      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: [
            {
              role: 'system',
              content: `你是一个专业的医疗数据解析助手。你的任务是从血常规检验报告的OCR文本中提取关键指标数据。

**识别规则**：
1. 只提取以下血常规指标（如果存在）：
   - WBC/白细胞（单位：×10⁹/L）
   - NEUT#/中性粒细胞数（单位：×10⁹/L，注意不是百分比NEUT%）
   - HGB/血红蛋白（单位：g/L）
   - PLT/血小板（单位：×10⁹/L）
   - RBC/红细胞（单位：×10¹²/L）
   - LYMPH#/淋巴细胞绝对值（单位：×10⁹/L）
   - MONO#/单核细胞绝对值（单位：×10⁹/L）
   - CRP/C反应蛋白（单位：mg/L）

2. 跳过百分比指标（如NEUT%、LYMPH%等）

3. 对于每个识别的指标，评估识别置信度（0-100分）

4. 返回JSON格式：
{
  "indicators": [
    {
      "id": "wbc",
      "label": "白细胞",
      "value": "5.2",
      "unit": "×10⁹/L",
      "confidence": 95
    }
  ]
}

**重要**：
- 只返回JSON，不要任何其他说明文字
- value必须是纯数字字符串
- confidence必须是0-100的整数
- 如果某个指标无法识别或不存在，不要包含在结果中`
            },
            {
              role: 'user',
              content: `请从以下血常规报告OCR文本中提取数据：\n\n${ocrText}`
            }
          ]
        }
      });

      console.log('🤖 AI解析响应:', res.result);

      if (!res.result || !res.result.reply) {
        throw new Error('AI响应格式错误');
      }

      // 解析AI返回的JSON
      let aiResponse = res.result.reply;

      // 清理可能的markdown代码块标记
      aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(aiResponse);

      if (!parsed.indicators || !Array.isArray(parsed.indicators)) {
        throw new Error('AI返回数据格式错误');
      }

      console.log('✅ AI解析结果:', parsed.indicators);

      // 根据置信度给进度条上色
      const result = parsed.indicators.map(item => ({
        ...item,
        confidenceColor: item.confidence >= 80 ? '#10b981' :
                        item.confidence >= 60 ? '#f59e0b' : '#ef4444'
      }));

      return result;

    } catch (error) {
      console.error('AI解析失败:', error);
      throw error;
    }
  },

  // 确认AI识别结果并填充表单
  confirmAIResult() {
    const { aiRecognizedData, formData, displayedBasicIndicators, customIndicators } = this.data;

    if (!aiRecognizedData || aiRecognizedData.length === 0) {
      return;
    }

    // 创建新的表单数据
    const newFormData = { ...formData };
    let fillCount = 0;
    const matchedItems = []; // 记录匹配成功的项

    // 遍历AI识别的每一项数据
    aiRecognizedData.forEach(aiItem => {
      let matched = false;

      // 1. 尝试匹配基础指标
      for (const indicator of displayedBasicIndicators) {
        // 方式1: 直接通过id匹配（AI返回的id与基础指标id相同）
        if (aiItem.id === indicator.id) {
          newFormData[indicator.id] = aiItem.value;
          fillCount++;
          matched = true;
          matchedItems.push(`${indicator.name}: ${aiItem.value}${aiItem.unit || indicator.unit}`);
          break;
        }

        // 方式2: 通过label名称匹配（AI返回的label与基础指标name相同或相似）
        if (aiItem.label && this.fuzzyMatch(aiItem.label, indicator.name)) {
          newFormData[indicator.id] = aiItem.value;
          fillCount++;
          matched = true;
          matchedItems.push(`${indicator.name}: ${aiItem.value}${aiItem.unit || indicator.unit}`);
          break;
        }
      }

      // 2. 如果基础指标没匹配上，尝试匹配自定义指标
      if (!matched && customIndicators && customIndicators.length > 0) {
        for (const customIndicator of customIndicators) {
          // 方式1: 通过id匹配
          if (aiItem.id === customIndicator.id) {
            newFormData[customIndicator.id] = aiItem.value;
            fillCount++;
            matched = true;
            matchedItems.push(`${customIndicator.name}: ${aiItem.value}${aiItem.unit || customIndicator.unit}`);
            break;
          }

          // 方式2: 通过名称模糊匹配
          if (aiItem.label && this.fuzzyMatch(aiItem.label, customIndicator.name)) {
            newFormData[customIndicator.id] = aiItem.value;
            fillCount++;
            matched = true;
            matchedItems.push(`${customIndicator.name}: ${aiItem.value}${aiItem.unit || customIndicator.unit}`);
            break;
          }
        }
      }

      // 如果都没匹配上，记录日志
      if (!matched) {
        console.log(`⚠️ 未找到匹配项: ${aiItem.label || aiItem.id} = ${aiItem.value}`);
      }
    });

    // 更新表单
    this.setData({
      formData: newFormData,
      aiResultVisible: false,
      aiRecognizedData: []
    });

    // 显示填充结果
    if (fillCount > 0) {
      wx.showToast({
        title: `已填充${fillCount}个指标`,
        icon: 'success',
        duration: 2000
      });
      console.log('✅ 填充成功的项:', matchedItems);
    } else {
      wx.showToast({
        title: '未找到匹配的指标',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 模糊匹配函数（用于匹配指标名称）
  fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return false;

    // 去除空格后比较
    const s1 = str1.replace(/\s+/g, '').toLowerCase();
    const s2 = str2.replace(/\s+/g, '').toLowerCase();

    // 完全匹配
    if (s1 === s2) return true;

    // 去除常见后缀再匹配（如"白细胞计数"和"白细胞"）
    const cleanS1 = s1.replace(/(计数|数量|值|浓度|水平|含量|绝对值)$/, '');
    const cleanS2 = s2.replace(/(计数|数量|值|浓度|水平|含量|绝对值)$/, '');

    // 清理后完全匹配
    if (cleanS1 === cleanS2) return true;

    // 特殊医学术语映射（避免"血红蛋白"匹配到"平均血红蛋白含量"）
    const termMap = {
      '白细胞': ['wbc', '白细胞', '白细胞计数'],
      '中性粒细胞': ['neut', 'neut#', '中性粒细胞', '中性粒细胞数', '中性粒细胞绝对值'],
      '淋巴细胞': ['lymph', 'lymph#', '淋巴细胞', '淋巴细胞数', '淋巴细胞绝对值'],
      '血红蛋白': ['hgb', 'hb', '血红蛋白'],
      '红细胞': ['rbc', '红细胞', '红细胞计数'],
      '血小板': ['plt', '血小板', '血小板计数'],
      '单核细胞': ['mono', 'mono#', '单核细胞', '单核细胞数', '单核细胞绝对值']
    };

    // 检查是否在同一个术语组中
    for (const [key, terms] of Object.entries(termMap)) {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      const termsLower = terms.map(t => t.toLowerCase().replace(/\s+/g, ''));

      if (termsLower.includes(cleanS1) && termsLower.includes(cleanS2)) {
        return true;
      }
    }

    return false;
  },

  // 重新识别
  retryAIIdentify() {
    this.setData({
      aiResultVisible: false,
      aiRecognizedData: []
    });

    // 延迟一下再打开选择器，避免UI冲突
    setTimeout(() => {
      this.showAIIdentifyOptions();
    }, 300);
  },

  // 关闭AI结果弹窗
  onAIResultClose(e) {
    // 处理t-popup的visible-change事件
    if (e && e.detail && e.detail.visible === false) {
      this.setData({
        aiResultVisible: false,
        aiRecognizedData: []
      });
    } else if (!e || !e.detail) {
      // 直接调用关闭
      this.setData({
        aiResultVisible: false,
        aiRecognizedData: []
      });
    }
  },

  // 将图片转换为base64
  imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data);
        },
        fail: (err) => {
          console.error('读取图片失败:', err);
          reject(err);
        }
      });
    });
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
