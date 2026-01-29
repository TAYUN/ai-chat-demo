import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'

import AIService from '#services/ai_service'

export default class ChatsController {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  /**
   * 获取消息历史
   */
  async index({ response, auth }: HttpContext) {
    const user = auth.user!
    // 只获取当前用户的消息
    const messages = await Message.query().where('user_id', user.id).orderBy('createdAt', 'asc')

    return response.ok({
      code: 200,
      message: '获取消息历史成功',
      data: messages,
    })
  }

  /**
   * 保存用户消息
   */
  async store({ request, response, auth }: HttpContext) {
    const { content } = request.only(['content'])
    const user = auth.user!

    if (!content) {
      return response.badRequest({
        code: 400,
        message: 'Content is required',
        data: null,
      })
    }

    const message = await Message.create({
      userId: user.id,
      role: 'user',
      content,
    })

    return response.created({
      code: 201,
      message: '消息发送成功',
      data: message,
    })
  }

  /**
   * 清除消息历史
   */
  async destroy({ response, auth }: HttpContext) {
    const user = auth.user!
    // 只删除当前用户的消息
    await Message.query().where('user_id', user.id).delete()
    return response.ok({
      code: 200,
      message: '消息历史已清除',
      data: null,
    })
  }

  /**
   * SSE 流式响应接口
   */
  async stream({ request, response, auth }: HttpContext) {
    const content = request.input('content', '')
    const user = auth.user!

    // 1. 保存用户消息
    await Message.create({
      userId: user.id,
      role: 'user',
      content,
    })

    response.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    let fullResponse = ''

    await this.aiService.streamResponse(content, (chunk) => {
      fullResponse += chunk
      response.response.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    })

    // 2. 保存 AI 响应消息
    await Message.create({
      userId: user.id,
      role: 'assistant',
      content: fullResponse,
    })

    response.response.write('data: [DONE]\n\n')
    response.response.end()
  }
}
