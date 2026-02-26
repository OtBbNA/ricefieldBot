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
    const messages = await rest.get(Routes.channelMessages(channelId), {
        query: new URLSearchParams({ limit: 50 })
    });

    if (!messages || !Array.isArray(messages)) return 1;

    const listMessages = messages.filter(m => m.content.startsWith(LIST_HEADER_PREFIX));

    let maxId = 0;
    listMessages.forEach(m => {
        const firstPart = m.content.split(' ')[0];
        const id = parseInt(firstPart.replace(LIST_HEADER_PREFIX, ''));
        if (!isNaN(id) && id > maxId) maxId = id;
    });
    return maxId + 1;
}