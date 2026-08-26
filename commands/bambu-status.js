const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const bambu = require('../bambu/manager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-status')
		.setDescription('Shows the current status of a connected Bambu Lab printer.')
		.addStringOption((option) => option
			.setName('printer')
			.setDescription('Configured printer name.')
			.setRequired(true)),
	async execute(interaction) {
		const printer = interaction.options.getString('printer');
		const status = bambu.getStatus(printer);
		if (!status) {
			await interaction.reply({ content: `No status is available for ${printer}. Check the configured name and LAN connection.`, ephemeral: true });
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle(`Bambu Lab printer status: ${printer}`)
			.setColor(0x5865f2)
			.addFields(
				{ name: 'State', value: status.gcode_state ?? 'Unknown', inline: true },
				{ name: 'Progress', value: `${status.mc_percent ?? 0}%`, inline: true },
				{ name: 'Remaining', value: `${status.mc_remaining_time ?? 0} min`, inline: true },
			)
			.setTimestamp();

		if (status.subtask_name) embed.addFields({ name: 'File', value: status.subtask_name });

		await interaction.reply({ embeds: [embed] });
	},
};
