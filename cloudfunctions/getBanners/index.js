const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 获取轮播图（小程序端调用）
exports.main = async (event, context) => {
  try {
    const result = await db.collection('banners')
      .where({
        enabled: true
      })
      .orderBy('order', 'asc')
      .orderBy('createTime', 'desc')
      .get()

    // 如果有图片类型的轮播图，需要获取临时URL
    const fileIDs = []
    const fileIDMap = new Map() // 用于映射索引和fileID

    result.data.forEach((item, index) => {
      if (item.type === 'image' && item.imageFileID) {
        fileIDs.push(item.imageFileID)
        fileIDMap.set(item.imageFileID, index)
      }
    })

    // 批量获取临时URL（如果有图片）
    let tempFileURLs = []
    if (fileIDs.length > 0) {
      const tempResult = await cloud.getTempFileURL({
        fileList: fileIDs,
      })
      tempFileURLs = tempResult.fileList
    }

    // 格式化数据，替换为临时URL
    const banners = result.data.map((item, index) => {
      if (item.type === 'text') {
        return {
          type: item.type,
          text: item.content || '',
          image: '',
          link: item.link || ''
        }
      } else {
        // 图片类型
        let imageUrl = item.imageUrl || ''

        // 如果有fileID，优先使用临时URL
        if (item.imageFileID) {
          const tempFile = tempFileURLs.find(f => f.fileID === item.imageFileID)
          if (tempFile && tempFile.tempFileURL) {
            imageUrl = tempFile.tempFileURL
          }
        }

        return {
          type: item.type,
          text: '',
          image: imageUrl,
          link: item.link || ''
        }
      }
    })

    return {
      success: true,
      data: banners,
      timestamp: Date.now() // 添加时间戳用于缓存控制
    }
  } catch (error) {
    console.error('获取轮播图失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
