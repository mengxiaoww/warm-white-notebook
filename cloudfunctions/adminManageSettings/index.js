const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      // ========== 数据管理 ==========
      case 'getDataInfo':
        return await getDataInfo()

      case 'exportAllData':
        return await exportAllData()

      case 'cleanExpiredData':
        return await cleanExpiredData(data)

      // ========== 管理员管理 ==========
      case 'getAdminList':
        return await getAdminList()

      case 'addAdmin':
        return await addAdmin(data)

      case 'updateAdmin':
        return await updateAdmin(data)

      case 'deleteAdmin':
        return await deleteAdmin(data)

      // ========== 操作日志 ==========
      case 'getLogs':
        return await getLogs(data)

      case 'addLog':
        return await addLog(data)

      default:
        return { success: false, error: '未知操作' }
    }
  } catch (err) {
    console.error('Settings管理失败:', err)
    return { success: false, error: err.message }
  }
}

// ========== 数据管理函数 ==========

async function getDataInfo() {
  try {
    const [users, profiles, bloodTests, medications, clinicRecords,
           liverTests, kidneyTests, ebvRecords, cmvRecords, ldhRecords,
           urineRecords, stoolRecords, keyDates, expenseRecords, feedbacks] = await Promise.all([
      db.collection('users').count(),
      db.collection('userProfiles').count(),
      db.collection('bloodTests').count(),
      db.collection('medications').count(),
      db.collection('clinicRecords').count(),
      db.collection('liverFunctionTests').count(),
      db.collection('kidneyFunctionTests').count(),
      db.collection('ebvRecords').count(),
      db.collection('cmvRecords').count(),
      db.collection('ldhRecords').count(),
      db.collection('urineRecords').count(),
      db.collection('stoolRecords').count(),
      db.collection('keyDates').count(),
      db.collection('expenseRecords').count(),
      db.collection('feedbacks').count()
    ])

    const totalRecords = bloodTests.total + medications.total + clinicRecords.total +
                        liverTests.total + kidneyTests.total + ebvRecords.total +
                        cmvRecords.total + ldhRecords.total + urineRecords.total +
                        stoolRecords.total + expenseRecords.total

    // 估算数据库大小 (每条记录约1KB)
    const estimatedSize = (users.total + profiles.total + totalRecords + feedbacks.total) / 1024
    const dbSize = estimatedSize < 1 ?
                   `${(estimatedSize * 1024).toFixed(0)} KB` :
                   `${estimatedSize.toFixed(2)} MB`

    // 获取最后备份时间（从系统日志中查询）
    const lastBackup = await db.collection('adminLogs')
      .where({ type: 'data', action: _.regex('导出数据') })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()

    return {
      success: true,
      data: {
        totalUsers: users.total,
        totalProfiles: profiles.total,
        totalRecords: totalRecords,
        totalFeedbacks: feedbacks.total,
        dbSize: dbSize,
        lastBackupTime: lastBackup.data.length > 0 ?
          new Date(lastBackup.data[0].createTime).toLocaleString('zh-CN') : null
      }
    }
  } catch (err) {
    throw new Error('获取数据信息失败: ' + err.message)
  }
}

async function exportAllData() {
  try {
    // 记录导出操作日志
    await db.collection('adminLogs').add({
      data: {
        type: 'data',
        action: '导出所有数据',
        operator: 'admin',
        ip: '-',
        createTime: new Date()
      }
    })

    // 实际导出由前端完成，云函数只记录日志
    return {
      success: true,
      message: '导出操作已记录'
    }
  } catch (err) {
    throw new Error('导出数据失败: ' + err.message)
  }
}

async function cleanExpiredData(params) {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]

    // 清理超过1年的记录
    const collections = [
      'bloodTests', 'medications', 'clinicRecords',
      'liverFunctionTests', 'kidneyFunctionTests',
      'ebvRecords', 'cmvRecords', 'ldhRecords',
      'urineRecords', 'stoolRecords', 'expenseRecords'
    ]

    let totalDeleted = 0
    for (const collectionName of collections) {
      const result = await db.collection(collectionName)
        .where({ date: _.lt(oneYearAgoStr) })
        .remove()
      totalDeleted += result.stats.removed
    }

    // 记录清理操作
    await db.collection('adminLogs').add({
      data: {
        type: 'data',
        action: `清理过期数据（删除${totalDeleted}条记录）`,
        operator: 'admin',
        ip: '-',
        createTime: new Date()
      }
    })

    return {
      success: true,
      message: `成功清理${totalDeleted}条过期数据`
    }
  } catch (err) {
    throw new Error('清理过期数据失败: ' + err.message)
  }
}

// ========== 管理员管理函数 ==========

async function getAdminList() {
  try {
    const result = await db.collection('admins')
      .field({
        password: false  // 不返回密码
      })
      .get()

    return {
      success: true,
      data: result.data
    }
  } catch (err) {
    throw new Error('获取管理员列表失败: ' + err.message)
  }
}

async function addAdmin(adminData) {
  try {
    const { username, password, role } = adminData

    // 检查用户名是否已存在
    const existing = await db.collection('admins')
      .where({ username })
      .count()

    if (existing.total > 0) {
      return {
        success: false,
        error: '用户名已存在'
      }
    }

    // 添加管理员
    const result = await db.collection('admins').add({
      data: {
        username,
        password,  // 生产环境应加密
        role: role || 'admin',
        enabled: true,
        createTime: new Date(),
        lastLoginTime: null
      }
    })

    // 记录日志
    await db.collection('adminLogs').add({
      data: {
        type: 'config',
        action: `添加管理员: ${username}`,
        operator: 'admin',
        ip: '-',
        createTime: new Date()
      }
    })

    return {
      success: true,
      data: { id: result._id }
    }
  } catch (err) {
    throw new Error('添加管理员失败: ' + err.message)
  }
}

async function updateAdmin(adminData) {
  try {
    const { id, enabled } = adminData

    const result = await db.collection('admins')
      .doc(id)
      .update({
        data: { enabled }
      })

    return {
      success: true,
      data: result
    }
  } catch (err) {
    throw new Error('更新管理员失败: ' + err.message)
  }
}

async function deleteAdmin(adminData) {
  try {
    const { id } = adminData

    // 检查是否是超级管理员
    const admin = await db.collection('admins').doc(id).get()
    if (admin.data.role === 'super') {
      return {
        success: false,
        error: '不能删除超级管理员'
      }
    }

    await db.collection('admins').doc(id).remove()

    // 记录日志
    await db.collection('adminLogs').add({
      data: {
        type: 'config',
        action: `删除管理员: ${admin.data.username}`,
        operator: 'admin',
        ip: '-',
        createTime: new Date()
      }
    })

    return {
      success: true
    }
  } catch (err) {
    throw new Error('删除管理员失败: ' + err.message)
  }
}

// ========== 日志管理函数 ==========

async function getLogs(params) {
  try {
    const { type, dateRange, page = 1, limit = 20 } = params

    let query = db.collection('adminLogs')

    // 类型筛选
    if (type) {
      query = query.where({ type })
    }

    // 日期范围筛选
    if (dateRange && dateRange.length === 2) {
      const startDate = new Date(dateRange[0])
      const endDate = new Date(dateRange[1])
      endDate.setHours(23, 59, 59, 999)

      query = query.where({
        createTime: _.gte(startDate).and(_.lte(endDate))
      })
    }

    // 统计总数
    const total = await query.count()

    // 分页查询
    const logs = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get()

    return {
      success: true,
      data: {
        list: logs.data,
        total: total.total
      }
    }
  } catch (err) {
    throw new Error('获取日志失败: ' + err.message)
  }
}

async function addLog(logData) {
  try {
    await db.collection('adminLogs').add({
      data: {
        ...logData,
        createTime: new Date()
      }
    })

    return { success: true }
  } catch (err) {
    throw new Error('添加日志失败: ' + err.message)
  }
}
