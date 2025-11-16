const db = wx.cloud.database();

Page({
  data: {
    // 模式切换
    mode: 'consultation', // 'consultation'(健康咨询) 或 'recording'(智能记录)

    // 消息相关
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToId: '',

    // 快捷操作
    quickActions: [
      { id: 'blood', text: '记录血常规', icon: 'heart' },
      { id: 'liver', text: '记录肝功能', icon: 'file-copy' },
      { id: 'kidney', text: '记录肾功能', icon: 'file-copy' },
      { id: 'virus', text: '记录病毒学', icon: 'file-copy' }
    ],

    // 示例问题
    exampleQuestions: [
      '白细胞低怎么办？',
      '化疗后如何护理？',
      '如何提高免疫力？',
      'GVHD是什么？'
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '暖白助手'
    });

    // 加载历史消息
    this.loadHistoryMessages();
  },

  onShow() {
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      mode: mode
    });

    wx.showToast({
      title: mode === 'consultation' ? '切换到健康咨询' : '切换到智能记录',
      icon: 'success',
      duration: 1500
    });
  },

  // 快捷操作
  onQuickAction(e) {
    const action = e.currentTarget.dataset.action;
    let prompt = '';

    switch (action) {
      case 'blood':
        prompt = '我想记录今天的血常规数据';
        break;
      case 'liver':
        prompt = '我想记录肝功能数据';
        break;
      case 'kidney':
        prompt = '我想记录肾功能数据';
        break;
      case 'virus':
        prompt = '我想记录病毒学数据';
        break;
    }

    this.setData({
      inputValue: prompt,
      mode: 'recording' // 自动切换到记录模式
    });
  },

  // 点击示例问题
  onExampleClick(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({
      inputValue: question,
      mode: 'consultation' // 自动切换到咨询模式
    });
    this.sendMessage();
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
    if (!content || this.data.isLoading) return;

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content,
      time: this.formatTime(new Date()),
      mode: this.data.mode
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isLoading: true
    });

    // 滚动到底部
    setTimeout(() => this.scrollToBottom(), 100);

    // 保存用户消息到数据库
    this.saveMessage(userMessage, openid);

    try {
      // 调用云函数
      const result = await this.callAI(content, this.data.mode);

      if (result.success) {
        // 添加AI回复
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.content,
          time: this.formatTime(new Date()),
          mode: this.data.mode
        };

        this.setData({
          messages: [...this.data.messages, assistantMessage],
          isLoading: false
        });

        // 保存AI消息到数据库
        this.saveMessage(assistantMessage, openid);

        // 如果是智能记录模式，尝试解析并保存数据
        if (this.data.mode === 'recording') {
          this.parseAndSaveHealthData(result.content, openid);
        }

        setTimeout(() => this.scrollToBottom(), 100);
      } else {
        throw new Error(result.error || '请求失败');
      }
    } catch (error) {
      console.error('AI调用失败:', error);

      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉,我遇到了一些问题,请稍后再试。\n错误信息: ' + (error.message || '未知错误'),
        time: this.formatTime(new Date()),
        isError: true
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

  // 调用云函数请求AI
  async callAI(userMessage, mode) {
    try {
      // 构建消息历史（保留最近10条）
      const recentMessages = this.data.messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // 添加当前消息
      recentMessages.push({
        role: 'user',
        content: userMessage
      });

      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: recentMessages,
          mode: mode,
          stream: false
        }
      });

      return res.result;
    } catch (error) {
      console.error('云函数调用失败:', error);
      throw error;
    }
  },

  // 解析并保存健康数据
  async parseAndSaveHealthData(content, openid) {
    try {
      // 尝试从AI回复中提取JSON数据
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) return;

      const healthData = JSON.parse(jsonMatch[1]);
      if (!healthData.dataType || !healthData.values) return;

      const app = getApp();
      const profileId = app.getCurrentProfileId();
      if (!profileId) {
        wx.showToast({ title: '请先选择档案', icon: 'none' });
        return;
      }

      // 根据数据类型保存到对应集合
      const collectionMap = {
        'bloodTest': 'bloodTests',
        'liverFunction': 'liverFunctionTests',
        'kidneyFunction': 'kidneyFunctionTests',
        'ebv': 'ebvRecords',
        'cmv': 'cmvRecords',
        'ldh': 'ldhRecords'
      };

      const collection = collectionMap[healthData.dataType];
      if (!collection) return;

      // 保存数据
      await db.collection(collection).add({
        data: {
          openid: openid,
          profileId: profileId,
          date: healthData.date || new Date().toISOString().split('T')[0],
          ...healthData.values,
          notes: healthData.notes || '',
          source: 'ai_assistant',
          createTime: new Date()
        }
      });

      // 显示成功提示
      wx.showToast({
        title: '数据已自动保存',
        icon: 'success',
        duration: 2000
      });

      // 添加系统提示消息
      const systemMessage = {
        id: Date.now() + 2,
        role: 'system',
        content: '✅ 数据已成功保存到您的健康档案',
        time: this.formatTime(new Date())
      };

      this.setData({
        messages: [...this.data.messages, systemMessage]
      });

    } catch (error) {
      console.error('解析健康数据失败:', error);
    }
  },

  // 保存消息到数据库
  async saveMessage(message, openid) {
    try {
      await db.collection('aiChatHistory').add({
        data: {
          openid: openid,
          ...message,
          createTime: new Date()
        }
      });
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  },

  // 加载历史消息
  async loadHistoryMessages() {
    try {
      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();
      if (!openid) return;

      const res = await db.collection('aiChatHistory')
        .where({ openid: openid })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();

      if (res.data && res.data.length > 0) {
        // 反转顺序，最早的消息在前
        const messages = res.data.reverse().map(item => ({
          id: item._id,
          role: item.role,
          content: item.content,
          time: item.time,
          mode: item.mode
        }));

        this.setData({ messages });
        setTimeout(() => this.scrollToBottom(), 200);
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
    }
  },

  // 清空对话
  clearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前对话吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            inputValue: ''
          });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
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
      title: '暖白记事本 - AI智能健康助手',
      path: '/pages/ai-assistant/index',
      imageUrl: res.fileList[0].tempFileURL
    }
  }
});
