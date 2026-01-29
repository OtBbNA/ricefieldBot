import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { rateCommand } from './rate.js';

const commands = new Map([
    ['rate', rateCommand],
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
                data: { content: '❌ Неизвестная команда.' },
            });
        }

        return command.execute(req, res);
    }

    return res.status(400).send();
}
