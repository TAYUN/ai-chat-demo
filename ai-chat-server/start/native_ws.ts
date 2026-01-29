import app from '@adonisjs/core/services/app'
import NativeWs from '#services/native_ws'
import AIService from '#services/ai_service'
import Message from '#models/message'

app.ready(() => {
  NativeWs.boot()
  const aiService = new AIService()

  // 注册消息处理器
  NativeWs.onMessage(async (ws, message) => {
    if (message.event !== 'client_message') {
      return
    }

    try {
      const content = message.data?.content || ''
      console.log('收到客户端消息:', content)

      const clientData = NativeWs.getClientData(ws)
      if (!clientData) return

      const user = clientData.user

      // 保存用户消息到数据库
      const userMsg = await Message.create({
        role: 'user',
        content: content,
        userId: user.id,
      })

      // 广播用户消息给该用户的其他客户端（实现多端同步）
      // 排除当前发送的设备（因为它已经本地上屏了）
      NativeWs.broadcastToUser(
        user.id,
        'server_message',
        {
          type: 'user_sync',
          content: content,
          id: userMsg.id,
        },
        ws
      )

      // 1. 发送开始标记（发给该用户的所有设备）
      NativeWs.broadcastToUser(user.id, 'server_message', { type: 'start' })

      let fullAiResponse = ''

      // 2. 调用 AI 服务生成流式响应
      await aiService.streamResponse(content, (chunk) => {
        fullAiResponse += chunk
        // 推送每一个字符给该用户的所有设备
        NativeWs.broadcastToUser(user.id, 'server_message', {
          type: 'chunk',
          content: chunk,
        })
      })

      // 保存 AI 响应到数据库
      await Message.create({
        role: 'assistant',
        content: fullAiResponse,
        userId: user.id,
      })

      // 3. 发送结束标记
      NativeWs.broadcastToUser(user.id, 'server_message', { type: 'done' })
    } catch (error) {
      console.error('处理消息时出错:', error)
      NativeWs.emit(ws, 'error', { message: '服务器处理消息失败，请稍后重试' })
    }
  })

  // 注册连接处理器
  NativeWs.onConnect((ws) => {
    const clientData = NativeWs.getClientData(ws)
    if (!clientData) return

    const user = clientData.user
    console.log(`User connected via handler: ${user.email}`)

    // 加入用户专属房间，用于多端同步
    const userRoom = `user:${user.id}`
    NativeWs.joinRoom(ws, userRoom)
  })
})
