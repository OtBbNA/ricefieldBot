import { InteractionResponseType } from 'discord-interactions';
import { findLists } from './findLists.js';
import { parseList } from './parseList.js';
import { renderList } from './renderList.js';

export const listEdit = {
    name: 'list_edit',

    async execute(req, res) {
        const options = req.body.data.options;

        const listId = options.find(o => o.name === 'list')?.value;
        const itemIndex = options.find(o => o.name === 'item')?.value;
        const newText = options.find(o => o.name === 'text')?.value?.trim();

        if (!listId || !itemIndex || !newText) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: '❌ Использование: /list_edit list:<номер> item:<номер> text:<текст>',
                    flags: 64,
                },
            });
        }

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const lists = await findLists(channel);
        const list = lists.find(l => l.id === listId);

        if (!list) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список с таким номером не найден.', flags: 64 },
            });
        }

        const items = parseList(list.message.content);

        if (itemIndex < 1 || itemIndex > items.length) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Пункт с таким номером не найден.', flags: 64 },
            });
        }

        items[itemIndex - 1] = newText;

        await list.message.edit(
            renderList(list.name, list.id, items)
        );

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✏️ Пункт №${itemIndex} в списке №${listId} изменён.`,
                flags: 64,
            },
        });
    },
};
