Page({
  data: {
    // 基本信息
    selectedAvatar: '',
    selectedNickname: '', // 🔥 移除默认值，让用户使用微信昵称或手动输入
    selectedAge: '',
    selectedGender: 'male',
    selectedHospital: '',

    // 疾病分类 - 更灵活的二级分类结构
    diseaseCategories: [
      {
        id: 'leukemia',
        name: '白血病',
        children: [
          { id: 'all_b', name: '急淋-B', code: 'ALL-B' },
          { id: 'all_t', name: '急淋-T', code: 'ALL-T' },
          { id: 'aml', name: '急髓', code: 'AML' },
          { id: 'ph_all', name: '费阳急淋', code: 'Ph+ALL' },
          { id: 'early_t', name: '早期前体T', code: 'ETP-ALL' },
          { id: 't_lbl', name: 'T淋巴母细胞/白血病', code: 'T-LBL' },
          { id: 'b_lbl', name: 'B淋巴母细胞/白血病', code: 'B-LBL' },
          { id: 'cml_cp', name: 'CML慢髓', code: 'CML-CP' },
          { id: 'cml_bp', name: 'CML急变', code: 'CML-BP' },
          { id: 'm3_apl', name: 'M3急性早幼粒', code: 'APL' },
          { id: 'mixed', name: '混合型', code: 'MPAL' },
          { id: 'cll_sll', name: '慢淋小淋', code: 'CLL/SLL' },
          { id: 'other_leukemia', name: '其他类型白血病', code: 'OTHER' }
        ]
      },
      {
        id: 'mds',
        name: 'MDS',
        children: [
          { id: 'mds_sld', name: 'MDS-SLD', code: 'MDS-SLD' },
          { id: 'mds_mld', name: 'MDS-MLD', code: 'MDS-MLD' },
          { id: 'mds_rs_sld', name: 'MDS-RS-SLD', code: 'MDS-RS-SLD' },
          { id: 'mds_rs_mld', name: 'MDS-RS-MLD', code: 'MDS-RS-MLD' },
          { id: 'mds_eb1', name: 'MDS-EB-1', code: 'MDS-EB-1' },
          { id: 'mds_eb2', name: 'MDS-EB-2', code: 'MDS-EB-2' },
          { id: 'mds_u', name: 'MDS-U', code: 'MDS-U' },
          { id: 'mds_del5q', name: 'MDS伴单独del(5q)', code: 'MDS-del5q' }
        ]
      },
      {
        id: 'lymphoma',
        name: '淋巴瘤',
        children: [
          { id: 'hodgkin', name: '霍奇金', code: 'HL' },
          { id: 'dlbcl', name: '弥漫性大B', code: 'DLBCL' },
          { id: 'hgbl_nos', name: '高级别B非特指', code: 'HGBL-NOS' },
          { id: 'fl_low', name: '滤泡低级别', code: 'FL-LG' },
          { id: 'fl_3b', name: '滤泡3B', code: 'FL-3B' },
          { id: 'fl_transform', name: '滤泡转大B', code: 'FL-TB' },
          { id: 'fl_pediatric', name: '儿童滤泡', code: 'PFL' },
          { id: 'b_lbl_lymphoma', name: 'B淋巴母细胞', code: 'B-LBL' },
          { id: 'mcl', name: '套细胞', code: 'MCL' },
          { id: 'mzl', name: '边缘区', code: 'MZL' },
          { id: 'burkitt', name: '伯基特', code: 'BL' },
          { id: 'cll_sll_lymphoma', name: '慢淋/小淋', code: 'CLL/SLL' },
          { id: 'wm', name: '华氏巨球', code: 'WM' },
          { id: 'lymphoma_transform', name: '慢淋转化', code: 'LT' },
          { id: 'nkt', name: 'NK/T', code: 'NK/T' },
          { id: 't_lbl_lymphoma', name: 'T淋巴母细胞', code: 'T-LBL' },
          { id: 'ptcl_nos', name: '外周T，非特指', code: 'PTCL-NOS' },
          { id: 'aitl', name: '血管免疫母', code: 'AITL' },
          { id: 'tfh', name: '滤泡辅助T', code: 'TFH' },
          { id: 'alcl', name: '皮肤间变大', code: 'ALCL' },
          { id: 'alcl_alk_pos', name: 'ALK+间变大', code: 'ALCL-ALK+' },
          { id: 'alcl_alk_neg', name: 'ALK-间变大', code: 'ALCL-ALK-' },
          { id: 'hstl', name: '肝脾T', code: 'HSTL' },
          { id: 'eatl', name: '肠道T', code: 'EATL' },
          { id: 'mf', name: '蕈样肉芽肿', code: 'MF' },
          { id: 'sptcl', name: '脂膜炎T', code: 'SPTCL' },
          { id: 'other_lymphoma', name: '其他类型淋巴瘤', code: 'OTHER' }
        ]
      },
      {
        id: 'myeloma',
        name: '骨髓瘤',
        children: [
          { id: 'igg', name: 'IgG型', code: 'IgG' },
          { id: 'iga', name: 'IgA型', code: 'IgA' },
          { id: 'igm', name: 'IgM型', code: 'IgM' },
          { id: 'igd', name: 'IgD型', code: 'IgD' },
          { id: 'ige', name: 'IgE型', code: 'IgE' },
          { id: 'light_chain', name: '轻链型', code: 'LC' },
          { id: 'non_secretory', name: '非分泌型', code: 'NS' },
          { id: 'biclonal', name: '双克隆型', code: 'BC' },
          { id: 'plasmablastic', name: '浆白', code: 'PB' },
          { id: 'blind_type', name: '冒烟型', code: 'SMM' },
          { id: 'unclear_myeloma', name: '不清楚分型', code: 'UNCLEAR' },
          { id: 'other_myeloma', name: '其他分型骨髓瘤', code: 'OTHER' }
        ]
      },
      {
        id: 'mpn',
        name: 'MPN',
        children: [
          { id: 'pv', name: '真性红细胞增多症', code: 'PV' },
          { id: 'et', name: '原发性血小板增多症', code: 'ET' },
          { id: 'pmf', name: '原发性骨髓纤维化', code: 'PMF' },
          { id: 'other_mpn', name: '其他MPN', code: 'OTHER-MPN' }
        ]
      },
      {
        id: 'aplastic',
        name: '再障',
        children: []
      },
      {
        id: 'neuroblastoma',
        name: '神母细胞瘤',
        children: []
      },
      {
        id: 'solid_tumor',
        name: '实体瘤',
        children: [
          { id: 'breast', name: '乳腺癌', code: 'BC' },
          { id: 'lung', name: '肺癌', code: 'LC' },
          { id: 'gastric', name: '胃癌', code: 'GC' },
          { id: 'colorectal', name: '结直肠癌', code: 'CRC' },
          { id: 'liver', name: '肝癌', code: 'HCC' },
          { id: 'osteosarcoma', name: '骨肉瘤', code: 'OS' },
          { id: 'renal', name: '肾癌', code: 'RCC' },
          { id: 'nasopharyngeal', name: '鼻咽癌', code: 'NPC' },
          { id: 'melanoma', name: '黑色素瘤', code: 'MEL' },
          { id: 'glioma', name: '胶质瘤', code: 'GBM' },
          { id: 'bone_soft_tissue', name: '骨与软组织肿瘤', code: 'BST' },
          { id: 'net', name: '神经内分泌肿瘤', code: 'NET' },
          { id: 'other_solid', name: '其他实体瘤', code: 'OTHER' }
        ]
      }
    ],

    // 选择状态
    currentLevel: 'primary', // 'primary' 或 'secondary'
    selectedPrimaryCategory: null,
    selectedSecondaryCategory: null,
    selectedDiseaseText: '', // 最终显示的文本
    selectedPrimaryCategoryId: '', // 一级分类ID
    selectedSecondaryCategoryId: '', // 二级分类ID
    // 浏览状态（用于区分正在浏览和已确认选择）
    browsingPrimaryCategory: null,
    browsingSecondaryCategory: null,

    // 状态控制
    confirmBtnText: '完成登录',
    canConfirm: false,
    showDiseasePopup: false
  },

  onLoad(options) {

    this.checkCanConfirm();
  },

  // 选择头像
  onChooseAvatar(e) {
    try {
      const { avatarUrl } = e.detail;


      if (avatarUrl) {
        // 显示上传进度
        wx.showLoading({
          title: '正在上传头像...',
          mask: true
        });

        // 上传头像到云存储
        this.uploadAvatar(avatarUrl);
      } else {
        throw new Error('头像获取失败');
      }
    } catch (err) {


      // 开发工具兼容性处理 - 自动使用默认头像
      if (err.message && err.message.includes('ENOENT')) {

        this.skipAvatar();

        // 给用户一个简单的提示
        wx.showToast({
          title: '已自动使用默认头像',
          icon: 'none',
          duration: 1500
        });
      } else {
        wx.showToast({
          title: '头像选择失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 上传头像到云存储
  async uploadAvatar(localPath) {
    try {
      const app = getApp();
      const openid = app.tempOpenId || app.getOpenIdIfLoggedIn();

      if (!openid) {
        throw new Error('用户ID获取失败');
      }

      // 生成云存储文件名
      const timestamp = Date.now();
      const cloudPath = `avatars/${openid}_${timestamp}.jpg`;

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: localPath
      });



      // 更新页面状态，重新检查表单状态
      this.setData({
        selectedAvatar: uploadResult.fileID // 使用云存储的fileID
      }, () => {
        // 在状态更新完成后重新检查表单
        this.checkCanConfirm();
      });

      wx.hideLoading();
      wx.showToast({
        title: '头像上传成功',
        icon: 'success',
        duration: 1000
      });

    } catch (err) {

      wx.hideLoading();

      // 上传失败，使用默认头像
      this.skipAvatar();

      wx.showToast({
        title: '头像上传失败，已使用默认头像',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 跳过头像选择
  skipAvatar() {
    // 生成一个默认头像URL（使用微信默认灰色头像）
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iNTAiIGZpbGw9IiNFNUU1RTUiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSIzNSIgcj0iMTUiIGZpbGw9IiM5OTk5OTkiLz4KPGVwYXRoIGQ9Ik01MCA2NUMzNi4xOTI5IDY1IDI1IDUzLjgwNzEgMjUgNDBDMjUgMzguMzQzMSAyNS4xNjQ3IDM2LjcyNTMgMjUuNDgzMyAzNS4xNkMzMS41ODMzIDQwLjQ4IDQwLjE2NjcgNDMuMzMzMyA1MCA0My4zMzMzQzU5LjgzMzMgNDMuMzMzMyA2OC40MTY3IDQwLjQ4IDc0LjUxNjcgMzUuMTZDNzQuODM1MyAzNi43MjUzIDc1IDM4LjM0MzEgNzUgNDBDNzUgNTMuODA3MSA2My44MDcxIDY1IDUwIDY1WiIgZmlsbD0iIzk5OTk5OSIvPgo8L3N2Zz4K';

    this.setData({
      selectedAvatar: defaultAvatar
    }, () => {
      this.checkCanConfirm();
    });

    wx.showToast({
      title: '已使用默认头像',
      icon: 'success',
      duration: 1000
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      selectedNickname: e.detail.value
    }, () => {
      this.checkCanConfirm();
    });
  },

  // 年龄输入
  onAgeInput(e) {
    const value = e.detail.value;
    // 限制年龄在0-150之间
    if (value && (parseInt(value) < 0 || parseInt(value) > 150)) {
      return;
    }
    this.setData({
      selectedAge: value
    }, () => {
      this.checkCanConfirm();
    });
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      selectedGender: gender
    });
  },

  // 医院输入
  onHospitalInput(e) {
    this.setData({
      selectedHospital: e.detail.value
    });
  },

  // 显示疾病选择弹窗
  showDiseaseSelector() {
    // 根据当前已选择的疾病设置正确的高亮状态
    const { selectedPrimaryCategoryId, selectedSecondaryCategoryId } = this.data;

    let primaryCategory = null;
    let secondaryCategory = null;
    let currentLevel = 'primary';

    if (selectedPrimaryCategoryId) {
      primaryCategory = this.data.diseaseCategories.find(cat => cat.id === selectedPrimaryCategoryId);
      if (primaryCategory && selectedSecondaryCategoryId) {
        secondaryCategory = primaryCategory.children.find(child => child.id === selectedSecondaryCategoryId);
        currentLevel = 'secondary';
      }
    }

    this.setData({
      showDiseasePopup: true,
      currentLevel: currentLevel,
      selectedPrimaryCategory: primaryCategory,
      selectedSecondaryCategory: secondaryCategory,
      // 初始化浏览状态为已确认的选择状态
      browsingPrimaryCategory: primaryCategory,
      browsingSecondaryCategory: secondaryCategory
    });
  },

  // 关闭疾病选择弹窗
  closeDiseasePopup() {
    this.setData({
      showDiseasePopup: false
    });
  },

  // 选择一级分类
  selectPrimaryCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.diseaseCategories.find(cat => cat.id === categoryId);

    if (category) {
      // 如果分类有子类，进入二级选择（只更新浏览状态）
      if (category.children && category.children.length > 0) {
        // 判断是否点击的是已确认选择的一级分类
        let secondaryBrowsingState = null;
        if (this.data.selectedPrimaryCategory && this.data.selectedPrimaryCategory.id === category.id) {
          // 如果是已确认的一级分类，保持二级分类的浏览状态
          secondaryBrowsingState = this.data.browsingSecondaryCategory;
        }

        this.setData({
          browsingPrimaryCategory: category,
          browsingSecondaryCategory: secondaryBrowsingState,
          currentLevel: 'secondary'
        });
      } else {
        // 如果没有子类，直接确认选择一级分类
        this.setData({
          selectedPrimaryCategory: category,
          selectedSecondaryCategory: null,
          selectedPrimaryCategoryId: category.id,
          selectedSecondaryCategoryId: '',
          selectedDiseaseText: this.generateDiseaseDisplayText(category.name, null),
          browsingPrimaryCategory: category,
          browsingSecondaryCategory: null
        });

        // 自动关闭弹窗
        setTimeout(() => {
          this.closeDiseasePopup();
        }, 300);
      }
    }
  },

  // 选择二级分类
  selectSecondaryCategory(e) {
    const diseaseId = e.currentTarget.dataset.id;
    const { browsingPrimaryCategory } = this.data;

    if (browsingPrimaryCategory) {
      const secondaryCategory = browsingPrimaryCategory.children.find(child => child.id === diseaseId);
      if (secondaryCategory) {
        // 确认选择，同时更新确认状态和浏览状态
        this.setData({
          selectedPrimaryCategory: browsingPrimaryCategory,
          selectedSecondaryCategory: secondaryCategory,
          selectedPrimaryCategoryId: browsingPrimaryCategory.id,
          selectedSecondaryCategoryId: secondaryCategory.id,
          selectedDiseaseText: this.generateDiseaseDisplayText(browsingPrimaryCategory.name, secondaryCategory.name),
          browsingPrimaryCategory: browsingPrimaryCategory,
          browsingSecondaryCategory: secondaryCategory
        });

        // 自动关闭弹窗
        setTimeout(() => {
          this.closeDiseasePopup();
        }, 300);
      }
    }
  },

  // 返回一级分类
  backToPrimary() {
    // 恢复到已确认的选择状态（包括二级分类状态）
    this.setData({
      currentLevel: 'primary',
      browsingPrimaryCategory: this.data.selectedPrimaryCategory,
      browsingSecondaryCategory: this.data.selectedSecondaryCategory
    });
  },

  // 生成疾病显示文本 - 优先显示二级分类
  generateDiseaseDisplayText(primaryName, secondaryName) {
    if (secondaryName) {
      // 有二级分类时，显示二级分类名称
      return secondaryName;
    } else if (primaryName) {
      // 没有二级分类时，显示一级分类名称
      return primaryName;
    }
    return '';
  },

  // 检查是否可以确认
  checkCanConfirm() {
    const { selectedAvatar, selectedNickname, selectedAge } = this.data;
    const canConfirm = !!(selectedAvatar &&
      selectedNickname &&
      selectedNickname.trim().length > 0 &&
      selectedAge &&
      selectedAge.trim().length > 0);

    this.setData({
      canConfirm: canConfirm
    });
  },

  // 完成登录
  async confirmLogin() {
    if (!this.data.canConfirm) {
      return;
    }

    this.setData({
      confirmBtnText: '登录中...'
    });

    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    try {
      const userInfo = {
        avatarUrl: this.data.selectedAvatar,
        nickName: this.data.selectedNickname.trim()
      };

      const app = getApp();
      await app.completeLoginWithAvatar(userInfo);

      // 保存用户基础信息到users集合
      const fullUserInfo = {
        avatarUrl: this.data.selectedAvatar,
        nickName: this.data.selectedNickname.trim(),
        age: this.data.selectedAge.trim(),
        gender: this.data.selectedGender,
        disease: this.data.selectedDiseaseText.trim(),
        primaryDiseaseCategory: this.data.selectedPrimaryCategoryId,
        secondaryDiseaseCategory: this.data.selectedSecondaryCategoryId,
        hospital: this.data.selectedHospital.trim()
      };
      await app.saveUserBasicInfo(fullUserInfo);

      // 创建默认档案
      await this.createDefaultProfile(fullUserInfo);

      // 🔥 设置全局标记，表示档案创建完成
      app.globalData.isCreatingProfile = false;

      // 🔥 设置刚完成注册标记，防止profile页面重复创建档案
      wx.setStorageSync('justRegistered', { retryCount: 0 });

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 🔥 等待数据库写入完成后再返回
      setTimeout(() => {
        wx.navigateBack();
      }, 800);

    } catch (err) {


      this.setData({
        confirmBtnText: '完成登录'
      });

      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 创建默认档案
  async createDefaultProfile(userInfo) {
    try {
      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();

      if (!openid) {
        throw new Error('未获取到openid');
      }

      // 🔥 检查全局锁，防止重复创建
      if (app.globalData.isCreatingProfile) {
        console.log('⚠️ 档案正在创建中，跳过');
        return;
      }

      // 🔥 设置全局锁
      app.globalData.isCreatingProfile = true;

      const db = wx.cloud.database();

      // 🔥 防止重复创建：先检查是否已存在档案
      const existingProfiles = await db.collection('userProfiles')
        .where({
          openid: openid
        })
        .get();

      if (existingProfiles.data.length > 0) {
        console.log('⚠️ 档案已存在，跳过创建，档案数量:', existingProfiles.data.length);
        // 使用已存在的默认档案或第一个档案
        const defaultProfile = existingProfiles.data.find(p => p.isDefault) || existingProfiles.data[0];
        wx.setStorageSync('currentProfileId', defaultProfile._id);
        app.globalData.isCreatingProfile = false;

        // 🔥 清除注册标记，避免 profile 页面误判
        wx.removeStorageSync('justRegistered');
        return;
      }

      const profileData = {
        openid: openid,
        realName: userInfo.nickName,
        name: userInfo.nickName,
        gender: userInfo.gender,
        age: userInfo.age,
        disease: userInfo.disease,
        primaryDiseaseCategory: userInfo.primaryDiseaseCategory || '',
        secondaryDiseaseCategory: userInfo.secondaryDiseaseCategory || '',
        hospital: userInfo.hospital,
        isDefault: true,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      console.log('🔥🔥🔥 complete-profile 创建档案，昵称:', userInfo.nickName);

      const result = await db.collection('userProfiles').add({
        data: profileData
      });

      console.log('✅ 创建默认档案成功:', result._id, '档案名:', profileData.realName);

      // 设置为当前使用的档案
      wx.setStorageSync('currentProfileId', result._id);

      // 创建初始暖光里程碑记录
      await this.createInitialKeyDate(openid, result._id);

    } catch (err) {
      console.error('❌ 创建默认档案失败:', err);
      const app = getApp();
      app.globalData.isCreatingProfile = false; // 🔥 失败时释放锁
      throw err;
    }
  },

  // 创建初始暖光里程碑记录 - "使用暖白记事本天数"
  async createInitialKeyDate(openid, profileId) {
    try {
      const db = wx.cloud.database();

      // 检查是否已经存在使用天数的暖光里程碑，避免重复创建
      const existingRecord = await db.collection('keyDates')
        .where({
          openid: openid,
          profileId: profileId,
          title: '使用暖白记事本'
        })
        .get();

      if (existingRecord.data.length > 0) {

        return;
      }

      // 获取今天的日期字符串
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const keyDateData = {
        openid: openid,
        profileId: profileId,
        title: '使用暖白记事本',
        date: dateStr,
        createTime: db.serverDate()
      };

      const result = await db.collection('keyDates').add({
        data: keyDateData
      });



    } catch (err) {

      // 这里不抛出错误，因为暖光里程碑创建失败不应该影响主流程
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },
  // 分享功能
  async onShareAppMessage() {
    const fileID = 'cloud://cloud1-9gzf2w8c9c9b7b73.636c-cloud1-9gzf2w8c9c9b7b73-1364697418/Logo/LOGO2.png'
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })

    return {
      title: '暖白记事本 - 健康管理小程序',
      path: '/pages/daily-record/index',
      imageUrl: res.fileList[0].tempFileURL
    }
  }

});
