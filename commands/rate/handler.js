import { InteractionResponseType } from 'discord-interactions';
import fetch from 'node-fetch';
import { client } from '../../state/discordClient.js';

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
            const channel = await client.channels.fetch(channelId);
            const msg = await channel.messages.fetch(messageId);

            for (const emoji of ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']) {
                await msg.react(emoji);
            }

            const deleteUrl =
            `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`;

            await fetch(deleteUrl, { method: 'DELETE' });
        } catch (err) {
            console.error('rate async error', err);
        }
    }, 150);
}
