import { InteractionResponseType } from 'discord-interactions';
import { client } from '../client.js';
import { parseMessageLink } from '../utils/parseMessageLink.js';
import fetch from 'node-fetch';

export const data = {
    name: 'rate',
    description: 'Проставляет реакции 1-10 под сообщением',
    options: [
        {
            name: 'message',
            description: 'Ссылка на сообщение вида https://discord.com/channels/...',
            type: 3, // STRING
            required: true,
        },
    ],
};

export const rateCommand = {
    name: 'rate',

    async execute(req, res) {
        const messageLink = req.body.data.options?.find(
            o => o.name === 'message'
        )?.value;

        if (!messageLink) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Укажи ссылку на сообщение.' },
            });
        }

        const parsed = parseMessageLink(messageLink);
        if (!parsed) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Неверная ссылка.' },
            });
        }

        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: 64,
            },
        });

        setTimeout(async () => {
            try {
                const channel = await client.channels.fetch(parsed.channelId);
                if (!channel?.isTextBased()) return;

                const message = await channel.messages.fetch(parsed.messageId);
                if (!message) return;

                const emojis = [
                    '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣',
                    '6️⃣','7️⃣','8️⃣','9️⃣','🔟'
                ];

                for (const e of emojis) {
                    await message.react(e);
                }

                console.log(`✅ Rated message ${parsed.messageId}`);

                const deleteUrl =
                `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`;

                await fetch(deleteUrl, { method: 'DELETE' });
            } catch (err) {
                console.error('rate error:', err);
            }
        }, 150);
    },
};
