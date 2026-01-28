import { InteractionType } from 'discord-interactions';
import { commands } from '../commands/index.js';
import { logIncoming, logSuccess, logError } from '../utils/logger.js';

export function routeInteraction(body, res) {
    const { type, data } = body;

    try {
        if (type === InteractionType.APPLICATION_COMMAND) {
            logIncoming(`APPLICATION_COMMAND /${data.name}`);

            const cmd = commands[data.name];
            if (!cmd) {
                logError(`Unknown command: ${data.name}`);
                return res.status(400).send();
            }

            const result = cmd.handleCommand(body, res);
            logSuccess(`Response sent for /${data.name}`);
            return result;
        }

        if (type === InteractionType.MODAL_SUBMIT) {
            logIncoming(`MODAL_SUBMIT ${data.custom_id}`);

            for (const cmd of Object.values(commands)) {
                if (cmd.handleModal && data.custom_id.startsWith(cmd.name)) {
                    const result = cmd.handleModal(body, res);
                    logSuccess(`Modal handled: ${data.custom_id}`);
                    return result;
                }
            }

            logError(`Unhandled modal: ${data.custom_id}`);
        }

        return res.status(400).send();
    } catch (err) {
        logError('Interaction router crashed', err);

        try {
            return res.send({
                type: 4,
                data: { content: '❌ Внутренняя ошибка сервера.' },
            });
        } catch {
            return;
        }
    }
}
