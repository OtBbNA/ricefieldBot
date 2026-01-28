import { InteractionResponseType } from 'discord-interactions';
import { pendingTopics } from '../commands/market/modalBuilder.js';
import { polls } from './state.js';
import { generateEmptyAnsiFrameString } from './render.js';

export async function handleLabelsSubmit(body, res) {
    try {
        const { data, member, user } = body;
        const parts = data.custom_id.split('|');

        const token = parts[1];
        const optionsCount = parseInt(parts[2], 10) === 3 ? 3 : 2;

        const topic = pendingTopics.get(token) || 'Без темы';
        pendingTopics.delete(token);

        const author = member?.user?.username || user?.username || 'Неизвестный';

        const comps = data.components || [];
        const getVal = (i) => comps[i]?.components?.[0]?.value?.trim() || '';

        const labels =
        optionsCount === 3
        ? `-# 🟢 — ${getVal(0) || 'да'}, 🔵 — ${getVal(1) || 'ничья'}, 🔴 — ${getVal(2) || 'нет'}`
        : `-# 🟢 — ${getVal(0) || 'да'}, 🔴 — ${getVal(1) || 'нет'}`;

        const content =
        `📊\n# ${topic}\n-# by: ${author}\n\n` +
        '```ansi\n' +
        generateEmptyAnsiFrameString() +
        '\n```\n' +
        labels;

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content },
        });
    } catch (err) {
        console.error(err);
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'Ошибка создания опроса' },
        });
    }
}
