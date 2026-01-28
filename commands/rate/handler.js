import { InteractionResponseType } from 'discord-interactions';
import fetch from 'node-fetch';
import { client } from '../../state/discordClient.js';
import { logIncoming, logSuccess, logError } from '../../utils/logger.js';
import { clientReady } from '../../state/clientReady.js';

export async function handleCommand(body, res) {
    const messageLink =
    body.data.options.find(o => o.name === 'message')?.value;

    if (!messageLink) {
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Укажи ссылку на сообщение.' },
        });
    }

    const match = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (!match) {
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '❌ Неверный формат ссылки.' },
        });
    }

    const [, , channelId, messageId] = match;

    res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: ' ', // ← один пробел
        },
    });

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
}
