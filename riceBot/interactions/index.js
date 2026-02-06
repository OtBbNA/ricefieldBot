import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { rateCommand } from './rate.js';

import { listCreate } from './watchlist/create.js';
import { listAdd } from './watchlist/add.js';
import { listEdit } from './watchlist/edit.js';
import { listRemove } from './watchlist/remove.js';

const commands = new Map([
    ['rate', rateCommand],
    ['list_create', listCreate],
    ['list_add', listAdd],
    ['list_edit', listEdit],
    ['list_remove', listRemove],
]);

export function handleInteraction(req, res) {
    const { type, data } = req.body;

    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        const command = commands.get(data.name);
        if (!command) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: '❌ Неизвестная команда', flags: 64 },
            });
        }
        return command.execute(req, res);
    }

    res.sendStatus(400);
}
