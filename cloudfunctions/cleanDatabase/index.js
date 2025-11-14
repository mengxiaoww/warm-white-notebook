// 云函数：清理数据库（保留指定用户）
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { keepUserIds, dryRun = true } = event;

  if (!keepUserIds || keepUserIds.length === 0) {
    return {
      success: false,
      message: '必须提供要保留的用户ID列表'
    };
  }

  const result = {
    dryRun,
    keepUserIds,
    toKeep: {},
    toDelete: {},
    errors: []
  };

  try {
    // 1. 获取要保留的用户的 openid
    const keepUsers = await db.collection('users')
      .where({
        _id: _.in(keepUserIds)
      })
      .get();

    const keepOpenIds = keepUsers.data.map(u => u.openid || u._openid);
    result.toKeep.users = keepUsers.data.length;
    result.toKeep.openids = keepOpenIds;

    // 2. 获取要保留的档案
    const keepProfiles = await db.collection('userProfiles')
      .where({
        openid: _.in(keepOpenIds)
      })
      .get();

    const keepProfileIds = keepProfiles.data.map(p => p._id);
    result.toKeep.profiles = keepProfiles.data.length;
    result.toKeep.profileIds = keepProfileIds;

    // 定义所有需要清理的集合
    const collections = {
      // 用户相关（按 openid）
      userCollections: [
        'users',
        'userBasicInfo',
        'userProfiles',
        'feedbacks',
        'keyDates',
        'todayTasks',
        'functionCustomConfig'
      ],
      // 记录相关（按 openid 和 profileId）
      recordCollections: [
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
      ],
      // 指标设置（按 openid）
      settingsCollections: [
        'userIndicatorSettings',
        'ebvIndicatorSettings',
        'cmvIndicatorSettings',
        'ldhIndicatorSettings',
        'liverFunctionSettings',
        'kidneyFunctionSettings'
      ]
    };

    // 3. 统计和删除操作
    for (const collectionName of [...collections.userCollections, ...collections.settingsCollections]) {
      try {
        // 统计要删除的记录数
        const countResult = await db.collection(collectionName)
          .where({
            openid: _.nin(keepOpenIds)
          })
          .count();

        result.toDelete[collectionName] = countResult.total;

        // 如果不是演练模式，执行删除
        if (!dryRun && countResult.total > 0) {
          let deleted = 0;
          // 分批删除（每次最多20条）
          while (deleted < countResult.total) {
            const batchResult = await db.collection(collectionName)
              .where({
                openid: _.nin(keepOpenIds)
              })
              .limit(20)
              .remove();
            deleted += batchResult.removed;
          }
          result.toDelete[`${collectionName}_deleted`] = deleted;
        }
      } catch (err) {
        result.errors.push({
          collection: collectionName,
          error: err.message
        });
      }
    }

    // 处理记录集合（需要同时检查 openid 和 profileId）
    for (const collectionName of collections.recordCollections) {
      try {
        // 统计要删除的记录数
        const countResult = await db.collection(collectionName)
          .where({
            openid: _.nin(keepOpenIds)
          })
          .count();

        result.toDelete[collectionName] = countResult.total;

        // 如果不是演练模式，执行删除
        if (!dryRun && countResult.total > 0) {
          let deleted = 0;
          // 分批删除（每次最多20条）
          while (deleted < countResult.total) {
            const batchResult = await db.collection(collectionName)
              .where({
                openid: _.nin(keepOpenIds)
              })
              .limit(20)
              .remove();
            deleted += batchResult.removed;
          }
          result.toDelete[`${collectionName}_deleted`] = deleted;
        }
      } catch (err) {
        result.errors.push({
          collection: collectionName,
          error: err.message
        });
      }
    }

    result.success = true;
    result.message = dryRun ? '演练模式：仅统计，未实际删除' : '清理完成';

  } catch (err) {
    result.success = false;
    result.message = err.message;
    result.errors.push({
      step: 'main',
      error: err.message
    });
  }

  return result;
};

