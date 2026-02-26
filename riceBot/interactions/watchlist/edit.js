import { InteractionResponseType } from 'discord-interactions';
import { Routes } from 'discord.js';
import { rest } from '../../client.js';
import { findWatchlistById } from './findMessage.js';
import { parseWatchlist } from './parse.js';
import { renderWatchlist } from './utils.js';
import { updateOriginalInteractionResponse } from '../discordResponse.js';

export const data = {
    name: 'list_edit',
    description: 'Изменить элемент в списке',
    options: [
        { name: 'list_id', type: 4, description: 'Номер списка', required: true },
        { name: 'number', type: 4, description: 'Номер строки', required: true },
        { name: 'text', type: 3, description: 'Новый текст', required: true }
    ]
};

export const listEdit = {
    async execute(req, res) {
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }
        });

        const { application_id: appId, token, channel_id: channelId } = req.body;

        try {
            const options = req.body?.data?.options ?? [];
            const listId = options.find(o => o.name === 'list_id')?.value;
            const number = options.find(o => o.name === 'number')?.value;
            const newText = options.find(o => o.name === 'text')?.value;

            if (!listId) {
                await updateResponse(appId, token, '❌ Не передан list_id');
                return;
            }
            if (number == null) {
                await updateResponse(appId, token, '❌ Не передан number');
                return;
            }
            if (!newText) {
                await updateResponse(appId, token, '❌ Не передан text');
                return;
            }
            const index = number - 1;
            const msg = await findWatchlistById(channelId, listId);

            if (!msg) return updateOriginalInteractionResponse(appId, token, `❌ Список №${listId} не найден`);

            const { title, items } = parseWatchlist(msg.content);
            if (index < 0 || index >= items.length) return updateOriginalInteractionResponse(appId, token, `❌ Неверный номер строки`);

            items[index] = newText;
            await rest.patch(Routes.channelMessage(channelId, msg.id), {
                body: { content: renderWatchlist(listId, title, items) }
            });
            await updateOriginalInteractionResponse(appId, token, `✅ Список №${listId} обновлен`);
        } catch (err) {
            console.error(err);
            await updateOriginalInteractionResponse(appId, token, `❌ Ошибка при редактировании`);
        }
    }
};