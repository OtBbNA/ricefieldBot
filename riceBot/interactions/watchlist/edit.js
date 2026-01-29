import { InteractionResponseType } from 'discord-interactions';
import { getWatchlistMessage, parseList, buildMessage } from './utils.js';

export const data = {
    name: 'watchlist_edit',
    description: 'Изменить фильм по номеру в списке',
    options: [
        {
            name: 'number',
            description: 'Номер фильма в списке',
            type: 4, // INTEGER
            required: true,
        },
        {
            name: 'text',
            description: 'Новое название фильма',
            type: 3, // STRING
            required: true,
        },
    ],
};

export const watchlistEdit = {
    name: 'watchlist_edit',

    async execute(req, res) {
        const number = req.body.data.options.find(o => o.name === 'number')?.value;
        const text = req.body.data.options.find(o => o.name === 'text')?.value;

        const msg = await getWatchlistMessage(req.body.channel_id);
        if (!msg) return res.send({ type: 4, data: { content: '❌ Список не найден.', flags: 64 } });

        const list = parseList(msg.content);
        if (!list[number - 1]) {
            return res.send({ type: 4, data: { content: '❌ Неверный номер.', flags: 64 } });
        }

        list[number - 1] = text;
        await msg.edit(buildMessage(list));

        return res.send({ type: 4, data: { content: '✏️ Изменено.', flags: 64 } });
    },
};
