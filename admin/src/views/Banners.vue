<template>
  <div class="banners-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>轮播图管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            添加轮播图
          </el-button>
        </div>
      </template>

      <el-table :data="banners" v-loading="loading" stripe>
        <el-table-column prop="order" label="排序" width="80" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'text' ? 'primary' : 'success'">
              {{ row.type === 'text' ? '文字' : '图片' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="200">
          <template #default="{ row }">
            <div v-if="row.type === 'text'">{{ row.content }}</div>
            <el-image
              v-else
              :src="row.imageUrl"
              style="width: 100px; height: 50px"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              @change="handleToggleEnabled(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="text">文字轮播</el-radio>
            <el-radio label="image">图片轮播</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.type === 'text'" label="文字内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="3"
            placeholder="请输入轮播文字内容"
          />
        </el-form-item>

        <el-form-item v-if="form.type === 'image'" label="图片" prop="imageUrl">
          <el-upload
            class="banner-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleUpload"
            :disabled="uploading"
            accept="image/jpeg,image/png"
          >
            <el-image v-if="form.imageUrl" :src="getImagePreviewUrl()" fit="contain" class="banner-upload-image" />
            <el-icon v-else class="banner-uploader-icon"><Plus /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                <div><strong>推荐尺寸：</strong>750x300px（宽高比 2.5:1）</div>
                <div><strong>支持格式：</strong>JPG、PNG，文件大小不超过2MB</div>
                <div><strong>显示方式：</strong>图片将放大填充整个区域</div>
                <div style="color: #f56c6c; margin-top: 8px; font-weight: 500;">
                  ⚠️ 重要提示：请严格按照 750x300 的比例制作图片！
                </div>
                <div style="color: #e6a23c; margin-top: 5px;">
                  💡 如果图片比例不是 2.5:1，上下或左右边缘会被裁剪
                </div>
                <div style="color: #909399; margin-top: 5px; font-size: 12px;">
                  建议使用图片编辑工具调整至正确尺寸后再上传
                </div>
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="跳转链接" prop="link">
          <el-input
            v-model="form.link"
            placeholder="请输入跳转链接（选填）"
          />
          <div class="form-tip">
            <div><strong>支持以下三种跳转方式：</strong></div>
            <div class="tip-section">
              <div class="tip-title">1️⃣ 网页跳转</div>
              <div class="tip-example"><code>https://www.example.com</code></div>
              <div class="tip-note">⚠️ 需要在小程序后台配置业务域名白名单</div>
            </div>
            <div class="tip-section">
              <div class="tip-title">2️⃣ 跳转公众号</div>
              <div class="tip-example"><code>mp://gh_xxxxxxxxxxxx</code></div>
              <div class="tip-note">💡 填写公众号原始ID（在公众号后台「设置与开发-基本设置」中查看）</div>
            </div>
            <div class="tip-section">
              <div class="tip-title">3️⃣ 跳转其他小程序</div>
              <div class="tip-example"><code>miniprogram://wx1234567890abcdef?path=/pages/index/index</code></div>
              <div class="tip-note">⚠️ 需要在小程序后台「开发-开发管理-小程序跳转」中添加目标小程序</div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="排序" prop="order">
          <el-input-number v-model="form.order" :min="0" :max="999" />
          <div class="form-tip">数字越小越靠前</div>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBannerList, addBanner, updateBanner, deleteBanner, uploadBannerImage } from '@/api/cloud'

const loading = ref(false)
const banners = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('添加轮播图')
const submitting = ref(false)
const uploading = ref(false)
const formRef = ref(null)
const editingId = ref(null)

const form = ref({
  type: 'text',
  content: '',
  imageUrl: '',
  imageFileID: '', // 存储云存储的fileID
  link: '',
  order: 0,
  enabled: true
})

const rules = {
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  content: [
    { validator: (rule, value, callback) => {
      if (form.value.type === 'text' && !value.trim()) {
        callback(new Error('请输入文字内容'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ],
  imageUrl: [
    { validator: (rule, value, callback) => {
      if (form.value.type === 'image' && !value) {
        callback(new Error('请上传图片'))
      } else {
        callback()
      }
    }, trigger: 'change' }
  ]
}

async function loadBanners() {
  try {
    loading.value = true
    const res = await getBannerList()
    if (res.success) {
      banners.value = res.data
    }
  } catch (error) {
    ElMessage.error('加载轮播图失败')
  } finally {
    loading.value = false
  }
}

function showAddDialog() {
  dialogTitle.value = '添加轮播图'
  editingId.value = null
  form.value = {
    type: 'text',
    content: '',
    imageUrl: '',
    imageFileID: '',
    link: '',
    order: banners.value.length,
    enabled: true
  }
  dialogVisible.value = true
}

function handleEdit(row) {
  dialogTitle.value = '编辑轮播图'
  editingId.value = row._id

  form.value = {
    type: row.type,
    content: row.content || '',
    imageUrl: row.imageUrl || '',
    imageFileID: row.imageFileID || '',
    link: row.link || '',
    order: row.order,
    enabled: row.enabled
  }
  dialogVisible.value = true
}

// 获取图片预览URL（支持fileID和URL两种格式）
function getImagePreviewUrl() {
  // 如果是fileID格式（cloud://开头），需要转换为临时URL
  // 但这里我们只用于预览，实际存储时会保存fileID
  return form.value.imageUrl
}

// 图片上传前的校验
function handleBeforeUpload(file) {
  const isImage = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG 格式的图片!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 自定义上传 - 通过云函数上传到云存储
async function handleUpload(options) {
  try {
    uploading.value = true
    const file = options.file

    // 读取文件并转换为 base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result

        // 生成文件名
        const ext = file.name.split('.').pop()
        const fileName = `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`

        // 调用云函数上传
        const res = await uploadBannerImage(base64Data, fileName)

        if (res.success) {
          // 保存fileID和URL（用于预览）
          form.value.imageFileID = res.data.fileID
          form.value.imageUrl = res.data.url
          ElMessage.success('上传成功')
        } else {
          ElMessage.error(res.error || '上传失败')
        }
      } catch (error) {
        console.error('上传失败:', error)
        ElMessage.error('上传失败，请重试')
      } finally {
        uploading.value = false
      }
    }
    reader.onerror = () => {
      ElMessage.error('图片读取失败')
      uploading.value = false
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error('处理图片失败:', error)
    ElMessage.error('图片处理失败，请重试')
    uploading.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitting.value = true

    // 构建提交数据
    const data = {
      type: form.value.type,
      order: form.value.order,
      enabled: form.value.enabled,
      link: form.value.link
    }

    // 根据类型添加对应字段
    if (form.value.type === 'text') {
      // 文字类型：必须有content，清空图片相关字段
      data.content = form.value.content.trim()
      data.imageUrl = ''
      data.imageFileID = ''
    } else if (form.value.type === 'image') {
      // 图片类型：必须有imageUrl和imageFileID，清空content
      data.content = ''
      data.imageUrl = form.value.imageUrl
      data.imageFileID = form.value.imageFileID
    }

    let res
    if (editingId.value) {
      res = await updateBanner({ id: editingId.value, ...data })
    } else {
      res = await addBanner(data)
    }

    if (res.success) {
      ElMessage.success(editingId.value ? '更新成功' : '添加成功')
      dialogVisible.value = false
      loadBanners()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch (error) {
    if (error !== false) { // 表单验证失败会返回 false
      ElMessage.error('操作失败')
    }
  } finally {
    submitting.value = false
  }
}

async function handleToggleEnabled(row) {
  try {
    const res = await updateBanner({
      id: row._id,
      enabled: row.enabled
    })
    if (res.success) {
      ElMessage.success(row.enabled ? '已启用' : '已禁用')
    }
  } catch (error) {
    ElMessage.error('操作失败')
    row.enabled = !row.enabled // 恢复状态
  }
}

function handleDelete(row) {
  ElMessageBox.confirm('确定要删除这个轮播图吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await deleteBanner(row._id)
      if (res.success) {
        ElMessage.success('删除成功')
        loadBanners()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  loadBanners()
})
</script>

<style scoped>
.banners-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-preview {
  margin-top: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.6;
}

.form-tip code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #303133;
}

.tip-section {
  margin-top: 10px;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.tip-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
  font-size: 13px;
}

.tip-example {
  margin: 4px 0;
}

.tip-note {
  font-size: 11px;
  color: #e6a23c;
  margin-top: 4px;
}

.banner-uploader {
  width: 100%;
}

.banner-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.banner-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.banner-upload-image {
  width: 100%;
  height: 200px;
}
</style>
