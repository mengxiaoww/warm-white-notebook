<template>
  <div class="records-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>记录查询</span>
          <div class="header-actions">
            <el-button type="success" :icon="Download" @click="exportRecords" :loading="exporting">
              导出Excel
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选器 -->
      <div class="filters">
        <el-form :inline="true" :model="filters">
          <el-form-item label="记录类型">
            <el-select v-model="filters.recordType" @change="loadRecords" style="width: 150px;">
              <el-option label="血常规" value="bloodTests" />
              <el-option label="肝功能" value="liverFunctionTests" />
              <el-option label="肾功能" value="kidneyFunctionTests" />
              <el-option label="EB病毒" value="ebvRecords" />
              <el-option label="巨细胞病毒" value="cmvRecords" />
              <el-option label="乳酸脱氢酶" value="ldhRecords" />
              <el-option label="用药记录" value="medications" />
              <el-option label="门诊记录" value="clinicRecords" />
              <el-option label="尿量记录" value="urineRecords" />
              <el-option label="排便记录" value="stoolRecords" />
            </el-select>
          </el-form-item>

          <el-form-item label="日期范围">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="loadRecords"
            />
          </el-form-item>

          <el-form-item label="用户OpenID">
            <el-input
              v-model="filters.openid"
              placeholder="输入OpenID搜索"
              clearable
              style="width: 200px;"
              @keyup.enter="loadRecords"
            >
              <template #append>
                <el-button :icon="Search" @click="loadRecords" />
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :icon="Refresh" @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 数据表格 -->
      <el-table :data="records" v-loading="loading" stripe height="600">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="date" label="日期" width="120" sortable />
        <el-table-column prop="openid" label="用户OpenID" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click="viewUser(row.openid)">
              {{ row.openid?.substring(0, 12) }}...
            </el-link>
          </template>
        </el-table-column>

        <!-- 血常规 -->
        <template v-if="filters.recordType === 'bloodTests'">
          <el-table-column prop="wbc" label="白细胞(WBC)" width="130" sortable />
          <el-table-column prop="plt" label="血小板(PLT)" width="130" sortable />
          <el-table-column prop="hgb" label="血红蛋白(HGB)" width="140" sortable />
          <el-table-column prop="neut" label="中性粒细胞(NEUT)" width="160" sortable />
          <el-table-column prop="lymph" label="淋巴细胞(LYMPH)" width="150" sortable />
          <el-table-column label="其他数据" min-width="200">
            <template #default="{ row }">
              <el-tag v-for="(value, key) in getOtherData(row, ['wbc', 'plt', 'hgb', 'neut', 'lymph'])" :key="key" size="small" style="margin: 2px;">
                {{ key }}: {{ value }}
              </el-tag>
            </template>
          </el-table-column>
        </template>

        <!-- 肝功能 -->
        <template v-else-if="filters.recordType === 'liverFunctionTests'">
          <el-table-column prop="alt" label="谷丙转氨酶(ALT)" width="150" sortable />
          <el-table-column prop="ast" label="谷草转氨酶(AST)" width="150" sortable />
          <el-table-column prop="tbil" label="总胆红素(TBIL)" width="140" sortable />
          <el-table-column prop="dbil" label="直接胆红素(DBIL)" width="150" sortable />
          <el-table-column label="其他数据" min-width="200">
            <template #default="{ row }">
              <el-tag v-for="(value, key) in getOtherData(row, ['alt', 'ast', 'tbil', 'dbil'])" :key="key" size="small" style="margin: 2px;">
                {{ key }}: {{ value }}
              </el-tag>
            </template>
          </el-table-column>
        </template>

        <!-- 肾功能 -->
        <template v-else-if="filters.recordType === 'kidneyFunctionTests'">
          <el-table-column prop="cr" label="肌酐(CR)" width="120" sortable />
          <el-table-column prop="bun" label="尿素氮(BUN)" width="130" sortable />
          <el-table-column prop="ua" label="尿酸(UA)" width="120" sortable />
          <el-table-column prop="egfr" label="肾小球滤过率(eGFR)" width="170" sortable />
          <el-table-column label="其他数据" min-width="200">
            <template #default="{ row }">
              <el-tag v-for="(value, key) in getOtherData(row, ['cr', 'bun', 'ua', 'egfr'])" :key="key" size="small" style="margin: 2px;">
                {{ key }}: {{ value }}
              </el-tag>
            </template>
          </el-table-column>
        </template>

        <!-- 用药记录 -->
        <template v-else-if="filters.recordType === 'medications'">
          <el-table-column label="药品数" width="100">
            <template #default="{ row }">
              {{ row.medicines?.length || 0 }}
            </template>
          </el-table-column>
          <el-table-column label="药品列表" min-width="300">
            <template #default="{ row }">
              <el-tag v-for="(med, index) in row.medicines" :key="index" style="margin: 2px;">
                {{ med.name }} ({{ med.dosage }})
              </el-tag>
            </template>
          </el-table-column>
        </template>

        <!-- 门诊记录 -->
        <template v-else-if="filters.recordType === 'clinicRecords'">
          <el-table-column prop="hospital" label="医院" width="150" />
          <el-table-column prop="department" label="科室" width="120" />
          <el-table-column prop="doctor" label="医生" width="100" />
          <el-table-column prop="diagnosis" label="诊断" min-width="200" show-overflow-tooltip />
          <el-table-column prop="cost" label="费用" width="100">
            <template #default="{ row }">
              {{ row.cost ? `¥${row.cost}` : '-' }}
            </template>
          </el-table-column>
        </template>

        <!-- 其他记录类型 -->
        <template v-else>
          <el-table-column label="数据详情" min-width="400">
            <template #default="{ row }">
              <el-tag v-for="(value, key) in getRecordData(row)" :key="key" size="small" style="margin: 2px;">
                {{ key }}: {{ formatValue(value) }}
              </el-tag>
            </template>
          </el-table-column>
        </template>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="记录详情" width="600px">
      <el-descriptions :column="1" border v-if="currentRecord">
        <el-descriptions-item v-for="(value, key) in getRecordData(currentRecord)" :key="key" :label="key">
          {{ formatValue(value) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRecords } from '@/api/cloud'
import { ElMessage } from 'element-plus'
import { Download, Search, Refresh } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'

const router = useRouter()

const records = ref([])
const loading = ref(false)
const exporting = ref(false)
const detailDialogVisible = ref(false)
const currentRecord = ref(null)

const filters = ref({
  recordType: 'bloodTests',
  dateRange: null,
  openid: ''
})

const pagination = ref({
  page: 1,
  limit: 50,
  total: 0
})

const recordTypeNames = {
  bloodTests: '血常规',
  liverFunctionTests: '肝功能',
  kidneyFunctionTests: '肾功能',
  ebvRecords: 'EB病毒',
  cmvRecords: '巨细胞病毒',
  ldhRecords: '乳酸脱氢酶',
  medications: '用药记录',
  clinicRecords: '门诊记录',
  urineRecords: '尿量记录',
  stoolRecords: '排便记录'
}

async function loadRecords() {
  try {
    loading.value = true
    const params = {
      recordType: filters.value.recordType,
      page: pagination.value.page,
      limit: pagination.value.limit
    }

    if (filters.value.openid) {
      params.openid = filters.value.openid
    }

    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      params.startDate = filters.value.dateRange[0]
      params.endDate = filters.value.dateRange[1]
    }

    const res = await getRecords(params)

    if (res.success) {
      records.value = res.data.list
      pagination.value.total = res.data.total
    }
  } catch (error) {
    ElMessage.error('加载记录失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = {
    recordType: 'bloodTests',
    dateRange: null,
    openid: ''
  }
  pagination.value.page = 1
  loadRecords()
}

function getRecordData(row) {
  const exclude = ['_id', 'openid', 'profileId', 'date', '_openid', 'createTime', 'updateTime']
  const data = {}
  Object.keys(row).forEach(key => {
    if (!exclude.includes(key) && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      data[key] = row[key]
    }
  })
  return data
}

function getOtherData(row, excludeFields) {
  const exclude = ['_id', 'openid', 'profileId', 'date', '_openid', 'createTime', 'updateTime', ...excludeFields]
  const data = {}
  Object.keys(row).forEach(key => {
    if (!exclude.includes(key) && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      data[key] = row[key]
    }
  })
  return data
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return value
}

function viewDetail(row) {
  currentRecord.value = row
  detailDialogVisible.value = true
}

function viewUser(openid) {
  router.push(`/users/${openid}`)
}

async function exportRecords() {
  try {
    exporting.value = true

    // 获取所有数据（不分页）
    const res = await getRecords({
      recordType: filters.value.recordType,
      page: 1,
      limit: 10000, // 导出最多10000条
      openid: filters.value.openid,
      startDate: filters.value.dateRange?.[0],
      endDate: filters.value.dateRange?.[1]
    })

    if (!res.success || !res.data.list.length) {
      ElMessage.warning('没有数据可导出')
      return
    }

    const data = res.data.list
    const recordTypeName = recordTypeNames[filters.value.recordType]

    // 准备Excel数据
    const excelData = data.map(record => {
      const row = { ...record }
      delete row._id
      delete row._openid
      return row
    })

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, recordTypeName)

    // 下载文件
    const fileName = `${recordTypeName}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)

    ElMessage.success(`成功导出 ${data.length} 条记录`)
  } catch (error) {
    ElMessage.error('导出失败')
    console.error('Export error:', error)
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.records-container {
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
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
