import { InteractionResponseType } from 'discord-interactions';
import { findWatchlistMessage } from '../../utils/findWatchlistMessage.js';
import { renderWatchlist } from '../../utils/renderWatchlist.js';
import { parseWatchlist } from '../../utils/parseWatchlist.js';
import { client } from '../../client.js';

export const watchlistAdd = {
    name: 'watchlist_add',

    async execute(req, res) {
        // ✅ 1. СРАЗУ подтверждаем interaction
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 }, // ephemeral
        });

        try {
            console.log('ADD: start');

            const channelId = req.body.channel_id;
            const channel = await client.channels.fetch(channelId);
            if (!channel?.isTextBased()) {
                console.log('ADD: channel not text');
                return;
            }

            const watchlistMessage = await findWatchlistMessage(channel);
            console.log('ADD: message found?', !!watchlistMessage);

            if (!watchlistMessage) {
                console.log('ADD: no watchlist message');
                return;
            }

            const text =
            req.body.data.options?.find(o => o.name === 'text')?.value;

            if (!text) {
                console.log('ADD: no text');
                return;
            }

            const items = parseWatchlist(watchlistMessage.content);
            items.push(text);

            const newContent = renderWatchlist(items);
            console.log('ADD: editing message');

            await watchlistMessage.edit(newContent);
            console.log('ADD: done');

        } catch (err) {
            console.error('ADD ERROR:', err);
        }
    },
};
