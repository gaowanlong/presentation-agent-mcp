# ChatGPT 连接指南

## 三种配置方式

---

### 1. Local MCP client config（本地客户端）

适用于 **Claude Desktop / Cursor / MCP Inspector** 等本地 MCP 客户端。  
MCP Server 通过 stdio 或本地 SSE 与客户端通信。

#### 1a. stdio 模式（推荐用于 Claude Desktop）

```json
{
  "mcpServers": {
    "presentation-agent": {
      "command": "npx",
      "args": [
        "tsx",
        "/absolute/path/to/presentation-agent-mcp/src/index.ts"
      ],
      "env": {
        "LLM_PROVIDER": "rule-based"
      }
    }
  }
}
```

#### 1b. Remote SSE 模式（推荐用于 Cursor / Inspector）

先启动 Server：

```bash
cd presentation-agent-mcp
npm start -- --remote
```

Clients see:

```
Health:    http://localhost:3000/health
MCP SSE:   http://localhost:3000/sse
Artifacts: http://localhost:3000/artifacts/:artifact_id
```

Cursor / MCP Inspector 配置：

```json
{
  "mcpServers": {
    "presentation-agent": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

验证启动：

```bash
curl http://localhost:3000/health
# → {"status":"ok","version":"0.6.0","provider":"presentation-agent-mcp","remote":true,"uptime":12.34}
```

---

### 2. ChatGPT Developer Mode

ChatGPT Developer Mode 要求 MCP Server 拥有 **公网可访问的 HTTPS URL**。  
localhost 不满足要求，必须通过隧道或部署暴露到公网。

#### 2a. 通过隧道暴露本地 Server（开发/测试）

使用 [ngrok](https://ngrok.com) 或 [bore](https://github.com/ekzhang/bore) 将本地端口暴露到公网：

```bash
# 先启动 remote MCP server
npm start -- --remote

# 新开终端，创建隧道
ngrok http 3000
# → https://xxxx-xxx-xxx-xxx.ngrok-free.app
```

ChatGPT 配置：

```json
{
  "mcpServers": {
    "presentation-agent": {
      "url": "https://xxxx-xxx-xxx-xxx.ngrok-free.app/sse"
    }
  }
}
```

**注意：**
- ngrok 免费版域名每次重启会变化，不适合长期使用
- 务必启用 Bearer Token 防止未授权访问：

```bash
AUTH_TOKEN=sk-my-secret-token npm start -- --remote
```

#### 2b. 直接使用公网部署（推荐）

参照下方 Production 部署，将 Server 部署到 Render / Fly.io 等平台，然后将公网 URL 填入 ChatGPT。

#### ChatGPT 配置总结

```json
{
  "mcpServers": {
    "presentation-agent": {
      "description": "Presentation Agent — generate and export PPT/PDF presentations",
      "url": "https://your-app.onrender.com/sse"
    }
  }
}
```

---

### 3. Production（生产部署）

#### 3a. Render

1. Fork 或 Push 到 GitHub
2. Render Dashboard → New → Web Service
3. **Build Command**: `npm install`
4. **Start Command**: `npx tsx src/index.ts --remote`
5. **Environment Variables**:

| Variable | Value |
|----------|-------|
| `REMOTE_MCP` | `true` |
| `MCP_PORT` | `10000` (Render 自动分配) |
| `LLM_PROVIDER` | `rule-based` |
| `AUTH_TOKEN` | `sk-your-secret-token` |

#### 3b. Fly.io

```dockerfile
# Dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts", "--remote"]
```

```bash
fly launch
fly secrets set AUTH_TOKEN=sk-your-secret-token
fly deploy
```

#### 3c. Railway

- **Build**: `npm install`
- **Start**: `npx tsx src/index.ts --remote`
- **Variables**: `REMOTE_MCP=true`, `AUTH_TOKEN=...`

#### 3d. VPS（手动部署）

```bash
# 使用 pm2 管理进程
npm install -g pm2
pm2 start npm --name "presentation-agent" -- start -- --remote
pm2 save
pm2 startup

# 使用 nginx 反向代理 + HTTPS
```

```nginx
# /etc/nginx/sites-available/presentation-agent
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
    }
}
```

---

## Remote Server 启动输出参考

```text
[Remote MCP v0.6] Server running on http://localhost:3000
  Health:    http://localhost:3000/health
  MCP SSE:   http://localhost:3000/sse
  POST:      http://localhost:3000/
  Artifacts: http://localhost:3000/artifacts/:artifact_id
For ChatGPT, expose this server via HTTPS tunnel or deploy to production.
```

---

## 安全注意事项

| 场景 | 建议 |
|------|------|
| Local (stdio) | 无需额外安全措施 |
| Local (SSE, localhost only) | 默认安全，仅本机访问 |
| 隧道 (ngrok/bore) | **必须** 设置 `AUTH_TOKEN` |
| 公网部署 | **必须** 设置 `AUTH_TOKEN`，建议使用 HTTPS |
| 生产环境 | 建议在 nginx/reverse proxy 层做速率限制 |

设置 Bearer Token：

```bash
AUTH_TOKEN=sk-your-secret-token npm start -- --remote
```

ChatGPT 或其他客户端通过 `Authorization: Bearer sk-your-secret-token` 头验证。

---

## 快速决策表

| 你的场景 | 推荐方式 | 文档章节 |
|----------|----------|----------|
| 本地 Claude Desktop | stdio + `mcpServers.command` | 1a |
| 本地 Cursor / Inspector | localhost SSE | 1b |
| 测试 ChatGPT 集成 | ngrok + Bearer Token | 2a |
| 生产 ChatGPT 集成 | Render / Fly.io 部署 | 3a-3c |
| 自建服务器 | VPS + nginx + pm2 | 3d |
