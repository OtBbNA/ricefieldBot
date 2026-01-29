import { InteractionResponseType } from 'discord-interactions';
import { getWatchlistMessage, parseList, buildMessage } from './utils.js';

export const watchlistRemove = {
    name: 'watchlist_remove',

    async execute(req, res) {
        const number = req.body.data.options.find(o => o.name === 'number')?.value;

        const msg = await getWatchlistMessage(req.body.channel_id);
        if (!msg) return res.send({ type: 4, data: { content: '❌ Список не найден.', flags: 64 } });

        const list = parseList(msg.content);
        if (!list[number - 1]) {
            return res.send({ type: 4, data: { content: '❌ Неверный номер.', flags: 64 } });
        }

        list.splice(number - 1, 1);
        await msg.edit(buildMessage(list));

        return res.send({ type: 4, data: { content: '🗑 Удалено.', flags: 64 } });
    },
};
