/**
 * 简易 Markdown 转带样式的 HTML 工具
 * 支持常见的 Markdown 语法，使用内联样式
 */

function parseMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown;

  // 转义 HTML 特殊字符（除了已有的标签）
  html = html.replace(/&(?!amp;|lt;|gt;)/g, '&amp;');

  // 处理特殊字符和表情符号，避免乱码
  html = html.replace(/◆/g, '♦');  // 替换钻石符号
  html = html.replace(/[^\u0000-\u007F\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF]/g, ''); // 移除不支持的特殊字符

  // 1. 先处理代码块（避免代码块内的符号被误处理）
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g,
    '<div style="background:#F5F5F5;padding:8px 10px;border-radius:4px;margin:6px 0;overflow-x:auto;"><code style="font-family:monospace;font-size:13px;line-height:1.5;color:#333;">$2</code></div>');

  // 2. 处理行内代码
  html = html.replace(/`([^`]+)`/g,
    '<code style="background:#FFF5E6;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:13px;color:#FF9F4D;border:1px solid #FFE0B2;">$1</code>');

  // 3. 处理标题（从小到大，避免匹配冲突，紧凑间距）
  html = html.replace(/^####\s+(.+)$/gm, '<div style="font-size:15px;font-weight:bold;margin:8px 0 4px 0;line-height:1.4;color:#1A1A1A;">$1</div>');
  html = html.replace(/^###\s+(.+)$/gm, '<div style="font-size:16px;font-weight:bold;margin:10px 0 5px 0;line-height:1.4;color:#1A1A1A;">$1</div>');
  html = html.replace(/^##\s+(.+)$/gm, '<div style="font-size:17px;font-weight:bold;margin:12px 0 6px 0;line-height:1.4;color:#1A1A1A;">$1</div>');
  html = html.replace(/^#\s+(.+)$/gm, '<div style="font-size:18px;font-weight:bold;margin:14px 0 6px 0;line-height:1.4;color:#1A1A1A;">$1</div>');

  // 4. 处理加粗（在标题之后）
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight:600;color:#1A1A1A;">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong style="font-weight:600;color:#1A1A1A;">$1</strong>');

  // 5. 处理列表（有序和无序都转为统一样式，紧凑间距）
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin:2px 0;line-height:1.5;padding-left:1.2em;text-indent:-1.2em;">• $2</div>');
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<div style="margin:2px 0;line-height:1.5;padding-left:1.2em;text-indent:-1.2em;">• $1</div>');

  // 6. 处理斜体（最后处理，避免与列表冲突）
  html = html.replace(/\*([^*\n]+)\*/g, '<em style="font-style:italic;">$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em style="font-style:italic;">$1</em>');

  // 7. 处理换行（减小段落间距）
  html = html.replace(/\n\n+/g, '<div style="height:6px;"></div>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

module.exports = {
  parseMarkdown
};
