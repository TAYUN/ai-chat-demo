import { createRouter, createWebHistory } from 'vue-router'
import ChatRoom from '../views/ChatRoom.vue'
import Login from '../views/LoginView.vue'
import Register from '../views/RegisterView.vue'
import { useAuthStore } from '../stores/auth'
import SSEChat from '../views/SseChat.vue'
import NativeWsChat from '../views/NativeWsChat.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ChatRoom,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/sse',
      name: 'sse',
      component: SSEChat,
    },
    {
      path: '/sse/standard',
      name: 'sse-standard',
      component: () => import('../views/StandardSseChat.vue'),
    },
    {
      path: '/ws-native',
      name: 'native-ws',
      component: NativeWsChat,
      meta: { requiresAuth: true }
    },
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 尝试恢复用户状态
  if (!authStore.user && authStore.token) {
    await authStore.fetchUser()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router