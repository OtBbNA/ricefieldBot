import { InteractionResponseType } from 'discord-interactions';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{
        name: 'title',
        type: 3,
        description: 'Название вашего списка',
        required: true
    }]
};

export const listCreate = {
    async execute(req, res) {
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const title = req.body.data.options[0].value;
        const appId = req.body.application_id;
        const token = req.body.token;

        try {
            const channel = await req.client.channels.fetch(req.body.channel_id);
            const nextId = await getNextListId(channel);
            const content = renderWatchlist(nextId, title, []);

            await channel.send(content);

            await updateResponse(appId, token, `✅ Список №${nextId} создан!`);
        } catch (err) {
            console.error(err);
            await updateResponse(appId, token, `❌ Ошибка при создании списка`);
        }
    },
};

async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}