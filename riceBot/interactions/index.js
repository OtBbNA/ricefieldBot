import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { rateCommand } from './rate.js';
import { replyFinal } from './replyFinal.js';

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
                data: { content: '❌ Неизвестная команда', flags: 64 },
            });
        }
        res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: 64 },
        });
        const context = {
            req,
            replyFinal: (content) => replyFinal(req, content),
        };
        try {
            await command.execute(context);
        } catch (error) {
            console.error(error);
            await context.replyFinal('❌ Внутренняя ошибка');
        }
        return;
    }

    res.sendStatus(400);
}
