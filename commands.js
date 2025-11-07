// commands.js (GUILD version, instant update)
import 'dotenv/config';
import { DiscordRequest } from './utils.js';

const appId = process.env.APP_ID;
const guildId = '389884655702245376';
const endpoint = `applications/${appId}/guilds/${guildId}/commands`;

async function createCommand() {
  const marketCommand = {
    name: 'market',
    description: 'Создаёт опрос с коэффициентами (мини-полимаркет)',
    type: 1,
    options: [
      {
        name: 'topic',
        description: 'Тема опроса',
        type: 3, // STRING
        required: true,
        max_length: 90
      },
      {
        name: 'options',
        description: 'Количество вариантов ответа',
        type: 4, // INTEGER
        required: true,
        choices: [
          { name: '2 варианта (🟢 🔴)', value: 2 },
          { name: '3 варианта (🟢 🔵 🔴)', value: 3 },
        ],
      },
    ],
  };

  try {
    const res = await DiscordRequest(endpoint, {
      method: 'PUT',
      body: [marketCommand],
    });
    console.log('✅ GUILD команда /market обновлена:', await res.json());
  } catch (err) {
    console.error('❌ Ошибка установки команды:', err);
  }
}

createCommand();
