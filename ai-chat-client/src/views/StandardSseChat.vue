<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'
import { useAuthStore } from '../stores/auth'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<Message[]>([])
const messagesContainer = ref<HTMLElement | null>(null)
const isGenerating = ref(false)
const authStore = useAuthStore()
const eventSource = ref<EventSource | null>(null)

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 发送消息
const handleSend = async (content: string) => {
  if (isGenerating.value) return

  // 1. 本地显示用户消息
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content,
  })
  scrollToBottom()

  isGenerating.value = true

  // 2. 准备 AI 消息占位
  const aiMsgId = Date.now() + 1
  messages.value.push({
    id: aiMsgId,
    role: 'assistant',
    content: '',
  })

  // 3. 使用 EventSource 建立标准 SSE 连接
  // 注意：EventSource 不支持自定义 Header，所以 Token 必须通过 URL 传递
  const token = authStore.token
  const url = `/api/sse/standard?content=${encodeURIComponent(content)}&token=${token}`

  // 关闭旧连接
  if (eventSource.value) {
    eventSource.value.close()
  }

  try {
    const es = new EventSource(url)
    eventSource.value = es

    es.onopen = () => {
      console.log('SSE 连接已建立')
    }

    // 监听默认消息事件 (data: ...)
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.content) {
          const lastMessage = messages.value[messages.value.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += data.content
            scrollToBottom()
          }
        }
      } catch (e) {
        console.error('JSON parse error', e)
      }
    }

    // 监听自定义 'done' 事件
    es.addEventListener('done', () => {
      console.log('SSE 传输完成')
      closeConnection()
    })

    // 监听自定义 'error' 事件 (服务端主动发送的业务错误)
    es.addEventListener('error', (event: Event) => {
       // EventSource 错误事件通常是 Event 类型，携带信息较少，或者是 MessageEvent 如果是具名事件
       // 但根据服务端实现，我们发送的是 standard string chunk，如果是具名事件 error，它应该是 MessageEvent
       const messageEvent = event as MessageEvent
       console.error('SSE 业务错误', messageEvent.data)
       appendError('\n[系统消息: 发生错误]')
       closeConnection()
    })

    // 监听原生错误
    es.onerror = (err) => {
      // EventSource 在连接关闭时也会触发 error，需区分
      if (es.readyState === EventSource.CLOSED) {
         console.log('SSE 连接关闭')
      } else {
         console.error('SSE 网络错误', err)
         // 如果不是正常的关闭，可能是网络中断
         if (isGenerating.value) {
            appendError('\n[网络中断，连接已关闭]')
         }
         closeConnection()
      }
    }

  } catch (err) {
    console.error('创建 EventSource 失败', err)
    appendError('\n[初始化连接失败]')
    isGenerating.value = false
  }
}

const appendError = (text: string) => {
  const lastMessage = messages.value[messages.value.length - 1]
  if (lastMessage && lastMessage.role === 'assistant') {
    lastMessage.content += text
    scrollToBottom()
  }
}

const closeConnection = () => {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
  isGenerating.value = false
}

// 组件卸载时断开连接
onUnmounted(() => {
  closeConnection()
})
</script>

<template>
  <div class="chat-container">
    <div class="header-status">
      <h2>标准 SSE (EventSource)</h2>
      <span class="status" :class="{ connected: !isGenerating, generating: isGenerating }">
        {{ isGenerating ? '正在接收流...' : '空闲' }}
      </span>
    </div>

    <div class="messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        发送一条消息开始体验标准 SSE 流式传输
      </div>
      <ChatMessage v-for="msg in messages" :key="msg.id" :role="msg.role" :content="msg.content" />
    </div>

    <div class="input-area">
      <ChatInput @send="handleSend" :disabled="isGenerating" />
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.header-status {
  padding: 10px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
}

.header-status h2 {
  font-size: 16px;
  margin: 0;
  color: #333;
}

.status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  color: #666;
  background: #eee;
}

.status.generating {
  color: #fff;
  background: #2196F3;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.empty-state {
  text-align: center;
  color: #999;
  margin-top: 50px;
}

.input-area {
  padding: 20px;
  border-top: 1px solid #eee;
  background-color: #fff;
}
</style>
