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
const polls = new Map();
const pendingTopics = new Map();
const ignoreRemovals = new Set();

// ================== ANSI HELPERS ==================
const SEGMENTS = 66;
const esc = c => `\x1b[${c}m`;
const rst = '\x1b[0m';

// ================== EXPRESS ==================
app.get('/ping', (_, res) => res.send('ok'));

// ❗ JSON ВЕЗДЕ, КРОМЕ /interactions
app.use((req, res, next) => {
    if (req.path === '/interactions') return next();
    express.json()(req, res, next);
});

// ================== INTERACTIONS ==================
app.post(
    '/interactions',
    express.raw({ type: '*/*' }),
    verifyKeyMiddleware(process.env.PUBLIC_KEY),
    async (req, res) => {
        let body;

        try {
            body = JSON.parse(req.body.toString());
        } catch {
            console.error('❌ BODY PARSE FAILED');
            return res.sendStatus(400);
        }

        const { type, data } = body;

        // ===== PING =====
        if (type === InteractionType.PING) {
            return res.send({ type: InteractionResponseType.PONG });
        }

        // ===== /market =====
        if (type === InteractionType.APPLICATION_COMMAND && data.name === 'market') {
            const topic = data.options.find(o => o.name === 'topic')?.value || 'Без темы';
            const optionsCount =
            data.options.find(o => o.name === 'options')?.value === 3 ? 3 : 2;

            return res.send({
                type: InteractionResponseType.MODAL,
                data: buildLabelsModal(topic.slice(0, 300), optionsCount),
            });
        }

        // ===== /rate =====
        if (type === InteractionType.APPLICATION_COMMAND && data.name === 'rate') {
            const link = data.options.find(o => o.name === 'message')?.value;
            const match = link?.match(/channels\/(\d+)\/(\d+)\/(\d+)/);

            if (!match) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: '❌ Неверная ссылка.' },
                });
            }

            res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

            const [, , channelId, messageId] = match;

            setTimeout(async () => {
                try {
                    const channel = await client.channels.fetch(channelId);
                    const msg = await channel.messages.fetch(messageId);
                    for (const e of ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']) {
                        await msg.react(e);
                    }

                    // удалить "думает..."
                    await fetch(
                        `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`,
                        { method: 'DELETE' }
                    );
                } catch (e) {
                    console.error('rate error:', e);
                }
            }, 100);

            return;
        }

        // ===== MODAL SUBMIT =====
        if (
        type === InteractionType.MODAL_SUBMIT &&
        data.custom_id?.startsWith('market_labels|')
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

// ================== MODAL SUBMIT HANDLER ==================
async function handleLabelsSubmit(body, res) {
    const [, token, count] = body.data.custom_id.split('|');
    const optionsCount = count === '3' ? 3 : 2;

    const topic = pendingTopics.get(token) || 'Без темы';
    pendingTopics.delete(token);

    const values = body.data.components.map(r => r.components[0].value || '');

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
const sep = () => esc('1;30') + '━'.repeat(SEGMENTS + 2) + rst;

const emptyBar = () =>
esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓\n' +
'┃' + '▉'.repeat(SEGMENTS) + '┃\n' +
'┗' + '━'.repeat(SEGMENTS) + '┛' + rst;

const emptyFooter = c =>
c === 3
? `${esc('1;32')} ⬤ 0 ${rst} | ${esc('1;34')} ⬤ 0 ${rst} | ${esc('1;31')} ⬤ 0 ${rst}`
: `${esc('1;32')} ⬤ 0 ${rst} | ${esc('1;31')} ⬤ 0 ${rst}`;

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
