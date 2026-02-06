import { InteractionResponseType } from 'discord-interactions';
import { findLists } from './findLists.js';
import { parseList } from './parseList.js';
import { renderList } from './renderList.js';

export const listAdd = {
    name: 'list_add',

    async execute(req, res) {
        const id = Number(req.body.data.options.find(o => o.name === 'id')?.value);
        const text = req.body.data.options.find(o => o.name === 'text')?.value?.trim();

        if (!id || !text) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Укажи номер списка и текст.', flags: 64 },
            });
        }

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const lists = await findLists(channel);
        const list = lists.find(l => l.id === id);

        if (!list) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список не найден.', flags: 64 },
            });
        }

        const items = parseList(list.message.content);
        items.push(text);

        await list.message.edit(renderList(list.name, list.id, items));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: '✅ Добавлено.', flags: 64 },
        });
    },
};
