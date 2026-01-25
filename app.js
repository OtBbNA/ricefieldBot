import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
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

// ================== GLOBAL ==================
process.on('unhandledRejection', e => console.error('UNHANDLED:', e));
process.on('uncaughtException', e => console.error('UNCAUGHT:', e));

const app = express();
const PORT = process.env.PORT || 10000;

// ================== DISCORD CLIENT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ================== STATE ==================
const pendingTopics = new Map();

// ================== ANSI HELPERS ==================
const SEGMENTS = 66;
const esc = c => '\x1b[${c}m';
const rst = '\x1b[0m';



app.get('/ping', (_, res) => res.send('ok'));



app.post(
  '/interactions',
  express.raw({ type: '*/*' }),
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async (req, res) => {
    console.log('🔥 INTERACTION RECEIVED');

    const body = req.body;
    const { type, data } = body;

    // ===== PING =====
    if (type === InteractionType.PING) {
      console.log('🏓 PING');
      return res.send({ type: InteractionResponseType.PONG });
    }

    // ===== SLASH COMMANDS =====
    if (type === InteractionType.APPLICATION_COMMAND) {
      if (data.name === 'market') {
        return res.send({
          type: InteractionResponseType.MODAL,
          data: buildLabelsModal('Без темы', 2),
        });
      }
    }

    // ===== MODAL SUBMIT =====
    if (
      type === InteractionType.MODAL_SUBMIT &&
      data.custom_id.startsWith('market_labels|')
    ) {
      return handleLabelsSubmit(body, res);
    }

    return res.sendStatus(400);
  }
);

// ================== MODAL ==================

function buildLabelsModal(topic, optionsCount) {
  const token = Math.random().toString(36).slice(2, 8);
  pendingTopics.set(token, topic);
  setTimeout(() => pendingTopics.delete(token), 5 * 60_000);

  const fields = [
    row('label1', '🟢 —', 'да'),
    ...(optionsCount === 3 ? [row('label2', '🔵 —', 'ничья')] : []),
    row(optionsCount === 3 ? 'label3' : 'label2', '🔴 —', 'нет'),
  ];

  return {
    custom_id: `market_labels|${token}|${optionsCount}`,
    title: 'Подписи к вариантам',
    components: fields,
  };
}

const row = (id, label, value) => ({
  type: 1,
  components: [{
    type: 4,
    custom_id: id,
    style: 1,
    label,
    required: false,
    max_length: 100,
    value,
  }],
});

// ================== MODAL SUBMIT ==================

async function handleLabelsSubmit(body, res) {
    const [, token, count] = body.data.custom_id.split('|');
    const optionsCount = count === '3' ? 3 : 2;

    const topic = pendingTopics.get(token) || 'Без темы';
    pendingTopics.delete(token);

    const author =
    body.member?.user?.username ||
    body.user?.username ||
    'Unknown';

    const values = body.data.components.map(r =>
    r.components[0].value?.trim() || 'N/A'
    );

    const labels =
    optionsCount === 3
    ? `-# 🟢 — ${values[0]}, 🔵 — ${values[1]}, 🔴 — ${values[2]}`
    : `-# 🟢 — ${values[0]}, 🔴 — ${values[1]}`;

    const content =
    `📊\n# ${topic}\n-# by: ${author}\n\n` +
    buildPollAnsi(optionsCount, { a: 0, b: 0, c: 0 }) +
    '\n' + labels;

    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content },
    });
}

const SEGMENTS = 66;

const COLORS = {
    gray: '1;30',
    green: '1;32',
    blue: '1;34',
    red: '1;31',
};

function buildPollAnsi(optionsCount, votes) {
    const total = votes.a + votes.b + votes.c || 1;

    const aSeg = Math.round((votes.a / total) * SEGMENTS);
    const bSeg = optionsCount === 3
    ? Math.round((votes.b / total) * SEGMENTS)
    : 0;
    const cSeg = SEGMENTS - aSeg - bSeg;

    let bar =
    esc(COLORS.green) + '▉'.repeat(aSeg) +
    (optionsCount === 3 ? esc(COLORS.blue) + '▉'.repeat(bSeg) : '') +
    esc(COLORS.red) + '▉'.repeat(cSeg) +
    rst;

    return (
    '```ansi\n' +
    esc(COLORS.gray) + '┏' + '━'.repeat(SEGMENTS) + '┓\n' +
    '┃' + bar + '┃\n' +
    '┗' + '━'.repeat(SEGMENTS) + '┛\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    footer(optionsCount, votes) +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '```'
    );
}

function footer(c, v) {
    return c === 3
    ? `${esc(COLORS.green)} ⬤ ${v.a}${rst} | ${esc(COLORS.blue)} ⬤ ${v.b}${rst} | ${esc(COLORS.red)} ⬤ ${v.c}${rst}`
    : `${esc(COLORS.green)} ⬤ ${v.a}${rst} | ${esc(COLORS.red)} ⬤ ${v.c}${rst}`;
}

client.on('messageCreate', async msg => {
    if (!msg.author.bot) return;
    if (!msg.content.startsWith('📊')) return;

    polls.set(msg.id, {
        optionsCount: msg.content.includes('🔵') ? 3 : 2,
        votes: { a: new Set(), b: new Set(), c: new Set() },
    });

    await msg.react('🟢');
    if (polls.get(msg.id).optionsCount === 3) await msg.react('🔵');
    await msg.react('🔴');
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const poll = polls.get(reaction.message.id);
    if (!poll) return;

    const name = reaction.emoji.name;
    const allowed = poll.optionsCount === 3
    ? ['🟢','🔵','🔴']
    : ['🟢','🔴'];

    if (!allowed.includes(name)) {
        return reaction.users.remove(user.id);
    }

    // удалить другие реакции пользователя
    for (const r of reaction.message.reactions.cache.values()) {
        if (r.emoji.name !== name && r.users.cache.has(user.id)) {
            await r.users.remove(user.id).catch(()=>{});
        }
    }

    poll.votes.a.delete(user.id);
    poll.votes.b.delete(user.id);
    poll.votes.c.delete(user.id);

    if (name === '🟢') poll.votes.a.add(user.id);
    if (name === '🔵') poll.votes.b.add(user.id);
    if (name === '🔴') poll.votes.c.add(user.id);

    await redrawPoll(reaction.message, poll);
});

async function redrawPoll(msg, poll) {
    const votes = {
        a: poll.votes.a.size,
        b: poll.votes.b.size,
        c: poll.votes.c.size,
    };

    const [header, , labels] = msg.content.split('```');

    const content =
    header +
    buildPollAnsi(poll.optionsCount, votes) +
    labels;

    await msg.edit(content);
}


// ================== CLIENT READY ==================
client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    setInterval(() => {
fetch(`${process.env.RENDER_EXTERNAL_URL}/ping`)
    .then(() => console.log('💤 Self-ping OK'))
    .catch(() => {});
}, 60_000);
});

// ================== START ==================
app.listen(PORT, () =>
console.log(`🌐 Express listening on ${PORT}`)
);

client.login(process.env.DISCORD_TOKEN);
