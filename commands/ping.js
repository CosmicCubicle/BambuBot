const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong and the bot latency.'),
	async execute(interaction) {
		const reply = await interaction.reply({ content: 'Pinging...', fetchReply: true });
		const latency = reply.createdTimestamp - interaction.createdTimestamp;
		await interaction.editReply(`Pong! Latency: ${latency}ms | API: ${Math.round(interaction.client.ws.ping)}ms`);
	},
};
