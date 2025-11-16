// AI API配置文件
// 硅基流动API配置 - 直接使用本地配置，不依赖环境变量

module.exports = {
  // ⚠️ 硅基流动API密钥（当前密钥已失效，需要更新）
  //
  // 如何获取新密钥：
  // 1. 访问 https://cloud.siliconflow.cn/account/ak
  // 2. 登录后复制新的API密钥
  // 3. 替换下面的 SILICONFLOW_API_KEY 值
  // 4. 在微信开发者工具中右键该云函数，选择"上传并部署"
  //
  // 如果出现401错误，说明密钥无效或已过期，请按上述步骤更新
  SILICONFLOW_API_KEY: 'sk-cndegqdbkovskqyxtggodvbnbrkjhvvothawanetjlabmqva',

  // API配置
  API_URL: 'api.siliconflow.cn',
  API_PATH: '/v1/chat/completions',

  // 模型配置
  MODEL: 'THUDM/glm-4-9b-chat',

  // 默认参数
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_TOP_P: 0.7,
  DEFAULT_MAX_TOKENS: 2000
};
