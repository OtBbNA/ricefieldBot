import { WATCHLIST_TITLE } from './constant.js';

export function renderWatchlist(items) {
    if (!items.length) return `${WATCHLIST_TITLE}\n\nСписок пуст`;
    return `${WATCHLIST_TITLE}\n\n${items.map((x,i)=>`${i+1}. ${x}`).join('\n')}`;
}
