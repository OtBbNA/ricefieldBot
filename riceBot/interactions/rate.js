import { InteractionResponseType } from 'discord-interactions';
import { client } from '../client.js';
import { parseMessageLink } from '../utils/parseMessageLink.js';
import fetch from 'node-fetch';

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
        }
    },
};
