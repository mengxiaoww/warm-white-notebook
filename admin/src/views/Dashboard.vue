<template>
  <div class="dashboard-container">
    <!-- 概览统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card-primary">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="40"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总用户数</div>
              <div class="stat-value">{{ stats.overview?.totalUsers || 0 }}</div>
              <div class="stat-sub">活跃: {{ stats.overview?.activeUsers || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card-success">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="40"><FolderOpened /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总档案数</div>
              <div class="stat-value">{{ stats.overview?.totalProfiles || 0 }}</div>
              <div class="stat-sub">平均: {{ avgProfiles }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card-warning">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="40"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">总记录数</div>
              <div class="stat-value">{{ stats.records?.total || 0 }}</div>
              <div class="stat-sub">血常规: {{ stats.records?.bloodTests || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card-danger">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon size="40"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">反馈数</div>
              <div class="stat-value">{{ stats.feedbackStats?.total || 0 }}</div>
              <div class="stat-sub">待处理: {{ stats.feedbackStats?.pending || 0 }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 增长数据卡片 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>新增用户</span>
          </template>
          <el-statistic :value="stats.overview?.newUsersLast7Days || 0" title="最近7天" />
          <div style="margin-top: 10px">
            <el-statistic :value="stats.overview?.newUsersLast30Days || 0" title="最近30天" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>活跃用户</span>
          </template>
          <el-statistic :value="stats.overview?.activeUsersLast30Days || 0" title="最近30天活跃" />
          <div style="margin-top: 10px">
            <el-progress
              :percentage="activityRate"
              :color="activityRate > 50 ? '#67c23a' : activityRate > 30 ? '#e6a23c' : '#f56c6c'"
            />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <span>记录分布</span>
          </template>
          <div class="record-distribution">
            <div class="record-item">
              <span>血常规</span>
              <el-tag>{{ stats.records?.bloodTests || 0 }}</el-tag>
            </div>
            <div class="record-item">
              <span>用药</span>
              <el-tag type="success">{{ stats.records?.medications || 0 }}</el-tag>
            </div>
            <div class="record-item">
              <span>门诊</span>
              <el-tag type="warning">{{ stats.records?.clinicRecords || 0 }}</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>用户增长趋势（最近7天）</span>
          </template>
          <div ref="userTrendChart" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>记录增长趋势（最近7天）</span>
          </template>
          <div ref="recordTrendChart" style="width: 100%; height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>疾病类型分布</span>
          </template>
          <div ref="diseaseChart" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>记录类型分布</span>
          </template>
          <div ref="recordTypeChart" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细统计表格 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <span>详细统计数据</span>
      </template>
      <el-table :data="detailStats" stripe>
        <el-table-column prop="category" label="类别" width="150" />
        <el-table-column prop="count" label="数量" width="120" />
        <el-table-column prop="percentage" label="占比" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.percentage" :color="getProgressColor(row.percentage)" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { getStats } from '@/api/cloud'
import * as echarts from 'echarts'

const stats = ref({})
const userTrendChart = ref(null)
const recordTrendChart = ref(null)
const diseaseChart = ref(null)
const recordTypeChart = ref(null)

let userChartInstance = null
let recordChartInstance = null
let diseaseChartInstance = null
let recordTypeChartInstance = null

const avgProfiles = computed(() => {
  if (!stats.value.overview) return '0.0'
  const avg = stats.value.overview.totalProfiles / (stats.value.overview.totalUsers || 1)
  return avg.toFixed(1)
})

const activityRate = computed(() => {
  if (!stats.value.overview) return 0
  const rate = (stats.value.overview.activeUsersLast30Days / (stats.value.overview.totalUsers || 1)) * 100
  return Math.round(rate)
})

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
  keyDates: '里程碑',
  expenseRecords: '费用记录'
}

const detailStats = computed(() => {
  if (!stats.value.records) return []

  const total = stats.value.records.total || 0
  if (total === 0) return []

  return [
    {
      category: '血常规',
      count: stats.value.records.bloodTests || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.bloodTests || 0) / total) * 100) : 0,
      description: '血液检测记录'
    },
    {
      category: '肝功能',
      count: stats.value.records.liverFunctionTests || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.liverFunctionTests || 0) / total) * 100) : 0,
      description: '肝功能检测记录'
    },
    {
      category: '肾功能',
      count: stats.value.records.kidneyFunctionTests || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.kidneyFunctionTests || 0) / total) * 100) : 0,
      description: '肾功能检测记录'
    },
    {
      category: 'EB病毒',
      count: stats.value.records.ebvRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.ebvRecords || 0) / total) * 100) : 0,
      description: 'EB病毒DNA检测'
    },
    {
      category: '巨细胞病毒',
      count: stats.value.records.cmvRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.cmvRecords || 0) / total) * 100) : 0,
      description: 'CMV病毒DNA检测'
    },
    {
      category: '乳酸脱氢酶',
      count: stats.value.records.ldhRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.ldhRecords || 0) / total) * 100) : 0,
      description: '乳酸脱氢酶检测'
    },
    {
      category: '用药记录',
      count: stats.value.records.medications || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.medications || 0) / total) * 100) : 0,
      description: '每日用药记录'
    },
    {
      category: '门诊记录',
      count: stats.value.records.clinicRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.clinicRecords || 0) / total) * 100) : 0,
      description: '医院就诊记录'
    },
    {
      category: '尿量记录',
      count: stats.value.records.urineRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.urineRecords || 0) / total) * 100) : 0,
      description: '尿量监测记录'
    },
    {
      category: '排便记录',
      count: stats.value.records.stoolRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.stoolRecords || 0) / total) * 100) : 0,
      description: '排便监测记录'
    },
    {
      category: '费用记录',
      count: stats.value.records.expenseRecords || 0,
      percentage: total > 0 ? Math.round(((stats.value.records.expenseRecords || 0) / total) * 100) : 0,
      description: '医疗费用记录'
    }
  ]
})

function getProgressColor(percentage) {
  if (percentage > 30) return '#409eff'
  if (percentage > 10) return '#67c23a'
  return '#e6a23c'
}

async function loadStats() {
  try {
    const res = await getStats()
    if (res.success) {
      stats.value = res.data
      await nextTick()
      initCharts()
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

function initCharts() {
  try {
    // 用户增长趋势图
    if (userTrendChart.value && stats.value.trends?.userTrend) {
      userChartInstance = echarts.init(userTrendChart.value)
      userChartInstance.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: stats.value.trends.userTrend.map(item => item.date.substring(5))
        },
        yAxis: { type: 'value' },
        series: [{
          data: stats.value.trends.userTrend.map(item => item.count),
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(64, 158, 255, 0.2)' },
          itemStyle: { color: '#409eff' }
        }]
      })
    }
  } catch (error) {
    console.error('用户趋势图初始化失败:', error)
  }

  try {
    // 记录增长趋势图
    if (recordTrendChart.value && stats.value.trends?.recordTrend) {
      recordChartInstance = echarts.init(recordTrendChart.value)
      recordChartInstance.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: stats.value.trends.recordTrend.map(item => item.date.substring(5))
        },
        yAxis: { type: 'value' },
        series: [{
          data: stats.value.trends.recordTrend.map(item => item.count),
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(103, 194, 58, 0.2)' },
          itemStyle: { color: '#67c23a' }
        }]
      })
    }
  } catch (error) {
    console.error('记录趋势图初始化失败:', error)
  }

  try {
    // 疾病类型分布图
    if (diseaseChart.value && stats.value.diseaseDistribution) {
      diseaseChartInstance = echarts.init(diseaseChart.value)
      diseaseChartInstance.setOption({
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        series: [{
          name: '疾病类型',
          type: 'pie',
          radius: '70%',
          data: stats.value.diseaseDistribution,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      })
    }
  } catch (error) {
    console.error('疾病分布图初始化失败:', error)
  }

  try {
    // 记录类型分布图
    if (recordTypeChart.value && stats.value.records) {
      recordTypeChartInstance = echarts.init(recordTypeChart.value)
      const recordData = [
        { value: stats.value.records.bloodTests, name: '血常规' },
        { value: stats.value.records.medications, name: '用药记录' },
        { value: stats.value.records.clinicRecords, name: '门诊记录' },
        { value: stats.value.records.liverFunctionTests, name: '肝功能' },
        { value: stats.value.records.kidneyFunctionTests, name: '肾功能' },
        { value: stats.value.records.ebvRecords, name: 'EB病毒' },
        { value: stats.value.records.cmvRecords, name: '巨细胞病毒' },
        { value: stats.value.records.ldhRecords, name: '乳酸脱氢酶' },
        { value: stats.value.records.urineRecords, name: '尿量记录' },
        { value: stats.value.records.stoolRecords, name: '排便记录' },
        { value: stats.value.records.expenseRecords, name: '费用记录' }
      ].filter(item => item.value > 0)

      recordTypeChartInstance.setOption({
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', right: 'right' },
        series: [{
          name: '记录类型',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          data: recordData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      })
    }
  } catch (error) {
    console.error('记录类型分布图初始化失败:', error)
  }
}

onMounted(() => {
  loadStats()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    userChartInstance?.resize()
    recordChartInstance?.resize()
    diseaseChartInstance?.resize()
    recordTypeChartInstance?.resize()
  })
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card-primary {
  border-left: 4px solid #409eff;
}

.stat-card-success {
  border-left: 4px solid #67c23a;
}

.stat-card-warning {
  border-left: 4px solid #e6a23c;
}

.stat-card-danger {
  border-left: 4px solid #f56c6c;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  font-size: 40px;
  opacity: 0.8;
}

.stat-card-primary .stat-icon {
  color: #409eff;
}

.stat-card-success .stat-icon {
  color: #67c23a;
}

.stat-card-warning .stat-icon {
  color: #e6a23c;
}

.stat-card-danger .stat-icon {
  color: #f56c6c;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.record-distribution {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.record-item:last-child {
  border-bottom: none;
}
</style>
