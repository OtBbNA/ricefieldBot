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
        logIncoming(`Rate async started for message ${messageId}`);

        try {
            await clientReady;
            logSuccess('Discord client is ready');

            const channel = await client.channels.fetch(channelId);
            logSuccess(`Channel fetched: ${channelId}`);

            const msg = await channel.messages.fetch(messageId);
            logSuccess(`Message fetched: ${messageId}`);

            const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            for (const emoji of emojis) {
                await msg.react(emoji);
            }

            logSuccess(`Reactions added to ${messageId}`);

            const deleteUrl =
            `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`;

            await fetch(deleteUrl, { method: 'DELETE' });
            logSuccess('Deferred response deleted (thinking stopped)');

        } catch (err) {
            logError('Rate async failed', err);
        }
    }, 150);

}
