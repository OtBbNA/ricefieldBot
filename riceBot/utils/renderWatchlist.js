import { WATCHLIST_HEADER } from '../watchlist/constants.js';

export function renderWatchlist(items) {
    if (!items.length) {
        return `${WATCHLIST_HEADER}\n\nСписок пуст`;
    }

    return (
    `${WATCHLIST_HEADER}\n\n` +
    items.map((v, i) => `${i + 1}. ${v}`).join('\n')
    );
}
