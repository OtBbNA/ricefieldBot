import { client } from './discordClient.js';

export let clientReady = false;
export const setClientReady = () => (clientReady = true);

client.once('ready', () => {
    console.log('✅ CLIENT READY EVENT FIRED');
    console.log(`🤖 Logged in as ${client.user.tag}`);
    setClientReady();
});
