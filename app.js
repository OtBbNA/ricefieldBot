import 'dotenv/config';
import express from 'express';
import { verifyKeyMiddleware, InteractionResponseType, InteractionType } from 'discord-interactions';
import { routeInteraction } from './interactions/router.js';
import { client } from './state/discordClient.js';
import { registerReactionHandlers } from './polls/reactions.js';
import { handleRate } from './commands/rate/handler.js';

const app = express();

console.log('🚀 BEFORE LOGIN');

client.once('ready', () => {
    console.log('🤖 CLIENT READY:', client.user.tag);
});

await client.login(process.env.DISCORD_TOKEN);

console.log('🚀 AFTER LOGIN');

app.post(
    '/interactions',
    express.raw({ type: '*/*' }),
    verifyKeyMiddleware(process.env.PUBLIC_KEY),
    (req, res) => {
        if (req.body.type === InteractionType.PING) {
            return res.send({ type: InteractionResponseType.PONG });
        }

        return routeInteraction(req.body, res);
    }
);

app.listen(process.env.PORT || 3000);
registerReactionHandlers(client);
