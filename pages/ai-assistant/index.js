const db = wx.cloud.database();
const { parseMarkdown } = require('../../utils/markdown.js');

Page({
  data: {
    // 消息相关
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollToId: '',
    selectedImage: '', // 选中的图片
    showScrollToBottom: false, // 是否显示回到底部按钮

    // 示例问题
    exampleQuestions: [
      '白细胞低怎么办？',
      '化疗后如何护理？',
      '今天血常规：白细胞3.2，血小板80',
      'GVHD是什么？'
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '暖白记事本'
    });

    // 设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#FFB84D'
    });

    // 加载历史消息
    this.loadHistoryMessages();
  },

  onReady() {
    // 页面渲染完成
  },

  onShow() {
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }

    // 添加右上角菜单
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  },

  // 右上角菜单
  onShareAppMessage() {
    return {
      title: '暖白记事本 - AI智能健康助手',
      path: '/pages/ai-assistant/index'
    };
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
      inputValue: prompt
    });
  },

  // 点击示例问题
  onExampleClick(e) {
    const question = e.currentTarget.dataset.question;
    this.setData({
      inputValue: question
    });
    this.sendMessage();
  },

  // 输入内容变化
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 监听滚动事件
  onScroll(e) {
    const { scrollTop, scrollHeight } = e.detail;

    // 简单判断：如果 scrollTop 小于 scrollHeight 的一半，说明在上半部分，显示按钮
    const showButton = scrollTop < scrollHeight * 0.5 && scrollHeight > 800;

    if (this.data.showScrollToBottom !== showButton) {
      this.setData({
        showScrollToBottom: showButton
      });
    }
  },

  // 点击回到底部按钮
  scrollToBottomClick() {
    this.scrollToBottom();
    this.setData({
      showScrollToBottom: false
    });
  },

  // 停止AI回复
  stopAI() {
    this.setData({
      isLoading: false
    });

    wx.showToast({
      title: '已停止',
      icon: 'none',
      duration: 1500
    });
  },

  // 发送消息
  async sendMessage() {
    const content = this.data.inputValue.trim();
    const hasImage = !!this.data.selectedImage;

    // 至少要有文字或图片
    if ((!content && !hasImage) || this.data.isLoading) return;

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 如果有图片，先上传到云存储获取URL
    let imageUrl = null;
    if (hasImage) {
      try {
        imageUrl = await this.uploadImageToCloud(this.data.selectedImage);
        console.log('图片上传成功，URL:', imageUrl);
      } catch (error) {
        console.error('图片上传失败:', error);
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        });
        return;
      }
    }

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content || (hasImage ? '[发送了一张图片]' : ''),
      image: this.data.selectedImage,
      time: this.formatTime(new Date())
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      selectedImage: '',
      isLoading: true
    });

    // 滚动到底部
    setTimeout(() => this.scrollToBottom(), 100);

    // 保存用户消息到数据库
    this.saveMessage(userMessage, openid);

    try {
      // 调用云函数（支持文本和图片URL）
      const result = await this.callAI(content, imageUrl);

      if (result.success) {
        // 添加AI回复
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.content,
          htmlContent: parseMarkdown(result.content),
          time: this.formatTime(new Date())
        };

        this.setData({
          messages: [...this.data.messages, assistantMessage],
          isLoading: false
        });

        // 保存AI消息到数据库
        this.saveMessage(assistantMessage, openid);

        // 智能判断：尝试解析并保存数据
        this.parseAndSaveHealthData(result.content, openid);

        setTimeout(() => this.scrollToBottom(), 100);
      } else {
        throw new Error(result.error || '请求失败');
      }
    } catch (error) {
      console.error('AI调用失败:', error);

      // 判断错误类型并给出具体提示
      let errorContent = '抱歉,我遇到了一些问题,请稍后再试。';

      const errorMsg = error.message || '';
      const errorDetails = error.errMsg || error.details || '';

      if (errorMsg.includes('504003') || errorMsg.includes('timed out') || errorMsg.includes('FUNCTIONS_TIME_LIMIT_EXCEEDED')) {
        errorContent = '⚠️ 云函数执行超时\n\n这可能是因为：\n1. 云函数超时设置太短(默认3秒)\n2. AI服务响应较慢\n\n解决方法：\n1. 打开云函数 callSiliconFlowAI/config.json\n2. 确认 timeout 设置为 60 秒\n3. 重新上传并部署云函数\n4. 如已配置,请稍后重试';
      } else if (errorMsg.includes('401')) {
        errorContent = '⚠️ AI服务认证失败\n\n这是因为API密钥已过期或无效。\n\n解决方法：\n1. 访问 https://cloud.siliconflow.cn/account/ak\n2. 获取新的API密钥\n3. 在云函数 callSiliconFlowAI/config.js 中更新密钥\n4. 重新上传云函数';
      } else if (errorMsg.includes('400') || errorDetails.includes('400')) {
        errorContent = '⚠️ 请求参数错误\n\n可能的原因：\n1. 图片格式不支持\n2. 图片太大\n3. 模型不支持此类型的输入\n\n建议：\n1. 尝试使用较小的图片\n2. 确保图片清晰可见\n3. 或者只发送文字描述';
      } else if (errorMsg.includes('timeout')) {
        errorContent = '⚠️ 请求超时\n\n网络连接较慢或服务器响应超时,请稍后重试。';
      } else {
        errorContent = '抱歉,我遇到了一些问题,请稍后再试。\n\n错误信息: ' + (error.message || '未知错误');
      }

      const errorMessage = {
        id: Date.now() + 1,
        role: 'system',
        content: errorContent,
        time: this.formatTime(new Date()),
        isError: true
      };

      this.setData({
        messages: [...this.data.messages, errorMessage],
        isLoading: false
      });

      wx.showToast({
        title: errorMsg.includes('504003') ? '云函数超时' : (errorMsg.includes('401') ? 'API密钥失效' : '请求失败'),
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 调用云函数请求AI（统一模式）
  async callAI(userMessage, imageUrl = null) {
    try {
      // 构建消息历史（保留最近10条）
      const recentMessages = this.data.messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // 添加当前消息
      if (imageUrl) {
        // 多模态消息 - 使用HTTPS URL
        recentMessages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage || '请帮我分析这张图片'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl  // 直接使用HTTPS URL
              }
            }
          ]
        });
      } else {
        // 纯文本消息
        recentMessages.push({
          role: 'user',
          content: userMessage
        });
      }

      // 调用云函数（使用unified模式）
      const res = await wx.cloud.callFunction({
        name: 'callSiliconFlowAI',
        data: {
          messages: recentMessages,
          mode: 'unified',  // 统一模式
          stream: false
        },
        config: {
          timeout: 60000  // 设置60秒超时
        }
      });

      return res.result;
    } catch (error) {
      console.error('云函数调用失败:', error);
      throw error;
    }
  },

  // 图片转base64（保留此函数以备后用）
  convertImageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data);
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 上传图片到云存储并获取URL
  uploadImageToCloud(imagePath) {
    return new Promise((resolve, reject) => {
      const cloudPath = `ai-chat-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

      console.log('开始上传图片到云存储:', cloudPath);

      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath,
        success: async (uploadRes) => {
          console.log('图片上传成功，fileID:', uploadRes.fileID);

          // 获取临时链接（HTTPS URL）
          try {
            const tempUrlRes = await wx.cloud.getTempFileURL({
              fileList: [uploadRes.fileID]
            });

            if (tempUrlRes.fileList && tempUrlRes.fileList.length > 0) {
              const tempUrl = tempUrlRes.fileList[0].tempFileURL;
              console.log('获取临时URL成功:', tempUrl);
              resolve(tempUrl);
            } else {
              reject(new Error('获取临时URL失败'));
            }
          } catch (error) {
            console.error('获取临时URL失败:', error);
            reject(error);
          }
        },
        fail: (error) => {
          console.error('上传图片失败:', error);
          reject(error);
        }
      });
    });
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
          htmlContent: item.role === 'assistant' ? parseMarkdown(item.content) : null, // 转换 AI 消息的 Markdown
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

  // 新建对话
  newChat() {
    if (this.data.messages.length === 0) return;

    wx.showModal({
      title: '新建对话',
      content: '是否保存当前对话并新建？',
      confirmText: '新建',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: [],
            inputValue: ''
          });
          wx.showToast({
            title: '已新建对话',
            icon: 'success'
          });
        }
      }
    });
  },

  // 显示历史对话抽屉
  async showHistoryDrawer() {
    // 加载历史对话列表
    await this.loadConversations();

    this.setData({
      showHistoryDrawer: true
    });
  },

  // 隐藏历史对话抽屉
  hideHistoryDrawer() {
    this.setData({
      showHistoryDrawer: false
    });
  },

  // 加载历史对话列表
  async loadConversations() {
    try {
      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();
      if (!openid) return;

      // 按时间分组统计对话
      const res = await db.collection('aiChatHistory')
        .where({ openid: openid })
        .orderBy('createTime', 'desc')
        .limit(100)
        .get();

      console.log('历史对话数据:', res.data); // 调试日志

      // 按日期分组对话
      const conversationMap = {};
      res.data.forEach(msg => {
        // 确保 createTime 是 Date 对象
        const createTime = msg.createTime instanceof Date ? msg.createTime : new Date(msg.createTime);
        // 格式化日期为 YYYY/MM/DD
        const year = createTime.getFullYear();
        const month = String(createTime.getMonth() + 1).padStart(2, '0');
        const day = String(createTime.getDate()).padStart(2, '0');
        const date = `${year}/${month}/${day}`;

        console.log('消息日期:', date, '消息内容:', msg.content.substring(0, 20)); // 调试日志

        if (!conversationMap[date]) {
          conversationMap[date] = {
            date: date,
            messages: [],
            firstMessage: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : '')
          };
        }
        conversationMap[date].messages.push(msg);
      });

      const conversations = Object.values(conversationMap);
      console.log('分组后的对话数量:', conversations.length); // 调试日志

      this.setData({ conversations });
    } catch (error) {
      console.error('加载历史对话失败:', error);
    }
  },

  // 加载某个历史对话
  async loadConversation(e) {
    const { date } = e.currentTarget.dataset;
    const conversation = this.data.conversations.find(c => c.date === date);

    if (conversation) {
      const messages = conversation.messages.map(item => ({
        id: item._id,
        role: item.role,
        content: item.content,
        time: item.time
      }));

      this.setData({
        messages: messages,
        showHistoryDrawer: false
      });

      setTimeout(() => this.scrollToBottom(), 200);
    }
  },

  // 选择图片
  chooseImage() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],  // 使用压缩图
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];

        // 进一步压缩图片 - 降低质量到40%
        wx.compressImage({
          src: tempFilePath,
          quality: 40,  // 压缩质量40%（更激进）
          success(compressRes) {
            that.setData({
              selectedImage: compressRes.tempFilePath
            });
          },
          fail() {
            // 压缩失败，使用原图
            that.setData({
              selectedImage: tempFilePath
            });
          }
        });
      }
    });
  },

  // 移除图片
  removeImage() {
    this.setData({
      selectedImage: ''
    });
  },

  // 清除所有记录
  clearAllMessages() {
    const that = this;
    wx.showModal({
      title: '清除记录',
      content: '确定要清除所有聊天记录吗？此操作不可恢复。',
      confirmText: '清除',
      confirmColor: '#FF4444',
      success(res) {
        if (res.confirm) {
          that.setData({
            messages: [],
            selectedImage: ''
          });
          wx.showToast({
            title: '已清除',
            icon: 'success'
          });

          // 同时删除数据库中的记录
          const app = getApp();
          const openid = app.getOpenIdIfLoggedIn();
          if (openid) {
            db.collection('aiChatHistory')
              .where({ openid: openid })
              .remove()
              .then(() => {
                console.log('数据库记录已清除');
              })
              .catch(err => {
                console.error('清除数据库记录失败:', err);
              });
          }
        }
      }
    });
  },

  // 显示设置
  showSettings() {
    wx.showActionSheet({
      itemList: ['更换AI模型', '调整回复风格', '查看使用说明'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        } else if (res.tapIndex === 2) {
          wx.showModal({
            title: '使用说明',
            content: '1. 您可以直接提问健康相关问题\n2. 您可以描述检验数据，AI会自动帮您记录\n3. 支持上传检验报告图片进行识别',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      }
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击穿透
  },

  // 清空对话
  clearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前对话吗？',
      success: (res) => {
        if (res.confirm) {
          // 清空数据库中的历史记录
          const app = getApp();
          const openid = app.getOpenIdIfLoggedIn();
          if (openid) {
            db.collection('aiChatHistory')
              .where({ openid: openid })
              .remove()
              .then(() => {
                console.log('历史记录已清空');
              });
          }

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
