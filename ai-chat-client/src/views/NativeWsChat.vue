<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'
import { useNativeChatStore } from '../stores/nativeChat'
import { storeToRefs } from 'pinia'

const chatStore = useNativeChatStore()
const { messages, isConnected, error } = storeToRefs(chatStore)
const messagesContainer = ref<HTMLElement | null>(null)

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 监听消息变化，自动滚动
watch(
  () => messages.value.length,
  () => {
    scrollToBottom()
  }
)

// 监听最后一条消息的内容变化（针对流式输出），自动滚动
watch(
  () => {
    const lastMsg = messages.value[messages.value.length - 1]
    return lastMsg ? lastMsg.content.length : 0
  },
  () => {
    scrollToBottom()
  }
)

onMounted(() => {
  chatStore.fetchHistory()
  chatStore.connect()
  scrollToBottom()
})

// 组件销毁时断开连接
onUnmounted(() => {
  chatStore.disconnect()
})

// 发送消息
const handleSend = (content: string) => {
  chatStore.sendMessage(content)
}
</script>

<template>
  <div class="chat-container">
    <Teleport to="#header-extras">
      <span class="status" :class="{ connected: isConnected }">
        {{ isConnected ? '🟢 原生WS在线' : '🔴 原生WS离线' }}
      </span>
      <button @click="chatStore.clearHistory()" class="clear-btn">清除历史</button>
    </Teleport>

    <!-- 错误提示 -->
    <div v-if="error" class="error-banner">
      <span>{{ error }}</span>
      <button @click="chatStore.clearError()" class="close-btn">×</button>
    </div>

    <div class="messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-tip">
        暂无消息，发送一条消息开始对话吧～
      </div>
      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :role="msg.role"
        :content="msg.content"
      />
    </div>

    <ChatInput @send="handleSend" />
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  background-color: #f9f9f9;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.status {
  font-size: 12px;
  color: #dc3545;
  margin-right: 12px;
  font-weight: 500;
}

.status.connected {
  color: #28a745;
}

.clear-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #dc3545;
  background: white;
  color: #dc3545;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #dc3545;
  color: white;
}

.error-banner {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #721c24;
  padding: 0 4px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #fff;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px;
  font-size: 14px;
}
</style>
