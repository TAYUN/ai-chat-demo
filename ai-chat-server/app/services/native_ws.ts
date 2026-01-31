import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'node:http'
import server from '@adonisjs/core/services/server'
import { Secret } from '@adonisjs/core/helpers'
import User from '#models/user'

interface ClientData {
  user: User
  rooms: Set<string>
  isAlive: boolean
}

interface WsMessage {
  event: string
  data: any
}

type MessageHandler = (ws: WebSocket, message: WsMessage) => void | Promise<void>
type ConnectHandler = (ws: WebSocket) => void

class NativeWsService {
  wss: WebSocketServer | undefined
  private booted = false
  private clients = new Map<WebSocket, ClientData>()
  private messageHandlers: MessageHandler[] = []
  private connectHandlers: ConnectHandler[] = []
  private _heartbeatInterval: NodeJS.Timeout | undefined

  boot() {
    if (this.booted) {
      return
    }

    this.booted = true
    this.wss = new WebSocketServer({
      server: server.getNodeServer(),
      path: '/ws',
    })

    // 启动心跳检测 (每30秒)
    this.startHeartbeat()

    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        const user = await this.authenticate(req)
        if (!user) {
          ws.close(1008, 'Authentication failed')
          return
        }

        // 初始化连接数据，isAlive 默认为 true
        this.clients.set(ws, { user, rooms: new Set(), isAlive: true })
        console.log(`User connected: ${user.email}`)

        // 监听 pong 事件以确认客户端存活
        ws.on('pong', () => {
          const client = this.clients.get(ws)
          if (client) {
            client.isAlive = true
          }
        })

        // 发送连接成功消息
        this.emit(ws, 'connected', { message: '连接成功' })

        // 触发连接处理器
        this.connectHandlers.forEach((handler) => {
          try {
            handler(ws)
          } catch (err) {
            console.error('连接处理器执行失败:', err)
          }
        })

        ws.on('message', async (message: Buffer) => {
          try {
            const parsed = JSON.parse(message.toString()) as WsMessage
            // 触发消息处理器
            this.messageHandlers.forEach((handler) => {
              try {
                handler(ws, parsed)
              } catch (err) {
                console.error('消息处理器执行失败:', err)
              }
            })
          } catch (error) {
            console.error('解析消息失败:', error)
            this.emit(ws, 'error', { message: '消息格式错误' })
          }
        })

        ws.on('close', () => {
          console.log(`User disconnected: ${user.email}`)
          this.clients.delete(ws)
        })

        ws.on('error', (error) => {
          console.error('WebSocket error:', error)
        })
      } catch (error) {
        console.error('WebSocket连接处理失败:', error)
        ws.close(1011, 'Internal server error')
      }
    })
  }

  // 启动心跳检测
  private startHeartbeat() {
    this._heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const client = this.clients.get(ws)
        if (!client) return

        if (client.isAlive === false) {
          console.log(`Client ${client.user.email} inactive, terminating connection`)
          return ws.terminate()
        }

        client.isAlive = false
        ws.ping()
      })
    }, 30000) // 30秒检测一次
  }

  // 注册消息处理器
  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler)
  }

  // 注册连接处理器
  onConnect(handler: ConnectHandler) {
    this.connectHandlers.push(handler)
  }

  private async authenticate(req: IncomingMessage): Promise<User | null> {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const token = url.searchParams.get('token')

      if (!token) {
        console.error('WebSocket auth failed: Token missing')
        return null
      }

      const accessToken = await User.accessTokens.verify(new Secret(token))
      if (!accessToken) {
        console.error('WebSocket auth failed: Invalid token')
        return null
      }

      const user = await User.find(accessToken.tokenableId)
      if (!user) {
        console.error('WebSocket auth failed: User not found')
        return null
      }

      return user
    } catch (error) {
      console.error('WebSocket auth error:', error)
      return null
    }
  }

  emit(ws: WebSocket, event: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }))
    }
  }

  broadcast(event: string, data: any, exclude?: WebSocket) {
    this.clients.forEach((_, ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        this.emit(ws, event, data)
      }
    })
  }

  broadcastToRoom(room: string, event: string, data: any, exclude?: WebSocket) {
    this.clients.forEach((clientData, ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN && clientData.rooms.has(room)) {
        this.emit(ws, event, data)
      }
    })
  }

  broadcastToUser(userId: number, event: string, data: any, exclude?: WebSocket) {
    this.clients.forEach((clientData, ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN && clientData.user.id === userId) {
        this.emit(ws, event, data)
      }
    })
  }

  getClientData(ws: WebSocket): ClientData | undefined {
    return this.clients.get(ws)
  }

  getClientsByUser(userId: number): WebSocket[] {
    const result: WebSocket[] = []
    this.clients.forEach((clientData, ws) => {
      if (clientData.user.id === userId) {
        result.push(ws)
      }
    })
    return result
  }

  joinRoom(ws: WebSocket, room: string) {
    const clientData = this.clients.get(ws)
    if (clientData) {
      clientData.rooms.add(room)
    }
  }

  leaveRoom(ws: WebSocket, room: string) {
    const clientData = this.clients.get(ws)
    if (clientData) {
      clientData.rooms.delete(room)
    }
  }
}

export default new NativeWsService()
