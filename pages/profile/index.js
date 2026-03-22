// pages/profile/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLoggedIn: false,
    isPageLoading: true, // 页面加载状态
    hasLoadedBefore: false, // 标记页面是否已加载过数据
    isFirstShow: true, // 标记是否是首次onShow
    loginBtnText: '微信登录',
    userInfo: null,
    profiles: [],
    currentProfileId: '',

    showFeedbackPopup: false,
    feedbackContent: '',
    feedbackContact: '',

    // 编辑用户信息弹窗
    showEditUserPopup: false,
    editUserForm: {
      avatarUrl: '',
      nickName: ''
    },

    // 登录弹窗相关
    showLoginPopup: false,
    selectedAvatar: '',
    selectedNickname: '', // 🔥 移除默认值，让用户使用微信昵称或手动输入
    selectedAge: '',
    selectedGender: 'male',
    selectedDisease: '',
    selectedHospital: '',
    confirmBtnText: '完成登录',
    canConfirmLogin: false,


    // 当前用药相关
    currentMedications: [],
    todayMedicationProgress: 0,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    this.checkLoginAndLoadData()

    // 🛡️ Android/iOS兼容性：5秒后强制隐藏骨架屏
    setTimeout(() => {
      if (this.data.isPageLoading) {
        console.warn('⚠️ profile页面加载超时，强制隐藏骨架屏');
        this.setData({ isPageLoading: false });
      }
    }, 5000);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 设置TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4
      });
    }

    // 只在首次加载时显示骨架屏
    if (!this.data.hasLoadedBefore) {
      this.setData({ isPageLoading: true });
    }
    this.checkLoginAndLoadData()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },


  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png'
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })

    return {
      title: '暖白记事本 - 健康管理小程序',
      path: '/pages/daily-record/index',
      imageUrl: res.fileList[0].tempFileURL // 可自定义分享图片
    }
  },

  // 检查登录状态并加载数据
  async checkLoginAndLoadData() {
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    if (openid) {
      // 🔥 优先从数据库加载用户信息
      await this.loadUserInfoFromDB(openid);

      this.setData({
        isLoggedIn: true
      })
      this.loadProfiles(openid)
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        profiles: [],
        currentProfileId: '',
        isPageLoading: false, // 🔧 未登录时也要隐藏骨架屏
        hasLoadedBefore: true // 标记已加载，避免重复显示骨架屏
      })
    }
  },

  // 📥 从数据库加载用户基本信息
  async loadUserInfoFromDB(openid) {
    try {
      const db = wx.cloud.database();
      // 🔧 修复：统一使用 users 集合，与保存逻辑一致
      const res = await Promise.race([
        db.collection('users').where({ openid: openid }).get(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('数据库查询超时')), 2500)
        )
      ]);

      if (res.data.length > 0) {
        // 数据库中有记录，使用数据库中的信息
        const dbUserInfo = {
          avatarUrl: res.data[0].avatarUrl || '',
          nickName: res.data[0].nickName || ''
        };

        // 更新本地存储（保持同步）
        wx.setStorageSync('userInfo', dbUserInfo);

        this.setData({
          userInfo: dbUserInfo
        });

        console.log('✅ 从云端加载用户信息成功:', dbUserInfo.nickName);
      } else {
        // 数据库中没有记录，使用本地存储（首次登录或未保存过）
        const localUserInfo = wx.getStorageSync('userInfo');
        this.setData({
          userInfo: localUserInfo || { avatarUrl: '', nickName: '' }
        });
        console.log('ℹ️ 云端无记录，使用本地缓存');
      }
    } catch (err) {
      // 🔧 优化错误处理：区分集合不存在和其他错误
      if (err.errCode === -502005) {
        // 集合不存在，这是正常的（首次使用）
        console.log('ℹ️ users 集合尚未创建，将在首次保存时自动创建');
      } else {
        // 其他错误才输出错误日志
        console.warn('⚠️ 加载用户信息失败:', err.errMsg || err.message);
      }

      // 降级：使用本地存储
      const localUserInfo = wx.getStorageSync('userInfo');
      this.setData({
        userInfo: localUserInfo || { avatarUrl: '', nickName: '' }
      });
    }
  },

  // 处理登录
  async handleLogin() {
    // 防止重复点击
    if (this.data.loginBtnText !== '微信登录') {
      return
    }

    this.setData({
      loginBtnText: '正在登录...'
    })

    wx.showLoading({
      title: '登录中...',
      mask: true
    })

    try {
      const app = getApp()

      // 静默获取openid
      const openid = await app.getOpenIdSilently()


      // 检查用户是否已完成注册
      const isRegistrationCompleted = await app.checkUserRegistrationCompleted(openid)


      if (isRegistrationCompleted) {
        // 用户已完成注册，直接完成登录
        await this.completeDirectLogin()
      } else {
        // 用户未完成注册，显示完善信息弹窗
        this.showProfileCompletionPopup()
      }

    } catch (err) {


      this.setData({
        loginBtnText: '微信登录'
      })

      if (err.message !== '请求过于频繁，请稍后再试') {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        })
      }
    } finally {
      wx.hideLoading()
    }
  },

  // 直接完成登录（用户已完善信息）
  async completeDirectLogin() {
    try {
      const app = getApp()

      // 从服务端获取用户真实信息
      const userInfo = await this.getUserInfoFromServer(app.tempOpenId)

      await app.completeLoginWithAvatar(userInfo)


      this.checkLoginAndLoadData()

      this.setData({
        loginBtnText: '微信登录'
      })

      wx.showToast({
        title: '登录成功！',
        icon: 'success'
      })

    } catch (err) {

      this.setData({
        loginBtnText: '微信登录'
      })
      throw err
    }
  },

  // 从服务端获取用户信息
  async getUserInfoFromServer(openid) {
    try {
      const app = getApp()
      const user = await app.getUserBasicInfo(openid)

      if (user) {
        return {
          avatarUrl: user.avatarUrl || '',
          nickName: user.nickName || '' // 🔥 移除默认值
        }
      }

      // 如果没有找到用户基础信息，返回空信息
      return {
        avatarUrl: '',
        nickName: '' // 🔥 移除默认值
      }
    } catch (err) {

      return {
        avatarUrl: '',
        nickName: '' // 🔥 移除默认值
      }
    }
  },

  // 显示完善信息页面
  showProfileCompletionPopup() {
    // 跳转到完善信息页面
    wx.navigateTo({
      url: '/packageB/pages/complete-profile/index'
    });

    // 重置登录按钮状态
    this.setData({
      loginBtnText: '微信登录'
    });
  },

  // 关闭登录弹窗
  closeLoginPopup() {
    this.setData({
      showLoginPopup: false,
      selectedAvatar: '',
      selectedNickname: '', // 🔥 移除默认值
      selectedAge: '',
      selectedGender: 'male',
      selectedDisease: '',
      selectedHospital: '',
      canConfirmLogin: false
    })
  },

  // 选择头像
  onChooseAvatar(e) {
    try {
      const {
        avatarUrl
      } = e.detail


      if (avatarUrl) {
        // 显示上传进度
        wx.showLoading({
          title: '正在上传头像...',
          mask: true
        })

        // 上传头像到云存储
        this.uploadAvatar(avatarUrl)
      } else {
        throw new Error('头像获取失败')
      }
    } catch (err) {


      // 开发工具兼容性处理 - 自动使用默认头像
      if (err.message && err.message.includes('ENOENT')) {

        this.skipAvatar()

        // 给用户一个简单的提示
        wx.showToast({
          title: '已自动使用默认头像',
          icon: 'none',
          duration: 1500
        })
      } else {
        wx.showToast({
          title: '头像选择失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    }
  },

  // 上传头像到云存储
  async uploadAvatar(localPath) {
    try {
      const app = getApp()
      const openid = app.tempOpenId || app.getOpenIdIfLoggedIn()

      if (!openid) {
        throw new Error('用户ID获取失败')
      }

      // 生成云存储文件名
      const timestamp = Date.now()
      const cloudPath = `avatars/${openid}_${timestamp}.jpg`

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: localPath
      })



      // 更新页面状态，重新检查表单状态
      this.setData({
        selectedAvatar: uploadResult.fileID // 使用云存储的fileID
      }, () => {
        // 在状态更新完成后重新检查表单
        this.setData({
          canConfirmLogin: this.checkCanConfirm()
        })
      })

      wx.hideLoading()
      wx.showToast({
        title: '头像上传成功',
        icon: 'success',
        duration: 1000
      })

    } catch (err) {

      wx.hideLoading()

      // 上传失败，使用默认头像
      this.skipAvatar()

      wx.showToast({
        title: '头像上传失败，已使用默认头像',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 输入昵称
  onNicknameInput(e) {
    const nickname = e.detail.value
    this.setData({
      selectedNickname: nickname,
      canConfirmLogin: this.checkCanConfirm()
    })
  },

  // 输入年龄
  onAgeInput(e) {
    const age = e.detail.value
    this.setData({
      selectedAge: age,
      canConfirmLogin: this.checkCanConfirm()
    })
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      selectedGender: gender,
      canConfirmLogin: this.checkCanConfirm()
    })
  },

  // 输入疾病
  onDiseaseInput(e) {
    const disease = e.detail.value
    this.setData({
      selectedDisease: disease
    })
  },

  // 输入医院
  onHospitalInput(e) {
    const hospital = e.detail.value
    this.setData({
      selectedHospital: hospital
    })
  },









  // 跳过头像选择
  skipAvatar() {
    // 生成一个默认头像URL（使用微信默认灰色头像）
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iNTAiIGZpbGw9IiNFNUU1RTUiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSIzNSIgcj0iMTUiIGZpbGw9IiM5OTk5OTkiLz4KPGVwYXRoIGQ9Ik01MCA2NUMzNi4xOTI5IDY1IDI1IDUzLjgwNzEgMjUgNDBDMjUgMzguMzQzMSAyNS4xNjQ3IDM2LjcyNTMgMjUuNDgzMyAzNS4xNkMzMS41ODMzIDQwLjQ4IDQwLjE2NjcgNDMuMzMzMyA1MCA0My4zMzMzQzU5LjgzMzMgNDMuMzMzMyA2OC40MTY3IDQwLjQ4IDc0LjUxNjcgMzUuMTZDNzQuODM1MyAzNi43MjUzIDc1IDM4LjM0MzEgNzUgNDBDNzUgNTMuODA3MSA2My44MDcxIDY1IDUwIDY1WiIgZmlsbD0iIzk5OTk5OSIvPgo8L3N2Zz4K'

    this.setData({
      selectedAvatar: defaultAvatar,
      canConfirmLogin: this.checkCanConfirm()
    })

    wx.showToast({
      title: '已使用默认头像',
      icon: 'success',
      duration: 1000
    })
  },

  // 检查是否可以确认登录
  checkCanConfirm() {
    const {
      selectedAvatar,
      selectedNickname,
      selectedAge
    } = this.data
    return !!(selectedAvatar &&
      selectedNickname &&
      selectedNickname.trim().length > 0 &&
      selectedAge &&
      selectedAge.trim().length > 0)
  },

  // 确认登录
  async confirmLogin() {
    if (!this.data.canConfirmLogin) {
      return
    }

    this.setData({
      confirmBtnText: '登录中...'
    })

    try {
      const userInfo = {
        avatarUrl: this.data.selectedAvatar,
        nickName: this.data.selectedNickname.trim()
      }

      const app = getApp()
      await app.completeLoginWithAvatar(userInfo)

      // 保存用户基础信息到users集合
      const fullUserInfo = {
        avatarUrl: this.data.selectedAvatar,
        nickName: this.data.selectedNickname.trim(),
        age: this.data.selectedAge.trim(),
        gender: this.data.selectedGender,
        disease: this.data.selectedDisease.trim(),
        hospital: this.data.selectedHospital.trim()
      }
      await app.saveUserBasicInfo(fullUserInfo)

      // 创建默认档案使用登录时填写的信息
      await this.createDefaultProfileWithLoginData()


      this.checkLoginAndLoadData()

      // 关闭弹窗
      this.setData({
        showLoginPopup: false
      })

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

    } catch (err) {


      this.setData({
        confirmBtnText: '完成登录'
      })

      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  // 使用登录数据创建/更新默认档案
  async createDefaultProfileWithLoginData() {
    try {
      const app = getApp()
      const openid = app.getOpenIdIfLoggedIn()
      if (!openid) return

      // 🔥 检查全局锁，防止重复创建
      if (app.globalData.isCreatingProfile) {
        console.log('⚠️ 档案正在创建中（全局锁），跳过');
        return;
      }

      const db = wx.cloud.database()

      // 🔥 检查是否已存在档案（不只是默认档案）
      const existingProfiles = await db.collection('userProfiles')
        .where({
          openid: openid
        })
        .get()

      // 如果已有任何档案，不再创建新档案，只更新默认档案
      if (existingProfiles.data.length > 0) {
        console.log('⚠️ 用户已有档案，跳过创建')
        const defaultProfile = existingProfiles.data.find(p => p.isDefault) || existingProfiles.data[0]
        wx.setStorageSync('currentProfileId', defaultProfile._id)
        return
      }

      // 🔥 设置全局锁
      app.globalData.isCreatingProfile = true;

      // 检查是否已存在默认档案
      const defaultProfiles = await db.collection('userProfiles')
        .where({
          openid: openid,
          isDefault: true
        })
        .get()

      const profileData = {
        realName: this.data.selectedNickname.trim(),
        name: this.data.selectedNickname.trim(),
        gender: this.data.selectedGender,
        age: this.data.selectedAge.trim(),
        disease: this.data.selectedDisease.trim(),
        hospital: this.data.selectedHospital.trim(),
        isDefault: true,
        updateTime: db.serverDate()
      }

      if (existingProfiles.data.length > 0) {
        // 更新现有默认档案
        const defaultProfile = existingProfiles.data[0]
        await db.collection('userProfiles').doc(defaultProfile._id).update({
          data: profileData
        })

        console.log('✅ 更新默认档案成功')
        // 设置为当前档案
        wx.setStorageSync('currentProfileId', defaultProfile._id)
      } else {
        // 创建新的默认档案
        profileData.openid = openid
        profileData.createTime = db.serverDate()

        const res = await db.collection('userProfiles').add({
          data: profileData
        })

        console.log('✅ 创建新的默认档案成功:', res._id)
        // 设置为当前档案
        wx.setStorageSync('currentProfileId', res._id)
      }

      // 🔥 释放全局锁
      app.globalData.isCreatingProfile = false

    } catch (err) {
      console.error('创建/更新档案失败:', err)

      // 🔥 失败时释放全局锁
      app.globalData.isCreatingProfile = false
    }
  },

  // 加载用户档案
  async loadProfiles(openid) {
    try {
      const db = wx.cloud.database()
      // 🔧 Android/iOS兼容性：添加超时保护
      const res = await Promise.race([
        db.collection('userProfiles')
          .where({ openid: openid })
          .orderBy('createTime', 'asc')
          .get(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('数据库查询超时')), 2500)
        )
      ])



      if (res.data.length === 0) {
        // 🔥 如果没有档案，检查是否正在创建中
        const app = getApp()
        if (app.globalData.isCreatingProfile) {
          console.log('⚠️ 档案正在创建中，等待完成...')
          // 等待档案创建完成后重新加载
          setTimeout(() => {
            this.loadProfiles(openid)
          }, 1500)
          return
        }

        // 🔥 检查是否刚完成注册（从 complete-profile 页面返回）
        // 这种情况下档案应该已经创建，可能是查询延迟
        const justRegisteredInfo = wx.getStorageSync('justRegistered')
        if (justRegisteredInfo) {
          const retryCount = justRegisteredInfo.retryCount || 0
          const maxRetries = 3 // 最多重试3次

          if (retryCount < maxRetries) {
            console.log(`⚠️ 刚完成注册，等待档案同步...（重试 ${retryCount + 1}/${maxRetries}）`)
            // 更新重试次数，但不删除标记
            wx.setStorageSync('justRegistered', { retryCount: retryCount + 1 })

            setTimeout(() => {
              this.loadProfiles(openid)
            }, 1500)
            return
          } else {
            // 超过最大重试次数，清除标记并继续（可能需要手动创建档案）
            console.warn('⚠️ 档案同步超时，清除 justRegistered 标记')
            wx.removeStorageSync('justRegistered')
          }
        }

        // 如果确实没有档案且不在创建中，才创建默认档案
        await this.createDefaultProfile(openid)
        return
      }

      // 🔥 成功加载档案后，清除 justRegistered 标记
      wx.removeStorageSync('justRegistered')

      const profiles = res.data.map(item => ({
        id: item._id,
        realName: item.realName,
        name: item.name,
        gender: item.gender,
        age: item.age,
        disease: item.disease,
        hospital: item.hospital,
        isDefault: item.isDefault,
        createTime: item.createTime
      }))

      // 获取当前使用的档案ID
      let currentProfileId = wx.getStorageSync('currentProfileId')
      if (!currentProfileId) {
        // 如果没有设置当前档案，使用默认档案
        const defaultProfile = profiles.find(p => p.isDefault)
        currentProfileId = defaultProfile ? defaultProfile.id : profiles[0].id
        wx.setStorageSync('currentProfileId', currentProfileId)
      }

      this.setData({
        profiles,
        currentProfileId
      })

      // 档案设置成功后，加载用药数据
      // 延时加载数据，确保档案ID已设置
      setTimeout(() => {
        this.loadCurrentMedications()
      }, 100)

      // 首次加载完成，隐藏骨架屏
      setTimeout(() => {
        this.setData({
          isPageLoading: false,
          hasLoadedBefore: true // 标记已完成首次加载
        });
      }, 300);

    } catch (err) {
      console.error('加载档案失败:', err);
      wx.showToast({
        title: '加载档案失败',
        icon: 'none'
      });
      this.setData({
        isPageLoading: false,
        hasLoadedBefore: true // 即使失败，也标记为已加载
      });
    }
  },

  // 创建默认档案
  async createDefaultProfile(openid) {
    try {
      const app = getApp()

      // 🔥 检查全局锁，防止与complete-profile页面冲突
      if (app.globalData.isCreatingProfile) {
        console.log('⚠️ 档案正在创建中（全局锁），跳过');
        // 等待一段时间后重新加载
        setTimeout(() => {
          this.loadProfiles(openid);
        }, 1000);
        return;
      }

      const db = wx.cloud.database()

      // 🔥 先检查是否已存在档案，避免重复创建
      const existingProfiles = await db.collection('userProfiles')
        .where({
          openid: openid
        })
        .get()

      if (existingProfiles.data.length > 0) {
        console.log('⚠️ 档案已存在，跳过创建，档案数:', existingProfiles.data.length)
        this.loadProfiles(openid)
        return
      }

      // 🔥 设置全局锁
      app.globalData.isCreatingProfile = true;

      // 🔥 优先从 users 集合获取用户昵称
      let defaultName = '默认用户'
      try {
        const userRes = await db.collection('users')
          .where({ openid: openid })
          .get()

        if (userRes.data.length > 0 && userRes.data[0].nickName) {
          defaultName = userRes.data[0].nickName
          console.log('✅ 从 users 集合获取用户昵称:', defaultName)
        } else {
          // 兜底：从 Storage 获取
          const userInfo = wx.getStorageSync('userInfo')
          if (userInfo && userInfo.nickName) {
            defaultName = userInfo.nickName
            console.log('✅ 从 Storage 获取用户昵称:', defaultName)
          }
        }
      } catch (err) {
        console.warn('获取用户昵称失败，使用默认值:', err)
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.nickName) {
          defaultName = userInfo.nickName
        }
      }

      // 尝试从微信获取性别，如果获取不到默认为男性
      let defaultGender = 'male' // 默认男性
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.gender) {
        // 微信性别：1为男性，2为女性，0为未知
        defaultGender = userInfo.gender === 2 ? 'female' : 'male'
      }

      const res = await db.collection('userProfiles').add({
        data: {
          openid: openid,
          realName: defaultName, // 🔥 使用用户昵称作为档案名
          name: defaultName, // 保留兼容性
          gender: defaultGender,
          age: '',
          disease: '',
          hospital: '',
          isDefault: true,
          createTime: db.serverDate()
        }
      })

      console.log('🔥🔥🔥 profile/index 兜底创建档案，昵称:', defaultName)


      // 设置为当前档案
      wx.setStorageSync('currentProfileId', res._id)

      // 🔥 释放全局锁
      app.globalData.isCreatingProfile = false

      // 重新加载档案列表
      this.loadProfiles(openid)
    } catch (err) {
      console.error('创建档案失败:', err)

      // 🔥 失败时释放全局锁
      app.globalData.isCreatingProfile = false

      wx.showToast({
        title: '创建档案失败',
        icon: 'none'
      })
    }
  },

  // 跳转到添加档案页面
  showAddProfilePopup() {
    wx.navigateTo({
      url: '/packageB/pages/add-profile/index?type=add'
    });
  },



  // 选择档案
  selectProfile(e) {
    const profileId = e.currentTarget.dataset.id

    if (profileId === this.data.currentProfileId) {
      return // 已经是当前档案，不需要切换
    }

    wx.showModal({
      title: '切换档案',
      content: '切换档案后，将显示该档案下的数据。是否确认切换？',
      success: (res) => {
        if (res.confirm) {
          this.switchProfile(profileId)
        }
      }
    })
  },

  // 切换档案
  async switchProfile(profileId) {
    console.log('=== 开始切换档案 ===')
    console.log('目标档案ID:', profileId)
    console.log('切换前 Storage currentProfileId:', wx.getStorageSync('currentProfileId'))

    wx.showLoading({
      title: '切换中...',
      mask: true
    })

    try {
      // 更新本地存储
      wx.setStorageSync('currentProfileId', profileId)
      console.log('✅ Storage 已更新为:', wx.getStorageSync('currentProfileId'))

      // 🔥 关键：更新app.globalData.currentProfile
      const app = getApp()
      const db = wx.cloud.database()
      const profileRes = await db.collection('userProfiles').doc(profileId).get()

      if (profileRes.data) {
        app.globalData.currentProfile = {
          profileId: profileId,
          id: profileId, // 🔥 添加 id 字段映射，保持结构一致
          ...profileRes.data
        }
        console.log('✅ 档案切换成功，已更新全局档案信息:')
        console.log('  - name:', app.globalData.currentProfile.name)
        console.log('  - profileId:', app.globalData.currentProfile.profileId)
        console.log('  - id:', app.globalData.currentProfile.id)
      }

      // 通知其他页面刷新数据
      app.globalData.needRefreshData = true

      wx.hideLoading()

      // 🔥 强制刷新：使用 reLaunch 重新启动到首页，确保所有页面使用新档案数据
      wx.reLaunch({
        url: '/pages/daily-record/index',
        success: () => {
          console.log('✅ 档案切换完成，已重新加载首页')
        },
        fail: (err) => {
          console.error('❌ 页面重启失败:', err)
          // 降级方案：显示提示并手动刷新
          wx.showToast({
            title: '请手动返回首页刷新',
            icon: 'none',
            duration: 2000
          })
        }
      })
    } catch (err) {
      console.error('❌ 切换档案失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'error'
      })
    }
  },

  // 编辑档案
  editProfile(e) {
    const profileId = e.currentTarget.dataset.id
    const profile = this.data.profiles.find(p => p.id === profileId)

    if (!profile) return

    wx.navigateTo({
      url: `/packageB/pages/add-profile/index?type=edit&profileId=${profileId}`
    });
  },

  // 删除档案
  deleteProfile(e) {
    const profileId = e.currentTarget.dataset.id
    const profile = this.data.profiles.find(p => p.id === profileId)

    if (!profile) return

    if (this.data.profiles.length <= 1) {
      wx.showToast({
        title: '至少保留一个档案',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除档案"${profile.name}"吗？档案下的所有数据将被删除且无法恢复。`,
      confirmColor: '#FFB84D',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteProfile(profileId)
        }
      }
    })
  },

  // 执行删除档案
  async doDeleteProfile(profileId) {
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    // 显示删除loading
    wx.showLoading({
      title: '正在删除...',
      mask: true
    })

    try {
      const db = wx.cloud.database()

      // 删除档案下的所有数据
      await db.collection('keyDates').where({
        openid: openid,
        profileId: profileId
      }).remove()

      await db.collection('todayTasks').where({
        openid: openid,
        profileId: profileId
      }).remove()

      // 删除档案
      await db.collection('userProfiles').doc(profileId).remove()

      wx.hideLoading()
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // 如果删除的是当前档案，切换到第一个档案
      if (profileId === this.data.currentProfileId) {
        const remainingProfiles = this.data.profiles.filter(p => p.id !== profileId)
        if (remainingProfiles.length > 0) {
          this.switchProfile(remainingProfiles[0].id)
        }
      }

      // 重新加载档案列表
      this.loadProfiles(openid)
    } catch (err) {

      wx.hideLoading()
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 设为默认档案
  async setDefaultProfile(e) {
    const profileId = e.currentTarget.dataset.id
    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    console.log('=== 设置默认档案并切换 ===')
    console.log('目标档案ID:', profileId)
    console.log('当前档案ID:', wx.getStorageSync('currentProfileId'))

    // 显示设置loading
    wx.showLoading({
      title: '正在设置...',
      mask: true
    })

    try {
      const db = wx.cloud.database()

      // 取消其他档案的默认状态
      await db.collection('userProfiles')
        .where({
          openid: openid,
          isDefault: true
        })
        .update({
          data: {
            isDefault: false,
            updateTime: db.serverDate()
          }
        })

      // 设置新的默认档案
      await db.collection('userProfiles').doc(profileId).update({
        data: {
          isDefault: true,
          updateTime: db.serverDate()
        }
      })

      // 🔥 关键修复：切换到这个档案
      wx.setStorageSync('currentProfileId', profileId)
      console.log('✅ Storage 已更新为:', wx.getStorageSync('currentProfileId'))

      // 🔥 更新 globalData.currentProfile
      const profileRes = await db.collection('userProfiles').doc(profileId).get()
      if (profileRes.data) {
        app.globalData.currentProfile = {
          profileId: profileId,
          id: profileId,
          ...profileRes.data
        }
        console.log('✅ currentProfile 已更新:', app.globalData.currentProfile.name)
      }

      // 🔥 通知其他页面刷新数据
      app.globalData.needRefreshData = true

      wx.hideLoading()
      wx.showToast({
        title: '设置成功',
        icon: 'success'
      })

      // 重新加载档案列表
      await this.loadProfiles(openid)

      // 🔥 延迟后重启到首页，确保数据刷新
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/daily-record/index'
        })
      }, 1000)
    } catch (err) {
      console.error('❌ 设置默认档案失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      })
    }
  },

  // 显示编辑用户信息弹窗
  showEditUserPopup() {
    const userInfo = this.data.userInfo || {};
    this.setData({
      showEditUserPopup: true,
      editUserForm: {
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || '' // 🔥 移除默认值
      }
    })
  },

  // 关闭编辑用户信息弹窗
  closeEditUserPopup(e) {
    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {
      this.setData({
        showEditUserPopup: e.detail.visible
      });
    } else {
      this.setData({
        showEditUserPopup: false
      });
    }
  },

  // 选择用户头像
  async onChooseUserAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ 'editUserForm.avatarUrl': avatarUrl }); // 先显示本地临时路径

    try {
      wx.showLoading({ title: '上传头像中...', mask: true });

      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();
      const timestamp = Date.now();
      const cloudPath = `user-avatars/${openid}/${timestamp}.png`;

      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl
      });

      this.setData({ 'editUserForm.avatarUrl': uploadResult.fileID }); // 更新为云存储URL
      wx.hideLoading();
      wx.showToast({
        title: '头像上传成功',
        icon: 'success',
        duration: 1500
      });
    } catch (err) {
      console.error('头像上传失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '头像上传失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 输入昵称
  onUserNicknameInput(e) {
    this.setData({
      'editUserForm.nickName': e.detail.value
    })
  },

  // 保存用户信息
  async saveUserInfo() {
    const { avatarUrl, nickName } = this.data.editUserForm;

    if (!nickName || !nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...', mask: true });

      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();

      if (!openid) {
        wx.hideLoading();
        wx.showToast({
          title: '请先去【我的】登录',
          icon: 'none'
        });
        return;
      }

      const db = wx.cloud.database();
      const updatedUserInfo = {
        avatarUrl: avatarUrl,
        nickName: nickName.trim(),
        openid: openid,
        updateTime: db.serverDate()
      };

      // 🔥 查询是否已存在用户信息记录（users 集合）
      const queryRes = await db.collection('users')
        .where({ openid: openid })
        .get();

      if (queryRes.data.length > 0) {
        // 更新现有记录到 users 集合
        await db.collection('users')
          .doc(queryRes.data[0]._id)
          .update({
            data: {
              avatarUrl: avatarUrl,
              nickName: nickName.trim(),
              updateTime: db.serverDate()
            }
          });
        console.log('✅ 用户信息已更新到 users 集合');
      } else {
        // 创建新记录到 users 集合
        await db.collection('users').add({
          data: {
            ...updatedUserInfo,
            createTime: db.serverDate()
          }
        });
        console.log('✅ 用户信息已保存到 users 集合');
      }

      // 更新本地存储
      wx.setStorageSync('userInfo', {
        avatarUrl: avatarUrl,
        nickName: nickName.trim()
      });

      // 更新页面数据
      this.setData({
        userInfo: {
          avatarUrl: avatarUrl,
          nickName: nickName.trim()
        },
        showEditUserPopup: false
      });

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });
    } catch (err) {
      console.error('保存用户信息失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示用户协议
  showUserAgreement() {
    wx.navigateTo({
      url: '/packageB/pages/user-agreement/index'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/packageB/pages/privacy-policy/index'
    })
  },

  // 显示反馈弹窗
  showFeedbackPopup() {
    this.setData({
      showFeedbackPopup: true,
      feedbackContent: '',
      feedbackContact: ''
    })
  },

  // 关闭反馈弹窗
  closeFeedbackPopup(e) {
    if (e && e.detail !== undefined && typeof e.detail.visible === 'boolean') {
      this.setData({
        showFeedbackPopup: e.detail.visible
      });
      if (!e.detail.visible) {
        this.setData({
          feedbackContent: '',
          feedbackContact: ''
        });
      }
    } else {
      this.setData({
        showFeedbackPopup: false,
        feedbackContent: '',
        feedbackContact: ''
      });
    }
  },

  // 反馈内容输入
  onFeedbackInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    })
  },

  // 联系方式输入
  onContactInput(e) {
    this.setData({
      feedbackContact: e.detail.value
    })
  },

  // 提交反馈
  async submitFeedback() {
    if (!this.data.feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '提交中...',
      mask: true
    })

    const app = getApp()
    const openid = app.getOpenIdIfLoggedIn()

    try {
      const db = wx.cloud.database()
      const userInfo = wx.getStorageSync('userInfo')

      await db.collection('feedbacks').add({
        data: {
          content: this.data.feedbackContent.trim(),
          contact: this.data.feedbackContact.trim(),
          openid: openid || '',
          userInfo: userInfo || {},
          createTime: db.serverDate(),
          status: 'pending' // 处理状态：pending, processing, resolved
        }
      })

      wx.showToast({
        title: '反馈提交成功',
        icon: 'success'
      })

      this.setData({
        showFeedbackPopup: false,
        feedbackContent: '',
        feedbackContact: ''
      })
    } catch (err) {

      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },


  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmColor: '#FFB84D',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.clearLoginState()
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            profiles: [],
            currentProfileId: ''
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 加载当前用药数据
  async loadCurrentMedications() {
    if (!this.data.currentProfileId) return;

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    if (!openid) return;

    try {
      const db = wx.cloud.database();
      const today = this.formatDate(new Date());

      // 查询今日用药
      const res = await db.collection('medications')
        .where({
          openid: openid,
          profileId: this.data.currentProfileId,
          date: today
        })
        .get();

      let currentMedications = [];
      let totalSlots = 0;
      let completedSlots = 0;

      if (res.data.length > 0) {
        const todayMedication = res.data[0];
        currentMedications = todayMedication.medicines || [];

        // 计算完成进度
        currentMedications.forEach(medicine => {
          if (medicine.timesPerDay && medicine.timesPerDay.length > 0) {
            totalSlots += medicine.timesPerDay.length;
            if (medicine.timeSlotStatus) {
              completedSlots += medicine.timesPerDay.filter(slot =>
                medicine.timeSlotStatus[slot] === true
              ).length;
            }
          } else {
            totalSlots += 1;
            if (medicine.taken) completedSlots += 1;
          }
        });
      }

      const progress = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

      this.setData({
        currentMedications: currentMedications,
        todayMedicationProgress: progress
      });

    } catch (err) {

    }
  },
})
