# 多次记录功能优化实施计划

## 一、需求分析

### 当前问题
用户反馈：尿量、排便、饮食、饮水、血糖、血氧、血压这些记录项**一天会记录多次**，但当前实现存在以下问题：
1. **饮食、饮水、血糖、血氧、血压**：一天只能保存一条记录，保存后返回首页，"+"入口消失
2. **尿量、排便**：已支持多次记录，但缺乏统一的交互体验

### 用户期望
1. 添加一次后保留"+"入口，可以继续添加
2. 能够查看当天的多次记录
3. 每条记录可以单独编辑/删除

## 二、技术现状分析

### 2.1 数据库设计
**已支持多次记录（一天多条）：**
- `urineRecords` - 尿量记录（包含 time、volume、color、clarity、notes 字段）
- `stoolRecords` - 排便记录（包含 datetime、type、color、consistency等字段）

**当前一天一条记录：**
- `bloodSugars` - 血糖记录
- `bloodOxygens` - 血氧记录
- `bloodPressures` - 血压记录
- `waterIntakes` - 饮水记录
- `diets` - 饮食记录

### 2.2 UI实现模式

**尿量/排便页面（多次记录模式）：**
```
[packageB/pages/urine-record/]
- index.wxml：列表页面 + 弹窗表单
- 显示今日统计（总量、次数）
- 记录列表（可编辑/删除每条）
- "添加记录"按钮 -> 弹出表单
- 保存后留在当前页面，刷新列表
```

**饮食/饮水/血糖/血氧/血压页面（单次记录模式）：**
```
[packageD/pages/diet/]
- index.wxml：完整表单页面
- 保存逻辑：检查当天是否有记录 -> 有则更新，无则新增
- 保存成功后：wx.navigateBack() 返回首页
```

## 三、优化方案设计

### 方案对比

#### 方案A：完全改造为列表模式（推荐）⭐

**优点：**
- 与尿量/排便统一，用户体验一致
- 适合多次记录场景
- 代码结构清晰

**缺点：**
- 改动较大，需要重构页面
- 需要设计时间选择（如饮水可能一小时记录多次）

**实现要点：**
1. 数据库：添加 `time` 或 `datetime` 字段
2. 页面：改为列表+弹窗模式
3. 保存：每次都新增记录（不再更新）
4. 每日记录页：显示记录次数

#### 方案B：保持表单页 + 底部增加历史记录区

**优点：**
- 改动最小
- 保持原有交互习惯

**缺点：**
- 页面内容多，可能显得拥挤
- 与尿量/排便体验不一致
- 仍需处理"一天一条"问题

#### 方案C：首次表单 + 后续列表（不推荐）

**优点：**
- 兼顾两种模式

**缺点：**
- 交互不一致，用户困惑
- 实现复杂

### 推荐方案：方案A

参考尿量页面，将5个功能改为列表+弹窗模式。

## 四、详细实施计划

### 4.1 数据库调整

#### 需要添加时间字段
所有集合添加 `time` 字段（HH:MM格式）或 `datetime` 字段：

```javascript
// 血糖记录
{
  _id: xxx,
  openid: xxx,
  profileId: xxx,
  date: '2025-12-20',    // 日期
  time: '08:30',         // 新增：时间点
  bloodSugar: 5.6,       // 血糖值
  fbg: 5.2,              // 空腹血糖
  pbg: 7.8,              // 餐后血糖
  customValues: {},      // 自定义指标
  notes: '',             // 备注
  createTime: xxx,
  updateTime: xxx
}
```

#### 查询逻辑调整
```javascript
// 之前：查询当天唯一记录
db.collection('bloodSugars').where({
  openid, profileId, date
}).get()

// 之后：查询当天所有记录，按时间排序
db.collection('bloodSugars').where({
  openid, profileId, date
}).orderBy('time', 'desc').get()
```

### 4.2 页面重构

#### 页面结构（参考尿量页面）

```xml
<!-- 以血糖为例 -->
<view class="page-container">
  <!-- 导航栏 -->
  <t-navbar title="血糖记录" />

  <!-- 日期选择 + 添加按钮 -->
  <view class="date-section">
    <view class="date-selector">{{selectedDate}}</view>
    <t-button bindtap="addRecord">添加记录</t-button>
  </view>

  <!-- 统计信息（可选） -->
  <view class="summary" wx:if="{{records.length > 0}}">
    <text>今日记录：{{records.length}} 次</text>
    <text>平均血糖：{{avgBloodSugar}}</text>
  </view>

  <!-- 记录列表 -->
  <scroll-view class="records-list">
    <view wx:for="{{records}}" wx:key="_id" class="record-item">
      <view class="record-time">{{item.time}}</view>
      <view class="record-values">
        <text wx:if="{{item.bloodSugar}}">血糖: {{item.bloodSugar}}</text>
        <text wx:if="{{item.fbg}}">空腹: {{item.fbg}}</text>
        <!-- 其他指标 -->
      </view>
      <view class="record-actions">
        <button bindtap="editRecord" data-id="{{item._id}}">编辑</button>
        <button bindtap="deleteRecord" data-id="{{item._id}}">删除</button>
      </view>
    </view>
  </scroll-view>

  <!-- 空状态 -->
  <view class="empty-state" wx:if="{{records.length === 0}}">
    <text>暂无记录</text>
  </view>
</view>

<!-- 添加/编辑弹窗 -->
<t-popup visible="{{showDialog}}" placement="bottom">
  <view class="form-container">
    <view class="form-header">
      <text>{{isEditMode ? '编辑记录' : '添加记录'}}</text>
    </view>

    <!-- 时间选择 -->
    <view class="form-item">
      <text>记录时间</text>
      <t-picker value="{{formData.time}}" />
    </view>

    <!-- 各项指标输入 -->
    <view class="form-item" wx:for="{{displayedIndicators}}" wx:key="id">
      <text>{{item.name}}</text>
      <input type="digit" value="{{formData[item.id]}}" />
      <text>{{item.unit}}</text>
    </view>

    <!-- 备注 -->
    <textarea placeholder="备注（选填）" value="{{formData.notes}}" />

    <!-- 操作按钮 -->
    <view class="form-actions">
      <button bindtap="closeDialog">取消</button>
      <button bindtap="saveRecord">保存</button>
    </view>
  </view>
</t-popup>
```

#### JS逻辑重构

```javascript
Page({
  data: {
    records: [],           // 当天所有记录
    showDialog: false,     // 弹窗显示状态
    isEditMode: false,     // 编辑模式
    editingRecordId: '',   // 编辑中的记录ID
    formData: {},          // 表单数据
    selectedDate: '',      // 选中的日期
    displayedIndicators: [] // 显示的指标列表
  },

  // 添加记录
  addRecord() {
    this.setData({
      showDialog: true,
      isEditMode: false,
      formData: {
        time: this.getCurrentTime(), // 默认当前时间
        // 其他字段初始化为空
      }
    });
  },

  // 保存记录
  async saveRecord() {
    const { formData, selectedDate, isEditMode, editingRecordId } = this.data;

    if (isEditMode) {
      // 更新现有记录
      await db.collection('bloodSugars').doc(editingRecordId).update({
        data: formData
      });
    } else {
      // 新增记录
      await db.collection('bloodSugars').add({
        data: {
          ...formData,
          openid,
          profileId,
          date: selectedDate,
          createTime: db.serverDate()
        }
      });
    }

    // 关闭弹窗，刷新列表
    this.setData({ showDialog: false });
    this.loadRecords();
  },

  // 加载当天记录
  async loadRecords() {
    const res = await db.collection('bloodSugars')
      .where({ openid, profileId, date: this.data.selectedDate })
      .orderBy('time', 'desc')
      .get();

    this.setData({ records: res.data });
  },

  // 编辑记录
  editRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.records.find(r => r._id === id);

    this.setData({
      showDialog: true,
      isEditMode: true,
      editingRecordId: id,
      formData: { ...record }
    });
  },

  // 删除记录
  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id;

    await wx.showModal({ title: '确认删除？' });
    await db.collection('bloodSugars').doc(id).remove();

    this.loadRecords();
  }
});
```

### 4.3 每日记录页面调整

```javascript
// pages/daily-record/index.js

// 加载今日数据统计
async loadTodayStatistics() {
  const today = getTodayLocalDate();

  // 查询各项记录的次数
  const bloodSugarCount = await this.getRecordCount('bloodSugars', today);
  const waterIntakeCount = await this.getRecordCount('waterIntakes', today);
  // ...其他记录项

  this.setData({
    'todayData.bloodSugarCount': bloodSugarCount,
    'todayData.waterIntakeCount': waterIntakeCount
    // ...
  });
}

async getRecordCount(collection, date) {
  const res = await db.collection(collection)
    .where({ openid, profileId, date })
    .count();
  return res.total;
}
```

```xml
<!-- pages/daily-record/index.wxml -->

<!-- 功能卡片显示记录次数 -->
<view class="function-item" bindtap="navigateToBloodSugar">
  <view class="function-icon">🩸</view>
  <view class="function-name">血糖</view>
  <view class="function-badge" wx:if="{{todayData.bloodSugarCount > 0}}">
    {{todayData.bloodSugarCount}}次
  </view>
  <view class="add-icon">+</view>
</view>
```

### 4.5 需要修改的文件清单

#### 血糖 (Blood Sugar)
- `packageA/pages/blood-sugar/index.js` - 完整重构
- `packageA/pages/blood-sugar/index.wxml` - 完整重构
- `packageA/pages/blood-sugar/index.wxss` - 样式调整

#### 血氧 (Blood Oxygen)
- `packageA/pages/blood-oxygen/index.js`
- `packageA/pages/blood-oxygen/index.wxml`
- `packageA/pages/blood-oxygen/index.wxss`

#### 血压 (Blood Pressure)
- `packageA/pages/blood-pressure/index.js`
- `packageA/pages/blood-pressure/index.wxml`
- `packageA/pages/blood-pressure/index.wxss`

#### 饮水 (Water Intake)
- `packageD/pages/water-intake/index.js`
- `packageD/pages/water-intake/index.wxml`
- `packageD/pages/water-intake/index.wxss`

#### 饮食 (Diet)
- `packageD/pages/diet/index.js`
- `packageD/pages/diet/index.wxml`
- `packageD/pages/diet/index.wxss`

#### 每日记录页面
- `pages/daily-record/index.js` - 添加记录次数统计
- `pages/daily-record/index.wxml` - 显示次数徽章

## 五、实施步骤

### 阶段1：单个页面试点（血糖）
1. 备份原有代码
2. 参考尿量页面重构血糖页面
3. 测试完整流程
4. 用户验证

### 阶段2：推广到其他页面
1. 血氧页面
2. 血压页面
3. 饮水页面
4. 饮食页面

### 阶段3：每日记录页面优化
1. 添加记录次数统计
2. 优化显示效果

### 阶段4：测试与优化
1. 全面测试
2. 性能优化
3. 用户反馈收集

## 六、注意事项

### 6.1 数据迁移
现有的"一天一条"数据需要兼容：
- 如果记录没有 `time` 字段，默认显示为 "09:00" 或 "全天"
- 保持历史数据可读

### 6.2 配置系统兼容
当前的指标配置系统（indicatorConfig）仍然按天存储，保持不变

### 6.3 图表展示
健康图谱页面展示时：
- 一天多条记录时，可以取平均值
- 或者显示所有记录点
- 提供选项让用户选择展示方式

### 6.4 AI识别
OCR和AI智能识别功能需要适配：
- 识别出多个时间点的数据
- 可以批量导入多条记录

## 七、风险评估

### 高风险
- **数据结构变更**：需要仔细测试，确保不影响现有数据
- **大量代码重构**：容易引入bug

### 中风险
- **用户习惯改变**：部分用户可能需要适应新交互
- **性能影响**：多条记录查询需要优化

### 低风险
- **UI适配**：主要是样式调整

## 八、成功标准

1. ✅ 用户可以一天内多次记录
2. ✅ "+"入口始终保留
3. ✅ 可以查看、编辑、删除每条记录
4. ✅ 显示当天统计信息
5. ✅ 与尿量/排便体验统一
6. ✅ 历史数据兼容
7. ✅ 性能无明显下降

## 九、时间估算

- 阶段1（试点）：2-3天
- 阶段2（推广）：4-5天
- 阶段3（首页优化）：1天
- 阶段4（测试）：2天

**总计：9-11天**

## 十、备选方案（如果完全重构工作量太大）

### 简化方案：仅解决"+"消失问题

**最小改动**：
1. 保存成功后不返回首页（注释掉 `wx.navigateBack()`）
2. 显示"保存成功，继续添加"提示
3. 清空表单，允许继续输入
4. 底部增加"查看历史"按钮 -> 跳转到健康档案对应日期

**优点**：
- 改动极小，风险低
- 快速实现

**缺点**：
- 仍然是"更新"而非"新增"，最新输入会覆盖之前的
- 无法真正实现"多次记录"

---

**结论**：建议采用方案A（完全改造为列表模式），虽然工作量较大，但能彻底解决问题并提供最佳用户体验。
