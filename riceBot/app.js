import { Client, GatewayIntentBits, Collection } from 'discord.js';
import commandHandler from './handlers/commandHandler.js';
import eventHandler from './handlers/eventHandler.js';
import { token } from './config.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

await commandHandler(client);
eventHandler(client);

client.login(token);
