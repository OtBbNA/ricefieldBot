import { InteractionResponseType } from 'discord-interactions';
import { client } from '../../client.js';
import { findWatchlistMessage } from '../../utils/findWatchlistMessage.js';
import { WATCHLIST_HEADER } from '../../watchlist/constants.js';

export const data = {
    name: 'watchlist_create',
    description: 'Создать новое сообщение списка фильмов в канале',
};

export const watchlistCreate = {
    name: 'watchlist_create',

    async execute(req, res) {
        const channelId = req.body.channel_id;
        const channel = await client.channels.fetch(channelId);

        const existing = await findWatchlistMessage(channel);
        if (existing) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ Список уже существует в этом канале.',
                    flags: 64,
                },
            });
        }

        await channel.send(`${WATCHLIST_HEADER}\n\nСписок пуст`);

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: '✅ Список создан.',
                flags: 64,
            },
        });
    },
};