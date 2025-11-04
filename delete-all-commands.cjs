// delete-all-commands.js
const { REST } = require('discord.js');
const { Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;
const guildId = process.env.GUILD_ID; // optional

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Deleting commands...');
        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('✅ All guild commands deleted.');
        } else {
            await rest.put(Routes.applicationCommands(clientId), { body: [] });
            console.log('✅ All global commands deleted.');
        }
    } catch (err) {
        console.error('Error deleting commands:', err);
    }
})();
