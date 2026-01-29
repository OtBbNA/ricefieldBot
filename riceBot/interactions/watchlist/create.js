import { InteractionResponseType } from 'discord-interactions';
import { getWatchlistMessage, buildMessage } from './utils.js';

export const data = {
    name: 'watchlist_create',
    description: 'Создать новое сообщение списка фильмов в канале',
};


export const watchlistCreate = {
    name: 'watchlist_create',

    async execute(req, res) {
        const channelId = req.body.channel_id;

        const existing = await getWatchlistMessage(channelId);
        if (existing) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список уже существует.', flags: 64 },
            });
        }

        const channel = await existing?.channel || null;
        const ch = channel ?? await (await import('../../client.js')).client.channels.fetch(channelId);

        await ch.send(buildMessage([]));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Список создан.', flags: 64 },
        });
    },
};
