// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const collections = [
      'bloodTests',            // 血常规检测
      'virusRecords',          // 病毒检测 (EB/巨细胞)
      'organFunctionRecords',  // 肝肾功能
      'urineRecords',          // 尿量记录
      'stoolRecords',          // 排便记录
      'medications',           // 用药记录
      'functionCustomConfig',  // 功能项自定义配置
      'banners',               // 轮播图
      'feedbacks',             // 用户反馈
      'bloodSugarRecords',     // 血糖记录
      'bloodSugarIndicatorSettings',  // 血糖指标设置
      'bloodSugarIndicatorConfig'     // 血糖指标配置
    ];

    const results = [];

    for (const collectionName of collections) {
      try {
        // 检查集合是否存在
        const collection = db.collection(collectionName);
        await collection.limit(1).get();

        results.push({
          collection: collectionName,
          status: 'exists',
          message: '集合已存在'
        });

      } catch (error) {
        if (error.errCode === -502005) {
          // 集合不存在，创建集合
          try {
            await db.createCollection(collectionName);
            results.push({
              collection: collectionName,
              status: 'created',
              message: '集合创建成功'
            });

            // 如果是 banners 集合，添加默认数据
            if (collectionName === 'banners') {
              await initDefaultBanners();
              results[results.length - 1].message += '，已添加默认轮播图';
            }
          } catch (createError) {
            results.push({
              collection: collectionName,
              status: 'error',
              message: `集合创建失败: ${createError.message}`
            });
          }
        } else {
          results.push({
            collection: collectionName,
            status: 'error',
            message: `检查集合失败: ${error.message}`
          });
        }
      }
    }

    return {
      success: true,
      results: results,
      message: '数据库初始化完成'
    };

  } catch (error) {

    return {
      success: false,
      error: error.message
    };
  }
}

// 初始化默认轮播图
async function initDefaultBanners() {
  const defaultBanners = [
    {
      type: 'text',
      content: '欢迎使用暖白记事本，专为血液肿瘤患者设计的健康管理工具',
      imageUrl: '',
      link: '',
      order: 0,
      enabled: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      type: 'text',
      content: '记录每日健康数据，科学管理疾病，与医生更好沟通',
      imageUrl: '',
      link: '',
      order: 1,
      enabled: true,
      createTime: new Date(),
      updateTime: new Date()
    },
    {
      type: 'text',
      content: '支持血常规、肝肾功能、病毒检测等多项指标记录',
      imageUrl: '',
      link: '',
      order: 2,
      enabled: true,
      createTime: new Date(),
      updateTime: new Date()
    }
  ];

  for (const banner of defaultBanners) {
    await db.collection('banners').add({ data: banner });
  }
} 