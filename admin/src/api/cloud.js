import tcb from '@cloudbase/js-sdk'

// 云开发环境配置
const ENV_ID = 'cloud1-9gzf2w8c9c9b7b73'

// 初始化云开发
const app = tcb.init({
  env: ENV_ID
})

// 导出 app 实例供其他模块使用
export { app }

// 登录状态
let isLoggedIn = false
let loginPromise = null

// 确保已登录（使用匿名登录）
async function ensureAuth() {
  if (isLoggedIn) return

  if (!loginPromise) {
    loginPromise = (async () => {
      try {
        const auth = app.auth({ persistence: 'local' })

        // 检查当前登录状态
        const loginState = await auth.getLoginState()

        if (loginState) {
          console.log('✅ 已登录云开发')
          isLoggedIn = true
          return
        }

        // 匿名登录 - 使用正确的 API
        await auth.signInAnonymously()
        console.log('✅ 云开发匿名登录成功')
        isLoggedIn = true
      } catch (error) {
        console.error('❌ 云开发登录失败:', error)
        throw new Error('云开发登录失败，请检查是否开启了匿名登录')
      }
    })()
  }

  return loginPromise
}

// 调用云函数
async function callCloudFunction(name, data = {}) {
  try {
    // 确保已登录
    await ensureAuth()

    console.log(`📞 调用云函数: ${name}`, data)

    // 调用云函数
    const res = await app.callFunction({
      name,
      data
    })

    console.log(`✅ 云函数返回:`, res.result)
    return res.result
  } catch (error) {
    console.error(`❌ 云函数调用失败 (${name}):`, error)
    throw error
  }
}

// 管理员登录
export function adminLogin(username, password) {
  return callCloudFunction('adminLogin', { username, password })
}

// 获取用户列表
export function getUserList(params) {
  return callCloudFunction('adminGetUsers', params)
}

// 获取统计数据
export function getStats() {
  return callCloudFunction('adminGetStats', {})
}

// 获取记录列表
export function getRecords(params) {
  return callCloudFunction('adminGetRecords', params)
}

// 获取用户详情
export function getUserDetail(openid) {
  return callCloudFunction('adminGetUserDetail', { openid })
}

// ========== 轮播图管理 ==========

// 获取轮播图列表
export function getBannerList() {
  return callCloudFunction('adminManageBanners', { action: 'list' })
}

// 添加轮播图
export function addBanner(data) {
  return callCloudFunction('adminManageBanners', { action: 'add', data })
}

// 更新轮播图
export function updateBanner(data) {
  return callCloudFunction('adminManageBanners', { action: 'update', data })
}

// 删除轮播图
export function deleteBanner(id) {
  return callCloudFunction('adminManageBanners', { action: 'delete', data: { id } })
}

// 更新轮播图顺序
export function updateBannerOrder(banners) {
  return callCloudFunction('adminManageBanners', { action: 'updateOrder', data: { banners } })
}

// ========== 反馈管理 ==========

// 获取反馈列表
export function getFeedbackList(params) {
  return callCloudFunction('adminGetFeedbacks', params)
}

// 更新反馈状态
export function updateFeedback(data) {
  return callCloudFunction('adminUpdateFeedback', data)
}

// ========== 系统设置管理 ==========

// 获取数据信息
export function getDataInfo() {
  return callCloudFunction('adminManageSettings', { action: 'getDataInfo' })
}

// 导出所有数据
export function exportAllData() {
  return callCloudFunction('adminManageSettings', { action: 'exportAllData' })
}

// 清理过期数据
export function cleanExpiredData(data) {
  return callCloudFunction('adminManageSettings', { action: 'cleanExpiredData', data })
}

// 获取管理员列表
export function getAdminList() {
  return callCloudFunction('adminManageSettings', { action: 'getAdminList' })
}

// 添加管理员
export function addAdmin(data) {
  return callCloudFunction('adminManageSettings', { action: 'addAdmin', data })
}

// 更新管理员
export function updateAdmin(data) {
  return callCloudFunction('adminManageSettings', { action: 'updateAdmin', data })
}

// 删除管理员
export function deleteAdmin(id) {
  return callCloudFunction('adminManageSettings', { action: 'deleteAdmin', data: { id } })
}

// 获取日志列表
export function getLogs(params) {
  return callCloudFunction('adminManageSettings', { action: 'getLogs', data: params })
}

// 添加日志
export function addLog(data) {
  return callCloudFunction('adminManageSettings', { action: 'addLog', data })
}

// 上传轮播图图片
export function uploadBannerImage(fileContent, fileName) {
  return callCloudFunction('uploadBannerImage', { fileContent, fileName })
}
