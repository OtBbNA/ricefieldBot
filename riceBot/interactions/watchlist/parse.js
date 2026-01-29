export function parseWatchlist(content) {
    const lines = content.split('\n').slice(2);

    const items = [];

    for (const line of lines) {
        const match = line.match(/^(\d+)\.\s+(.*)$/);
        if (match) items.push(match[2]);
    }

    return items;
}
