import { InteractionResponseType } from 'discord-interactions';
import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';
import fetch from 'node-fetch';

export const data = {
    name: 'list_remove',
    description: 'Удалить элемент из списка',
    options: [
        { name: 'list_id', type: 4, description: 'Номер списка', required: true },
        { name: 'number', type: 4, description: 'Номер строки', required: true }
    ]
};

export const listRemove = {
    async execute(req, res) {
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const listId = req.body.data.options.find(o => o.name === 'list_id').value;
        const index = req.body.data.options.find(o => o.name === 'number').value - 1;
        const { application_id: appId, token, channel_id: channelId } = req.body;

        try {
            const msg = await findWatchlistById(channelId, listId);

            if (!msg) return updateResponse(appId, token, `❌ Список №${listId} не найден`);

            const { title, items } = parseWatchlist(msg.content);
            if (index < 0 || index >= items.length) return updateResponse(appId, token, `❌ Неверный номер строки`);

            items.splice(index, 1);
            await rest.patch(Routes.channelMessage(channelId, msg.id), {
                body: { content: renderWatchlist(listId, title, items) }
            });
            await updateResponse(appId, token, `🗑 Удалено из списка №${listId}`);
        } catch (err) {
            console.error(err);
            await updateResponse(appId, token, `❌ Ошибка при удалении`);
        }
    }
};

async function updateResponse(appId, token, content) {
    await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
}