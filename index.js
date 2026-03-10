/**
 * Neta 龙虾素体领取 Skill
 * 
 * 基于原 Python 项目 discord-bot-neta 重构
 * 新用户加入 Discord 时自动弹出表单，收集 Neta 用户名和电话，写入飞书表格并通知管理员
 */

const { message } = require('openclaw/tools');

// ─── Config ───────────────────────────────────────────────────────────
const CONFIG = {
  // Discord
  GUILD_ID: process.env.DISCORD_GUILD_ID,
  STAFF_CHANNEL_ID: process.env.DISCORD_STAFF_CHANNEL_ID,
  VERIFIED_ROLE_ID: process.env.DISCORD_VERIFIED_ROLE_ID || '0',
  NOTIFY_ROLE_ID: process.env.DISCORD_NOTIFY_ROLE_ID || '0',
  
  // 飞书
  FEISHU_APP_ID: process.env.FEISHU_APP_ID || '',
  FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET || '',
  FEISHU_SPREADSHEET_TOKEN: 'IXTZsYDNxhctlMt9oGZcu6wAnWb',
};

// 防止重复处理
const _seenInteractions = new Set();
const MAX_SEEN_SIZE = 500;

// ─── Helpers ──────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Feishu API ───────────────────────────────────────────────────────
async function getFeishuTenantToken() {
  if (!CONFIG.FEISHU_APP_ID || !CONFIG.FEISHU_APP_SECRET) {
    console.log('[飞书] 未配置凭证，跳过');
    return null;
  }
  
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: CONFIG.FEISHU_APP_ID,
        app_secret: CONFIG.FEISHU_APP_SECRET,
      }),
    });
    
    const auth = await response.json();
    if (auth.code !== 0) {
      console.error('[飞书] 鉴权失败:', auth);
      return null;
    }
    
    return auth.tenant_access_token;
  } catch (e) {
    console.error('[飞书] 获取 token 异常:', e);
    return null;
  }
}

async function getSheetId(token) {
  try {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${CONFIG.FEISHU_SPREADSHEET_TOKEN}/metainfo`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const sheetsInfo = await response.json();
    console.log('[飞书] 表格信息:', sheetsInfo);
    
    const sheets = sheetsInfo.data?.sheets || [];
    if (!sheets.length) {
      console.error('[飞书] 无法获取 sheet 列表');
      return null;
    }
    
    return sheets[0].sheetId;
  } catch (e) {
    console.error('[飞书] 获取 sheetId 异常:', e);
    return null;
  }
}

async function feishuAddRecord(netaUsername, phone, discordUsername) {
  const token = await getFeishuTenantToken();
  if (!token) return;
  
  const sheetId = await getSheetId(token);
  if (!sheetId) return;
  
  try {
    const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${CONFIG.FEISHU_SPREADSHEET_TOKEN}/values_append?insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueRange: {
          range: `${sheetId}!A:D`,
          values: [[
            netaUsername,
            phone,
            discordUsername,
            new Date().toISOString().slice(0, 19).replace('T', ' '),
          ]],
        },
      }),
    });
    
    const result = await response.json();
    if (result.code !== 0) {
      console.error('[飞书] 写入失败:', result);
    } else {
      console.log('[飞书] 写入成功:', netaUsername);
    }
  } catch (e) {
    console.error('[飞书] 写入异常:', e);
  }
}

// ─── Background Task ──────────────────────────────────────────────────
async function handleSubmissionBackground(userId, userMention, netaUsername, phone) {
  /** 提交后台处理：写飞书 + 推送工作频道 + 赋予角色 */
  
  // 1. 写飞书
  await feishuAddRecord(netaUsername, phone, userMention);
  
  // 2. 通知管理员频道
  if (CONFIG.STAFF_CHANNEL_ID) {
    const notifyRole = CONFIG.NOTIFY_ROLE_ID && CONFIG.NOTIFY_ROLE_ID !== '0' 
      ? `<@&${CONFIG.NOTIFY_ROLE_ID}> ` 
      : '';
    
    await message({
      action: 'send',
      channel: 'discord',
      target: CONFIG.STAFF_CHANNEL_ID,
      message: `${notifyRole}新素体领取待跟进`,
      components: {
        embeds: [{
          title: '🦞 新素体领取记录',
          color: 0xFF6B35,
          timestamp: new Date().toISOString(),
          fields: [
            { name: 'Discord 用户', value: userMention, inline: true },
            { name: 'Neta 用户名', value: netaUsername, inline: true },
            { name: '联系电话', value: phone, inline: false },
          ],
          footer: { text: `用户 ID: ${userId}` },
        }],
      },
    });
  }
  
  // 3. 赋予已验证角色（需要通过 Discord API 或管理员手动处理）
  if (CONFIG.VERIFIED_ROLE_ID && CONFIG.VERIFIED_ROLE_ID !== '0') {
    console.log('[角色] 需要赋予用户已验证角色:', CONFIG.VERIFIED_ROLE_ID, '用户:', userId);
  }
}

// ─── Welcome Embed ────────────────────────────────────────────────────
function buildWelcomeEmbed() {
  return {
    title: '🦞 欢迎登录 Neta 宇宙',
    description: 
      '你的龙虾素体正在等待激活。\n\n' +
      '填写以下信息，系统将为你匹配专属素体。\n' +
      '龙虾降生后，我们会第一时间主动联络你——\n' +
      '**请确保联系方式畅通，别让你的龙虾等太久。**',
    color: 0xFF6B35,
    footer: { text: 'Neta 宇宙 · 龙虾素体领取通道' },
  };
}

// ─── Success Message ──────────────────────────────────────────────────
function buildSuccessEmbed() {
  return {
    title: '🦞 素体领取成功！',
    description: 
      '你的龙虾正在孵化中，降生后将主动联络你。\n' +
      '请保持联系方式畅通，静候佳音。',
    color: 0xFF6B35,
  };
}

// ─── Main Skill Handler ───────────────────────────────────────────────
async function handleNetaClaim(event) {
  /**
   * 处理 Neta 素体领取事件
   * 
   * 支持的事件类型：
   * - button_click: 用户点击领取按钮
   * - modal_submit: 用户提交表单
   * - command: 用户发送 /领取素体 或 /发送表单
   */
  
  const { type, interaction, user, data, channelId } = event;
  
  // 去重检查
  if (interaction?.id) {
    if (_seenInteractions.has(interaction.id)) {
      console.log('[去重] 跳过已处理的 interaction:', interaction.id);
      return { type: 'ack' };
    }
    _seenInteractions.add(interaction.id);
    if (_seenInteractions.size > MAX_SEEN_SIZE) {
      _seenInteractions.clear();
    }
  }
  
  try {
    if (type === 'button_click') {
      // 用户点击"领取我的龙虾素体"按钮 → 弹出 Modal
      return {
        type: 'modal',
        modal: {
          title: '领取你的龙虾素体',
          triggerLabel: '🦞 领取我的龙虾素体',
          fields: [
            {
              type: 'text',
              name: 'neta_username',
              label: '你的 Neta 用户名',
              placeholder: '填写你在 Neta 的用户名',
              style: 'short',
              required: true,
              maxLength: 50,
            },
            {
              type: 'text',
              name: 'phone',
              label: '联系电话',
              placeholder: '龙虾降生后我们会通过此号码联系你',
              style: 'short',
              required: true,
              maxLength: 20,
            },
          ],
        },
      };
    }
    
    if (type === 'modal_submit') {
      // 用户提交表单 → 立即回复 + 后台处理
      const netaUsername = data?.fields?.neta_username || data?.neta_username;
      const phone = data?.fields?.phone || data?.phone;
      
      if (!netaUsername || !phone) {
        return {
          type: 'response',
          message: { 
            content: '❌ 请填写完整信息', 
            ephemeral: true,
          },
        };
      }
      
      // 立即回复用户（ephemeral 只有用户自己能看到）
      const successMsg = {
        embeds: [buildSuccessEmbed()],
      };
      
      // 后台异步处理（不阻塞响应）
      setImmediate(() => {
        handleSubmissionBackground(
          user.id,
          `<@${user.id}>`,
          netaUsername,
          phone
        );
      });
      
      return {
        type: 'response',
        message: successMsg,
        ephemeral: true,
      };
    }
    
    if (type === 'command') {
      // /领取素体 或 /发送表单 命令 → 弹出 Modal
      return {
        type: 'modal',
        modal: {
          title: '领取你的龙虾素体',
          triggerLabel: '打开表单',
          fields: [
            {
              type: 'text',
              name: 'neta_username',
              label: '你的 Neta 用户名',
              placeholder: '填写你在 Neta 的用户名',
              style: 'short',
              required: true,
              maxLength: 50,
            },
            {
              type: 'text',
              name: 'phone',
              label: '联系电话',
              placeholder: '龙虾降生后我们会通过此号码联系你',
              style: 'short',
              required: true,
              maxLength: 20,
            },
          ],
        },
      };
    }
  } catch (e) {
    console.error('[NetaClaim 错误]:', e);
    return {
      type: 'response',
      message: { content: '❌ 发生错误，请重试。', ephemeral: true },
    };
  }
  
  return { type: 'ack' };
}

// ─── Member Join Handler ──────────────────────────────────────────────
async function handleMemberJoin(member) {
  /** 新用户加入服务器 → 发送私信欢迎消息 */
  
  const welcomeEmbed = buildWelcomeEmbed();
  
  try {
    // 发送私信
    await message({
      action: 'send',
      channel: 'discord',
      target: `user:${member.id}`,
      message: '🦞 欢迎登录 Neta 宇宙',
      components: {
        embeds: [welcomeEmbed],
        buttons: [
          {
            label: '领取我的龙虾素体',
            style: 'primary',
            emoji: { name: '🦞' },
            customId: 'open_neta_form',
          },
        ],
      },
    });
    
    console.log('[成员加入] 已发送欢迎消息给:', member.id);
  } catch (e) {
    console.error('[成员加入] 发送私信失败:', e.message);
    // Fallback: 发送到欢迎频道（如果有的话）
    // 需要额外配置欢迎频道 ID
  }
}

// ─── Export ───────────────────────────────────────────────────────────
module.exports = {
  name: 'neta-lobster-claim',
  description: 'Neta 龙虾素体领取 - 新用户入群自动弹出表单，收集信息写入飞书',
  version: '1.0.0',
  
  // 技能入口
  handler: handleNetaClaim,
  
  // 成员加入事件处理器
  onMemberJoin: handleMemberJoin,
  
  // 配置
  config: CONFIG,
  
  // Discord 命令定义（用于注册）
  commands: [
    {
      name: '领取素体',
      description: '领取你的 Neta 龙虾素体',
    },
    {
      name: '发送表单',
      description: '管理员测试：直接打开素体领取表单',
      adminOnly: true,
    },
  ],
  
  // 按钮定义
  buttons: [
    {
      customId: 'open_neta_form',
      label: '领取我的龙虾素体',
      style: 'primary',
      emoji: '🦞',
    },
  ],
  
  // 环境变量要求
  requiredEnv: [
    'DISCORD_GUILD_ID',
    'DISCORD_STAFF_CHANNEL_ID',
  ],
  
  optionalEnv: [
    'DISCORD_VERIFIED_ROLE_ID',
    'DISCORD_NOTIFY_ROLE_ID',
    'FEISHU_APP_ID',
    'FEISHU_APP_SECRET',
  ],
};
