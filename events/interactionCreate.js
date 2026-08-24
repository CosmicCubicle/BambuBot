const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			const errorReply = { content: 'There was an error executing this command.', ephemeral: true };
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(errorReply);
			} else {
				await interaction.reply(errorReply);
			}
		}
	},
};
