/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

const ChatsController = () => import('#controllers/chats_controller')
const AuthController = () => import('#controllers/auth_controller')
const StandardSseController = () => import('#controllers/standard_sse_controller')

router
  .group(() => {
    // 认证路由
    router.post('/auth/register', [AuthController, 'register'])
    router.post('/auth/login', [AuthController, 'login'])

    // 标准 SSE 路由 (手动鉴权，不经过 auth 中间件)
    router.get('/sse/standard', [StandardSseController, 'chat'])

    // 需要登录的路由
    router
      .group(() => {
        router.get('/auth/me', [AuthController, 'me'])
        router.post('/auth/logout', [AuthController, 'logout'])

        router.get('/messages', [ChatsController, 'index'])
        router.post('/messages', [ChatsController, 'store'])
        router.delete('/messages', [ChatsController, 'destroy'])
        router.get('/stream', [ChatsController, 'stream'])
      })
      .use(middleware.auth())
  })
  .prefix('api')
