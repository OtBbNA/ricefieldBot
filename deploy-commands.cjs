// deploy-commands.js
const { REST } = require('discord.js');
const { Routes } = require('discord.js');
require('dotenv').config();

// Путь к твоему commands.js — если он в корне и называется commands.js
const commandsFile = require('./commands.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;
const guildId = process.env.GUILD_ID; // optional

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        // commandsFile должен быть массивом команд в формате API (name, description, options..)
        const commands = Array.isArray(commandsFile) ? commandsFile : [commandsFile];

        console.log('Deploying commands:', commands.map(c => c.name));
        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            console.log('✅ Commands registered for guild.');
        } else {
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('✅ Global commands registered.');
        }
    } catch (err) {
        console.error('Error deploying commands:', err);
    }
})();
