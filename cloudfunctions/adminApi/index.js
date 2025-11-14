const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 统一的管理后台 API 云函数
// 支持 HTTP 访问，无需匿名登录
exports.main = async (event, context) => {
  // 处理 HTTP 请求
  const isHttpRequest = event.headers !== undefined

  if (isHttpRequest) {
    // 处理 CORS 预检请求
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      }
    }

    // 解析请求体
    let requestData = {}
    try {
      requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, error: '请求数据格式错误' })
      }
    }

    const { action, data = {} } = requestData

    try {
      let result
      switch (action) {
        case 'login':
          result = await handleLogin(data)
          break
        case 'getUsers':
          result = await handleGetUsers(data)
          break
        case 'getStats':
          result = await handleGetStats()
          break
        case 'getRecords':
          result = await handleGetRecords(data)
          break
        case 'getUserDetail':
          result = await handleGetUserDetail(data)
          break
        default:
          result = { success: false, error: '未知操作' }
      }

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      }
    } catch (error) {
      console.error('Admin API Error:', error)
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, error: error.message })
      }
    }
  }

  // 兼容云函数直接调用
  const { action, data = {} } = event
  try {
    switch (action) {
      case 'login':
        return await handleLogin(data)
      case 'getUsers':
        return await handleGetUsers(data)
      case 'getStats':
        return await handleGetStats()
      case 'getRecords':
        return await handleGetRecords(data)
      case 'getUserDetail':
        return await handleGetUserDetail(data)
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (error) {
    console.error('Admin API Error:', error)
    return { success: false, error: error.message }
  }
}

// 管理员登录
async function handleLogin({ username, password }) {
  const result = await db.collection('admins').where({
    username: username,
    password: password
  }).get()

  if (result.data.length > 0) {
    const admin = result.data[0]
    return {
      success: true,
      data: {
        adminId: admin._id,
        username: admin.username,
        role: admin.role || 'admin',
        token: Buffer.from(`${admin._id}:${Date.now()}`).toString('base64')
      }
    }
  }

  return { success: false, error: '用户名或密码错误' }
}

// 获取用户列表
async function handleGetUsers({ page = 1, limit = 20, keyword = '', status = 'all' }) {
  const skip = (page - 1) * limit
  let whereCondition = {}

  if (keyword) {
    whereCondition = _.or([
      { 'userInfo.nickName': db.RegExp({ regexp: keyword, options: 'i' }) },
      { openid: keyword }
    ])
  }

  if (status !== 'all') {
    whereCondition.registrationComplete = status === 'active'
  }

  const users = await db.collection('users')
    .where(whereCondition)
    .skip(skip)
    .limit(limit)
    .orderBy('createTime', 'desc')
    .get()

  const countResult = await db.collection('users')
    .where(whereCondition)
    .count()

  // 获取每个用户的档案数量
  const usersWithProfiles = await Promise.all(
    users.data.map(async (user) => {
      const profileCount = await db.collection('userProfiles')
        .where({ openid: user.openid })
        .count()

      return {
        ...user,
        profileCount: profileCount.total
      }
    })
  )

  return {
    success: true,
    data: {
      list: usersWithProfiles,
      total: countResult.total,
      page,
      limit
    }
  }
}

// 获取统计数据
async function handleGetStats() {
  const totalUsers = await db.collection('users').count()
  const activeUsers = await db.collection('users').where({
    registrationComplete: true
  }).count()

  const totalProfiles = await db.collection('userProfiles').count()

  const bloodTests = await db.collection('bloodTests').count()
  const medications = await db.collection('medications').count()
  const clinicRecords = await db.collection('clinicRecords').count()
  const feedbacks = await db.collection('feedbacks').count()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const newUsers = await db.collection('users').where({
    createTime: db.command.gte(sevenDaysAgo)
  }).count()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentRecords = await db.collection('bloodTests')
    .where({
      date: db.command.gte(thirtyDaysAgo.toISOString().split('T')[0])
    })
    .field({ openid: true })
    .get()

  const activeUserSet = new Set(recentRecords.data.map(r => r.openid))

  return {
    success: true,
    data: {
      overview: {
        totalUsers: totalUsers.total,
        activeUsers: activeUsers.total,
        totalProfiles: totalProfiles.total,
        newUsersLast7Days: newUsers.total,
        activeUsersLast30Days: activeUserSet.size
      },
      records: {
        bloodTests: bloodTests.total,
        medications: medications.total,
        clinicRecords: clinicRecords.total,
        feedbacks: feedbacks.total
      }
    }
  }
}

// 获取记录列表
async function handleGetRecords({ openid, recordType = 'bloodTests', page = 1, limit = 50 }) {
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
    return { success: false, error: '无效的记录类型' }
  }

  let whereCondition = {}
  if (openid) {
    whereCondition.openid = openid
  }

  const records = await db.collection(recordType)
    .where(whereCondition)
    .skip(skip)
    .limit(limit)
    .orderBy('date', 'desc')
    .get()

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
}

// 获取用户详情
async function handleGetUserDetail({ openid }) {
  const user = await db.collection('users').where({ openid }).get()
  const profiles = await db.collection('userProfiles').where({ openid }).get()

  return {
    success: true,
    data: {
      user: user.data[0] || {},
      profiles: profiles.data || []
    }
  }
}
