// 使用本地简化版本的echarts
import echarts from '../../ec-canvas/echarts';
const healthChartConfig = require('../../utils/healthChartConfig');
const db = wx.cloud.database();

// 初始化图表函数
function initChart(canvas, width, height, dpr) {

  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  });
  canvas.setChart(chart);
  return chart;
}

// 主题配色 - 淡雅橘黄统一色调
const THEME_COLORS = {
  primary: '#FFB84D',
  secondary: '#FFCC80',
  accent: '#FFB84D',
  deep: '#FF9800',
  light: '#FFCC80',
  background: '#FFFFFF',
  surface: '#FFFFFF'
};

Page({
  data: {
    // 页面加载状态
    isPageLoading: true,
    hasLoadedBefore: false, // 标记页面是否已加载过数据
    bannerList: [],
    keyDates: [],
    isSingleMilestone: false,

    // 弹窗状态
    showKeyDatePopup: false,
    showKeyDateEditPopup: false,
    editingKeyDate: null,
    keyDateForm: {
      title: '',
      date: ''
    },

    // 数据类型分组配置
    dataTypeGroups: healthChartConfig.dataTypeGroups,


    // 每个分组的选中状态（6个分组：血常规、肝功能、肾功能、病毒指标、酶类指标、生命体征、生活指标）
    selectedTypeByGroup: [0, 4, 8, 11, 13, 14, 18], // 每个分组默认选中第一个类型
    selectedTimeByGroup: [0, 0, 0, 0, 0, 0, 0], // 每个分组默认选中30天（索引0）

    // 数据类型配置 - 专业医学配色方案
    dataTypes: healthChartConfig.dataTypes,


    // 时间范围配置
    timeRanges: healthChartConfig.timeRanges,



    // 状态
    loading: true,

    // 按分组存储数据
    chartDataByGroup: [], // 按分组存储图表数据
    latestValueByGroup: [], // 按分组存储最新值
    chartConfigByGroup: [], // 按分组存储图表配置
    hasShownLoginTip: false, // 控制未登录提示只展示一次

    // 当前年份
    currentYear: new Date().getFullYear(),

    // 操作锁，防止并发切换
    isChanging: false,

    // 操作相关状态（移除弹窗相关变量以解决canvas层级问题）

  },

  onLoad() {
    this.isDataReady = false;

    // 初始化图表实例数组（存储在页面实例上，不放在data中）
    this.chartInstancesByGroup = [];
    console.log(`🚀 onLoad: 初始化chartInstancesByGroup数组`);

    // 初始化所有图表配置
    this.initAllChartConfigs();
  },

  // 初始化所有图表的配置
  initAllChartConfigs() {
    const chartConfigByGroup = [];

    // 为每个分组创建图表配置
    this.data.dataTypeGroups.forEach((group, groupIndex) => {
      chartConfigByGroup[groupIndex] = {
        lazyLoad: false,
        onInit: (canvas, width, height, dpr) => {
          const chart = initChart(canvas, width, height, dpr);
          // 存储在页面实例属性中，而不是data中
          this.chartInstancesByGroup[groupIndex] = chart;
          console.log(`✅ 图表实例${groupIndex}已初始化`);
          console.log(`  - chart对象: ${!!chart}`);
          console.log(`  - 存储到chartInstancesByGroup[${groupIndex}]`);
          console.log(`  - chartInstancesByGroup数组长度: ${this.chartInstancesByGroup.length}`);
          return chart;
        }
      };
    });

    this.setData({
      chartConfigByGroup
    });
  },

  onReady() {
    // 加载所有数据类型的数据
    wx.nextTick(() => {
      this.loadAllData().finally(() => {
        wx.hideLoading();
      });
    });

    // 🛡️ Android兼容性：5秒后强制隐藏骨架屏
    setTimeout(() => {
      if (this.data.isPageLoading) {
        console.warn('⚠️ health-chart页面加载超时，强制隐藏骨架屏');
        this.setData({ isPageLoading: false });
      }
    }, 5000);
  },

  onShow() {

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    const isLoggedIn = !!openid;

    this.loadBanners();

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }

    if (!isLoggedIn) {
      if (!this.data.hasShownLoginTip) {
        wx.showToast({
          title: '登录后可查看个人数据',
          icon: 'none'
        });
      }

      this.setData({
        isPageLoading: false,
        loading: false,
        hasLoadedBefore: true,
        chartDataByGroup: [],
        latestValueByGroup: [],
        hasShownLoginTip: true,
        keyDates: []
      });
      return;
    }

    if (this.data.hasShownLoginTip) {
      this.setData({ hasShownLoginTip: false });
    }

    // 获取profileId - 使用与原版相同的方式
    let profileId = '';
    if (app.globalData && app.globalData.currentProfile) {
      profileId = app.globalData.currentProfile.profileId;
    } else if (app.getCurrentProfileId) {
      profileId = app.getCurrentProfileId();
    }

    // 加载里程碑数据
    if (openid && profileId) {
      this.loadHomeMilestones(openid, profileId);
    }

    if (app.globalData.shouldRefreshChart) {
      app.globalData.shouldRefreshChart = false;

      // 重置所有分组的时间选择为30天，且重置hasLoadedBefore以显示骨架屏
      this.setData({
        selectedTimeByGroup: [0, 0, 0, 0, 0, 0, 0], // 6个分组，默认选中30天（索引0）
        isPageLoading: true, // 数据刷新时显示骨架屏
        hasLoadedBefore: false // 重置加载状态
      });
    }

    // 每次显示页面时都重新查询数据，确保数据是最新的
    // 但只在首次加载或数据刷新时显示骨架屏
    if (!this.data.hasLoadedBefore) {
      this.setData({ isPageLoading: true });
    }
    this.loadAllData();

  },

  onHide() {
  },



  // 切换分组内的数据类型
  onGroupTypeChange(e) {
    const groupIndex = parseInt(e.currentTarget.dataset.group);
    const typeIndex = parseInt(e.currentTarget.dataset.type);

    console.log(`🔄 切换图表类型: groupIndex=${groupIndex}, typeIndex=${typeIndex}`);

    if (this.data.selectedTypeByGroup[groupIndex] === typeIndex) return;

    // 防止并发操作
    if (this.data.isChanging) {
      console.warn(`⚠️ 操作锁已启用，跳过切换`);
      return;
    }

    // 设置操作锁
    this.setData({ isChanging: true });

    // 🔧 关键修复：先清空图表实例，避免显示旧数据
    const chart = this.chartInstancesByGroup ? this.chartInstancesByGroup[groupIndex] : null;
    if (chart) {
      console.log(`🧹 清空图表实例${groupIndex}`);
      try {
        chart.clear && chart.clear();

        // 🍎 iOS兼容性修复：清空后立即dispose，强制iOS释放渲染资源
        // 注意：不能真的dispose，否则图表实例会失效，只清空即可
        // 但要通过setOption设置一个空配置，让iOS重置内部状态
        try {
          chart.setOption({}, true); // 第二个参数true表示不合并，完全替换
          console.log(`🍎 iOS修复：已设置空配置，强制重置图表状态`);
        } catch (e) {
          console.warn(`设置空配置失败:`, e);
        }
      } catch (e) {
        console.warn(`清空图表${groupIndex}失败:`, e);
      }
    } else {
      console.warn(`⚠️ 图表实例${groupIndex}不存在，无法清空`);
    }

    // 更新选中的类型
    const selectedTypeByGroup = [...this.data.selectedTypeByGroup];
    selectedTypeByGroup[groupIndex] = typeIndex;

    // 🔧 修复：不清空数据，直接更新类型索引，避免触发组件重新创建
    this.setData({
      selectedTypeByGroup
    });

    // 🔧 修复：立即加载新数据（不延迟），让新数据覆盖旧数据
    console.log(`📊 开始加载分组${groupIndex}的数据`);
    this.loadGroupData(groupIndex)
      .finally(() => {
        this.setData({ isChanging: false });
        console.log(`✅ 分组${groupIndex}数据加载完成，操作锁已释放`);
      });
  },

  // 移除ActionSheet相关方法，使用原生按钮选择以解决iOS canvas层级问题

  // 切换分组的时间范围 (保留原方法以防其他地方调用)
  onChartTimeChange(e) {
    const groupIndex = parseInt(e.currentTarget.dataset.group);
    const timeIndex = parseInt(e.currentTarget.dataset.time);

    if (this.data.selectedTimeByGroup[groupIndex] === timeIndex) return;

    // 防止并发操作
    if (this.data.isChanging) {
      return;
    }

    // 设置操作锁
    this.setData({ isChanging: true });

    // 更新选中的时间
    const selectedTimeByGroup = [...this.data.selectedTimeByGroup];
    selectedTimeByGroup[groupIndex] = timeIndex;

    this.setData({
      selectedTimeByGroup
    });

    // 重新加载该分组的数据
    this.loadGroupData(groupIndex)
      .finally(() => {
        this.setData({ isChanging: false });
      });
  },

  // 加载所有分组的数据
  async loadAllData() {
    this.setData({ loading: true });

    try {
      // 并行加载所有分组的数据
      const promises = this.data.dataTypeGroups.map((group, groupIndex) =>
        this.loadGroupData(groupIndex, false) // false表示不显示loading
      );

      // 🔧 Android兼容性：添加3秒超时保护
      await Promise.race([
        Promise.all(promises),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);

      this.setData({ loading: false });

      // 首次加载完成，隐藏骨架屏
      setTimeout(() => {
        this.setData({
          isPageLoading: false,
          hasLoadedBefore: true // 标记已完成首次加载
        });
      }, 300);

    } catch (error) {
      console.error('加载数据失败:', error);
      this.setData({
        loading: false,
        isPageLoading: false,
        hasLoadedBefore: true // 即使失败，也标记为已加载
      });
    }
  },

  // 加载单个分组的数据
  async loadGroupData(groupIndex, showLoading = true) {
    try {
      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();

      // 增强档案ID获取逻辑
      let profileId = '';
      if (app.globalData && app.globalData.currentProfile && app.globalData.currentProfile.profileId) {
        profileId = app.globalData.currentProfile.profileId;
      } else if (app.getCurrentProfileId) {
        profileId = app.getCurrentProfileId();
      }

      if (!openid || !profileId) {
        this.setData({
          [`chartDataByGroup[${groupIndex}]`]: [],
          [`latestValueByGroup[${groupIndex}]`]: '--'
        });
        return;
      }

      const { timeRanges, selectedTimeByGroup, selectedTypeByGroup, dataTypes } = this.data;

      // 安全检查，防止undefined错误
      if (!selectedTimeByGroup || !selectedTypeByGroup || !timeRanges || !dataTypes) {
        console.error('数据初始化未完成，跳过加载');
        return;
      }

      const timeIndex = selectedTimeByGroup[groupIndex];
      const typeIndex = selectedTypeByGroup[groupIndex];

      console.log('加载数据参数:', {
        groupIndex,
        timeIndex,
        typeIndex,
        timeRangesLength: timeRanges.length,
        dataTypesLength: dataTypes.length
      });

      const timeRange = timeRanges[timeIndex];
      const dataType = dataTypes[typeIndex];

      // 🔍 特别关注巨细胞病毒（索引12）
      if (typeIndex === 12) {
        console.log(`🔬 [巨细胞病毒] loadGroupData被调用`);
        console.log(`  - groupIndex: ${groupIndex}`);
        console.log(`  - typeIndex: ${typeIndex}`);
        console.log(`  - dataType:`, dataType);
        console.log(`  - collection: ${dataType.collection}`);
        console.log(`  - key: ${dataType.key}`);
      }

      if (!timeRange || !dataType) {
        console.error('时间范围或数据类型未找到', {
          groupIndex,
          timeIndex,
          typeIndex,
          timeRange,
          dataType,
          timeRanges,
          dataTypes
        });
        return;
      }
      const db = wx.cloud.database();

      let allData = [];
      let hasMore = true;
      let skip = 0;
      const batchSize = 20;

      while (hasMore) {
        const batchResult = await db.collection(dataType.collection)
          .where({
            profileId: profileId,
            _openid: openid
          })
          .orderBy('date', 'asc')
          .skip(skip)
          .limit(batchSize)
          .get();

        if (batchResult.data.length > 0) {
          allData = allData.concat(batchResult.data);
          skip += batchSize;

          if (batchResult.data.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      allData.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 🔍 特别关注巨细胞病毒（索引12）
      if (typeIndex === 12) {
        console.log(`🔬 [巨细胞病毒] 数据库查询完成`);
        console.log(`  - 原始数据数量: ${allData.length}`);
        console.log(`  - 原始数据:`, allData);
      }

      let chartData = [];
      let latestValue = '--';

      if (allData.length > 0) {
        let filteredData = this.filterDataByTimeRange(allData, timeRange.id);

        // 🔍 特别关注巨细胞病毒（索引12）
        if (typeIndex === 12) {
          console.log(`🔬 [巨细胞病毒] 时间范围过滤后`);
          console.log(`  - 过滤后数据数量: ${filteredData.length}`);
          console.log(`  - 过滤后数据:`, filteredData);
        }

        chartData = this.processDataForType(filteredData, dataType);

        // 🔍 特别关注巨细胞病毒（索引12）
        if (typeIndex === 12) {
          console.log(`🔬 [巨细胞病毒] 处理后的图表数据`);
          console.log(`  - chartData数量: ${chartData.length}`);
          console.log(`  - chartData:`, chartData);
        }

        if (chartData.length > 0) {
          const latest = chartData[chartData.length - 1].value;
          // 智能格式化：整数不显示小数点
          latestValue = this.formatNumber(latest) + dataType.unit;
        }
      }

      // 🔍 特别关注巨细胞病毒（索引12）
      if (typeIndex === 12) {
        console.log(`🔬 [巨细胞病毒] 准备设置数据到页面`);
        console.log(`  - 最终chartData数量: ${chartData.length}`);
        console.log(`  - latestValue: ${latestValue}`);
      }

      this.setData({
        [`chartDataByGroup[${groupIndex}]`]: chartData,
        [`latestValueByGroup[${groupIndex}]`]: latestValue
      });

      // 渲染该分组的图表
      setTimeout(() => {
        this.renderGroupChart(groupIndex);
      }, 100);

    } catch (error) {
      console.error(`加载分组${groupIndex}数据失败:`, error);
      this.setData({
        [`chartDataByGroup[${groupIndex}]`]: [],
        [`latestValueByGroup[${groupIndex}]`]: '--'
      });
    }
  },

  // 智能格式化数字：整数不显示小数点
  formatNumber(value, decimals = 1) {
    if (value == null || isNaN(value)) return '';

    const num = Number(value);
    // 如果是整数，直接返回整数
    if (Number.isInteger(num)) {
      return num.toString();
    }
    // 如果有小数，保留指定位数
    return num.toFixed(decimals);
  },

  // 为特定数据类型处理数据
  processDataForType(rawData, dataType) {
    if (rawData.length === 0) {
      return [];
    }

    const validData = [];

    rawData.forEach((item, index) => {
      const value = item.customValues?.[dataType.key] || item[dataType.key];

      if (value != null && value !== '') {
        const numValue = Number(value);

        if (!isNaN(numValue)) {
          validData.push({
            date: item.date,
            value: numValue,
            createTime: new Date(item.date)
          });
        }
      }
    });

    if (validData.length === 0) {
      return [];
    }

    validData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const chartData = validData.map((item, index) => ({
      name: this.formatDate(item.date),
      value: item.value,
      createTime: item.createTime,
      index: index
    }));

    return chartData;
  },

  // 渲染单个分组的图表
  renderGroupChart(groupIndex, retryCount = 0) {
    const maxRetries = 5; // 最多重试5次
    // 从页面实例属性中获取图表实例，而不是从data中
    const chart = this.chartInstancesByGroup ? this.chartInstancesByGroup[groupIndex] : null;
    const { chartDataByGroup, selectedTypeByGroup, dataTypes } = this.data;
    const chartData = chartDataByGroup[groupIndex];
    const typeIndex = selectedTypeByGroup[groupIndex];
    const dataType = dataTypes[typeIndex];

    console.log(`🎨 renderGroupChart: groupIndex=${groupIndex}, retryCount=${retryCount}`);
    console.log(`  - chart存在: ${!!chart}`);
    console.log(`  - chartData存在: ${!!chartData}, 长度: ${chartData ? chartData.length : 0}`);
    console.log(`  - chartInstancesByGroup数组: ${this.chartInstancesByGroup ? 'exists' : 'null'}`);

    // 如果图表实例不存在，延迟重试
    if (!chart) {
      if (retryCount < maxRetries) {
        console.warn(`⚠️ 图表实例${groupIndex}不存在，第${retryCount + 1}/${maxRetries}次重试，300ms后重试`);
        setTimeout(() => {
          this.renderGroupChart(groupIndex, retryCount + 1);
        }, 300);
      } else {
        console.error(`❌ 图表实例${groupIndex}重试${maxRetries}次后仍未初始化，放弃渲染`);
      }
      return;
    }

    // 🔧 修复：即使数据为空，也要清空图表，避免显示旧数据
    if (!chartData || chartData.length === 0) {
      console.log(`📭 图表${groupIndex}数据为空，清空图表`);
      try {
        chart.clear && chart.clear();
      } catch (e) {
        console.warn(`清空图表${groupIndex}失败:`, e);
      }
      return;
    }

    // 使用原有的图表配置，但适配新的数据结构
    const option = this.createChartOption(chartData, dataType);

    try {
      console.log(`🖌️ 开始渲染图表${groupIndex}`);
      chart.clear && chart.clear();
      chart.setOption(option, true);
      console.log(`✅ 图表${groupIndex}setOption完成`);

      // 强制重新渲染
      setTimeout(() => {
        try {
          chart.resize && chart.resize();
          console.log(`✅ 图表${groupIndex}resize完成`);
        } catch (e) {
          console.warn(`图表${groupIndex}resize失败:`, e);
        }
      }, 100);
    } catch (error) {
      console.error(`❌ 渲染分组${groupIndex}图表失败:`, error);
    }
  },

  // 创建图表配置选项
  createChartOption(data, dataType) {

    const option = {
      backgroundColor: '#FFFFFF',
      textStyle: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'transparent',
        borderWidth: 0,
        textStyle: {
          color: '#333',
          fontSize: 12,
          fontWeight: 'normal'
        },
        formatter: (params) => {
          if (!params || params.length === 0) return '';

          const point = params[0];
          const value = point.value;
          const name = point.name;

          let statusText = '';
          if (dataType.normalRange && dataType.normalRange.length === 2) {
            const [min, max] = dataType.normalRange;
            if (value < min) {
              statusText = '<br/><span style="color: #2196F3;">● 偏低</span>';
            } else if (value > max) {
              statusText = '<span style="color: #FFB84D;">● 偏高</span>';
            } else {
              statusText = '<br/><span style="color: #4CAF50;">● 正常</span>';
            }
          }

          return `<div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
            <div style="color: ${dataType.color}; font-size: 14px; font-weight: bold;">
              ${value}${dataType.unit}
            </div>
            ${statusText}
          </div>`;
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: dataType.color,
            width: 2,
            type: 'dashed'
          }
        }
      },
      grid: {
        left: '10%',
        right: '6%',
        top: '8%',
        bottom: data.length > 7 ? '25%' : '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => this.formatDate(item.date || item.createTime)),
        axisLabel: {
          show: true,
          fontSize: 10,
          color: '#000000',
          opacity: 1.0
        },
        axisLine: {
          lineStyle: {
            color: '#CCCCCC',
            width: 1
          }
        },
        axisTick: {
          show: false
        },
        boundaryGap: data.length === 1 ? true : false
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#000000',
          opacity: 1.0,
          formatter: (value) => {
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k';
            } else if (value >= 100) {
              return Math.round(value);
            } else if (value >= 10) {
              return value.toFixed(1);
            } else {
              return value.toFixed(2);
            }
          }
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: ['#F5F5F5'],
            width: 1,
            type: 'solid'
          }
        }
      },
      series: [{
        name: dataType.name,
        type: 'line',
        data: data.map(item => item.value),
        smooth: 0.4, // 🎨 贝塞尔曲线平滑度：0.4 = 柔滑自然（0-1，值越大越平滑）
        smoothMonotone: 'x', // 🎨 单调平滑：沿x轴方向保持单调性，避免过度弯曲
        symbol: 'circle',
        symbolSize: 10, // 🎨 数据点大小：10px 更圆润醒目
        showSymbol: true,
        // 🎨 优美的渐变填充面积
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: dataType.color + '40' },   // 顶部25%透明
              { offset: 0.5, color: dataType.color + '20' }, // 中间12.5%透明
              { offset: 1, color: dataType.color + '08' }    // 底部3%透明
            ]
          },
          shadowColor: dataType.color,
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        label: {
          show: data.length <= 15, // 数据点多时隐藏标签，保持清爽
          position: 'top',
          distance: 8,
          fontSize: 11,
          color: dataType.color,
          fontWeight: '600',
          formatter: function (params) {
            return params.value.toFixed(1);
          },
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 4,
          padding: [4, 8],
          borderColor: dataType.color,
          borderWidth: 1.5,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowBlur: 4,
          shadowOffsetY: 2
        },
        lineStyle: {
          width: 3, // 🎨 线条宽度：3px 更柔和圆润
          color: dataType.color,
          shadowColor: dataType.color,
          shadowBlur: 12, // 🎨 增强阴影模糊，营造柔和感
          shadowOffsetY: 3,
          cap: 'round', // 🎨 圆角端点
          join: 'round' // 🎨 圆角连接
        },
        itemStyle: {
          color: '#fff',
          borderColor: dataType.color,
          borderWidth: 3, // 🎨 数据点边框增粗，更明显
          shadowColor: dataType.color,
          shadowBlur: 8,
          shadowOffsetY: 3
        },
        emphasis: {
          scale: 1.3, // 🎨 悬浮放大倍数：1.3x 更明显
          focus: 'series',
          itemStyle: {
            color: dataType.color,
            borderColor: '#fff',
            borderWidth: 4, // 🎨 强调状态边框更粗
            shadowBlur: 16, // 🎨 强调状态阴影更柔和
            shadowColor: dataType.color
          },
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold'
          }
        },
        markLine: dataType.normalRange && dataType.normalRange[0] !== dataType.normalRange[1] ? {
          silent: true,
          symbol: ['none', 'none'], // 🎨 去掉箭头，更简洁
          lineStyle: {
            color: '#4CAF50',
            type: 'dashed',
            width: 1.5, // 🎨 稍细的虚线，更精致
            opacity: 0.5, // 🎨 降低不透明度，更柔和
            dashOffset: 5 // 🎨 虚线偏移，增加视觉效果
          },
          label: {
            show: true,
            position: 'end',
            fontSize: 10, // 🎨 标签字体稍大，更清晰
            color: '#4CAF50',
            fontWeight: '500',
            backgroundColor: 'rgba(255, 255, 255, 0.8)', // 🎨 添加半透明背景
            padding: [2, 6],
            borderRadius: 3
          },
          data: [
            { yAxis: dataType.normalRange[0], name: '下限' },
            { yAxis: dataType.normalRange[1], name: '上限' }
          ]
        } : null
      }]
    };

    // 添加dataZoom滚动条，超过7条数据时显示
    if (data.length > 7) {
      const visibleCount = 7;
      const startPercent = Math.max(0, ((data.length - visibleCount) / data.length) * 100);

      option.dataZoom = [{
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: startPercent,
        end: 100,
        height: 18,
        bottom: 25,
        backgroundColor: '#f5f5f5',
        dataBackground: {
          lineStyle: {
            color: '#FFB84D',
            width: 2
          },
          areaStyle: {
            color: 'rgba(255, 184, 77, 0.1)'
          }
        },
        selectedDataBackground: {
          lineStyle: {
            color: '#FFB84D',
            width: 3
          },
          areaStyle: {
            color: 'rgba(255, 184, 77, 0.2)'
          }
        },
        handleStyle: {
          color: '#FFB84D',
          borderColor: '#FF9800',
          borderWidth: 2
        },
        handleIcon: 'path://M10,13c0-2.2-1.8-4-4-4S2,10.8,2,13c0,2.2,1.8,4,4,4S10,15.2,10,13z M6,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S7.7,16,6,16z',
        handleSize: '80%',
        textStyle: {
          color: '#333'
        },
        borderColor: '#ddd',
        fillerColor: 'rgba(255, 184, 77, 0.2)',
        realtime: true,
        filterMode: 'none', // 🔧 修复：使用none避免数据被过滤，只改变显示范围
        zoomLock: false // 允许缩放
      }];
    }

    return option;
  },

  filterDataByTimeRange(allData, timeRangeId) {
    if (timeRangeId <= 0) {
      return allData;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRangeId);

    return allData.filter(item => new Date(item.date) >= cutoffDate);
  },


  calculateDisplayYear(data) {
    try {
      const selectedTimeRange = this.data.timeRanges[this.data.selectedTimeRange];
      const isAllTime = selectedTimeRange.id === 0;

      if (isAllTime && data.length > 0) {
        const latestDate = data[data.length - 1].createTime;
        const year = latestDate.getFullYear();
        this.setData({ currentYear: year });
        return year;
      } else {
        const currentYear = new Date().getFullYear();
        this.setData({ currentYear });
        return currentYear;
      }

    } catch (error) {
      return new Date().getFullYear();
    }
  },


  // 计算X轴标签间隔 - 优化移动端密集度
  calculateXAxisInterval(dataLength) {
    // 获取屏幕信息
    let screenWidth = 375;
    let isMobile = false;
    try {
      const systemInfo = wx.getSystemInfoSync();
      screenWidth = systemInfo.screenWidth || 375;
      isMobile = systemInfo.platform !== 'devtools';
    } catch (error) {
      console.warn('获取系统信息失败，使用默认设置');
    }

    // 移动端更严格的显示策略
    if (isMobile && screenWidth < 400) {
      if (dataLength <= 3) return 0;      // 3个以下全显示
      if (dataLength <= 5) return 0;      // 5个以下全显示
      if (dataLength <= 8) return 1;      // 8个以下隔一个显示
      if (dataLength <= 15) return 2;     // 15个以下隔两个显示
      if (dataLength <= 30) return 4;     // 30个以下隔四个显示
      return Math.ceil(dataLength / 6);   // 最多显示6个标签
    }

    // PC端或大屏设备的显示策略
    if (dataLength <= 3) return 0;      // 3个以下全显示
    if (dataLength <= 6) return 0;      // 6个以下全显示
    if (dataLength <= 12) return 1;     // 12个以下隔一个显示
    if (dataLength <= 24) return 2;     // 24个以下隔两个显示
    if (dataLength <= 48) return 3;     // 48个以下隔三个显示
    return 'auto';                       // 超过48个自动计算
  },

  // 智能聚合全部时间数据
  smartAggregateForAllTime(data) {
    if (data.length === 0) return [];

    // 计算时间跨度
    const firstDate = new Date(data[0].createTime);
    const lastDate = new Date(data[data.length - 1].createTime);
    const yearSpan = lastDate.getFullYear() - firstDate.getFullYear();
    const monthSpan = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
      (lastDate.getMonth() - firstDate.getMonth());

    let aggregationType = '';
    let result = [];

    if (yearSpan >= 2) {
      // 2年及以上：按年聚合
      result = this.aggregateByYear(data);
      aggregationType = '按年度平均值显示';
    } else if (yearSpan >= 1) {
      // 1年内数据：按月聚合
      result = this.aggregateByMonth(data);
      aggregationType = '按月度平均值显示';
    } else if (monthSpan >= 6) {
      // 6个月以上：按月聚合
      result = this.aggregateByMonth(data);
      aggregationType = '按月度平均值显示';
    } else {
      // 6个月以内：按周聚合，保持足够细节
      result = this.aggregateByWeek(data);
      aggregationType = '按周平均值显示';
    }


    return result;
  },

  // 按年聚合
  aggregateByYear(data) {
    const yearlyData = {};

    data.forEach(item => {
      const year = new Date(item.createTime).getFullYear();

      if (!yearlyData[year]) {
        yearlyData[year] = {
          values: [],
          year: year
        };
      }

      yearlyData[year].values.push(item.value);
    });

    return Object.keys(yearlyData).map(year => {
      const yearData = yearlyData[year];
      const avgValue = yearData.values.reduce((sum, val) => sum + val, 0) / yearData.values.length;

      return {
        name: `${year}年`,
        displayName: `${year}年`,
        value: Number(avgValue.toFixed(1)),
        createTime: new Date(year, 0, 1),
        aggregationType: 'year',
        rawData: yearData.values
      };
    });
  },

  // 按季度聚合
  aggregateByQuarter(data) {
    const quarterlyData = {};

    data.forEach(item => {
      const date = new Date(item.createTime);
      const year = date.getFullYear();
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const quarterKey = `${year}-Q${quarter}`;

      if (!quarterlyData[quarterKey]) {
        quarterlyData[quarterKey] = {
          values: [],
          year: year,
          quarter: quarter
        };
      }

      quarterlyData[quarterKey].values.push(item.value);
    });

    return Object.keys(quarterlyData).map(quarterKey => {
      const quarterData = quarterlyData[quarterKey];
      const avgValue = quarterData.values.reduce((sum, val) => sum + val, 0) / quarterData.values.length;

      return {
        name: `Q${quarterData.quarter}`,
        displayName: `${quarterData.year}年Q${quarterData.quarter}`,
        value: Number(avgValue.toFixed(1)),
        createTime: new Date(quarterData.year, (quarterData.quarter - 1) * 3, 1),
        aggregationType: 'quarter',
        rawData: quarterData.values
      };
    });
  },

  aggregateByMonth(data) {
    const monthlyData = {};

    data.forEach(item => {
      const date = new Date(item.createTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          values: [],
          year: date.getFullYear(),
          month: date.getMonth() + 1
        };
      }

      monthlyData[monthKey].values.push(item.value);
    });

    return Object.keys(monthlyData).map(monthKey => {
      const monthData = monthlyData[monthKey];
      const avgValue = monthData.values.reduce((sum, val) => sum + val, 0) / monthData.values.length;

      return {
        name: `${monthData.month}月`,
        displayName: `${monthData.year}年${monthData.month}月`,
        value: Number(avgValue.toFixed(1)),
        createTime: new Date(monthData.year, monthData.month - 1, 1),
        aggregationType: 'month',
        rawData: monthData.values
      };
    });
  },

  // 按周聚合数据
  aggregateByWeek(data) {
    const weeklyData = {};

    data.forEach(item => {
      const date = new Date(item.createTime);
      const weekKey = this.getWeekKey(date);

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          values: [],
          weekStart: this.getWeekStart(date)
        };
      }

      weeklyData[weekKey].values.push(item.value);
    });

    return Object.keys(weeklyData).map(weekKey => {
      const weekData = weeklyData[weekKey];
      const avgValue = weekData.values.reduce((sum, val) => sum + val, 0) / weekData.values.length;
      const weekStart = weekData.weekStart;

      return {
        name: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        displayName: `${weekStart.getMonth() + 1}/${weekStart.getDate()}周`,
        value: Number(avgValue.toFixed(1)),
        createTime: weekStart,
        aggregationType: 'week'
      };
    });
  },

  // 数据采样（间隔显示）
  sampleData(data, interval) {
    const sampled = [];
    for (let i = 0; i < data.length; i += interval) {
      sampled.push(data[i]);
    }
    // 确保最后一个数据点也被包含
    if (data.length > 0 && sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1]);
    }
    return sampled;
  },

  // 获取周的标识
  getWeekKey(date) {
    const year = date.getFullYear();
    const weekNum = this.getWeekNumber(date);
    return `${year}-W${weekNum}`;
  },

  // 获取周的开始日期（周一）
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  },

  // 计算周数
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  },

  async loadBanners() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getBanners',
        data: { _t: Date.now() }
      });

      if (res.result && res.result.success) {
        const bannerList = (res.result.data || []).map(item => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.text || item.content || '',
              link: item.link || ''
            };
          }
          return {
            type: 'image',
            image: item.image || item.imageUrl || '',
            link: item.link || ''
          };
        }).filter(item => {
          if (item.type === 'text') {
            return item.text && item.text.trim() !== '';
          }
          return item.image && item.image.trim() !== '';
        });

        this.setData({
          bannerList: bannerList.length > 0 ? bannerList : [{ type: 'text', text: '记录每一天，关注健康变化' }]
        });
      }
    } catch (error) {
      console.error('加载轮播图失败:', error);
      this.setData({ bannerList: [{ type: 'text', text: '记录每一天，关注健康变化' }] });
    }
  },

  onBannerTap(e) {
    const link = e.currentTarget.dataset.link;
    if (!link) return;

    if (link.startsWith('miniprogram://')) {
      try {
        const url = new URL(link);
        const appId = url.hostname;
        const path = url.searchParams.get('path') || '';
        const extraDataStr = url.searchParams.get('extraData') || '{}';
        let extraData = {};
        try {
          extraData = JSON.parse(decodeURIComponent(extraDataStr));
        } catch (err) {
          console.warn('extraData解析失败:', err);
        }
        wx.navigateToMiniProgram({ appId, path, extraData });
      } catch (err) {
        console.error('解析小程序链接失败:', err);
        wx.showToast({ title: '链接格式错误', icon: 'none' });
      }
      return;
    }

    if (link.startsWith('mp://')) {
      const mpUsername = link.replace('mp://', '');
      wx.navigateToMiniProgram({
        appId: 'wx18a2ac992306a5a4',
        path: `/pages/home/home?userName=${mpUsername}`,
        envVersion: 'release'
      });
      return;
    }

    if (link.startsWith('https://') || link.startsWith('http://')) {
      wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(link)}` });
      return;
    }

    wx.showToast({ title: '不支持的链接', icon: 'none' });
  },

  onBannerImageError(e) {
    const index = e.currentTarget.dataset.index;
    const bannerList = this.data.bannerList || [];
    if (index !== undefined && bannerList[index]) {
      bannerList[index] = {
        type: 'text',
        text: '记录每一天，关注健康变化',
        link: bannerList[index].link || ''
      };
      this.setData({ bannerList });
    }
  },

  loadHomeMilestones(openid, profileId) {
    if (!openid || !profileId) {
      this.setData({ keyDates: [], isSingleMilestone: false });
      return Promise.resolve();
    }

    console.log('=== 加载首页暖光里程碑 ===');
    console.log('openid:', openid);
    console.log('profileId:', profileId);

    return db.collection('keyDates')
      .where({ openid: openid, profileId: profileId })
      .get()
      .then(res => {
        console.log('查询到的里程碑数量:', res.data.length);
        console.log('查询结果:', res.data);

        const keyDates = (res.data || []).map(item => {
          const statusObj = this.getMilestoneStatus(item.date);
          return {
            id: item._id,
            title: item.title || item.name || '未命名',
            date: item.date,
            dateFormatted: this.formatDateForDisplay(item.date),
            statusObj
          };
        }).sort((a, b) => {
          const diffA = a.statusObj.daysDiff;
          const diffB = b.statusObj.daysDiff;
          if (diffA === diffB) return new Date(a.date) - new Date(b.date);
          if (diffA >= 0 && diffB >= 0) return diffA - diffB;
          if (diffA < 0 && diffB < 0) return diffB - diffA;
          return diffA >= 0 ? -1 : 1;
        });

        console.log('处理后的里程碑:', keyDates);

        this.setData({
          keyDates,
          isSingleMilestone: keyDates.length === 1
        });
      })
      .catch(error => {
        console.error('加载暖光里程碑失败:', error);
        this.setData({ keyDates: [], isSingleMilestone: false });
      });
  },

  getMilestoneStatus(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((target - today) / (1000 * 60 * 60 * 24));
    const absDays = Math.abs(diffDays);

    if (diffDays === 0) {
      return {
        fullText: '今天',
        prefix: '',
        daysNumber: '',
        suffix: '',
        isToday: true,
        daysDiff: 0
      };
    }

    const prefix = diffDays > 0 ? '还有' : '已经';
    const suffix = '天';
    return {
      fullText: `${prefix}${absDays}${suffix}`,
      prefix,
      daysNumber: absDays,
      suffix,
      isToday: false,
      daysDiff: diffDays
    };
  },

  formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  },


  formatDate(date) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  },

  // 显示暖光里程碑设置弹窗
  showKeyDatePopup() {
    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    const currentProfileId = app.getCurrentProfileId();

    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 显示弹窗前先加载最新数据
    this.loadHomeMilestones(openid, currentProfileId).then(() => {
      this.setData({ showKeyDatePopup: true });
    }).catch(() => {
      this.setData({ showKeyDatePopup: true });
    });
  },

  // 关闭暖光里程碑设置弹窗
  closeKeyDatePopup(e) {
    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {
      this.setData({ showKeyDatePopup: e.detail.visible });
    } else {
      this.setData({ showKeyDatePopup: false });
    }
  },

  // 显示添加/编辑暖光里程碑弹窗
  showKeyDateEditPopup() {
    const defaultDate = new Date().toISOString().split('T')[0];
    this.setData({
      showKeyDatePopup: false,
      showKeyDateEditPopup: true,
      editingKeyDate: null,
      keyDateForm: {
        title: '',
        date: defaultDate
      }
    });
  },

  // 关闭编辑弹窗
  closeKeyDateEditPopup(e) {
    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {
      this.setData({ showKeyDateEditPopup: e.detail.visible });
    } else {
      this.setData({ showKeyDateEditPopup: false });
    }
  },

  // 返回列表
  backToKeyDateList() {
    this.setData({
      showKeyDateEditPopup: false,
      showKeyDatePopup: true
    });
  },

  // 编辑暖光里程碑
  editKeyDate(e) {
    const id = e.currentTarget.dataset.id;
    const keyDate = this.data.keyDates.find(item => item.id === id);

    if (!keyDate) {
      wx.showToast({ title: '数据错误', icon: 'none' });
      return;
    }

    this.setData({
      showKeyDatePopup: false,
      showKeyDateEditPopup: true,
      editingKeyDate: keyDate,
      keyDateForm: {
        title: keyDate.title,
        date: keyDate.date
      }
    });
  },

  // 删除里程碑
  async deleteKeyDate(e) {
    const id = e.currentTarget.dataset.id;

    const res = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个里程碑吗？',
        success: res => resolve(res.confirm)
      });
    });

    if (!res) return;

    try {
      await db.collection('keyDates').doc(id).remove();
      wx.showToast({ title: '删除成功', icon: 'success' });

      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();
      const profileId = app.getCurrentProfileId();
      await this.loadHomeMilestones(openid, profileId);
    } catch (error) {
      console.error('删除失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  // 表单输入
  onKeyDateTitleInput(e) {
    this.setData({ 'keyDateForm.title': e.detail.value });
  },

  onKeyDateChange(e) {
    this.setData({ 'keyDateForm.date': e.detail.value });
  },

  // 保存里程碑
  async saveKeyDate() {
    const { title, date } = this.data.keyDateForm;

    if (!title || !date) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    const profileId = app.getCurrentProfileId();

    if (!openid || !profileId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      if (this.data.editingKeyDate) {
        // 更新
        await db.collection('keyDates').doc(this.data.editingKeyDate.id).update({
          data: { title, date }
        });
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        // 新增
        await db.collection('keyDates').add({
          data: {
            openid,
            profileId,
            title,
            date,
            createTime: new Date()
          }
        });
        wx.showToast({ title: '添加成功', icon: 'success' });
      }

      await this.loadHomeMilestones(openid, profileId);
      this.setData({
        showKeyDateEditPopup: false,
        showKeyDatePopup: true
      });
    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },



  // 禁用图表点击事件 - 数值已直接显示在图表上
  handleChartClick(x, y) {
    // 不再处理点击事件，数值已经直接显示在图表的每个数据点上
    return;
  },

  // 阻止图表区域触发页面滚动
  preventScroll() {
    // 空方法，仅用于阻止事件冒泡到 scroll-view
    // catchtouchmove/catchtouchstart/catchtouchend 会阻止事件传播
    return false;
  },


  onUnload() {
    // 销毁所有图表实例
    const chartInstances = this.data.chartInstancesByGroup;
    if (chartInstances) {
      chartInstances.forEach(chart => {
        if (chart && chart.dispose) {
          chart.dispose();
        }
      });
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
      path: '/pages/home/index',
      imageUrl: res.fileList[0].tempFileURL
    }
  }
});
