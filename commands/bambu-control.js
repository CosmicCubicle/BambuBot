const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const bambu = require('../bambu/manager');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bambu-control')
		.setDescription('Control a connected Bambu Lab printer.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption((option) => option
			.setName('printer')
			.setDescription('Configured printer name.')
			.setRequired(true))
		.addStringOption((option) => option
			.setName('action')
			.setDescription('Action to send to the printer.')
			.setRequired(true)
			.addChoices(
				{ name: 'Pause print', value: 'pause' },
				{ name: 'Resume print', value: 'resume' },
				{ name: 'Stop print', value: 'stop' },
				{ name: 'Set standard speed', value: 'speed_standard' },
				{ name: 'Set sport speed', value: 'speed_sport' },
				{ name: 'Set ludicrous speed', value: 'speed_ludicrous' },
				{ name: 'Chamber light on', value: 'light_on' },
				{ name: 'Chamber light off', value: 'light_off' },
			))
		.addBooleanOption((option) => option
			.setName('confirm_stop')
			.setDescription('Required when the action is Stop print.')
			.setRequired(false)),
	async execute(interaction) {
		const printer = interaction.options.getString('printer');
		const action = interaction.options.getString('action');
		const confirmStop = interaction.options.getBoolean('confirm_stop') ?? false;

		if (action === 'stop' && !confirmStop) {
			await interaction.reply({ content: 'Stopping a print is destructive. Run this command again with `confirm_stop: True`.', ephemeral: true });
			return;
		}

		const speed = {
			speed_standard: 2,
			speed_sport: 3,
			speed_ludicrous: 4,
		}[action];
		const command = speed ? 'speed' : action;

		try {
			await bambu.control(printer, command, speed);
			await interaction.reply({ content: `Sent ${action.replaceAll('_', ' ')} to ${printer}.`, ephemeral: true });
		} catch (error) {
			console.error('Bambu Lab control failed:', error.message);
			await interaction.reply({ content: `Could not control the printer: ${error.message}`, ephemeral: true });
		}
	},
};
