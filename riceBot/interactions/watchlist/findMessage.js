// riceBot/interactions/watchlist/findMessage.js
import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { LIST_HEADER_PREFIX } from './constants.js';

/**
 * Ищем список только среди закрепленных сообщений
 */
export async function findWatchlistById(channelId, listId) {
    console.log(`[REST-PINS] Ищу список №${listId} в закрепах канала ${channelId}`);

    // Получаем список закрепов (их макс. 50 штук в канале)
    const pins = await rest.get(Routes.channelPins(channelId));

    if (!pins || !Array.isArray(pins)) return null;

    return pins.find(m =>
    m.content.startsWith(`${LIST_HEADER_PREFIX}${listId}`)
    );
}

/**
 * Определяем следующий ID, глядя на закрепы
 */
export async function getNextListId(channelId) {
    console.log(`[REST-PINS] Считаю следующий ID через закрепы`);

    const pins = await rest.get(Routes.channelPins(channelId));

    if (!pins || !Array.isArray(pins)) return 1;

    const listMessages = pins.filter(m => m.content.startsWith(LIST_HEADER_PREFIX));

    let maxId = 0;
    listMessages.forEach(m => {
        const id = parseInt(m.content.split(' ')[0].replace(LIST_HEADER_PREFIX, ''));
        if (!isNaN(id) && id > maxId) maxId = id;
    });

    return maxId + 1;
}