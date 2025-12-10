Page({
  data: {
    url: ''
  },

  onLoad(options) {
    // 从参数中获取URL
    if (options.url) {
      const url = decodeURIComponent(options.url)
      console.log('打开网页:', url)
      this.setData({ url })
    } else {
      wx.showToast({
        title: '缺少URL参数',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onWebViewLoad(e) {
    console.log('WebView加载成功:', e)
  },

  onWebViewError(e) {
    console.error('WebView加载失败:', e)
    wx.showToast({
      title: '页面加载失败',
      icon: 'none'
    })
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
})
