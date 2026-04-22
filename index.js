const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const GAS_URL = process.env.GAS_URL;
const BOT_NAME = '台本マスター';

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} として起動しました`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const content = msg.content;
  const isMentioned = msg.mentions.has(client.user);
  const isNaturalCall =
    content.startsWith(`${BOT_NAME}、`) ||
    content.startsWith(`${BOT_NAME},`) ||
    content.startsWith(`${BOT_NAME} `);

  if (!isMentioned && !isNaturalCall) return;

  // 呼びかけ部分とメンションを除去して本文だけ取り出す
  const cleanedContent = content
    .replace(`<@${client.user.id}>`, '')
    .replace(new RegExp(`^${BOT_NAME}[、, ]`), '')
    .trim();

  if (!cleanedContent) {
    await msg.reply('はい、何でしょうか？');
    return;
  }

  // 考え中リアクションを付ける
  try { await msg.react('🤔'); } catch (_) {}

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: msg.author.id,
        userName: msg.author.displayName || msg.author.username,
        channelId: msg.channel.id,
        messageId: msg.id,
        content: cleanedContent,
      }),
    });

    const data = await res.json();
    const reply = data.reply || '（応答が取得できませんでした）';

    // 長い返答は分割して送信
    if (reply.length <= 2000) {
      await msg.reply(reply);
    } else {
      const chunks = reply.match(/.{1,2000}/gs);
      for (const chunk of chunks) {
        await msg.channel.send(chunk);
      }
    }
  } catch (err) {
    console.error('GAS呼び出しエラー:', err);
    await msg.reply('⚠️ エラーが発生しました。しばらくしてもう一度お試しください。');
  }
});

client.login(process.env.DISCORD_TOKEN);
