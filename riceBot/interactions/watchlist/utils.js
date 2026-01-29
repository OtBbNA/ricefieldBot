import { client } from '../../client.js';

export async function getWatchlistMessage(channelId) {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return null;

    const messages = await channel.messages.fetch({ limit: 10 });
    return messages.find(m => m.author.bot && m.content.startsWith('🎬 Фильмы к просмотру'));
}

export function parseList(content) {
    const lines = content.split('\n').slice(2);
    return lines
        .map(l => l.match(/^(\d+)\.\s+(.*)$/))
        .filter(Boolean)
        .map(m => m[2]);
}

export function buildMessage(list) {
    const body = list.map((t, i) => `${i + 1}. ${t}`).join('\n');
    return `ᛕᛋᚺᛜ ᚺᚤ ᛒᛊᛋᛊᚹ\n\n${body || '_Список пуст_'}`;
}