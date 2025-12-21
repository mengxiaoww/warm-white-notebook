# 暖白记事本（WeChat Mini Program）

面向白血病、淋巴瘤等血液肿瘤患者及家属的日常记录小程序，聚焦「检验结果」「用药计划」「今日待办」「门诊就诊」「尿量/排便」等关键场景。支持多档案、图表趋势分析与指标自定义，并集成AI智能助手，帮助持续追踪病程变化。

### 亮点

- 基于微信云开发（免服务器运维），本地登录态与云端数据结合，开箱即用
- 多档案管理（`userProfiles`），一键切换查看不同患者记录
- ECharts 健康图谱，支持 7/30/90/180 天与"全部时间"智能聚合
- **AI智能助手"暖白记事本"**：集成硅基流动国产大模型API，提供健康咨询和智能记录辅助
- 指标自定义与参考范围配置（如血常规/肝肾功能/血糖/病毒学等）
- OCR 云函数（微信开放平台 OCR）可用于化验单识别（已接好示例），目前代码内已包含对**血常规（WBC/PLT/HGB/NEUT）、肝功能、血糖（FBG/PBG/HbA1c/RBG）、LDH** 等关键指标的解析逻辑。

---

## 功能概览

- 首页（`pages/home`）

  - 每日记录轮播banner
  - 暖光里程碑（关键日期 `keyDates`）展示
  - **健康图谱数据可视化**：
    - 支持7种图表分组：血常规、肝功能、肾功能、病毒指标、酶类指标、生命体征、生活指标
    - 饮食图表优化：统计"每日饮食记录次数"，更符合实际使用场景
    - 支持多时间范围：30天/90天/180天/全部
    - 自定义指标支持：可显示用户配置的自定义健康指标
  - 一键进入各类记录功能
  - 日历视图与当日详情弹窗（当日所有记录聚合展示）
  - **功能项自定义编辑**：支持拖拽排序与显示开关控制，个性化功能项布局，配置数据按档案保存至云端

- AI助手"暖白记事本"（`pages/ai-assistant`）

  - **专业级ChatGPT风格界面**：
    - 系统导航栏 + 精致的浮动图标按钮（圆角方形、边框、阴影）
    - 左上角：菜单按钮（历史对话侧边栏）
    - 右上角：新建对话按钮
    - 交替灰白背景提升消息可读性
  - **历史对话功能**：
    - 左侧滑出抽屉展示历史对话列表
    - 按日期自动分组，显示首条消息预览和消息数量
    - 点击快速加载历史对话，平滑动画效果
  - **🎯 智能数据记录（NEW）**：
    - **自动识别健康数据**：当用户说"白细胞3.6，血小板120"时，AI自动识别并记录
    - **必选项验证**：血常规需要4项（WBC/PLT/HGB/NEUT），肝功能需要4项（ALT/AST/TBIL/DBIL），不完整时友好提示
    - **支持9种数据类型**：血常规、肝功能、肾功能、血糖、血氧、血压、EB病毒、巨细胞病毒、LDH
    - **口语化识别**：支持"我的白细胞是3.6"、"今天血糖5.2"等自然表达
    - **自动保存**：数据完整时自动保存到对应健康档案集合，来源标记为`ai_assistant`
  - **智能数据解析**：自动识别并解析血常规、肝肾功能、病毒学等检验指标
  - **对话历史**：保存完整对话记录到`aiChatHistory`集合，支持跨设备同步
  - **示例引导**：提供常见问题示例（白细胞低怎么办/化疗护理/今日血常规数据记录/GVHD解释等）
  - **精致交互设计**：
    - 用户消息：白色背景
    - AI消息：浅灰色背景（#F7F7F8）
    - 头像：方形圆角渐变色（用户橘色、AI绿色、系统蓝色）
    - 输入框：圆角边框、聚焦绿色高亮、微阴影效果

  > 📖 **详细文档**：查看 [AI助手智能记录功能说明.md](./AI助手智能记录功能说明.md) 了解完整使用指南和技术实现细节

- 健康档案（`pages/records`，原health-profile）

  - 时间范围/数据类型筛选
  - 按日聚合显示血常规、EBV、CMV、LDH、肝/肾功能、尿量、排便的当日摘要
  - 统一详情弹窗（支持标准指标 + 用户自定义指标映射）
  - 用药档案统计（实际服用天数/次数/不同药品数/日均）

- 我的（`pages/profile`）

  - 登录与注册：静默获取 openid + 资料完善（头像/昵称/年龄/疾病/医院）
  - 多档案管理：添加/编辑/删除/设为默认/切换（`userProfiles`）
  - 意见反馈（`feedbacks` 集合）与分享

- 记录类页面（均在 `packageB`/`packageA`/`packageC`）
  - **多次记录支持**（血糖、血氧、血压、饮水、饮食）：
    - 采用统一的列表+弹窗模式，支持一天内多次记录
    - 今日统计：显示记录次数、平均值等统计信息
    - 记录列表：按时间排序显示所有记录，支持单独编辑/删除
    - 空状态优化：统一的空状态提示文案，保持UI一致性
    - 自定义餐次选择器：饮食页面采用精美的按钮组替代默认Picker
  - 用药（`packageB/pages/medication`）：分时段（早/中/晚/睡前）勾选、历史/未来范围批量写入、停止/删除范围操作
  - 门诊（`packageB/pages/clinic-record`）：医院/科室/医生/诊断/费用/复诊
  - 尿量（`packageB/pages/urine-record`）：次数/总量/颜色/清澈度/备注
  - 排便（`packageB/pages/stool-record`）：性状/颜色/硬度/血丝/粘液/备注
  - 血常规、肝/肾功能、血糖、病毒学（`packageA/packageC`）：记录与自定义指标配置页
    - 血糖（`packageA/pages/blood-sugar`）：默认记录「血糖」指标，可选配置「空腹血糖」「餐后2小时血糖」「糖化血红蛋白」「随机血糖」

---

## 技术栈

- 微信小程序（基础库 ≥ 2.2.3），自定义 TabBar（`custom-tab-bar`）
- 微信云开发（`wx.cloud`）+ 云数据库
- 云函数：`getOpenId`、`initDatabase`、`ocrFunction`、`callSiliconFlowAI`
- 组件库：TDesign Miniprogram（已 `miniprogram_npm` 集成）
- 图表：ECharts（本地简化版）+ 自定义 `ec-canvas` 组件
- AI集成：硅基流动API（SiliconFlow）+ GLM-4-9B-Chat大模型

---

## 目录结构（关键项）

```
warm-white-notebook/
  app.json / app.js / app.wxss
  pages/
    home/           # 首页（整合每日记录、里程碑、图谱）
    ai-assistant/   # AI助手"暖白记事本"
    records/        # 健康档案（原health-profile）
    profile/        # 我的
    daily-record/   # 旧版每日记录（保留）
    health-profile/ # 旧版健康档案（保留）
    health-chart/   # 旧版健康图谱（保留）
  packageA/   # 检验类：血常规/肝/肾功能及其配置页/组合记录
  packageB/   # 记录类：用药/门诊/尿量/排便/档案完善/新增档案等
  packageC/   # 病毒学：EBV/CMV/LDH 记录与配置
  utils/      # auth、idGenerator、util
  ec-canvas/  # ECharts 封装
  custom-tab-bar/
  cloudfunctions/
    getOpenId/ initDatabase/ ocrFunction/ callSiliconFlowAI/
  miniprogram_npm/tdesign-miniprogram/
```

---

## 数据库模型（主要集合）

以下为项目实际使用到的核心集合（与代码一致，命名大小写需保持一致）：

- 用户与档案

  - `users`：openid、avatarUrl、nickName、age、gender、disease、hospital、registrationComplete、createTime、updateTime
  - `userBasicInfo`：**【新增】** openid、avatarUrl、nickName、createTime、updateTime（用户基本信息，独立于档案存储，支持跨设备同步）
  - `userProfiles`：openid、realName/name、gender、age、disease、primaryDiseaseCategory、secondaryDiseaseCategory、hospital、isDefault、createTime、updateTime

- 辅助

  - `keyDates`：openid、profileId、title（如"使用暖白记事本"）、date、createTime
  - `todayTasks`：openid、profileId、title、completed、date、createTime
  - `feedbacks`：openid、content、contact、createTime、status（pending/processing/resolved）
  - `functionCustomConfig`：openid、profileId、functionList[]（功能项配置）、createTime、updateTime
  - `aiChatHistory`：**【新增】** openid、role（user/assistant/system）、content、time、mode（consultation/recording）、createTime（AI对话历史记录）

- 检验与记录类

  - `bloodTests`：date、openid、profileId、wbc/plt/hgb/neut…、customValues（自定义指标）
  - `bloodSugars`：date、openid、profileId、bloodSugar/fbg/pbg/hba1c/rbg…、customValues（自定义指标）
  - `liverFunctionTests`：alt、ast、tbil、dbil、alb、ggt、alp…
  - `kidneyFunctionTests`：cr/creatinine、bun/urea、ua、egfr/gfr、cysc、b2mg…
  - `ebvRecords`：ebvDna、result、customValues …
  - `cmvRecords`：hcmvDna、pp65/抗体类等（视医院项目）
  - `ldhRecords`：ldh、aHbdh、ldhRatio…
  - `urineRecords`：date、time、volume、color、clarity、frequency、notes
  - `stoolRecords`：date、time、type、color、consistency、hasBlood、hasMucus、frequency、notes
  - `clinicRecords`：date、hospital、department、visitTime、doctor/职称、diagnosis、prescription、advice、cost、followUpDate、notes
  - `medications`：按天存储（date、openid、profileId、medicines[]），每个药品包含：id、name、dosage、timesPerDay[]、timeSlotStatus{时段:bool}、taken、startDate、endDate、notes

- 指标设置（用于自定义指标名、单位与参考范围映射）
  - `userIndicatorSettings`（血常规）
  - `bloodSugarIndicatorSettings`（血糖）、`bloodSugarIndicatorConfig`（血糖指标配置）
  - `ebvIndicatorSettings`、`cmvIndicatorSettings`、`ldhIndicatorSettings`、`liverFunctionSettings`、`kidneyFunctionSettings`

索引建议（强烈推荐）：

- 所有集合建立 `openid` 索引
- 记录类集合建立联合索引：`openid + profileId + date`
- `users`、`userProfiles` 按 `openid` 建索引；`keyDates`、`todayTasks` 已在 `app.js` 中自动创建 `openid` 索引

---

## 云函数

- `getOpenId`：返回当前用户 `openid`（登录流程用）
- `initDatabase`：初始化（或检查）集合存在性。当前函数仅覆盖部分集合，可按上述「数据库模型」自行补全（建议扩展为创建所有集合与通用索引）。
- `ocrFunction`：调用微信 OCR（`openapi.ocr.printedText`）识别图片中的文字，已做格式与错误处理。
- `callSiliconFlowAI`：**【新增 v1.1】** 调用硅基流动AI API的云函数，支持智能健康数据记录与健康咨询双模式。
  - **v1.1 更新（2024-01-15）**：
    - ✅ 重写系统提示词，明确9种数据类型的必选项验证规则
    - ✅ 血常规/肝功能/肾功能/血压等复合指标的完整性检查
    - ✅ 数据不完整时友好提示用户补充必选项
    - ✅ 支持口语化识别：白细胞=WBC、血红=HGB等别名
    - ✅ 自动记录功能：数据完整时立即输出JSON并保存到数据库
  - **基础功能**：基于THUDM/glm-4-9b-chat模型，需要配置环境变量 `SILICONFLOW_API_KEY`（从 https://cloud.siliconflow.cn/account/ak 获取）
  - **详细说明**：查看 [AI助手智能记录功能说明.md](./AI助手智能记录功能说明.md)

注意：
- `ocrFunction` 中的 `cloud.init` 目前固定为某环境 ID，如需迁移到你自己的环境，建议改为 `cloud.DYNAMIC_CURRENT_ENV` 或替换为你的 `envId`。
- `callSiliconFlowAI` 需要在云函数环境变量中设置 `SILICONFLOW_API_KEY`，可从 https://cloud.siliconflow.cn/account/ak 获取。

---

## 本地运行与部署

1. 准备环境

- 安装并登录微信开发者工具，打开本项目
- 在小程序设置中开启「云开发」，创建或选择你的云环境（记下 `envId`）

2. 环境配置

- 修改 `app.js` 中 `wx.cloud.init({ env: '你的envId' })`
- 修改 `cloudfunctions/ocrFunction/index.js` 中 `cloud.init({ env: '你的envId' })`（或改为 `DYNAMIC_CURRENT_ENV`）

3. 构建依赖

- 在微信开发者工具中，执行「工具 → 构建 npm」，确保 `miniprogram_npm/tdesign-miniprogram` 可用

4. 部署云函数

- 右键 `cloudfunctions/getOpenId`、`initDatabase`、`ocrFunction`，选择「上传并部署（云端安装依赖）」

5. 初始化数据库

- 在「云开发 → 数据库」中新建本文“数据库模型”中列出的集合（或先运行 `initDatabase` 创建部分集合，再补齐）
- 为建议项建立索引（`openid`、`openid+profileId+date`）

6. 运行调试

- 在微信开发者工具中点击「预览/真机调试」，完成登录并新建默认档案后即可开始记录

---

## 登录与档案

- 登录流程：先静默获取 `openid` → 判断是否已注册 → 已注册直接登录；未注册进入资料完善（头像/昵称/年龄/性别/疾病/医院）
- 档案：首次登录会创建默认档案（并写入“使用暖白记事本”里程碑）；可在「我的 → 个人档案」中添加/编辑/删除/设为默认/切换

---

## 图表与指标

- 图表页（`pages/health-chart`）对指标做单位、颜色、正常范围与异常提示配置，移动端渲染优化
- **贝塞尔曲线平滑渲染**：实现了基于Canvas的平滑曲线算法，支持二次和三次贝塞尔曲线，让图表线条更加柔和自然
  - 使用 `smooth` 参数控制平滑度（0-1，默认0.4）
  - 应用 `smoothMonotone` 保持单调性，避免过度弯曲
  - 圆角端点和连接点，增强视觉柔和感
  - 填充区域与折线使用相同的曲线算法，确保视觉一致性
- **智能数字格式化**：自动识别整数与小数，提供更清晰的数据展示
  - 整数直接显示（如 "30"），不显示多余的小数点
  - 小数保留一位（如 "30.5"）
  - 应用于Y轴标签、数据点标签、最新值显示
- **优雅的空状态设计**：温暖的橘黄色主题空状态图表
  - 渐变背景与光晕效果（#FFFBF5到#FFF8F0）
  - 温暖橘色图标与阴影效果
  - 友好的提示文字与视觉反馈
- **Y轴精准对齐**：网格线与Y轴刻度标签完美对齐，确保数据可视化的专业性
- **暖光里程碑单位显示**：倒数日期显示完整的"还有X天"/"已经X天"格式，单位使用渐变橘色主题
- 自定义指标：通过各配置页写入到 `customValues`，并在对应 `*Settings` 集合中维护名称/范围/单位映射
- 工具：`utils/idGenerator.js` 用于生成自定义指标 ID（如 `custom_xxx_xxxxxx`）

---

## 设计风格

- **现代轻奢主题（2025年优化）**：主色调温暖米金色 (#D4A574)与橘黄色系 (#FFB84D)，温暖白色系背景渐变，现代化阴影系统与圆角设计
- **首页优化**：
  - 温暖橘色主题统一应用（空状态图标、里程碑单位、按钮等）
  - 精致的微动画与交互反馈（按钮缩放、阴影变化、渐变过渡）
  - 优雅的卡片设计（多层阴影、圆角、渐变光效）
  - 精准的数据对齐（Y轴网格线与标签完美对齐）
- **每日记录页面**：应用主要入口页面，采用顶级产品视觉水准的现代化设计，包括精美的日历组件、高级操作按钮、优雅的卡片展示
- TDesign 小程序组件库：按钮、输入、弹窗、图标、标签、消息、上传等，统一使用米金色主题

---

## 常见问题（FAQ）

- 预览时报 `wx.cloud` 相关错误？请确认：
  1. 已在 `app.js` 正确设置 `envId` 并开启云开发
  2. 已部署云函数且选择了正确环境
- OCR 报 `access_token`/权限错误？确认 `cloudfunctions/ocrFunction/config.json` 包含 `openapi.ocr.printedText`，并使用了正确的云环境
- 数据查询为空？请确认已完成登录、已创建默认档案、集合名与字段名大小写与本 README 保持一致

---

## 贡献与计划

- 欢迎提交 PR / Issue，建议优先完善：
  - `initDatabase` 云函数，使其能自动创建所有集合与通用索引。
  - 各类记录的指标配置页面 UI 与输入校验逻辑。
  - 增强 OCR 结果与指标的自动匹配能力，适配更多格式的化验单，特别是对 

## License

本项目仅用于公益与学习目的，商用或大规模分发请先征得作者同意并遵守数据合规要求。
