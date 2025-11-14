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
  }
];

const dataTypes = [
  { key: 'wbc', name: '白细胞', unit: '×10⁹/L', icon: 'W', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [4.0, 10.0], collection: 'bloodTests', desc: '免疫细胞' },
  { key: 'plt', name: '血小板', unit: '×10⁹/L', icon: 'P', iconBg: '#FFCC80', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [100, 300], collection: 'bloodTests', desc: '凝血功能' },
  { key: 'hgb', name: '血红蛋白', unit: 'g/L', icon: 'H', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [120, 160], collection: 'bloodTests', desc: '载氧能力' },
  { key: 'neut', name: '中性粒细胞', unit: '×10⁹/L', icon: 'N', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [2.0, 7.0], collection: 'bloodTests', desc: '感染指标' },
  { key: 'alt', name: 'ALT', unit: 'U/L', icon: 'ALT', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [9, 50], collection: 'liverFunctionTests', desc: '谷丙转氨酶' },
  { key: 'ast', name: 'AST', unit: 'U/L', icon: 'AST', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [15, 40], collection: 'liverFunctionTests', desc: '谷草转氨酶' },
  { key: 'tbil', name: '总胆红素', unit: 'μmol/L', icon: 'TBIL', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [3.4, 17.1], collection: 'liverFunctionTests', desc: '肝功能指标' },
  { key: 'dbil', name: '直接胆红素', unit: 'μmol/L', icon: 'DBIL', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [1.7, 6.8], collection: 'liverFunctionTests', desc: '肝功能指标' },
  { key: 'cr', name: '肌酐', unit: 'μmol/L', icon: 'CR', iconBg: '#FFCC80', color: '#FFCC80', lightColor: '#FFF3E0', normalRange: [44, 133], collection: 'kidneyFunctionTests', desc: '肾功能指标' },
  { key: 'bun', name: '尿素氮', unit: 'mmol/L', icon: 'BUN', iconBg: '#FFCC80', color: '#FFCC80', lightColor: '#FFF3E0', normalRange: [2.9, 8.2], collection: 'kidneyFunctionTests', desc: '肾功能指标' },
  { key: 'ua', name: '尿酸', unit: 'μmol/L', icon: 'UA', iconBg: '#FFCC80', color: '#FFCC80', lightColor: '#FFF3E0', normalRange: [208, 428], collection: 'kidneyFunctionTests', desc: '肾功能指标' },
  { key: 'ebvDna', name: 'EB病毒', unit: 'IU/mL', icon: 'E', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [0, 0], collection: 'ebvRecords', desc: 'DNA定量' },
  { key: 'hcmvDna', name: '巨细胞病毒', unit: 'IU/mL', icon: 'C', iconBg: '#FFB84D', color: '#FFB84D', lightColor: '#FFF3E0', normalRange: [0, 0], collection: 'cmvRecords', desc: 'DNA定量' },
  { key: 'ldh', name: '乳酸脱氢酶', unit: 'U/L', icon: 'L', iconBg: '#FF9800', color: '#FF9800', lightColor: '#FFF3E0', normalRange: [100, 240], collection: 'ldhRecords', desc: 'LDH水平' }
];

const timeRanges = [
  { id: 7, label: '7天' },
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
