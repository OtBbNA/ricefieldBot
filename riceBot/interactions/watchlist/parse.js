import { WATCHLIST_PREFIX } from './constants.js';

export function parseWatchlist(content) {
    const lines = content.split('\n');
    // Извлекаем ID и Название из первой строки
    const firstLine = lines[0];
    const match = firstLine.match(new RegExp(`${WATCHLIST_PREFIX}(\\d+) \\| \\*\\*Список №\\d+: (.+)\\*\\*`));

    const listId = match ? match[1] : null;
    const title = match ? match[2] : "Без названия";

    // Извлекаем пункты (пропускаем заголовок и пустую строку)
    const items = lines.slice(2)
        .filter(line => line.trim() && !line.startsWith('*Список пуст*'))
        .map(line => line.replace(/^\d+\.\s*/, ''));

    return { listId, title, items };
}
