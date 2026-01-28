const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { token } = require('./config.json');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();

commandHandler(client);
eventHandler(client);

client.login(token);
