const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('../config.json');

module.exports = async (client) => {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`${commandsPath}/${file}`);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );

    console.log(`Slash-команд загружено: ${commands.length}`);
};
