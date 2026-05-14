const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    // === 用户统计 ===
    const [totalUsers, activeUsers, newUsersLast7Days, newUsersLast30Days] = await Promise.all([
      db.collection('users').count(),
      db.collection('users').where({ registrationComplete: true }).count(),
      db.collection('users').where({ createTime: _.gte(sevenDaysAgo) }).count(),
      db.collection('users').where({ createTime: _.gte(thirtyDaysAgo) }).count()
    ])

    // === 档案统计 ===
    const totalProfiles = await db.collection('userProfiles').count()

    // === 记录统计 ===
    const [
      bloodTests, liverTests, kidneyTests, ebvRecords, cmvRecords, ldhRecords,
      medications, clinicRecords, urineRecords, stoolRecords,
      keyDates, expenseRecords, feedbacks
    ] = await Promise.all([
      db.collection('bloodTests').count(),
      db.collection('liverFunctionTests').count(),
      db.collection('kidneyFunctionTests').count(),
      db.collection('ebvRecords').count(),
      db.collection('cmvRecords').count(),
      db.collection('ldhRecords').count(),
      db.collection('medications').count(),
      db.collection('clinicRecords').count(),
      db.collection('urineRecords').count(),
      db.collection('stoolRecords').count(),
      db.collection('keyDates').count(),
      db.collection('expenseRecords').count(),
      db.collection('feedbacks').count()
    ])

    // === 最近7天每日新增用户趋势 ===
    const userTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const dateStart = new Date(date.setHours(0, 0, 0, 0))
      const dateEnd = new Date(date.setHours(23, 59, 59, 999))

      const count = await db.collection('users').where({
        createTime: _.gte(dateStart).and(_.lte(dateEnd))
      }).count()

      userTrend.push({
        date: dateStart.toISOString().split('T')[0],
        count: count.total
      })
    }

    // === 最近7天记录趋势（血常规） ===
    const recordTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const count = await db.collection('bloodTests').where({
        date: dateStr
      }).count()

      recordTrend.push({
        date: dateStr,
        count: count.total
      })
    }

    // === 疾病类型分布 ===
    const diseaseDistribution = await db.collection('userProfiles')
      .field({ disease: true })
      .get()

    const diseaseMap = {}
    diseaseDistribution.data.forEach(profile => {
      // 只统计有疾病信息的档案，忽略空值
      if (profile.disease && profile.disease.trim()) {
        const disease = profile.disease.trim()
        diseaseMap[disease] = (diseaseMap[disease] || 0) + 1
      }
    })

    const diseaseData = Object.entries(diseaseMap).map(([name, value]) => ({ name, value }))

    // === 反馈状态统计 ===
    const [pendingFeedbacks, processingFeedbacks, completedFeedbacks] = await Promise.all([
      db.collection('feedbacks').where({ status: 'pending' }).count(),
      db.collection('feedbacks').where({ status: 'processing' }).count(),
      db.collection('feedbacks').where({ status: 'completed' }).count()
    ])

    // === 活跃用户统计（最近30天有记录的用户） ===
    const [
      bloodTestUsers,
      medicationUsers,
      clinicUsers
    ] = await Promise.all([
      db.collection('bloodTests').where({ date: _.gte(thirtyDaysAgoStr) }).field({ openid: true }).get(),
      db.collection('medications').where({ date: _.gte(thirtyDaysAgoStr) }).field({ openid: true }).get(),
      db.collection('clinicRecords').where({ date: _.gte(thirtyDaysAgoStr) }).field({ openid: true }).get()
    ])

    const activeUserSet = new Set([
      ...bloodTestUsers.data.map(r => r.openid),
      ...medicationUsers.data.map(r => r.openid),
      ...clinicUsers.data.map(r => r.openid)
    ])

    return {
      success: true,
      data: {
        // 概览数据
        overview: {
          totalUsers: totalUsers.total,
          activeUsers: activeUsers.total,
          totalProfiles: totalProfiles.total,
          newUsersLast7Days: newUsersLast7Days.total,
          newUsersLast30Days: newUsersLast30Days.total,
          activeUsersLast30Days: activeUserSet.size
        },
        // 记录统计
        records: {
          bloodTests: bloodTests.total,
          liverFunctionTests: liverTests.total,
          kidneyFunctionTests: kidneyTests.total,
          ebvRecords: ebvRecords.total,
          cmvRecords: cmvRecords.total,
          ldhRecords: ldhRecords.total,
          medications: medications.total,
          clinicRecords: clinicRecords.total,
          urineRecords: urineRecords.total,
          stoolRecords: stoolRecords.total,
          keyDates: keyDates.total,
          expenseRecords: expenseRecords.total,
          feedbacks: feedbacks.total,
          total: bloodTests.total + liverTests.total + kidneyTests.total +
                 ebvRecords.total + cmvRecords.total + ldhRecords.total +
                 medications.total + clinicRecords.total + urineRecords.total +
                 stoolRecords.total + expenseRecords.total
        },
        // 反馈统计
        feedbackStats: {
          total: feedbacks.total,
          pending: pendingFeedbacks.total,
          processing: processingFeedbacks.total,
          completed: completedFeedbacks.total
        },
        // 趋势数据
        trends: {
          userTrend,
          recordTrend
        },
        // 疾病分布
        diseaseDistribution: diseaseData
      }
    }
  } catch (err) {
    console.error('统计数据获取失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
