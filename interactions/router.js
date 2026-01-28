import { InteractionType } from 'discord-interactions';
import { commands } from '../commands/index.js';

export function routeInteraction(body, res) {
    const { type, data } = body;

    if (type === InteractionType.APPLICATION_COMMAND) {
        const cmd = commands[data.name];
        if (!cmd) return res.status(400).send();

        return cmd.handleCommand(body, res);
    }

    if (type === InteractionType.MODAL_SUBMIT) {
        for (const cmd of Object.values(commands)) {
            if (cmd.handleModal && data.custom_id.startsWith(cmd.name)) {
                return cmd.handleModal(body, res);
            }
        }
    }

    return res.status(400).send();
}
