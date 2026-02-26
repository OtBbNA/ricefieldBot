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
        // 1. Мгновенно отвечаем Дискорду
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const title = req.body.data.options[0].value;
        const appId = req.body.application_id;
        const token = req.body.token;
        const channelId = req.body.channel_id;

        try {
            console.log(`[Log] Начинаю создание списка для канала: ${channelId}`);

            // Проверяем, есть ли клиент
            if (!req.client) throw new Error("Discord Client not found in request");

            const channel = await req.client.channels.fetch(channelId);
            console.log(`[Log] Канал найден: ${channel.name}`);

            const nextId = await getNextListId(channel);
            console.log(`[Log] Следующий ID: ${nextId}`);

            const content = renderWatchlist(nextId, title, []);

            // 2. Отправляем сообщение в канал
            await channel.send(content);
            console.log(`[Log] Сообщение отправлено в канал`);

            // 3. Обновляем статус взаимодействия через Fetch
            const response = await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `✅ Список №${nextId} создан!` })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[Error] Discord API returned: ${errText}`);
            }

        } catch (err) {
            console.error(`[Critical Error]`, err);
            // Пытаемся сообщить об ошибке пользователю, если что-то упало
            try {
                await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: `❌ Ошибка: ${err.message}` })
                });
            } catch (innerErr) {
                console.error("Не удалось отправить сообщение об ошибке", innerErr);
            }
        }
    },
};