Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#FFB84D",
    list: [
      {
        pagePath: "pages/home/index",
        text: "首页",
        icon: "home",
        selectedIcon: "home-filled"
      },
      {
        pagePath: "pages/daily-record/index",
        text: "记录",
        icon: "edit-1",
        selectedIcon: "edit-1-filled"
      },
      {
        pagePath: "pages/ai-assistant/index",
        text: "暖白记事本",
        icon: "chat",
        selectedIcon: "chat-filled",
        isCenter: true  // 标记为中心按钮
      },
      {
        pagePath: "pages/records/index",
        text: "档案",
        icon: "file-1",
        selectedIcon: "file-1-filled"
      },
      {
        pagePath: "pages/profile/index",
        text: "我的",
        icon: "user-1",
        selectedIcon: "user-1-filled"
      }
    ]
  },
  attached() {
    // 在组件实例进入页面节点树时执行
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = '/' + data.path;
      
      
      wx.switchTab({
        url,
        success: () => {
          
          this.setData({
            selected: data.index
          });
        },
        fail: (err) => {
          
        }
      });
    }
  }
}); 
