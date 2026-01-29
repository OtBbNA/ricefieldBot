import 'dotenv/config';
import express from 'express';
import {
InteractionType,
InteractionResponseType,
verifyKeyMiddleware,
} from 'discord-interactions';

import { handleInteraction } from './interactions/index.js';
import { client } from './client.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.post(
    '/interactions',
    express.raw({ type: '*/*' }),
    verifyKeyMiddleware(process.env.PUBLIC_KEY),
    handleInteraction
);

app.get('/ping', (req, res) => res.send('ok'));

app.listen(PORT, () => {
    console.log(`🌐 Server running on ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
