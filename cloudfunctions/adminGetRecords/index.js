const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid, recordType = 'bloodTests', page = 1, limit = 50 } = event

  try {
    const skip = (page - 1) * limit
    const collections = {
      bloodTests: '血常规',
      liverFunctionTests: '肝功能',
      kidneyFunctionTests: '肾功能',
      ebvRecords: 'EBV',
      cmvRecords: 'CMV',
      ldhRecords: '乳酸脱氢酶',
      medications: '用药记录',
      clinicRecords: '门诊记录',
      urineRecords: '尿量记录',
      stoolRecords: '排便记录'
    }

    if (!collections[recordType]) {
      return {
        success: false,
        error: '无效的记录类型'
      }
    }

    let whereCondition = {}
    if (openid) {
      whereCondition.openid = openid
    }

    // 获取记录列表
    const records = await db.collection(recordType)
      .where(whereCondition)
      .skip(skip)
      .limit(limit)
      .orderBy('date', 'desc')
      .get()

    // 获取总数
    const countResult = await db.collection(recordType)
      .where(whereCondition)
      .count()

    return {
      success: true,
      data: {
        list: records.data,
        total: countResult.total,
        page,
        limit,
        recordType: collections[recordType]
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
