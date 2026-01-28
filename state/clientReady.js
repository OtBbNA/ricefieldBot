import { client } from './discordClient.js';

export const clientReady = new Promise((resolve) => {
    if (client.isReady?.()) {
        resolve();
    } else {
        client.once('ready', () => {
            console.log(`🤖 Discord client ready as ${client.user.tag}`);
            resolve();
        });
    }
});
