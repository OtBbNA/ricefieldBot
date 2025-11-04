// app.js — полный, готовый
import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';

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

// polls map: messageId => { topic, author, optionsCount, votes: { a:Set, b:Set, c:Set } }
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

    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = data;
      if (name !== 'market') return res.status(400).send();

      // parse options: topic (string), options (int 2/3)
      const topic = (options.find(o => o.name === 'topic')?.value) || 'Без темы';
      const optsVal = options.find(o => o.name === 'options')?.value;
      const optionsCount = optsVal === 3 ? 3 : 2;

      const author =
      req.body.member?.user?.username ||
      req.body.user?.username ||
      'Неизвестный пользователь';

      // Compose header — visible part
      const header = `📊\n# ${topic}\n-# by: ${author} | \u200Boptions:${optionsCount}\u200B\n\n`;

      // Immediately respond — messageCreate will catch the created message and register poll
      // We include an initial ANSI placeholder (empty gray bar); messageCreate/update will rewrite it.
      const initialAnsi = generateEmptyAnsiFrameString();

      const content = header + '```ansi\n\n' + initialAnsi + '\n```';

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content,
        },
      });
    }

    return res.status(400).send();
  }
);

// --- messageCreate: when bot posts the market message we add reactions and register poll ---
client.on('messageCreate', async (message) => {
  try {
    if (!message.author?.bot) return;
    if (!message.content.startsWith('📊')) return;

    // parse header: first three lines are expected
    const lines = message.content.split('\n');
    const second = lines[1] || '';
    const third = lines[2] || '';

    const topic = (second.replace(/^#\s*/, '') || 'Без темы').trim();
    const authorMatch = third.match(/by:\s*(.*)$/i);
    const author = authorMatch ? authorMatch[1].trim() : 'Неизвестный пользователь';

    // detect options marker (invisible)
    const markerMatch = message.content.match(/\u200Boptions:(\d)\u200B/);
    const optionsCount = markerMatch ? (parseInt(markerMatch[1], 10) === 3 ? 3 : 2) : 2;

    // fetch existing reactions users to restore votes if any
    let upSet = new Set();
    let midSet = new Set();
    let downSet = new Set();
    try {
      const upUsers = await message.reactions.cache.get('👍')?.users.fetch().catch(()=>null);
      const midUsers = await message.reactions.cache.get('🤝')?.users.fetch().catch(()=>null);
      const downUsers = await message.reactions.cache.get('👎')?.users.fetch().catch(()=>null);

      upSet = new Set(upUsers ? upUsers.map(u=>u.id).filter(id=>id !== client.user.id) : []);
      midSet = new Set(midUsers ? midUsers.map(u=>u.id).filter(id=>id !== client.user.id) : []);
      downSet = new Set(downUsers ? downUsers.map(u=>u.id).filter(id=>id !== client.user.id) : []);
    } catch (e) {
      // ignore
    }

    polls.set(message.id, {
      topic,
      author,
      optionsCount,
      votes: { a: upSet, b: midSet, c: downSet },
    });

    // ensure correct reactions exist
    try {
      if (optionsCount === 3) {
        await message.react('👍');
        await message.react('🤝');
        await message.react('👎');
      } else {
        await message.react('👍');
        await message.react('👎');
      }
    } catch (err) {
      // ignore reaction errors
    }

    // normalize visual (rewrite content)
    await updatePollMessage(message, polls.get(message.id));
  } catch (err) {
    console.error('messageCreate error', err);
  }
});

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
  const allowed = poll.optionsCount === 3 ? ['👍','🤝','👎'] : ['👍','👎'];
  if (!allowed.includes(name)) {
    // remove foreign emoji
    try { await reaction.users.remove(user.id); } catch {}
    return;
  }

  const { a, b, c } = poll.votes;

  if (name === '👍') {
    // remove user from others
    if (b.has(user.id)) b.delete(user.id);
    if (c.has(user.id)) c.delete(user.id);

    // visual removal of other reactions
    if (poll.optionsCount === 3) {
      const opp = message.reactions.cache.get('🤝');
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
  } else if (name === '🤝') {
    if (poll.optionsCount !== 3) {
      try { await reaction.users.remove(user.id); } catch {}
      return;
    }
    // remove others visually
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
    if (a.has(user.id)) a.delete(user.id);
    if (b.has(user.id)) b.delete(user.id);

    // visual removal
    const opp = message.reactions.cache.get('👍');
    if (opp && opp.users.cache.has(user.id)) {
      ignoreRemovals.add(`${message.id}_${user.id}`);
      try { await opp.users.remove(user.id); } catch {}
    }
    if (poll.optionsCount === 3) {
      const opp2 = message.reactions.cache.get('🤝');
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
  const allowed = poll.optionsCount === 3 ? ['👍','🤝','👎'] : ['👍','👎'];
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

// --- ANSI frame / bar generators ---

const SEGMENTS = 66;

function generateEmptyAnsiFrameString() {
  // produce a full ANSI block as string (without wrapping ```)
  const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
  const middle = esc('1;30') + '┃' + rst + esc('1;30') + '▉'.repeat(SEGMENTS) + rst + esc('1;30') + '┃' + rst;
  const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;
  const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;
  return `${top}\n${middle}\n${bot}\n${sep}`;
}

function buildAnsiBarString(parts, totalVotes) {
  // parts: array [{count, colorCode}] sum of count <= SEGMENTS
  // if totalVotes == 0 => full gray frame via generateEmptyAnsiFrameString
  if (totalVotes === 0) return generateEmptyAnsiFrameString();

  const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
  const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;
  const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

  let inside = '';
  for (const p of parts) {
    if (p.count <= 0) continue;
    inside += esc(p.colorCode) + '▉'.repeat(p.count) + rst;
  }
  const tot = parts.reduce((s,p)=>s+(p.count||0),0);
  if (tot < SEGMENTS) {
    inside += esc('1;30') + '▉'.repeat(SEGMENTS - tot) + rst;
  }
  const middle = esc('1;30') + '┃' + rst + inside + esc('1;30') + '┃' + rst;
  return `${top}\n${middle}\n${bot}\n${sep}`;
}

// --- Update message visual ---
async function updatePollMessage(message, poll) {
  try {
    const aCount = poll.votes.a.size;
    const bCount = poll.votes.b.size;
    const cCount = poll.votes.c.size;
    const total = aCount + bCount + cCount;

    const aPercent = total ? (aCount / total * 100) : 0;
    const bPercent = total ? (bCount / total * 100) : 0;
    const cPercent = total ? (cCount / total * 100) : 0;

    const pctFmt = (v) => (v === 0 ? '00.0' : v.toFixed(1));
    const aPctStr = total ? aPercent.toFixed(1) : '00.0';
    const bPctStr = total ? bPercent.toFixed(1) : '00.0';
    const cPctStr = total ? cPercent.toFixed(1) : '00.0';

    const coefFor = (percent, votes) => {
      if (!total || votes === 0) return '0.00';
      const p = percent / 100;
      const raw = (1 / p) - 0.1;
      const fixed = raw < 1 ? 1.00 : raw;
      return fixed.toFixed(2);
    };

    const aCoef = coefFor(aPercent, aCount);
    const bCoef = coefFor(bPercent, bCount);
    const cCoef = coefFor(cPercent, cCount);

    // build segments count
    const segFromPercent = (p) => Math.round((p / 100) * SEGMENTS);

    let barStr = '';
    if (poll.optionsCount === 3) {
      if (total === 0) {
        barStr = generateEmptyAnsiFrameString();
      } else {
        const aSeg = segFromPercent(aPercent);
        const bSeg = segFromPercent(bPercent);
        let sumSeg = aSeg + bSeg;
        let cSeg = SEGMENTS - sumSeg;
        if (cSeg < 0) cSeg = 0;
        const parts = [
          { count: aSeg, colorCode: '1;32' }, // green
          { count: bSeg, colorCode: '1;34' }, // blue
          { count: cSeg, colorCode: '1;31' }, // red
        ];
        barStr = buildAnsiBarString(parts, total);
      }
    } else {
      // 2 options: a (green) then c (red)
      if (total === 0) {
        barStr = generateEmptyAnsiFrameString();
      } else {
        const aSeg = segFromPercent(aPercent);
        let cSeg = SEGMENTS - aSeg;
        if (cSeg < 0) cSeg = 0;
        const parts = [
          { count: aSeg, colorCode: '1;32' },
          { count: cSeg, colorCode: '1;31' },
        ];
        barStr = buildAnsiBarString(parts, total);
      }
    }

    // footer line inside ANSI block
    let footerLine = '';
    if (poll.optionsCount === 3) {
      footerLine =
      ` 👍 ${esc('1;32')}${aCount} ┆ ${aPctStr}% ┆ ${aCoef}${rst}  ${esc('1;30')}┃${rst} ` +
      ` 🤝 ${esc('1;34')}${bCount} ┆ ${bPctStr}% ┆ ${bCoef}${rst}  ${esc('1;30')}┃${rst} ` +
      ` 👎 ${esc('1;31')}${cCount} ┆ ${cPctStr}% ┆ ${cCoef}${rst}`;
    } else {
      footerLine =
      ` 👍 ${esc('1;32')}${aCount} ┆ ${aPctStr}% ┆ ${aCoef}${rst}             ${esc('1;30')}┃${rst}             👎 ${esc('1;31')}${cCount} ┆ ${cPctStr}% ┆ ${cCoef}${rst}`;
    }

    const sep = esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

    // header (visible)
    const header = `📊\n# ${poll.topic}\n-# by: ${poll.author} | \u200Boptions:${poll.optionsCount}\u200B\n\n`;

    // Put EVERYTHING inside the ansi block (bar + sep + footer + sep)
    const codeBlock =
    '```ansi\n\n' +
    barStr + '\n' +
    // footer & separators inside the code block
    sep + '\n' +
    footerLine + '\n' +
    sep + '\n' +
    '```';

    const newContent = header + codeBlock;

    await message.edit(newContent);
  } catch (err) {
    console.error('updatePollMessage error', err);
  }
}

// --- restore polls at startup by scanning channels ---
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('🔍 Scanning channels for existing polls...');

  for (const [, channel] of client.channels.cache) {
    if (!channel.isTextBased?.()) continue;
    try {
      const messages = await channel.messages.fetch({ limit: 50 });
      // sort by createdTimestamp ascending to keep original order
      const botPolls = [...messages.values()].filter(m => m.author?.bot && m.content?.startsWith('📊'));
      // process in natural order (oldest first)
      botPolls.sort((a,b)=>a.createdTimestamp - b.createdTimestamp);
      for (const msg of botPolls) {
        const lines = msg.content.split('\n');
        const second = lines[1] || '';
        const third = lines[2] || '';
        const topic = (second.replace(/^#\s*/,'') || 'Без темы').trim();
        const authorMatch = third.match(/by:\s*(.*)$/i);
        const author = authorMatch ? authorMatch[1].trim() : 'Неизвестный пользователь';

        // detect options marker
        const markerMatch = msg.content.match(/\u200Boptions:(\d)\u200B/);
        const optionsCount = markerMatch ? (parseInt(markerMatch[1],10)===3 ? 3 : 2) : ( (msg.reactions.cache.has('🤝')) ? 3 : 2 );

        // fetch reaction users
        const upUsers = await msg.reactions.cache.get('👍')?.users.fetch().catch(()=>null);
        const midUsers = await msg.reactions.cache.get('🤝')?.users.fetch().catch(()=>null);
        const downUsers = await msg.reactions.cache.get('👎')?.users.fetch().catch(()=>null);

        const upSet = new Set(upUsers ? upUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
        const midSet = new Set(midUsers ? midUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);
        const downSet = new Set(downUsers ? downUsers.map(u=>u.id).filter(id=>id!==client.user.id) : []);

        polls.set(msg.id, { topic, author, optionsCount, votes: { a: upSet, b: midSet, c: downSet } });

        // normalize display (this will ensure header formatting + hidden marker present)
        await updatePollMessage(msg, polls.get(msg.id));
      }
    } catch (err) {
      // ignore channels we can't access
    }
  }

  console.log(`🗂 Active polls loaded: ${polls.size}`);
  app.listen(PORT, () => console.log(`🌐 Express listening on port ${PORT}`));
});

// --- login ---
client.login(process.env.DISCORD_TOKEN);
