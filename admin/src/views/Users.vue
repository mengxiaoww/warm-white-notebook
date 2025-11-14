<template>
  <div class="users-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <div class="header-actions">
            <el-button type="success" :icon="Download" @click="exportUsers" :loading="exporting">
              导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选器 -->
      <div class="filters">
        <el-form :inline="true">
          <el-form-item label="搜索">
            <el-input
              v-model="filters.keyword"
              placeholder="昵称/OpenID/医院/疾病"
              clearable
              style="width: 250px;"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="状态">
            <el-select v-model="filters.status" @change="loadUsers" style="width: 120px;">
              <el-option label="全部" value="all" />
              <el-option label="已激活" value="active" />
              <el-option label="未完成" value="inactive" />
            </el-select>
          </el-form-item>

          <el-form-item label="疾病类型">
            <el-select v-model="filters.disease" @change="loadUsers" clearable placeholder="请选择" style="width: 150px;">
              <el-option label="全部" value="" />
              <el-option label="白血病" value="白血病" />
              <el-option label="MDS" value="MDS" />
              <el-option label="淋巴瘤" value="淋巴瘤" />
              <el-option label="骨髓瘤" value="骨髓瘤" />
              <el-option label="MPN" value="MPN" />
            </el-select>
          </el-form-item>

          <el-form-item label="注册时间">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="loadUsers"
              style="width: 240px;"
            />
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
              <span class="stat-label">总用户数</span>
              <span class="stat-value">{{ pagination.total }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">已激活</span>
              <span class="stat-value success">{{ stats.activeCount }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">待完善</span>
              <span class="stat-value warning">{{ stats.inactiveCount }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <span class="stat-label">今日新增</span>
              <span class="stat-value primary">{{ stats.todayCount }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 用户列表 -->
      <el-table :data="users" v-loading="loading" stripe height="550">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="userInfo.nickName" label="昵称" width="150">
          <template #default="{ row }">
            {{ row.userInfo?.nickName || '未设置' }}
          </template>
        </el-table-column>
        <el-table-column prop="openid" label="OpenID" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip :content="row.openid" placement="top">
              <span>{{ row.openid?.substring(0, 20) }}...</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80">
          <template #default="{ row }">
            {{ row.age || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">
            {{ row.gender === 'male' ? '男' : row.gender === 'female' ? '女' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="disease" label="疾病" width="120">
          <template #default="{ row }">
            {{ row.disease || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="hospital" label="医院" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.hospital || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.registrationComplete ? 'success' : 'warning'">
              {{ row.registrationComplete ? '已激活' : '待完善' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="profileCount" label="档案数" width="90" align="center" />
        <el-table-column prop="createTime" label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row.openid)">
              详情
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无用户数据" />
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getUserList } from '@/api/cloud'
import { ElMessage } from 'element-plus'
import { Download, Search, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

const router = useRouter()
const users = ref([])
const loading = ref(false)
const exporting = ref(false)

const filters = ref({
  keyword: '',
  status: 'all',
  disease: '',
  dateRange: null
})

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

let searchTimer = null

const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return {
    activeCount: users.value.filter(u => u.registrationComplete).length,
    inactiveCount: users.value.filter(u => !u.registrationComplete).length,
    todayCount: users.value.filter(u => {
      const createDate = u.createTime ? new Date(u.createTime).toISOString().split('T')[0] : null
      return createDate === today
    }).length
  }
})

async function loadUsers() {
  try {
    loading.value = true
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      keyword: filters.value.keyword,
      status: filters.value.status
    }

    if (filters.value.disease) {
      params.disease = filters.value.disease
    }

    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      params.startDate = filters.value.dateRange[0]
      params.endDate = filters.value.dateRange[1]
    }

    const res = await getUserList(params)

    if (res.success) {
      users.value = res.data.list
      pagination.value.total = res.data.total
    }
  } catch (error) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.page = 1
    loadUsers()
  }, 500)
}

function resetFilters() {
  filters.value = {
    keyword: '',
    status: 'all',
    disease: '',
    dateRange: null
  }
  pagination.value.page = 1
  loadUsers()
}

function viewDetail(openid) {
  router.push(`/user-detail/${openid}`)
}

function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

async function exportUsers() {
  try {
    exporting.value = true

    // 获取所有用户数据
    const res = await getUserList({
      page: 1,
      limit: 10000,
      keyword: filters.value.keyword,
      status: filters.value.status,
      disease: filters.value.disease,
      startDate: filters.value.dateRange?.[0],
      endDate: filters.value.dateRange?.[1]
    })

    if (!res.success || !res.data.list.length) {
      ElMessage.warning('没有数据可导出')
      return
    }

    const data = res.data.list.map(user => ({
      OpenID: user.openid,
      昵称: user.userInfo?.nickName || '-',
      年龄: user.age || '-',
      性别: user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '-',
      疾病: user.disease || '-',
      医院: user.hospital || '-',
      档案数: user.profileCount || 0,
      状态: user.registrationComplete ? '已激活' : '待完善',
      注册时间: formatDate(user.createTime)
    }))

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '用户列表')

    // 下载文件
    const fileName = `用户列表_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    ElMessage.success(`成功导出 ${data.length} 条用户数据`)
  } catch (error) {
    ElMessage.error('导出失败')
    console.error('Export error:', error)
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-container {
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
</style>
