const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const bambu = require('../bambu/manager');

function printerOption(option) {
	return option
		.setName('printer')
		.setDescription('Configured printer name.')
		.setRequired(true);
}

function amsOption(option) {
	return option
		.setName('ams')
		.setDescription('AMS unit index, starting at 0.')
		.setRequired(true)
		.setMinValue(0);
}

function slotOption(option) {
	return option
		.setName('slot')
		.setDescription('AMS slot index, from 0 to 3.')
		.setRequired(true)
		.setMinValue(0)
		.setMaxValue(3);
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-maintenance')
		.setDescription('Home the printer or manage AMS filament settings.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((subcommand) => subcommand
			.setName('home')
			.setDescription('Home all printer axes.')
			.addStringOption(printerOption)
			.addBooleanOption((option) => option
				.setName('confirm')
				.setDescription('Required to home the printer.')
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('load')
			.setDescription('Load filament from an AMS slot.')
			.addStringOption(printerOption)
			.addIntegerOption(amsOption)
			.addIntegerOption(slotOption)
			.addBooleanOption((option) => option
				.setName('confirm')
				.setDescription('Required to load AMS filament.')
				.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
			.setName('set-filament')
			.setDescription('Set the displayed material type and color for an AMS slot.')
			.addStringOption(printerOption)
			.addIntegerOption(amsOption)
			.addIntegerOption(slotOption)
			.addStringOption((option) => option
				.setName('type')
				.setDescription('Material type, for example PLA, PETG, ABS, or TPU.')
				.setRequired(true)
				.setMaxLength(32))
			.addStringOption((option) => option
				.setName('color')
				.setDescription('Eight-digit RRGGBBAA hex color, for example FF0000FF.')
				.setRequired(true)
				.setMinLength(8)
				.setMaxLength(8))),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const printer = interaction.options.getString('printer');

		if (!bambu.getPrinterConfig(printer)) {
			await interaction.reply({ content: `Unknown Bambu Lab printer: ${printer}`, ephemeral: true });
			return;
		}

		if ((subcommand === 'home' || subcommand === 'load') && !interaction.options.getBoolean('confirm')) {
			await interaction.reply({ content: `Set confirm:true to run the ${subcommand} operation.`, ephemeral: true });
			return;
		}

		await interaction.deferReply({ ephemeral: true });
		if (subcommand === 'home') {
			await bambu.home(printer);
			await interaction.editReply(`Sent home command to ${printer}.`);
			return;
		}

		const amsId = interaction.options.getInteger('ams');
		const slotId = interaction.options.getInteger('slot');
		if (subcommand === 'load') {
			await bambu.loadAmsFilament(printer, amsId, slotId);
			await interaction.editReply(`Sent AMS ${amsId}, slot ${slotId} load command to ${printer}.`);
			return;
		}

		const type = interaction.options.getString('type');
		const color = interaction.options.getString('color');
		if (!/^[0-9a-fA-F]{8}$/.test(color)) throw new Error('Color must be exactly eight hexadecimal characters in RRGGBBAA format.');
		await bambu.setAmsFilament(printer, amsId, slotId, type, color);
		await interaction.editReply(`Set AMS ${amsId}, slot ${slotId} on ${printer} to ${type.toUpperCase()} #${color.toUpperCase()}.`);
	},
};