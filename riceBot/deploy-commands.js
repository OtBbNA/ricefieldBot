import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from './config.js';

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

console.log('DEBUG: Token starts with:', config.token ? config.token.substring(0, 10) : 'MISSING');

if (!config.token) {
  console.error('❌ Ошибка: DISCORD_TOKEN не найден!');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);

async function deploy() {
  try {
    console.log('🚀 Деплой слэш-команд...');

    await rest.put(
      Routes.applicationGuildCommands(
        config.appId,
        config.guildId
      ),
      { body: commands }
    );

    console.log('✅ Команды успешно обновлены');
  } catch (err) {
    console.error('❌ Ошибка деплоя:', err);
  }
}

deploy();