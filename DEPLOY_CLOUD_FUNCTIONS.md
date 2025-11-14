# 云函数部署说明

## 重要：在使用后台管理系统前，必须先部署所有云函数！

### 需要部署的云函数列表：

1. **adminLogin** - 管理员登录
2. **adminGetUsers** - 获取用户列表
3. **adminGetStats** - 获取统计数据
4. **adminGetRecords** - 获取记录列表
5. **adminGetUserDetail** - 获取用户详情
6. **adminGetFeedbacks** - 获取反馈列表
7. **adminUpdateFeedback** - 更新反馈
8. **adminManageBanners** - 管理轮播图

### 部署步骤：

1. 打开微信开发者工具
2. 在左侧找到"云开发"图标，点击进入
3. 选择"云函数"标签
4. 对于每个cloud函数目录（如 `adminLogin`），右键点击→选择"上传并部署：云端安装依赖"
5. 等待所有云函数上传完成

### 验证部署：

部署完成后，在微信开发者工具的云函数列表中应该能看到所有已部署的函数。

### 常见问题：

**Q: 提示 FUNCTION_NOT_FOUND 错误？**
A: 说明云函数未部署，请按照上述步骤部署所有云函数。

**Q: 云函数调用失败？**
A: 检查云开发环境ID是否正确（cloud1-9gzf2w8c9c9b7b73），以及是否开启了匿名登录。
