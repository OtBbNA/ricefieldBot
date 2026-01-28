export default {
    name: 'market',
    description: 'Создаёт опрос с коэффициентами (мини-полимаркет)',
    type: 1,
    options: [
        {
            name: 'topic',
            description: 'Тема опроса',
            type: 3,
            required: true,
            max_length: 2000,
        },
        {
            name: 'options',
            description: 'Количество вариантов ответа',
            type: 4,
            required: true,
            choices: [
                { name: '2 варианта (🟢 🔴)', value: 2 },
                { name: '3 варианта (🟢 🔵 🔴)', value: 3 },
            ],
        },
    ],
};
