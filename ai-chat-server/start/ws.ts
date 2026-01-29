import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import Ws from '#services/ws'
import AIService from '#services/ai_service'
import Message from '#models/message'
import User from '#models/user'

app.ready(() => {
  Ws.boot()
  const io = Ws.io
  const aiService = new AIService()

  /**
   * 中间件：WebSocket 身份验证
   */
  io?.use(async (socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication error: Token missing'))
    }

    try {
      // 验证 Token - 使用 Secret 包装 token
      const accessToken = await User.accessTokens.verify(new Secret(token))

      if (!accessToken) {
        return next(new Error('Authentication error: Invalid token'))
      }

      const user = await User.find(accessToken.tokenableId)

      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      // 将用户挂载到 socket 对象上，方便后续使用
      socket.data.user = user
      next()
    } catch (error) {
      console.error('WS Auth error:', error)
      next(new Error('Authentication error: Invalid token'))
    }
  })

  /**
   * 监听客户端连接
   */
  io?.on('connection', (socket) => {
    const user = socket.data.user
    console.log(`User connected: ${user.email} (${socket.id})`)

    // 加入用户专属房间，用于多端同步
    socket.join(`user:${user.id}`)

    /**
     * 监听客户端发送的消息
     * 事件名: client_message
     */
    socket.on('client_message', async (data) => {
      try {
        console.log('收到客户端消息:', data)
        const content = data.content || ''
        const currentUser = socket.data.user

        // 保存用户消息到数据库
        const userMsg = await Message.create({
          role: 'user',
          content: content,
          userId: currentUser.id,
        })

        // 广播用户消息给该用户的其他客户端（实现多端同步）
        // 使用 to(`user:${userId}`) 发给该用户的所有设备
        // 使用 except(socket.id) 排除当前发送的设备（因为它已经本地上屏了）
        socket.to(`user:${currentUser.id}`).emit('server_message', {
          type: 'user_sync',
          content: content,
          id: userMsg.id,
        })

        // 1. 发送开始标记（只发给当前用户的所有设备）
        io?.to(`user:${currentUser.id}`).emit('server_message', { type: 'start' })

        let fullAiResponse = ''

        // 2. 调用 AI 服务生成流式响应
        await aiService.streamResponse(content, (chunk) => {
          fullAiResponse += chunk
          // 推送每一个字符给当前用户的所有设备
          io?.to(`user:${currentUser.id}`).emit('server_message', {
            type: 'chunk',
            content: chunk,
          })
        })

        // 保存 AI 响应到数据库
        await Message.create({
          role: 'assistant',
          content: fullAiResponse,
          userId: currentUser.id,
        })

        // 3. 发送结束标记
        io?.to(`user:${currentUser.id}`).emit('server_message', { type: 'done' })
      } catch (error) {
        console.error('处理消息时出错:', error)
        socket.emit('error', { message: '服务器处理消息失败，请稍后重试' })
      }
    })

    /**
     * 监听断开连接
     */
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.email}`)
    })
  })
})
