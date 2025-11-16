// AI API配置文件
// 注意：此文件仅用于本地开发测试，生产环境请使用云函数环境变量配置

module.exports = {
  // 硅基流动API密钥
  // 生产环境：在云函数环境变量中配置 SILICONFLOW_API_KEY
  // 开发环境：可以在此处临时配置（切记不要提交到Git）
  SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY || 'sk-cndegqdbkovskqyxtggodvbnbrkjhvvothawanetjlabmqva',

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
