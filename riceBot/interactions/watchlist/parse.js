export function parseWatchlist(content) {
    return content
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .map(l => l.replace(/^\d+\.\s*/, ''));
}
