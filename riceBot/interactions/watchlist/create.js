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

        // Внутри execute в create.js (и других файлах)
        try {
            console.log(`[Log] Пробую получить канал...`);

            // Попытка получить из кэша, если fetch виснет
            let channel = req.client.channels.cache.get(channelId);

            if (!channel) {
                console.log(`[Log] Канала нет в кэше, делаю fetch...`);
                // Устанавливаем таймаут на fetch, чтобы он не висел вечно
                channel = await Promise.race([
                    req.client.channels.fetch(channelId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching channel')), 5000))
                ]);
            }

            console.log(`[Log] Канал успешно получен: ${channel.id}`);
            // ... остальной код
        } catch (err) {
            console.error(`[Error] Ошибка на этапе получения канала:`, err.message);
            await updateResponse(appId, token, `❌ Ошибка доступа к каналу: ${err.message}`);
        }
    },
};