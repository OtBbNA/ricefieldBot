import { LIST_HEADER_PREFIX, MAX_FETCH_MESSAGES } from './constants.js';

export async function findLists(channel) {
    const messages = await channel.messages.fetch({ limit: MAX_FETCH_MESSAGES });

    const lists = [];

    for (const message of messages.values()) {
        if (!message.author?.bot) continue;
        if (!message.content.includes(LIST_HEADER_PREFIX)) continue;

        const match = message.content.match(/-# Список №\s*(\d+)/);
        if (!match) continue;

        const id = Number(match[1]);
        const name = message.content.split('\n')[0].trim();

        lists.push({
            id,
            name,
            message,
        });
    }

    return lists.sort((a, b) => a.id - b.id);
}
