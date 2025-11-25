// 云函数：修复功能项配置中的旧图标名称
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = event.openid || wxContext.OPENID

    console.log('开始修复功能项配置，openid:', openid)

    // 图标迁移映射
    const ICON_MIGRATION_MAP = {
      'chart-bubble': 'blood-drop',
      'heart-filled': 'liver',
      'chart-line-data': 'enzyme'
    }

    // 查询所有配置
    const res = await db.collection('functionCustomConfig')
      .where({ openid })
      .get()

    if (res.data.length === 0) {
      return {
        success: true,
        message: '没有找到需要修复的配置'
      }
    }

    let fixedCount = 0
    const updatePromises = []

    for (const config of res.data) {
      let needsUpdate = false
      const updatedList = (config.functionList || []).map(item => {
        let newIcon = item.icon

        // 检查并更新图标
        if (ICON_MIGRATION_MAP[item.icon]) {
          newIcon = ICON_MIGRATION_MAP[item.icon]
          needsUpdate = true
          console.log(`修复图标: ${item.id} - ${item.icon} -> ${newIcon}`)
        }

        // 检查是否缺少 bloodSugar
        return {
          id: item.id,
          name: item.name,
          icon: newIcon,
          visible: item.visible,
          order: item.order,
          navigate: item.navigate
        }
      })

      // 检查是否缺少 bloodSugar 项
      const hasBloodSugar = updatedList.some(item => item.id === 'bloodSugar')
      if (!hasBloodSugar) {
        updatedList.push({
          id: 'bloodSugar',
          name: '血糖',
          icon: 'glucose',
          visible: false,
          order: 10,
          navigate: 'navigateToBloodSugar'
        })
        needsUpdate = true
        console.log('添加缺失的 bloodSugar 项')
      }

      if (needsUpdate) {
        const updatePromise = db.collection('functionCustomConfig')
          .doc(config._id)
          .update({
            data: {
              functionList: updatedList,
              updateTime: db.serverDate()
            }
          })
        updatePromises.push(updatePromise)
        fixedCount++
      }
    }

    // 执行所有更新
    await Promise.all(updatePromises)

    return {
      success: true,
      message: `成功修复 ${fixedCount} 条配置`,
      details: {
        totalConfigs: res.data.length,
        fixedConfigs: fixedCount
      }
    }

  } catch (err) {
    console.error('修复配置失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
