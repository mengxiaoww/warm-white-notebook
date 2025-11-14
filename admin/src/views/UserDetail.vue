<template>
  <div class="user-detail-container">
    <el-page-header @back="$router.back()" title="返回">
      <template #content>
        <span>用户详情</span>
      </template>
    </el-page-header>

    <div v-loading="loading" style="margin-top: 20px;">
      <el-row :gutter="20">
        <!-- 左侧：用户基本信息 -->
        <el-col :span="8">
          <el-card>
            <template #header>
              <span>基本信息</span>
            </template>
            <div class="user-info">
              <div class="info-item">
                <label>昵称：</label>
                <span>{{ userDetail.user?.nickName || '未设置' }}</span>
              </div>
              <div class="info-item">
                <label>OpenID：</label>
                <span style="font-size: 12px; word-break: break-all;">{{ openid }}</span>
              </div>
              <div class="info-item">
                <label>年龄：</label>
                <span>{{ userDetail.user?.age || '-' }}</span>
              </div>
              <div class="info-item">
                <label>性别：</label>
                <span>{{ userDetail.user?.gender === 'male' ? '男' : userDetail.user?.gender === 'female' ? '女' : '-' }}</span>
              </div>
              <div class="info-item">
                <label>疾病：</label>
                <span>{{ userDetail.user?.disease || '-' }}</span>
              </div>
              <div class="info-item">
                <label>医院：</label>
                <span>{{ userDetail.user?.hospital || '-' }}</span>
              </div>
              <div class="info-item">
                <label>状态：</label>
                <el-tag :type="userDetail.user?.registrationComplete ? 'success' : 'warning'">
                  {{ userDetail.user?.registrationComplete ? '已激活' : '未完成' }}
                </el-tag>
              </div>
              <div class="info-item">
                <label>注册时间：</label>
                <span>{{ formatDate(userDetail.user?.createTime) }}</span>
              </div>
            </div>
          </el-card>

          <!-- 记录统计 -->
          <el-card style="margin-top: 20px;">
            <template #header>
              <span>记录统计</span>
            </template>
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-value">{{ userDetail.totalRecords?.total || 0 }}</div>
                <div class="stat-label">总记录数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userDetail.profiles?.length || 0 }}</div>
                <div class="stat-label">档案数</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：详细数据 -->
        <el-col :span="16">
          <!-- 健康档案 -->
          <el-card>
            <template #header>
              <span>健康档案（{{ userDetail.profiles?.length || 0 }}）</span>
            </template>
            <el-table :data="userDetail.profiles" stripe>
              <el-table-column prop="name" label="姓名" width="100" />
              <el-table-column prop="age" label="年龄" width="80" />
              <el-table-column label="性别" width="80">
                <template #default="{ row }">
                  {{ row.gender === 'male' ? '男' : row.gender === 'female' ? '女' : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="disease" label="疾病" min-width="120" />
              <el-table-column prop="hospital" label="医院" min-width="150" />
              <el-table-column label="默认" width="80">
                <template #default="{ row }">
                  <el-tag v-if="row.isDefault" type="success">默认</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="记录数" width="100">
                <template #default="{ row }">
                  {{ getProfileTotalRecords(row._id) }}
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.createTime) }}
                </template>
              </el-table-column>
              <template #empty>
                <el-empty description="该用户暂无档案" />
              </template>
            </el-table>
          </el-card>

          <!-- 记录类型分布 -->
          <el-card style="margin-top: 20px;">
            <template #header>
              <span>记录类型分布</span>
            </template>
            <el-row :gutter="10">
              <el-col :span="6" v-for="(item, key) in recordTypeList" :key="key">
                <div class="record-type-card">
                  <div class="record-count">{{ userDetail.totalRecords?.[key] || 0 }}</div>
                  <div class="record-label">{{ item }}</div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 最近记录 -->
          <el-card style="margin-top: 20px;">
            <template #header>
              <div class="card-header">
                <span>最近记录</span>
                <el-radio-group v-model="activeTab" size="small">
                  <el-radio-button value="bloodTests">血常规</el-radio-button>
                  <el-radio-button value="medications">用药</el-radio-button>
                  <el-radio-button value="clinicRecords">门诊</el-radio-button>
                </el-radio-group>
              </div>
            </template>

            <!-- 血常规 -->
            <div v-if="activeTab === 'bloodTests'">
              <el-table
                v-if="userDetail.recentRecords?.bloodTests?.length"
                :data="userDetail.recentRecords.bloodTests"
                stripe
                max-height="300"
              >
                <el-table-column prop="date" label="日期" width="120" />
                <el-table-column label="WBC" width="100">
                  <template #default="{ row }">{{ formatValue(row.wbc) }}</template>
                </el-table-column>
                <el-table-column label="PLT" width="100">
                  <template #default="{ row }">{{ formatValue(row.plt) }}</template>
                </el-table-column>
                <el-table-column label="HGB" width="100">
                  <template #default="{ row }">{{ formatValue(row.hgb) }}</template>
                </el-table-column>
                <el-table-column label="NEUT" width="100">
                  <template #default="{ row }">{{ formatValue(row.neut) }}</template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无记录" />
            </div>

            <!-- 用药 -->
            <div v-if="activeTab === 'medications'">
              <el-table
                v-if="userDetail.recentRecords?.medications?.length"
                :data="userDetail.recentRecords.medications"
                stripe
                max-height="300"
              >
                <el-table-column prop="date" label="日期" width="120" />
                <el-table-column label="药品数" width="100">
                  <template #default="{ row }">{{ row.medicines?.length || 0 }}</template>
                </el-table-column>
                <el-table-column label="药品" min-width="200">
                  <template #default="{ row }">
                    {{ row.medicines?.map(m => m.name).join(', ') || '-' }}
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无记录" />
            </div>

            <!-- 门诊 -->
            <div v-if="activeTab === 'clinicRecords'">
              <el-table
                v-if="userDetail.recentRecords?.clinicRecords?.length"
                :data="userDetail.recentRecords.clinicRecords"
                stripe
                max-height="300"
              >
                <el-table-column prop="date" label="日期" width="120" />
                <el-table-column prop="hospital" label="医院" min-width="150" />
                <el-table-column prop="department" label="科室" width="100" />
                <el-table-column prop="doctor" label="医生" width="100" />
                <el-table-column prop="cost" label="费用" width="100">
                  <template #default="{ row }">
                    {{ row.cost ? `¥${row.cost}` : '-' }}
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无记录" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getUserDetail } from '@/api/cloud'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const route = useRoute()
const openid = route.params.openid

const loading = ref(false)
const userDetail = ref({})
const activeTab = ref('bloodTests')

const recordTypeList = {
  bloodTests: '血常规',
  liverTests: '肝功能',
  kidneyTests: '肾功能',
  ebvRecords: 'EB病毒',
  cmvRecords: 'CMV',
  ldhRecords: '乳酸脱氢酶',
  medications: '用药',
  clinicRecords: '门诊',
  urineRecords: '尿量',
  stoolRecords: '排便',
  expenseRecords: '费用记录',
  keyDates: '里程碑'
}

function getProfileTotalRecords(profileId) {
  const stats = userDetail.value.profileStats?.[profileId]
  if (!stats) return 0
  return Object.values(stats.records).reduce((sum, count) => sum + count, 0)
}

function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

// 格式化数值，0显示为0，空值显示为-
function formatValue(value) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  return value
}

async function loadUserDetail() {
  try {
    loading.value = true
    const res = await getUserDetail(openid)
    if (res.success) {
      userDetail.value = res.data
    } else {
      ElMessage.error(res.error || '加载用户详情失败')
    }
  } catch (error) {
    ElMessage.error('加载用户详情失败')
    console.error('Load user detail error:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUserDetail()
})
</script>

<style scoped>
.user-detail-container {
  padding: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info-item {
  width: 100%;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: bold;
  color: #666;
  min-width: 80px;
}

.stat-grid {
  display: flex;
  gap: 20px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.record-type-card {
  text-align: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 10px;
}

.record-count {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.record-label {
  font-size: 12px;
  color: #909399;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
