<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'send', content: string): void
}>()

const inputContent = ref('')

function handleSend() {
  const content = inputContent.value.trim()
  if (!content) return

  emit('send', content)
  inputContent.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="input-area">
    <textarea
      v-model="inputContent"
      placeholder="输入消息..."
      @keydown="handleKeydown"
      rows="1"
    ></textarea>
    <button @click="handleSend" :disabled="!inputContent.trim()">发送</button>
  </div>
</template>

<style scoped>
.input-area {
  display: flex;
  gap: 10px;
  padding: 16px;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

textarea {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-family: inherit;
  outline: none;
}

textarea:focus {
  border-color: #007bff;
}

button {
  padding: 0 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}
</style>