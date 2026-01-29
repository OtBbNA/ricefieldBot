import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { rateCommand } from './rate.js';

import { watchlistCreate } from './watchlist/create.js';
import { watchlistAdd } from './watchlist/add.js';
import { watchlistEdit } from './watchlist/edit.js';
import { watchlistRemove } from './watchlist/remove.js';

const commands = new Map([
    ['rate', rateCommand],
    ['watchlist_create', watchlistCreate],
    ['watchlist_add', watchlistAdd],
    ['watchlist_edit', watchlistEdit],
    ['watchlist_remove', watchlistRemove],
]);

export async function handleInteraction(req, res) {
    const { type, data } = req.body;

    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        const command = commands.get(data.name);

        if (!command) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Неизвестная команда.', flags: 64 },
            });
        }

        return command.execute(req, res);
    }

    return res.status(400).send();
}
