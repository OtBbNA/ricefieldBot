import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { LIST_HEADER_PREFIX, MAX_FETCH_MESSAGES } from './constants.js';

// Ищем сообщение через прямой запрос по ID списка
export async function findWatchlistById(channelId, listId) {
    const messages = await rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: 50 })
    });

    return messages.find(m =>
    m.author.bot &&
    m.content.startsWith(`${LIST_HEADER_PREFIX}${listId}`)
    );
}

// Ищем следующий свободный номер списка
export async function getNextListId(channelId) {
    const messages = await rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: 50 })
    });

    const listMessages = messages.filter(m =>
    m.author.bot && m.content.startsWith(LIST_HEADER_PREFIX)
    );

    let maxId = 0;
    listMessages.forEach(m => {
        const firstPart = m.content.split(' ')[0];
        const id = parseInt(firstPart.replace(LIST_HEADER_PREFIX, ''));
        if (!isNaN(id) && id > maxId) maxId = id;
    });
    return maxId + 1;
}