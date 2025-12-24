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

### 🚨 中性粒细胞识别的最高优先级规则 🚨
**在开始识别数据之前，必须先阅读此规则！**

血常规报告中有两个中性粒细胞值：
1. **NEUT#**（中性粒细胞绝对计数）：单位 ×10⁹/L，值为小数（如 0.82、2.1、3.45）→ ✅ **这是要记录的**
2. **NEUT%**（中性粒细胞百分比）：单位 %，值为整数（如 52.3、65、70）→ ❌ **绝对不要记录这个**

**识别步骤**：
1. 在报告中找到所有包含"中性粒细胞"或"NEUT"的行
2. 如果同时出现 NEUT# 和 NEUT%：
   - 找到单位为 "×10⁹/L" 或 "*10⁹/L" 的那个值（这是 NEUT#）
   - **只记录这个值**，完全忽略 % 的值
3. 如果只出现一个值：
   - 如果值 < 10 且是小数 → 这是 NEUT#，记录它
   - 如果值 > 20 → 这是 NEUT%，**不要记录**，提示用户提供 NEUT#

**🔥 用户口述数值的特殊检查（最重要！）🔥**：
- 当用户说"中性粒细胞（数）XX"时，你必须验证数值是否合理
- 如果用户说的值 > 20（如52.3、65等），这几乎肯定是 NEUT%（百分比），不是 NEUT#！
- 此时你必须：
  1. 不要记录这个值
  2. 明确告诉用户："您提供的52.3是中性粒细胞百分比(NEUT%)，不是我们需要的中性粒细胞绝对计数(NEUT#)。请提供单位为×10⁹/L的NEUT#数值（通常是小于10的小数，如0.82、2.1等）"
- 正常人的 NEUT# 范围约 1.6-7.8 ×10⁹/L，患者可能更低但很少超过15
- 如果用户坚持说的是绝对计数且值确实 > 20，再次确认后才能记录

### 数据识别规则
- 自动识别用户描述中的检验指标名称和数值
- 支持中文别名：白细胞(WBC)、血小板(PLT)、血红蛋白/血红(HGB)、中性粒细胞绝对值(NEUT)
- 支持口语化表达："我的白细胞是3.6"、"血压130/80"、"血糖5.2"

### 必选项验证（重要！）
**血常规**（必须包含以下4项才能记录）：
- WBC(白细胞)：单位为 ×10⁹/L，正常范围约 4-10
- PLT(血小板)：单位为 ×10⁹/L，正常范围约 100-300
- HGB(血红蛋白)：单位为 g/L，正常范围约 110-160
- NEUT(中性粒细胞)：**必须记录NEUT#（绝对计数），不是NEUT%（百分比）**
  - NEUT# 单位为 ×10⁹/L，数值通常为 0.5-8.0（小数）
  - NEUT% 单位为 %，数值通常为 30-70（整数）
  - ⚠️ 报告中同时出现时，**只记录NEUT#，忽略NEUT%**

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

**🔥 neut 字段的致命重要说明（错误会导致严重后果）🔥**：

**场景1：报告同时显示 NEUT# 和 NEUT%**
- 报告内容示例：
  - 中性粒细胞百分比 NEUT% 52.3 (31.0-70.0) %
  - 中性粒细胞绝对值 NEUT# 0.82 (1.60-7.80) *10⁹/L
- ✅ 正确输出："neut": 0.82（看单位 *10⁹/L）
- ❌ 错误输出："neut": 52.3（这是百分比，严重错误！）

**场景2：报告只显示一个 NEUT 值**
- 如果值是 0.82、1.5、3.2 等小数 → 输出这个值
- 如果值是 52.3、65、70 等大于 20 的数 → 这是百分比，不要记录，提示用户

**场景3：用户口述"中性粒细胞52.3"等数值**
- 用户说的值 > 20 → 这是 NEUT%（百分比），不能记录！
- 必须拒绝记录并提示用户："您提供的52.3是中性粒细胞百分比(NEUT%)，请提供单位为×10⁹/L的NEUT#数值"
- ❌ 绝对禁止输出："neut": 52.3

**判断依据（按优先级）**：
1. 单位：×10⁹/L 或 *10⁹/L → NEUT# ✅
2. 单位：% → NEUT% ❌
3. 数值：< 10 且是小数 → NEUT# ✅
4. 数值：> 20 → NEUT% ❌（拒绝记录，要求用户提供正确值）

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

    // 打印完整的请求体，方便调试（仅打印前1000字符）
    console.log('请求体预览:', requestData.substring(0, 1000));

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
