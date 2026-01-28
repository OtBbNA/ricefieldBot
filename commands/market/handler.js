import { InteractionResponseType } from 'discord-interactions';
import { buildLabelsModal } from './modalBuilder.js';

export function handleCommand(body, res) {
    const { data } = body;

    const topic =
    data.options.find(o => o.name === 'topic')?.value || 'Без темы';

    const optionsCount =
    data.options.find(o => o.name === 'options')?.value === 3 ? 3 : 2;

    return res.send({
        type: InteractionResponseType.MODAL,
        data: buildLabelsModal(topic.slice(0, 300), optionsCount),
    });
}
