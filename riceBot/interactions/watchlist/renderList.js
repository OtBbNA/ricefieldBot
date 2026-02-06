export function renderList(name, id, items) {
    let text = `${name}\n-# Список № ${id}\n\n`;

    if (items.length === 0) {
        text += '_Список пуст_';
    } else {
        for (const item of items) {
            text += `• ${item}\n`;
        }
    }

    return text;
}
