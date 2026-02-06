import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('list_create')
    .setDescription('Создать новый список')
    .addStringOption(o =>
  o.setName('name')
    .setDescription('Название списка')
    .setRequired(true)
  ),

  new SlashCommandBuilder()
    .setName('list_add')
    .setDescription('Добавить пункт в список')
    .addIntegerOption(o =>
  o.setName('list_id')
    .setDescription('Номер списка')
    .setRequired(true)
  )
    .addStringOption(o =>
  o.setName('text')
    .setDescription('Текст пункта')
    .setRequired(true)
  ),

  new SlashCommandBuilder()
    .setName('list_edit')
    .setDescription('Редактировать пункт списка')
    .addIntegerOption(o =>
  o.setName('list_id')
    .setDescription('Номер списка')
    .setRequired(true)
  )
    .addIntegerOption(o =>
  o.setName('item_id')
    .setDescription('Номер пункта')
    .setRequired(true)
  )
    .addStringOption(o =>
  o.setName('text')
    .setDescription('Новый текст')
    .setRequired(true)
  ),

  new SlashCommandBuilder()
    .setName('list_remove')
    .setDescription('Удалить пункт из списка')
    .addIntegerOption(o =>
  o.setName('list_id')
    .setDescription('Номер списка')
    .setRequired(true)
  )
    .addIntegerOption(o =>
  o.setName('item_id')
    .setDescription('Номер пункта')
    .setRequired(true)
  ),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Deploying slash commands...');

    // 🔹 ГЛОБАЛЬНО (обновляются до 1 часа)
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    // 🔹 ИЛИ ДЛЯ КОНКРЕТНОГО СЕРВЕРА (обновляются мгновенно)
    // await rest.put(
    //   Routes.applicationGuildCommands(
    //     process.env.CLIENT_ID,
    //     process.env.GUILD_ID
    //   ),
    //   { body: commands }
    // );

    console.log('✅ Slash commands deployed');
  } catch (error) {
    console.error(error);
  }
})();