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

client.login(config.token).catch(err => console.error("Ошибка логина:", err));

client.once('ready', () => {
    console.log(`✅ Бот успешно авторизован как ${client.user.tag}`);
});
