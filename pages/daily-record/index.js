// 占位页面 - 自动跳转到分包中的实际页面
Page({
  onLoad() {
    wx.redirectTo({
      url: '/packageD/pages/daily-record/index'
    });
  }
});
