# 管理后台配置指南

## 问题：找不到匿名登录设置

### 方案一：使用腾讯云控制台（推荐）

微信云开发的环境实际上托管在腾讯云 CloudBase，需要在腾讯云控制台配置：

1. **访问腾讯云 CloudBase 控制台**
   - 打开 https://console.cloud.tencent.com/tcb
   - 使用微信扫码登录（与小程序同一账号）

2. **找到你的环境**
   - 在环境列表中找到 `cloud1-9gzf2w8c9c9b7b73`

3. **开启匿名登录**
   - 点击进入环境
   - 左侧菜单：**环境设置** → **登录授权**
   - 找到 **匿名登录**，点击开启

### 方案二：直接测试（可能已默认开启）

新版云开发可能已默认支持匿名登录，可以直接测试：

```bash
cd admin
npm install
npm run dev
```

如果能正常登录，说明匿名登录已开启。

### 方案三：替代方案（不使用匿名登录）

如果实在找不到匿名登录设置，可以改用**自定义登录**方式：

#### 1. 创建自定义登录云函数

创建 `cloudfunctions/customLogin/index.js`：

```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { username, password } = event

  // 验证管理员账号
  const db = cloud.database()
  const result = await db.collection('admins').where({
    username,
    password
  }).get()

  if (result.data.length > 0) {
    // 创建自定义登录ticket
    const ticket = await cloud.cloudbase.auth.createTicket({
      refresh: 3600 * 1000 * 24 * 7 // 7天
    })

    return {
      success: true,
      ticket: ticket.ticket
    }
  }

  return {
    success: false,
    error: '用户名或密码错误'
  }
}
```

#### 2. 修改前端登录逻辑

修改 `admin/src/api/cloud.js`：

```javascript
import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'cloud1-9gzf2w8c9c9b7b73'

const app = cloudbase.init({
  env: ENV_ID
})

// 使用 ticket 登录
export async function loginWithTicket(ticket) {
  const auth = app.auth({ persistence: 'local' })
  await auth.customAuthProvider().signIn(ticket)
}

// 管理员登录
export async function adminLogin(username, password) {
  // 先调用小程序云函数获取 ticket
  // 注意：这里需要小程序的 wx.cloud 环境
  const res = await wx.cloud.callFunction({
    name: 'customLogin',
    data: { username, password }
  })

  if (res.result.success) {
    await loginWithTicket(res.result.ticket)
    return { success: true }
  }

  return res.result
}
```

## 常见错误及解决方案

### 1. CORS 错误
- ✅ 已解决：使用云开发 Web SDK 替代直接 API 调用

### 2. "anonymous login is not enabled"
- 需要在腾讯云控制台开启匿名登录
- 或使用上述"方案三"的自定义登录

### 3. "Environment not found"
- 检查环境 ID 是否正确：`cloud1-9gzf2w8c9c9b7b73`
- 确认使用的账号与小程序是同一个

### 4. 网络超时
- 检查网络连接
- 尝试增加 timeout：`cloudbase.init({ env: ENV_ID, timeout: 60000 })`

## 测试步骤

1. 安装依赖
```bash
cd admin
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

3. 打开浏览器控制台，查看日志：
   - ✅ 看到 "云开发匿名登录成功" → 配置正确
   - ❌ 看到 "anonymous login" 错误 → 需要开启匿名登录

## 联系方式

如果仍有问题，请提供：
1. 浏览器控制台的完整错误信息
2. 网络请求的详细日志（Network 面板）
3. 云开发环境的截图
