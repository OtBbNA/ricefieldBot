import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// === Функции загрузки/сохранения ===
const POLL_FILE = './polls.json';
const polls = new Map();

function loadPolls() {
  if (fs.existsSync(POLL_FILE)) {
    const data = JSON.parse(fs.readFileSync(POLL_FILE, 'utf8'));
    for (const [id, poll] of Object.entries(data)) {
      poll.votes.up = new Set(poll.votes.up);
      poll.votes.down = new Set(poll.votes.down);
      polls.set(id, poll);
    }
    console.log(`🗂 Загружено ${polls.size} активных опросов`);
  }
}

function savePolls() {
  const plain = {};
  for (const [id, poll] of polls.entries()) {
    plain[id] = {
      topic: poll.topic,
      votes: {
        up: [...poll.votes.up],
        down: [...poll.votes.down],
      },
    };
  }
  fs.writeFileSync(POLL_FILE, JSON.stringify(plain, null, 2));
}

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

// === Express обработчик Slash-команд ===
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
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `📊 **${topic}**\n👍 0 голосов (0%) | коэффициент —\n👎 0 голосов (0%) | коэффициент —`,
          },
        });
      }
    }
  }
);

// === Логика опросов ===
client.on('messageCreate', async (message) => {
  if (message.author.bot && message.content.startsWith('📊')) {
    await message.react('👍');
    await message.react('👎');
    polls.set(message.id, {
      topic: message.content,
      votes: { up: new Set(), down: new Set() },
    });
    savePolls();
  }
});

const ignoreRemovals = new Set();

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
    const opposite = reaction.message.reactions.cache.find((r) => r.emoji.name === '👎');
    if (opposite && opposite.users.cache.has(user.id)) {
      ignoreRemovals.add(`${reaction.message.id}_${user.id}`);
      await opposite.users.remove(user.id);
    }
    down.delete(user.id);
    up.add(user.id);
  } else if (reaction.emoji.name === '👎') {
    const opposite = reaction.message.reactions.cache.find((r) => r.emoji.name === '👍');
    if (opposite && opposite.users.cache.has(user.id)) {
      ignoreRemovals.add(`${reaction.message.id}_${user.id}`);
      await opposite.users.remove(user.id);
    }
    up.delete(user.id);
    down.add(user.id);
  }

  await updatePollMessage(reaction.message, poll);
  savePolls();
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
  savePolls();
});

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
    return '‖︎' + '■'.repeat(filled) + '▢'.repeat(empty) + '‖︎';
  };

  const upBar = makeBar(upPercent);
  const downBar = makeBar(downPercent);
  const topic = poll.topic.split('\n')[0].replace('📊 ', '');

  const newContent =
  `📊 **${topic}**\n\n` +
  `👍 ${upBar} ${upCount} голосов (${upPercent}%) | коэффициент ${upCoef}\n\n` +
  `👎 ${downBar} ${downCount} голосов (${downPercent}%) | коэффициент ${downCoef}`;

  await message.edit(newContent);
}

// === Запуск ===
loadPolls();

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const missing = [];
  for (const [id, poll] of polls.entries()) {
    let found = false;
    for (const [, channel] of client.channels.cache) {
      if (!channel.isTextBased?.()) continue;
      try {
        const msg = await channel.messages.fetch(id);
        if (msg && msg.author.bot && msg.content.startsWith('📊')) {
          found = true;
          break;
        }
      } catch {}
    }
    if (!found) missing.push(id);
  }

  for (const id of missing) polls.delete(id);
  if (missing.length) savePolls();

  console.log(`🗂 Загружено ${polls.size} активных опросов из JSON`);
  app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));
});

client.login(process.env.DISCORD_TOKEN);
