/**
 * 生成自定义指标ID的工具函数
 * 格式：custom_[指标名称拼音缩写]_[6位随机字符串]
 * 例如：custom_bxb_a3f2d1 (白细胞)
 */

// 简单的中文转拼音首字母映射（可扩展）
const pinyinMap = {
  '白': 'b', '细': 'x', '胞': 'b', '红': 'h', '血': 'x', '蛋': 'd',
  '板': 'b', '淋': 'l', '巴': 'b', '中': 'z', '性': 'x', '粒': 'l',
  '肝': 'g', '功': 'g', '能': 'n', '肾': 's', '病': 'b', '毒': 'd',
  '尿': 'n', '素': 's', '氮': 'd', '肌': 'j', '酐': 'g', '酸': 's',
  '碱': 'j', '谷': 'g', '丙': 'b', '转': 'z', '氨': 'a', '酶': 'm',
  '总': 'z', '胆': 'd', '醇': 'c', '甘': 'g', '油': 'y', '三': 's',
  '脂': 'z', '高': 'g', '密': 'm', '度': 'd', '低': 'd', '载': 'z',
  '钾': 'j', '钠': 'n', '氯': 'l', '钙': 'g', '磷': 'l', '镁': 'm',
  '铁': 't', '锌': 'x', '铜': 't', '硒': 'x', '碘': 'd', '维': 'w',
  '生': 's', '叶': 'y', '酸': 's', '糖': 't', '化': 'h', '血': 'x',
  '清': 'q', '蛋': 'd', '白': 'b', '球': 'q', '比': 'b', '值': 'z',
  '前': 'q', '降': 'j', '钙': 'g', '素': 's', '原': 'y', '甲': 'j',
  '状': 'z', '腺': 'x', '激': 'j', '促': 'c', '皮': 'p', '质': 'z',
  '醇': 'c', '睾': 'g', '酮': 't', '雌': 'c', '二': 'e', '醇': 'c',
  '孕': 'y', '酮': 't', '泌': 'm', '乳': 'r', '素': 's', '卵': 'l',
  '泡': 'p', '刺': 'c', '黄': 'h', '体': 't', '绒': 'r', '毛': 'm',
  '膜': 'm', '促': 'c', '性': 'x', '腺': 'x', '抗': 'k', '体': 't',
  '免': 'm', '疫': 'y', '球': 'q', '蛋': 'd', '补': 'b', '体': 't',
  '淀': 'd', '粉': 'f', '酶': 'm', '脂': 'z', '肪': 'f', '酶': 'm'
};

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} - 随机字符串
 */
function generateRandomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 中文转拼音首字母
 * @param {string} chinese - 中文字符串
 * @returns {string} - 拼音首字母串
 */
function chineseToPinyinInitials(chinese) {
  let result = '';
  for (let i = 0; i < chinese.length && result.length < 4; i++) {
    const char = chinese[i];
    if (pinyinMap[char]) {
      result += pinyinMap[char];
    } else if (/[a-zA-Z]/.test(char)) {
      // 如果是英文字符，直接使用
      result += char.toLowerCase();
    }
  }
  return result || 'zdy'; // 如果没有匹配到，返回"自定义"的缩写
}

/**
 * 生成自定义指标ID
 * @param {string} indicatorName - 指标名称
 * @returns {string} - 生成的ID
 */
function generateCustomIndicatorId(indicatorName) {
  // 获取拼音首字母缩写
  const pinyinAbbr = chineseToPinyinInitials(indicatorName);
  
  // 生成6位随机字符串
  const randomStr = generateRandomString(6);
  
  // 组合成最终ID
  return `custom_${pinyinAbbr}_${randomStr}`;
}

/**
 * 基于时间戳生成简短ID（备用方案）
 * @returns {string} - 生成的ID
 */
function generateTimeBasedId() {
  // 使用36进制来缩短时间戳
  const timestamp = Date.now().toString(36);
  const random = generateRandomString(4);
  return `custom_${timestamp}_${random}`;
}

module.exports = {
  generateCustomIndicatorId,
  generateTimeBasedId,
  generateRandomString
};