// 简化的图表绘制实现

class SimpleChart {
  constructor(canvas, options = {}) {

    this.canvas = canvas;
    this.ctx = canvas.ctx || canvas.getContext('2d');

    // 优先使用options中的尺寸（echarts.init传入的），其次使用canvas属性
    this.width = options.width || canvas.width || 300;

    // iOS系统检测和高度适配
    let defaultHeight = 400;
    try {
      const systemInfo = wx.getSystemInfoSync();
      const isIOS = systemInfo.system && systemInfo.system.toLowerCase().indexOf('ios') > -1;
      defaultHeight = isIOS ? 350 : 400; // iOS使用更小的默认高度
    } catch (e) {
      // 如果获取系统信息失败，使用默认值
    }

    this.height = options.height || canvas.height || defaultHeight;
    this.dpr = options.devicePixelRatio || 1;
    this.option = {};

    // 滚动相关状态
    this.maxScrollX = 0; // 最大滚动距离
    this.dataPointWidth = 30; // 每个数据点占用的宽度
    this.visibleDataCount = 0; // 可见数据点数量
    this.needsScrollbar = false; // 是否需要显示滚动条

    // 空状态动画 ID
    this.noDataAnimationId = null;

  }

  setOption(option) {
    this.option = option;
    this.lastOption = null; // 清除缓存

    setTimeout(() => {
      this.render();
    }, 100);
  }

  render() {
    if (!this.ctx) {
      return;
    }

    try {
      // 清空画布并设置白色背景
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.width, this.height);

      // 绘制图表
      this.drawChart();

      // 立即绘制到Canvas，不使用延迟 - iOS优化
      if (this.canvas.draw) {
        this.canvas.draw(true); // 使用同步绘制
      }

    } catch (error) {
      // 静默处理错误
    }
  }

  drawChart() {
    const series = this.option.series?.[0];
    if (!series || !series.data || series.data.length === 0) {
      this.drawNoData();
      return;
    }

    // 计算绘图区域 - 为X轴标签和滚动条预留更多空间
    const topPadding = 40;
    const bottomPadding = 60; // 为X轴标签预留空间
    const sidePadding = 50;   // 恢复合理的左右空间

    const chartArea = {
      x: sidePadding,
      y: topPadding,
      width: this.width - sidePadding * 2,
      height: this.height - topPadding - bottomPadding
    };

    // 计算滚动相关参数
    this.calculateScrollParams(series.data, chartArea);

    // 绘制坐标轴
    this.drawAxis(chartArea);

    // 绘制折线
    this.drawLine(series, chartArea);

    // 绘制阈值线
    this.drawThresholdLines(chartArea);

    // 绘制dataZoom滚动条（如果配置了）
    if (this.option.dataZoom && this.option.dataZoom.length > 0) {
      this.drawDataZoom(chartArea);
    }
  }

  // 简化：禁用滚动功能，直接显示所有数据
  calculateScrollParams(data, chartArea) {
    // 暂时禁用滚动条功能，确保图表正常显示
    this.needsScrollbar = false;
    this.scrollX = 0;
    this.maxScrollX = 0;
    this.dataPointWidth = 50;
    this.visibleDataCount = data.length;
  }

  // 绘制滚动条
  drawScrollbar(chartArea) {
    if (!this.needsScrollbar) return;

    const ctx = this.ctx;
    const scrollbarHeight = 8; // 增加高度，便于拖动
    const scrollbarY = chartArea.y + chartArea.height + 48; // 调整位置
    const scrollbarX = chartArea.x;
    const scrollbarWidth = chartArea.width;

    // 记录滚动条区域供触摸检测使用
    this.scrollbarArea = {
      x: scrollbarX,
      y: scrollbarY,
      width: scrollbarWidth,
      height: scrollbarHeight
    };


    ctx.save();

    // 绘制滚动条背景（圆角）
    ctx.fillStyle = '#E5E5E5';
    this.roundRect(ctx, scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight, scrollbarHeight / 2);
    ctx.fill();

    // 计算滑块位置和大小（与ec-canvas.js完全一致的逻辑）
    const totalData = this.option.series[0].data.length;
    const thumbWidth = Math.max(24, (this.visibleDataCount / totalData) * scrollbarWidth);

    // 使用简单的百分比计算，确保与calculateScrollFromScrollbarPosition完全一致
    let thumbProgress = 0;
    if (this.maxScrollX > 0) {
      thumbProgress = this.scrollX / this.maxScrollX;
      // 严格限制在0-1范围内，彻底避免边界问题
      thumbProgress = Math.max(0, Math.min(1, thumbProgress));
    }

    // 使用正确的滑块位置计算
    const thumbX = scrollbarX + thumbProgress * (scrollbarWidth - thumbWidth);


    // 绘制滑块（圆角，带阴影）
    ctx.fillStyle = '#FFB84D';
    ctx.shadowColor = 'rgba(255, 184, 77, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    this.roundRect(ctx, thumbX, scrollbarY, thumbWidth, scrollbarHeight, scrollbarHeight / 2);
    ctx.fill();

    ctx.restore();
  }

  drawAxis(area) {
    const ctx = this.ctx;
    const dataType = this.option.dataType || {};
    const themeColor = dataType.color || '#FFB84D'; // 统一淡雅橘黄色主题

    // 绘制X轴
    ctx.beginPath();
    ctx.strokeStyle = '#E0E0E0'; // 轴线用浅灰色
    ctx.lineWidth = 1;
    ctx.moveTo(area.x, area.y + area.height);
    ctx.lineTo(area.x + area.width, area.y + area.height);
    ctx.stroke();

    // 绘制Y轴
    ctx.beginPath();
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x, area.y + area.height);
    ctx.stroke();

    // 绘制网格线 - 与Y轴标签完全对齐
    ctx.strokeStyle = '#F5F5F5'; // 更淡的网格线
    ctx.lineWidth = 1;

    // 绘制4条网格线：顶部边界+中间3条（i=0,1,2,3）
    // 跳过i=4因为它与X轴重合，改为绘制顶部边界使总共有4条可见横线
    for (let i = 0; i <= 3; i++) {
      const y = area.y + (area.height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }
  }

  drawLine(series, area) {
    const ctx = this.ctx;
    const data = series.data;
    const dataType = this.option.dataType || {};
    const themeColor = '#FFB84D'; // 强制使用淡雅橘黄色主题


    if (data.length === 0) return;

    // 计算数据范围
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // 根据dataZoom配置计算可见数据
    let visibleData, points;
    let startIndex = 0;
    let endIndex = data.length;

    // 检查是否有dataZoom配置
    if (this.option.dataZoom && this.option.dataZoom.length > 0) {
      const dataZoom = this.option.dataZoom[0];
      const start = dataZoom.start || 0;
      const end = dataZoom.end || 100;

      startIndex = Math.floor((start / 100) * data.length);
      endIndex = Math.ceil((end / 100) * data.length);
      endIndex = Math.min(endIndex, data.length);

      visibleData = data.slice(startIndex, endIndex);
    } else {
      visibleData = data;
    }

    // 生成点位置 - 给第一个数据点留出适当间距，避免标签挡住Y轴
    points = visibleData.map((value, index) => {
      const actualIndex = startIndex + index;
      // 第一个数据点从合理位置开始，其他数据点均匀分布
      const startOffset = 0.06; // 前6%留空，刚好避免标签遮挡Y轴
      const availableWidth = 1 - startOffset; // 可用宽度94%
      let x;
      if (visibleData.length === 1) {
        // 单个数据点显示在和多个数据点第一个位置相同的地方
        x = area.x + startOffset * area.width;
      } else {
        x = area.x + (startOffset + (index / (visibleData.length - 1)) * availableWidth) * area.width;
      }
      const y = area.y + area.height - ((value - min) / range) * area.height;
      return { x, y, value, originalIndex: actualIndex };
    });

    // 绘制区域填充 - 支持平滑曲线
    if (series.areaStyle) {
      const smooth = series.smooth;

      ctx.beginPath();
      ctx.moveTo(points[0].x, area.y + area.height);
      ctx.lineTo(points[0].x, points[0].y);

      if (smooth && points.length > 2) {
        // 使用贝塞尔曲线绘制平滑填充
        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];

          if (i === 0) {
            const controlX = current.x + (next.x - current.x) * 0.5;
            const controlY = current.y + (next.y - current.y) * 0.5;
            ctx.quadraticCurveTo(controlX, controlY, next.x, next.y);
          } else {
            const prev = points[i - 1];
            const smoothness = typeof smooth === 'number' ? smooth : 0.4;

            const cp1x = current.x + (next.x - prev.x) * smoothness * 0.5;
            const cp1y = current.y + (next.y - prev.y) * smoothness * 0.5;
            const cp2x = next.x - (points[Math.min(i + 2, points.length - 1)].x - current.x) * smoothness * 0.5;
            const cp2y = next.y - (points[Math.min(i + 2, points.length - 1)].y - current.y) * smoothness * 0.5;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
          }
        }
      } else {
        // 直线连接
        points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
      }

      ctx.lineTo(points[points.length - 1].x, area.y + area.height);
      ctx.closePath();

      // 使用橘黄色的半透明填充 - 转换为rgba格式
      const rgbaColor = this.hexToRgba(themeColor, 0.25);
      ctx.fillStyle = rgbaColor;
      ctx.fill();
    }

    // 绘制折线 - 支持平滑曲线
    if (points.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round'; // 圆角端点
      ctx.lineJoin = 'round'; // 圆角连接

      // 检查是否启用平滑曲线
      const smooth = series.smooth;

      if (smooth && points.length > 2) {
        // 使用贝塞尔曲线绘制平滑曲线
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];

          if (i === 0) {
            // 第一段：使用二次贝塞尔曲线
            const controlX = current.x + (next.x - current.x) * 0.5;
            const controlY = current.y + (next.y - current.y) * 0.5;
            ctx.quadraticCurveTo(controlX, controlY, next.x, next.y);
          } else {
            // 中间段：使用三次贝塞尔曲线实现更平滑的效果
            const prev = points[i - 1];
            const smoothness = typeof smooth === 'number' ? smooth : 0.4;

            // 计算控制点
            const cp1x = current.x + (next.x - prev.x) * smoothness * 0.5;
            const cp1y = current.y + (next.y - prev.y) * smoothness * 0.5;
            const cp2x = next.x - (points[Math.min(i + 2, points.length - 1)].x - current.x) * smoothness * 0.5;
            const cp2y = next.y - (points[Math.min(i + 2, points.length - 1)].y - current.y) * smoothness * 0.5;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
          }
        }
      } else {
        // 直线连接
        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
      }

      ctx.stroke();
    }

    // 绘制数据点
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = themeColor;
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 绘制标签
    this.drawLabels(points, area, { min, max });

    // 绘制数据点数值标签
    this.drawDataLabels(points, series);
  }

  drawLabels(points, area, { min, max }) {
    const ctx = this.ctx;

    ctx.save(); // 保存上下文状态

    // Y轴标签 - 使用智能格式化
    ctx.fillStyle = '#666';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const value = min + (max - min) * (4 - i) / 4;
      const y = area.y + (area.height / 4) * i;
      ctx.fillText(this.formatNumber(value), area.x - 10, y);
    }

    // X轴标签 - 支持滚动显示
    const xAxis = this.option.xAxis || {};
    const allDates = xAxis.data || [];


    if (allDates.length > 0 && points.length > 0) {
      // 重新设置文字样式，确保iOS兼容
      ctx.fillStyle = '#666';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 为每个数据点显示对应的日期标签，确保一一对应
      points.forEach((point, index) => {
        // 获取对应的日期标签（使用originalIndex确保正确映射）
        const dateIndex = point.originalIndex !== undefined ? point.originalIndex : index;
        const dateLabel = allDates[dateIndex];

        if (dateLabel && point.x >= area.x && point.x <= area.x + area.width) {
          const labelY = area.y + area.height + 15; // 增加距离避免被遮挡

          // 确保绘制在Canvas范围内
          if (labelY < this.height - 5) {
            // 每个数据点都显示日期标签，不做筛选
            ctx.fillText(dateLabel, point.x, labelY);
          }
        }
      });
    }

    ctx.restore(); // 恢复上下文状态
  }

  drawDataLabels(points, series) {
    const ctx = this.ctx;

    // 检查是否需要显示数据点标签
    const label = series.label;
    if (!label || (label.normal && !label.normal.show) || (!label.normal && !label.show)) {
      return;
    }

    ctx.save();

    // 设置标签样式 - 只绘制文字，无背景
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#333';

    // 确保无阴影和背景
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    points.forEach(point => {
      // 使用智能格式化显示数值
      const value = this.formatNumber(point.value);

      // 计算标签位置（所有标签都在数据点上方）
      const labelX = point.x;
      const labelY = point.y - 18;

      // 直接绘制文字，不绘制任何背景
      ctx.fillText(value, labelX, labelY);
    });

    ctx.restore();
  }

  // 绘制dataZoom滚动条 - iOS兼容版本
  drawDataZoom(chartArea) {
    if (!this.option.dataZoom || this.option.dataZoom.length === 0) return;

    const dataZoom = this.option.dataZoom[0];
    const data = this.option.series[0].data;

    if (!data || data.length <= 5) return;

    // 检查是否需要滚动条：如果显示范围接近100%就隐藏
    const startPercent = dataZoom.start || 0;
    const endPercent = dataZoom.end || 100;
    const displayRange = endPercent - startPercent;

    // 如果显示范围超过95%，认为不需要滚动条
    if (displayRange >= 95) {
      return; // 隐藏滚动条
    }

    const ctx = this.ctx;
    const height = 12; // 适中的高度，确保iOS可见
    // 基于chartArea计算，与X轴保持合理距离
    const desiredGap = 35; // 与X轴标签保持充足间距，约10rpx
    let y = chartArea.y + chartArea.height + desiredGap;
    // 防止超出canvas底部
    if (y + height > this.height - 6) {
      y = this.height - height - 6;
    }
    const x = chartArea.x + 15;
    const width = chartArea.width - 30;

    // 扩大触摸区域，确保拖拽灵敏
    this.dataZoomArea = { x: x - 15, y: y - 10, width: width + 30, height: height + 20 };
    // 记录精确的轨道区域与滑块区域，供交互命中计算
    this.dataZoomTrackRect = { x, y, width, height };

    ctx.save();

    // 清除所有特效，确保iOS兼容
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 绘制背景轨道 - 使用兼容的圆角方法
    ctx.fillStyle = '#E0E0E0';
    this.roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();

    // 计算滑块位置和大小
    const start = dataZoom.start || 0;
    const end = dataZoom.end || 100;
    const startPos = x + (start / 100) * width;
    const endPos = x + (end / 100) * width;
    const sliderWidth = Math.max(40, endPos - startPos);
    this.dataZoomHandleRect = { x: startPos, y, width: sliderWidth, height };

    // 绘制滑块主体 - 使用实心橘色，不用渐变
    ctx.fillStyle = '#FFB84D';
    this.roundRect(ctx, startPos, y, sliderWidth, height, height / 2);
    ctx.fill();

    // 绘制滑块边框
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2;
    this.roundRect(ctx, startPos, y, sliderWidth, height, height / 2);
    ctx.stroke();

    // 绘制拖拽指示器 - 使用简单的竖线
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const centerX = startPos + sliderWidth / 2;
    const lineHeight = height * 0.4;
    const lineTop = y + (height - lineHeight) / 2;

    // 绘制3条竖线
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX + i * 4, lineTop);
      ctx.lineTo(centerX + i * 4, lineTop + lineHeight);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 辅助方法：绘制圆角矩形
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  // 辅助方法：智能格式化数字 - 整数不显示小数点
  formatNumber(value, decimals = 1) {
    if (value == null || isNaN(value)) return '';

    const num = Number(value);
    // 如果是整数，直接返回整数
    if (Number.isInteger(num)) {
      return num.toString();
    }
    // 如果有小数，保留指定位数
    return num.toFixed(decimals);
  }

  // 辅助方法：将十六进制颜色转换为rgba格式
  hexToRgba(hex, alpha = 1) {
    // 移除#号
    hex = hex.replace('#', '');

    // 将3位颜色扩展为6位
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // 解析RGB值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  drawNoData() {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();

    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#FFFBF5');
    gradient.addColorStop(1, '#FFF8F0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 绘制多层装饰曲线（模拟呼吸动画效果）
    const time = Date.now() / 1000; // 当前时间（秒）

    // 绘制3层椭圆曲线，每层有不同的相位和尺寸
    const curves = [
      { width: 200, height: 100, phase: 0, opacity: 0.15 },
      { width: 150, height: 75, phase: 0.5, opacity: 0.12 },
      { width: 100, height: 50, phase: 1.0, opacity: 0.1 }
    ];

    curves.forEach(curve => {
      // 计算呼吸效果（使用正弦波，周期3秒）
      const breathPhase = (time + curve.phase) % 3 / 3; // 0-1循环
      const breathScale = 0.95 + 0.1 * Math.sin(breathPhase * Math.PI * 2); // 0.95-1.05
      const breathOpacity = curve.opacity * (0.5 + 0.5 * Math.sin(breathPhase * Math.PI * 2)); // 呼吸透明度

      ctx.strokeStyle = `rgba(255, 184, 77, ${breathOpacity})`;
      ctx.lineWidth = 1.5;

      // 使用 save/restore + scale 绘制椭圆（兼容性更好）
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(curve.width * breathScale / 50, curve.height * breathScale / 50);
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, 2 * Math.PI);
      ctx.restore();
      ctx.stroke();
    });

    // 绘制图表图标（chart-line 风格）
    ctx.strokeStyle = 'rgba(255, 184, 77, 0.6)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 绘制简化的曲线图标
    const iconSize = 50;
    const startX = centerX - iconSize;
    const startY = centerY - 15;

    ctx.beginPath();
    ctx.moveTo(startX, startY + 15);
    ctx.quadraticCurveTo(startX + iconSize / 3, startY - 8, startX + iconSize * 2 / 3, startY + 8);
    ctx.quadraticCurveTo(startX + iconSize, startY + 25, startX + iconSize * 2, startY);
    ctx.stroke();

    // 绘制数据点
    ctx.fillStyle = '#FFB84D';
    [startX, startX + iconSize * 2 / 3, startX + iconSize * 2].forEach((x, i) => {
      const y = i === 0 ? startY + 15 : (i === 1 ? startY + 8 : startY);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 绘制文字
    ctx.fillStyle = '#FFB84D';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂无数据', centerX, centerY + 45);

    // 绘制提示文字
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('记录数据后，这里将显示趋势图表', centerX, centerY + 68);

    ctx.restore();

    // 启动动画循环（仅在有数据时停止）
    if (!this.noDataAnimationId && this.canvas.draw) {
      const animate = () => {
        // 检查是否还是无数据状态
        const series = this.option.series?.[0];
        if (!series || !series.data || series.data.length === 0) {
          this.drawNoData();
          this.canvas.draw(true);
          this.noDataAnimationId = setTimeout(animate, 100); // 10fps 动画
        } else {
          this.noDataAnimationId = null;
        }
      };
      this.noDataAnimationId = setTimeout(animate, 100);
    }
  }

  // 模拟事件方法
  on(event, handler) {

  }

  dispatchAction(action) {

  }

  // 绘制阈值线
  drawThresholdLines(chartArea) {
    const series = this.option.series?.[0];
    if (!series || !series.data || series.data.length === 0) {
      return;
    }

    // 从配置中获取阈值范围（通过markLine配置传递）
    const markLine = series.markLine;
    if (!markLine || !markLine.data || markLine.data.length !== 2) {
      return;
    }

    const lowerLimit = markLine.data[0].yAxis;
    const upperLimit = markLine.data[1].yAxis;

    if (lowerLimit === upperLimit) {
      return;
    }

    // 计算Y轴范围
    const dataValues = series.data;
    const dataMin = Math.min(...dataValues);
    const dataMax = Math.max(...dataValues);
    const yMin = Math.min(dataMin, lowerLimit) * 0.9;
    const yMax = Math.max(dataMax, upperLimit) * 1.1;
    const yRange = yMax - yMin;

    // 计算阈值线的Y坐标
    const lowerY = chartArea.y + chartArea.height - ((lowerLimit - yMin) / yRange) * chartArea.height;
    const upperY = chartArea.y + chartArea.height - ((upperLimit - yMin) / yRange) * chartArea.height;

    const ctx = this.ctx;
    ctx.save();

    // 绘制安全范围背景
    ctx.fillStyle = 'rgba(76, 175, 80, 0.08)';
    ctx.fillRect(chartArea.x, upperY, chartArea.width, lowerY - upperY);

    // 绘制下限线（蓝色虚线）
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(chartArea.x, lowerY);
    ctx.lineTo(chartArea.x + chartArea.width, lowerY);
    ctx.stroke();

    // 绘制下限标签
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2196F3';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${lowerLimit}`, chartArea.x - 5, lowerY + 4);

    // 绘制上限线（红色虚线）
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(chartArea.x, upperY);
    ctx.lineTo(chartArea.x + chartArea.width, upperY);
    ctx.stroke();

    // 绘制上限标签
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FF5722';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${upperLimit}`, chartArea.x - 5, upperY + 4);

    ctx.restore();
  }

  resize() {

    this.render();
  }

  dispose() {

  }

  getZr() {
    return {
      handler: {
        dispatch: () => { }
      }
    };
  }
}

// 导出初始化函数
function init(canvas, theme, options) {
  return new SimpleChart(canvas, options);
}

function setCanvasCreator() {

}

export { init, setCanvasCreator };
export default { init, setCanvasCreator };