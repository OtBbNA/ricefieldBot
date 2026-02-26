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

export const rest = new REST({ version: '10' }).setToken(config.token);

client.login(config.token).catch(() => {
    console.log("⚠️ WebSocket не подключился, но мы будем работать через REST");
});
