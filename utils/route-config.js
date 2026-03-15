/**
 * 路由配置映射表
 * 用于统一管理功能项的路由跳转
 */

const ROUTE_MAP = {
  // 用药与记录（packageB）
  medication: '/packageB/pages/medication/index',
  clinic: '/packageB/pages/clinic-record/index',
  treatment: '/packageB/pages/treatment-record/index',
  hospitalization: '/packageB/pages/hospitalization-record/index',
  checkReport: '/packageB/pages/check-report/index',
  urine: '/packageB/pages/urine-record/index',
  stool: '/packageB/pages/stool-record/index',
  expense: '/packageB/pages/expense-record/index',

  // 检验指标（packageA）
  blood: '/packageA/pages/blood-test/index',
  liver: '/packageA/pages/liver-function/index',
  kidney: '/packageA/pages/kidney-function/index',
  bloodSugar: '/packageA/pages/blood-sugar/index',
  bloodOxygen: '/packageA/pages/blood-oxygen/index',
  bloodPressure: '/packageA/pages/blood-pressure/index',

  // 病毒学（packageC）
  ldh: '/packageC/pages/ldh-record/index',
  ebv: '/packageC/pages/ebv-record/index',
  cmv: '/packageC/pages/cmv-record/index',

  // 健康监测（packageD）
  bodyMeasurement: '/packageD/pages/body-measurement/index',
  water: '/packageD/pages/water-intake/index',
  diet: '/packageD/pages/diet/index',
  temperature: '/packageD/pages/temperature/index'
}

/**
 * 通用导航方法
 * @param {string} functionId - 功能项ID
 * @param {string} selectedDate - 选中的日期（可选）
 */
function navigateToFunction(functionId, selectedDate) {
  const route = ROUTE_MAP[functionId]

  if (!route) {
    console.warn(`未找到功能项 ${functionId} 的路由配置`)
    wx.showToast({
      title: '功能暂未开放',
      icon: 'none'
    })
    return
  }

  // 构建完整URL（带日期参数）
  const url = selectedDate ? `${route}?date=${selectedDate}` : route

  wx.navigateTo({
    url,
    fail: (err) => {
      console.error(`跳转失败: ${url}`, err)
      wx.showToast({
        title: '页面跳转失败',
        icon: 'none'
      })
    }
  })
}

module.exports = {
  ROUTE_MAP,
  navigateToFunction
}
