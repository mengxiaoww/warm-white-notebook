Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object
    }
  },

  data: {
    chart: null,
    isTouch: false,
    touchData: {
      startX: 0,
      startY: 0,
      startTime: 0
    }
  },

  ready() {
    this.initReady = false;
    this.chart = null;

    // 滚动优化相关
    this.scrollTimeout = null;
    this.isScrolling = false;
    this.lastScrollTime = 0;

    // 滚动条拖动相关
    this.isDraggingScrollbar = false;
    this.scrollbarArea = null;

    if (!this.data.ec) {
      return;
    }

    // 预先测量canvas位置（iOS坐标修正）
    this.measureCanvasRect();

    // 移动端立即初始化，不延迟
    this.simpleInit();
  },

  attached() {
    this.initReady = false;
  },

  detached() {
    if (this.data.chart) {
      try {
        this.data.chart.dispose();
      } catch (e) {
      }
    }

    // 清理Canvas
    try {
      const ctx = wx.createCanvasContext(this.data.canvasId, this);
      ctx.clearRect(0, 0, 9999, 9999);
      ctx.draw();
    } catch (e) {
    }
  },

  methods: {
    // 测量canvas矩形，修正iOS坐标偏移
    measureCanvasRect() {
      try {
        const query = wx.createSelectorQuery().in(this);
        query.select('.ec-canvas').boundingClientRect((rect) => {
          if (rect) {
            this.canvasRect = rect; // {left, top, width, height}
          }
        }).exec();
      } catch (e) {
      }
    },

    // 优化的渲染方法，支持防抖和流畅滚动
    optimizedRender(chart) {
      if (!chart) return;

      const now = Date.now();

      // 限制渲染频率，防止过度渲染
      if (this.isScrolling && now - this.lastScrollTime < 16) {
        // 使用防抖，16ms约60fps
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
        }

        this.scrollTimeout = setTimeout(() => {
          chart.render();
          this.isScrolling = false;
        }, 16);

        return;
      }

      this.isScrolling = true;
      this.lastScrollTime = now;

      // 立即渲染
      chart.render();

      // 设置短暂延迟后允许下次渲染
      setTimeout(() => {
        this.isScrolling = false;
      }, 16);
    },


    // 简化的初始化方法 - 专为移动端设计
    simpleInit() {
      if (this.initReady) {
        return;
      }

      this.initReady = true;

      // 获取系统信息 - 使用新API
      const deviceInfo = wx.getDeviceInfo();
      const windowInfo = wx.getWindowInfo();
      const isMobile = deviceInfo.platform !== 'devtools';

      if (isMobile) {
        // 移动端：高度与CSS保持一致
        // 450rpx ≈ 225px，确保canvas高度不超过容器
        const baseHeight = 220; // 基础高度与CSS容器匹配
        const screenWidth = windowInfo.screenWidth || 375;
        const scaleFactor = Math.min(Math.max(screenWidth / 375, 0.8), 1.3); // 限制缩放范围
        const chartHeight = Math.min(Math.round(baseHeight * scaleFactor), 225); // 确保不超过CSS容器高度
        this.createChartDirect(screenWidth - 40, chartHeight);
      } else {
        // PC端：查询DOM尺寸
        this.queryCanvasSize();
      }
    },

    // 直接创建图表（移动端专用）
    createChartDirect(width, height) {

      try {
        // 使用传入的唯一canvasId
        const canvasId = this.properties.canvasId;

        // 移动端立即执行，不延迟
        const ctx = wx.createCanvasContext(canvasId, this);
        const windowInfo = wx.getWindowInfo();
        const dpr = windowInfo.pixelRatio;

        const canvas = {
          width: width,
          height: height,
          ctx: ctx,
          getContext: () => ctx,
          draw: () => ctx.draw(),
          setChart: (chart) => {
            this.setData({ chart: chart });
          }
        };

        if (this.data.ec && typeof this.data.ec.onInit === 'function') {
          setTimeout(() => {
            this.data.ec.onInit(canvas, width, height, dpr);
          }, 50); // 很短的延迟确保canvas准备就绪
        }

      } catch (error) {
      }
    },

    // PC端查询Canvas尺寸
    queryCanvasSize() {
      const query = wx.createSelectorQuery().in(this);

      query.select('.ec-canvas').boundingClientRect().exec((res) => {
        if (res && res[0] && res[0].width > 0 && res[0].height > 0) {
          const rect = res[0];
          this.createChartFromDOM(rect.width, rect.height);
        } else {
          this.createChartFromDOM(375, 225);
        }
      });
    },

    // 从DOM创建图表（PC端专用）
    createChartFromDOM(width, height) {
      try {
        const canvasId = this.properties.canvasId;

        const ctx = wx.createCanvasContext(canvasId, this);
        const windowInfo = wx.getWindowInfo();
        const dpr = windowInfo.pixelRatio;

        const canvas = {
          width: width,
          height: height,
          ctx: ctx,
          getContext: () => ctx,
          draw: () => ctx.draw(),
          setChart: (chart) => {
            this.setData({ chart: chart });
          }
        };

        if (this.data.ec && typeof this.data.ec.onInit === 'function') {
          this.data.ec.onInit(canvas, width, height, dpr);
        }
      } catch (error) {
      }
    },

    touchStart(e) {
      if (!this.data.chart) {
        return;
      }
      // 触摸开始时重新测量，避免切换后偏移
      this.measureCanvasRect();

      const touch = e.touches[0];
      // iOS 兼容：优先使用 touch.x/y；若不可用，退化为 clientX/clientY - canvas偏移
      const x = (typeof touch.x === 'number') ? touch.x : (touch.clientX - (this.canvasRect?.left || 0));
      const y = (typeof touch.y === 'number') ? touch.y : (touch.clientY - (this.canvasRect?.top || 0));

      this.setData({
        isTouch: true,
        'touchData.startX': x,
        'touchData.startY': y,
        'touchData.startTime': Date.now()
      });

      // 安全地触发ECharts事件
      this.triggerChartEvent('mousedown', { x, y });
    },

    touchMove(e) {
      if (!this.data.chart || !this.data.isTouch) return;

      const touch = e.touches[0];
      const x = (typeof touch.x === 'number') ? touch.x : (touch.clientX - (this.canvasRect?.left || 0));
      const y = (typeof touch.y === 'number') ? touch.y : (touch.clientY - (this.canvasRect?.top || 0));

      // 安全地触发ECharts滑动事件
      this.triggerChartEvent('mousemove', { x, y });
    },

    touchEnd(e) {
      if (!this.data.chart || !this.data.isTouch) return;

      const touch = e.changedTouches[0];
      const x = (typeof touch.x === 'number') ? touch.x : (touch.clientX - (this.canvasRect?.left || 0));
      const y = (typeof touch.y === 'number') ? touch.y : (touch.clientY - (this.canvasRect?.top || 0));

      const endTime = Date.now();
      const timeDiff = endTime - this.data.touchData.startTime;
      const distanceX = Math.abs(x - this.data.touchData.startX);
      const distanceY = Math.abs(y - this.data.touchData.startY);

      this.setData({ isTouch: false });

      // 触发触摸结束事件
      this.triggerChartEvent('mouseup', { x, y });

      // 判断是点击还是滑动

      if (timeDiff < 300 && distanceX < 15 && distanceY < 15) {
        // 短时间小距离移动，认为是点击
        setTimeout(() => {
          this.triggerChartEvent('click', { x, y });
        }, 30);
      } else {
        // 长时间或大距离移动，认为是滑动
      }
    },


    // 安全地触发Chart事件
    triggerChartEvent(eventType, coords) {
      if (!this.data.chart) {
        return;
      }

      try {

        // 检查Chart实例的可用方法
        const methods = [];
        try {
          const proto = Object.getPrototypeOf(this.data.chart);
          if (proto) {
            methods.push(...Object.getOwnPropertyNames(proto).filter(name => typeof this.data.chart[name] === 'function'));
          }
          methods.push(...Object.getOwnPropertyNames(this.data.chart).filter(name => typeof this.data.chart[name] === 'function'));
        } catch (e) {
        }


        // dataZoom滚动条交互
        if (eventType === 'mousedown') {
          this.startX = coords.x;
          this.startY = coords.y;
          this.lastMoveX = coords.x;

          // 检查是否点击在dataZoom区域
          const chart = this.data.chart;
          if (chart && chart.dataZoomArea) {
            // 优先命中滑块句柄区域，其次命中轨道区域
            const handle = chart.dataZoomHandleRect || chart.dataZoomArea;
            const track = chart.dataZoomTrackRect || chart.dataZoomArea;

            const hitHandle = handle && coords.x >= handle.x && coords.x <= handle.x + handle.width &&
              coords.y >= handle.y && coords.y <= handle.y + handle.height;
            const hitTrack = !hitHandle && track && coords.x >= track.x && coords.x <= track.x + track.width &&
              coords.y >= track.y && coords.y <= track.y + track.height;

            if (hitHandle || hitTrack) {
              this.isDraggingDataZoom = true;
              this.dataZoomStartX = coords.x;
              // 记录初始start/end，避免相对累积误差
              if (chart.option && chart.option.dataZoom) {
                const dz = chart.option.dataZoom[0] || {};
                this.originalDataZoom = { start: dz.start || 0, end: dz.end || 100 };
              }
            }
          }

        } else if (eventType === 'mousemove' && this.startX !== undefined) {
          if (this.isDraggingDataZoom) {
            const chart = this.data.chart;
            if (chart && chart.option && chart.option.dataZoom) {
              const deltaX = coords.x - this.dataZoomStartX;
              const area = chart.dataZoomTrackRect || chart.dataZoomArea;

              if (area && area.width > 0) {
                // 节流控制：防止过度渲染导致抖动
                const now = Date.now();
                if (this.lastRenderTime && (now - this.lastRenderTime) < 16) {
                  return; // 限制最高60fps
                }

                // 计算移动比例
                const moveRatio = deltaX / area.width;

                const base = this.originalDataZoom || { start: 0, end: 100 };
                const currentRange = base.end - base.start;
                let newStart = base.start + moveRatio * 100;
                let newEnd = base.end + moveRatio * 100;

                // 严格边界处理，防止抖动
                if (newStart <= 0) {
                  newStart = 0;
                  newEnd = currentRange;
                } else if (newEnd >= 100) {
                  newEnd = 100;
                  newStart = 100 - currentRange;
                }

                // 确保范围合理
                newStart = Math.max(0, Math.min(100 - currentRange, newStart));
                newEnd = Math.min(100, Math.max(currentRange, newEnd));

                // 只有值真正改变时才更新
                const currentStart = chart.option.dataZoom[0].start || 0;
                const currentEnd = chart.option.dataZoom[0].end || 100;
                if (Math.abs(newStart - currentStart) > 0.1 || Math.abs(newEnd - currentEnd) > 0.1) {
                  chart.option.dataZoom[0].start = newStart;
                  chart.option.dataZoom[0].end = newEnd;

                  // 立即渲染
                  chart.render();
                  this.lastRenderTime = now;
                }
              }
            }
          }
        } else if (eventType === 'mouseup') {
          // 重置状态
          this.startX = undefined;
          this.startY = undefined;
          this.lastMoveX = undefined;
          this.isDraggingDataZoom = false;
          this.dataZoomStartX = undefined;
          this.originalDataZoom = null;
          this.lastRenderTime = undefined; // 重置渲染时间戳
        }

        // 处理点击事件 - 直接调用页面方法
        if (eventType === 'click') {

          // 直接调用页面的显示方法
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          if (currentPage && typeof currentPage.handleChartClick === 'function') {
            currentPage.handleChartClick(coords.x, coords.y);
          } else {
          }
        }

      } catch (error) {
      }
    },

    tap(e) {
      if (!this.data.chart) return;

      const x = e.detail.x;
      const y = e.detail.y;

      // 处理点击事件
      this.triggerChartEvent('click', { x, y });
    }
  }
});