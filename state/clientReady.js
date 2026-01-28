import { client } from './discordClient.js';

export let clientReady = false;
export const setClientReady = () => (clientReady = true);
export const clientReady = new Promise((resolve) => {
    if (client.isReady?.()) {
        resolve();
    } else {
        client.once('ready', () => {
            console.log(`🤖 Logged in as ${client.user.tag}`);
            setClientReady();
        });
    }
});
