Page({
  data: {
    // 页面类型：add 或 edit
    pageType: 'add',
    editingProfileId: '',

    // 表单数据
    profileForm: {
      avatarUrl: '',
      realName: '',
      gender: 'male',
      age: '',
      disease: '',
      hospital: '',
      isDefault: false
    },

    // 防抖相关
    isSaving: false,

    // 疾病分类数据（与完善信息页面保持一致）
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

    // 疾病选择状态
    currentLevel: 'primary',
    selectedPrimaryCategory: null,
    selectedSecondaryCategory: null,
    selectedPrimaryCategoryId: '',
    selectedSecondaryCategoryId: '',
    browsingPrimaryCategory: null,
    browsingSecondaryCategory: null,
    showDiseasePopup: false,

    // 控制状态
    isOnlyProfile: false,
    isEditingDefaultProfile: false,
    shouldDisableDefaultSwitch: false,
    saveBtnText: '保存'
  },

  onLoad(options) {


    const { type, profileId } = options;

    if (type === 'edit' && profileId) {
      // 编辑模式
      this.setData({
        pageType: 'edit',
        editingProfileId: profileId
      });
      this.loadProfileData(profileId);
    } else {
      // 添加模式
      this.setData({
        pageType: 'add'
      });
    }
  },

  // 加载档案数据（编辑模式）
  async loadProfileData(profileId) {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();

      const db = wx.cloud.database();
      const res = await db.collection('userProfiles').doc(profileId).get();

      if (res.data) {
        const profile = res.data;

        // 检查控制状态
        const profilesRes = await db.collection('userProfiles').where({ openid }).get();
        const isOnlyProfile = profilesRes.data.length === 1;
        const isDefaultProfile = profile.isDefault;

        this.setData({
          profileForm: {
            avatarUrl: profile.avatarUrl || '',
            realName: profile.realName || profile.name || '',
            gender: profile.gender || 'male',
            age: profile.age || '',
            disease: profile.disease || '',
            hospital: profile.hospital || '',
            isDefault: profile.isDefault
          },
          selectedPrimaryCategoryId: profile.primaryDiseaseCategory || '',
          selectedSecondaryCategoryId: profile.secondaryDiseaseCategory || '',
          isOnlyProfile: isOnlyProfile,
          isEditingDefaultProfile: isDefaultProfile,
          shouldDisableDefaultSwitch: isOnlyProfile || isDefaultProfile
        });

        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: '编辑档案'
        });
      }
    } catch (err) {

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 头像选择
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    console.log('选择头像:', avatarUrl);

    // 先显示临时头像
    this.setData({
      'profileForm.avatarUrl': avatarUrl
    });

    // 上传到云存储
    try {
      wx.showLoading({
        title: '上传头像中...',
        mask: true
      });

      const app = getApp();
      const openid = app.getOpenIdIfLoggedIn();

      // 生成云存储路径
      const timestamp = Date.now();
      const cloudPath = `profile-avatars/${openid}/${timestamp}.png`;

      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl
      });

      console.log('头像上传成功:', uploadResult.fileID);

      // 更新为云存储URL
      this.setData({
        'profileForm.avatarUrl': uploadResult.fileID
      });

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

  // 姓名输入
  onRealNameInput(e) {
    this.setData({
      'profileForm.realName': e.detail.value
    });
  },

  // 性别选择
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'profileForm.gender': gender
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
      'profileForm.age': value
    });
  },

  // 医院输入
  onHospitalInput(e) {
    this.setData({
      'profileForm.hospital': e.detail.value
    });
  },

  // 默认档案开关
  onDefaultSwitchChange(e) {
    const { isOnlyProfile, isEditingDefaultProfile } = this.data;
    const newValue = e.detail.value;

    // 防止取消唯一档案或当前默认档案的默认状态
    if ((isOnlyProfile || isEditingDefaultProfile) && !newValue) {
      wx.showToast({
        title: isOnlyProfile ? '唯一档案必须为默认' : '当前默认档案不能取消默认状态',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      'profileForm.isDefault': newValue
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
    } else if (this.data.profileForm.disease) {
      // 如果没有分类ID但有疾病文本，尝试解析
      this.parseDiseaseText(this.data.profileForm.disease);
      return;
    }

    this.setData({
      showDiseasePopup: true,
      currentLevel: currentLevel,
      selectedPrimaryCategory: primaryCategory,
      selectedSecondaryCategory: secondaryCategory,
      browsingPrimaryCategory: primaryCategory,
      browsingSecondaryCategory: secondaryCategory
    });
  },

  // 解析疾病文本
  parseDiseaseText(diseaseText) {
    if (!diseaseText) return;

    const categories = this.data.diseaseCategories;
    let primaryCategory = null;
    let secondaryCategory = null;
    let primaryCategoryId = '';
    let secondaryCategoryId = '';

    // 尝试直接匹配二级分类名称
    for (const category of categories) {
      for (const child of category.children) {
        if (child.name === diseaseText.trim()) {
          primaryCategory = category;
          secondaryCategory = child;
          primaryCategoryId = category.id;
          secondaryCategoryId = child.id;
          break;
        }
      }
      if (secondaryCategory) break;
    }

    // 如果没有匹配到二级分类，尝试匹配一级分类
    if (!secondaryCategory) {
      for (const category of categories) {
        if (category.name === diseaseText.trim()) {
          primaryCategory = category;
          primaryCategoryId = category.id;
          break;
        }
      }
    }

    // 兼容旧格式
    if (!primaryCategory && diseaseText.includes(' - ')) {
      const [primaryName, secondaryName] = diseaseText.split(' - ');

      for (const category of categories) {
        if (category.name === primaryName.trim()) {
          primaryCategory = category;
          primaryCategoryId = category.id;
          for (const child of category.children) {
            if (child.name === secondaryName.trim()) {
              secondaryCategory = child;
              secondaryCategoryId = child.id;
              break;
            }
          }
          break;
        }
      }
    }

    this.setData({
      selectedPrimaryCategory: primaryCategory,
      selectedSecondaryCategory: secondaryCategory,
      selectedPrimaryCategoryId: primaryCategoryId,
      selectedSecondaryCategoryId: secondaryCategoryId,
      currentLevel: primaryCategory ? 'secondary' : 'primary'
    }, () => {
      this.setData({
        showDiseasePopup: true,
        browsingPrimaryCategory: primaryCategory,
        browsingSecondaryCategory: secondaryCategory
      });
    });
  },

  // 关闭疾病选择弹窗
  closeDiseasePopup() {
    this.setData({
      showDiseasePopup: false,
      currentLevel: 'primary',
      browsingPrimaryCategory: null,
      browsingSecondaryCategory: null
    });
  },

  // 选择一级分类
  selectPrimaryCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.diseaseCategories.find(cat => cat.id === categoryId);

    if (category) {
      if (category.children && category.children.length > 0) {
        // 判断是否点击的是已确认选择的一级分类
        let secondaryBrowsingState = null;
        if (this.data.selectedPrimaryCategory && this.data.selectedPrimaryCategory.id === category.id) {
          secondaryBrowsingState = this.data.browsingSecondaryCategory;
        }

        this.setData({
          browsingPrimaryCategory: category,
          browsingSecondaryCategory: secondaryBrowsingState,
          currentLevel: 'secondary'
        });
      } else {
        // 直接选择一级分类
        this.setData({
          selectedPrimaryCategory: category,
          selectedSecondaryCategory: null,
          selectedPrimaryCategoryId: category.id,
          selectedSecondaryCategoryId: '',
          'profileForm.disease': this.generateDiseaseDisplayText(category.name, null),
          browsingPrimaryCategory: category,
          browsingSecondaryCategory: null
        });

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
        this.setData({
          selectedPrimaryCategory: browsingPrimaryCategory,
          selectedSecondaryCategory: secondaryCategory,
          selectedPrimaryCategoryId: browsingPrimaryCategory.id,
          selectedSecondaryCategoryId: secondaryCategory.id,
          'profileForm.disease': this.generateDiseaseDisplayText(browsingPrimaryCategory.name, secondaryCategory.name),
          browsingPrimaryCategory: browsingPrimaryCategory,
          browsingSecondaryCategory: secondaryCategory
        });

        setTimeout(() => {
          this.closeDiseasePopup();
        }, 300);
      }
    }
  },

  // 返回一级分类
  backToPrimary() {
    this.setData({
      currentLevel: 'primary',
      browsingPrimaryCategory: this.data.selectedPrimaryCategory,
      browsingSecondaryCategory: this.data.selectedSecondaryCategory
    });
  },

  // 生成疾病显示文本
  generateDiseaseDisplayText(primaryName, secondaryName) {
    if (secondaryName) {
      return secondaryName;
    } else if (primaryName) {
      return primaryName;
    }
    return '';
  },

  // 保存档案
  async saveProfile() {
    // 🔧 防抖：防止重复提交
    if (this.data.isSaving) {
      console.log('⚠️ 正在保存中，请勿重复提交');
      return;
    }

    const app = getApp();
    const openid = app.getOpenIdIfLoggedIn();

    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const { profileForm, pageType, editingProfileId } = this.data;

    if (!profileForm.realName.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }

    if (!profileForm.age.trim()) {
      wx.showToast({
        title: '请输入年龄',
        icon: 'none'
      });
      return;
    }

    // 防止取消唯一档案或当前默认档案的默认状态
    if (pageType === 'edit' && (this.data.isOnlyProfile || this.data.isEditingDefaultProfile) && !profileForm.isDefault) {
      wx.showToast({
        title: this.data.isOnlyProfile ? '唯一档案必须为默认' : '当前默认档案不能取消默认状态',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 🔧 设置保存状态，防止重复提交
    this.setData({
      isSaving: true,
      saveBtnText: pageType === 'edit' ? '保存中...' : '添加中...'
    });

    wx.showLoading({
      title: pageType === 'edit' ? '保存中...' : '添加中...',
      mask: true
    });

    try {
      const db = wx.cloud.database();

      // 如果设为默认档案，需要先取消其他档案的默认状态
      if (profileForm.isDefault) {
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
          });
      }

      const data = {
        avatarUrl: profileForm.avatarUrl || '',
        realName: profileForm.realName.trim(),
        name: profileForm.realName.trim(),
        gender: profileForm.gender,
        age: profileForm.age.trim(),
        disease: profileForm.disease.trim(),
        primaryDiseaseCategory: this.data.selectedPrimaryCategoryId || '',
        secondaryDiseaseCategory: this.data.selectedSecondaryCategoryId || '',
        hospital: profileForm.hospital.trim(),
        isDefault: profileForm.isDefault,
        updateTime: db.serverDate()
      };

      let newProfileId = editingProfileId;

      if (pageType === 'edit') {
        // 编辑模式
        await db.collection('userProfiles').doc(editingProfileId).update({
          data
        });
        console.log('✅ 档案更新成功');

      } else {
        // 新增模式
        data.openid = openid;
        data.createTime = db.serverDate();
        const res = await db.collection('userProfiles').add({
          data
        });

        newProfileId = res._id; // 🔧 修复：保存新创建的档案ID
        console.log('✅ 档案创建成功，ID:', newProfileId);
      }

      // 如果设置为默认档案，需要更新当前使用的档案ID
      if (profileForm.isDefault) {
        wx.setStorageSync('currentProfileId', newProfileId);
        console.log('✅ 已设置为默认档案');

        // 如果是新增模式且设为默认档案，创建初始暖光里程碑
        if (pageType === 'add') {
          this.createInitialKeyDate(openid, newProfileId);
        }
      }

      // 🔧 修复：确保loading先关闭
      wx.hideLoading();

      // 🔧 修复：使用模态框确保用户看到提示
      wx.showModal({
        title: '提示',
        content: pageType === 'edit' ? '档案更新成功' : '档案添加成功',
        showCancel: false,
        confirmText: '确定',
        success: () => {
          wx.navigateBack();
        }
      });

    } catch (err) {
      console.error('保存档案失败:', err);

      wx.hideLoading();

      // 🔧 重置保存状态
      this.setData({
        isSaving: false,
        saveBtnText: '保存'
      });

      wx.showModal({
        title: '保存失败',
        content: err.message || '请稍后重试',
        showCancel: false
      });
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
  }
  ,
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
