const { Events } = require('discord.js');
const commandLogger = require('../logging/commandLogger');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) return;

		const start = Date.now();
		try {
			await command.execute(interaction);
			await commandLogger.logCommand(commandLogger.buildEntry(interaction, 'success', Date.now() - start));
		} catch (error) {
			console.error(error);
			await commandLogger.logCommand(commandLogger.buildEntry(interaction, 'error', Date.now() - start, error));
			const errorReply = { content: 'There was an error executing this command.', ephemeral: true };
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(errorReply);
			} else {
				await interaction.reply(errorReply);
			}
		}
	},
};
