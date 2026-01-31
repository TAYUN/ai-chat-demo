FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括开发依赖）
RUN npm install -g pnpm && pnpm install

# 复制源代码
COPY . .

# 构建应用
RUN node ace build

# --- 生产环境镜像 ---
FROM node:22-alpine

WORKDIR /app

# 复制构建产物
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# 进入 build 目录（AdonisJS 构建后的入口）
WORKDIR /app/build

# 安装生产依赖
RUN npm install -g pnpm && pnpm install --prod

# 暴露端口
EXPOSE 3333

# 启动命令
CMD ["node", "bin/server.js"]
