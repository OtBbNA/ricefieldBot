// riceBot/interactions/watchlist/create.js
import { InteractionResponseType } from 'discord-interactions';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{ name: 'title', type: 3, description: 'Название', required: true }]
};

// Универсальная функция ответа
async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}

export const listCreate = {
    async execute(req, res) {
        // 1. Сразу отвечаем Дискорду
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const { application_id: appId, token, channel_id: channelId } = req.body;
        const title = req.body.data.options[0].value;
        const client = req.client;

        try {
            // 2. Ждем готовности (увеличим до 15 секунд для Render)
            if (!client.isReady()) {
                console.log("[Log] Клиент не готов, ждем...");
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Discord не ответил вовремя')), 15000);
                    client.once('ready', () => { clearTimeout(timeout); resolve(); });
                });
            }

            const channel = await client.channels.fetch(channelId);
            const nextId = await getNextListId(channel);
            const content = renderWatchlist(nextId, title, []);

            await channel.send(content);
            await updateResponse(appId, token, `✅ Список №${nextId} создан!`);

        } catch (err) {
            console.error(`[Error]`, err);
            await updateResponse(appId, token, `❌ Ошибка: ${err.message}. Проверьте Intents в панели разработчика.`);
        }
    }
};