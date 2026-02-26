import { LIST_HEADER_PREFIX, MAX_FETCH_MESSAGES } from './constants.js';

// Ищем конкретный список по ID
export async function findWatchlistById(channel, listId) {
    const messages = await channel.messages.fetch({ limit: MAX_FETCH_MESSAGES });
    return messages.find(m =>
    m.author.bot &&
    m.content.startsWith(`${LIST_HEADER_PREFIX}${listId}`)
    );
}

// Генерируем новый ID для нового списка
export async function getNextListId(channel) {
    const messages = await channel.messages.fetch({ limit: MAX_FETCH_MESSAGES });

    // Фильтруем сообщения, которые являются списками
    const listMessages = messages.filter(m =>
    m.author.bot && m.content.startsWith(LIST_HEADER_PREFIX)
    );

    let maxId = 0;
    listMessages.forEach(m => {
        // Вытаскиваем число из строки вида "ID_LIST_3 | ..."
        const firstPart = m.content.split(' ')[0]; // Получим "ID_LIST_3"
        const idString = firstPart.replace(LIST_HEADER_PREFIX, ''); // Получим "3"
        const id = parseInt(idString);

        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    });

    return maxId + 1;
}