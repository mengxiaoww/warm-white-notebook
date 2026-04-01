# 快速修复 CORS 问题

## 我刚做了什么

修改了配置，使用 **Vite 代理** 绕过 CORS 限制：

1. ✅ 修改 [vite.config.js](vite.config.js) - 添加代理配置
2. ✅ 修改 [src/api/cloud.js](src/api/cloud.js) - 开发环境使用代理

## 你现在需要做

### 1. 重启开发服务器

停止当前的服务（Ctrl+C），然后重新启动：

```bash
cd admin
npm run dev
```

### 2. 测试登录

访问 http://localhost:3000

使用账号：`admin` / `admin123`

## 工作原理

```
开发环境（localhost:3000）:
浏览器 → /api → Vite代理 → https://xxx.service.tcloudbase.com/admin-api
                  ✅ 没有跨域问题

生产环境（部署后）:
浏览器 → https://xxx.service.tcloudbase.com/admin-api
         ✅ 同域名，没有跨域问题
```

## 下一步

如果登录成功，说明云函数正常工作，只是 CORS 配置的问题。

生产部署时：
1. 需要重新部署 adminApi 云函数（让 CORS 配置生效）
2. 或者部署到云开发静态托管（同域名，无 CORS 问题）

现在重启服务试试！
