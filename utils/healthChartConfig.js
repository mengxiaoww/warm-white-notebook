const dataTypeGroups = [
  {
    id: 'blood',
    name: '血常规',
    color: '#FFB84D',
    types: [0, 1, 2, 3]
  },
  {
    id: 'liver',
    name: '肝功能',
    color: '#FF9800',
    types: [4, 5, 6, 7]
  },
  {
    id: 'kidney',
    name: '肾功能',
    color: '#FFCC80',
    types: [8, 9, 10]
  },
  {
    id: 'virus',
    name: '病毒指标',
    color: '#FFB84D',
    types: [11, 12]
  },
  {
    id: 'enzyme',
    name: '酶类指标',
    color: '#FF9800',
    types: [13]
  },
  {
    id: 'vitals',
    name: '生命体征',
    color: '#FF5722',
    types: [14, 15, 16, 17]
  },
  {
    id: 'lifestyle',
    name: '生活指标',
    color: '#FFB84D',
    types: [18, 19, 20, 21]
  }
];

const dataTypes = [
  // 血常规 (索引 0-3)
  { key: 'wbc', name: '白细胞', unit: '×10⁹/L', icon: 'W', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [4.0, 10.0], collection: 'bloodTests', desc: '免疫细胞' },
  { key: 'plt', name: '血小板', unit: '×10⁹/L', icon: 'P', iconBg: '#FFCC80', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [100, 300], collection: 'bloodTests', desc: '凝血功能' },
  { key: 'hgb', name: '血红蛋白', unit: 'g/L', icon: 'H', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [120, 160], collection: 'bloodTests', desc: '载氧能力' },
  { key: 'neut', name: '中性粒细胞', unit: '×10⁹/L', icon: 'N', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [2.0, 7.0], collection: 'bloodTests', desc: '感染指标' },

  // 肝功能 (索引 4-7)
  { key: 'alt', name: 'ALT', unit: 'U/L', icon: 'ALT', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [9, 50], collection: 'liverFunctionTests', desc: '谷丙转氨酶' },
  { key: 'ast', name: 'AST', unit: 'U/L', icon: 'AST', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [15, 40], collection: 'liverFunctionTests', desc: '谷草转氨酶' },
  { key: 'tbil', name: '总胆红素', unit: 'μmol/L', icon: 'TBIL', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [3.4, 17.1], collection: 'liverFunctionTests', desc: '肝功能指标' },
  { key: 'dbil', name: '直接胆红素', unit: 'μmol/L', icon: 'DBIL', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [1.7, 6.8], collection: 'liverFunctionTests', desc: '肝功能指标' },

  // 肾功能 (索引 8-10)
  { key: 'cr', name: '肌酐', unit: 'μmol/L', icon: 'CR', iconBg: '#FFCC80', color: '#FFCC80', lightColor: '#FFF3E0', normalRange: [44, 133], collection: 'kidneyFunctionTests', desc: '肾功能指标' },
  { key: 'bun', name: '尿素氮', unit: 'mmol/L', icon: 'BUN', iconBg: '#FFCC80', color: '#FFCC80', lightColor: '#FFF3E0', normalRange: [2.9, 8.2], collection: 'kidneyFunctionTests', desc: '肾功能指标' },
  { key: 'ua', name: '尿酸', unit: 'μmol/L', icon: 'UA', iconBg: '#FFCC80', color: '#FFCC80', lightColor: '#FFF3E0', normalRange: [208, 428], collection: 'kidneyFunctionTests', desc: '肾功能指标' },

  // 病毒指标 (索引 11-12)
  { key: 'ebvDna', name: 'EB病毒', unit: 'IU/mL', icon: 'E', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [0, 0], collection: 'ebvRecords', desc: 'DNA定量' },
  { key: 'hcmvDna', name: '巨细胞病毒', unit: 'IU/mL', icon: 'C', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [0, 0], collection: 'cmvRecords', desc: 'DNA定量' },

  // 酶类指标 (索引 13)
  { key: 'ldh', name: '乳酸脱氢酶', unit: 'U/L', icon: 'L', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [100, 240], collection: 'ldhRecords', desc: 'LDH水平' },

  // 生命体征 (索引 14-17)
  { key: 'bloodSugar', name: '血糖', unit: 'mmol/L', icon: 'BS', iconBg: '#FF5722', color: '#FF5722', lightColor: '#FFF3E0', normalRange: [3.9, 7.8], collection: 'bloodSugars', desc: '血糖水平' },
  { key: 'spo2', name: '血氧', unit: '%', icon: 'SpO2', iconBg: '#FF5722', color: '#FF5722', lightColor: '#FFF3E0', normalRange: [95, 100], collection: 'bloodOxygens', desc: '血氧水平' },
  { key: 'systolic', name: '高压', unit: 'mmHg', icon: 'SBP', iconBg: '#FF5722', color: '#FF5722', lightColor: '#FFF3E0', normalRange: [90, 140], collection: 'bloodPressures', desc: '高压' },
  { key: 'diastolic', name: '低压', unit: 'mmHg', icon: 'DBP', iconBg: '#FF5722', color: '#FF5722', lightColor: '#FFF3E0', normalRange: [60, 90], collection: 'bloodPressures', desc: '低压' },

  // 生活指标 (索引 18-22)
  { key: 'water', name: '饮水', unit: 'ml', icon: 'WI', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [1500, 2500], collection: 'waterIntakes', desc: '每日饮水' },
  { key: 'temperature', name: '体温', unit: '°C', icon: 'T', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [36.0, 37.3], collection: 'temperatures', desc: '体温监测' },
  { key: 'weight', name: '体重', unit: 'kg', icon: 'W', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [40, 100], collection: 'bodyMeasurements', desc: '体重管理' },
  { key: 'height', name: '身高', unit: 'cm', icon: 'H', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [140, 200], collection: 'bodyMeasurements', desc: '身高记录' }
];

const timeRanges = [
  { id: 30, label: '30天' },
  { id: 90, label: '90天' },
  { id: 180, label: '180天' },
  { id: 0, label: '全部' }
];

module.exports = {
  dataTypeGroups,
  dataTypes,
  timeRanges
};
