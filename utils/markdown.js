/**
 * 简易 Markdown 转带样式的 HTML 工具
 * 支持常见的 Markdown 语法，使用内联样式
 */

function parseMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // 转义 HTML 特殊字符（除了已有的标签）
  html = html.replace(/&(?!amp;|lt;|gt;)/g, '&amp;');

  // 处理代码块 ```
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g,
    '<div style="background:#F5F5F5;padding:10px 12px;border-radius:6px;margin:8px 0;overflow-x:auto;"><code style="font-family:monospace;font-size:13px;line-height:1.5;">$2</code></div>');

  // 处理行内代码 `code`
  html = html.replace(/`([^`]+)`/g,
    '<code style="background:#F5F5F5;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:13px;color:#E63946;">$1</code>');

  // 处理加粗 **text** 或 __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:bold;">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong style="font-weight:bold;">$1</strong>');

  // 处理标题
  html = html.replace(/^####\s+(.+)$/gm, '<div style="font-size:15px;font-weight:bold;margin:8px 0 4px 0;line-height:1.4;">$1</div>');
  html = html.replace(/^###\s+(.+)$/gm, '<div style="font-size:16px;font-weight:bold;margin:8px 0 4px 0;line-height:1.4;">$1</div>');
  html = html.replace(/^##\s+(.+)$/gm, '<div style="font-size:17px;font-weight:bold;margin:10px 0 5px 0;line-height:1.4;">$1</div>');
  html = html.replace(/^#\s+(.+)$/gm, '<div style="font-size:18px;font-weight:bold;margin:10px 0 5px 0;line-height:1.4;">$1</div>');

  // 处理有序列表 (数字开头) - 移除数字和点号
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin:4px 0;line-height:1.6;padding-left:20px;">• $2</div>');

  // 处理无序列表 (- 或 * 开头) - 替换为 •
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<div style="margin:4px 0;line-height:1.6;padding-left:20px;">• $1</div>');

  // 处理斜体 *text* 或 _text_ (必须在列表之后处理，避免冲突)
  html = html.replace(/([^*])\*([^*\n]+)\*([^*])/g, '$1<em style="font-style:italic;">$2</em>$3');
  html = html.replace(/([^_])_([^_\n]+)_([^_])/g, '$1<em style="font-style:italic;">$2</em>$3');

  // 处理换行 - 紧凑间距
  html = html.replace(/\n\n+/g, '<div style="height:10px;"></div>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

module.exports = {
  parseMarkdown
};
