import { WATCHLIST_HEADER } from './constants.js';

export async function findWatchlistMessage(channel) {
    const messages = await channel.messages.fetch({ limit: 50 });

    return messages.find(
        m =>
        m.author?.bot &&
        typeof m.content === 'string' &&
        m.content.startsWith(WATCHLIST_HEADER)
    );
}
