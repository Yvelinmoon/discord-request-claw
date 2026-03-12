/**
 * Neta 龙虾素体领取 - Discord 命令注册脚本
 * 
 * 注册以下斜杠命令到 Discord 服务器：
 * - /领取素体 - 任何用户可用
 * - /发送表单 - 仅管理员
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('❌ 缺少必要环境变量：DISCORD_BOT_TOKEN 或 DISCORD_GUILD_ID');
  process.exit(1);
}

const commands = [
  {
    name: '申请虾宝',
    description: '领取你的龙虾宝宝',
  },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 开始注册斜杠命令...');
    
    const result = await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID || 'me', GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ 成功注册 ${result.length} 个命令：`);
    result.forEach(cmd => {
      console.log(`   - /${cmd.name}: ${cmd.description}`);
    });
    
    console.log('\n💡 命令可能需要几分钟才能在 Discord 中显示');
  } catch (error) {
    console.error('❌ 注册失败:', error);
    process.exit(1);
  }
})();
