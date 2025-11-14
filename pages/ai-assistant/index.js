Page({
  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToId: '',
    // 硅基流动API配置(需要替换为实际的API密钥)
    apiKey: 'YOUR_API_KEY_HERE',
    apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen2.5-7B-Instruct' // 使用通义千问模型
  },

  onLoad() {
    // 页面加载时的初始化
  },

  onShow() {
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  // 输入内容变化
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 发送消息
  async sendMessage() {
    const content = this.data.inputValue.trim();
    if (!content) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content,
      time: this.formatTime(new Date())
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isLoading: true
    });

    // 滚动到底部
    this.scrollToBottom();

    // 调用AI API
    try {
      const response = await this.callAI(content);

      // 添加AI回复
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
        time: this.formatTime(new Date())
      };

      this.setData({
        messages: [...this.data.messages, assistantMessage],
        isLoading: false
      });

      this.scrollToBottom();
    } catch (error) {
      console.error('AI调用失败:', error);

      // 显示错误信息
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉,我遇到了一些问题,请稍后再试。',
        time: this.formatTime(new Date())
      };

      this.setData({
        messages: [...this.data.messages, errorMessage],
        isLoading: false
      });

      wx.showToast({
        title: '请求失败',
        icon: 'none'
      });
    }
  },

  // 调用硅基流动AI API
  async callAI(userMessage) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.data.apiUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.data.apiKey}`
        },
        data: {
          model: this.data.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的健康助手,名叫小暖。你的任务是帮助血液肿瘤患者记录和管理他们的健康数据,提供专业的健康建议。请用温暖、专业、易懂的语言回答用户的问题。'
            },
            ...this.data.messages.slice(-5).map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.choices && res.data.choices.length > 0) {
            const aiResponse = res.data.choices[0].message.content;
            resolve(aiResponse);
          } else {
            reject(new Error('API响应格式错误'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 快捷操作
  quickAction(e) {
    const action = e.currentTarget.dataset.action;

    let promptMessage = '';
    switch (action) {
      case 'record':
        promptMessage = '我想记录今天的健康数据';
        break;
      case 'analyze':
        promptMessage = '帮我分析最近的健康趋势';
        break;
      case 'suggest':
        promptMessage = '给我一些健康建议';
        break;
    }

    this.setData({
      inputValue: promptMessage
    });
  },

  // 滚动到底部
  scrollToBottom() {
    if (this.data.messages.length > 0) {
      const lastMessageId = `msg-${this.data.messages[this.data.messages.length - 1].id}`;
      this.setData({
        scrollToId: lastMessageId
      });
    }
  },

  // 格式化时间
  formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 分享功能
  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png'
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })

    return {
      title: '暖白记事本 - 健康管理小程序',
      path: '/pages/home/index',
      imageUrl: res.fileList[0].tempFileURL
    }
  }
});
