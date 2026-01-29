<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const fullName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const authStore = useAuthStore()
const router = useRouter()

async function handleRegister() {
  try {
    await authStore.register(fullName.value, email.value, password.value)
    router.push('/')
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = '注册发生未知错误'
    }
  }
}
</script>

<template>
  <div class="auth-container">
    <h2>注册</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label>姓名</label>
        <input v-model="fullName" type="text" required />
      </div>
      <div class="form-group">
        <label>邮箱</label>
        <input v-model="email" type="email" required />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" required />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <button type="submit">注册</button>
    </form>
    <p>
      已有账号？ <router-link to="/login">去登录</router-link>
    </p>
  </div>
</template>

<style scoped>
/* 样式同 Login.vue */
.auth-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

.error {
  color: red;
  margin-bottom: 1rem;
}
</style>