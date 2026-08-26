const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const store = require('../bambu/store');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-notify')
		.setDescription('Configure which user gets tagged on Bambu Lab printer notifications.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) => sub
			.setName('set')
			.setDescription('Tag a user whenever a Bambu Lab printer notification is sent.')
			.addUserOption((opt) => opt
				.setName('user')
				.setDescription('User to tag on printer notifications.')
				.setRequired(true)))
		.addSubcommand((sub) => sub
			.setName('clear')
			.setDescription('Stop tagging a user on Bambu Lab printer notifications.')),
	async execute(interaction) {
		if (!interaction.inGuild()) {
			await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		if (!store.getChannel(interaction.guildId)) {
			await interaction.reply({ content: 'Set a notification channel first with /bambu-channel set.', ephemeral: true });
			return;
		}

		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'set') {
			const user = interaction.options.getUser('user');
			store.setNotifyUser(interaction.guildId, user.id);
			await interaction.reply({ content: `${user} will be tagged on Bambu Lab printer notifications.`, ephemeral: true });
		} else {
			store.clearNotifyUser(interaction.guildId);
			await interaction.reply({ content: 'Bambu Lab printer notifications will no longer tag a user.', ephemeral: true });
		}
	},
};
