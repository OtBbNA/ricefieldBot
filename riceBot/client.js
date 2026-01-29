import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

client.once('clientReady', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(config.token);
