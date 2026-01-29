import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  /**
   * 用户注册
   */
  async register({ request, response }: HttpContext) {
    const payload = request.only(['fullName', 'email', 'password'])

    try {
      const user = await User.create(payload)
      const token = await User.accessTokens.create(user)

      return response.created({
        code: 201,
        message: '注册成功',
        data: {
          type: 'bearer',
          value: token.value!.release(),
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
          },
        },
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return response.conflict({
          code: 409,
          message: '邮箱已被注册',
          data: null,
        })
      }
      return response.badRequest({
        code: 400,
        message: '注册失败',
        data: error,
      })
    }
  }

  /**
   * 用户登录
   */
  async login({ request, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    try {
      const user = await User.verifyCredentials(email, password)
      const token = await User.accessTokens.create(user)

      return response.ok({
        code: 200,
        message: '登录成功',
        data: {
          type: 'bearer',
          value: token.value!.release(),
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
          },
        },
      })
    } catch (error) {
      return response.unauthorized({
        code: 401,
        message: '邮箱或密码错误',
        data: null,
      })
    }
  }

  /**
   * 获取当前用户信息
   */
  async me({ auth, response }: HttpContext) {
    await auth.check()
    return response.ok({
      code: 200,
      message: '获取用户信息成功',
      data: auth.user,
    })
  }

  /**
   * 退出登录
   */
  async logout({ auth, response }: HttpContext) {
    const user = auth.user!
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return response.ok({
      code: 200,
      message: '已退出登录',
      data: null,
    })
  }
}
