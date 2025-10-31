import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';

const app = express();
const PORT = process.env.PORT || 3000;

// === Discord клиент ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- Хранилище опросов ---
const polls = new Map();
const ignoreRemovals = new Set();

// === Express endpoint для /market ===
app.post(
  '/interactions',
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async (req, res) => {
    const { type, data } = req.body;

    if (type === InteractionType.PING)
    return res.send({ type: InteractionResponseType.PONG });

    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;
      if (name === 'market') {
        const topic = data.options[0].value;
        const author =
        req.body.member?.user?.username ||
        req.body.user?.username ||
        'Неизвестный пользователь';
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
            `📊 **${topic}** 👤 Автор: **${author}**\n\n` +
            `👍 0 голосов (0%) | коэффициент —\n\n` +
            `👎 0 голосов (0%) | коэффициент —`,
          },
        });
      }
    }
  }
);

// === Обработка создания нового опроса ===
client.on('messageCreate', async (message) => {
  if (message.author.bot && message.content.startsWith('📊')) {
    await message.react('👍');
    await message.react('👎');

    const authorMatch = message.content.match(/Автор: \*\*(.*?)\*\*/);
    const author = authorMatch ? authorMatch[1] : 'Неизвестный пользователь';

    polls.set(message.id, {
      topic: message.content, author,
      votes: { up: new Set(), down: new Set() },
    });
  }
});

// === Обработка реакций ===
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  const poll = polls.get(reaction.message.id);
  if (!poll) return;

  if (!['👍', '👎'].includes(reaction.emoji.name)) {
    await reaction.users.remove(user.id);
    return;
  }

  const { up, down } = poll.votes;

  if (reaction.emoji.name === '👍') {
    const opposite = reaction.message.reactions.cache.find(r => r.emoji.name === '👎');
    if (opposite && opposite.users.cache.has(user.id)) {
      ignoreRemovals.add(`${reaction.message.id}_${user.id}`);
      await opposite.users.remove(user.id);
    }
    down.delete(user.id);
    up.add(user.id);
  } else if (reaction.emoji.name === '👎') {
    const opposite = reaction.message.reactions.cache.find(r => r.emoji.name === '👍');
    if (opposite && opposite.users.cache.has(user.id)) {
      ignoreRemovals.add(`${reaction.message.id}_${user.id}`);
      await opposite.users.remove(user.id);
    }
    up.delete(user.id);
    down.add(user.id);
  }

  await updatePollMessage(reaction.message, poll);
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const poll = polls.get(reaction.message.id);
  if (!poll) return;
  if (!['👍', '👎'].includes(reaction.emoji.name)) return;

  const key = `${reaction.message.id}_${user.id}`;
  if (ignoreRemovals.has(key)) {
    ignoreRemovals.delete(key);
    return;
  }

  poll.votes.up.delete(user.id);
  poll.votes.down.delete(user.id);

  await updatePollMessage(reaction.message, poll);
});

// === Функция обновления ===
async function updatePollMessage(message, poll) {
  const upCount = poll.votes.up.size;
  const downCount = poll.votes.down.size;
  const total = upCount + downCount;

  const upPercent = total ? ((upCount / total) * 100).toFixed(1) : 0;
  const downPercent = total ? ((downCount / total) * 100).toFixed(1) : 0;
  const upCoef = upPercent > 0 ? (1 / (upPercent / 100)).toFixed(2) : '—';
  const downCoef = downPercent > 0 ? (1 / (downPercent / 100)).toFixed(2) : '—';

  const makeBar = (percent) => {
    const filled = Math.round((percent / 100) * 10);
    const empty = 10 - filled;
    return ':green_square:'.repeat(filled) + ':red_square:'.repeat(empty);
  };

  const upBar = makeBar(upPercent);
  const downBar = makeBar(downPercent);
  const topic = poll.topic.split('\n')[0].replace('📊 ', '');
  const author = poll.author || 'Неизвестный пользователь';

  const newContent =
  `📊 **${topic}** 👤 Автор: **${author}**\n\n` +
  `👍 ${upBar} ${upCount} голосов (${upPercent}%) | коэффициент ${upCoef}\n\n` +
  `👎 ${downBar} ${downCount} голосов (${downPercent}%) | коэффициент ${downCoef}`;

  await message.edit(newContent);
}

// === Восстановление опросов при запуске ===
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in как ${client.user.tag}`);
  console.log('🔍 Ищу старые опросы...');

  for (const [, channel] of client.channels.cache) {
    if (!channel.isTextBased?.()) continue;
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      for (const msg of messages.values()) {
        if (msg.author.bot && msg.content.startsWith('📊')) {
          const up = await msg.reactions.cache.get('👍')?.users.fetch();
          const down = await msg.reactions.cache.get('👎')?.users.fetch();

          const upSet = new Set(up?.map(u => u.id).filter(id => id !== client.user.id));
          const downSet = new Set(down?.map(u => u.id).filter(id => id !== client.user.id));
          const authorMatch = msg.content.match(/Автор: \*\*(.*?)\*\*/);
          const author = authorMatch ? authorMatch[1] : 'Неизвестный пользователь';

          polls.set(msg.id, {
            topic: msg.content, author,
            votes: { up: upSet, down: downSet },
          });

          // Пересчитать сообщение
          await updatePollMessage(msg, polls.get(msg.id));
        }
      }
    } catch (err) {
      // Молча пропускаем недоступные каналы
    }
  }

  console.log(`🗂 Активных опросов: ${polls.size}`);
  app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));
});

client.login(process.env.DISCORD_TOKEN);