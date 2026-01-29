import { InteractionResponseType } from 'discord-interactions';
import { client } from '../client.js';
import { parseMessageLink } from '../utils/parseMessageLink.js';

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
            } catch (err) {
                console.error('rate error:', err);
            }
        }, 150);
    },
};
