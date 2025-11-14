# 微信云开发管理后台 - 正确配置指南

## 问题根源

微信云开发的云函数默认**不支持 HTTP 访问**，需要在腾讯云控制台开启。

## 正确的配置步骤

### 步骤 1：访问腾讯云控制台

1. 打开 https://console.cloud.tencent.com/tcb
2. 使用微信扫码登录（与小程序同一账号）
3. 找到环境：`cloud1-9gzf2w8c9c9b7b73`

### 步骤 2：开启 HTTP 访问服务

1. 点击进入环境
2. 左侧菜单：**云函数**
3. 找到 `adminApi` 云函数
4. 点击云函数名称进入详情页
5. 点击 **"函数配置"** 标签
6. 找到 **"HTTP 访问服务"** 开关
7. **开启** HTTP 访问服务
8. 系统会生成一个访问路径，类似：
   ```
   https://cloud1-9gzf2w8c9c9b7b73-xxxxx.service.tcloudbase.com/admin-api
   ```
9. **复制这个路径**

### 步骤 3：更新前端配置

修改文件：`admin/src/api/cloud.js`

将第 6 行的 API_URL 改为刚才复制的路径：

```javascript
const API_URL = isDev ? '/api' : 'https://你复制的路径'
```

### 步骤 4：重新部署云函数

1. 在微信开发者工具中
2. 右键 `cloudfunctions/adminApi`
3. 选择 **上传并部署（云端安装依赖）**
4. 等待部署完成

### 步骤 5：配置 Vite 代理

修改 `admin/vite.config.js`：

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'https://你复制的路径',  // 改成实际路径
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### 步骤 6：重启并测试

```bash
cd admin
npm run dev
```

访问 http://localhost:3000，使用 admin/admin123 登录。

---

## 如果腾讯云控制台找不到 HTTP 访问服务

### 备选方案：使用云开发静态托管

这是**最推荐**的方案，无需配置 HTTP 触发器：

#### 1. 构建前端
```bash
cd admin
npm run build
```

#### 2. 上传到云开发静态托管

在微信开发者工具中：
1. 点击 **云开发** 图标
2. 进入 **静态网站托管**
3. 如果未开启，点击 **开通**
4. 点击 **上传文件**
5. 选择 `admin/dist` 目录下的所有文件
6. 上传完成后，会得到一个访问域名，类似：
   ```
   https://cloud1-9gzf2w8c9c9b7b73.tcloudbaseapp.com
   ```

#### 3. 修改云函数调用方式

由于静态托管与云函数在**同一个云开发环境**中，可以直接使用云开发 JS SDK：

修改 `admin/src/api/cloud.js` 为：

```javascript
import tcb from '@cloudbase/js-sdk'

const app = tcb.init({
  env: 'cloud1-9gzf2w8c9c9b7b73'
})

// 使用自定义登录（无需用户授权）
app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn()

export async function callCloudFunction(name, data) {
  const res = await app.callFunction({
    name,
    data
  })
  return res.result
}
```

#### 4. 访问管理后台

直接访问静态托管域名即可！

---

## 推荐方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| HTTP 触发器 | 可在任意地方访问 | 配置复杂、需要 CORS | ⭐⭐⭐ |
| 静态托管 | 简单、免费、无 CORS | 需要构建部署 | ⭐⭐⭐⭐⭐ |

---

## 我的建议

**使用静态托管方案**，步骤：

1. 安装依赖：`npm install @cloudbase/js-sdk`
2. 修改 API 调用代码（我可以帮你改）
3. 构建：`npm run build`
4. 上传到静态托管
5. 完成！

你想用哪个方案？如果选静态托管，我现在就帮你修改代码。
