Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#FFB84D",
    leftTabs: [
      {
        pagePath: "pages/home/index",
        text: "首页",
        icon: "home",
        selectedIcon: "home-filled",
        tabIndex: 0
      },
      {
        pagePath: "pages/daily-record/index",
        text: "记录",
        icon: "edit-1",
        selectedIcon: "edit-1-filled",
        tabIndex: 1
      }
    ],
    rightTabs: [
      {
        pagePath: "pages/records/index",
        text: "档案",
        icon: "folder",
        selectedIcon: "folder",
        tabIndex: 2
      },
      {
        pagePath: "pages/profile/index",
        text: "我的",
        icon: "user-1",
        selectedIcon: "user-1-filled",
        tabIndex: 3
      }
    ]
  },
  attached() {},
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
          console.error('switchTab failed:', err);
        }
      });
    },
    openSmartImport() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.showSmartImport) {
        currentPage.showSmartImport();
      }
    }
  }
});
