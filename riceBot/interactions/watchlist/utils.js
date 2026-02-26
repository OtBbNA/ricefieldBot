import { WATCHLIST_PREFIX } from './constants.js';

export function renderWatchlist(listId, title, items) {
    const header = `${WATCHLIST_PREFIX}${listId} | **Список №${listId}: ${title}**`;
    if (items.length === 0) {
        return `${header}\n\n*Список пуст*`;
    }
    const listBody = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    return `${header}\n\n${listBody}`;
}