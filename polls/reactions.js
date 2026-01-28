import { polls, ignoreRemovals } from './state.js';
import { updatePollMessage } from './render.js';

function safeEmojiName(e) {
    return typeof e === 'string' ? e : e?.name;
}

export function registerReactionHandlers(client) {
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();

        const poll = polls.get(reaction.message.id);
        if (!poll) return;

        const name = safeEmojiName(reaction.emoji);
        poll.votes.a.delete(user.id);
        poll.votes.b.delete(user.id);
        poll.votes.c.delete(user.id);

        if (name === '🟢') poll.votes.a.add(user.id);
        if (name === '🔵') poll.votes.b.add(user.id);
        if (name === '🔴') poll.votes.c.add(user.id);

        await updatePollMessage(reaction.message, poll);
    });
}
