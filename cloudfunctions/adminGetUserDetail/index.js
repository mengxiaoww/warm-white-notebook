// 云函数：获取用户详细信息
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { openid } = event

  if (!openid) {
    return { success: false, error: '缺少openid参数' }
  }

  try {
    // 获取用户基本信息
    const userInfo = await db.collection('users').where({ openid }).get()

    if (userInfo.data.length === 0) {
      return { success: false, error: '用户不存在' }
    }

    const user = userInfo.data[0]

    // 获取用户档案列表
    const profiles = await db.collection('userProfiles').where({ openid }).get()

    // 获取各类记录统计（按档案分组）
    const [
      bloodTests,
      liverTests,
      kidneyTests,
      ebvRecords,
      cmvRecords,
      ldhRecords,
      medications,
      clinicRecords,
      urineRecords,
      stoolRecords,
      expenseRecords,
      keyDates
    ] = await Promise.all([
      db.collection('bloodTests').where({ openid }).get(),
      db.collection('liverFunctionTests').where({ openid }).get(),
      db.collection('kidneyFunctionTests').where({ openid }).get(),
      db.collection('ebvRecords').where({ openid }).get(),
      db.collection('cmvRecords').where({ openid }).get(),
      db.collection('ldhRecords').where({ openid }).get(),
      db.collection('medications').where({ openid }).get(),
      db.collection('clinicRecords').where({ openid }).get(),
      db.collection('urineRecords').where({ openid }).get(),
      db.collection('stoolRecords').where({ openid }).get(),
      db.collection('expenseRecords').where({ openid }).get(),
      db.collection('keyDates').where({ openid }).get()
    ])

    // 最近的记录（每种类型最多10条）
    const recentRecords = {
      bloodTests: bloodTests.data.slice(-10).reverse(),
      medications: medications.data.slice(-10).reverse(),
      clinicRecords: clinicRecords.data.slice(-10).reverse()
    }

    // 按档案统计记录数
    const profileStats = {}
    profiles.data.forEach(profile => {
      const profileId = profile._id
      profileStats[profileId] = {
        profile: profile,
        records: {
          bloodTests: bloodTests.data.filter(r => r.profileId === profileId).length,
          liverTests: liverTests.data.filter(r => r.profileId === profileId).length,
          kidneyTests: kidneyTests.data.filter(r => r.profileId === profileId).length,
          ebvRecords: ebvRecords.data.filter(r => r.profileId === profileId).length,
          cmvRecords: cmvRecords.data.filter(r => r.profileId === profileId).length,
          ldhRecords: ldhRecords.data.filter(r => r.profileId === profileId).length,
          medications: medications.data.filter(r => r.profileId === profileId).length,
          clinicRecords: clinicRecords.data.filter(r => r.profileId === profileId).length,
          urineRecords: urineRecords.data.filter(r => r.profileId === profileId).length,
          stoolRecords: stoolRecords.data.filter(r => r.profileId === profileId).length,
          expenseRecords: expenseRecords.data.filter(r => r.profileId === profileId).length,
          keyDates: keyDates.data.filter(r => r.profileId === profileId).length
        }
      }
    })

    return {
      success: true,
      data: {
        user,
        profiles: profiles.data,
        profileStats,
        recentRecords,
        totalRecords: {
          bloodTests: bloodTests.data.length,
          liverTests: liverTests.data.length,
          kidneyTests: kidneyTests.data.length,
          ebvRecords: ebvRecords.data.length,
          cmvRecords: cmvRecords.data.length,
          ldhRecords: ldhRecords.data.length,
          medications: medications.data.length,
          clinicRecords: clinicRecords.data.length,
          urineRecords: urineRecords.data.length,
          stoolRecords: stoolRecords.data.length,
          expenseRecords: expenseRecords.data.length,
          keyDates: keyDates.data.length,
          total: bloodTests.data.length + liverTests.data.length + kidneyTests.data.length +
                 ebvRecords.data.length + cmvRecords.data.length + ldhRecords.data.length +
                 medications.data.length + clinicRecords.data.length +
                 urineRecords.data.length + stoolRecords.data.length + expenseRecords.data.length
        }
      }
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
