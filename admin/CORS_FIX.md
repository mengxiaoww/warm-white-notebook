# ⚠️ CORS 错误修复步骤

## 问题
浏览器报错：`No 'Access-Control-Allow-Origin' header`

## 解决方案

### 1. 重新部署云函数（重要！）

在微信开发者工具中：
1. 右键 `cloudfunctions/adminApi` 目录
2. 选择 **上传并部署（云端安装依赖）**
3. 等待部署完成（会看到"部署成功"提示）

**必须重新部署才能让 CORS 配置生效！**

### 2. 验证部署

部署完成后，在浏览器中测试 OPTIONS 请求：

打开浏览器控制台，运行：

```javascript
fetch('https://cloud1-9gzf2w8c9c9b7b73.service.tcloudbase.com/admin-api', {
  method: 'OPTIONS'
}).then(res => {
  console.log('CORS Headers:', res.headers.get('Access-Control-Allow-Origin'))
  // 应该输出: CORS Headers: *
})
```

如果输出 `*`，说明 CORS 配置成功。

### 3. 测试登录

```bash
cd admin
npm run dev
```

访问 http://localhost:3000，尝试登录。

## 如果还是报错

### 方案 A：确认触发器配置

1. 微信开发者工具 → 云开发 → 云函数
2. 找到 adminApi → 详情 → 触发器
3. 确认触发器类型是 **HTTP**
4. 路径应该是 `/admin-api`

### 方案 B：使用 Vite 代理（临时方案）

如果 CORS 仍有问题，可以通过 Vite 代理绕过：

修改 [vite.config.js](../vite.config.js)：

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://cloud1-9gzf2w8c9c9b7b73.service.tcloudbase.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/admin-api')
      }
    }
  }
})
```

然后修改 [src/api/cloud.js](src/api/cloud.js:6)：

```javascript
const API_URL = '/api'  // 使用代理
```

重启开发服务器：
```bash
npm run dev
```

**注意**：这个方案只适用于本地开发，生产环境仍需正确配置 CORS。

## 检查清单

- [ ] 云函数已重新部署
- [ ] 触发器类型为 HTTP
- [ ] 触发器路径正确
- [ ] 浏览器控制台看到 CORS Headers
- [ ] 登录成功

完成后应该能正常登录了！
