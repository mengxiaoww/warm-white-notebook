const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 管理轮播图配置
exports.main = async (event, context) => {
  const { action, data = {} } = event

  try {
    switch (action) {
      case 'list':
        return await listBanners()
      case 'add':
        return await addBanner(data)
      case 'update':
        return await updateBanner(data)
      case 'delete':
        return await deleteBanner(data)
      case 'updateOrder':
        return await updateBannerOrder(data)
      default:
        return { success: false, error: '未知操作' }
    }
  } catch (error) {
    console.error('Banner管理错误:', error)
    return { success: false, error: error.message }
  }
}

// 获取轮播图列表
async function listBanners() {
  const result = await db.collection('banners')
    .orderBy('order', 'asc')
    .orderBy('createTime', 'desc')
    .get()

  // 收集所有图片类型的 fileID
  const fileIDs = []
  const fileIDMap = new Map() // 映射 fileID 到索引

  result.data.forEach((item, index) => {
    if (item.type === 'image' && item.imageFileID) {
      fileIDs.push(item.imageFileID)
      fileIDMap.set(item.imageFileID, index)
    }
  })

  // 批量获取临时 URL（如果有图片）
  if (fileIDs.length > 0) {
    try {
      const tempResult = await cloud.getTempFileURL({
        fileList: fileIDs,
      })

      // 将临时 URL 更新到对应的轮播图数据中
      tempResult.fileList.forEach(file => {
        if (file.tempFileURL) {
          const index = fileIDMap.get(file.fileID)
          if (index !== undefined) {
            result.data[index].imageUrl = file.tempFileURL
          }
        }
      })
    } catch (error) {
      console.error('获取临时URL失败:', error)
      // 即使获取临时URL失败，也继续返回数据（可能部分图片显示失败）
    }
  }

  return {
    success: true,
    data: result.data
  }
}

// 添加轮播图
async function addBanner({ type, content, imageUrl, imageFileID, link, order, enabled = true }) {
  const result = await db.collection('banners').add({
    data: {
      type, // 'text' 或 'image'
      content: content || '',
      imageUrl: imageUrl || '',
      imageFileID: imageFileID || '',
      link: link || '',
      order: order || 0,
      enabled,
      createTime: new Date(),
      updateTime: new Date()
    }
  })

  return {
    success: true,
    data: { _id: result._id }
  }
}

// 更新轮播图
async function updateBanner({ id, type, content, imageUrl, imageFileID, link, order, enabled }) {
  const updateData = {
    updateTime: new Date()
  }

  if (type !== undefined) updateData.type = type
  if (content !== undefined) updateData.content = content
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl
  if (imageFileID !== undefined) updateData.imageFileID = imageFileID
  if (link !== undefined) updateData.link = link
  if (order !== undefined) updateData.order = order
  if (enabled !== undefined) updateData.enabled = enabled

  await db.collection('banners').doc(id).update({
    data: updateData
  })

  return { success: true }
}

// 删除轮播图
async function deleteBanner({ id }) {
  await db.collection('banners').doc(id).remove()
  return { success: true }
}

// 更新轮播图顺序
async function updateBannerOrder({ banners }) {
  const promises = banners.map((banner, index) => {
    return db.collection('banners').doc(banner.id).update({
      data: { order: index }
    })
  })

  await Promise.all(promises)
  return { success: true }
}
