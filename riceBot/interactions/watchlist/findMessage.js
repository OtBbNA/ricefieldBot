import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { LIST_HEADER_PREFIX } from './constants.js';

export async function findWatchlistById(channelId, listId) {
    const messages = await rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: 50 })
    });

    // В REST-ответе m.content — это просто строка
    return messages.find(m => m.content.startsWith(`${LIST_HEADER_PREFIX}${listId}`));
}

export async function getNextListId(channelId) {
    const messages = await rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: 50 })
    });

    const listMessages = messages.filter(m => m.content.startsWith(LIST_HEADER_PREFIX));

    let maxId = 0;
    listMessages.forEach(m => {
        const id = parseInt(m.content.split(' ')[0].replace(LIST_HEADER_PREFIX, ''));
        if (!isNaN(id) && id > maxId) maxId = id;
    });
    return maxId + 1;
}