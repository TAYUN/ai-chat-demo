import { Marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const marked = new Marked({
  gfm: true,
  breaks: true,
})

const renderer = {
  // 兼容不同版本的 marked 参数签名 (对象 vs 位置参数)
  code(arg1: string | { text: string; lang?: string }, arg2?: string) {
    let text = ''
    let lang = ''

    if (typeof arg1 === 'object' && arg1 !== null) {
      // v12+ 签名: code({ text, lang, ... })
      text = arg1.text || ''
      lang = arg1.lang || ''
    } else {
      // 旧版签名: code(code, lang, escaped)
      text = String(arg1 || '')
      lang = String(arg2 || '')
    }

    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
    let highlighted = ''
    try {
      highlighted = hljs.highlight(text, { language }).value
    } catch {
      highlighted = text
    }
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`
  },
}

marked.use({ renderer })

export const renderMarkdown = (content: string) => {
  return marked.parse(content) as string
}

/**
 * ### 主要修复与优化
1. 修复代码块转义问题 ：
   - 发现 marked 在渲染代码块时，如果使用默认的高亮配置，可能会将 HTML 转义导致显示为 <span ...> 源码。
   - 解决方案 ：创建了 src/utils/markdown.ts ，手动重写了 renderer.code 方法，直接调用 highlight.js 并返回受信任的 HTML 字符串，彻底解决了转义问题。
2. 样式优化 ( atom-one-dark ) ：
   - 引入了 atom-one-dark.css 主题，代码高亮效果更佳。
   - 针对 ChatMessage.vue 进行了深度样式定制，特别是 用户消息（蓝色背景） 下的代码块、表格和引用样式，使其在深色/彩色背景下依然清晰易读（增加了半透明背景和边框）。
3. 代码重构 ：
   - 将 Markdown 相关的配置逻辑从组件中剥离到 src/utils/markdown.ts ，实现了逻辑复用和统一管理。
   - ChatMessage.vue 变得更加简洁，专注于视图呈现。
4. 环境更新 ：
   - 执行了 pnpm install 确保依赖一致性。
   - 使用 pnpm 环境启动了前端开发服务器。
 */