import { InteractionResponseType } from 'discord-interactions';
import { getWatchlistMessage, parseList, buildMessage } from './utils.js';

export const data = {
    name: 'watchlist_add',
    description: 'Добавить фильм в конец списка',
    options: [
        {
            name: 'text',
            description: 'Название фильма',
            type: 3, // STRING
            required: true,
        },
    ],
};

export const watchlistAdd = {
    name: 'watchlist_add',

    async execute(req, res) {
        const text = req.body.data.options.find(o => o.name === 'text')?.value;
        if (!text) return res.send({ type: 4, data: { content: '❌ Текст пуст.', flags: 64 } });

        const msg = await getWatchlistMessage(req.body.channel_id);
        if (!msg) return res.send({ type: 4, data: { content: '❌ Список не найден.', flags: 64 } });

        const list = parseList(msg.content);
        list.push(text);

        await msg.edit(buildMessage(list));

        return res.send({ type: 4, data: { content: '✅ Добавлено.', flags: 64 } });
    },
};
