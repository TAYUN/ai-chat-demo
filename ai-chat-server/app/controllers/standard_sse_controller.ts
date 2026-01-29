import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { Secret } from '@adonisjs/core/helpers'
import AIService from '#services/ai_service'
import Message from '#models/message'

export default class StandardSseController {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  /**
   * 标准 SSE 连接 (使用 EventSource API)
   * 支持通过 URL 参数传递 token 进行鉴权
   */
  async chat({ request, response }: HttpContext) {
    const content = request.input('content', '')
    const token = request.input('token', '')

    // 1. 手动鉴权
    if (!token) {
      return response.unauthorized({ message: 'Token is required' })
    }

    let user: User | null = null
    try {
      const accessToken = await User.accessTokens.verify(new Secret(token))
      if (!accessToken) {
        return response.unauthorized({ message: 'Invalid token' })
      }
      user = await User.find(accessToken.tokenableId)
    } catch (error) {
      return response.unauthorized({ message: 'Invalid token' })
    }

    if (!user) {
      return response.unauthorized({ message: 'User not found' })
    }

    // 2. 保存用户消息
    if (content) {
      await Message.create({
        userId: user.id,
        role: 'user',
        content,
      })
    }

    // 3. 设置 SSE 响应头
    // 必须设置 headers 才能保持连接
    response.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*', // 开发环境允许跨域
    })

    // 发送连接成功注释（心跳）
    response.response.write(': connected\n\n')

    let fullResponse = ''

    try {
      // 4. 调用 AI 服务生成流
      await this.aiService.streamResponse(content, (chunk) => {
        fullResponse += chunk
        // 标准 SSE 格式: data: <content>\n\n
        // 我们发送 JSON 格式以便前端解析
        response.response.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      })

      // 5. 保存 AI 响应
      await Message.create({
        userId: user.id,
        role: 'assistant',
        content: fullResponse,
      })

      // 发送结束事件
      // 使用具名事件 event: done
      response.response.write('event: done\n')
      response.response.write('data: [DONE]\n\n')
    } catch (error) {
      console.error('SSE Error:', error)
      response.response.write(`event: error\n`)
      response.response.write(`data: ${JSON.stringify({ message: 'Internal Server Error' })}\n\n`)
    } finally {
      response.response.end()
    }
  }
}
