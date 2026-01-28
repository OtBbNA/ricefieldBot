export default {
    name: 'rate',
    description: 'Добавляет реакции 1–10 под указанным сообщением',
    type: 1,
    options: [
        {
            name: 'message',
            description: 'Ссылка на сообщение',
            type: 3,
            required: true,
        },
    ],
};
