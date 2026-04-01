<template>
  <div class="feedback-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>反馈管理</span>
          <div class="header-actions">
            <el-button type="success" :icon="Download" @click="exportFeedbacks" :loading="exporting">
              导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选器 -->
      <div class="filters">
        <el-form :inline="true">
          <el-form-item label="类型">
            <el-select v-model="filters.type" placeholder="全部类型" clearable style="width: 130px;" @change="loadFeedbacks">
              <el-option label="问题反馈" value="问题反馈" />
              <el-option label="功能建议" value="功能建议" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>

          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 120px;" @change="loadFeedbacks">
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已关闭" value="closed" />
            </el-select>
          </el-form-item>

          <el-form-item label="搜索">
            <el-input
              v-model="filters.keyword"
              placeholder="内容/联系方式"
              clearable
              style="width: 200px;"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :icon="Refresh" @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 统计信息 -->
      <div class="stats-bar">
        <el-row :gutter="10">
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">总反馈数</span>
              <span class="stat-value">{{ pagination.total }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">待处理</span>
              <span class="stat-value warning">{{ stats.pendingCount }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">处理中</span>
              <span class="stat-value primary">{{ stats.processingCount }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">已完成</span>
              <span class="stat-value success">{{ stats.completedCount }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <el-table :data="feedbacks" v-loading="loading" stripe height="500">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="content" label="反馈内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系方式" width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'pending' ? 'warning' : row.status === 'processing' ? 'primary' : row.status === 'completed' ? 'success' : 'info'"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadFeedbacks"
          @current-change="loadFeedbacks"
        />
      </div>
    </el-card>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="反馈详情" width="600px">
      <el-descriptions :column="1" border v-if="currentFeedback">
        <el-descriptions-item label="状态">
          <el-select v-model="currentFeedback.status" @change="handleStatusChange">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-descriptions-item>
        <el-descriptions-item label="反馈内容">
          {{ currentFeedback.content }}
        </el-descriptions-item>
        <el-descriptions-item label="联系方式">
          {{ currentFeedback.contact || '未提供' }}
        </el-descriptions-item>
        <el-descriptions-item label="图片" v-if="currentFeedback.images && currentFeedback.images.length">
          <div class="image-list">
            <el-image
              v-for="(img, index) in currentFeedback.images"
              :key="index"
              :src="img"
              :preview-src-list="currentFeedback.images"
              :initial-index="index"
              fit="cover"
              style="width: 100px; height: 100px; margin-right: 10px; border-radius: 4px"
            />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ formatTime(currentFeedback.createTime) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getFeedbackList, updateFeedback } from '@/api/cloud'
import { Download, Search, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

const loading = ref(false)
const exporting = ref(false)
const feedbacks = ref([])
const viewDialogVisible = ref(false)
const currentFeedback = ref(null)

const filters = ref({
  type: '',
  status: '',
  keyword: ''
})

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

let searchTimer = null

const stats = computed(() => {
  return {
    pendingCount: feedbacks.value.filter(f => f.status === 'pending').length,
    processingCount: feedbacks.value.filter(f => f.status === 'processing').length,
    completedCount: feedbacks.value.filter(f => f.status === 'completed').length
  }
})

function getStatusText(status) {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    closed: '已关闭'
  }
  return statusMap[status] || status
}

function formatTime(time) {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.page = 1
    loadFeedbacks()
  }, 500)
}

function resetFilters() {
  filters.value = {
    type: '',
    status: '',
    keyword: ''
  }
  pagination.value.page = 1
  loadFeedbacks()
}

async function loadFeedbacks() {
  try {
    loading.value = true
    const res = await getFeedbackList({
      page: pagination.value.page,
      limit: pagination.value.limit,
      keyword: filters.value.keyword,
      type: filters.value.type,
      status: filters.value.status
    })

    if (res.success) {
      feedbacks.value = res.data.list
      pagination.value.total = res.data.total
    }
  } catch (error) {
    ElMessage.error('加载反馈列表失败')
  } finally {
    loading.value = false
  }
}

function handleView(row) {
  currentFeedback.value = { ...row }
  viewDialogVisible.value = true
}

async function handleStatusChange() {
  try {
    const res = await updateFeedback({
      id: currentFeedback.value._id,
      status: currentFeedback.value.status
    })

    if (res.success) {
      ElMessage.success('状态更新成功')
      loadFeedbacks()
    } else {
      ElMessage.error(res.error || '状态更新失败')
    }
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

async function exportFeedbacks() {
  try {
    exporting.value = true

    // 获取所有反馈数据
    const res = await getFeedbackList({
      page: 1,
      limit: 10000,
      keyword: filters.value.keyword,
      type: filters.value.type,
      status: filters.value.status
    })

    if (!res.success || !res.data.list.length) {
      ElMessage.warning('没有数据可导出')
      return
    }

    const data = res.data.list.map(feedback => ({
      类型: feedback.type,
      反馈内容: feedback.content,
      联系方式: feedback.contact || '-',
      状态: getStatusText(feedback.status),
      提交时间: formatTime(feedback.createTime)
    }))

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '反馈列表')

    // 下载文件
    const fileName = `反馈列表_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    ElMessage.success(`成功导出 ${data.length} 条反馈数据`)
  } catch (error) {
    ElMessage.error('导出失败')
    console.error('Export error:', error)
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadFeedbacks()
})
</script>

<style scoped>
.feedback-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filters {
  margin-bottom: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stats-bar {
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.warning {
  color: #e6a23c;
}

.stat-value.primary {
  color: #409eff;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
}
</style>
