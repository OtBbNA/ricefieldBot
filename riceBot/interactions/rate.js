import { InteractionResponseType } from 'discord-interactions';
import { client } from '../client.js';
import { parseMessageLink } from '../utils/parseMessageLink.js';
import { updateOriginalInteractionResponse } from './discordResponse.js';

export const data = {
    name: 'rate',
    description: 'Добавить реакции-цифры к сообщению по ссылке',
    options: [
        {
            name: 'link',
            type: 3, // STRING
            description: 'Ссылка на сообщение',
            required: true,
        },
    ],
};

export const rateCommand = {
    async execute({ req, replyFinal }) {
        const link = req.body.data.options[0].value;
        const parsed = parseMessageLink(link);

        if (!parsed) {
            await replyFinal('❌ Неверная ссылка');
            return;
        }

        try {
            const channel = await client.channels.fetch(parsed.channelId);
            const msg = await channel.messages.fetch(parsed.messageId);

            for (const emoji of ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']) {
                await msg.react(emoji);
            }

            await replyFinal('✅ Реакции добавлены');
        } catch (error) {
            console.error(error);
            await replyFinal('❌ Не удалось проставить реакции (проверь права бота и ссылку)');
        }
    },
};
