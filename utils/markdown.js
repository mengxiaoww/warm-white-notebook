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
    '<div style="background:#F5F5F5;padding:12px;border-radius:6px;margin:8px 0;overflow-x:auto;"><code style="font-family:monospace;font-size:13px;line-height:1.5;">$2</code></div>');

  // 处理行内代码 `code`
  html = html.replace(/`([^`]+)`/g,
    '<code style="background:#F5F5F5;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:13px;color:#E63946;">$1</code>');

  // 处理加粗 **text** 或 __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:bold;">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong style="font-weight:bold;">$1</strong>');

  // 处理斜体 *text* 或 _text_
  html = html.replace(/\*([^*]+)\*/g, '<em style="font-style:italic;">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em style="font-style:italic;">$1</em>');

  // 处理标题
  html = html.replace(/^### (.+)$/gm, '<div style="font-size:16px;font-weight:bold;margin:12px 0 6px 0;line-height:1.4;">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div style="font-size:17px;font-weight:bold;margin:12px 0 6px 0;line-height:1.4;">$1</div>');
  html = html.replace(/^# (.+)$/gm, '<div style="font-size:18px;font-weight:bold;margin:12px 0 6px 0;line-height:1.4;">$1</div>');

  // 处理无序列表和有序列表
  html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li style="margin:6px 0;line-height:1.5;list-style-type:disc;">$1</li>');
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li style="margin:6px 0;line-height:1.5;list-style-type:decimal;">$1. $2</li>');

  // 将连续的 <li> 包裹在 ul/ol 中
  html = html.replace(/(<li[^>]*list-style-type:disc[^>]*>.*<\/li>\n?)+/g, (match) => {
    return '<ul style="margin:10px 0;padding-left:24px;">' + match + '</ul>';
  });
  html = html.replace(/(<li[^>]*list-style-type:decimal[^>]*>.*<\/li>\n?)+/g, (match) => {
    return '<ol style="margin:10px 0;padding-left:24px;">' + match + '</ol>';
  });

  // 处理换行 - 减少空行间距
  html = html.replace(/\n\n/g, '<div style="height:8px;"></div>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

module.exports = {
  parseMarkdown
};
