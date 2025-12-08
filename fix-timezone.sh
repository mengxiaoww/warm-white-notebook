#!/bin/bash

# 批量修复时区问题：将 new Date().toISOString().split('T')[0] 替换为 getTodayLocalDate()

FILES=(
  "packageA/pages/blood-oxygen/index.js"
  "packageA/pages/body-measurement/index.js"
  "packageA/pages/diet/index.js"
  "packageA/pages/blood-pressure/index.js"
  "packageA/pages/blood-sugar/index.js"
  "packageA/pages/water-intake/index.js"
  "packageA/pages/temperature/index.js"
  "pages/home/index.js"
  "pages/daily-record/index.js"
)

for file in "${FILES[@]}"; do
  echo "正在修复: $file"

  # 1. 在文件开头添加工具函数引入（如果还没有的话）
  if ! grep -q "getTodayLocalDate" "$file"; then
    # 查找第一个 Page({ 的位置
    if grep -q "^Page({" "$file"; then
      # 在 Page({ 之前插入引入语句
      sed -i.bak '/^Page({/i\
// 引入工具函数\
const { getTodayLocalDate } = require("../../utils/util.js");\
' "$file"
    fi
  fi

  # 2. 替换所有 new Date().toISOString().split('T')[0] 为 getTodayLocalDate()
  sed -i.bak "s/new Date().toISOString().split('T')\[0\]/getTodayLocalDate()/g" "$file"

  echo "✅ 完成: $file"
done

echo ""
echo "🎉 所有文件修复完成！"
echo "注意：已创建 .bak 备份文件，确认无误后可以删除"
