import { InteractionResponseType } from 'discord-interactions';
import { client } from '../../state/discordClient.js';
import fetch from 'node-fetch';

export function handleRate(body, res) {
    try {
        const messageLink =
        body.data.options?.find(o => o.name === 'message')?.value;

        if (!messageLink) {
            return res.status(200).json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: 'Некорректная ссылка' },
            });
        }

        const match = messageLink.match(/channels\/\d+\/(\d+)\/(\d+)/);
        if (!match) {
            return res.status(200).json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: 'Некорректная ссылка' },
            });
        }

        const [, channelId, messageId] = match;

        res.json({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });

        // ✅ фоновая логика
        setImmediate(async () => {
            try {
                const channel = await client.channels.fetch(channelId);
                if (!channel?.isTextBased()) return;

                const msg = await channel.messages.fetch(messageId);

                for (const e of ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']) {
                    await msg.react(e);
                }

                await fetch(
                    `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`,
                    { method: 'DELETE' }
                );
            } catch (err) {
                console.error('rate background error', err);
            }
        });

    } catch (err) {
        console.error('rate error', err);
        return res.status(200).json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Ошибка' },
        });
    }
}
