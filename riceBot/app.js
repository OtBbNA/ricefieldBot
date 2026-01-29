import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import { config } from './config.js';
import { handleInteraction } from './interactions/index.js';
import { client } from './client.js';

const app = express();

app.post(
    '/interactions',
    verifyKeyMiddleware(config.publicKey),
    (req, res) => {
        req.client = client;
        handleInteraction(req, res);
    }
);

app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
});
