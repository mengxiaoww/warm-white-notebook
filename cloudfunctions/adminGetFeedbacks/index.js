// 云函数：获取反馈列表
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const {
    page = 1,
    limit = 20,
    keyword = '',
    status = '',
    type = ''
  } = event

  try {
    // 构建查询条件
    const where = {}

    if (keyword) {
      where._or = [
        { content: db.RegExp({ regexp: keyword, options: 'i' }) },
        { contact: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    // 查询总数
    const countResult = await db.collection('feedbacks')
      .where(where)
      .count()

    // 查询列表
    const listResult = await db.collection('feedbacks')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()

    return {
      success: true,
      data: {
        list: listResult.data,
        total: countResult.total
      }
    }
  } catch (error) {
    console.error('获取反馈列表失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
