# Neta 龙虾素体领取 - 快速启动指南

## 🚀 5 分钟快速部署

### 步骤 1: 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cd /home/node/.openclaw/workspace/skills/neta-lobster-claim
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# Discord（必填）
DISCORD_BOT_TOKEN=你的 Bot Token
DISCORD_GUILD_ID=你的服务器 ID
DISCORD_STAFF_CHANNEL_ID=管理员通知频道 ID

# Discord（选填）
DISCORD_VERIFIED_ROLE_ID=0
DISCORD_NOTIFY_ROLE_ID=0

# 飞书（选填）
FEISHU_APP_ID=你的飞书应用 ID
FEISHU_APP_SECRET=你的飞书应用密钥
```

### 步骤 2: 获取 Discord Bot Token

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 创建新应用或选择现有应用
3. 点击 **Bot** → **Reset Token** → 复制 Token
4. 启用 **Message Content Intent** 和 **Server Members Intent**

### 步骤 3: 邀请 Bot 到服务器

生成邀请链接：
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025392640&scope=bot%20applications.commands
```

替换 `YOUR_CLIENT_ID` 为你的 Bot Client ID。

### 步骤 4: 安装依赖

```bash
npm install
```

### 步骤 5: 启动监听器

```bash
npm start
```

或者后台运行：
```bash
nohup npm start > bot.log 2>&1 &
```

### 步骤 6: 测试

1. 在 Discord 中发送 `/发送表单`（需要管理员权限）
2. 点击按钮打开表单
3. 填写信息并提交
4. 检查管理员频道是否收到通知

## 📋 获取服务器和频道 ID

1. 在 Discord 中启用 **开发者模式**：
   - 用户设置 → 高级 → 开发者模式

2. 获取服务器 ID：
   - 右键点击服务器图标 → 复制服务器 ID

3. 获取频道 ID：
   - 右键点击频道 → 复制频道 ID

4. 获取角色 ID（如果需要）：
   - 服务器设置 → 角色 → 右键点击角色 → 复制角色 ID

## 🔧 故障排查

### Bot 无法发送私信

确保服务器允许私信：
- 服务器设置 → 隐私设置 → 开启"直接消息"

### 命令不显示

等待几分钟让 Discord 同步命令，或重启 Bot。

### 飞书写入失败

检查飞书应用权限：
- 访问 https://open.feishu.cn/app
- 确保应用有"多维表格"权限

## 📊 监控日志

```bash
# 查看实时日志
tail -f bot.log

# 查看错误
grep ERROR bot.log
```

## 🛑 停止 Bot

```bash
# 找到进程 ID
ps aux | grep listener.js

# 停止进程
kill <PID>
```

## 📖 完整文档

查看 [SKILL.md](./SKILL.md) 了解更多配置选项和高级功能。
