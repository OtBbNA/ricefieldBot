import { InteractionResponseType } from 'discord-interactions';
import fetch from 'node-fetch';
import { client } from '../../state/discordClient.js';
import { logIncoming, logSuccess, logError } from '../../utils/logger.js';
import { clientReady } from '../../state/clientReady.js';

export function handleRate({ body, res, client }) {
    try {
        const { data } = body;

        const messageLink = data.options?.find(o => o.name === 'message')?.value;
        if (!messageLink) {
            // ❗ Даже при ошибке interaction НУЖНО закрыть
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

        // ✅ 1. МГНОВЕННО закрываем interaction
        res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: ' ' }, // пустой ответ → без "думает…"
        });

        console.log(`✅ /rate interaction closed for message ${messageId}`);

        // ✅ 2. Вся логика — в фоне, interaction больше не участвует
        setImmediate(async () => {
            try {
                console.log(`➡️ Rate background started for message ${messageId}`);

                const channel = await client.channels.fetch(channelId);
                if (!channel || !channel.isTextBased()) {
                    console.warn('⚠️ Channel not text-based');
                    return;
                }

                const msg = await channel.messages.fetch(messageId);
                if (!msg) {
                    console.warn('⚠️ Message not found');
                    return;
                }

                const emojis = [
                    '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣',
                    '6️⃣','7️⃣','8️⃣','9️⃣','🔟'
                ];

                for (const emoji of emojis) {
                    await msg.react(emoji);
                }

                console.log(`✅ Reactions added to message ${messageId}`);
            } catch (err) {
                console.error('❌ Rate background error:', err);
            }
        });

    } catch (err) {
        console.error('❌ Rate handler error:', err);

        // ❗ Даже при крите — закрываем interaction
        return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: ' ' },
        });
    }
}
