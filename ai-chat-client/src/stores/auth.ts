import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'

interface User {
  id: number
  email: string
  fullName: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const router = useRouter()

  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const resData = await response.json()

      if (!response.ok || resData.code !== 200) {
        throw new Error(resData.message || '登录失败')
      }

      token.value = resData.data.value
      user.value = resData.data.user

      localStorage.setItem('token', resData.data.value)
      return true
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async function register(fullName: string, email: string, password: string) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })

      const resData = await response.json()

      if (!response.ok || resData.code !== 201) {
        throw new Error(resData.message || '注册失败')
      }

      token.value = resData.data.value
      user.value = resData.data.user

      localStorage.setItem('token', resData.data.value)
      return true
    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }

  async function fetchUser() {
    if (!token.value) return

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData.code === 200) {
          user.value = resData.data
        }
      } else {
        logout()
      }
    } catch (error) {
      logout()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser
  }
})