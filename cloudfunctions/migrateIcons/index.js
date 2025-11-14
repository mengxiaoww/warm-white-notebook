// 云函数：更新数据库中的功能项图标
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 图标映射关系（肾功能保持 filter，不需要迁移）
const ICON_MAP = {
  'chart-bubble': 'blood-drop',
  'heart-filled': 'liver',
  'chart-line-data': 'enzyme'
}

exports.main = async (event, context) => {
  try {
    console.log('开始迁移功能项图标...')

    // 获取所有用户的功能项配置
    const { data: configs } = await db.collection('functionCustomConfig')
      .get()

    console.log(`找到 ${configs.length} 条配置记录`)

    let updatedCount = 0
    let errorCount = 0

    // 批量更新
    for (const config of configs) {
      try {
        let needsUpdate = false
        const updatedFunctionList = config.functionList.map(func => {
          if (ICON_MAP[func.icon]) {
            needsUpdate = true
            return {
              ...func,
              icon: ICON_MAP[func.icon]
            }
          }
          return func
        })

        if (needsUpdate) {
          await db.collection('functionCustomConfig')
            .doc(config._id)
            .update({
              data: {
                functionList: updatedFunctionList,
                updateTime: db.serverDate(),
                iconMigrated: true // 标记已迁移
              }
            })

          updatedCount++
          console.log(`✅ 更新配置 ${config._id}`)
        }
      } catch (err) {
        errorCount++
        console.error(`❌ 更新配置 ${config._id} 失败:`, err)
      }
    }

    return {
      success: true,
      message: `迁移完成！更新了 ${updatedCount} 条记录，${errorCount} 条失败`,
      updated: updatedCount,
      errors: errorCount,
      total: configs.length
    }

  } catch (error) {
    console.error('迁移失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
