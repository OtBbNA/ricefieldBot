import { InteractionResponseType } from 'discord-interactions';
import fetch from 'node-fetch';
import { client } from '../../state/discordClient.js';
import { clientReady } from '../../state/clientReady.js';

export function handleRate(body, res) {

    // ⛔ 1️⃣ СРАЗУ проверяем ready
    if (!clientReady) {
        return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '⏳ Бот ещё запускается, попробуй через пару секунд.' },
        });
    }

    try {
        const messageLink =
        body.data.options?.find(o => o.name === 'message')?.value;

        if (!messageLink) {
            return res.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: 'Некорректная ссылка' },
            });
        }

        const match = messageLink.match(/channels\/\d+\/(\d+)\/(\d+)/);
        if (!match) {
            return res.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: 'Некорректная ссылка' },
            });
        }

        const [, channelId, messageId] = match;

        // ✅ 2️⃣ ТОЛЬКО ТЕПЕРЬ defer
        res.json({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });

        // ✅ 3️⃣ ФОН
        setImmediate(async () => {
            try {
                console.log('▶ rate background start');

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
        return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Ошибка' },
        });
    }
}
