import { InteractionResponseType } from 'discord-interactions';
import { Routes } from 'discord.js';
import { rest } from '../../client.js'; // Импортируем наш новый rest
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{ name: 'title', type: 3, description: 'Название', required: true }]
};

async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}

export const listCreate = {
    async execute(req, res) {
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const { application_id: appId, token, channel_id: channelId } = req.body;
        const title = req.body.data.options[0].value;

        try {
            console.log(`[Log] Работаю через REST для канала ${channelId}`);

            // 1. Получаем ID следующего списка через REST (нужно поправить findMessage.js)
            const nextId = await getNextListIdRest(channelId);

            // 2. Рендерим текст
            const content = renderWatchlist(nextId, title, []);

            // 3. Отправляем сообщение напрямую в канал через REST
            await rest.post(Routes.channelMessages(channelId), {
                body: { content }
            });

            await updateResponse(appId, token, `✅ Список №${nextId} создан!`);

        } catch (err) {
            console.error(`[Error]`, err);
            await updateResponse(appId, token, `❌ Ошибка: ${err.message}`);
        }
    }
};

// Временная замена поиска ID через REST прямо тут
async function getNextListIdRest(channelId) {
    // Получаем последние 50 сообщений через прямой HTTP запрос
    const messages = await rest.get(Routes.channelMessages(channelId), { query: new URLSearchParams({ limit: 50 }) });
    const LIST_PREFIX = 'ID_LIST_'; // Убедись, что это совпадает с constants.js

    let maxId = 0;
    messages.forEach(m => {
        if (m.content.startsWith(LIST_PREFIX)) {
            const id = parseInt(m.content.split(' ')[0].replace(LIST_PREFIX, ''));
            if (!isNaN(id) && id > maxId) maxId = id;
        }
    });
    return maxId + 1;
}