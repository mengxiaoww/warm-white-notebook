#!/usr/bin/env python3
"""
批量修复所有页面的 AI JSON 解析问题
"""
import re

files_to_fix = [
    'packageA/pages/blood-test/index.js',
    'packageA/pages/blood-pressure/index.js',
    'packageA/pages/blood-oxygen/index.js',
    'packageA/pages/liver-function/index.js',
    'packageA/pages/kidney-function/index.js'
]

# 旧的 JSON 解析模式（两种可能的形式）
old_pattern_1 = r'''          // 尝试提取JSON
          const jsonMatch = content\.match\(/\\{[\[\\s\\S\]\*\\}/\);
          if \(jsonMatch\) \{
            const data = JSON\.parse\(jsonMatch\[0\]\);'''

old_pattern_2 = r'''        // 尝试提取JSON
        const jsonMatch = content\.match\(/\\{[\[\\s\\S\]\*\\}/\);
        if \(jsonMatch\) \{
          const data = JSON\.parse\(jsonMatch\[0\]\);'''

# 新的 JSON 解析代码
new_code = '''        // 尝试提取JSON（两种方法）
        let jsonStr = null;

        // 方法1: 从 markdown 代码块中提取
        const jsonMatch = content.match(/```json\\s*([\\s\\S]*?)\\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        } else {
          // 方法2: 直接查找 JSON 对象 (从第一个 { 到最后一个 })
          const jsonStart = content.indexOf('{');
          const jsonEnd = content.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonStr = content.substring(jsonStart, jsonEnd + 1);
          }
        }

        if (jsonStr) {
          // 清理 JSON 字符串
          jsonStr = jsonStr.trim();
          if (jsonStr.charCodeAt(0) === 0xFEFF) {
            jsonStr = jsonStr.substring(1);
          }

          console.log('提取的JSON字符串:', jsonStr);

          let data;
          try {
            data = JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('JSON解析失败:', parseError, '失败的字符串:', jsonStr);
            wx.hideLoading();
            wx.showToast({
              title: 'AI返回数据格式错误',
              icon: 'none'
            });
            return;
          }

          if (data && data.indicators && data.indicators.length > 0) {'''

for file_path in files_to_fix:
    print(f'\n处理文件: {file_path}')

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 统计修改次数
        modifications = 0

        # 查找所有需要修复的 JSON.parse 模式
        # 模式: const data = JSON.parse(jsonMatch[0]);
        # 且前面有 const jsonMatch = content.match(/\{[\s\S]*\}/);

        # 更简单的方法：直接替换特定的代码段
        pattern = r'''([ \t]*)// 尝试提取JSON\n\1const jsonMatch = content\.match\(/\\{[\[\\s\\S\]\*\\}/\);\n\1if \(jsonMatch\) \{\n\1  const data = JSON\.parse\(jsonMatch\[0\]\);'''

        # 替换所有匹配项
        new_content, count = re.subn(pattern, new_code, content, flags=re.MULTILINE)

        if count > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'  ✅ 修复了 {count} 处 JSON 解析')
            modifications = count
        else:
            print(f'  ⚠️  未找到需要修复的代码模式')

    except Exception as e:
        print(f'  ❌ 错误: {e}')

print('\n修复完成！')
