// 云函数：调用硅基流动AI API
const https = require('https');
const config = require('./config');

// API配置 - 直接使用config.js配置
const API_KEY = config.SILICONFLOW_API_KEY;
const API_URL = config.API_URL;
const API_PATH = config.API_PATH;

// GLM-4模型配置
const MODEL = config.MODEL;

// 系统提示词配置
const SYSTEM_PROMPTS = {
  // 统一模式（整合咨询和记录功能）
  unified: `你是一个专业的血液肿瘤健康助手，名叫"暖白记事本"。你的职责是：

1. **健康咨询**：回答血液肿瘤（白血病、淋巴瘤等）相关的健康问题
2. **智能记录**：帮助用户记录健康数据

**回答健康问题时**：
- 用温暖、专业、易懂的语言回答
- 提供实用的健康建议和日常护理指导
- 给予患者及家属情感支持和鼓励
- 重要提醒：不能替代医生诊断，重要决策请咨询主治医生

**记录健康数据时**：
- 识别用户描述中的检验指标
- 将数据整理成标准JSON格式输出
- 当信息不完整时，友好地询问补充

**支持的数据类型**：
- 血常规：WBC(白细胞)、PLT(血小板)、HGB(血红蛋白)、NEUT(中性粒细胞)
- 肝功能：ALT、AST、TBIL、DBIL、ALB、GGT、ALP
- 肾功能：CR(肌酐)、BUN(尿素氮)、UA(尿酸)、eGFR
- 病毒学：EBV-DNA、CMV-DNA、PP65
- LDH：乳酸脱氢酶

**数据输出格式**（仅在用户提供检验数据时使用）：
\`\`\`json
{
  "dataType": "bloodTest|liverFunction|kidneyFunction|ebv|cmv|ldh",
  "date": "YYYY-MM-DD",
  "values": {
    "指标名": 数值
  },
  "notes": "备注信息"
}
\`\`\`

请用简洁、温暖的语言回答问题。`,

  // 保留原有模式以兼容
  consultation: `你是一个专业的血液肿瘤健康助手，名叫"暖白记事本"...`,
  recording: `你是一个智能健康数据记录助手，名叫"暖白记事本"...`
};

/**
 * 调用硅基流动AI API
 * @param {Array} messages - 消息历史
 * @param {String} mode - 模式：'consultation'(咨询) 或 'recording'(记录)
 * @param {Boolean} stream - 是否使用流式响应
 */
function callSiliconFlowAPI(messages, mode = 'consultation', stream = false) {
  return new Promise((resolve, reject) => {
    // 添加系统提示词
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.consultation
    };

    const requestData = JSON.stringify({
      model: MODEL,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      top_p: 0.7,
      max_tokens: 2000,
      stream: stream
    });

    const options = {
      hostname: API_URL,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            if (result.choices && result.choices.length > 0) {
              resolve({
                success: true,
                content: result.choices[0].message.content,
                usage: result.usage
              });
            } else {
              reject({
                success: false,
                error: 'API返回格式错误',
                details: result
              });
            }
          } else {
            // 处理HTTP错误状态码
            let errorMessage = `API请求失败: ${res.statusCode}`;
            let errorDetails = data;

            if (res.statusCode === 401) {
              errorMessage = 'API密钥无效或已过期(401)';
              errorDetails = '请访问 https://cloud.siliconflow.cn/account/ak 获取新密钥';
            } else if (res.statusCode === 429) {
              errorMessage = 'API请求频率超限(429)';
              errorDetails = '请稍后再试';
            } else if (res.statusCode === 500) {
              errorMessage = 'API服务器错误(500)';
              errorDetails = '服务器内部错误,请稍后再试';
            }

            reject({
              success: false,
              error: errorMessage,
              details: errorDetails
            });
          }
        } catch (error) {
          reject({
            success: false,
            error: '解析响应失败',
            details: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: '网络请求失败',
        details: error.message
      });
    });

    req.write(requestData);
    req.end();
  });
}

// 云函数入口
exports.main = async (event, context) => {
  try {
    const { messages, mode = 'consultation', stream = false } = event;

    // 验证参数
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: '参数错误：messages必须是非空数组'
      };
    }

    // 调用API
    const result = await callSiliconFlowAPI(messages, mode, stream);

    return result;

  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.error || '未知错误',
      details: error.details || error.message
    };
  }
};
