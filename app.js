import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Discord.js клиент ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const polls = new Map(); // { messageId: { topic, votes: { up: Set, down: Set } } }

// --- Discord Interactions (для Slash-команд) ---
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'market') {
      const topic = data.options[0].value;

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `📊 **${topic}**\n👍 0 голосов (0%) | коэффициент —\n👎 0 голосов (0%) | коэффициент —`,
        },
      });
    }
  }
});

// --- Слежение за реакциями ---
client.on('messageCreate', async (message) => {
  // Если сообщение создано ботом и это "маркет"
  if (message.author.bot && message.content.startsWith('📊')) {
    // Добавляем реакции
    await message.react('👍');
    await message.react('👎');

    // Регистрируем опрос
    polls.set(message.id, { topic: message.content, votes: { up: new Set(), down: new Set() } });
  }
});

const ignoreRemovals = new Set();

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  const poll = polls.get(reaction.message.id);
  if (!poll) return;

  const { up, down } = poll.votes;

  if (reaction.emoji.name === '👍') {
    const opposite = reaction.message.reactions.cache.find(r => r.emoji.name === '👎');
    if (opposite && opposite.users.cache.has(user.id)) {
      // помечаем, что следующая remove — от нас
      ignoreRemovals.add(`${reaction.message.id}_${user.id}`);
      await opposite.users.remove(user.id);
    }

    down.delete(user.id);
    up.add(user.id);
  }
  else if (reaction.emoji.name === '👎') {
    const opposite = reaction.message.reactions.cache.find(r => r.emoji.name === '👍');
    if (opposite && opposite.users.cache.has(user.id)) {
      ignoreRemovals.add(`${reaction.message.id}_${user.id}`);
      await opposite.users.remove(user.id);
    }

    up.delete(user.id);
    down.add(user.id);
  }
  else {
    await reaction.users.remove(user.id);
    return;
  }

  await updatePollMessage(reaction.message, poll);
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const poll = polls.get(reaction.message.id);
  if (!poll) return;

  const key = `${reaction.message.id}_${user.id}`;
  if (ignoreRemovals.has(key)) {
    ignoreRemovals.delete(key); // пропускаем это событие
    return;
  }

  const { up, down } = poll.votes;
  up.delete(user.id);
  down.delete(user.id);

  await updatePollMessage(reaction.message, poll);
});


client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const poll = polls.get(reaction.message.id);
  if (!poll) return;

  const { up, down } = poll.votes;

  up.delete(user.id);
  down.delete(user.id);

  await updatePollMessage(reaction.message, poll);
});

// --- Функция обновления ---
async function updatePollMessage(message, poll) {
  const upCount = poll.votes.up.size;
  const downCount = poll.votes.down.size;
  const total = upCount + downCount;

  const upPercent = total ? ((upCount / total) * 100).toFixed(1) : 0;
  const downPercent = total ? ((downCount / total) * 100).toFixed(1) : 0;

  const upCoef = upPercent > 0 ? (1 / (upPercent / 100)).toFixed(2) : '—';
  const downCoef = downPercent > 0 ? (1 / (downPercent / 100)).toFixed(2) : '—';

  const newContent = `📊 **${poll.topic.split('\n')[0].replace('📊 ', '')}**\n👍 ${upCount} голосов (${upPercent}%) | коэффициент ${upCoef}\n👎 ${downCount} голосов (${downPercent}%) | коэффициент ${downCoef}`;

  await message.edit(newContent);
}

// --- Запуск ---
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

app.listen(PORT, () => {
  console.log(`🌐 Express listening on port ${PORT}`);
});
