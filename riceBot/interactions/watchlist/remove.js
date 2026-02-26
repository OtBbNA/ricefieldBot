import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';

export const data = {
    name: 'list_remove',
    description: 'Удалить элемент из конкретного списка',
    options: [
        {
            name: 'list_id',
            type: 4, // INTEGER
            description: 'Номер списка',
            required: true,
        },
        {
            name: 'number',
            type: 4, // INTEGER
            description: 'Номер элемента в списке',
            required: true,
        }
    ]
};

export const listRemove = {
    async execute(req, res) {
        const listId = req.body.data.options.find(o => o.name === 'list_id').value;
        const index = req.body.data.options.find(o => o.name === 'number').value - 1;

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const msg = await findWatchlistById(channel, listId);

        if (!msg) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `❌ Список №${listId} не найден`, flags: 64 },
            });
        }

        const { title, items } = parseWatchlist(msg.content);

        if (index < 0 || index >= items.length) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Неверный номер элемента в списке', flags: 64 },
            });
        }

        items.splice(index, 1);
        await msg.edit(renderWatchlist(listId, title, items));

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `🗑 Удалено из списка №${listId}`, flags: 64 },
        });
    },
};