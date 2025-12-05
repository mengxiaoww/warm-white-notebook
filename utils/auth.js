// 认证相关工具方法

/**
 * 检查登录状态并获取 openid
 * @returns {string|false} 返回 openid 或 false
 */
function getOpenIdIfLoggedIn() {
  const app = getApp()
  return app.getOpenIdIfLoggedIn()
}

/**
 * 处理需要登录的操作
 * @param {Function} successCallback 登录成功的回调
 * @param {Function} failCallback 登录失败的回调
 * @returns {string|false} 如果已登录返回 openid，否则返回 false
 */
function handleNeedLogin(successCallback, failCallback) {
  const app = getApp()
  const openid = app.getOpenIdIfLoggedIn()

  if (openid) {
    return openid
  }

  // 未登录，通过 app 的方法处理登录
  app.checkLogin().then(openid => {

    wx.showToast({
      title: '登录成功',
      icon: 'success'
    })
    if (successCallback) {
      successCallback(openid)
    }
  }).catch(err => {

    if (err.message !== '用户取消登录') {
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      })
    }
    if (failCallback) {
      failCallback(err)
    }
  })

  return false
}

/**
 * 页面混入对象，包含通用的登录检查方法
 */
const authMixin = {
  // 检查登录状态并获取 openid
  getOpenIdIfLoggedIn() {
    return getOpenIdIfLoggedIn()
  },

  // 处理需要登录的操作
  handleNeedLogin(successCallback, failCallback) {
    return handleNeedLogin(successCallback, failCallback)
  },

  // 检查登录状态并加载数据的通用方法
  checkLoginAndLoadData(loadDataFunction) {
    const openid = this.getOpenIdIfLoggedIn()



    if (openid) {
      this.setData({ isLoggedIn: true })
      if (loadDataFunction) {
        loadDataFunction(openid)
      }
    } else {

      this.setData({
        isLoggedIn: false
      })
    }
  }
}

module.exports = {
  getOpenIdIfLoggedIn,
  handleNeedLogin,
  authMixin
}
