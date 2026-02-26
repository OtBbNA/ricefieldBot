import { InteractionResponseType } from 'discord-interactions';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{
        name: 'title',
        type: 3, // STRING
        description: 'Название вашего списка',
        required: true
    }]
};

export const listCreate = {
    async execute(req, res) {
        const title = req.body.data.options[0].value;
        const channel = await req.client.channels.fetch(req.body.channel_id);

        const nextId = await getNextListId(channel);
        const content = renderWatchlist(nextId, title, []);

        await channel.send(content);

        res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `✅ Список №${nextId} создан!`, flags: 64 },
        });
    },
};