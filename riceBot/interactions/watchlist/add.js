import { InteractionResponseType } from 'discord-interactions';
import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';
import { updateOriginalInteractionResponse } from '../discordResponse.js';

export const data = {
    name: 'list_add',
    description: 'Добавить в список',
    options: [
        { name: 'list_id', type: 4, description: 'ID списка', required: true },
        { name: 'text', type: 3, description: 'Текст', required: true },
    ],
};

export const listAdd = {
    async execute({ req, replyFinal }) {
        res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, data: { flags: 64 } });

        const { application_id: appId, token, channel_id: channelId } = req.body;

        try {
            const options = req.body?.data?.options ?? [];
            const listId = options.find(o => o.name === 'list_id')?.value;
            const text = options.find(o => o.name === 'text')?.value;

            if (!listId) {
                await updateResponse(appId, token, '❌ Не передан list_id');
                return;
            }

            if (!text) {
                await updateResponse(appId, token, '❌ Не передан text');
                return;
            }
            const msg = await findWatchlistById(channelId, listId);
            if (!msg) return await updateOriginalInteractionResponse(appId, token, `❌ Список №${listId} не найден.`);

            const { title, items } = parseWatchlist(msg.content);
            items.push(text);

            // Редактируем сообщение через REST PATCH
            await rest.patch(Routes.channelMessage(channelId, msg.id), {
                body: { content: renderWatchlist(listId, title, items) }
            });

            await updateOriginalInteractionResponse(appId, token, `✅ Добавлено в список №${listId}`);
        } catch (err) {
            console.error(err);
            await updateOriginalInteractionResponse(appId, token, `❌ Ошибка: ${err.message}`);
        }
    }
};