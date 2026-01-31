import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

interface WsMessage {
  event: string
  data: {
    type?: string
    content?: string
    id?: number
    message?: string
    room?: string
  }
}

export const useNativeChatStore = defineStore('nativeChat', () => {
  const messages = ref<Message[]>([])
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  let ws: WebSocket | null = null
  
  // 重连配置
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000 // 3秒
  let reconnectAttempts = 0
  let reconnectTimer: number | null = null
  let isIntentionalDisconnect = false // 标记是否为用户主动断开

  // 初始化连接
  function connect() {
    // 如果已经连接或正在连接，则忽略
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return
    
    // 重置重连状态
    reconnectAttempts = 0
    isIntentionalDisconnect = false
    clearReconnectTimer()
    
    initWebSocket()
  }

  // 清除重连定时器
  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  // 内部连接逻辑
  function initWebSocket() {
    const authStore = useAuthStore()
    const token = authStore.token

    if (!token) {
      error.value = '未登录，无法连接'
      return
    }

    // 动态获取 WebSocket 地址，支持环境变量覆盖
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const defaultWsUrl = `${protocol}//${host}/ws`
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl
    
    ws = new WebSocket(`${wsUrl}?token=${token}`)

    ws.onopen = () => {
      console.log('原生 WebSocket 已连接')
      isConnected.value = true
      error.value = null
      // 连接成功，重置重连计数
      reconnectAttempts = 0
    }

    ws.onclose = (event) => {
      console.log(`原生 WebSocket 已断开 (code: ${event.code})`)
      isConnected.value = false
      ws = null

      // 如果不是主动断开，尝试重连
      if (!isIntentionalDisconnect) {
        attemptReconnect()
      }
    }

    ws.onerror = (event) => {
      console.error('WebSocket 错误:', event)
      // onerror 之后通常会触发 onclose，重连逻辑在 onclose 中处理
      error.value = '连接发生错误'
    }

    ws.onmessage = (event) => {
      try {
        const { event: type, data }: WsMessage = JSON.parse(event.data)
        handleServerMessage(type, data)
      } catch (err) {
        console.error('解析消息失败:', err)
      }
    }
  }

  // 尝试重连
  function attemptReconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++
      error.value = `连接断开，正在尝试重连 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
      console.log(`尝试重连... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
      
      reconnectTimer = setTimeout(() => {
        initWebSocket()
      }, RECONNECT_DELAY)
    } else {
      error.value = '连接断开，重连失败。请检查网络或手动刷新。'
    }
  }

  // 处理服务器消息
  function handleServerMessage(type: string, data: WsMessage['data']) {
    switch (type) {
      case 'connected':
        console.log('服务器确认连接:', data?.message)
        break

      case 'server_message':
        handleChatMessage(data)
        break

      case 'error':
        error.value = data?.message || '发生未知错误'
        break

      case 'joined':
        console.log('加入房间:', data?.room)
        break

      case 'left':
        console.log('离开房间:', data?.room)
        break

      default:
        console.log('未知事件:', type, data)
    }
  }

  // 处理聊天相关消息
  function handleChatMessage(data: WsMessage['data']) {
    const msgType = data?.type

    if (msgType === 'user_sync' && data.content) {
      // 收到其他客户端发送的用户消息
      addMessage({
        id: data.id || Date.now(),
        role: 'user',
        content: data.content,
      })
    } else if (msgType === 'start') {
      // 准备接收新消息
      addMessage({
        id: Date.now(),
        role: 'assistant',
        content: '',
      })
    } else if (msgType === 'chunk' && data.content) {
      // 接收数据块
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content += data.content
      }
    } else if (msgType === 'done') {
      console.log('消息接收完毕')
    }
  }

  // 断开连接
  function disconnect() {
    isIntentionalDisconnect = true
    clearReconnectTimer()
    
    if (ws) {
      ws.close()
      ws = null
      isConnected.value = false
    }
  }

  // 添加消息
  function addMessage(msg: Message) {
    messages.value.push(msg)
  }

  // 发送消息
  function sendMessage(content: string) {
    // 1. 本地立即显示
    addMessage({
      id: Date.now(),
      role: 'user',
      content,
    })

    // 2. 发送给服务器
    if (ws && isConnected.value) {
      ws.send(
        JSON.stringify({
          event: 'client_message',
          data: { content },
        })
      )
    } else {
      alert('未连接到服务器')
    }
  }

  // 获取历史消息
  async function fetchHistory() {
    try {
      const authStore = useAuthStore()
      const response = await fetch('/api/messages', {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData.code === 200) {
          messages.value = resData.data
        }
      }
    } catch (err) {
      console.error('获取历史消息失败', err)
    }
  }

  // 清除历史消息
  async function clearHistory() {
    try {
      const authStore = useAuthStore()
      const response = await fetch('/api/messages', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })

      if (response.ok) {
        messages.value = []
      }
    } catch (err) {
      console.error('清除历史消息失败', err)
    }
  }

  // 清除错误
  function clearError() {
    error.value = null
  }

  return {
    messages,
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    fetchHistory,
    clearHistory,
    clearError,
  }
})
