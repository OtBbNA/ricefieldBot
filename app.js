import 'dotenv/config';
import express from 'express';
import { verifyKeyMiddleware, InteractionResponseType, InteractionType } from 'discord-interactions';
import { routeInteraction } from './interactions/router.js';
import { client } from './state/discordClient.js';
import { registerReactionHandlers } from './polls/reactions.js';

const app = express();


client.once('ready', () => {
    console.log(`🤖 Discord client logged in as ${client.user.tag}`);
});

app.post(
    '/interactions',
    express.raw({ type: '*/*' }),
    verifyKeyMiddleware(process.env.PUBLIC_KEY),
    (req, res) => {
        if (req.body.type === InteractionType.PING) {
            return res.send({ type: InteractionResponseType.PONG });
        }
        if (type === InteractionType.APPLICATION_COMMAND && data.name === 'rate') {

            const messageLink = data.options.find(o => o.name === 'message')?.value;
            if (!messageLink) {
                return res.status(200).json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: ' ' },
                });
            }

            const match = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
            if (!match) {
                return res.status(200).json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: ' ' },
                });
            }

            const [, , channelId, messageId] = match;

            // ✅ 1. СРАЗУ отвечаем Discord
            res.status(200).json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: ' ', // пустой ответ → interaction закрыт
                },
            });

            console.log('✅ Interaction closed immediately for /rate');

            // ✅ 2. ВСЁ ОСТАЛЬНОЕ — В ФОНЕ
            setImmediate(async () => {
                try {
                    console.log('➡️ Rate background started', messageId);

                    const channel = await client.channels.fetch(channelId);
                    if (!channel?.isTextBased()) return;

                    const msg = await channel.messages.fetch(messageId);
                    if (!msg) return;

                    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
                    for (const emoji of emojis) {
                        await msg.react(emoji);
                    }

                    console.log('✅ Reactions added');

                } catch (err) {
                    console.error('❌ Rate background error:', err);
                }
            });
        return routeInteraction(req.body, res);
    }
);

app.listen(process.env.PORT || 3000);
client.login(process.env.DISCORD_TOKEN);
console.log('🚀 client.login() called');
registerReactionHandlers(client);
