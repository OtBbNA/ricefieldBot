import 'dotenv/config';
import { DiscordRequest } from './utils.js';

async function createCommand() {
  const appId = process.env.APP_ID;
  const endpoint = `applications/${appId}/commands`;

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
      },
      {
        name: 'options',
        description: 'Количество вариантов (2 или 3)',
        type: 4, // INTEGER
        required: true,
        choices: [
          { name: '2', value: 2 },
          { name: '3', value: 3 },
        ],
      },
    ],
  };

  try {
    // create or replace (simple approach: create new - if exists you'll see error)
    const res = await DiscordRequest(endpoint, {
      method: 'POST',
      body: marketCommand,
    });
    console.log('✅ Команда /market зарегистрирована:', await res.json());
  } catch (err) {
    console.error('Ошибка установки команды:', err);
  }
}

createCommand();
