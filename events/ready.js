const { Events } = require('discord.js');
const bambu = require('../bambu/manager');
const streamServer = require('../bambu/streamServer');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Logged in as ${client.user.tag}.`);
		bambu.init(client);

		if (process.env.BAMBU_STREAM_PORT) {
			streamServer.start(Number(process.env.BAMBU_STREAM_PORT));
		}
	},
};
