<template>
  <div class="settings-container">
    <el-card>
      <template #header>
        <span>系统配置</span>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 管理员账号 -->
        <el-tab-pane label="管理员账号" name="admins">
          <div class="admin-management">
            <el-button type="primary" @click="showAddAdminDialog" style="margin-bottom: 15px">
              添加管理员
            </el-button>

            <el-table :data="admins" stripe v-loading="adminsLoading">
              <el-table-column prop="username" label="用户名" width="150" />
              <el-table-column prop="role" label="角色" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'super' ? 'danger' : 'primary'">
                    {{ row.role === 'super' ? '超级管理员' : '普通管理员' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.createTime) }}
                </template>
              </el-table-column>
              <el-table-column prop="lastLoginTime" label="最后登录" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.lastLoginTime) }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-switch
                    v-model="row.enabled"
                    @change="toggleAdminStatus(row)"
                    :disabled="row.role === 'super'"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    size="small"
                    @click="deleteAdminAction(row)"
                    :disabled="row.role === 'super'"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 系统日志 -->
        <el-tab-pane label="操作日志" name="logs">
          <div class="logs-section">
            <el-form :inline="true" style="margin-bottom: 15px">
              <el-form-item label="日志类型">
                <el-select v-model="logFilters.type" @change="loadLogsAction" style="width: 150px">
                  <el-option label="全部" value="" />
                  <el-option label="登录" value="login" />
                  <el-option label="数据操作" value="data" />
                  <el-option label="系统配置" value="config" />
                </el-select>
              </el-form-item>
              <el-form-item label="日期范围">
                <el-date-picker
                  v-model="logFilters.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  @change="loadLogsAction"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Refresh" @click="loadLogsAction">刷新</el-button>
              </el-form-item>
            </el-form>

            <el-table :data="logs" stripe height="400" v-loading="logsLoading">
              <el-table-column type="index" label="序号" width="60" />
              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getLogTypeColor(row.type)">
                    {{ getLogTypeName(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="action" label="操作" min-width="200" />
              <el-table-column prop="operator" label="操作员" width="120" />
              <el-table-column prop="createTime" label="操作时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.createTime) }}
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-model:current-page="logPagination.page"
              v-model:page-size="logPagination.limit"
              :total="logPagination.total"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadLogsAction"
              @current-change="loadLogsAction"
              style="margin-top: 20px; justify-content: flex-end"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加管理员对话框 -->
    <el-dialog v-model="addAdminDialogVisible" title="添加管理员" width="500px">
      <el-form :model="newAdmin" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="newAdmin.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="newAdmin.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="newAdmin.role" style="width: 100%">
            <el-option label="普通管理员" value="admin" />
            <el-option label="超级管理员" value="super" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addAdminDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addAdminAction" :loading="addingAdmin">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import {
  getAdminList,
  addAdmin,
  updateAdmin,
  deleteAdmin,
  getLogs
} from '@/api/cloud'

const activeTab = ref('admins')
const adminsLoading = ref(false)
const logsLoading = ref(false)
const addingAdmin = ref(false)
const addAdminDialogVisible = ref(false)

// 管理员列表
const admins = ref([])

const newAdmin = ref({
  username: '',
  password: '',
  role: 'admin'
})

// 日志
const logs = ref([])
const logFilters = ref({
  type: '',
  dateRange: null
})

const logPagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

function formatDate(date) {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

function showAddAdminDialog() {
  newAdmin.value = {
    username: '',
    password: '',
    role: 'admin'
  }
  addAdminDialogVisible.value = true
}

async function addAdminAction() {
  if (!newAdmin.value.username || !newAdmin.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }

  try {
    addingAdmin.value = true
    const res = await addAdmin(newAdmin.value)
    if (res.success) {
      ElMessage.success('管理员添加成功')
      addAdminDialogVisible.value = false
      loadAdmins()
    } else {
      ElMessage.error(res.error || '添加失败')
    }
  } catch (error) {
    console.error('添加失败:', error)
    ElMessage.error('添加管理员失败')
  } finally {
    addingAdmin.value = false
  }
}

async function toggleAdminStatus(admin) {
  try {
    const res = await updateAdmin({
      id: admin._id,
      enabled: admin.enabled
    })
    if (res.success) {
      ElMessage.success(`已${admin.enabled ? '启用' : '禁用'}管理员 ${admin.username}`)
    }
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('操作失败')
    admin.enabled = !admin.enabled // 恢复状态
  }
}

async function deleteAdminAction(admin) {
  ElMessageBox.confirm(
    `确定要删除管理员 ${admin.username} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await deleteAdmin(admin._id)
      if (res.success) {
        ElMessage.success('管理员删除成功')
        loadAdmins()
      } else {
        ElMessage.error(res.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除管理员失败')
    }
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

async function loadAdmins() {
  try {
    adminsLoading.value = true
    const res = await getAdminList()
    if (res.success) {
      admins.value = res.data
    } else {
      ElMessage.error(res.error || '加载管理员列表失败')
    }
  } catch (error) {
    console.error('加载管理员列表失败:', error)
    ElMessage.error('加载管理员列表失败')
  } finally {
    adminsLoading.value = false
  }
}

async function loadLogsAction() {
  try {
    logsLoading.value = true
    const res = await getLogs({
      type: logFilters.value.type,
      dateRange: logFilters.value.dateRange,
      page: logPagination.value.page,
      limit: logPagination.value.limit
    })
    if (res.success) {
      logs.value = res.data.list
      logPagination.value.total = res.data.total
    } else {
      ElMessage.error(res.error || '加载日志失败')
    }
  } catch (error) {
    console.error('加载日志失败:', error)
    ElMessage.error('加载日志失败')
  } finally {
    logsLoading.value = false
  }
}

function getLogTypeName(type) {
  const map = {
    login: '登录',
    data: '数据操作',
    config: '系统配置'
  }
  return map[type] || type
}

function getLogTypeColor(type) {
  const map = {
    login: 'success',
    data: 'primary',
    config: 'warning'
  }
  return map[type] || 'info'
}

onMounted(() => {
  loadAdmins()
  loadLogsAction()
})
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

.admin-management {
  padding: 20px;
}

.logs-section {
  padding: 20px;
}
</style>
