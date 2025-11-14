// 云函数：修复历史数据的 profileId 字段
// 用途：修复之前因为代码BUG导致 profileId 为 undefined 的历史数据
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { openid, targetProfileId, dryRun = true } = event;

  try {
    // 需要修复的数据集合列表
    const collections = [
      'bloodTests',
      'liverFunctionTests',
      'kidneyFunctionTests',
      'ebvRecords',
      'cmvRecords',
      'ldhRecords',
      'medications',
      'clinicRecords',
      'checkReports',
      'urineRecords',
      'stoolRecords',
      'keyDates',
      'todayTasks',
      'expenseRecords'
    ];

    const results = {};
    let totalFixed = 0;
    let totalFound = 0;

    for (const collectionName of collections) {
      try {
        // 查询该集合中 profileId 为 undefined、null 或不存在的记录
        const query = db.collection(collectionName).where({
          openid: openid,
          profileId: _.or(_.eq(undefined), _.eq(null), _.exists(false))
        });

        const countRes = await query.count();
        const count = countRes.total;
        totalFound += count;

        console.log(`${collectionName}: 找到 ${count} 条需要修复的记录`);

        if (count > 0 && !dryRun) {
          // 批量更新（每次最多20条）
          const MAX_LIMIT = 20;
          const batchTimes = Math.ceil(count / MAX_LIMIT);

          for (let i = 0; i < batchTimes; i++) {
            const res = await query.limit(MAX_LIMIT).get();
            const updatePromises = res.data.map(record => {
              return db.collection(collectionName).doc(record._id).update({
                data: {
                  profileId: targetProfileId
                }
              });
            });
            await Promise.all(updatePromises);
          }

          totalFixed += count;
        }

        results[collectionName] = {
          found: count,
          fixed: dryRun ? 0 : count
        };

      } catch (collectionErr) {
        console.error(`处理集合 ${collectionName} 失败:`, collectionErr);
        results[collectionName] = {
          error: collectionErr.message
        };
      }
    }

    return {
      success: true,
      dryRun,
      openid,
      targetProfileId,
      totalFound,
      totalFixed,
      details: results,
      message: dryRun ?
        `扫描完成：找到 ${totalFound} 条需要修复的记录（未执行修复，请设置 dryRun=false 后重新执行）` :
        `修复完成：成功修复 ${totalFixed} 条记录`
    };

  } catch (err) {
    console.error('修复失败:', err);
    return {
      success: false,
      error: err.message,
      stack: err.stack
    };
  }
};
