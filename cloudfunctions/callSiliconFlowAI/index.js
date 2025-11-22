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
 * 调用硅基流动AI API（非流式响应）
 * @param {Array} messages - 消息历史
 * @param {String} mode - 模式：'consultation'(咨询) 或 'recording'(记录) 或 'unified'(统一)
 */
function callSiliconFlowAPI(messages, mode = 'unified') {
  return new Promise((resolve, reject) => {
    // 添加系统提示词
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.unified
    };

    // 构建完整的消息数组：系统提示词 + 用户消息
    const fullMessages = [systemMessage, ...messages];

    const requestData = JSON.stringify({
      model: MODEL,
      messages: fullMessages,
      temperature: config.DEFAULT_TEMPERATURE,
      top_p: config.DEFAULT_TOP_P,
      max_tokens: config.DEFAULT_MAX_TOKENS,
      stream: false
    });

    console.log('发送请求到API:', {
      model: MODEL,
      messageCount: fullMessages.length,
      requestSize: Buffer.byteLength(requestData)
    });

    const options = {
      hostname: API_URL,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 50000
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      console.log('收到API响应，状态码:', res.statusCode);

      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      res.on('end', () => {
        try {
          console.log('API响应完成，数据长度:', responseData.length);
          const jsonResponse = JSON.parse(responseData);

          // 检查是否有错误
          if (jsonResponse.error) {
            console.error('API返回错误:', jsonResponse.error);
            reject({
              success: false,
              error: jsonResponse.error.message || 'API返回错误',
              details: JSON.stringify(jsonResponse.error)
            });
            return;
          }

          // 提取AI回复内容
          if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
            const content = jsonResponse.choices[0].message.content;
            console.log('AI回复成功，内容长度:', content.length);
            resolve({ success: true, content: content });
          } else {
            console.error('API响应格式错误:', responseData);
            reject({ success: false, error: 'API响应格式错误', details: responseData });
          }
        } catch (error) {
          console.error('解析API响应失败:', error.message);
          reject({ success: false, error: '解析API响应失败', details: error.message });
        }
      });

      res.on('error', (error) => {
        console.error('响应错误:', error.message);
        reject({ success: false, error: '响应错误', details: error.message });
      });
    });

    req.on('error', (error) => {
      console.error('网络请求失败:', error.message);
      reject({ success: false, error: '网络请求失败', details: error.message });
    });

    req.on('timeout', () => {
      console.error('API请求超时');
      req.destroy();
      reject({ success: false, error: 'API请求超时' });
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * 调用硅基流动AI API（流式响应）
 * @param {Array} messages - 消息历史
 * @param {String} mode - 模式：'consultation'(咨询) 或 'recording'(记录)
 * @param {Function} onChunk - 接收到数据块的回调函数
 */
function callSiliconFlowAPIStream(messages, mode = 'consultation', onChunk) {
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
      stream: true
    });

    const options = {
      hostname: API_URL,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: 50000
    };

    const req = https.request(options, (res) => {
      let buffer = '';
      let fullContent = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留最后一行不完整的数据

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') {
            resolve({ success: true, content: fullContent });
            return;
          }

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // 移除 "data: " 前缀
              const data = JSON.parse(jsonStr);

              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                const content = data.choices[0].delta.content;
                fullContent += content;

                // 调用回调函数，传递增量内容
                if (onChunk) {
                  onChunk(content);
                }
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e, line);
            }
          }
        }
      });

      res.on('end', () => {
        if (fullContent) {
          resolve({ success: true, content: fullContent });
        } else {
          reject({ success: false, error: 'API响应为空' });
        }
      });

      res.on('error', (error) => {
        reject({ success: false, error: '响应错误', details: error.message });
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: '网络请求失败', details: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ success: false, error: 'API请求超时' });
    });

    req.write(requestData);
    req.end();
  });
}

// 云函数入口
exports.main = async (event, context) => {
  try {
    const { messages, mode = 'unified' } = event;

    console.log('云函数被调用:', {
      messageCount: messages ? messages.length : 0,
      mode: mode
    });

    // 验证参数
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: '参数错误：messages必须是非空数组'
      };
    }

    // 调用API
    const result = await callSiliconFlowAPI(messages, mode);

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
