import { InteractionResponseType } from 'discord-interactions';
import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_create',
    description: 'Создать новый список (автоматически закрепляется)',
    options: [{
        name: 'title',
        type: 3,
        description: 'Название вашего списка',
        required: true
    }]
};

export const listCreate = {
    async execute(req, res) {
        // 1. Мгновенно отвечаем "Бот думает...", чтобы Discord не оборвал связь
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const title = req.body.data.options[0].value;
        const appId = req.body.application_id;
        const token = req.body.token;
        const channelId = req.body.channel_id;

        try {
            const title = req.body.data?.options?.find(o => o.name === 'title')?.value;
            if (!title) {
                await updateResponse(appId, token, '❌ Не передан title для списка');
                return;
            }

            // 2. Получаем следующий ID (теперь ищем только в закрепах)
            const nextId = await getNextListId(channelId);
            const content = renderWatchlist(nextId, title, []);

            // 3. Отправляем сообщение в канал
            const newMessage = await rest.post(Routes.channelMessages(channelId), {
                body: { content }
            });
            console.log(`[Create] Сообщение отправлено. ID: ${newMessage.id}`);

            // 4. ЗАКРЕПЛЯЕМ сообщение (чтобы поиск работал молниеносно)
            try {
                await rest.put(Routes.channelPin(channelId, newMessage.id));
                console.log(`[Create] Сообщение успешно закреплено`);
            } catch (pinErr) {
                console.error(`[Create Warning] Не удалось закрепить: проверить права Manage Messages`, pinErr);
            }

            // 5. Финальное подтверждение пользователю
            await updateResponse(appId, token, `✅ Список №${nextId} создан и закреплен!`);

        } catch (err) {
            console.error(`[Create Critical Error]`, err);
            await updateResponse(appId, token, `❌ Ошибка при создании: ${err.message}`);
        }
    },
};

// Вспомогательная функция для обновления "думающего" сообщения
async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}