// 云函数：检查档案数据
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { profileIds } = event;

    // 获取指定档案的详细信息
    const profiles = await Promise.all(
      profileIds.map(async (id) => {
        const res = await db.collection('userProfiles').doc(id).get();
        return res.data;
      })
    );

    return {
      success: true,
      profiles
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
};

