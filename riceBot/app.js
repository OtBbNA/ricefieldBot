import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import fetch from 'node-fetch';
import { config } from './config.js';
import { handleInteraction } from './interactions/index.js';
import { client } from './client.js';

const app = express();

const SELF_URL =
process.env.RENDER_EXTERNAL_URL ||
`https://${process.env.RENDER_PROJECT_SLUG}.onrender.com`;

app.post(
    '/interactions',
    express.raw({ type: '*/*' }),
    verifyKeyMiddleware(config.publicKey),
    (req, res) => {
        req.client = client;
        handleInteraction(req, res);
    }
);

app.get('/ping', (req, res) => {
    res.status(200).send('ok');
});

app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
});

setInterval(() => {
    fetch(`${SELF_URL}/ping`)
        .then(() => console.log('💤 self-ping ok'))
        .catch(err => console.warn('⚠️ self-ping failed', err.message));
}, 40_000);
