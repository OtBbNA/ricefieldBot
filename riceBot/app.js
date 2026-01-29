import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import { config } from './config.js';
import { handleInteraction } from './interactions/index.js';
import './client.js';

const app = express();

app.post(
    '/interactions',
    express.raw({ type: '*/*' }),
    verifyKeyMiddleware(config.publicKey),
    handleInteraction
);

app.get('/ping', (_, res) => res.send('ok'));

app.listen(config.port, () =>
console.log(`🚀 Server running on port ${config.port}`)
);
