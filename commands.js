//562952100981824
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
        type: 3,
        required: true,
      },
    ],
  };

  try {
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
