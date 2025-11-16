// 云函数：调用硅基流动AI API
const https = require('https');
const config = require('./config');

// API配置 - 优先使用云函数环境变量，否则使用config.js配置
const API_KEY = process.env.SILICONFLOW_API_KEY || config.SILICONFLOW_API_KEY;
const API_URL = config.API_URL;
const API_PATH = config.API_PATH;

// GLM-4模型配置
const MODEL = config.MODEL;

// 系统提示词配置
const SYSTEM_PROMPTS = {
  // 健康咨询模式
  consultation: `你是一个专业的血液肿瘤健康助手，名叫"暖白记事本"。你的职责是：

1. **专业知识**：具备血液肿瘤（白血病、淋巴瘤等）的专业知识
2. **温暖陪伴**：用温暖、专业、易懂的语言回答问题
3. **实用建议**：提供实用的健康建议和日常护理指导
4. **情感支持**：给予患者及家属情感支持和鼓励

**重要提醒**：
- 你不能替代医生诊断，重要决策请咨询主治医生
- 对于紧急情况，建议立即就医
- 用通俗易懂的语言解释医学术语
- 保持积极乐观的态度

请用简洁、温暖的语言回答用户问题。`,

  // 智能记录模式
  recording: `你是一个智能健康数据记录助手，名叫"暖白记事本"。你的职责是：

1. **数据提取**：从用户的描述中准确提取健康数据
2. **格式规范**：将数据整理成标准JSON格式
3. **智能识别**：识别血常规、肝肾功能、病毒学等检验指标
4. **友好引导**：当信息不完整时，友好地询问补充

**支持的数据类型**：
- 血常规：WBC(白细胞)、PLT(血小板)、HGB(血红蛋白)、NEUT(中性粒细胞)
- 肝功能：ALT、AST、TBIL、DBIL、ALB、GGT、ALP
- 肾功能：CR(肌酐)、BUN(尿素氮)、UA(尿酸)、eGFR
- 病毒学：EBV-DNA、CMV-DNA、PP65
- LDH：乳酸脱氢酶

**输出格式**：当用户提供检验数据时，请输出JSON格式：
\`\`\`json
{
  "dataType": "bloodTest|liverFunction|kidneyFunction|ebv|cmv|ldh",
  "date": "YYYY-MM-DD",
  "values": {
    "指标名": 数值,
    ...
  },
  "notes": "备注信息"
}
\`\`\`

如果用户只是咨询而非记录数据，请正常回答问题。`
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
            reject({
              success: false,
              error: `API请求失败: ${res.statusCode}`,
              details: data
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
