import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_edit',
    description: 'Изменить элемент в списке',
    options: [
        { name: 'list_id', type: 4, description: 'Номер списка', required: true },
        { name: 'number', type: 4, description: 'Номер строки', required: true },
        { name: 'text', type: 3, description: 'Новый текст', required: true }
    ]
};

export const listEdit = {
    async execute(req, res) {
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const listId = req.body.data.options.find(o => o.name === 'list_id').value;
        const index = req.body.data.options.find(o => o.name === 'number').value - 1;
        const newText = req.body.data.options.find(o => o.name === 'text').value;
        const { application_id: appId, token } = req.body;

        try {
            const channel = await req.client.channels.fetch(req.body.channel_id);
            const msg = await findWatchlistById(channel, listId);

            if (!msg) return updateResponse(appId, token, `❌ Список №${listId} не найден`);

            const { title, items } = parseWatchlist(msg.content);
            if (index < 0 || index >= items.length) return updateResponse(appId, token, `❌ Неверный номер строки`);

            items[index] = newText;
            await msg.edit(renderWatchlist(listId, title, items));
            await updateResponse(appId, token, `✅ Список №${listId} обновлен`);
        } catch (err) {
            console.error(err);
            await updateResponse(appId, token, `❌ Ошибка при редактировании`);
        }
    }
};

async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}