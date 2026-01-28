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
                console.log('▶ rate background start');

                const channel = await client.channels.fetch(channelId);
                console.log('✔ channel fetched');

                if (!channel?.isTextBased()) {
                    console.log('✖ not text channel');
                    return;
                }

                const msg = await channel.messages.fetch(messageId);
                console.log('✔ message fetched');

                for (const e of ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']) {
                    await msg.react(e);
                    console.log('➕ reacted', e);
                }

                await fetch(
                    `https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`,
                    { method: 'DELETE' }
                );

                console.log('🧹 deferred message deleted');

            } catch (err) {
                console.error('❌ rate background error', err);
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
