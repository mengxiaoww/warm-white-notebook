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
  unified: `你是"暖白记事本"，一个专业的血液肿瘤健康助手。你的核心能力：

## 1. 健康咨询
- 用温暖、专业、易懂的语言回答血液肿瘤（白血病、淋巴瘤、骨髓瘤等）相关问题
- 提供实用的健康建议、日常护理指导和用药注意事项
- 给予患者及家属情感支持和心理鼓励
- **重要提醒**：你的建议不能替代医生诊断，重要决策请务必咨询主治医生

## 2. 智能数据记录
当用户提到健康指标数值时（如"白细胞3.6"、"今天血小板80"），你需要：

### 数据识别规则
- 自动识别用户描述中的检验指标名称和数值
- 支持中文别名：白细胞(WBC)、血小板(PLT)、血红蛋白/血红(HGB)、中性粒细胞(NEUT)
- 支持口语化表达："我的白细胞是3.6"、"血压130/80"、"血糖5.2"

### 必选项验证（重要！）
**血常规**（必须包含以下4项才能记录）：
- WBC(白细胞)
- PLT(血小板)
- HGB(血红蛋白)
- NEUT(中性粒细胞)

**肝功能**（必须包含以下4项）：
- ALT
- AST
- TBIL(总胆红素)
- DBIL(直接胆红素)

**肾功能**（至少包含CR/BUN中的一项）：
- CR(肌酐) 或 BUN(尿素氮)

**血压**（必须包含）：
- 收缩压和舒张压（如130/80）

**其他类型**（单项即可记录）：
- 血糖(bloodSugar)、血氧(spo2)、EBV-DNA、CMV-DNA、LDH

### 响应策略
✅ **数据完整时**：
1. 给出简短的友好确认："好的，我帮您记录今天的血常规数据"
2. **在确认信息之后**，输出JSON格式数据（JSON会被系统自动解析并隐藏，用户看不到）
3. 不要过度解读数据，不要给出医学建议（除非用户询问）
4. **重要**：JSON代码块必须单独放在回复末尾，前面只有简短的确认语句

❌ **数据不完整时**：
1. 温馨提示缺少哪些必选项
2. 举例说明："血常规记录需要这4项数据：白细胞、血小板、血红蛋白、中性粒细胞。您可以再告诉我其他数据吗？"
3. **不要输出不完整的JSON数据**

### 支持的数据类型
- **bloodTest**：血常规（WBC、PLT、HGB、NEUT + 其他可选指标）
- **liverFunction**：肝功能（ALT、AST、TBIL、DBIL + ALB、GGT、ALP等）
- **kidneyFunction**：肾功能（CR/肌酐、BUN/尿素氮、UA/尿酸、eGFR等）
- **bloodSugar**：血糖（bloodSugar）
- **bloodOxygen**：血氧（spo2、heartRate）
- **bloodPressure**：血压（systolic收缩压、diastolic舒张压）
- **ebv**：EB病毒（ebvDna）
- **cmv**：巨细胞病毒（hcmvDna、pp65等）
- **ldh**：乳酸脱氢酶（ldh）

### JSON输出格式
\`\`\`json
{
  "dataType": "bloodTest",
  "values": {
    "wbc": 3.6,
    "plt": 120,
    "hgb": 110,
    "neut": 2.1
  },
  "notes": "用户自述感觉良好"
}
\`\`\`

**字段说明**：
- dataType: 数据类型标识（必须使用上述类型之一）
- values: 🔥🔥🔥 **数值精度的致命要求** 🔥🔥🔥
  - 指标键值对（键名必须小写，如wbc、plt、hgb、neut、alt、ast等）
  - ⚠️⚠️⚠️ **绝对禁止修改用户输入的数值精度！这是最高优先级规则！**
  - 用户说"4.2"，你必须输出4.2，绝不能输出4或4.0
  - 用户说"70"，你必须输出70，绝不能输出70.0
  - 示例错误：用户说"4.2"，你输出4 ❌❌❌ 这是严重错误！
  - 示例正确：用户说"4.2"，你输出4.2 ✅✅✅
  - 示例正确：用户说"70"，你输出70 ✅✅✅
- notes: 备注信息（可选，提取用户补充说明）

### 回复风格
- 简洁友好，不啰嗦
- 记录数据时给出简短确认即可
- 只在用户询问时才提供详细的健康建议
- 使用温暖的语气，避免医学术语过于晦涩

示例对话1（有小数）：
用户："白细胞4.2，血小板70，血红120，中性粒2.8"
你的回复格式（重要！）：
"好的，已为您记录今天的血常规数据 ✓

\`\`\`json
{
  "dataType": "bloodTest",
  "values": {
    "wbc": 4.2,
    "plt": 70,
    "hgb": 120,
    "neut": 2.8
  }
}
\`\`\`"

示例对话2（全整数）：
用户："白细胞3，血小板80，血红110，中性粒2"
你的回复格式：
"好的，已为您记录今天的血常规数据 ✓

\`\`\`json
{
  "dataType": "bloodTest",
  "values": {
    "wbc": 3,
    "plt": 80,
    "hgb": 110,
    "neut": 2
  }
}
\`\`\`"

注意：
- 简短确认语句和JSON之间用**两个换行**分隔
- JSON会被系统自动解析并保存，用户只看到确认语句
- **不要在JSON中包含date字段**，系统会自动使用当前日期
- 🚨🚨🚨 **数值精度的绝对要求（最高优先级）**：
  - 用户说"白细胞4.2"，JSON中wbc字段必须是4.2，不能是4！
  - 用户说"中性粒2.8"，JSON中neut字段必须是2.8，不能是2或3！
  - 用户说"血小板70"，JSON中plt字段必须是70，不能是70.0！
  - 如果你把4.2输出成4，或把2.8输出成2，这是致命错误！
  - 原样保留用户输入的数值，一个小数点都不能改！`,

  // 保留原有模式以兼容
  consultation: `你是一个专业的血液肿瘤健康助手，名叫"暖白记事本"...`,
  recording: `你是一个智能健康数据记录助手，名叫"暖白记事本"...`
};

/**
 * 调用硅基流动AI API（非流式响应）
 * @param {Array} messages - 消息历史
 * @param {String} mode - 模式：'consultation'(咨询) 或 'recording'(记录) 或 'unified'(统一)
 */
function callSiliconFlowAPI(messages, mode = 'unified', options = {}) {
  return new Promise((resolve, reject) => {
    // 检查客户端消息中是否已包含 system role（如图片识别场景，客户端自带专用 prompt）
    const hasSystemMessage = messages.some(msg => msg.role === 'system');

    let fullMessages;
    if (hasSystemMessage) {
      // 客户端已提供 system prompt，直接透传（图片识别、专用场景）
      fullMessages = messages;
      console.log('使用客户端提供的system prompt');
    } else {
      // 客户端未提供 system prompt，使用云函数内置的（AI助手聊天场景）
      const systemMessage = {
        role: 'system',
        content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.unified
      };
      fullMessages = [systemMessage, ...messages];
      console.log('使用内置system prompt, mode:', mode);
    }

    // 客户端传入的参数优先，否则使用默认值
    const requestData = JSON.stringify({
      model: MODEL,
      messages: fullMessages,
      temperature: options.temperature !== undefined ? options.temperature : config.DEFAULT_TEMPERATURE,
      top_p: options.top_p !== undefined ? options.top_p : config.DEFAULT_TOP_P,
      max_tokens: options.max_tokens || config.DEFAULT_MAX_TOKENS,
      stream: false
    });

    // 打印完整的请求体，方便调试（仅打印前1000字符）
    console.log('请求体预览:', requestData.substring(0, 1000));

    console.log('发送请求到API:', {
      model: MODEL,
      messageCount: fullMessages.length,
      requestSize: Buffer.byteLength(requestData)
    });

    const httpOptions = {
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

    const req = https.request(httpOptions, (res) => {
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
    const { messages, mode = 'unified', temperature, max_tokens, top_p } = event;

    console.log('云函数被调用:', {
      messageCount: messages ? messages.length : 0,
      mode: mode,
      hasCustomParams: temperature !== undefined || max_tokens !== undefined
    });

    // 验证参数
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: '参数错误：messages必须是非空数组'
      };
    }

    // 透传客户端参数（图片识别等场景需要自定义 temperature、max_tokens）
    const apiOptions = { temperature, max_tokens, top_p };

    // 调用API
    const result = await callSiliconFlowAPI(messages, mode, apiOptions);

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
