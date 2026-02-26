import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';

export const data = {
    name: 'list_edit',
    description: 'Изменить текст элемента в списке',
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
        },
        {
            name: 'text',
            type: 3, // STRING
            description: 'Новый текст',
            required: true,
        }
    ]
};

export const listEdit = {
    async execute(req, res) {
        const listId = req.body.data.options.find(o => o.name === 'list_id').value;
        const index = req.body.data.options.find(o => o.name === 'number').value - 1;
        const newText = req.body.data.options.find(o => o.name === 'text').value;

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
                data: { content: '❌ Неверный номер элемента', flags: 64 },
            });
        }

        items[index] = newText;
        await msg.edit(renderWatchlist(listId, title, items));

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `✅ Элемент в списке №${listId} изменен`, flags: 64 },
        });
    },
};