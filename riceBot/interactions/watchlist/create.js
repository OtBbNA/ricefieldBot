import { InteractionResponseType } from 'discord-interactions';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{ name: 'title', type: 3, description: 'Название', required: true }]
};

export const listCreate = {
    async execute(req, res) {
        const channelId = req.body.channel_id;
        const title = req.body.data.options[0].value;

        try {
            // Используем старый добрый метод получения канала через клиент
            // (так как rest.get у нас почему-то таймаутит на Render)
            const channel = await req.client.channels.fetch(channelId);

            // Получаем ID (используем старую логику поиска сообщений)
            const nextId = await getNextListId(channel);

            const content = renderWatchlist(nextId, title, []);
            await channel.send(content);

            // Отправляем финальный ответ ОДИН раз в самом конце
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `✅ Список №${nextId} создан`, flags: 64 },
            });

        } catch (err) {
            console.error(`[Create Error]`, err);
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `❌ Ошибка: ${err.message}`, flags: 64 },
            });
        }
    },
};