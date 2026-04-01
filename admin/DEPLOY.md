# 管理后台快速部署指南（无需匿名登录）

## ✅ 已解决的问题

**原错误**：`[ACCESS_TOKEN_DISABLED]` 匿名登录未开启

**新方案**：使用云函数 HTTP API，无需任何登录配置！

## 🚀 部署步骤

### 1. 部署云函数

在微信开发者工具中，右键上传 **adminApi** 云函数：

```
cloudfunctions/adminApi/
```

右键 → **上传并部署（云端安装依赖）**

### 2. 开启云函数 HTTP 访问

在微信开发者工具中：
1. 云开发控制台 → 云函数
2. 找到 **adminApi** 云函数
3. 点击"详情" → "触发器"
4. 添加触发器：
   - 触发方式：**HTTP**
   - 路径：`/admin-api`（可自定义）
   - 点击"确定"

记录生成的 HTTP 访问链接，格式类似：
```
https://cloud1-9gzf2w8c9c9b7b73.service.tcloudbase.com/admin-api
```

### 3. 配置前端 API 地址

修改 [admin/src/api/cloud.js](admin/src/api/cloud.js:6) 中的 API_URL：

```javascript
// 替换为你的云函数 HTTP 访问链接
const API_URL = 'https://cloud1-9gzf2w8c9c9b7b73.service.tcloudbase.com/admin-api'
```

### 4. 创建管理员账号

在云开发控制台创建 `admins` 集合，手动添加：

```json
{
  "username": "admin",
  "password": "admin123",
  "role": "admin"
}
```

**⚠️ 生产环境务必修改密码！**

### 5. 启动测试

```bash
cd admin
npm install
npm run dev
```

访问 http://localhost:3000，使用 admin/admin123 登录。

### 6. 生产部署

#### 方案一：云开发静态托管（推荐，免费）

```bash
npm run build
```

在微信开发者工具中：
- 云开发 → 静态网站托管
- 开启静态托管
- 上传 `dist` 目录所有文件

#### 方案二：其他静态托管

上传 `dist` 目录到：
- Vercel
- Netlify
- GitHub Pages
- 任意静态服务器

## 📝 新架构说明

### 旧方案（有问题）
```
浏览器 → 云开发 SDK → 匿名登录 → 云函数
              ❌ 需要开启匿名登录
```

### 新方案（无问题）
```
浏览器 → HTTP 请求 → 云函数 HTTP API → 数据库
              ✅ 无需任何登录配置
```

### 统一云函数 adminApi

所有管理后台操作通过一个云函数处理：

```javascript
// 登录
{ action: 'login', data: { username, password } }

// 获取用户列表
{ action: 'getUsers', data: { page, limit, keyword } }

// 获取统计数据
{ action: 'getStats', data: {} }

// 获取记录
{ action: 'getRecords', data: { recordType, openid } }

// 获取用户详情
{ action: 'getUserDetail', data: { openid } }
```

## 🔧 常见问题

### 1. 找不到触发器配置？

- 确保云函数已上传成功
- 在云开发控制台（而非微信开发者工具）配置
- 访问：https://console.cloud.tencent.com/tcb

### 2. HTTP 访问 404？

- 检查触发器路径是否正确
- 确认 API_URL 与触发器路径一致

### 3. CORS 错误？

- 云函数 HTTP API 默认支持跨域
- 如果仍有问题，在 `adminApi/index.js` 添加 CORS 头

### 4. 云函数超时？

- 数据量大时可能超时
- 在云函数配置中增加超时时间（最大 60 秒）

## 优势对比

| 方案 | 优势 | 劣势 |
|------|------|------|
| 匿名登录 | SDK 封装好 | 需要配置，可能被限制 |
| **HTTP API**（当前） | ✅ 无需配置 <br> ✅ 简单直接 <br> ✅ 易于调试 | 需要手动配置触发器 |

## 安全建议

1. **修改默认密码**
2. **密码加密存储**（推荐使用 bcrypt）
3. **增加 token 验证**（在云函数中校验）
4. **限制访问 IP**（在云函数中判断）
5. **使用 HTTPS**（云开发默认支持）

完成！🎉
