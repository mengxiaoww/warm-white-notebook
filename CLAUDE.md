# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个微信小程序项目，面向白血病、淋巴瘤等血液肿瘤患者及家属的日常健康记录工具，支持多档案管理、检验指标记录、用药管理、AI智能助手等功能。

**技术栈**
- 微信小程序（基础库 ≥ 2.2.3）
- 微信云开发 + 云数据库
- TDesign Miniprogram 组件库
- ECharts 图表库
- 硅基流动 AI API（GLM模型）

**云环境 ID**: `cloud1-9gzf2w8c9c9b7b73`（在 app.js 中配置，切换环境时需要修改）

## 开发流程

### 构建和运行

1. **安装 npm 依赖**
   - 在微信开发者工具中使用 npm
   - 执行 `miniprogram_npm/tdesign-miniprogram` 构建

2. **部署云函数**
   - 进入 `cloudfunctions/<云函数名>`
   - 右键"上传并部署（云端安装依赖）"
   - 主要云函数：`getOpenId`、`initDatabase`、`ocrFunction`、`callSiliconFlowAI`

3. **初始化数据库**
   - 手动运行 `initDatabase` 云函数创建基础集合
   - 在云数据库控制台手动创建其他必要集合
   - 关键：为所有集合创建 `openid` 索引，为记录类集合创建 `openid+profileId+date` 联合索引

### 发布部署

- 在微信开发者工具中点击"上传"按钮上传代码
- 登录微信小程序后台提交审核
- OCR 功能需要在小程序后台开通相应权限

## 架构设计

### 登录与用户系统

**登录流程**（参考 `app.js`）：
1. 调用 `getOpenId` 云函数获取 `openid`
2. 检查用户是否完成注册（查询 `users` 集合）
3. 如果未注册，引导用户完成资料填写（头像、昵称、年龄等）
4. 登录成功后初始化数据库集合

**档案管理**：
- 用户基本信息（如头像、昵称）存储在 `users` 集合
- 档案详细信息存储在 `userProfiles`（支持多档案）
- 档案包含：realName/name、gender、age、disease、hospital、isDefault 等字段
- 当前档案 ID 保存在 Storage 的 `currentProfileId` 和 globalData.currentProfile
- 所有记录类数据必须关联 `openid` 和 `profileId`

**全局状态**（`app.js` globalData）：
- `openid`：用户唯一标识
- `userInfo`：用户基本信息（头像、昵称等）
- `currentProfile`：当前档案信息（包括 profileId、name、disease 等）
- `isCreatingProfile`：防止重复创建档案的全局锁
- `needRefreshData`：标记数据变更，通知其他页面刷新

### 页面结构

**主要页面**（TabBar）：
- `pages/home`：首页（每日记录、数据可视化、健康图谱）
- `pages/daily-record`：每日记录（功能入口、快速记录）
- `pages/ai-assistant`：AI助手"暖白记事本"（健康咨询、智能解析）
- `pages/records`：健康档案（历史数据查询、详情展示）
- `pages/profile`：我的（登录、档案管理、设置）

**分包结构**：
- `packageA/tests`：检验类页面（血常规、肝肾功能及其配置页）
- `packageB/records`：记录类页面（用药、门诊、尿量、排便等）
- `packageC/virus`：病毒学页面（EBV、CMV、LDH 记录与配置）

### 数据库设计

**用户与档案**：
- `users`：openid、avatarUrl、nickName、age、gender、disease、hospital、registrationComplete
- `userProfiles`：openid、realName/name、gender、age、disease、primaryDiseaseCategory、secondaryDiseaseCategory、hospital、isDefault
- `userBasicInfo`：用户基本信息集合（用于跨设备同步）

**记录类集合**（所有记录都关联 openid + profileId）：
- `bloodTests`：血常规（wbc、plt、hgb、neut、customValues）
- `liverFunctionTests`：肝功能（alt、ast、tbil、dbil、alb、ggt、alp）
- `kidneyFunctionTests`：肾功能（cr/creatinine、bun/urea、ua、egfr/gfr、cysc、b2mg）
- `ebvRecords`：EB病毒（ebvDna、result、customValues）
- `cmvRecords`：巨细胞病毒（hcmvDna、pp65 等抗体类）
- `ldhRecords`：乳酸脱氢酶（ldh、aHbdh、ldhRatio）
- `urineRecords`：尿量（datetime、volume、color、clarity、frequency、notes）
- `stoolRecords`：排便（datetime、type、color、consistency、hasBlood、hasMucus、frequency、notes）
- `clinicRecords`：门诊（date、hospital、department、doctor、diagnosis、prescription、advice、cost、followUpDate、notes）
- `medications`：用药（按天存储，medicines[] + id、name、dosage、timesPerDay[]、timeSlotStatus{早/中/晚/睡前}、taken、startDate、endDate、notes）

**辅助数据**：
- `keyDates`：重要日期（openid、profileId、title、date）
- `todayTasks`：今日待办（openid、profileId、title、completed、date）
- `feedbacks`：用户反馈（openid、content、contact、status: pending/processing/resolved）
- `functionCustomConfig`：功能项自定义配置（openid、profileId、functionList[]）
- `banners`：轮播图（type、content、imageUrl、link、order、enabled）
- `aiChatHistory`：AI对话历史（openid、role、content、time、mode、createTime）

**指标配置**（用于自定义指标的名称、单位与参考范围映射）：
- `userIndicatorSettings`（血常规）
- `ebvIndicatorSettings`、`cmvIndicatorSettings`、`ldhIndicatorSettings`
- `liverFunctionSettings`、`kidneyFunctionSettings`

**数据查询原则**：
- 所有集合查询必须包含 `openid` 条件
- 记录类集合查询必须同时包含 `openid + profileId`
- `app.js` 中已自动创建 `users`、`userProfiles`、`keyDates`、`todayTasks` 的 `openid` 索引

### 云函数架构

**基础云函数**：
1. `getOpenId`：获取当前用户 `openid`（登录流程使用）
2. `initDatabase`：初始化数据库集合（包括 bloodTests、virusRecords、organFunctionRecords、urineRecords、stoolRecords、medications、functionCustomConfig、banners、feedbacks）
3. `ocrFunction`：调用微信 OCR API 识别图片（`openapi.ocr.printedText`）
4. `callSiliconFlowAI`：调用硅基流动 AI API，支持统一模式（健康咨询+智能记录），基于 GLM-4-9B-Chat 模型

**管理员云函数**（admin 相关）：
- `adminLogin`、`adminApi`、`adminGetUsers`、`adminGetRecords`、`adminGetFeedbacks`、`adminUpdateFeedback`、`adminGetStats`、`adminGetUserDetail`、`adminManageBanners`、`adminManageSettings`、`uploadBannerImage`

**数据维护云函数**：
- `checkProfileData`、`fixProfileData`：档案数据检查与修复
- `cleanDatabase`：数据库清理
- `listAllUsers`：列出所有用户
- `migrateIcons`：图标迁移

**重要提示**：
- `ocrFunction` 云函数中的 `cloud.init` 目前固定为某环境 ID `cloud1-9gzf2w8c9c9b7b73`，建议改为 `cloud.DYNAMIC_CURRENT_ENV` 或替换为你自己的 `envId`
- `callSiliconFlowAI` 需要在云函数配置中设置环境变量 `SILICONFLOW_API_KEY`

### 自定义指标系统

**基本概念**：
- 标准指标：如 WBC、PLT（固定字段）直接存储到对应字段
- 自定义指标：用户添加的额外指标存储在 `customValues` 字段
- 每个自定义指标 ID 由 `utils/idGenerator.js` 生成（格式：`custom_xxx_xxxxxx`）
- 指标配置：存储在对应的 `*Settings` 集合中（包括 id、name、unit、minValue、maxValue、customOrder）

**配置页面**：
- `packageA/pages/blood-test-config`：血常规指标配置
- `packageA/pages/liver-function-config`：肝功能指标配置
- `packageA/pages/kidney-function-config`：肾功能指标配置
- `packageC/pages/ebv-config`、`cmv-config`、`ldh-config`：病毒学指标配置

### ECharts 图表集成

**图表配置**：
- `pages/health-chart`：健康图谱页面
- `ec-canvas`：ECharts 组件封装
- `ec-canvas/echarts.js`：精简版 ECharts 库

**功能特性**：
- 支持查看 7/30/90/180 天和全部时间范围
- 多条数据曲线对比
- 参考范围区域标注
- 异常值高亮显示
- 贝塞尔曲线平滑渲染
- 智能数字格式化

### UI 设计规范

**主题颜色**：
- 主色调：温暖米金色 `#D4A574`
- 辅助色：橘黄色 `#FFB84D`
- 背景色：温暖白色系渐变
- 强调色：现代化阴影系统

**组件使用**：
- 主要使用 TDesign Miniprogram 组件库
- 全局注册组件：t-button、t-input、t-cell、t-icon、t-tabs、t-calendar、t-popup、t-dialog、t-toast、t-message、t-upload、t-image
- 自定义组件：medical-icon（医疗图标）

**视觉风格**：
- 所有记录页面使用精致的卡片设计（多层阴影、圆角）
- 关键操作提供微动画反馈（按钮缩放、渐变过渡）
- 所有列表统一使用米金色主题

## 常见开发任务

### 修改云环境

1. **修改环境 ID**（迁移到新的云环境时）：
   - `app.js` 第 8 行：`env: '你的envId'`
   - `cloudfunctions/ocrFunction/index.js` 第 5 行：建议改为 `cloud.DYNAMIC_CURRENT_ENV` 或替换为你的环境 ID

2. **初始化数据库**：
   - 手动运行 `initDatabase` 云函数
   - 在云数据库控制台补充创建其他集合（参考数据库模型部分）
   - 关键：创建索引（openid、openid+profileId+date）

3. **OCR 配置修改**：
   - 确保云函数 `cloudfunctions/ocrFunction/config.json` 包含权限配置
   - 确认小程序后台开通了 `openapi.ocr.printedText` 权限

### 开发新功能

1. **档案关联**：
   - 所有记录类操作必须关联 `openid` 和 `profileId`
   - 使用 `app.getCurrentProfileId()` 获取当前档案 ID
   - 使用 `app.getOpenIdIfLoggedIn()` 检查登录状态

2. **登录检查**：
   - 优先使用 `utils/auth.js` 中的 `getOpenIdIfLoggedIn()` 和 `handleNeedLogin()`
   - 页面可以混入 `authMixin`
   - **重要**：登录完成后必须调用 `app.initCurrentProfile(openid)` 初始化档案信息

3. **数据库操作规范**：
   - 务必加上权限校验条件（where 条件必须包含 `openid`）
   - 所有记录类数据必须包含 `profileId` 和 `date` 字段（格式：YYYY-MM-DD）
   - 使用 `db.serverDate()` 记录创建和更新时间

4. **防止重复创建档案**：
   - 使用全局锁 `app.globalData.isCreatingProfile`
   - 创建档案前检查锁状态，创建后释放锁

5. **图标系统架构**：
   - **图标只在代码中定义**：所有医疗图标在 `utils/medical-icons.js` 中定义，功能项图标通过 ICON_MAP 映射
   - **数据库不存储图标**：`functionCustomConfig` 集合只存储 id、name、visible、order、navigate
   - **图标获取方式**：前端代码根据功能项的 id 从 ICON_MAP 中查找对应图标名称
   - 图标映射位置：`pages/daily-record/index.js` 的 `loadMainPageFunctionConfig` 函数

6. **wxss 样式编写**：
   - 所有页面的样式都定义在各自的 wxss 文件中
   - 复用样式可以在 app.wxss 中定义
   - 避免使用过深的 CSS 选择器嵌套（不超过 4 层）

### AI 助手集成

**配置修改**（`pages/ai-assistant`）：

**API 配置**：
- 使用硅基流动（SiliconFlow）API
- 模型配置：Qwen 或 GLM
- API Key 配置：在云函数 `callSiliconFlowAI` 的环境变量中设置，或在配置页面中由用户输入

**功能特性**：
- 多模式切换（健康咨询/智能记录）
- 历史对话记录
- 数据自动解析（将用户描述转换为结构化数据）
- 自动保存到对应健康档案集合
- 消息流式渲染

### OCR 识别集成

**配置修改**（`packageB/pages/check-report`）：

**支持的识别类型**：
- 血常规：WBC、PLT、HGB、NEUT
- 肝功能：各项指标
- LDH：乳酸脱氢酶

**流程说明**：
- 使用 `check-report/index.js` 中的解析函数进行文本匹配
- 通过 `parseOcrResult()` 函数将文本转换为结构化数据

### 常见问题

1. **wx.cloud 初始化失败**：
   - 确认 `app.js` 中 `envId` 配置正确
   - 确认云函数已部署到正确的云环境

2. **OCR access_token 错误**：
   - 确认 `cloudfunctions/ocrFunction/config.json` 包含正确的权限配置
   - 确认使用了正确的云环境

3. **数据库查询为空**：
   - 确认已完成登录、已创建默认档案
   - 确认集合名与字段名大小写与本文档保持一致

4. **档案切换后数据不更新**：
   - 确认在 `app.initCurrentProfile(openid)` 后刷新当前档案
   - 确认页面监听了 `app.globalData.needRefreshData` 变更

## 项目结构参考

```
warm-white-notebook/
├── app.js / app.json / app.wxss          # 应用全局配置
├── pages/                                 # 主要页面
│   ├── home/                             # 首页：数据可视化、健康图谱
│   ├── daily-record/                     # 每日记录：快速功能入口
│   ├── ai-assistant/                     # AI助手"暖白记事本"
│   ├── records/                          # 健康档案：历史数据查询
│   └── profile/                          # 我的：登录、档案管理
├── packageA/                             # 检验类分包
├── packageB/                             # 记录类分包
├── packageC/                             # 病毒学分包
├── utils/                                # 工具函数
│   ├── auth.js                           # 登录认证工具
│   ├── idGenerator.js                    # 自定义指标 ID 生成器
│   └── util.js                           # 通用工具函数
├── ec-canvas/                            # ECharts 组件封装
├── custom-tab-bar/                       # 自定义 TabBar
├── cloudfunctions/                       # 云函数
│   ├── getOpenId/                        # 获取 openid
│   ├── initDatabase/                     # 初始化数据库
│   ├── ocrFunction/                      # OCR 识别
│   └── callSiliconFlowAI/                # AI API 调用
└── miniprogram_npm/                      # npm 构建输出（TDesign）
```

## 数据迁移说明

**历史数据迁移**：
- `app.js` 中的 `migrateUserData()` 将 `userProfiles` 数据迁移到 `users` 集合
- 迁移仅在用户登录时自动执行一次
- 迁移的数据会标记 `migratedFrom: 'userProfiles'`

**说明**：
- 用户基本信息（头像、昵称）应存储在 `users` 集合（全局唯一）
- 档案详细信息（疾病、医院）应存储在 `userProfiles`（支持多档案）

## 性能优化

1. **分包加载**：使用 `lazyCodeLoading: "requiredComponents"` 实现按需加载
2. **预加载规则**：配置 `preloadRule` 实现分包预加载
3. **图表性能**：使用精简版 ECharts，避免大数据量渲染
4. **云函数优化**：合理控制单次查询数据量
5. **缓存策略**：登录状态、档案信息等关键数据在 globalData 和 Storage 中双重缓存

## 注意事项

- 项目采用弱类型语言（JavaScript），编写时注意类型校验
- 所有用户数据必须关联 `openid` 以确保数据隔离
- 记录类数据务必关联 `openid` 和 `profileId`
- OCR 识别和数据解析功能仍在迭代（持续优化匹配准则）
- 尊重用户隐私，保护健康数据安全
