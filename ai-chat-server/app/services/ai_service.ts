import { MOCK_MARKDOWN } from '#constants/mock_data'

export default class AIService {
  /**
   * 模拟流式响应生成
   * @param content 用户输入的内容（目前仅用于占位）
   * @param callback 用于发送数据块的回调函数
   */
  async streamResponse(content: string, callback: (chunk: string) => void) {
    let responseText = ''
    if (content === 'mockmd') {
      responseText = MOCK_MARKDOWN
    } else {
      responseText = `收到你的消息: "${content}"。这是一个模拟的 AI 响应，用于演示打字机效果...`
    }

    for (const char of responseText) {
      callback(char)
      // 模拟打字延迟 (30-80ms 随机)
      // 如果是 mockmd，为了展示效果，可以稍微快一点或者保持原速
      const delay = Math.floor(Math.random() * 20) + 20
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
