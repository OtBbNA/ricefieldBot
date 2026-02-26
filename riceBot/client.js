import { Client, GatewayIntentBits, REST } from 'discord.js';
import { config } from './config.js';

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

export const rest = new REST({ version: '10' }).setToken(config.token);

client.login(config.token).catch(() => console.log("WS Connection failed, using REST only."));