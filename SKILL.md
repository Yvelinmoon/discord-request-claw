---
name: neta-lobster-claim
description: Neta 龙虾虾宝领取 - 新用户加入 Discord 服务器时自动弹出表单，收集 Neta 用户名和电话，写入飞书表格并通知管理员
---

# Neta 龙虾虾宝领取

基于原 Python 项目 [discord-bot-neta](https://github.com/Yvelinmoon/discord-bot-neta) 重构的 Discord Bot。

## 功能

新用户加入 Discord 服务器时自动私信欢迎消息和表单，收集 Neta 用户名和联系电话，写入飞书多维表格，并通知管理员频道。

## 前置条件

### 环境变量配置

```bash
# Discord（必填）
export DISCORD_BOT_TOKEN="你的 Bot Token"
export DISCORD_GUILD_ID="你的服务器 ID"

# Discord（选填）
export DISCORD_STAFF_CHANNEL_ID="管理员通知频道 ID"  # 不填则跳过通知
export DISCORD_VERIFIED_ROLE_ID="0"      # 已验证用户角色 ID
export DISCORD_NOTIFY_ROLE_ID="0"        # 通知提醒角色 ID

# 飞书（选填，不配置则跳过飞书记录）
export FEISHU_APP_ID="你的飞书应用 ID"
export FEISHU_APP_SECRET="你的飞书应用密钥"
# 飞书表格 Token 已内置：IXTZsYDNxhctlMt9oGZcu6wAnWb
```

### Discord Bot 权限

确保 Bot 有以下权限：

- 发送私信（DM）
- 发送消息到指定频道
- 嵌入链接
- 管理角色（如果需要自动赋予已验证角色）

### Discord 服务器设置

1. 启用 **Message Content Intent**
2. 启用 **Server Members Intent**（用于监听成员加入）
3. 允许服务器成员发送私信：服务器设置 → 隐私设置 → 开启"直接消息"

## 触发条件

| 事件 | 触发方式 | 说明 |
|------|---------|------|
| 新用户加入 | 自动 | 监听 `member_join` 事件，自动私信欢迎消息 |
| 用户点击按钮 | 自动 | 点击"🦞 领取我的虾宝"按钮打开表单 |
| `/申请虾宝` 命令 | 手动 | 任何用户可用，直接打开表单 |

## 功能流程

```
新用户加入服务器
       ↓
自动发送私信欢迎消息 + 按钮
       ↓
用户点击"🦞 领取我的虾宝"
       ↓
弹出 Modal 表单
  - Neta 用户名（必填，≤50 字）
  - 联系电话（必填，≤20 字）
       ↓
用户提交表单
       ↓
┌──────────────────────────────┐
│ 1. 立即回复用户（ephemeral）：│
│    "🦞 虾宝领取成功！"       │
│                              │
│ 2. 后台异步处理：            │
│    - 写入飞书表格            │
│    - 通知管理员频道（可选）  │
│    - 赋予已验证角色（可选）  │
└──────────────────────────────┘
```

## 使用方法

### 自动触发（推荐）

新用户加入服务器时自动触发，无需手动操作。

### 手动触发

**用户命令**：
```
/申请虾宝
```

## 飞书表格结构

写入飞书多维表格的列：

| 列 A | 列 B | 列 C | 列 D |
|------|------|------|------|
| Neta 用户名 | 联系电话 | Discord 用户 | 提交时间 |
| xxx | 138xxxx | user#1234 | 2026-03-09 04:00 |

## 管理员通知示例

发送到 `STAFF_CHANNEL_ID` 频道的消息（如配置）：

```
@管理员角色 新虾宝领取待跟进

🦞 新虾宝领取记录
Discord 用户：@user
Neta 用户名：xxx
联系电话：138xxxx
用户 ID: 123456789
```

## 配置项说明

| 配置项 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `DISCORD_BOT_TOKEN` | Discord Bot Token | ✅ | - |
| `DISCORD_GUILD_ID` | Discord 服务器 ID | ✅ | - |
| `DISCORD_STAFF_CHANNEL_ID` | 管理员通知频道 ID | ❌ | 不填则跳过 |
| `DISCORD_VERIFIED_ROLE_ID` | 已验证用户角色 ID | ❌ | 0 |
| `DISCORD_NOTIFY_ROLE_ID` | 通知提醒角色 ID | ❌ | 0 |
| `FEISHU_APP_ID` | 飞书应用 ID | ❌ | "" |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | ❌ | "" |
| `FEISHU_SPREADSHEET_TOKEN` | 飞书表格 Token | ❌ | `IXTZsYDNxhctlMt9oGZcu6wAnWb` |

## 错误处理

### 飞书 API 失败
- 如果飞书凭证未配置，跳过写入，不影响主流程
- 如果飞书 API 调用失败，记录日志，不影响用户响应

### Discord API 失败
- 如果用户关闭私信，记录日志（可手动发送到欢迎频道）
- 如果赋予角色失败，记录日志，不影响其他流程

### 表单重复提交
- 使用 `_submittedUsers` 集合防止同一用户重复提交
- 使用 `_seenInteractions` 集合防止同一 interaction 触发两次
- 自动清理超过 500 条的旧记录，防止内存泄漏

## 隐私保护

- 表单回复设置为 `ephemeral=true`，只有用户自己能看到
- 异步处理：用户提交后立即响应，飞书写入和通知在后台执行
- 管理员通知包含用户敏感信息（QQ 号），建议谨慎配置通知频道

## 测试步骤

1. **配置环境变量**
   ```bash
   export DISCORD_BOT_TOKEN="你的 Token"
   export DISCORD_GUILD_ID="你的服务器 ID"
   ```

2. **安装依赖并启动**
   ```bash
   pnpm install
   node listener.js
   ```

3. **测试命令**
   - 在 Discord 中发送 `/申请虾宝`
   - 点击按钮打开表单
   - 填写信息并提交
   - 检查飞书表格是否收到数据

4. **测试新用户加入**
   - 邀请新账号加入服务器
   - 检查是否收到私信欢迎消息

## 注意事项

1. **权限配置** - 确保 Bot 有"发送私信"、"管理角色"、"发送消息"权限
2. **飞书权限** - 确保飞书应用有"多维表格"的写入权限
3. **服务器设置** - 确保允许服务器成员发送私信
4. **角色 ID** - 如果需要自动赋予角色，确保 Bot 有"管理角色"权限且角色层级低于 Bot
5. **重复提交保护** - 用户提交后无法再次提交，重启 Bot 后重置

## 迁移指南

从原 Python `discord-bot-neta` 项目迁移：

1. 复制环境变量配置
2. 复制飞书凭证
3. 复制服务器 ID、频道 ID、角色 ID
4. 停止原 Python Bot
5. 启动此 Bot

## 文件结构

```
neta-lobster-claim/
├── listener.js          # 主程序（Discord 事件监听）
├── register-commands.js # 斜杠命令注册脚本
├── SKILL.md             # 本文档
├── .env                 # 环境变量配置
├── .env.example         # 环境变量示例
├── package.json         # 依赖配置
└── refs/
    ├── feishu-api.md    # 飞书 API 参考
    └── implementation.md # 实现细节
```

## 部署方式

### 方式一：直接运行（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/Yvelinmoon/discord-request-claw.git
cd discord-request-claw

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入必要配置

# 4. 注册斜杠命令（首次部署时执行）
node register-commands.js

# 5. 启动 Bot
node listener.js
```

### 方式二：PM2 守护进程

```bash
# 安装 PM2
pnpm install -g pm2

# 启动
pm2 start listener.js --name neta-lobster

# 开机自启
pm2 save
pm2 startup
```

### 方式三：Docker

```bash
docker run -d \
  --name neta-lobster \
  -e DISCORD_BOT_TOKEN=xxx \
  -e DISCORD_GUILD_ID=xxx \
  -e FEISHU_APP_ID=xxx \
  -e FEISHU_APP_SECRET=xxx \
  yvelinmoon/discord-request-claw:latest
```

## 独立部署说明

**本项目是独立的 Discord Bot，不需要 OpenClaw 环境。**

可以直接在任何 Node.js 环境中部署：
- 本地服务器
- VPS（如 AWS、DigitalOcean）
- 容器平台（如 Railway、Render）
- Serverless（如 Vercel、Cloudflare Workers，需调整代码）

**依赖：**
- Node.js 18+
- discord.js 14.x
- dotenv

**无需：**
- OpenClaw Gateway
- OpenClaw Skill 框架
- 其他外部服务（飞书可选）

## 开发者

- 原项目：https://github.com/Yvelinmoon/discord-bot-neta
- 重构版本：https://github.com/Yvelinmoon/discord-request-claw
