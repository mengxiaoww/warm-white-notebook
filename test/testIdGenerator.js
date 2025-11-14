// 测试ID生成器
const { generateCustomIndicatorId, generateTimeBasedId } = require('../utils/idGenerator');



// 测试中文指标名称
const testCases = [
  '白细胞',
  '血红蛋白',
  '中性粒细胞',
  '淋巴细胞绝对值',
  '丙氨酸氨基转移酶',
  '总胆红素',
  '肌酐',
  '尿素氮',
  'C反应蛋白',
  'HIV抗体',
  '甲状腺激素',
  '血糖',
  '糖化血红蛋白',
  '自定义指标1',
  '未知指标'
];


testCases.forEach(name => {
  const id = generateCustomIndicatorId(name);
  console.log(`${name} => ${id}`);
});


const testName = '白细胞';
for (let i = 0; i < 5; i++) {
  console.log(`${testName} => ${generateCustomIndicatorId(testName)}`);
}


for (let i = 0; i < 3; i++) {
  console.log(`TimeBasedId ${i} => ${generateTimeBasedId()}`);
  // 添加小延迟确保时间戳不同
  require('child_process').execSync('sleep 0.001');
}
