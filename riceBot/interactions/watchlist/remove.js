import { InteractionResponseType } from 'discord-interactions';
import { client } from '../../client.js';
import { findWatchlistMessage } from './findMessage.js';

export const data = {
    name: 'watchlist_remove',
    description: 'Удалить фильм по номеру из списка',
    options: [
        {
            name: 'number',
            description: 'Номер фильма в списке',
            type: 4, // INTEGER
            required: true,
        },
    ],
};

export const watchlistRemove = {
    name: 'watchlist_remove',

    async execute(req, res) {

        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: 64, // 👈 сообщение видно ТОЛЬКО пользователю
            },
        });

        const channelId = req.body.channel_id;
        const number = req.body.data.options[0].value;

        const channel = await client.channels.fetch(channelId);
        const message = await findWatchlistMessage(channel);

        if (!message) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ Список не найден. Используй /watchlist_create',
                    flags: 64,
                },
            });
        }

        const items = parseWatchlist(message.content);
        const index = number - 1;

        if (index < 0 || index >= items.length) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ Неверный номер в списке.',
                    flags: 64,
                },
            });
        }

        const removed = items.splice(index, 1);

        await message.edit(renderWatchlist(items));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `🗑 Удалено: **${removed[0]}**`,
                flags: 64,
            },
        });

        await fetch(
            `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`,
            { method: 'DELETE' }
        );
    },
};