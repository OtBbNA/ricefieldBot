import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import { data as rate } from './interactions/rate.js';
import { data as watchlistCreateData } from './interactions/watchlist/create.js';
import { data as watchlistAddData } from './interactions/watchlist/add.js';
import { data as watchlistEditData } from './interactions/watchlist/edit.js';
import { data as watchlistRemoveData } from './interactions/watchlist/remove.js';

const commands = [
  rate,
  watchlistCreateData,
  watchlistAddData,
  watchlistEditData,
  watchlistRemoveData,
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  try {
    console.log('🚀 Деплой слэш-команд...');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.APP_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Команды успешно обновлены');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка деплоя:', err);
    process.exit(1);
  }
}

deploy();