# 在微信开发者工具中运行管理后台

## 🎯 最终解决方案

既然云函数工作正常，我们直接在**微信开发者工具**中运行 Web 管理后台！

## 📋 操作步骤

### 1. 构建管理后台

```bash
cd admin
npm run build
```

### 2. 将构建文件复制到项目根目录

构建完成后，将 `admin/dist` 目录复制到项目根目录，改名为 `admin-web`：

```bash
cp -r admin/dist ../admin-web
```

或者手动复制粘贴。

### 3. 在微信开发者工具中打开

1. 在项目根目录创建 `admin.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>管理后台</title>
  <meta http-equiv="refresh" content="0;url=admin-web/index.html">
</head>
<body>
  <p>正在跳转到管理后台...</p>
</body>
</html>
```

2. 在微信开发者工具中，右键 `admin.html` → **在浏览器中预览**

### 4. 测试登录

使用 admin / admin123 登录

---

## 🚀 更简单的方法：直接运行

在微信开发者工具的控制台中运行：

```bash
cd admin
npm run build
```

然后在工具中打开 `admin/dist/index.html`

---

## ✅ 工作原理

- ✅ HTML 中引入了微信 JSSDK
- ✅ 代码会自动检测 `wx.cloud` 是否可用
- ✅ 如果在微信环境中，直接调用云函数
- ✅ 无需 HTTP 触发器，无需 CORS 配置

---

## 📝 下一步

如果需要在浏览器中访问（非微信环境），需要：

1. 正确配置云函数 HTTP 触发器
2. 或者部署到云开发静态托管（会自动在同域名下，无 CORS 问题）

现在先在微信开发者工具中测试吧！
