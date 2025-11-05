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

// polls in-memory: messageId => { topic, author, optionsCount, votes: { a:Set, b:Set, c:Set } }
const polls = new Map();
const ignoreRemovals = new Set();

// ANSI helpers
const esc = (code) => `\x1b[${code}m`;
const rst = '\x1b[0m';
const SEGMENTS = 66;

// helper to get emoji name
function safeEmojiName(e) {
  if (!e) return null;
  if (typeof e === 'string') return e;
  if (e.name) return e.name;
  return e.toString();
}

// --- Build modal JSON for Discord (components) ---
// We'll encode topic via encodeURIComponent and pack into custom_id
function buildLabelsModal(topic, optionsCount) {
  // custom id: market_labels|{encodedTopic}|{optionsCount}
  const encoded = encodeURIComponent(topic).replace(/\|/g, '%7C');
  const customId = `market_labels|${encoded}|${optionsCount}`;

  const fields = [];

  // label1 -> 🟢
  fields.push({
    type: 1,
    components: [
      {
        type: 4,
        custom_id: 'label1',
        style: 1, // short text
        label: '🟢 —',
        min_length: 0,
        max_length: 100,
        required: false,
        // initial value doesn't work universally in discord modal via interactions, but it's harmless
        // some clients ignore `value` - keep it optional; the default will be applied server-side if empty
        value: 'да',
      },
    ],
  });

  if (optionsCount === 3) {
    fields.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: 'label2',
          style: 1,
          label: '🔵 —',
          min_length: 0,
          max_length: 100,
          required: false,
          value: 'ничья',
        },
      ],
    });

    fields.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: 'label3',
          style: 1,
          label: '🔴 —',
          min_length: 0,
          max_length: 100,
          required: false,
          value: 'нет',
        },
      ],
    });
  } else {
    // optionsCount === 2 -> label2 is red
    fields.push({
      type: 1,
      components: [
        {
          type: 4,
          custom_id: 'label2',
          style: 1,
          label: '🔴 —',
          min_length: 0,
          max_length: 100,
          required: false,
          value: 'нет',
        },
      ],
    });
  }

  return {
    custom_id: customId,
    title: `Подписи к вариантам`,
    components: fields,
  };
}

// --- generate empty ANSI frame (string without the code-fence) ---
function generateEmptyAnsiFrameString() {
  const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
  const middle = esc('1;30') + '┃' + rst + esc('1;30') + '▉'.repeat(SEGMENTS) + rst + esc('1;30') + '┃' + rst;
  const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;
  return `${top}\n${middle}\n${bot}\n`;
}

function buildAnsiBarString(parts, totalVotes) {
  if (totalVotes === 0) return generateEmptyAnsiFrameString();

  const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
  const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;

  let inside = '';
  for (const p of parts) {
    if (!p.count || p.count <= 0) continue;
    inside += esc(p.colorCode) + '▉'.repeat(p.count) + rst;
  }
  const filled = parts.reduce((s,p)=>s+(p.count||0),0);
  if (filled < SEGMENTS) inside += esc('1;30') + '▉'.repeat(SEGMENTS - filled) + rst;

  const middle = esc('1;30') + '┃' + rst + inside + esc('1;30') + '┃' + rst;
  const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;
  return `${top}\n${middle}\n${bot}\n${sep}`;
}

async function updatePollMessage(message, poll) {
  try {
    const [headerPart, ...rest] = message.content.split('```ansi');

    // extract labels (everything after final ```), one-line forced
    let labelsLine = '';
    const lastBlock = rest.length > 0 ? rest[rest.length - 1] : '';
    if (lastBlock.includes('```')) {
      const afterFence = lastBlock.split('```')[1] || '';
      labelsLine = afterFence.trim().replace(/\s+/g, ' ');
    }

    const aCount = poll.votes.a.size;
    const bCount = poll.votes.b.size;
    const cCount = poll.votes.c.size;
    const total = aCount + bCount + cCount;

    const pct = (v) => (v === 0 ? '0.00' : v.toFixed(1));
    const seg = (p) => Math.round((p / 100) * SEGMENTS);

    const aPercent = total ? (aCount / total * 100) : 0;
    const bPercent = total ? (bCount / total * 100) : 0;
    const cPercent = total ? (cCount / total * 100) : 0;

    const coef = (p, v) => (!total || v === 0 ? '0.00' : Math.max(1, (1 / (p / 100) - 0.1)).toFixed(2));

    const aCoef = coef(aPercent, aCount);
    const bCoef = coef(bPercent, bCount);
    const cCoef = coef(cPercent, cCount);

    let barStr;
    if (total === 0) {
      barStr = generateEmptyAnsiFrameString();
    } else if (poll.optionsCount === 3) {
      const aSeg = seg(aPercent);
      const bSeg = seg(bPercent);
      const cSeg = Math.max(0, SEGMENTS - aSeg - bSeg);
      barStr = buildAnsiBarString([
        { count: aSeg, colorCode: '1;32' },
        { count: bSeg, colorCode: '1;34' },
        { count: cSeg, colorCode: '1;31' },
      ], total);
    } else {
      const aSeg = seg(aPercent);
      const cSeg = Math.max(0, SEGMENTS - aSeg);
      barStr = buildAnsiBarString([
        { count: aSeg, colorCode: '1;32' },
        { count: cSeg, colorCode: '1;31' },
      ], total);
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
      `${esc('1;32')} ⬤ ${aCount} ┆ ${pct(aPercent)}% ┆ ${aCoef}${rst}             ` +
      `${esc('1;30')}┃${rst}             ` +
      `${esc('1;31')} ⬤ ${cCount} ┆ ${pct(cPercent)}% ┆ ${cCoef}${rst}`;
    }

    const newContent =
    headerPart.trimEnd() +
    '\n```ansi\n' +
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


// --- interactions endpoint (slash + modal submit) ---
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    // Slash: /market
    if (type === InteractionType.APPLICATION_COMMAND && data.name === 'market') {
      // parse options
      const topic = data.options.find(o => o.name === 'topic')?.value || 'Без темы';
      const optionsCount = data.options.find(o => o.name === 'options')?.value === 3 ? 3 : 2;

      // show modal
      return res.send({
        type: InteractionResponseType.MODAL,
        data: buildLabelsModal(topic, optionsCount),
      });
    }

    // Modal submit
    if (type === InteractionType.MODAL_SUBMIT && data && typeof data.custom_id === 'string' && data.custom_id.startsWith('market_labels|')) {
      // handle modal
      // respond via handler which will return a CHANNEL_MESSAGE_WITH_SOURCE
      return handleLabelsSubmit(req, res);
    }

    return res.status(400).send();
  } catch (err) {
    console.error('interactions error', err);
    // reply with generic failure to Discord to avoid "interaction failed" message
    try { return res.status(500).send({ error: 'server error' }); } catch { return; }
  }
});

async function handleLabelsSubmit(req, res) {
  try {
    const { data, member, user } = req.body;
    // custom_id encoded earlier: market_labels|{encodedTopic}|{optionsCount}
    const rawCustom = (data && data.custom_id) || '';
    const parts = rawCustom.split('|');
    // second part is encoded topic
    const encodedTopic = parts[1] || '';
    const optionsCount = parseInt(parts[2], 10) === 3 ? 3 : 2;
    let topic = 'Без темы';
    try {
      topic = decodeURIComponent(encodedTopic);
    } catch { topic = encodedTopic || 'Без темы'; }

    const author = member?.user?.username || user?.username || 'Неизвестный пользователь';

    // Components -> data.components (array of action rows)
    const comps = data.components || [];

    // extract values safely
    const getVal = (index) => {
      if (!comps[index] || !comps[index].components || !comps[index].components[0]) return '';
      return String(comps[index].components[0].value || '').trim();
    };

    const label1raw = getVal(0);
    const label2raw = getVal(1);
    // label3 may or may not exist depending on optionsCount
    const label3raw = optionsCount === 3 ? getVal(2) : '';

    // apply fallback when empty
    const fallback = 'Пользователь не задал текст';
    const label1 = label1raw || 'да' || fallback;
    const label2 = label2raw || (optionsCount === 3 ? 'ничья' : 'нет') || fallback;
    const label3 = optionsCount === 3 ? (label3raw || 'нет' || fallback) : '';

    // build labels line (single-line)
    const labelsText = optionsCount === 3
    ? `-# 🟢 — ${label1},   🔵 — ${label2},   🔴 — ${label3}`
    : `-# 🟢 — ${label1},   🔴 — ${label2}`;

    const header = `📊\n# ${topic}\n-# by: ${author} | \u200Boptions:${optionsCount}\u200B\n\n`;

    // initial ansi frame (no sep inside)
    const initialAnsi = generateEmptyAnsiFrameString();

    // build sep & empty footer locally (so we don't depend on generateEmptyAnsiFrameString to provide sep)
    const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

    const emptyFooter = optionsCount === 3
    ? `${esc('1;32')} ⬤ 0 ┆ 0.00% ┆ 0.00${rst}  ${esc('1;30')}┃${rst} ` +
    `${esc('1;34')} ⬤ 0 ┆ 0.00% ┆ 0.00${rst}  ${esc('1;30')}┃${rst} ` +
    `${esc('1;31')} ⬤ 0 ┆ 0.00% ┆ 0.00${rst}`
    : `${esc('1;32')} ⬤ 0 ┆ 0.00% ┆ 0.00${rst}` +
    `             ${esc('1;30')}┃${rst}             ` +
    `${esc('1;31')} ⬤ 0 ┆ 0.00% ┆ 0.00${rst}`;

    const content =
    header +
    '```ansi\n' +
    initialAnsi + '\n' +
    sep + '\n' +
    emptyFooter + '\n' +
    sep + '\n' +
    '```' +
    '\n' +
    labelsText;

    // respond with created message
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content,
      },
    });
  } catch (err) {
    console.error('handleLabelsSubmit error', err);
    // ensure we answer so Discord doesn't show "interaction failed"
    try {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Произошла ошибка при создании опроса.' },
      });
    } catch { return; }
  }
}


// --- messageCreate: register bot-created polls, ensure reactions, restore votes
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

    // options marker hidden
    const markerMatch = message.content.match(/\u200Boptions:(\d)\u200B/);
    const optionsCount = markerMatch ? (parseInt(markerMatch[1], 10) === 3 ? 3 : 2) : 2;

    // fetch reaction users (if any)
    let upSet = new Set();
    let midSet = new Set();
    let downSet = new Set();
    try {
      const upUsers = await message.reactions.cache.get('🟢')?.users.fetch().catch(()=>null);
      const midUsers = await message.reactions.cache.get('🔵')?.users.fetch().catch(()=>null);
      const downUsers = await message.reactions.cache.get('🔴')?.users.fetch().catch(()=>null);

      upSet = new Set(upUsers ? upUsers.map(u => u.id).filter(id => id !== client.user.id) : []);
      midSet = new Set(midUsers ? midUsers.map(u => u.id).filter(id => id !== client.user.id) : []);
      downSet = new Set(downUsers ? downUsers.map(u => u.id).filter(id => id !== client.user.id) : []);
    } catch {}

    polls.set(message.id, {
      topic,
      author,
      optionsCount,
      votes: { a: upSet, b: midSet, c: downSet },
    });

    // ensure reactions exist
    try {
      if (optionsCount === 3) {
        await message.react('🟢');
        await message.react('🔵');
        await message.react('🔴');
      } else {
        await message.react('🟢');
        await message.react('🔴');
      }
    } catch (err) {
      // ignore
    }

    // normalize visual
    await updatePollMessage(message, polls.get(message.id));
  } catch (err) {
    console.error('messageCreate error', err);
  }
});

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
  } else if (name === '🔵') {
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
  } else if (name === '🔴') {
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

// --- restore polls at startup ---
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
        const optionsCount = markerMatch ? (parseInt(markerMatch[1],10)===3 ? 3 : 2) : (msg.reactions.cache.has('🔵') ? 3 : 2);

        const upUsers = await msg.reactions.cache.get('🟢')?.users.fetch().catch(()=>null);
        const midUsers = await msg.reactions.cache.get('🔵')?.users.fetch().catch(()=>null);
        const downUsers = await msg.reactions.cache.get('🔴')?.users.fetch().catch(()=>null);

        const upSet = new Set(upUsers ? upUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
        const midSet = new Set(midUsers ? midUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
        const downSet = new Set(downUsers ? downUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);

        polls.set(msg.id, { topic, author, optionsCount, votes: { a: upSet, b: midSet, c: downSet } });

        // normalize display (ensures header formatting + keeps labels if present)
        await updatePollMessage(msg, polls.get(msg.id));
      }
    } catch (err) {
      // ignore channels we can't access
    }
  }

  console.log(`🗂 Active polls loaded: ${polls.size}`);
  app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));
});

client.login(process.env.DISCORD_TOKEN);
