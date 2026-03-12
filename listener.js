/**
 * Neta 龙虾素体领取 - Discord 事件监听器
 * 
 * 监听以下事件：
 * - member_join: 新用户加入服务器
 * - interaction: 按钮点击、模态框提交、斜杠命令
 * 
 * 使用方式：
 * node listener.js
 */

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const https = require('https');

// ─── Config ───────────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const STAFF_CHANNEL_ID = process.env.DISCORD_STAFF_CHANNEL_ID;
const VERIFIED_ROLE_ID = process.env.DISCORD_VERIFIED_ROLE_ID || '0';
const NOTIFY_ROLE_ID = process.env.DISCORD_NOTIFY_ROLE_ID || '0';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_SPREADSHEET_TOKEN = 'IXTZsYDNxhctlMt9oGZcu6wAnWb';

if (!TOKEN || !GUILD_ID) {
  console.error('❌ 缺少必要环境变量：DISCORD_BOT_TOKEN 或 DISCORD_GUILD_ID');
  process.exit(1);
}

// 防止重复处理
const _seenInteractions = new Set();
const MAX_SEEN_SIZE = 500;

// 记录已提交用户（防止重复提交）
const _submittedUsers = new Set();

// ─── Helpers ──────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Feishu API ───────────────────────────────────────────────────────
async function getFeishuTenantToken() {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    console.log('[飞书] 未配置凭证，跳过');
    return null;
  }
  
  return new Promise((resolve) => {
    const body = JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    });

    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const auth = JSON.parse(data);
          if (auth.code !== 0) {
            console.error('[飞书] 鉴权失败:', auth);
            resolve(null);
          } else {
            resolve(auth.tenant_access_token);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function getSheetId(token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: `/open-apis/sheets/v2/spreadsheets/${FEISHU_SPREADSHEET_TOKEN}/metainfo`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const sheetsInfo = JSON.parse(data);
          const sheets = sheetsInfo.data?.sheets || [];
          resolve(sheets.length ? sheets[0].sheetId : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

async function feishuAddRecord(netaUsername, phone, discordUsername) {
  const token = await getFeishuTenantToken();
  if (!token) return;
  
  const sheetId = await getSheetId(token);
  if (!sheetId) return;
  
  return new Promise((resolve) => {
    const body = JSON.stringify({
      valueRange: {
        range: `${sheetId}!A:D`,
        values: [[
          netaUsername,
          phone,
          discordUsername,
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]],
      },
    });

    const url = `/open-apis/sheets/v2/spreadsheets/${FEISHU_SPREADSHEET_TOKEN}/values_append?insertDataOption=INSERT_ROWS`;
    
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: url,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code !== 0) {
            console.error('[飞书] 写入失败:', result);
          } else {
            console.log('[飞书] 写入成功:', netaUsername);
          }
          resolve();
        } catch {
          resolve();
        }
      });
    });

    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

// ─── Background Task ──────────────────────────────────────────────────
async function handleSubmissionBackground(userId, userMention, netaUsername, phone) {
  /** 提交后台处理：写飞书 + 推送工作频道 + 赋予角色 */
  
  console.log('[后台处理] 开始处理表单提交:', { userId, netaUsername, phone });
  
  // 1. 写飞书
  await feishuAddRecord(netaUsername, phone, userMention);
  
  // 2. 通知管理员频道
  if (STAFF_CHANNEL_ID) {
    try {
      const staffChannel = client.channels.cache.get(STAFF_CHANNEL_ID);
      if (staffChannel) {
        const notifyRole = NOTIFY_ROLE_ID && NOTIFY_ROLE_ID !== '0' 
          ? `<@&${NOTIFY_ROLE_ID}> ` 
          : '';
        
        const embed = new EmbedBuilder()
          .setTitle('🦞 新虾宝领取记录')
          .setColor(0xFF6B35)
          .setTimestamp()
          .addFields(
            { name: 'Discord 用户', value: userMention, inline: true },
            { name: '捏 Ta 用户名', value: netaUsername, inline: true },
            { name: '注册手机号', value: phone, inline: false }
          )
          .setFooter({ text: `用户 ID: ${userId}` });
        
        await staffChannel.send({
          content: `${notifyRole}新素体领取待跟进`,
          embeds: [embed],
        });
        console.log('[后台处理] 已通知管理员频道');
      }
    } catch (error) {
      console.error('[后台处理] 通知管理员失败:', error.message);
    }
  }
  
  // 3. 赋予已验证角色
  if (VERIFIED_ROLE_ID && VERIFIED_ROLE_ID !== '0') {
    try {
      const guild = client.guilds.cache.get(GUILD_ID);
      if (guild) {
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(VERIFIED_ROLE_ID);
        if (member && role) {
          await member.roles.add(role);
          console.log('[后台处理] 已赋予已验证角色');
        }
      }
    } catch (error) {
      console.error('[后台处理] 赋予角色失败:', error.message);
    }
  }
}

// ─── Welcome Embed ────────────────────────────────────────────────────
function buildWelcomeEmbed() {
  return new EmbedBuilder()
    .setTitle('🦞 欢迎登录 Neta 宇宙')
    .setDescription(
      '一只虾宝正在等待收养...\n\n' +
      '填写以下信息，系统将为你匹配一只虾宝。\n' +
      '龙虾降生后，我们会第一时间主动联络你——\n' +
      '****'
    )
    .setColor(0xFF6B35)
    .setFooter({ text: 'Neta 宇宙 · 龙虾宝宝领取通道' });
}

function buildSuccessEmbed() {
  return new EmbedBuilder()
    .setTitle('🦞 虾宝领取成功！')
    .setDescription(
      '你的虾宝已找到，正在快马加鞭送来的路上～\n' +
      '请保持联络畅通，虾宝马上就到！'
    )
    .setColor(0xFF6B35);
}

// ─── Modal ────────────────────────────────────────────────────────────
function createNetaModal() {
  const modal = new ModalBuilder()
    .setCustomId('neta_claim_modal')
    .setTitle('领取你的龙虾宝宝');

  const netaUsernameInput = new TextInputBuilder()
    .setCustomId('neta_username')
    .setLabel('你的捏 Ta 用户名')
    .setPlaceholder('填写你在捏 Ta 的用户名')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const phoneInput = new TextInputBuilder()
    .setCustomId('phone')
    .setLabel('捏 Ta 注册手机号')
    .setPlaceholder('填写捏 Ta 注册手机号，用于关联账号信息')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);


  const row1 = new ActionRowBuilder().addComponents(netaUsernameInput);
  const row2 = new ActionRowBuilder().addComponents(phoneInput);

  modal.addComponents(row1, row2);

  return modal;
}

// ─── Button View ──────────────────────────────────────────────────────
function createWelcomeView() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_neta_form')
      .setLabel('领取我的龙虾宝宝')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🦞')
  );

  return row;
}

// ─── Bot Initialization ───────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── Ready Event ──────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot 已启动：${c.user.tag}`);
  console.log(`   服务器 ID: ${GUILD_ID}`);
  
  // 同步命令
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const commands = [
      {
        name: '申请虾宝',
        description: '领取你的龙虾宝宝',
      },
    ];
    
    await guild.commands.set(commands);
    console.log(`✅ 已同步 ${commands.length} 个斜杠命令`);
    console.log('   命令列表:');
    commands.forEach(cmd => {
      console.log(`   - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ 命令同步失败:', error.message);
    console.error('   请检查 GUILD_ID 是否正确，Bot 是否在服务器中');
  }
  
  console.log('\n💡 现在可以在 Discord 中使用 /申请虾宝 测试功能');
});

// ─── Member Join Event ────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  
  console.log('[成员加入]', member.user.tag, member.id);
  
  const embed = buildWelcomeEmbed();
  const row = createWelcomeView();
  
  try {
    await member.send({
      embeds: [embed],
      components: [row],
    });
    console.log('[成员加入] 已发送欢迎消息');
  } catch (error) {
    console.error('[成员加入] 发送私信失败:', error.message);
    // Fallback: 发送到欢迎频道（如果有）
  }
});

// ─── Interaction Handler ──────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  console.log('[交互]', interaction.type, interaction.commandName || interaction.customId, interaction.user.tag);
  
  try {
    // 按钮点击
    if (interaction.isButton()) {
      if (interaction.customId === 'open_neta_form') {
        // 检查用户是否已提交过
        if (_submittedUsers.has(interaction.user.id)) {
          await interaction.reply({
            content: '🦞 你的虾宝已在安排中，请等待接收哦～',
            ephemeral: true,
          });
          console.log('[按钮] 用户已提交，提示等待:', interaction.user.tag);
        } else {
          await interaction.showModal(createNetaModal());
          console.log('[按钮] 已显示 Modal');
        }
      }
      return;
    }
    
    // 模态框提交
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'neta_claim_modal') {
        // 去重检查：只针对 modal submit，防止 discord.js 重复触发
        if (_seenInteractions.has(interaction.id)) {
          console.log('[去重] 跳过已处理的 modal submit:', interaction.id);
          return;
        }
        _seenInteractions.add(interaction.id);
        if (_seenInteractions.size > MAX_SEEN_SIZE) {
          _seenInteractions.clear();
        }
        
        const netaUsername = interaction.fields.getTextInputValue('neta_username');
        const phone = interaction.fields.getTextInputValue('phone');
        
        console.log('[表单提交]', { netaUsername, phone, user: interaction.user.tag });
        
        // 标记用户已提交
        _submittedUsers.add(interaction.user.id);
        
        // 先确认交互（防止过期）
        await interaction.deferReply({ ephemeral: true });
        
        // 后台异步处理
        setImmediate(() => {
          handleSubmissionBackground(
            interaction.user.id,
            `<@${interaction.user.id}>`,
            netaUsername,
            phone
          );
        });
        console.log('[表单] 已提交，后台处理中...');
        
        // 回复用户
        try {
          await interaction.editReply({
            embeds: [buildSuccessEmbed()],
          });
        } catch (e) {
          console.log('[表单] 回复失败:', e.message);
        }
      }
      return;
    }
    
    // 斜杠命令
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === '申请虾宝') {
        console.log('[命令]', interaction.commandName, interaction.user.tag);
        // 检查用户是否已提交过
        if (_submittedUsers.has(interaction.user.id)) {
          await interaction.reply({
            content: '🦞 你的虾宝已在安排中，请等待接收哦～',
            ephemeral: true,
          });
          console.log('[命令] 用户已提交，提示等待:', interaction.user.tag);
        } else {
          await interaction.showModal(createNetaModal());
          console.log('[命令] 已显示 Modal');
        }
      }
      return;
    }
  } catch (error) {
    console.error('[交互处理错误]:', error.message, error.stack);
    
    // 尝试发送错误消息（如果还没响应）
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: `❌ 发生错误：${error.message}\n请重试或联系管理员。`,
          ephemeral: true,
        });
      } catch (e) {
        console.error('[错误回复失败]:', e.message);
      }
    }
  }
});

// ─── Start ────────────────────────────────────────────────────────────
client.login(TOKEN);
