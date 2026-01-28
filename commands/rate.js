const { SlashCommandBuilder } = require('discord.js');
const parseMessageLink = require('../utils/parseMessageLink');

const reactions = [
    '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣',
    '6️⃣','7️⃣','8️⃣','9️⃣','🔟'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rate')
        .setDescription('Добавляет реакции от 1 до 10 к сообщению')
        .addStringOption(option =>
    option
        .setName('message_link')
        .setDescription('Ссылка на сообщение')
        .setRequired(true)
    ),

    async execute(interaction) {
        const link = interaction.options.getString('message_link');
        const parsed = parseMessageLink(link);

        if (!parsed) {
            return interaction.reply({ content: '❌ Неверная ссылка.', ephemeral: true });
        }

        const channel = await interaction.client.channels
            .fetch(parsed.channelId)
            .catch(() => null);

        if (!channel) {
            return interaction.reply({ content: '❌ Канал не найден.', ephemeral: true });
        }

        const message = await channel.messages
            .fetch(parsed.messageId)
            .catch(() => null);

        if (!message) {
            return interaction.reply({ content: '❌ Сообщение не найдено.', ephemeral: true });
        }

        for (const r of reactions) {
            await message.react(r);
        }

        await interaction.reply({ content: '✅ Реакции добавлены!', ephemeral: true });
    }
};
