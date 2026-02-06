export function parseList(content) {
    const lines = content.split('\n');

    const items = [];

    for (const line of lines) {
        if (line.startsWith('• ')) {
            items.push(line.slice(2));
        }
    }

    return items;
}
