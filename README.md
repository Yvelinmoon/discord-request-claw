# discord-bot-neta

🦞 Discord Bot for Neta Universe - 龙虾宝宝领取机器人

基于原 Python 项目重构的 Node.js 版本，使用 discord.js v14 实现。

## ✨ 功能特性

- **自动欢迎** - 新用户加入服务器时自动发送私信欢迎消息
- **Modal 表单** - 收集用户信息（捏 Ta 用户名、注册手机号码）
- **飞书集成** - 自动写入飞书多维表格
- **管理员通知** - 实时推送到管理员频道
- **斜杠命令** - `/申请虾宝`

## 📦 安装

```bash
npm install
```

## ⚙️ 配置

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Discord（必填）
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_STAFF_CHANNEL_ID=your_staff_channel_id_here

# Discord（选填）
DISCORD_VERIFIED_ROLE_ID=0
DISCORD_NOTIFY_ROLE_ID=0

# 飞书（选填）
FEISHU_APP_ID=your_feishu_app_id_here
FEISHU_APP_SECRET=your_feishu_app_secret_here
```

### 获取 Discord 配置

1. **Bot Token**: [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → Reset Token
2. **Guild ID**: Discord 中启用开发者模式，右键服务器图标 → 复制服务器 ID
3. **Channel ID**: 右键频道 → 复制频道 ID

### Discord Bot 权限

确保 Bot 有以下权限：

- 发送私信（DM）
- 发送消息到指定频道
- 嵌入链接
- 管理角色（如果需要自动赋予已验证角色）
- 使用斜杠命令

## 🚀 启动

```bash
npm start
```

首次启动时会自动注册斜杠命令。

## 📖 命令

| 命令 | 说明 | 权限 |
|------|------|------|
| `/申请虾宝` | 领取你的龙虾宝宝 | 所有用户 |

## 📊 飞书表格结构

| 列 | 内容 |
|----|------|
| A | 捏 Ta 用户名 |
| B | 注册手机号 |
| C | Discord 用户 |
| D | 提交时间 |

## 🔧 开发

### 手动注册命令

```bash
npm run register
```

### 后台运行

```bash
nohup npm start > bot.log 2>&1 &
```

### 查看日志

```bash
tail -f bot.log
```

## 📁 文件结构

```
discord-bot-neta/
├── listener.js           # 主程序：Discord 事件监听器
├── index.js              # OpenClaw Skill 接口（可选）
├── register-commands.js  # 命令注册脚本
├── package.json          # 依赖配置
├── .env.example          # 环境变量模板
├── .gitignore            # Git 忽略文件
├── README.md             # 本文件
├── QUICKSTART.md         # 快速启动指南
└── SKILL.md              # OpenClaw Skill 文档
```

## 📋 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DISCORD_BOT_TOKEN` | Discord Bot Token | ✅ |
| `DISCORD_GUILD_ID` | 服务器 ID | ✅ |
| `DISCORD_STAFF_CHANNEL_ID` | 管理员通知频道 ID | ❌ |
| `DISCORD_VERIFIED_ROLE_ID` | 已验证角色 ID | ❌ |
| `DISCORD_NOTIFY_ROLE_ID` | 通知角色 ID | ❌ |
| `FEISHU_APP_ID` | 飞书应用 ID | ❌ |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | ❌ |

## 🦞 工作流程

```
新用户加入
    ↓
发送私信欢迎消息 + 按钮
    ↓
用户点击"领取我的龙虾宝宝"
    ↓
弹出 Modal 表单
    ↓
用户提交
    ↓
┌─────────────────────┐
│ 立即回复：成功消息  │
│                     │
│ 后台处理：          │
│ - 写飞书表格        │
│ - 通知管理员        │
│ - 赋予角色          │
└─────────────────────┘
```

## ⚠️ 注意事项

1. **隐私保护** - 表单回复设置为 ephemeral，只有用户自己能看到
2. **异步处理** - 用户提交后立即响应，后台异步处理飞书和通知
3. **权限配置** - 确保 Bot 有发送私信、管理角色等权限
4. **服务器设置** - 确保允许服务器成员发送私信

## 🙏 致谢

- 原 Python 项目作者：[Yvelinmoon](https://github.com/Yvelinmoon/discord-bot-neta)
- 灵感来源：Neta Universe 社区

## 📄 许可证

MIT License
