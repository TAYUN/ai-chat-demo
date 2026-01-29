<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
}>()

const isUser = computed(() => props.role === 'user')

const renderedContent = computed(() => {
  return renderMarkdown(props.content)
})
</script>

<template>
  <div class="message-wrapper" :class="{ 'is-user': isUser }">
    <div class="avatar">
      {{ isUser ? '👤' : '🤖' }}
    </div>
    <div class="message-content">
      <div class="bubble">
        <div class="markdown-body" v-html="renderedContent"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.is-user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-content {
  max-width: 80%;
  overflow-x: hidden;
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  background-color: #f5f5f5;
  color: #333;
  word-break: break-word;
  line-height: 1.6;
}

.is-user .bubble {
  background-color: #007bff;
  color: white;
}

/* Markdown 样式适配 */
:deep(.markdown-body) {
  font-size: 14px;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

:deep(.markdown-body p) {
  margin-bottom: 1em;
}

:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 20px;
  margin-bottom: 1em;
}

:deep(.markdown-body pre) {
  background-color: #282c34; /* Atom One Dark 背景色 */
  color: #abb2bf;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 10px 0;
  font-family: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
}

:deep(.markdown-body code) {
  font-family: 'Fira Code', Consolas, Monaco, 'Courier New', monospace;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}

:deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

:deep(.markdown-body blockquote) {
  border-left: 4px solid #dfe2e5;
  color: #6a737d;
  padding-left: 1em;
  margin: 1em 0;
}

:deep(.markdown-body table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

:deep(.markdown-body th),
:deep(.markdown-body td) {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}

:deep(.markdown-body th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

/* 用户消息中的 Markdown 样式适配 */
.is-user :deep(.markdown-body a) {
  color: #e0e0e0;
  text-decoration: underline;
}

.is-user :deep(.markdown-body pre) {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.is-user :deep(.markdown-body code) {
  background-color: rgba(255, 255, 255, 0.2);
}

.is-user :deep(.markdown-body pre code) {
  background-color: transparent;
}

.is-user :deep(.markdown-body blockquote) {
  border-left-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.8);
}

.is-user :deep(.markdown-body th) {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.is-user :deep(.markdown-body td) {
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
