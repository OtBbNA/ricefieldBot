import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistMessage } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';

export const watchlistAdd = {
    async execute(req, res) {
        const text = req.body.data.options[0].value;
        const channel = await req.client.channels.fetch(req.body.channel_id);

        const msg = await findWatchlistMessage(channel);
        if (!msg) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список не найден', flags: 64 },
            });
        }

        const items = parseWatchlist(msg.content);
        items.push(text);

        await msg.edit(renderWatchlist(items));

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Добавлено', flags: 64 },
        });
    },
};
