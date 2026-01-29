# AI Chat Demo

这是一个全栈 AI 聊天应用演示项目，展示了如何构建现代化的实时 AI 对话系统。项目包含完整的前后端实现，重点演示了流式响应（SSE）和实时多端同步（WebSocket）等核心技术。

## ✨ 功能特性

- **🤖 流式 AI 对话**
  - 使用 **Server-Sent Events (SSE)** 实现打字机效果。
  - 支持 Markdown 渲染和代码高亮。
  - 后端模拟 AI 流式输出（可轻松替换为真实 LLM API）。

- **🔄 实时多端同步**
  - 支持多设备同时登录，消息实时同步。
  - **双重实现演示**：项目中同时包含了两种 WebSocket 实现方案，供学习对比：
    - **Socket.IO**: 功能丰富，内置房间管理、自动重连、心跳机制。
    - **Native WebSocket**: 原生实现，轻量级，展示底层连接管理和鉴权逻辑。

- **🔐 用户系统**
  - 完整的注册/登录流程。
  - 基于 Token 的身份验证（支持 HTTP API 和 WebSocket 鉴权）。

## 🛠️ 技术栈

### 后端 (ai-chat-server)
- **框架**: [AdonisJS 6](https://adonisjs.com/) (Node.js Web 框架)
- **数据库**: MySQL
- **ORM**: Lucid ORM
- **实时通信**: Socket.IO + `ws` (Native WebSocket)
- **语言**: TypeScript

### 前端 (ai-chat-client)
- **框架**: [Vue 3](https://vuejs.org/)
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **UI 组件**: 自定义 CSS (简洁风格)
- **Markdown**: marked + highlight.js

## 🚀 快速开始

### 前置要求
- Node.js >= 20.x
- MySQL 数据库

### 1. 后端设置

进入后端目录：
```bash
cd ai-chat-server
```

安装依赖：
```bash
pnpm install
```

配置环境变量：
复制 `.env.example` 为 `.env`，并配置数据库连接信息。
```bash
cp .env.example .env
```
修改 `.env` 文件：
```ini
PORT=3333
HOST=localhost
APP_KEY=  # 执行 node ace generate:key 生成
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=ai_chat
```

生成 App Key：
```bash
node ace generate:key
```

运行数据库迁移（创建表）：
```bash
node ace migration:run
```

启动开发服务器：
```bash
npm run dev
```
后端将在 `http://localhost:3333` 启动。

### 2. 前端设置

进入前端目录：
```bash
cd ai-chat-client
```

安装依赖：
```bash
npm install
```

启动开发服务器：
```bash
npm run dev
```
前端将在 `http://localhost:5173` 启动（默认代理 `/api` 请求到后端 3333 端口）。

## 📂 项目结构

```
ai-chat/
├── ai-chat-client/      # Vue 3 前端项目
│   ├── src/
│   │   ├── views/       # 页面组件 (SseChat, NativeWsChat 等)
│   │   ├── stores/      # Pinia 状态管理
│   │   └── ...
│   └── ...
│
├── ai-chat-server/      # AdonisJS 后端项目
│   ├── app/
│   │   ├── controllers/ # 控制器 (处理 HTTP 请求)
│   │   ├── services/    # 业务逻辑 (AI服务, WS服务)
│   │   ├── models/      # 数据库模型
│   │   └── ...
│   ├── start/           # 路由和启动文件
│   │   ├── routes.ts    # HTTP 路由定义
│   │   ├── ws.ts        # Socket.IO 启动逻辑
│   │   └── native_ws.ts # 原生 WS 启动逻辑
│   └── ...
└── ...
```

## 📝 核心代码导读

- **SSE 流式响应**: 
  - 后端: `app/controllers/chats_controller.ts` (`stream` 方法)
  - 前端: `src/views/SseChat.vue` (使用 `fetch` + `ReadableStream`)

- **Socket.IO 实现**:
  - 后端: `start/ws.ts`
  - 前端: `src/views/ChatRoom.vue`

- **Native WebSocket 实现**:
  - 后端: `app/services/native_ws.ts`
  - 前端: `src/views/NativeWsChat.vue`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

UNLICENSED
