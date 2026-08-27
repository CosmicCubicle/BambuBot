const { SlashCommandBuilder } = require('discord.js');
const bambu = require('../bambu/manager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-camera-link')
		.setDescription("Gets a live camera stream link for a Bambu Lab printer.")
		.addStringOption((option) => option
			.setName('printer')
			.setDescription('Configured printer name.')
			.setRequired(true)),
	async execute(interaction) {
		const printerName = interaction.options.getString('printer');
		if (!bambu.getPrinterConfig(printerName)) {
			await interaction.reply({ content: `Unknown Bambu Lab printer: ${printerName}`, ephemeral: true });
			return;
		}

		if (!process.env.BAMBU_STREAM_HOST || !process.env.BAMBU_STREAM_PORT) {
			await interaction.reply({ content: 'Camera streaming is not configured. Set BAMBU_STREAM_HOST and BAMBU_STREAM_PORT.', ephemeral: true });
			return;
		}

		const url = `http://${process.env.BAMBU_STREAM_HOST}:${process.env.BAMBU_STREAM_PORT}/stream/${encodeURIComponent(printerName)}.mjpeg`;
		await interaction.reply({
			content: `Live camera feed for **${printerName}**: ${url}\nOpen this link in a browser or media player (e.g. VLC) — Discord can't play it inline.`,
			ephemeral: true,
		});
	},
};
