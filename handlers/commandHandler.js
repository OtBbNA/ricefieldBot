import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';
import { clientId, guildId, token } from '../config.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client) => {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = await import(`../commands/${file}`);
        client.commands.set(command.default.data.name, command.default);
        commands.push(command.default.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );

    console.log(`✅ Slash-команд загружено: ${commands.length}`);
};
