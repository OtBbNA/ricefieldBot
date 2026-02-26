import { InteractionResponseType } from 'discord-interactions';
import { Routes } from 'discord.js';
import { rest } from '../../client.js';
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
        res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, data: { flags: 64 } });

        const { application_id: appId, token, channel_id: channelId } = req.body;
        const title = req.body.data.options[0].value;

        try {
            console.log(`[Create] Старт. Канал: ${channelId}`);
            const nextId = await getNextListId(channelId);
            console.log(`[Create] Получен ID: ${nextId}`);

            const content = renderWatchlist(nextId, title, []);

            await rest.post(Routes.channelMessages(channelId), { body: { content } });
            console.log(`[Create] Сообщение отправлено успешно`);

            await updateResponse(appId, token, `✅ Список №${nextId} создан!`);
        } catch (err) {
            console.error(`[Create Error]`, err);
            await updateResponse(appId, token, `❌ Ошибка: ${err.message}`);
        }
    }
};