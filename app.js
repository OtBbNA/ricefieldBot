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

function handleLabelsSubmit(body, res) {
  const [, token, count] = body.data.custom_id.split('|');
  const optionsCount = count === '3' ? 3 : 2;

  const topic = pendingTopics.get(token) || 'Без темы';
  pendingTopics.delete(token);

  const values = body.data.components.map(r =>
    r.components[0].value || 'N/A'
  );

  const labels =
    optionsCount === 3
      ? `-# 🟢 — ${values[0]}, 🔵 — ${values[1]}, 🔴 — ${values[2]}`
      : `-# 🟢 — ${values[0]}, 🔴 — ${values[1]}`;

  const content =
    `📊\n# ${topic}\n\n` +
    '```ansi\n' +
emptyBar() + '\n' +
sep() + '\n' +
emptyFooter(optionsCount) + '\n' +
sep() + '\n```' +
'\n' + labels;

return res.send({
type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
data: { content },
});
}

// ================== BAR ==================
const sep = () =>
esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

const emptyBar = () =>
esc('1;30') +
'┏' + '━'.repeat(SEGMENTS) + '┓\n' +
'┃' + '▉'.repeat(SEGMENTS) + '┃\n' +
'┗' + '━'.repeat(SEGMENTS) + '┛' +
rst;

const emptyFooter = c =>
c === 3
? `${esc('1;32')} ⬤ 0${rst} | ${esc('1;34')} ⬤ 0${rst} | ${esc('1;31')} ⬤ 0${rst}`
: `${esc('1;32')} ⬤ 0${rst} | ${esc('1;31')} ⬤ 0${rst}`;

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
