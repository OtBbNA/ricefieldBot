import { InteractionResponseType } from 'discord-interactions';
import { findLists } from './findLists.js';
import { renderList } from './renderList.js';

export const listCreate = {
    name: 'list_create',

    async execute(req, res) {
        const name = req.body.data.options.find(o => o.name === 'name')?.value?.trim();

        if (!name) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Укажи имя списка.', flags: 64 },
            });
        }

        const channel = await req.client.channels.fetch(req.body.channel_id);
        const lists = await findLists(channel);

        if (lists.some(l => l.name.toLowerCase() === name.toLowerCase())) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Список с таким именем уже существует.', flags: 64 },
            });
        }

        const nextId = lists.length ? Math.max(...lists.map(l => l.id)) + 1 : 1;

        const content = renderList(name, nextId, []);

        await channel.send(content);

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `✅ Список **${name}** создан (№ ${nextId}).`, flags: 64 },
        });
    },
};
