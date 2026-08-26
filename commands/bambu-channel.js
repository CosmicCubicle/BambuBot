const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('../bambu/store');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-channel')
		.setDescription('Configure where Bambu Lab print notifications are sent in this server.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) => sub
			.setName('set')
			.setDescription('Set the channel for Bambu Lab notifications.')
			.addChannelOption((opt) => opt
				.setName('channel')
				.setDescription('Channel to post notifications in.')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true)))
		.addSubcommand((sub) => sub
			.setName('clear')
			.setDescription('Stop sending Bambu Lab notifications in this server.')),
	async execute(interaction) {
		if (!interaction.inGuild()) {
			await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		const subcommand = interaction.options.getSubcommand();
		if (subcommand === 'set') {
			const channel = interaction.options.getChannel('channel');
			store.setChannel(interaction.guildId, channel.id);
			await interaction.reply({ content: `Bambu Lab notifications will be sent to ${channel}.`, ephemeral: true });
		} else {
			store.clearChannel(interaction.guildId);
			await interaction.reply({ content: 'Bambu Lab notifications have been disabled for this server.', ephemeral: true });
		}
	},
};
