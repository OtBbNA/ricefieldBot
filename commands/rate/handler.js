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
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    });

    setTimeout(async () => {
        try {
            console.log('➡️ Rate async started for message', messageId);

            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                console.error('❌ Channel not text based');
                return;
            }

            const msg = await channel.messages.fetch(messageId);
            if (!msg) {
                console.error('❌ Message not found');
                return;
            }

            const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            for (const emoji of emojis) {
                await msg.react(emoji);
            }

            console.log('✅ Reactions added');

            // 🔴 ВАЖНО: interaction finalize
            const finalizeUrl =
            `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`;

            console.log('➡️ Finalizing interaction via', finalizeUrl);

            const r = await fetch(finalizeUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: ' ' }),
            });

            console.log('✅ Finalize status:', r.status);

        } catch (err) {
            console.error('❌ Rate async error:', err);
        }
    }, 0);

}
