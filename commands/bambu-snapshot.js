const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const bambu = require('../bambu/manager');
const camera = require('../bambu/camera');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-snapshot')
		.setDescription("Grabs live snapshots from Bambu Lab printer cameras.")
		.addStringOption((option) => option
			.setName('printer')
			.setDescription('Configured printer name. Leave empty for all printers.')),
	async execute(interaction) {
		const printerName = interaction.options.getString('printer');
		const printerNames = printerName ? [printerName] : bambu.getPrinters();
		if (printerNames.length === 0) {
			await interaction.reply({ content: 'No Bambu Lab printers are configured.', ephemeral: true });
			return;
		}

		if (printerName && !bambu.getPrinterConfig(printerName)) {
			await interaction.reply({ content: `Unknown Bambu Lab printer: ${printerName}`, ephemeral: true });
			return;
		}

		await interaction.deferReply();
		const results = await Promise.allSettled(printerNames.map(async (name) => {
			const printer = bambu.getPrinterConfig(name);
			const frame = await camera.getSnapshot(printer);
			return { attachment: new AttachmentBuilder(frame, { name: `${name} (${printer.host}).jpg` }), label: `${name} (${printer.host})` };
		}));

		const successfulSnapshots = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
		const files = successfulSnapshots.map((snapshot) => snapshot.attachment);
		const failedPrinters = results
			.map((result, index) => result.status === 'rejected' ? printerNames[index] : null)
			.filter(Boolean);

		if (files.length === 0) throw new Error('Could not retrieve a camera frame from any configured printer.');

		const content = [`Snapshots: ${successfulSnapshots.map((snapshot) => `**${snapshot.label}**`).join(', ')}.`];
		if (failedPrinters.length) content.push(`Could not retrieve snapshots from: ${failedPrinters.join(', ')}.`);
		await interaction.editReply({ content: content.join('\n'), files });
	},
};
