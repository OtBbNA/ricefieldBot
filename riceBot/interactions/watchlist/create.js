import { InteractionResponseType } from 'discord-interactions';
import { WATCHLIST_TITLE } from './constants.js';
import { findWatchlistMessage } from './findMessage.js';

export const watchlistCreate = {
    async execute(req, res) {
        const channel = await req.client.channels.fetch(req.body.channel_id);
        const existing = await findWatchlistMessage(channel);

        if (existing) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список уже существует', flags: 64 },
            });
        }

        await channel.send(`${WATCHLIST_TITLE}\n\nСписок пуст`);

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Список создан', flags: 64 },
        });
    },
};
