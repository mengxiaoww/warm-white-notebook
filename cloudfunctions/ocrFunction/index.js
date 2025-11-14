// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-9gzf2w8c9c9b7b73'
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { imgBase64, imgType } = event
    
    if (!imgBase64) {
      return {
        success: false,
        error: '未收到图片数据',
        items: []
      }
    }
    
    // 将base64转换为buffer
    const imgBuffer = Buffer.from(imgBase64, 'base64')
    
    console.log('图片大小:', imgBuffer.length, 'bytes')
    console.log('图片类型:', imgType)
    
    // 根据图片类型设置contentType
    let contentType = 'image/png'
    if (imgType === 'jpeg' || imgType === 'jpg') {
      contentType = 'image/jpeg'
    } else if (imgType === 'webp') {
      contentType = 'image/webp'
    }
    
    // 调用微信OCR接口
    console.log('准备调用OCR接口...')
    const result = await cloud.openapi.ocr.printedText({
      img: {
        contentType: contentType,
        value: imgBuffer
      }
    })
    
    console.log('OCR接口原始返回:', JSON.stringify(result, null, 2))
    
    // 检查返回结果的结构
    if (result.errCode && result.errCode !== 0) {
      console.error('OCR接口返回错误:', result.errCode, result.errMsg)
      return {
        success: false,
        error: result.errMsg || '识别失败',
        errCode: result.errCode,
        items: []
      }
    }
    
    const items = result.items || []
    console.log('识别到的文字数量:', items.length)
    
    if (items.length > 0) {
      console.log('识别到的文字内容:')
      items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.text}`)
      })
    }
    
    return {
      success: true,
      items: items,
      itemCount: items.length
    }
  } catch (err) {
    console.error('OCR识别错误详情:', err)
    
    // 详细的错误信息
    let errorMessage = '识别失败'
    if (err.errCode === -1) {
      errorMessage = '系统繁忙，请稍后再试'
    } else if (err.errCode === 87014) {
      errorMessage = '图片内容违规'
    } else if (err.errCode === 40001) {
      errorMessage = 'access_token无效'
    } else if (err.errMsg) {
      errorMessage = err.errMsg
    }
    
    return {
      success: false,
      error: errorMessage,
      errCode: err.errCode,
      items: []
    }
  }
}