const parseMessageLink = require('../utils/parseMessageLink');

const reactions = [
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
    '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'
];

module.exports = {
    name: 'rate',
    description: 'Добавляет реакции от 1 до 10 под сообщением',
    async execute(message, args, client) {
        const link = args[0];
        if (!link) {
            return message.reply('❌ Укажи ссылку на сообщение.');
        }

        const parsed = parseMessageLink(link);
        if (!parsed) {
            return message.reply('❌ Неверная ссылка.');
        }

        const channel = await client.channels.fetch(parsed.channelId).catch(() => null);
        if (!channel) {
            return message.reply('❌ Канал не найден.');
        }

        const targetMessage = await channel.messages.fetch(parsed.messageId).catch(() => null);
        if (!targetMessage) {
            return message.reply('❌ Сообщение не найдено.');
        }

        for (const reaction of reactions) {
            await targetMessage.react(reaction);
        }

        message.reply('✅ Реакции добавлены!');
    }
};
