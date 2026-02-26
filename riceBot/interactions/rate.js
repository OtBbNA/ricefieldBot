import { InteractionResponseType } from 'discord-interactions';
import { client } from '../client.js';
import { parseMessageLink } from '../utils/parseMessageLink.js';
import fetch from 'node-fetch';

export const data = {
    name: 'rate',
    description: 'Добавить реакции-цифры к сообщению по ссылке',
    options: [
        {
            name: 'link',
            type: 3, // STRING
            description: 'Ссылка на сообщение',
            required: true
        }
    ]
};

export const rateCommand = {
    async execute(req, res) {
        const link = req.body.data.options[0].value;
        const parsed = parseMessageLink(link);

        if (!parsed) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Неверная ссылка', flags: 64 },
            });
        }

        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 },
        });

        try {
            const channel = await client.channels.fetch(parsed.channelId);
            const msg = await channel.messages.fetch(parsed.messageId);

            for (const e of ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']) {
                await msg.react(e);
            }

            await fetch(
                `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`,
                { method: 'DELETE' }
            );
        } catch (e) {
            console.error(e);
            await fetch(
                `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: '❌ Не удалось проставить реакции (проверь права бота и ссылку)',
                    }),
                }
            );
        }
    },
};
