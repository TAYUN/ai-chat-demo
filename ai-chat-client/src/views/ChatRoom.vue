<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'
import { useChatStore } from '../stores/chat'
import { storeToRefs } from 'pinia'

const chatStore = useChatStore()
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

// 组件销毁时不主动断开连接，保持后台在线
// onUnmounted(() => {
//   chatStore.disconnect()
// })

// 发送消息
const handleSend = (content: string) => {
  chatStore.sendMessage(content)
}
</script>

<template>
  <div class="chat-container">
    <Teleport to="#header-extras">
      <span class="status" :class="{ connected: isConnected }">
        {{ isConnected ? '在线' : '离线' }}
      </span>
      <button @click="chatStore.clearHistory()" class="clear-btn">清除历史</button>
    </Teleport>

    <!-- 错误提示 -->
    <div v-if="error" class="error-banner">
      <span>{{ error }}</span>
      <button @click="chatStore.clearError()" class="close-btn">×</button>
    </div>

    <div class="messages" ref="messagesContainer">
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
  height: 100%; /* 改为 100% 以适应父容器 */
  max-width: 800px;
  margin: 0 auto;
  background-color: #f9f9f9;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  width: 100%; /* 确保在小屏幕上占满宽度 */
}

/* Header 样式已被 Teleport 移走，但需要保留供 Teleport 内容使用 */
/* 注意：Scoped 样式可能无法作用于 Teleport 到外部的元素，除非使用 :deep 或者 全局样式 */
/* 这里我们先移除 .header 相关样式，然后把 status 和 button 样式改为全局或者非 scoped */
</style>

<style>
/* Teleport 内容的样式，不能是 scoped */
.status {
  font-size: 12px;
  color: #999;
}

.status.connected {
  color: #4caf50;
}

.clear-btn {
  margin-left: 10px;
  padding: 4px 8px;
  font-size: 12px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
}

.clear-btn:hover {
  background-color: #e0e0e0;
}
</style>

<style scoped>
/* 错误提示样式保留 */
.error-banner {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  border-bottom: 1px solid #ffcdd2;
}

.close-btn {
  background: none;
  border: none;
  color: #c62828;
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
}

.messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>