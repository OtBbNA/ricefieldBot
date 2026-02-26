
import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';

export const data = {
    name: 'watchlist_add',
    description: 'Добавить в список',
    options: [
        { name: 'list_id', type: 4, description: 'Номер списка (ID)', required: true },
        { name: 'text', type: 3, description: 'Что добавить', required: true }
    ]
};

export const watchlistAdd = {
    async execute(req, res) {
        const listId = req.body.data.options.find(o => o.name === 'list_id').value;
        const text = req.body.data.options.find(o => o.name === 'text').value;

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const msg = await findWatchlistById(channel, listId);

        if (!msg) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `❌ Список №${listId} не найден в этом канале`, flags: 64 },
            });
        }

        const { title, items } = parseWatchlist(msg.content);
        items.push(text);

        await msg.edit(renderWatchlist(listId, title, items));

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `✅ Добавлено в список №${listId}`, flags: 64 },
        });
    },
};