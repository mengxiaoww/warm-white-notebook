// 云函数：列出所有用户
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取所有用户
    const usersResult = await db.collection('users').get();

    // 为每个用户获取档案信息
    const usersWithProfiles = await Promise.all(
      usersResult.data.map(async (user) => {
        const profilesResult = await db.collection('userProfiles')
          .where({
            openid: user.openid || user._openid
          })
          .get();

        return {
          _id: user._id,
          openid: user.openid || user._openid,
          nickName: user.nickName,
          age: user.age,
          gender: user.gender,
          disease: user.disease,
          hospital: user.hospital,
          createTime: user.createTime,
          profileCount: profilesResult.data.length,
          profiles: profilesResult.data.map(p => ({
            _id: p._id,
            name: p.realName || p.name,
            disease: p.disease,
            isDefault: p.isDefault
          }))
        };
      })
    );

    // 统计每个用户的记录数
    const collections = [
      'bloodTests',
      'liverFunctionTests',
      'kidneyFunctionTests',
      'ebvRecords',
      'cmvRecords',
      'ldhRecords',
      'urineRecords',
      'stoolRecords',
      'clinicRecords',
      'medications'
    ];

    const usersWithStats = await Promise.all(
      usersWithProfiles.map(async (user) => {
        let totalRecords = 0;
        const recordStats = {};

        for (const collectionName of collections) {
          try {
            const count = await db.collection(collectionName)
              .where({
                openid: user.openid
              })
              .count();

            if (count.total > 0) {
              recordStats[collectionName] = count.total;
              totalRecords += count.total;
            }
          } catch (err) {
            // 集合可能不存在，忽略
          }
        }

        return {
          ...user,
          totalRecords,
          recordStats
        };
      })
    );

    return {
      success: true,
      totalUsers: usersResult.data.length,
      users: usersWithStats
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
};

