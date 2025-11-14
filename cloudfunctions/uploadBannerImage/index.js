const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 上传轮播图图片到云存储
exports.main = async (event, context) => {
  const { fileContent, fileName } = event

  try {
    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(fileContent.replace(/^data:image\/\w+;base64,/, ''), 'base64')

    // 生成云存储路径，添加时间戳确保唯一性
    const cloudPath = `banners/${fileName}`

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer,
    })

    // 获取临时访问链接（用于预览）
    const tempURLResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID],
    })

    // 返回fileID和临时URL
    // fileID用于存储到数据库，每次获取时都会重新生成临时URL
    // 这样可以确保URL始终有效
    return {
      success: true,
      data: {
        fileID: uploadResult.fileID,
        url: tempURLResult.fileList[0].tempFileURL
      }
    }
  } catch (error) {
    console.error('上传轮播图失败:', error)
    return {
      success: false,
      error: error.message || '上传失败'
    }
  }
}
