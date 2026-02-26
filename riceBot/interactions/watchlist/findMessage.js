import { LIST_HEADER_PREFIX } from './constants.js';

export async function findWatchlistById(channel, listId) {
    console.log(`[Log] Ищу сообщение списка №${listId}...`);

    // Получаем последние 50 сообщений в канале
    const messages = await channel.messages.fetch({ limit: 50 });

    // Ищем то, которое начинается с нужного префикса и ID
    return messages.find(m =>
    m.author.bot &&
    m.content.startsWith(`${LIST_HEADER_PREFIX}${listId}`)
    );
}

/**
 * Определяет следующий доступный ID для нового списка
 * @param {Object} channel - Объект канала из discord.js
 */
export async function getNextListId(channel) {
    console.log(`[Log] Определяю следующий ID списка...`);

    const messages = await channel.messages.fetch({ limit: 50 });

    // Фильтруем только сообщения, созданные ботом и являющиеся списками
    const listMessages = messages.filter(m =>
    m.author.bot && m.content.startsWith(LIST_HEADER_PREFIX)
    );

    let maxId = 0;

    listMessages.forEach(m => {
        // Вытаскиваем число из строки типа "ID_LIST_1"
        const firstPart = m.content.split(' ')[0]; // Допустим "ID_LIST_1"
        const id = parseInt(firstPart.replace(LIST_HEADER_PREFIX, ''));

        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    });

    return maxId + 1;
}