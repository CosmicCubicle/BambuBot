const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const bambu = require('../bambu/manager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-status-all')
		.setDescription('Shows the current status of every configured Bambu Lab printer.'),
	async execute(interaction) {
		const printers = bambu.getPrinters();
		if (printers.length === 0) {
			await interaction.reply({ content: 'No Bambu Lab printers are configured.', ephemeral: true });
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle('Bambu Lab printer status')
			.setColor(0x5865f2)
			.setTimestamp();

		for (const name of printers) {
			const status = bambu.getStatus(name);
			if (!status) {
				embed.addFields({ name, value: 'No status available (check LAN connection).' });
				continue;
			}

			const lines = [
				`State: ${status.gcode_state ?? 'Unknown'}`,
				`Progress: ${status.mc_percent ?? 0}%`,
				`Remaining: ${status.mc_remaining_time ?? 0} min`,
			];
			if (status.subtask_name) lines.push(`File: ${status.subtask_name}`);

			embed.addFields({ name, value: lines.join('\n') });
		}

		await interaction.reply({ embeds: [embed] });
	},
};
