// list-commands.js
const { REST } = require('discord.js');
const { Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;
const guildId = process.env.GUILD_ID; // optional

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        if (guildId) {
            const cmds = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
            console.log('Guild commands:', JSON.stringify(cmds, null, 2));
        } else {
            const cmds = await rest.get(Routes.applicationCommands(clientId));
            console.log('Global commands:', JSON.stringify(cmds, null, 2));
        }
    } catch (err) {
        console.error('Error listing commands:', err);
    }
})();
