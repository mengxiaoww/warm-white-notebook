const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { page = 1, limit = 20, keyword = '', status = 'all', disease = '', startDate = '', endDate = '' } = event

  try {
    const skip = (page - 1) * limit
    const conditions = []

    // 关键词搜索
    if (keyword) {
      conditions.push(_.or([
        { 'userInfo.nickName': db.RegExp({ regexp: keyword, options: 'i' }) },
        { nickName: db.RegExp({ regexp: keyword, options: 'i' }) },
        { openid: keyword },
        { hospital: db.RegExp({ regexp: keyword, options: 'i' }) },
        { disease: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
    }

    // 状态筛选
    if (status !== 'all') {
      conditions.push({ registrationComplete: status === 'active' })
    }

    // 疾病筛选（支持一级和二级分类匹配）
    if (disease) {
      // 定义疾病分类映射，包含所有二级分类关键词
      const diseaseMapping = {
        '白血病': ['白血病', '急淋', 'ALL', 'AML', '急髓', '费阳', 'Ph+', 'ETP', 'T-LBL', 'B-LBL', 'CML', 'M3', '早幼粒', 'APL', '混合型', 'MPAL', '慢淋', 'CLL', 'SLL'],
        'MDS': ['MDS'],
        '淋巴瘤': ['淋巴瘤', '霍奇金', 'HL', '弥漫性大B', 'DLBCL', '滤泡', 'FL', '套细胞', 'MCL', '边缘区', 'MZL', '伯基特', 'BL', '华氏巨球', 'WM', 'NK/T', 'PTCL', '血管免疫母', 'AITL', 'ALK', '间变大', 'ALCL'],
        '骨髓瘤': ['骨髓瘤', 'IgG', 'IgA', 'IgM', 'IgD', 'IgE', '轻链', '非分泌', '双克隆', '浆白', '盲烟'],
        'MPN': ['MPN', '真性红细胞', 'PV', '血小板增多', 'ET', '骨髓纤维化', 'PMF']
      }

      const keywords = diseaseMapping[disease] || [disease]

      // 构建OR条件，匹配任意关键词
      const diseaseConditions = keywords.map(keyword => ({
        disease: db.RegExp({ regexp: keyword, options: 'i' })
      }))

      conditions.push(_.or(diseaseConditions))
    }

    // 日期筛选
    if (startDate && endDate) {
      conditions.push({
        createTime: _.gte(new Date(startDate)).and(_.lte(new Date(endDate + ' 23:59:59')))
      })
    }

    // 合并所有条件
    const whereCondition = conditions.length > 0 ? _.and(conditions) : {}

    // 获取用户列表
    const users = await db.collection('users')
      .where(whereCondition)
      .skip(skip)
      .limit(limit)
      .orderBy('createTime', 'desc')
      .get()

    // 获取总数
    const countResult = await db.collection('users')
      .where(whereCondition)
      .count()

    // 获取每个用户的档案数量和用户基本信息
    const usersWithProfiles = await Promise.all(
      users.data.map(async (user) => {
        const profileCount = await db.collection('userProfiles')
          .where({ openid: user.openid })
          .count()

        // 尝试获取用户基本信息（可能存储在userBasicInfo集合）
        let userBasicInfo = null
        try {
          const basicInfoResult = await db.collection('userBasicInfo')
            .where({ openid: user.openid })
            .limit(1)
            .get()
          if (basicInfoResult.data.length > 0) {
            userBasicInfo = basicInfoResult.data[0]
          }
        } catch (e) {
          console.log('Error getting basic info:', e)
        }

        // 整合用户信息
        return {
          ...user,
          profileCount: profileCount.total,
          userInfo: user.userInfo || {
            avatarUrl: userBasicInfo?.avatarUrl || user.avatarUrl || '',
            nickName: userBasicInfo?.nickName || user.nickName || '未设置'
          }
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
  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
