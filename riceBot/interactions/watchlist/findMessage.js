import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { LIST_HEADER_PREFIX } from './constants.js';

export async function findWatchlistById(channelId, listId) {
    console.log(`[REST] Ищу список №${listId} в канале ${channelId}`);
    const messages = await rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: 50 })
    });

    if (!messages || !Array.isArray(messages)) return null;

    return messages.find(m =>
    m.content.startsWith(`${LIST_HEADER_PREFIX}${listId}`)
    );
}

export async function getNextListId(channelId) {
    console.log(`[REST] Считаю следующий ID для канала ${channelId}`);

    try {
        // Добавляем гонку: либо ответ от Дискорда, либо ошибка через 7 секунд
        const messages = await Promise.race([
            rest.get(Routes.channelMessages(channelId), { query: new URLSearchParams({ limit: 50 }) }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Discord REST Timeout (7s)')), 7000))
        ]);

        if (!messages || !Array.isArray(messages)) return 1;

        const listMessages = messages.filter(m => m.content.startsWith(LIST_HEADER_PREFIX));

        let maxId = 0;
        listMessages.forEach(m => {
            const firstPart = m.content.split(' ')[0];
            const id = parseInt(firstPart.replace(LIST_HEADER_PREFIX, ''));
            if (!isNaN(id) && id > maxId) maxId = id;
        });
        return maxId + 1;
    } catch (error) {
        console.error(`[REST Error] Не удалось получить сообщения:`, error.message);
        throw error; // Бросаем выше, чтобы сработал catch в create.js
    }
}