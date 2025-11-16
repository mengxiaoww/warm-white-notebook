// AI API配置文件
// 硅基流动API配置 - 直接使用本地配置，不依赖环境变量

module.exports = {
  // 硅基流动API密钥
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
