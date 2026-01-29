import { InteractionResponseType } from 'discord-interactions';
import { client } from '../../client.js';
import { findWatchlistMessage } from './findMessage.js';

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

        console.log('ADD: start');

        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: 64, // 👈 сообщение видно ТОЛЬКО пользователю
            },
        });

        const channelId = req.body.channel_id;
        const text = req.body.data.options[0].value;

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

        console.log('ADD: message found?', !!watchlistMessage);

        const items = parseWatchlist(message.content);
        items.push(text);

        await message.edit(renderWatchlist(items));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: '✅ Добавлено в список.',
                flags: 64,
            },
        });

        console.log('ADD: editing message');

        await fetch(
            `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`,
            { method: 'DELETE' }
        );
    },
};