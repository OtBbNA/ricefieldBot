export const pendingTopics = new Map();

export function buildLabelsModal(topic, optionsCount) {
    const token =
    (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 8);

    pendingTopics.set(token, topic);
    setTimeout(() => pendingTopics.delete(token), 5 * 60 * 1000);

    const customId = `market_labels|${token}|${optionsCount}`;

    const fields = [
        {
            type: 1,
            components: [
                {
                    type: 4,
                    custom_id: 'label1',
                    style: 1,
                    label: '🟢 —',
                    required: false,
                    value: 'да',
                },
            ],
        },
    ];

    if (optionsCount === 3) {
        fields.push(
            {
                type: 1,
                components: [{ type: 4, custom_id: 'label2', style: 1, label: '🔵 —', value: 'ничья' }],
            },
            {
                type: 1,
                components: [{ type: 4, custom_id: 'label3', style: 1, label: '🔴 —', value: 'нет' }],
            },
        );
    } else {
        fields.push({
            type: 1,
            components: [{ type: 4, custom_id: 'label2', style: 1, label: '🔴 —', value: 'нет' }],
        });
    }

    return {
        custom_id: customId,
        title: 'Подписи к вариантам',
        components: fields,
    };
}
