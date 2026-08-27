const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const bambu = require('../bambu/manager');
const camera = require('../bambu/camera');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-snapshot')
		.setDescription("Grabs a live snapshot from a Bambu Lab printer's camera.")
		.addStringOption((option) => option
			.setName('printer')
			.setDescription('Configured printer name.')
			.setRequired(true)),
	async execute(interaction) {
		const printerName = interaction.options.getString('printer');
		const printer = bambu.getPrinterConfig(printerName);
		if (!printer) {
			await interaction.reply({ content: `Unknown Bambu Lab printer: ${printerName}`, ephemeral: true });
			return;
		}

		await interaction.deferReply();
		const frame = await camera.getSnapshot(printer);
		const attachment = new AttachmentBuilder(frame, { name: `${printerName}-snapshot.jpg` });
		await interaction.editReply({ files: [attachment] });
	},
};
