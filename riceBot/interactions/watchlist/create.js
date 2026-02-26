import { InteractionResponseType } from 'discord-interactions';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch'; // Для отправки финального результата

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{ name: 'title', type: 3, description: 'Название', required: true }]
};

export const listCreate = {
    async execute(req, res) {
        // 1. ОТПРАВЛЯЕМ DEFER СРАЗУ
        // Это дает нам 15 минут вместо 3 секунд
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const channelId = req.body.channel_id;
        const title = req.body.data.options[0].value;
        const { application_id: appId, token } = req.body;

        try {
            // 2. ПРОВЕРКА КЛИЕНТА
            // Если клиент не готов, fetch будет висеть вечно.
            if (!req.client.isReady()) {
                console.log("[Log] Ждем готовности клиента...");
                await new Promise((resolve) => {
                    req.client.once('ready', resolve);
                    setTimeout(resolve, 5000); // Ждем максимум 5 сек
                });
            }

            const channel = await req.client.channels.fetch(channelId);
            const nextId = await getNextListId(channel);
            const content = renderWatchlist(nextId, title, []);

            await channel.send(content);

            // 3. ОТПРАВЛЯЕМ ПОДТВЕРЖДЕНИЕ ЧЕРЕЗ ВЕБХУК
            // После defer мы НЕ можем использовать res.send второй раз
            await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `✅ Список №${nextId} создан!` })
            });

        } catch (err) {
            console.error(`[Create Error]`, err);
            // Сообщаем об ошибке в тот же отложенный ответ
            await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `❌ Ошибка: ${err.message}` })
            });
        }
    },
};