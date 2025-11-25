// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-9gzf2w8c9c9b7b73',
        traceUser: true,
      }).then(() => {
        // 从本地存储获取用户信息
        const userInfo = wx.getStorageSync('userInfo')
        const openid = wx.getStorageSync('openid')

        if (userInfo && openid && openid.trim() !== '') {
          this.globalData.userInfo = userInfo
          this.globalData.openid = openid
          this.globalData.hasUserInfo = true

          // 初始化档案信息 - 等待完成后再继续
          this.initCurrentProfile(openid).then(() => {
            console.log('✅ [app.js] 档案信息初始化完成');

            // 登录成功后初始化数据库集合
            this.initCollections().then(() => {
              console.log('数据库集合初始化完成');
            }).catch(err => {
              console.error('数据库集合初始化失败：', err);
            });
          }).catch(err => {
            console.error('❌ [app.js] 档案信息初始化失败:', err);
          });
        } else {
          console.log('未登录')
          this.globalData.hasUserInfo = false
          this.globalData.openid = null
          this.globalData.userInfo = null
        }
      }).catch(err => {
        console.error('云开发初始化失败：', err);
      });
    }
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    openid: null,
    hasUserInfo: false,
    needRefreshData: false, // 用于通知其他页面数据变更
    currentProfile: null, // 当前档案信息
    isCreatingProfile: false, // 🔥 防止重复创建档案的全局锁
    profileInitialized: false // 🔥 新增：标记档案是否已初始化完成
  },

  // 防止频繁调用的变量
  lastLoginAttempt: null,
  // 临时存储openid，等待用户选择头像
  tempOpenId: null,

  // 初始化数据库集合
  async initCollections() {
    try {
      const db = wx.cloud.database()

      // 创建索引
      try {
        await db.collection('keyDates').createIndex({
          name: 'openid_index',
          unique: false,
          keys: [{
            name: 'openid',
            direction: 'asc'
          }]
        })
        console.log('创建 keyDates 索引成功')
      } catch (err) {
        console.log('keyDates 索引已存在')
      }

      try {
        await db.collection('todayTasks').createIndex({
          name: 'openid_index',
          unique: false,
          keys: [{
            name: 'openid',
            direction: 'asc'
          }]
        })
        console.log('创建 todayTasks 索引成功')
      } catch (err) {
        console.log('todayTasks 索引已存在')
      }

      try {
        await db.collection('userProfiles').createIndex({
          name: 'openid_index',
          unique: false,
          keys: [{
            name: 'openid',
            direction: 'asc'
          }]
        })
        console.log('创建 userProfiles 索引成功')
      } catch (err) {
        console.log('userProfiles 索引已存在')
      }

      try {
        await db.collection('users').createIndex({
          name: 'openid_index',
          unique: false,
          keys: [{
            name: 'openid',
            direction: 'asc'
          }]
        })
        console.log('创建 users 索引成功')
      } catch (err) {
        console.log('users 索引已存在')
      }

      return true
    } catch (err) {
      console.error('初始化集合失败：', err)
      throw err
    }
  },

  // 检查登录状态
  // 检查用户登录状态
  async checkLoginStatus() {
    try {
      // 从本地缓存获取用户信息和openid
      const userInfo = wx.getStorageSync('userInfo')
      const openid = wx.getStorageSync('openid')

      // 判断用户信息和openid是否存在且openid不为空
      if (userInfo && openid && openid.trim() !== '') {
        // 设置全局数据，标记已登录
        this.globalData.userInfo = userInfo
        this.globalData.openid = openid
        this.globalData.hasUserInfo = true
        console.log('已登录，用户信息：', userInfo)
        return true
      } else {
        // 未登录，设置全局标记为未登录
        console.log('未登录')
        this.globalData.hasUserInfo = false
        return false
      }
    } catch (err) {
      // 捕获异常，输出错误信息，并设置全局标记为未登录
      console.error('检查登录状态失败：', err)
      this.globalData.hasUserInfo = false
      return false
    }
  },

  // 处理登录
  async handleLogin() {
    try {
      // 调用微信登录
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })

      if (!loginResult.code) {
        throw new Error('登录失败：' + loginResult.errMsg)
      }

      console.log('微信登录成功，code:', loginResult.code)
      return loginResult.code
    } catch (err) {
      console.error('登录失败：', err)
      this.clearLoginState()
      return false
    }
  },

  // 处理用户信息授权
  async handleUserProfile(e) {
    try {
      console.log('处理用户信息：', e)
      if (!e.userInfo) {
        throw new Error('获取用户信息失败')
      }

      // 保存用户信息
      this.globalData.userInfo = e.userInfo
      this.globalData.hasUserInfo = true
      wx.setStorageSync('userInfo', e.userInfo)

      // 获取 openid
      const callResult = await wx.cloud.callFunction({
        name: 'getOpenId'
      })
      console.log('获取openid完整结果：', JSON.stringify(callResult, null, 2))

      const result = callResult.result
      console.log('云函数返回的 result：', result)

      const userInfo = result ? result.userInfo : null
      const openid = userInfo ? userInfo.openId : null

      if (openid && openid.trim() !== '') {
        this.globalData.openid = openid
        wx.setStorageSync('openid', openid)
        console.log('登录成功，openid:', openid)

        // 登录成功后初始化数据库集合
        try {
          await this.initCollections();
          console.log('数据库集合初始化完成');
        } catch (err) {
          console.error('数据库集合初始化失败：', err);
        }

        return true
      }
      return false
    } catch (err) {
      console.error('处理用户信息失败：', err)
      this.clearLoginState()
      return false
    }
  },

  // 清除登录状态
  clearLoginState() {
    console.log('清除登录状态')
    this.globalData.userInfo = null
    this.globalData.openid = null
    this.globalData.hasUserInfo = false
    this.globalData.needRefreshData = false
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('openid')
    wx.removeStorageSync('currentProfileId')
  },

  // 获取当前档案ID
  getCurrentProfileId() {
    return wx.getStorageSync('currentProfileId') || ''
  },

  // 检查是否已登录，返回 openid 或 false
  getOpenIdIfLoggedIn() {
    const openid = this.globalData.openid || wx.getStorageSync('openid')
    const userInfo = this.globalData.userInfo || wx.getStorageSync('userInfo')

    // 严格检查登录状态：必须有openid、userInfo，且userInfo包含昵称
    if (openid && openid.trim() !== '' && userInfo && userInfo.nickName) {
      // 同步到 globalData
      this.globalData.openid = openid
      this.globalData.userInfo = userInfo
      this.globalData.hasUserInfo = true
      return openid
    }

    // 如果缓存数据不完整，清除登录状态
    if ((openid && !userInfo) || (userInfo && !openid)) {
      console.log('登录数据不完整，清除登录状态')
      this.clearLoginState()
    }

    return false
  },

  // 检查是否已登录，未登录则显示登录提示
  checkLogin() {
    return new Promise((resolve, reject) => {
      const openid = this.getOpenIdIfLoggedIn()
      if (openid) {
        resolve(openid)
      } else {
        this.showLoginAndGetOpenId().then(resolve).catch(reject)
      }
    })
  },

  // 显示登录并获取 openid
  showLoginAndGetOpenId() {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能使用此功能',
        confirmText: '立即登录',
        cancelText: '暂不登录',
        success: (res) => {
          if (res.confirm) {
            // 用户点击立即登录后直接调用doLogin
            this.doLogin().then(resolve).catch(reject)
          } else {
            reject(new Error('用户取消登录'))
          }
        },
        fail: () => {
          reject(new Error('显示登录对话框失败'))
        }
      })
    })
  },

  // 静默获取openid（新登录流程第一步）
  getOpenIdSilently() {
    return new Promise((resolve, reject) => {
      // 防止频繁调用
      const now = Date.now()
      if (this.lastLoginAttempt && (now - this.lastLoginAttempt) < 3000) {
        reject(new Error('请求过于频繁，请稍后再试'))
        return
      }
      this.lastLoginAttempt = now

      // 直接调用云函数获取openid，无需用户交互
      wx.cloud.callFunction({
        name: 'getOpenId',
        success: (result) => {
          const cloudResult = result.result
          const userInfoFromCloud = cloudResult ? cloudResult.userInfo : null
          const openid = userInfoFromCloud ? userInfoFromCloud.openId : null

          if (openid && openid.trim() !== '') {
            // 暂存openid，等待用户选择头像
            this.tempOpenId = openid
            resolve(openid)
          } else {
            reject(new Error('获取openid失败'))
          }
        },
        fail: (err) => {
          console.error('获取openid失败:', err)
          reject(new Error('网络错误，请重试'))
        }
      })
    })
  },

  // 检查用户是否已完成注册（支持数据迁移）
  async checkUserRegistrationCompleted(openid) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('users')
        .where({ openid: openid })
        .get()

      if (res.data.length > 0) {
        const user = res.data[0]
        return user.registrationComplete === true
      }

      // 如果users集合中没有记录，尝试数据迁移
      console.log('users集合中无用户记录，尝试数据迁移')
      const migrated = await this.migrateUserData()

      if (migrated) {
        // 迁移成功，认为用户已完成注册
        return true
      }

      return false
    } catch (err) {
      console.error('检查用户注册状态失败:', err)
      return false
    }
  },

  // 获取用户基础信息
  async getUserBasicInfo(openid) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('users')
        .where({ openid: openid })
        .get()

      if (res.data.length > 0) {
        return res.data[0]
      }

      return null
    } catch (err) {
      console.error('获取用户基础信息失败:', err)
      return null
    }
  },

  // 创建或更新用户基础信息
  async saveUserBasicInfo(userInfo) {
    try {
      const db = wx.cloud.database()
      const openid = this.getOpenIdIfLoggedIn()

      if (!openid) {
        throw new Error('用户未登录')
      }

      // 检查用户是否已存在于 users 集合
      const existingUserRes = await db.collection('users')
        .where({ openid: openid })
        .get()

      const userData = {
        openid: openid,
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || '',
        age: userInfo.age || '',
        gender: userInfo.gender || 'male',
        disease: userInfo.disease || '',
        hospital: userInfo.hospital || '',
        registrationComplete: true,
        updateTime: db.serverDate()
      }

      if (existingUserRes.data.length > 0) {
        // 更新现有用户信息到 users 集合
        await db.collection('users').doc(existingUserRes.data[0]._id).update({
          data: userData
        })
        console.log('✅ 更新用户信息成功 (users):', userData.nickName)
      } else {
        // 创建新用户记录到 users 集合
        userData.createTime = db.serverDate()
        await db.collection('users').add({
          data: userData
        })
        console.log('✅ 创建用户信息成功 (users):', userData.nickName)
      }

      // 🔥 同步更新 Storage 中的 userInfo
      const updatedUserInfo = {
        avatarUrl: userData.avatarUrl,
        nickName: userData.nickName
      }
      wx.setStorageSync('userInfo', updatedUserInfo)
      this.globalData.userInfo = updatedUserInfo

      return userData
    } catch (err) {
      console.error('❌ 保存用户信息失败:', err)
      throw err
    }
  },

  // 数据迁移：从userProfiles迁移到users集合
  async migrateUserData() {
    try {
      const db = wx.cloud.database()
      const openid = this.getOpenIdIfLoggedIn()

      if (!openid) return false

      // 检查用户是否已存在于users集合
      const existingUser = await this.getUserBasicInfo(openid)
      if (existingUser) {
        console.log('用户已存在于users集合，跳过迁移')
        return true
      }

      // 从userProfiles获取默认档案信息进行迁移
      const profileRes = await db.collection('userProfiles')
        .where({
          openid: openid,
          isDefault: true
        })
        .get()

      if (profileRes.data.length > 0) {
        const profile = profileRes.data[0]

        // 创建users记录
        const userData = {
          openid: openid,
          avatarUrl: '',
          nickName: profile.realName || profile.name || '', // 🔥 移除默认值
          age: profile.age || '',
          gender: profile.gender || 'male',
          disease: profile.disease || '',
          hospital: profile.hospital || '',
          registrationComplete: true,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          migratedFrom: 'userProfiles' // 标记为迁移数据
        }

        await db.collection('users').add({ data: userData })
        console.log('用户数据迁移成功')
        return true
      }

      return false
    } catch (err) {
      console.error('用户数据迁移失败:', err)
      return false
    }
  },

  // 使用选择的头像完成登录
  async completeLoginWithAvatar(userInfo) {
    if (!this.tempOpenId) {
      throw new Error('登录状态异常，请重新登录')
    }

    try {
      // 清除之前的登录状态
      this.clearLoginState()

      // 保存完整的登录状态
      this.globalData.openid = this.tempOpenId
      this.globalData.userInfo = userInfo
      this.globalData.hasUserInfo = true
      this.globalData.isLoggedIn = true

      wx.setStorageSync('openid', this.tempOpenId)
      wx.setStorageSync('userInfo', userInfo)

      console.log('登录完成:', {
        openid: this.tempOpenId,
        nickName: userInfo.nickName,
        hasAvatar: !!userInfo.avatarUrl
      })

      // 清除临时openid
      this.tempOpenId = null

      // 初始化数据库集合
      try {
        await this.initCollections()
        console.log('数据库初始化完成')

        // 尝试数据迁移（如果需要）
        await this.migrateUserData()
      } catch (err) {
        console.error('数据库初始化失败:', err)
        // 不影响登录流程
      }

    } catch (err) {
      console.error('登录失败:', err)
      this.tempOpenId = null
      this.clearLoginState()
      throw err
    }
  },

  // 保留原有的登录方法供兼容
  doLogin() {
    return new Promise((resolve, reject) => {
      // 防止频繁调用，检查是否在短时间内重复调用
      const now = Date.now()
      if (this.lastLoginAttempt && (now - this.lastLoginAttempt) < 3000) {
        wx.showToast({
          title: '请稍后再试',
          icon: 'none'
        })
        reject(new Error('请求过于频繁，请稍后再试'))
        return
      }
      this.lastLoginAttempt = now

      // 显示加载提示
      wx.showLoading({
        title: '正在登录...',
        mask: true
      })

      wx.getUserProfile({
        desc: '用于完善会员资料，优化服务体验',
        success: (res) => {
          const userInfo = res.userInfo
          console.log('获取用户信息成功:', userInfo)

          // 验证用户信息完整性
          if (!userInfo.nickName || !userInfo.avatarUrl) {
            wx.hideLoading()
            reject(new Error('用户信息不完整，请重新授权'))
            return
          }

          // 清除之前的登录状态（只在授权成功后清除）
          this.clearLoginState()

          // 调用云函数获取openid
          wx.cloud.callFunction({
            name: 'getOpenId',
            success: (result) => {
              console.log('云函数调用成功:', result)
              const cloudResult = result.result
              const userInfoFromCloud = cloudResult ? cloudResult.userInfo : null
              const openid = userInfoFromCloud ? userInfoFromCloud.openId : null

              if (openid && openid.trim() !== '') {
                // 保存登录状态
                this.globalData.openid = openid
                this.globalData.userInfo = userInfo
                this.globalData.hasUserInfo = true
                this.globalData.isLoggedIn = true

                wx.setStorageSync('openid', openid)
                wx.setStorageSync('userInfo', userInfo)

                console.log('登录成功，保存用户信息:', {
                  openid: openid,
                  nickName: userInfo.nickName
                })

                // 初始化数据库集合
                this.initCollections().then(() => {
                  console.log('数据库集合初始化完成')
                  wx.hideLoading()
                  resolve(openid)
                }).catch(err => {
                  console.error('数据库集合初始化失败：', err)
                  wx.hideLoading()
                  resolve(openid) // 即使初始化失败也认为登录成功
                })
              } else {
                wx.hideLoading()
                this.clearLoginState()
                reject(new Error('获取 openid 失败'))
              }
            },
            fail: (err) => {
              console.error('调用云函数失败:', err)
              wx.hideLoading()
              this.clearLoginState()
              reject(new Error('云函数调用失败: ' + err.errMsg))
            }
          })
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err)
          wx.hideLoading()
          if (err.errMsg.indexOf('deny') !== -1 || err.errMsg.indexOf('cancel') !== -1) {
            reject(new Error('用户取消登录'))
          } else {
            reject(new Error('获取用户信息失败: ' + err.errMsg))
          }
        }
      })
    })
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          const userInfo = res.userInfo
          this.globalData.userInfo = userInfo
          wx.setStorageSync('userInfo', userInfo)

          // 获取 openid
          wx.cloud.callFunction({
            name: 'getOpenId',
            success: (res) => {
              console.log('getUserProfile 云函数调用结果:', JSON.stringify(res, null, 2))
              const result = res.result
              const userInfo = result ? result.userInfo : null
              const openid = userInfo ? userInfo.openId : null

              if (openid && openid.trim() !== '') {
                this.globalData.openid = openid
                this.globalData.isLoggedIn = true
                wx.setStorageSync('openid', openid)
                resolve(true)
              } else {
                this.clearLoginState()
                reject(new Error('获取 openid 失败'))
              }
            },
            fail: (err) => {
              this.clearLoginState()
              reject(err)
            }
          })
        },
        fail: (err) => {
          this.clearLoginState()
          reject(err)
        }
      })
    })
  },

  // 获取openid
  getOpenId() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'getOpenId',
        success: res => {
          if (!res.result || !res.result.userInfo || !res.result.userInfo.openId) {
            reject(new Error('获取openid失败：返回数据格式错误'));
            return;
          }
          console.log('获取openid成功：', res.result.userInfo.openId);
          resolve(res.result.userInfo.openId);
        },
        fail: err => {
          console.error('获取openid失败：', err);
          reject(err);
        }
      });
    });
  },

  // 显示登录对话框
  showLoginModal() {
    return new Promise((resolve, reject) => {
      wx.showModal({
        title: '欢迎记事本',
        content: '为了更好的记录您的健康信息，需要您的授权',
        confirmText: '去登录',
        cancelText: '暂不登录',
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  },

  // 初始化当前档案信息
  async initCurrentProfile(openid) {
    try {
      console.log('🔄 [app.js] 开始初始化档案信息, openid:', openid);
      const db = wx.cloud.database();
      let currentProfileId = wx.getStorageSync('currentProfileId');

      console.log('📂 [app.js] Storage中的档案ID:', currentProfileId);

      // 如果没有设置档案ID，尝试获取默认档案
      if (!currentProfileId) {
        console.log('⚠️ [app.js] 未找到档案ID，查找默认档案');
        const defaultProfileRes = await db.collection('userProfiles')
          .where({
            openid: openid,
            isDefault: true
          })
          .get();

        if (defaultProfileRes.data.length > 0) {
          currentProfileId = defaultProfileRes.data[0]._id;
          wx.setStorageSync('currentProfileId', currentProfileId);
          console.log('✅ [app.js] 找到默认档案，设置档案ID:', currentProfileId);
        } else {
          // 如果没有默认档案，获取第一个档案
          console.log('⚠️ [app.js] 未找到默认档案，查找第一个档案');
          const profileRes = await db.collection('userProfiles')
            .where({ openid: openid })
            .limit(1)
            .get();

          if (profileRes.data.length > 0) {
            currentProfileId = profileRes.data[0]._id;
            wx.setStorageSync('currentProfileId', currentProfileId);
            console.log('✅ [app.js] 找到第一个档案，设置档案ID:', currentProfileId);
          } else {
            console.error('❌ [app.js] 未找到任何档案！');
          }
        }
      }

      // 如果有档案ID，加载档案详细信息
      if (currentProfileId) {
        console.log('🔍 [app.js] 加载档案详细信息, ID:', currentProfileId);
        const profileRes = await db.collection('userProfiles')
          .doc(currentProfileId)
          .get();

        if (profileRes.data) {
          this.globalData.currentProfile = {
            profileId: currentProfileId, // 使用 profileId 字段名，与项目中的检查逻辑一致
            id: currentProfileId, // 🔥 添加 id 字段映射，与 pages/profile/index.js 中的结构保持一致
            ...profileRes.data
          };
          console.log('✅ [app.js] 档案信息加载成功:', {
            profileId: this.globalData.currentProfile.profileId,
            name: this.globalData.currentProfile.name,
            disease: this.globalData.currentProfile.primaryDiseaseCategory
          });
          this.globalData.profileInitialized = true; // 🔥 标记档案已初始化
        } else {
          console.error('❌ [app.js] 档案数据为空！');
        }
      } else {
        console.warn('⚠️ [app.js] 未找到任何档案，用户可能需要创建档案');
      }

    } catch (err) {
      console.error('❌ [app.js] 初始化档案信息失败:', err);
      this.globalData.profileInitialized = false; // 标记初始化失败
      throw err; // 抛出错误以便上层捕获
    }
  }
})
