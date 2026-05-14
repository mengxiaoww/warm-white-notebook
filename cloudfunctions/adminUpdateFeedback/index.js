// 云函数：更新反馈状态
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { id, status, reply } = event

  try {
    const updateData = {
      updateTime: new Date()
    }

    if (status !== undefined) {
      updateData.status = status
    }

    if (reply !== undefined) {
      updateData.reply = reply
      updateData.replyTime = new Date()
    }

    await db.collection('feedbacks').doc(id).update({
      data: updateData
    })

    return { success: true }
  } catch (error) {
    console.error('更新反馈状态失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
