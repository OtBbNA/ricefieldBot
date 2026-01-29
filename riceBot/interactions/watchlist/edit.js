import { InteractionResponseType } from 'discord-interactions';
import { client } from '../../client.js';
import { findWatchlistMessage } from './findMessage.js';

export const data = {
    name: 'watchlist_edit',
    description: 'Изменить фильм по номеру в списке',
    options: [
        {
            name: 'number',
            description: 'Номер фильма в списке',
            type: 4, // INTEGER
            required: true,
        },
        {
            name: 'text',
            description: 'Новое название фильма',
            type: 3, // STRING
            required: true,
        },
    ],
};

export const watchlistEdit = {
    name: 'watchlist_edit',

    async execute(req, res) {

        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: 64, // 👈 сообщение видно ТОЛЬКО пользователю
            },
        });

        const channelId = req.body.channel_id;

        const number = req.body.data.options.find(o => o.name === 'number')?.value;
        const text = req.body.data.options.find(o => o.name === 'text')?.value;

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

        const old = items[index];
        items[index] = text;

        await message.edit(renderWatchlist(items));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✏️ **${old}** → **${text}**`,
                flags: 64,
            },
        });

        await fetch(
            `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`,
            { method: 'DELETE' }
        );
    },
};