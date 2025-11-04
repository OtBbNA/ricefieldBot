import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';
import {
Client,
GatewayIntentBits,
Partials,
Events,
} from 'discord.js';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// polls map
const polls = new Map();
const ignoreRemovals = new Set();

// helper to get emoji name
function safeEmojiName(e) {
  if (!e) return null;
  if (typeof e === 'string') return e;
  if (e.name) return e.name;
  return e.toString();
}

// ANSI helpers
const esc = (code) => `\x1b[${code}m`;
const rst = '\x1b[0m';

// --- Slash endpoint ---
app.post(
  '/interactions',
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async (req, res) => {
    const { type, data } = req.body;

    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    // --- /market ---
    if (type === InteractionType.APPLICATION_COMMAND && data.name === 'market') {
      const topic = data.options.find(o => o.name === 'topic')?.value || 'Без темы';
      const optionsCount = data.options.find(o => o.name === 'options')?.value === 3 ? 3 : 2;

      return res.send({
        type: InteractionResponseType.MODAL,
        data: buildLabelsModal(topic, optionsCount),
      });
    }

    // --- modal submit ---
    if (type === InteractionType.MODAL_SUBMIT && req.body.data.custom_id === 'market_labels') {
      return handleLabelsSubmit(req, res);
    }

    return res.status(400).send();
  }
);

// --- Build modal (RAW JSON, works 100%) ---
function buildLabelsModal(topic, optionsCount) {
  const fields = [];

  fields.push({
    type: 1,
    components: [{
      type: 4,
      custom_id: 'label1',
      label: '🟢 —',
      style: 1,
      min_length: 0,
      max_length: 50,
      required: false,
      value: 'да',
    }],
  });

  if (optionsCount === 3) {
    fields.push({
      type: 1,
      components: [{
        type: 4,
        custom_id: 'label2',
        label: '🔵 —',
        style: 1,
        min_length: 0,
        max_length: 50,
        required: false,
        value: 'ничья',
      }],
    });

    fields.push({
      type: 1,
      components: [{
        type: 4,
        custom_id: 'label3',
        label: '🔴 —',
        style: 1,
        min_length: 0,
        max_length: 50,
        required: false,
        value: 'нет',
      }],
    });
  } else {
    fields.push({
      type: 1,
      components: [{
        type: 4,
        custom_id: 'label2',
        label: '🔴 —',
        style: 1,
        min_length: 0,
        max_length: 50,
        required: false,
        value: 'нет',
      }],
    });
  }

  return {
    custom_id: 'market_labels',
    title: `Подписи к вариантам (${topic})`,
    components: fields,
  };
}

// --- modal submit logic ---
async function handleLabelsSubmit(req, res) {
  const { data, member, user } = req.body;

  const topic = data.title.replace(/^Подписи к вариантам \((.*)\)$/i, '$1');

  const author = member?.user?.username || user?.username || 'Неизвестный пользователь';

  const comps = data.components;

  const label1 = comps[0].components[0].value || '';
  const label2 = comps[1].components[0].value || '';
  const hasThird = comps.length === 3;
  const label3 = hasThird ? (comps[2].components[0].value || '') : '';

  const optionsCount = hasThird ? 3 : 2;

  const labelsText =
  optionsCount === 3
  ? `-# 🟢 — ${label1}, 🔵 — ${label2}, 🔴 — ${label3}`
  : `-# 🟢 — ${label1}, 🔴 — ${label2}`;

  const header = `📊\n# ${topic}\n-# by: ${author} | \u200Boptions:${optionsCount}\u200B\n\n`;

  const initialAnsi = generateEmptyAnsiFrameString();
  const content = header + '```ansi\n\n' + initialAnsi + '\n```' + '\n' + labelsText;

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
    },
  });
}

// --- messageCreate (unchanged except emojis) ---
client.on('messageCreate', async (message) => {
  try {
    if (!message.author?.bot) return;
    if (!message.content.startsWith('📊')) return;

    const lines = message.content.split('\n');
    const second = lines[1] || '';
    const third = lines[2] || '';

    const topic = (second.replace(/^#\s*/, '') || 'Без темы').trim();
    const authorMatch = third.match(/by:\s*(.*)$/i);
    const author = authorMatch ? authorMatch[1].trim() : 'Неизвестный пользователь';

    const markerMatch = message.content.match(/\u200Boptions:(\d)\u200B/);
    const optionsCount = markerMatch ? (parseInt(markerMatch[1], 10) === 3 ? 3 : 2) : 2;

    let upSet = new Set();
    let midSet = new Set();
    let downSet = new Set();

    try {
      const upUsers = await message.reactions.cache.get('🟢')?.users.fetch().catch(()=>null);
      const midUsers = await message.reactions.cache.get('🔵')?.users.fetch().catch(()=>null);
      const downUsers = await message.reactions.cache.get('🔴')?.users.fetch().catch(()=>null);

      upSet = new Set(upUsers ? upUsers.map(u=>u.id).filter(id=>id !== client.user.id) : []);
      midSet = new Set(midUsers ? midUsers.map(u=>u.id).filter(id=>id !== client.user.id) : []);
      downSet = new Set(downUsers ? downUsers.map(u=>u.id).filter(id=>id !== client.user.id) : []);
    } catch {}

    polls.set(message.id, {
      topic,
      author,
      optionsCount,
      votes: { a: upSet, b: midSet, c: downSet },
    });

    try {
      if (optionsCount === 3) {
        await message.react('🟢');
        await message.react('🔵');
        await message.react('🔴');
      } else {
        await message.react('🟢');
        await message.react('🔴');
      }
    } catch {}

    await updatePollMessage(message, polls.get(message.id));
  } catch (err) {
    console.error('messageCreate error', err);
  }
}

// --- reaction add/remove handlers ---
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const message = reaction.message;
  const poll = polls.get(message.id);
  if (!poll) return;

  const name = safeEmojiName(reaction.emoji);
  const allowed = poll.optionsCount === 3 ? ['🟢','🔵','🔴'] : ['🟢','🔴'];
  if (!allowed.includes(name)) {
    try { await reaction.users.remove(user.id); } catch {}
    return;
  }

  const { a, b, c } = poll.votes;

  if (name === '🟢') {
    if (b.has(user.id)) b.delete(user.id);
    if (c.has(user.id)) c.delete(user.id);

    if (poll.optionsCount === 3) {
      const opp = message.reactions.cache.get('🔵');
      if (opp && opp.users.cache.has(user.id)) {
        ignoreRemovals.add(`${message.id}_${user.id}`);
        try { await opp.users.remove(user.id); } catch {}
      }
    }
    const opp2 = message.reactions.cache.get('🔴');
    if (opp2 && opp2.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp2.users.remove(user.id); } catch {}
    }

    a.add(user.id);
    b.delete(user.id);
    c.delete(user.id);
  }

  else if (name === '🔵') {
    if (poll.optionsCount !== 3) {
      try { await reaction.users.remove(user.id); } catch {}
      return;
    }

    const opp1 = message.reactions.cache.get('🟢');
    const opp3 = message.reactions.cache.get('🔴');
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
  }

  else if (name === '🔴') {
    if (a.has(user.id)) a.delete(user.id);
    if (b.has(user.id)) b.delete(user.id);

    const opp = message.reactions.cache.get('🟢');
    if (opp && opp.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp.users.remove(user.id); } catch {}
    }
    if (poll.optionsCount === 3) {
      const opp2 = message.reactions.cache.get('🔵');
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
  const allowed = poll.optionsCount === 3 ? ['🟢','🔵','🔴'] : ['🟢','🔴'];
  if (!allowed.includes(name)) return;

  const key = `${message.id}_${user.id}`;
  if (ignoreRemovals.has(key)) {
    ignoreRemovals.delete(key);
    return;
  }

  poll.votes.a.delete(user.id);
  poll.votes.b.delete(user.id);
  poll.votes.c.delete(user.id);

  await updatePollMessage(message, poll);
});

// --- ANSI bar & frame functions (unchanged) ---
const SEGMENTS = 66;

function generateEmptyAnsiFrameString() {
  const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
  const middle = esc('1;30') + '┃' + rst + esc('1;30') + '▉'.repeat(SEGMENTS) + rst + esc('1;30') + '┃' + rst;
  const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;
  const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;
  return `${top}\n${middle}\n${bot}\n${sep}`;
}

function buildAnsiBarString(parts, totalVotes) {
  if (totalVotes === 0) return generateEmptyAnsiFrameString();

  const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
  const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;
  const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

  let inside = '';
  for (const p of parts) {
    if (p.count <= 0) continue;
    inside += esc(p.colorCode) + '▉'.repeat(p.count) + rst;
  }
  const filled = parts.reduce((s,p)=>s+(p.count||0),0);
  if (filled < SEGMENTS) {
    inside += esc('1;30') + '▉'.repeat(SEGMENTS - filled) + rst;
  }
  const middle = esc('1;30') + '┃' + rst + inside + esc('1;30') + '┃' + rst;
  return `${top}\n${middle}\n${bot}\n${sep}`;
}

// --- updatePollMessage (same as before except circles & labels preserved) ---
async function updatePollMessage(message, poll) {
  try {
    const [headerPart, ...rest] = message.content.split('```ansi');
    const labelsLine = rest.length > 1 ? rest[1].split('\n').slice(-1)[0] : '';

    const aCount = poll.votes.a.size;
    const bCount = poll.votes.b.size;
    const cCount = poll.votes.c.size;
    const total = aCount + bCount + cCount;

    const aPercent = total ? (aCount / total * 100) : 0;
    const bPercent = total ? (bCount / total * 100) : 0;
    const cPercent = total ? (cCount / total * 100) : 0;

    const pct = v => (v === 0 ? '0.00' : v.toFixed(1));
    const coef = (p, v) => (!total || v === 0 ? '0.00' : Math.max(1, (1/(p/100) - 0.1)).toFixed(2));

    const aCoef = coef(aPercent, aCount);
    const bCoef = coef(bPercent, bCount);
    const cCoef = coef(cPercent, cCount);

    const seg = p => Math.round((p/100) * SEGMENTS);

    let barStr = '';
    if (poll.optionsCount === 3) {
      if (total === 0) barStr = generateEmptyAnsiFrameString();
      else {
        const aSeg = seg(aPercent);
        const bSeg = seg(bPercent);
        const cSeg = Math.max(0, SEGMENTS - aSeg - bSeg);
        barStr = buildAnsiBarString([
          { count: aSeg, colorCode: '1;32' },
          { count: bSeg, colorCode: '1;34' },
          { count: cSeg, colorCode: '1;31' },
        ], total);
      }
    } else {
      if (total === 0) barStr = generateEmptyAnsiFrameString();
      else {
        const aSeg = seg(aPercent);
        const cSeg = Math.max(0, SEGMENTS - aSeg);
        barStr = buildAnsiBarString([
          { count: aSeg, colorCode: '1;32' },
          { count: cSeg, colorCode: '1;31' },
        ], total);
      }
    }

    const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

    let footer;
    if (poll.optionsCount === 3) {
      footer =
      `${esc('1;32')} ⬤ ${aCount} ┆ ${pct(aPercent)}% ┆ ${aCoef}${rst}  ${esc('1;30')}┃${rst} ` +
      `${esc('1;34')} ⬤ ${bCount} ┆ ${pct(bPercent)}% ┆ ${bCoef}${rst}  ${esc('1;30')}┃${rst} ` +
      `${esc('1;31')} ⬤ ${cCount} ┆ ${pct(cPercent)}% ┆ ${cCoef}${rst}`;
    } else {
      footer =
      `${esc('1;32')} ⬤ ${aCount} ┆ ${pct(aPercent)}% ┆ ${aCoef}${rst}             ${esc('1;30')}┃${rst}             ${esc('1;31')} ⬤ ${cCount} ┆ ${pct(cPercent)}% ┆ ${cCoef}${rst}`;
    }

    const newContent =
    headerPart.trimEnd() +
    '\n```ansi\n\n' +
    barStr + '\n' +
    sep + '\n' +
    footer + '\n' +
    sep + '\n```' +
    (labelsLine ? '\n' + labelsLine : '');

    await message.edit(newContent);
  } catch (err) {
    console.error('updatePollMessage error', err);
  }
}

// --- restore polls on startup ---
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('🔍 Scanning channels for existing polls...');

  for (const [, channel] of client.channels.cache) {
    if (!channel.isTextBased?.()) continue;
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      const botPolls = [...messages.values()].filter(m => m.author?.bot && m.content?.startsWith('📊'));
      botPolls.sort((a,b)=>a.createdTimestamp - b.createdTimestamp);

      for (const msg of botPolls) {
        const lines = msg.content.split('\n');
        const topic = (lines[1]?.replace(/^#\s*/,'') || 'Без темы').trim();
        const authorMatch = lines[2]?.match(/by:\s*(.*)$/i);
        const author = authorMatch ? authorMatch[1].trim() : 'Неизвестный пользователь';

        const markerMatch = msg.content.match(/\u200Boptions:(\d)\u200B/);
        const optionsCount = markerMatch
        ? (parseInt(markerMatch[1],10)===3 ? 3 : 2)
        : (msg.reactions.cache.has('🔵') ? 3 : 2);

        const upUsers = await msg.reactions.cache.get('🟢')?.users.fetch().catch(()=>null);
        const midUsers = await msg.reactions.cache.get('🔵')?.users.fetch().catch(()=>null);
        const downUsers = await msg.reactions.cache.get('🔴')?.users.fetch().catch(()=>null);

        const upSet = new Set(upUsers ? upUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
        const midSet = new Set(midUsers ? midUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
        const downSet = new Set(downUsers ? downUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);

        polls.set(msg.id, { topic, author, optionsCount, votes: { a: upSet, b: midSet, c: downSet } });

        await updatePollMessage(msg, polls.get(msg.id));
      }
    } catch {}
  }

  console.log(`🗂 Active polls loaded: ${polls.size}`);
  app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));
});

// --- login ---
client.login(process.env.DISCORD_TOKEN);

