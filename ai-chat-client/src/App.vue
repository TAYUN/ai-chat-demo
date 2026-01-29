<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <nav class="nav-bar">
      <div class="nav-links">
        <RouterLink to="/" active-class="active">Socket.IO</RouterLink>
        <RouterLink to="/ws-native" active-class="active">原生 WebSocket</RouterLink>
        <RouterLink to="/sse" active-class="active">SSE</RouterLink>
        <RouterLink to="/sse/standard" active-class="active">标准 SSE</RouterLink>
      </div>
      <div id="header-extras"></div>
    </nav>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
}

/* 全局样式重置 */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  /* 防止 body 滚动 */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f5f7fb;
}

#app {
  height: 100%;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.nav-bar {
  flex-shrink: 0;
  /* 防止导航栏被压缩 */
  display: flex;
  justify-content: space-between;
  /* 两端对齐 */
  align-items: center;
  gap: 20px;
  padding: 10px 20px;
  /* 增加左右内边距 */
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 10;
  /* 确保导航栏在最上层 */
  height: 50px;
  /* 固定高度 */
  box-sizing: border-box;
}

.nav-links {
  display: flex;
  gap: 20px;
}

#header-extras {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-content {
  flex: 1;
  overflow: hidden;
  /* 让子路由决定滚动 */
  position: relative;
  display: flex;
  flex-direction: column;
}

.nav-bar a {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 4px;
}

.nav-bar a.active {
  color: #007bff;
  background-color: #e6f2ff;
}
</style>
