# 部署文档

本文档详细说明了 AI Chat 项目的部署流程，基于 Docker 和 Docker Compose 进行容器化部署。

## 1. 服务器要求

### 软件依赖
- **Docker Engine**: 版本 >= 20.10
- **Docker Compose**: 版本 >= 2.0.0 (推荐使用 Docker Desktop 或插件版 `docker compose`)

## 2. 环境变量配置

在项目根目录下（`docker-compose.yml` 同级目录），创建或修改 `.env` 文件。此文件控制数据库连接和应用安全配置。

**`.env` 文件示例:**

```ini
# --- 数据库配置 ---
# 数据库用户名 (自定义)
DB_USER=ai_chat_user
# 数据库密码 (生产环境请使用强密码)
DB_PASSWORD=SecurePassword123!
# 数据库名称
DB_DATABASE=ai_chat_db
# 数据库 Root 密码 (用于初始化)
MYSQL_ROOT_PASSWORD=RootSecretPassword!

# --- 应用配置 ---
# 应用密钥 (用于加密 session 等，生产环境必须修改为随机长字符串)
APP_KEY=zT9f8s7d6f5g4h3j2k1l0m9n8b7v6c5x
# 外部访问端口 (Nginx 监听端口，默认 80)
APP_PORT=80

# --- 可选配置 (通常不需要修改) ---
# 后端运行环境
NODE_ENV=production
# 日志级别
LOG_LEVEL=info
```

> **注意**: `DB_HOST` 和 `DB_PORT` 在 `docker-compose.yml` 中已自动配置为容器内部网络别名 (`db`) 和端口，无需在 `.env` 中手动设置，除非你需要修改默认行为。

## 3. 构建步骤

### 3.1 获取代码
**方式 A: Git (推荐)**
在服务器上直接克隆仓库：
```bash
git clone <repository_url> ai-chat
cd ai-chat
```

**方式 B: 上传压缩包**
如果你从本地上传代码，请**务必排除** `node_modules` 目录。
1. 本地打包：`zip -r deploy.zip . -x "**/node_modules/*" "**/.git/*" "**/dist/*" "**/build/*"`
2. 上传 `deploy.zip` 到服务器。
3. 解压：`unzip deploy.zip -d ai-chat && cd ai-chat`

### 3.2 目录结构确认
部署前的目录结构应如下所示：
```text
ai-chat/
├── ai-chat-client/      # 前端代码
├── ai-chat-server/      # 后端代码
├── docker-compose.yml   # 编排文件
└── .env                 # 环境变量文件
```

### 3.3 构建镜像
在项目根目录下运行：
```bash
# 构建并启动所有服务 (-d 表示后台运行)
docker-compose up -d --build
```
*或者使用新版命令:*
```bash
docker compose up -d --build
```

构建过程说明：
1. **Database**: 拉取 MySQL 8.0 镜像。
2. **Server**: 
   - 基于 `node:22-alpine`。
   - 安装依赖并运行 `node ace build` 编译 TypeScript。
   - 自动运行数据库迁移 (`migration:run`)。
3. **Client**: 
   - 基于 `node:22-alpine` 构建 Vue 项目 (`pnpm run build-only`)。
   - 结果复制到 `nginx:alpine` 镜像中，并应用自定义 `nginx.conf`。

## 4. 启动命令

### 常用管理命令

| 操作 | 命令 | 说明 |
|------|------|------|
| **启动/更新** | `docker-compose up -d --build` | 构建镜像并后台启动，配置变更后需执行 |
| **停止服务** | `docker-compose down` | 停止并移除容器和网络 |
| **查看状态** | `docker-compose ps` | 查看容器运行状态 |
| **查看日志** | `docker-compose logs -f` | 实时查看所有服务日志 |
| **重启服务** | `docker-compose restart` | 重启所有容器 |

### 验证部署
1. 检查容器状态：
   ```bash
   docker-compose ps
   ```
   应看到 `ai-chat-db`, `ai-chat-server`, `ai-chat-client` 状态均为 `Up`。

2. 访问应用：
   浏览器访问 `http://<服务器IP>:<APP_PORT>` (默认端口 80)。

## 5. 常见问题 (FAQ)

### Q1: 端口冲突 (Address already in use)
**现象**: 启动时提示 `Bind for 0.0.0.0:80 failed: port is already allocated`。
**解决**: 
1. 检查服务器上是否已有 Nginx 或 Apache 占用 80 端口。
2. 修改 `.env` 中的 `APP_PORT` 为其他端口（如 8080）。
3. 重新运行 `docker-compose up -d`。

### Q2: 数据库连接失败 (ECONNREFUSED)
**现象**: 后端日志显示无法连接到数据库。
**解决**:
1. 确保 `ai-chat-db` 容器已启动且健康 (`Status: healthy`)。
2. 检查 `.env` 中的 `DB_PASSWORD` 是否与之前初始化的密码一致。
3. 如果修改了数据库密码，可能需要删除旧的数据库卷数据：`docker volume rm ai-chat_db_data` (警告：会丢失数据)。

### Q3: WebSocket/SSE 无法连接
**现象**: 聊天功能无法收发消息，控制台报错 WebSocket 连接失败。
**解决**:
1. 确保 Nginx 配置 (`ai-chat-client/nginx.conf`) 正确代理了 `/socket.io/` 和 `/ws` 路径。
2. 检查服务器防火墙是否放行了相应端口。
3. 确保客户端连接地址正确（通常通过 `/api` 或相对路径连接）。

### Q4: 权限问题 (EACCES)
**现象**: 容器内报错无权限读写文件。
**解决**:
通常 Docker 容器内使用 root 或特定用户运行。如果遇到挂载卷的权限问题，尝试：
```bash
# 赋予数据库卷目录权限 (如果映射到了宿主机路径)
chmod -R 755 ./mysql_data
```
本项目默认使用 Docker 命名卷 (`db_data`)，通常不会出现此问题。
