---
name: neta-lobster-claim
description: Neta 龙虾素体领取 - 新用户加入 Discord 服务器时自动弹出表单，收集 Neta 用户名和电话，写入飞书表格并通知管理员
---

# Neta 龙虾素体领取 Skill

基于原 Python 项目 [discord-bot-neta](https://github.com/Yvelinmoon/discord-bot-neta) 重构的 OpenClaw Skill。

## 功能

新用户加入 Discord 服务器时自动私信欢迎消息和表单，收集 Neta 用户名和联系电话，写入飞书多维表格，并通知管理员频道。

## 前置条件

### 环境变量配置

在 OpenClaw 环境中设置以下变量：

```bash
# Discord（必填）
export DISCORD_GUILD_ID="你的服务器 ID"
export DISCORD_STAFF_CHANNEL_ID="管理员通知频道 ID"

# Discord（选填）
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
| 用户点击按钮 | 自动 | 点击"🦞 领取我的龙虾素体"按钮打开表单 |
| `/领取素体` 命令 | 手动 | 任何用户可用，直接打开表单 |
| `/发送表单` 命令 | 手动 | 仅管理员，测试用 |

## 功能流程

```
新用户加入服务器
       ↓
自动发送私信欢迎消息 + 按钮
       ↓
用户点击"🦞 领取我的龙虾素体"
       ↓
弹出 Modal 表单
  - Neta 用户名（必填，≤50 字）
  - 联系电话（必填，≤20 字）
       ↓
用户提交表单
       ↓
┌──────────────────────────────┐
│ 1. 立即回复用户（ephemeral）：│
│    "🦞 素体领取成功！"       │
│                              │
│ 2. 后台异步处理：            │
│    - 写入飞书表格            │
│    - 通知管理员频道          │
│    - 赋予已验证角色（可选）  │
└──────────────────────────────┘
```

## 使用方法

### 自动触发（推荐）

新用户加入服务器时自动触发，无需手动操作。

### 手动触发

**用户命令**：
```
/领取素体
```

**管理员测试**：
```
/发送表单
```

## 飞书表格结构

写入飞书多维表格的列：

| 列 A | 列 B | 列 C | 列 D |
|------|------|------|------|
| Neta 用户名 | 联系电话 | Discord 用户 | 提交时间 |
| xxx | 138xxxx | user#1234 | 2026-03-09 04:00 |

## 管理员通知示例

发送到 `STAFF_CHANNEL_ID` 频道的消息：

```
@管理员角色 新素体领取待跟进

🦞 新素体领取记录
Discord 用户：@user
Neta 用户名：xxx
联系电话：138xxxx
用户 ID: 123456789
```

## 配置项说明

| 配置项 | 说明 | 必填 | 默认值 |
|--------|------|------|--------|
| `DISCORD_GUILD_ID` | Discord 服务器 ID | ✅ | - |
| `DISCORD_STAFF_CHANNEL_ID` | 管理员通知频道 ID | ✅ | - |
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
- 使用 `_seenInteractions` 集合防止同一 interaction 触发两次
- 自动清理超过 500 条的旧记录，防止内存泄漏

## 隐私保护

- 表单回复设置为 `ephemeral=true`，只有用户自己能看到
- 异步处理：用户提交后立即响应，飞书写入和通知在后台执行

## 测试步骤

1. **配置环境变量**
   ```bash
   export DISCORD_GUILD_ID="你的服务器 ID"
   export DISCORD_STAFF_CHANNEL_ID="管理员频道 ID"
   ```

2. **重启 OpenClaw Gateway**
   ```bash
   openclaw gateway restart
   ```

3. **测试命令**
   - 在 Discord 中发送 `/发送表单`（需要管理员权限）
   - 点击按钮打开表单
   - 填写信息并提交
   - 检查管理员频道是否收到通知

4. **测试新用户加入**
   - 邀请新账号加入服务器
   - 检查是否收到私信欢迎消息

## 注意事项

1. **权限配置** - 确保 Bot 有"发送私信"、"管理角色"、"发送消息"权限
2. **飞书权限** - 确保飞书应用有"多维表格"的写入权限
3. **服务器设置** - 确保允许服务器成员发送私信
4. **角色 ID** - 如果需要自动赋予角色，确保 Bot 有"管理角色"权限且角色层级低于 Bot

## 迁移指南

从原 Python `discord-bot-neta` 项目迁移：

1. 复制环境变量配置
2. 复制飞书凭证
3. 复制服务器 ID、频道 ID、角色 ID
4. 停止原 Python Bot
5. 启用此 OpenClaw Skill

## 文件结构

```
skills/neta-lobster-claim/
├── index.js           # 主技能实现
├── SKILL.md           # 技能文档
├── refs/
│   ├── feishu-api.md  # 飞书 API 参考
│   └── implementation.md  # 实现细节
└── src/               # （可选）额外源代码
```

## 开发者

- 原项目：https://github.com/Yvelinmoon/discord-bot-neta
- Skill 重构：OpenClaw Skill 版本
