require('dotenv').config({ path: 'hom.env' });
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(path.join(commandsPath, file));
	commands.push(command.data.toJSON());
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
	try {
		console.log(`Registering ${commands.length} application (/) commands.`);

		// GUILD_ID registers instantly for testing; omit it to register globally (takes up to 1 hour to propagate).
		const route = GUILD_ID
			? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
			: Routes.applicationCommands(CLIENT_ID);

		const data = await rest.put(route, { body: commands });

		console.log(`Successfully registered ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
