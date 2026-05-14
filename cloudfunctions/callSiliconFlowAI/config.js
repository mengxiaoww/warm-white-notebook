// AI API配置文件
// 硅基流动API配置 - 直接使用本地配置，不依赖环境变量

module.exports = {
  // 硅基流动API密钥
  SILICONFLOW_API_KEY: 'sk-cndegqdbkovskqyxtggodvbnbrkjhvvothawanetjlabmqva',

  // API配置
  API_URL: 'api.siliconflow.cn',
  API_PATH: '/v1/chat/completions',

  // 模型配置 - 使用Qwen2.5-VL-72B大模型，精度远高于30B-A3B
  MODEL: 'Pro/Qwen/Qwen2.5-VL-72B-Instruct',

  // 默认参数
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_TOP_P: 0.7,
  DEFAULT_MAX_TOKENS: 2000
};
