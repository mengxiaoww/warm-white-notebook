const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { username, password } = event

  try {
    // 查询管理员账号
    const result = await db.collection('admins').where({
      username: username,
      password: password // 生产环境应使用加密
    }).get()

    if (result.data.length > 0) {
      const admin = result.data[0]
      return {
        success: true,
        data: {
          adminId: admin._id,
          username: admin.username,
          role: admin.role,
          token: Buffer.from(`${admin._id}:${Date.now()}`).toString('base64')
        }
      }
    } else {
      return {
        success: false,
        error: '用户名或密码错误'
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
