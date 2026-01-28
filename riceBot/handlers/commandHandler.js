import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';
import { token, clientId, guildId } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client) => {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
        const modulePath = `../commands/${file}`;
        const commandModule = await import(modulePath);

        const command = commandModule.default;

        if (!command) {
            console.warn(`⚠️ Команда ${file} не имеет export default`);
            continue;
        }

        if (!command.data || !command.execute) {
            console.warn(`⚠️ Команда ${file} должна иметь data и execute`);
            continue;
        }

        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());

        console.log(`✅ Загружена команда: ${command.data.name}`);
    }

    const rest = new REST({ version: '10' }).setToken(token);

    await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
    );

    console.log(`🚀 Slash-команд зарегистрировано: ${commands.length}`);
};
