import { InteractionResponseType } from 'discord-interactions';
import { client } from '../../client.js';
import { findWatchlistMessage } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './render.js';

export const watchlistAdd = {
    name: 'watchlist_add',

    async execute(req, res) {
        const channel = await client.channels.fetch(req.body.channel_id);
        const text = req.body.data.options[0].value;

        const message = await findWatchlistMessage(channel);
        if (!message) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список не найден.', flags: 64 },
            });
        }

        const items = parseWatchlist(message.content);
        items.push(text);

        await message.edit(renderWatchlist(items));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Добавлено.', flags: 64 },
        });
    },
};
