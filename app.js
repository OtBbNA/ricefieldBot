import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';

const app = express();
app.use(express.json()); // обязательно
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
// polls: Map<messageId, { topic, author, optionsCount, votes: { a:Set,b:Set,c:Set } }>
const polls = new Map();
const ignoreRemovals = new Set();

// --- Вспомогалки ---
function safeEmojiName(e) {
  if (!e) return null;
  return e.name || e.toString();
}

// --- Slash-interactions endpoint ---
app.post(
  '/interactions',
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async (req, res) => {
    const { type, data } = req.body;

    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = data;
      if (name === 'market') {
        // Опции: topic (STRING), options (INTEGER 2/3)
        const topic = options.find(o => o.name === 'topic')?.value ?? 'Без темы';
        const optsVal = options.find(o => o.name === 'options')?.value ?? 2;
        const optionsCount = (optsVal === 3) ? 3 : 2;

        const author =
        req.body.member?.user?.username ||
        req.body.user?.username ||
        'Неизвестный пользователь';

        // Формат шапки:
        // 📊
        // # topic
        // -# by: author
        const content =
        `📊\n# ${topic}\n-# by: ${author}\n\n` +
        "```ansi\n\n" +
        generateEmptyAnsiFrame() + // временно пустой бар; updatePollMessage заполнит правильный бар после messageCreate
        "\n```";

        // Сразу отвечаем; messageCreate обработает добавление реакций и регистрацию опроса
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content,
            flags: 0,
          },
        });
      }
    }

    return res.status(400).json({ error: 'unknown interaction' });
  }
);

// --- При создании сообщения ботом: добавляем реакции и регистрируем poll ---
client.on('messageCreate', async (message) => {
  if (!(message.author && message.author.bot)) return;
  if (!message.content.startsWith('📊')) return;

  // Парсим первую три строки, ожидаемый формат:
  // 📊
  // # topic
  // -# by: author
  const lines = message.content.split('\n');
  const firstLine = lines[0] || '';
  const secondLine = lines[1] || '';
  const thirdLine = lines[2] || '';

  let topic = secondLine.replace(/^#\s*/,'').trim();
  if (!topic) topic = 'Без темы';

  const authorMatch = thirdLine.match(/by:\s*(.*)$/i);
  const author = authorMatch ? authorMatch[1].trim() : 'Неизвестный пользователь';

  // Определяем опции: если сообщение уже содержит реакцию 🙏 — 3, иначе 2.
  // Но при первичном создании реакции отсутствуют — используем data from content? user passed options, but we can't read it here.
  // Поэтому определим optionsCount by checking if content contains special marker: we'll look for "options:3" marker in content (none),
  // fallback: default to 2. However after first update we store optionsCount in polls map, so next runs will be correct.
  // Simpler: try to infer from existing emoji in message.reactions (if present), else default to 2.
  let optionsCount = 2;
  try {
    if (message.reactions.cache.has('🙏')) optionsCount = 3;
  } catch {}

  // If this message seems created by our new slash flow, the message content contains topic and author.
  // Register poll with empty votes sets
  const votes = { a: new Set(), b: new Set(), c: new Set() };
  polls.set(message.id, { topic, author, optionsCount, votes });

  // Add reactions according to optionsCount
  try {
    if (optionsCount === 3) {
      await message.react('👍');
      await message.react('🙏');
      await message.react('👎');
    } else {
      await message.react('👍');
      await message.react('👎');
    }
  } catch (err) {
    console.error('Не удалось поставить реакции:', err);
  }

  // Immediately update message visually (will use 0 votes)
  await updatePollMessage(message, polls.get(message.id));
});

// --- Реакции ---
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  // Ensure reaction message is fetched (partials)
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  const message = reaction.message;
  const poll = polls.get(message.id);
  if (!poll) return;

  // Accept only allowed emojis
  const name = safeEmojiName(reaction.emoji);
  const allowed = (poll.optionsCount === 3) ? ['👍','🙏','👎'] : ['👍','👎'];
  if (!allowed.includes(name)) {
    // remove foreign emoji
    try { await reaction.users.remove(user.id); } catch {}
    return;
  }

  // Prevent race: if opposite present, remove it and mark ignoreRemovals
  const { a, b, c } = poll.votes;

  if (name === '👍') {
    // remove user from other sets
    if (poll.optionsCount === 3) {
      if (b.has(user.id)) b.delete(user.id);
    }
    if (c.has(user.id)) c.delete(user.id);

    // remove opposite reactions on message visually
    if (poll.optionsCount === 3) {
      const opp = message.reactions.cache.get('🙏');
      if (opp && opp.users.cache.has(user.id)) {
        ignoreRemovals.add(`${message.id}_${user.id}`);
        try { await opp.users.remove(user.id); } catch {}
      }
    }
    const opp2 = message.reactions.cache.get('👎');
    if (opp2 && opp2.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp2.users.remove(user.id); } catch {}
    }

    a.add(user.id);
    b.delete(user.id);
    c.delete(user.id);
  } else if (name === '🙏') {
    // only for 3-option polls
    if (poll.optionsCount !== 3) {
      try { await reaction.users.remove(user.id); } catch {}
      return;
    }
    const opp1 = message.reactions.cache.get('👍');
    const opp3 = message.reactions.cache.get('👎');
    if (opp1 && opp1.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp1.users.remove(user.id); } catch {}
    }
    if (opp3 && opp3.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp3.users.remove(user.id); } catch {}
    }

    b.add(user.id);
    a.delete(user.id);
    c.delete(user.id);
  } else if (name === '👎') {
    const opp = message.reactions.cache.get('👍');
    if (opp && opp.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp.users.remove(user.id); } catch {}
    }
    if (poll.optionsCount === 3) {
      const opp2 = message.reactions.cache.get('🙏');
      if (opp2 && opp2.users.cache.has(user.id)) {
        ignoreRemovals.add(`${message.id}_${user.id}`);
        try { await opp2.users.remove(user.id); } catch {}
      }
    }

    c.add(user.id);
    a.delete(user.id);
    b.delete(user.id);
  }

  await updatePollMessage(message, poll);
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const message = reaction.message;
  const poll = polls.get(message.id);
  if (!poll) return;

  const name = safeEmojiName(reaction.emoji);
  const allowed = (poll.optionsCount === 3) ? ['👍','🙏','👎'] : ['👍','👎'];
  if (!allowed.includes(name)) return;

  const key = `${message.id}_${user.id}`;
  if (ignoreRemovals.has(key)) {
    ignoreRemovals.delete(key);
    return;
  }

  // remove user from all sets
  poll.votes.a.delete(user.id);
  poll.votes.b.delete(user.id);
  poll.votes.c.delete(user.id);

  await updatePollMessage(message, poll);
});

// --- ANSI-bar generator ---
function ansiEsc(code) { return `\x1b[${code}m`; }
function reset() { return '\x1b[0m'; }

function generateEmptyAnsiFrame() {
  // frame with empty grey bar (66 blocks)
  const segments = 66;
  const grey = ansiEsc('1;30m') + '▉'.repeat(segments) + reset();
  // top/bottom borders: will be displayed inside code block anyway
  // We'll return the block lines content (without wrapping ```
  const lineTop = ansiEsc('1;30m') + '┏' + '━'.repeat(66) + '┓' + reset();
  const middle = ansiEsc('1;30m') + '┃' + reset() + grey + ansiEsc('1;30m') + '┃' + reset();
  const lineBot = ansiEsc('1;30m') + '┗' + '━'.repeat(66) + '┛' + reset();
  // concatenate with separators as in your design
  return `${lineTop}\n${middle}\n${lineBot}\n${ansiEsc('1;30m') + '━'.repeat(66) + reset()}\n\n` +
  `${ansiEsc('1;30m') + '━'.repeat(66) + reset()}`; // placeholder bottom
}

// Build actual bar for 2 or 3 options
function buildAnsiBar(parts) {
  // parts: array of objects {count, colorCode} where count = number of segments
  const segments = 66;
  const leftBorder = ansiEsc('1;30m') + '┏' + '━'.repeat(66) + '┓' + reset();
  const rightBorder = ansiEsc('1;30m') + '┗' + '━'.repeat(66) + '┛' + reset();

  // inside: concatenate colored blocks for each part
  let inside = '';
  for (const p of parts) {
    if (p.count <= 0) continue;
    inside += ansiEsc(p.colorCode) + '▉'.repeat(p.count) + reset();
  }
  // if total < segments, pad with grey
  const total = parts.reduce((s,p)=>s+p.count,0);
  if (total < segments) {
    inside += ansiEsc('1;30m') + '▉'.repeat(segments - total) + reset();
  }
  const middle = ansiEsc('1;30m') + '┃' + reset() + inside + ansiEsc('1;30m') + '┃' + reset();
  const sep = ansiEsc('1;30m') + '━'.repeat(66) + reset();
  return `${leftBorder}\n${middle}\n${rightBorder}\n${sep}`;
}

// --- Обновление сообщения ---
async function updatePollMessage(message, poll) {
  // poll: { topic, author, optionsCount, votes }
  const aCount = poll.votes.a.size;
  const bCount = poll.votes.b.size;
  const cCount = poll.votes.c.size;
  const total = aCount + bCount + cCount;

  const aPercent = total ? ((aCount / total) * 100) : 0;
  const bPercent = total ? ((bCount / total) * 100) : 0;
  const cPercent = total ? ((cCount / total) * 100) : 0;

  const fmt = (n) => n.toFixed(1).padStart(5,'0'); // "00.0" format
  const aPctStr = total ? aPercent.toFixed(1) : '00.0';
  const bPctStr = total ? bPercent.toFixed(1) : '00.0';
  const cPctStr = total ? cPercent.toFixed(1) : '00.0';

  const coef = (p) => {
    if (!total || p === 0) return '0.00';
    const val = 1 / (p / 100);
    return val.toFixed(2);
  };

  const aCoef = coef(aPercent);
  const bCoef = coef(bPercent);
  const cCoef = coef(cPercent);

  // Build bar segments (66 total)
  const segments = 66;
  function segCountFromPercent(p) {
    return Math.round((p / 100) * segments);
  }

  let barAnsi = '';
  if (poll.optionsCount === 3) {
    const aSeg = segCountFromPercent(aPercent);
    const bSeg = segCountFromPercent(bPercent);
    // to avoid rounding making sum > segments, compute c as remainder
    let sumSeg = aSeg + bSeg;
    let cSeg = segments - sumSeg;
    if (cSeg < 0) cSeg = 0;
    const parts = [
      { count: aSeg, colorCode: '1;32m' }, // green
      { count: bSeg, colorCode: '1;34m' }, // blue
      { count: cSeg, colorCode: '1;31m' }, // red
    ];
    // If total === 0 -> full grey
    if (total === 0) {
      barAnsi = generateEmptyAnsiFrame();
    } else {
      barAnsi = buildAnsiBar(parts);
    }
  } else {
    // two options: a (green) then c (red)
    const aSeg = segCountFromPercent(aPercent);
    let cSeg = segments - aSeg;
    if (cSeg < 0) cSeg = 0;
    const parts = [
      { count: aSeg, colorCode: '1;32m' }, // green
      { count: cSeg, colorCode: '1;31m' }, // red
    ];
    if (total === 0) {
      barAnsi = generateEmptyAnsiFrame();
    } else {
      barAnsi = buildAnsiBar(parts);
    }
  }

  // Build footer line(s)
  let footer = '';
  if (poll.optionsCount === 3) {
    footer = ` 👍 \x1b[1;32m${aCount} ┆ ${aPctStr}% ┆ ${aCoef}\x1b[0m  \x1b[1;30m┃\x1b[0m ` +
    ` 🙏 \x1b[1;34m${bCount} ┆ ${bPctStr}% ┆ ${bCoef}\x1b[0m  \x1b[1;30m┃\x1b[0m ` +
    ` 👎 \x1b[1;31m${cCount} ┆ ${cPctStr}% ┆ ${cCoef}\x1b[0m `;
  } else {
    footer = ` 👍 \x1b[1;32m${aCount} ┆ ${aPctStr}% ┆ ${aCoef}\x1b[0m             \x1b[1;30m┃\x1b[0m             👎 \x1b[1;31m${cCount} ┆ ${cPctStr}% ┆ ${cCoef}\x1b[0m `;
  }

  // Construct final content: header lines + code block with ansi + footer separator
  const header = `📊\n# ${poll.topic}\n-# by: ${poll.author}\n\n`;
  const codeBlock = '```ansi\n\n' + barAnsi + '\n' + '```';
  const sep = '\n' + ansiEsc('1;30m') + '━'.repeat(66) + reset() + '\n';
  const newContent = header + codeBlock + '\n' + sep + footer + '\n' + sep;

  try {
    await message.edit(newContent);
  } catch (err) {
    console.error('Ошибка при edit message:', err);
  }
}

// --- Восстановление опросов при старте (сканируем каналы и сообщения) ---
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('🔍 Scanning channels for existing polls...');

  for (const [, channel] of client.channels.cache) {
    if (!channel.isTextBased?.()) continue;
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      for (const msg of messages.values()) {
        if (msg.author.bot && msg.content.startsWith('📊')) {
          // parse header
          const lines = msg.content.split('\n');
          const second = lines[1] || '';
          const third = lines[2] || '';
          const topic = (second.replace(/^#\s*/,'') || 'Без темы').trim();
          const authorMatch = third.match(/by:\s*(.*)$/i);
          const author = authorMatch ? authorMatch[1].trim() : 'Неизвестный пользователь';

          // fetch reactions
          const upUsers = await msg.reactions.cache.get('👍')?.users.fetch().catch(()=>null);
          const midUsers = await msg.reactions.cache.get('🙏')?.users.fetch().catch(()=>null);
          const downUsers = await msg.reactions.cache.get('👎')?.users.fetch().catch(()=>null);

          const upSet = new Set(upUsers ? upUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
          const midSet = new Set(midUsers ? midUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
          const downSet = new Set(downUsers ? downUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);

          // decide optionsCount: if mid reaction exists OR has users -> 3 else 2
          const optionsCount = ( (msg.reactions.cache.has('🙏')) || (midSet.size>0) ) ? 3 : 2;

          polls.set(msg.id, { topic, author, optionsCount, votes: { a: upSet, b: midSet, c: downSet } });

          // update visual to normalize format (remove duplicates, ensure consistent header)
          await updatePollMessage(msg, polls.get(msg.id));
        }
      }
    } catch (err) {
      // ignore channels we can't access
    }
  }

  console.log(`🗂 Active polls loaded: ${polls.size}`);
  app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));
});

// === Login ===
client.login(process.env.DISCORD_TOKEN);
