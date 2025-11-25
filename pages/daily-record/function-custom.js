// iOS风格功能项自定义模块
const functionCustomModule = {
  // 性能优化变量
  _lastUpdateTime: 0,
  _animationFrameId: null,
  _pendingUpdate: null,

  // 初始化功能项数据
  initCustomFunctions() {
    return [
      { id: 'medication', name: '用药记录', icon: 'candy', visible: true, order: 1 },
      { id: 'blood', name: '血常规', icon: 'blood-drop', visible: true, order: 2 },
      { id: 'clinic', name: '门诊记录', icon: 'hospital', visible: true, order: 3 },
      { id: 'checkReport', name: '检查报告', icon: 'assignment', visible: true, order: 4 },
      { id: 'liver', name: '肝功能', icon: 'liver', visible: true, order: 5 },
      { id: 'kidney', name: '肾功能', icon: 'filter', visible: true, order: 6 },
      { id: 'ldh', name: '乳酸脱氢酶', icon: 'enzyme', visible: true, order: 7 },
      { id: 'ebv', name: 'EB病毒', icon: 'zoom-in', visible: true, order: 8 },
      { id: 'cmv', name: '巨细胞病毒', icon: 'search', visible: true, order: 9 },
      { id: 'bloodSugar', name: '血糖', icon: 'glucose', visible: true, order: 10 },
      { id: 'bloodOxygen', name: '血氧', icon: 'oxygen', visible: true, order: 11 },
      { id: 'urine', name: '尿量记录', icon: 'fill-color-1', visible: true, order: 12 },
      { id: 'stool', name: '排便记录', icon: 'layers', visible: true, order: 13 },
      { id: 'expense', name: '费用记录', icon: 'wallet', visible: true, order: 14 }
    ]
  },

  // 处理长按开始拖拽
  handleLongPress(e, currentList) {
    const index = parseInt(e.currentTarget.dataset.index)
    wx.vibrateShort({ type: 'medium' })

    // 重置性能优化变量
    this._lastUpdateTime = Date.now()
    this._pendingUpdate = null

    const updatedList = currentList.map((item, i) => ({
      ...item,
      isDragging: i === index
    }))

    return {
      customFunctionList: updatedList,
      isDragging: true,
      dragStartIndex: index,
      dragStartY: e.touches[0].clientY,
      dropLineIndex: -1,
      lastTargetIndex: index // 新增：记录上次目标位置
    }
  },

  // 处理拖拽移动 - 优化性能和流畅度
  handleTouchMove(e, state) {
    if (!state.isDragging || state.dragStartIndex === -1) return null

    const touch = e.touches[0]
    const deltaY = (touch.clientY - state.dragStartY) * 2 // rpx转换
    const itemHeight = 120 // 实际单项高度(112rpx + 8rpx margin)

    // 计算目标插入位置 - 使用更平滑的计算方式
    const rawTargetIndex = state.dragStartIndex + deltaY / itemHeight
    let targetIndex = Math.round(rawTargetIndex)
    targetIndex = Math.max(0, Math.min(targetIndex, state.customFunctionList.length - 1))

    // 节流：限制更新频率为 16ms (60fps)
    const now = Date.now()
    const timeSinceLastUpdate = now - this._lastUpdateTime

    if (timeSinceLastUpdate < 16) {
      // 保存待处理的更新
      this._pendingUpdate = { touch, deltaY, targetIndex }
      return null
    }

    this._lastUpdateTime = now

    // 当横线位置发生变化时，触发震动反馈
    const currentDropIndex = targetIndex !== state.dragStartIndex ? targetIndex : -1
    const lastTargetIndex = state.lastTargetIndex !== undefined ? state.lastTargetIndex : state.dragStartIndex

    // 只在跨过一个完整的item时震动，避免频繁震动
    if (currentDropIndex !== -1 && targetIndex !== lastTargetIndex) {
      wx.vibrateShort({ type: 'light' })
    }

    // 更新拖拽项的位置 - 使用更平滑的动画
    const updatedList = state.customFunctionList.map((item, index) => {
      if (index === state.dragStartIndex) {
        return { ...item, translateY: deltaY }
      }
      return item
    })

    return {
      customFunctionList: updatedList,
      dropLineIndex: currentDropIndex,
      lastTargetIndex: targetIndex
    }
  },

  // 处理拖拽结束
  handleTouchEnd(state) {
    if (!state.isDragging) return null

    // 清理性能优化变量
    this._pendingUpdate = null
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }

    let newList = [...state.customFunctionList]

    // 执行重排
    if (state.dropLineIndex >= 0 && state.dropLineIndex !== state.dragStartIndex) {
      const dragItem = newList.splice(state.dragStartIndex, 1)[0]
      const insertIndex = state.dropLineIndex > state.dragStartIndex
        ? state.dropLineIndex - 1
        : state.dropLineIndex
      newList.splice(insertIndex, 0, dragItem)
      wx.vibrateShort({ type: 'medium' })
    }

    // 重置所有状态
    newList = newList.map((item, index) => ({
      ...item,
      order: index + 1,
      isDragging: false,
      translateY: 0
    }))

    return {
      customFunctionList: newList,
      isDragging: false,
      dragStartIndex: -1,
      dropLineIndex: -1,
      dragStartY: 0,
      lastTargetIndex: -1
    }
  },

  // 切换功能项显示状态
  toggleItemVisible(itemId, currentList) {
    return currentList.map(item => {
      if (item.id === itemId) {
        return { ...item, visible: !item.visible }
      }
      return item
    })
  }
}

module.exports = functionCustomModule
