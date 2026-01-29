import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

import { config } from './config.js';
import { handleInteraction } from './interactions/index.js';

const app = express();

console.log('PUBLIC KEY:', config.publicKey);

app.post(
    '/interactions',
    verifyKeyMiddleware(config.publicKey),
    handleInteraction
);

app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
});
