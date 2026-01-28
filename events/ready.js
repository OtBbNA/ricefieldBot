module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Бот запущен как ${client.user.tag}`);
    }
};
