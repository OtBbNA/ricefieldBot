import { InteractionResponseType } from 'discord-interactions';
import { findLists } from './findLists.js';
import { parseList } from './parseList.js';
import { renderList } from './renderList.js';

export const listRemove = {
    name: 'list_remove',

    async execute(req, res) {
        const id = Number(req.body.data.options.find(o => o.name === 'id')?.value);
        const index = Number(req.body.data.options.find(o => o.name === 'index')?.value);

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const list = (await findLists(channel)).find(l => l.id === id);

        if (!list) return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ Список не найден.', flags: 64 }});

        const items = parseList(list.message.content);

        if (index < 1 || index > items.length) {
            return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '❌ Неверный номер пункта.', flags: 64 }});
        }

        items.splice(index - 1, 1);
        await list.message.edit(renderList(list.name, list.id, items));

        return res.send({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: '🗑 Удалено.', flags: 64 }});
    },
};
