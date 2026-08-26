const { Events } = require('discord.js');
const bambu = require('../bambu/manager');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Logged in as ${client.user.tag}.`);
		bambu.init(client);
	},
};
