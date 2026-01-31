import { ref } from 'vue'
import { defineStore } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from './auth'

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const socket = ref<Socket | null>(null)

  // 初始化连接
  function connect() {
    if (socket.value?.connected) return
    const authStore = useAuthStore()
    // 优先使用环境变量中的地址，否则回退到 localhost
    // 注意：在生产环境 Nginx 配置中，socket.io 通常需要通过 /socket.io 路径代理
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin
    
    socket.value = io(socketUrl,
      {
        path: '/socket.io', // 明确指定 path，方便 Nginx 代理
        auth: {
          token: authStore.token // 重要：传递 Token
        }
      }
    )

    socket.value.on('connect', () => {
      console.log('已连接到服务器')
      isConnected.value = true
      error.value = null // 连接成功清除错误
    })

    socket.value.on('disconnect', () => {
      console.log('与服务器断开连接')
      isConnected.value = false
    })

    // 监听连接错误
    socket.value.on('connect_error', (err) => {
      console.error('连接错误:', err)
      isConnected.value = false
      error.value = '无法连接到服务器，请检查网络或服务器状态'
    })

    // 监听服务器返回的业务错误
    socket.value.on('error', (data: { message: string }) => {
      console.error('服务器错误:', data)
      error.value = data.message || '发生未知错误'
    })

    // 监听服务器消息
    socket.value.on('server_message', (data: { type: string; content?: string; id?: number }) => {
      if (data.type === 'user_sync' && data.content) {
        // 收到其他客户端发送的用户消息
        addMessage({
          id: data.id || Date.now(),
          role: 'user',
          content: data.content,
        })
      } else if (data.type === 'start') {
        // 准备接收新消息
        addMessage({
          id: Date.now(),
          role: 'assistant',
          content: '',
        })
      } else if (data.type === 'chunk' && data.content) {
        // 接收数据块
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += data.content
        }
      } else if (data.type === 'done') {
        console.log('消息接收完毕')
      }
    })
  }

  // 断开连接
  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
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
    if (socket.value && isConnected.value) {
      socket.value.emit('client_message', { content })
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
          'Authorization': `Bearer ${authStore.token}`
        }
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
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      
      if (response.ok) {
        messages.value = []
      }
    } catch (err) {
      console.error('清除历史消息失败', err)
      error.value = '清除历史失败'
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
    addMessage,
    clearError,
    fetchHistory,
    clearHistory
  }
})