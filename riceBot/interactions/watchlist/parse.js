// riceBot/interactions/watchlist/parse.js
import { LIST_HEADER_PREFIX } from './constants.js';

export function parseWatchlist(content) {
    const lines = content.split('\n');
    const firstLine = lines[0];

    // Регулярка должна использовать ту же константу
    const regex = new RegExp(`^${LIST_HEADER_PREFIX}(\\d+) \\| \\*\\*Список №\\d+: (.+)\\*\\*`);
    const match = firstLine.match(regex);

    const listId = match ? match[1] : null;
    const title = match ? match[2] : "Без названия";

    const items = lines.slice(2)
        .filter(line => line.trim() && !line.startsWith('*Список пуст*'))
        .map(line => line.replace(/^\d+\.\s*/, ''));

    return { listId, title, items };
}