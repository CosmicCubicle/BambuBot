const { SlashCommandBuilder, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

function formatOption(option) {
	const required = option.required ? '*' : '';
	return `<${option.name}${required}>`;
}

function formatCommand(command) {
	const definition = command.data.toJSON();
	const subcommands = definition.options?.filter((option) => option.type === ApplicationCommandOptionType.Subcommand) ?? [];

	if (subcommands.length > 0) {
		return subcommands.map((subcommand) => {
			const options = subcommand.options?.map(formatOption).join(' ') ?? '';
			return `/${definition.name} ${subcommand.name} ${options}`.trim();
		}).join('\n');
	}

	const options = definition.options?.map(formatOption).join(' ') ?? '';
	return `/${definition.name} ${options}`.trim();
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows all available bot commands and their options.'),
	async execute(interaction) {
		const commands = [...interaction.client.commands.values()]
			.filter((command) => command.data.name !== 'help')
			.sort((first, second) => first.data.name.localeCompare(second.data.name));

		const embed = new EmbedBuilder()
			.setTitle('PariahBot commands')
			.setColor(0x5865f2)
			.setDescription('`*` marks a required option.')
			.setTimestamp();

		for (const command of commands) {
			embed.addFields({
				name: formatCommand(command),
				value: command.data.description,
			});
		}

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};
