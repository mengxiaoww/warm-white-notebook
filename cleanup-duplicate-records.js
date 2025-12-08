/**
 * 清理数据库中的重复记录脚本
 *
 * 使用方法：
 * 1. 在云开发控制台 -> 数据库 -> 高级操作 中运行此脚本
 * 2. 或者创建一个临时云函数运行此代码
 *
 * 功能：
 * - 查找同一用户、同一档案、同一日期的重复记录
 * - 保留最新的记录（updateTime或createTime最晚的）
 * - 删除其他重复记录
 */

const db = wx.cloud.database();
const _ = db.command;

// 需要清理的集合列表
const collections = [
  'bloodTests',
  'liverFunctionTests',
  'kidneyFunctionTests',
  'bloodSugars',
  'bloodOxygens',
  'bloodPressures',
  'ebvRecords',
  'cmvRecords',
  'ldhRecords'
];

async function cleanupDuplicates() {
  console.log('🚀 开始清理重复记录...');

  for (const collectionName of collections) {
    console.log(`\n📋 处理集合: ${collectionName}`);

    try {
      // 1. 获取所有记录
      const allRecords = await db.collection(collectionName)
        .where({
          source: 'ai_assistant'  // 只处理AI助手创建的记录
        })
        .get();

      console.log(`  总记录数: ${allRecords.data.length}`);

      // 2. 按 openid + profileId + date 分组
      const groups = {};
      allRecords.data.forEach(record => {
        const key = `${record.openid}_${record.profileId}_${record.date}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(record);
      });

      // 3. 找出有重复的组
      let totalDuplicates = 0;
      let totalDeleted = 0;

      for (const key in groups) {
        const records = groups[key];
        if (records.length > 1) {
          totalDuplicates += records.length;
          console.log(`  ⚠️ 发现重复: ${key}, 共${records.length}条记录`);

          // 按时间排序，保留最新的
          records.sort((a, b) => {
            const timeA = a.updateTime || a.createTime || new Date(0);
            const timeB = b.updateTime || b.createTime || new Date(0);
            return new Date(timeB) - new Date(timeA);
          });

          // 保留第一条（最新），删除其他
          const toKeep = records[0];
          const toDelete = records.slice(1);

          console.log(`    ✅ 保留: ${toKeep._id} (时间: ${toKeep.updateTime || toKeep.createTime})`);

          for (const record of toDelete) {
            console.log(`    ❌ 删除: ${record._id} (时间: ${record.updateTime || record.createTime})`);

            // 执行删除
            await db.collection(collectionName).doc(record._id).remove();
            totalDeleted++;
          }
        }
      }

      console.log(`  📊 集合 ${collectionName} 清理完成:`);
      console.log(`    - 重复记录: ${totalDuplicates}条`);
      console.log(`    - 已删除: ${totalDeleted}条`);

    } catch (error) {
      console.error(`  ❌ 处理集合 ${collectionName} 失败:`, error);
    }
  }

  console.log('\n✅ 所有集合清理完成！');
}

// 运行清理
cleanupDuplicates();
