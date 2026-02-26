// riceBot/interactions/watchlist/create.js
import { InteractionResponseType } from 'discord-interactions';
import { getNextListId } from './findMessage.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_create',
    description: 'Создать новый список',
    options: [{
        name: 'title',
        type: 3,
        description: 'Название вашего списка',
        required: true
    }]
};

// Функция для отправки ответа через вебхук (вынесена вверх, чтобы была доступна везде)
async function updateResponse(appId, token, content) {
    try {
        await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
    } catch (e) {
        console.error("Ошибка при отправке updateResponse:", e);
    }
}

// Функция ожидания готовности клиента
const waitUntilReady = (client, timeout = 10000) => {
    if (client.isReady()) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Discord client failed to ready in time')), timeout);
        client.once('ready', () => {
            clearTimeout(timer);
            resolve();
        });
    });
};

export const listCreate = {
    async execute(req, res) {
        // Мгновенный ответ
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const title = req.body.data.options[0].value;
        const appId = req.body.application_id;
        const token = req.body.token;
        const channelId = req.body.channel_id;

        try {
            console.log(`[Log] Ждем готовности клиента...`);
            await waitUntilReady(req.client);

            console.log(`[Log] Клиент готов. Получаем канал ${channelId}`);
            const channel = await req.client.channels.fetch(channelId);

            const nextId = await getNextListId(channel);
            const content = renderWatchlist(nextId, title, []);

            await channel.send(content);
            await updateResponse(appId, token, `✅ Список №${nextId} создан!`);

        } catch (err) {
            console.error(`[Critical Error]`, err);
            await updateResponse(appId, token, `❌ Ошибка: ${err.message}`);
        }
    },
};