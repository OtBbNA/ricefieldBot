import { InteractionResponseType, Routes } from 'discord.js';
import { rest } from '../../client.js';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_add',
    description: 'Добавить в список',
    options: [
        { name: 'list_id', type: 4, description: 'ID списка', required: true },
        { name: 'text', type: 3, description: 'Текст', required: true }
    ]
};

async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}

export const listAdd = {
    async execute(req, res) {
        res.send({ type: 5, data: { flags: 64 } }); // 5 — это DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE

        const { application_id: appId, token, channel_id: channelId } = req.body;
        const listId = req.body.data.options.find(o => o.name === 'list_id').value;
        const text = req.body.data.options.find(o => o.name === 'text').value;

        try {
            // Ищем сообщение (теперь передаем только ID канала!)
            const msg = await findWatchlistById(channelId, listId);

            if (!msg) return await updateResponse(appId, token, `❌ Список №${listId} не найден.`);

            const { title, items } = parseWatchlist(msg.content);
            items.push(text);

            // Редактируем сообщение напрямую через REST
            await rest.patch(Routes.channelMessage(channelId, msg.id), {
                body: { content: renderWatchlist(listId, title, items) }
            });

            await updateResponse(appId, token, `✅ Добавлено в список №${listId}`);
        } catch (err) {
            console.error(err);
            await updateResponse(appId, token, `❌ Ошибка: ${err.message}`);
        }
    }
};