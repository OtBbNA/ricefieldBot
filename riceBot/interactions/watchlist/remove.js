import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistMessage } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';

export const watchlistRemove = {
    async execute(req, res) {
        const index = req.body.data.options[0].value - 1;

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const msg = await findWatchlistMessage(channel);

        if (!msg) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список не найден', flags: 64 },
            });
        }

        const items = parseWatchlist(msg.content);

        if (index < 0 || index >= items.length) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Неверный номер', flags: 64 },
            });
        }

        items.splice(index, 1);
        await msg.edit(renderWatchlist(items));

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '🗑 Удалено', flags: 64 },
        });
    },
};
