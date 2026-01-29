<script setup lang="ts">
import { ref, nextTick } from 'vue'
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

  // 3. 使用 fetch 建立 SSE 连接 (支持 Header 鉴权)
  try {
    const response = await fetch(`/api/stream?content=${encodeURIComponent(content)}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      
      // 处理可能的多行数据
      const lines = buffer.split('\n\n')
      // 保留最后一个可能不完整的块
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6)
          
          if (dataStr === '[DONE]') {
            isGenerating.value = false
            break
          }

          try {
            const data = JSON.parse(dataStr)
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
      }
    }
  } catch (err) {
    console.error('SSE Error:', err)
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content += '\n[出错: 连接中断]'
    }
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="chat-container">
    <Teleport to="#header-extras">
      <span class="status" :class="{ connected: !isGenerating, generating: isGenerating }">
        {{ isGenerating ? '生成中...' : '就绪' }}
      </span>
    </Teleport>

    <div class="messages" ref="messagesContainer">
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
  height: 100%; /* 改为 100% 以适应父容器 */
  max-width: 800px;
  margin: 0 auto;
  background-color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 100%; /* 确保在小屏幕上占满宽度 */
}

/* 
  Header 相关样式已移除。
  .status 样式由 ChatRoom.vue 中的全局样式或 App.vue 管理。
  如果这里需要特定的样式，应该放在全局样式中或者使用 :deep，
  但为了保持一致性，建议复用 ChatRoom 的 .status 样式。
*/
/* .status.generating 样式补充 */
</style>

<style>
/* 补充 SSE 特有的全局样式 */
.status.generating {
  color: #4caf50;
  font-weight: bold;
}
</style>

<style scoped>
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-area {
  padding: 20px;
  border-top: 1px solid #eee;
  background-color: #fff;
}
</style>