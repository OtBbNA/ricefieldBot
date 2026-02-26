import { LIST_HEADER_PREFIX } from './constants.js'; // Поменял название здесь

export function renderWatchlist(listId, title, items) {
    // Эта строка формирует технический заголовок, по которому бот найдет сообщение позже
    const header = `${LIST_HEADER_PREFIX}${listId} | **Список №${listId}: ${title}**`;

    if (!items || items.length === 0) {
        return `${header}\n\n*Список пуст*`;
    }

    const listBody = items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    return `${header}\n\n${listBody}`;
}