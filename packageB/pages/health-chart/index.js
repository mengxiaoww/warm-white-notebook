// 使用本地简化版本的echarts
import echarts from '../../ec-canvas/echarts';
const healthChartConfig = require('../../utils/healthChartConfig');

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

    // 数据类型分组配置
    dataTypeGroups: healthChartConfig.dataTypeGroups,


    // 每个分组的选中状态（7个分组：血常规、肝功能、肾功能、病毒指标、酶类指标、生命体征、生活指标）
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
    chartInstancesByGroup: [], // 按分组存储图表实例
    hasShownLoginTip: false, // 控制未登录提示只展示一次

    // 当前年份
    currentYear: new Date().getFullYear(),

    // 操作锁，防止并发切换
    isChanging: false,

    // 操作相关状态（移除弹窗相关变量以解决canvas层级问题）

  },

  onLoad() {
    this.isDataReady = false;

    // 初始化所有图表配置
    this.initAllChartConfigs();
  },

  // 初始化所有图表的配置
  initAllChartConfigs() {
    const chartConfigByGroup = [];
    const chartInstancesByGroup = [];

    // 为每个分组创建图表配置
    this.data.dataTypeGroups.forEach((group, groupIndex) => {
      chartConfigByGroup[groupIndex] = {
        lazyLoad: false,
        onInit: (canvas, width, height, dpr) => {
          const chart = initChart(canvas, width, height, dpr);
          chartInstancesByGroup[groupIndex] = chart;
          this.setData({
            [`chartInstancesByGroup[${groupIndex}]`]: chart
          });
          return chart;
        }
      };
    });

    this.setData({
      chartConfigByGroup,
      chartInstancesByGroup
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

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
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
        hasShownLoginTip: true
      });
      return;
    }

    if (this.data.hasShownLoginTip) {
      this.setData({ hasShownLoginTip: false });
    }

    if (app.globalData.shouldRefreshChart) {
      app.globalData.shouldRefreshChart = false;

      // 重置所有分组的时间选择为30天，且重置hasLoadedBefore以显示骨架屏
      this.setData({
        selectedTimeByGroup: [1, 1, 1],
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

    if (this.data.selectedTypeByGroup[groupIndex] === typeIndex) return;

    // 防止并发操作
    if (this.data.isChanging) {
      return;
    }

    // 设置操作锁
    this.setData({ isChanging: true });

    // 更新选中的类型
    const selectedTypeByGroup = [...this.data.selectedTypeByGroup];
    selectedTypeByGroup[groupIndex] = typeIndex;

    this.setData({
      selectedTypeByGroup
    });

    // 重新加载该分组的数据
    this.loadGroupData(groupIndex)
      .finally(() => {
        this.setData({ isChanging: false });
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

      let chartData = [];
      let latestValue = '--';

      if (allData.length > 0) {
        let filteredData = this.filterDataByTimeRange(allData, timeRange.id);
        chartData = this.processDataForType(filteredData, dataType);

        if (chartData.length > 0) {
          const latest = chartData[chartData.length - 1].value;
          // 饮食记录次数显示为整数，其他显示一位小数
          latestValue = (dataType.key === 'mealCount' ? latest.toFixed(0) : latest.toFixed(1)) + dataType.unit;
        }
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

  // 为特定数据类型处理数据
  processDataForType(rawData, dataType) {
    if (rawData.length === 0) {
      return [];
    }

    // 特殊处理：饮食记录统计每天的记录次数
    if (dataType.key === 'mealCount') {
      // 按日期分组统计记录次数
      const countByDate = {};
      rawData.forEach(item => {
        if (item.date) {
          countByDate[item.date] = (countByDate[item.date] || 0) + 1;
        }
      });

      // 转换为图表数据格式
      const chartData = Object.keys(countByDate)
        .sort((a, b) => new Date(a) - new Date(b))
        .map((date, index) => ({
          name: this.formatDate(date),
          value: countByDate[date],
          createTime: new Date(date),
          index: index
        }));

      return chartData;
    }

    // 其他数据类型的常规处理
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
  renderGroupChart(groupIndex) {
    const { chartInstancesByGroup, chartDataByGroup, selectedTypeByGroup, dataTypes } = this.data;
    const chart = chartInstancesByGroup[groupIndex];
    const chartData = chartDataByGroup[groupIndex];
    const typeIndex = selectedTypeByGroup[groupIndex];
    const dataType = dataTypes[typeIndex];

    if (!chart || !chartData || chartData.length === 0) {
      return;
    }

    // 使用原有的图表配置，但适配新的数据结构
    const option = this.createChartOption(chartData, dataType);

    try {
      chart.clear && chart.clear();
      chart.setOption(option, true);

      // 强制重新渲染
      setTimeout(() => {
        try {
          chart.resize && chart.resize();
        } catch (e) {
          console.warn('图表resize失败:', e);
        }
      }, 100);
    } catch (error) {
      console.error(`渲染分组${groupIndex}图表失败:`, error);
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
        smooth: 0.6, // 🎨 使用数值控制平滑度，0.6 = 非常平滑圆润
        symbol: 'circle',
        symbolSize: 8,
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
          width: 2.5, // 更细的线条，现代感
          color: dataType.color,
          shadowColor: dataType.color,
          shadowBlur: 8,
          shadowOffsetY: 2
        },
        itemStyle: {
          color: '#fff',
          borderColor: dataType.color,
          borderWidth: 2.5,
          shadowColor: dataType.color,
          shadowBlur: 6,
          shadowOffsetY: 2
        },
        emphasis: {
          scale: true,
          focus: 'series',
          itemStyle: {
            color: dataType.color,
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: dataType.color
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        markLine: dataType.normalRange && dataType.normalRange[0] !== dataType.normalRange[1] ? {
          silent: true,
          lineStyle: {
            color: '#4CAF50',
            type: 'dashed',
            width: 2,
            opacity: 0.6
          },
          label: {
            show: true,
            position: 'end',
            fontSize: 8,
            color: '#4CAF50',
            fontWeight: 'normal',
            backgroundColor: 'transparent',
            borderWidth: 0,
            padding: 0
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
        filterMode: 'filter'
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


  formatDate(date) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  },



  // 禁用图表点击事件 - 数值已直接显示在图表上
  handleChartClick(x, y) {
    // 不再处理点击事件，数值已经直接显示在图表的每个数据点上
    return;
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
      path: '/pages/daily-record/index',
      imageUrl: res.fileList[0].tempFileURL
    }
  }
});
