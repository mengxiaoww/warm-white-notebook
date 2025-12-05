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
        console.error('❌ 图表销毁失败:', e);
      }
    }
  },

  methods: {
    // 测量canvas矩形，修正iOS坐标偏移
    measureCanvasRect() {
      try {
        const query = wx.createSelectorQuery().in(this);
        query.select(`#${this.properties.canvasId}`).boundingClientRect((rect) => {
          if (rect) {
            this.canvasRect = rect; // {left, top, width, height}
          }
        }).exec();
      } catch (e) {
        console.error('❌ 测量Canvas矩形失败:', e);
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

    // 直接创建图表（移动端专用）- 使用Canvas 2D API
    createChartDirect(width, height) {
      try {
        const canvasId = this.properties.canvasId;
        const query = wx.createSelectorQuery().in(this);

        query.select(`#${canvasId}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !res[0].node) {
              console.error('❌ Canvas 2D节点获取失败');
              return;
            }

            const canvasNode = res[0].node;
            const windowInfo = wx.getWindowInfo();
            const dpr = windowInfo.pixelRatio;

            // 设置Canvas实际渲染尺寸（物理像素）
            canvasNode.width = width * dpr;
            canvasNode.height = height * dpr;

            const ctx = canvasNode.getContext('2d');

            // 缩放上下文以匹配设备像素比
            ctx.scale(dpr, dpr);

            // 创建Canvas对象，兼容ECharts和Canvas 2D
            const canvas = {
              width: width,
              height: height,
              ctx: ctx, // 直接提供ctx属性，避免重复调用getContext
              getContext: () => ctx,
              setChart: (chart) => {
                this.setData({ chart: chart });
              },
              draw: () => {} // Canvas 2D自动渲染，提供空方法保持兼容
            };

            // 为Canvas添加必要的属性和方法（但不覆盖已定义的）
            Object.keys(canvasNode).forEach(key => {
              if (!(key in canvas)) {
                canvas[key] = canvasNode[key];
              }
            });

            if (this.data.ec && typeof this.data.ec.onInit === 'function') {
              setTimeout(() => {
                this.data.ec.onInit(canvas, width, height, dpr);
              }, 50);
            }
          });
      } catch (error) {
        console.error('❌ createChartDirect错误:', error);
      }
    },

    // PC端查询Canvas尺寸
    queryCanvasSize() {
      const query = wx.createSelectorQuery().in(this);

      query.select(`#${this.properties.canvasId}`).boundingClientRect().exec((res) => {
        if (res && res[0] && res[0].width > 0 && res[0].height > 0) {
          const rect = res[0];
          this.createChartFromDOM(rect.width, rect.height);
        } else {
          this.createChartFromDOM(375, 225);
        }
      });
    },

    // 从DOM创建图表（PC端专用）- 使用Canvas 2D API
    createChartFromDOM(width, height) {
      try {
        const canvasId = this.properties.canvasId;
        const query = wx.createSelectorQuery().in(this);

        query.select(`#${canvasId}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !res[0].node) {
              console.error('❌ Canvas 2D节点获取失败');
              return;
            }

            const canvasNode = res[0].node;
            const windowInfo = wx.getWindowInfo();
            const dpr = windowInfo.pixelRatio;

            // 设置Canvas实际渲染尺寸（物理像素）
            canvasNode.width = width * dpr;
            canvasNode.height = height * dpr;

            const ctx = canvasNode.getContext('2d');

            // 缩放上下文以匹配设备像素比
            ctx.scale(dpr, dpr);

            // 创建Canvas对象，兼容ECharts和Canvas 2D
            const canvas = {
              width: width,
              height: height,
              ctx: ctx, // 直接提供ctx属性，避免重复调用getContext
              getContext: () => ctx,
              setChart: (chart) => {
                this.setData({ chart: chart });
              },
              draw: () => {} // Canvas 2D自动渲染，提供空方法保持兼容
            };

            // 为Canvas添加必要的属性和方法（但不覆盖已定义的）
            Object.keys(canvasNode).forEach(key => {
              if (!(key in canvas)) {
                canvas[key] = canvasNode[key];
              }
            });

            if (this.data.ec && typeof this.data.ec.onInit === 'function') {
              this.data.ec.onInit(canvas, width, height, dpr);
            }
          });
      } catch (error) {
        console.error('❌ createChartFromDOM错误:', error);
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

      // 触发ECharts原生事件
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
        const chart = this.data.chart;

        // 🎯 使用 ECharts 原生事件分发系统
        if (chart._zr && chart._zr.handler) {
          const zrHandler = chart._zr.handler;

          // 构造标准的 ZRender 事件对象
          const zrEvent = {
            type: eventType,
            zrX: coords.x,
            zrY: coords.y,
            offsetX: coords.x,
            offsetY: coords.y,
            event: {
              type: eventType,
              preventDefault: () => {},
              stopPropagation: () => {}
            },
            target: null,
            topTarget: null,
            cancelBubble: false,
            offsetX: coords.x,
            offsetY: coords.y,
            gestureEvent: null,
            pinchX: coords.x,
            pinchY: coords.y,
            pinchScale: 1,
            wheelDelta: 0
          };

          // 根据事件类型触发对应的 ZRender 处理器
          try {
            if (eventType === 'mousedown' && zrHandler.mousedown) {
              zrHandler.mousedown(zrEvent);
            } else if (eventType === 'mousemove' && zrHandler.mousemove) {
              zrHandler.mousemove(zrEvent);
            } else if (eventType === 'mouseup' && zrHandler.mouseup) {
              zrHandler.mouseup(zrEvent);
            } else if (eventType === 'click' && zrHandler.click) {
              zrHandler.click(zrEvent);
            }
          } catch (e) {
            console.warn('ZRender事件处理失败:', e);
          }
        }

        // 处理点击事件 - 直接调用页面方法（保留原有逻辑）
        if (eventType === 'click') {
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          if (currentPage && typeof currentPage.handleChartClick === 'function') {
            currentPage.handleChartClick(coords.x, coords.y);
          }
        }

      } catch (error) {
        console.warn('Chart事件触发失败:', error);
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