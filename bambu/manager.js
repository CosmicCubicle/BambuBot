const { EmbedBuilder } = require('discord.js');
const { BambuLanClient } = require('./client');
const store = require('./store');

const STATE_COLORS = {
	RUNNING: 0x57f287,
	PAUSE: 0xfee75c,
	FINISH: 0x5865f2,
	FAILED: 0xed4245,
	IDLE: 0x99aab5,
};

const bambuClients = new Map();

async function init(discordClient) {
	if (!process.env.BAMBU_PRINTERS) {
		console.warn('Bambu Lab notifications disabled: set BAMBU_PRINTERS in .env.');
		return;
	}

	try {
		const printers = JSON.parse(process.env.BAMBU_PRINTERS);
		if (!Array.isArray(printers) || printers.length === 0) throw new Error('BAMBU_PRINTERS must be a non-empty JSON array.');

		for (const printer of printers) {
			if (!printer.name || !printer.host || !printer.accessCode || !printer.serialNumber) {
				throw new Error('Each Bambu printer needs name, host, accessCode, and serialNumber.');
			}
			if (bambuClients.has(printer.name)) throw new Error(`Duplicate Bambu printer name: ${printer.name}`);

			const client = new BambuLanClient(printer);
			bambuClients.set(printer.name, client);
			client.on('connect', () => console.log(`Connected to Bambu Lab printer ${printer.name} at ${printer.host}.`));
			client.on('disconnect', () => console.warn(`Disconnected from Bambu Lab printer ${printer.name}.`));
			client.on('error', (error) => console.error(`Bambu Lab ${printer.name} MQTT error:`, error.message));
			client.on('stateChange', ({ oldState, newState, data }) => broadcastStateChange(discordClient, printer.name, oldState, newState, data));
			client.connect();
		}
	} catch (error) {
		console.error('Failed to initialize Bambu Lab connection:', error.message);
	}
}

function broadcastStateChange(discordClient, printerName, oldState, newState, data) {
	const embed = new EmbedBuilder()
		.setTitle(`Bambu Lab printer update: ${printerName}`)
		.setDescription(`${oldState} → ${newState}`)
		.setColor(STATE_COLORS[newState] ?? 0x99aab5)
		.setTimestamp();

	if (data.subtask_name) embed.addFields({ name: 'File', value: data.subtask_name, inline: true });
	if (typeof data.mc_percent === 'number') embed.addFields({ name: 'Progress', value: `${data.mc_percent}%`, inline: true });
	if (typeof data.mc_remaining_time === 'number') embed.addFields({ name: 'Remaining', value: `${data.mc_remaining_time} min`, inline: true });

	for (const { channelId, notifyUserId } of store.getAllGuildConfigs()) {
		const channel = discordClient.channels.cache.get(channelId);
		if (channel?.isTextBased()) {
			const content = notifyUserId ? `<@${notifyUserId}>` : undefined;
			channel.send({ content, embeds: [embed] }).catch((error) => console.error('Failed to send Bambu Lab notification:', error.message));
		}
	}
}

function getPrinters() {
	return [...bambuClients.keys()];
}

function getStatus(printerName) {
	return bambuClients.get(printerName)?.lastStatus ?? null;
}

async function control(printerName, action, value) {
	const bambuClient = bambuClients.get(printerName);
	if (!bambuClient) throw new Error(`Unknown Bambu Lab printer: ${printerName}`);

	const commands = {
		pause: ['pause', { param: '' }],
		resume: ['resume', { param: '' }],
		stop: ['stop', { param: '' }],
		speed: ['print_speed', { param: String(value) }],
		light_on: ['ledctrl', { led_node: 'chamber_light', led_mode: 'on', led_on_time: 500, led_off_time: 500, loop_times: 1, interval_time: 1000 }],
		light_off: ['ledctrl', { led_node: 'chamber_light', led_mode: 'off', led_on_time: 500, led_off_time: 500, loop_times: 1, interval_time: 1000 }],
	};
	const [command, fields] = commands[action] || [];
	if (!command) throw new Error(`Unsupported Bambu Lab action: ${action}`);

	if (action === 'light_on' || action === 'light_off') {
		return bambuClient.publishCommand('system', { command, ...fields });
	}
	return bambuClient.publishPrintCommand(command, fields);
}

module.exports = { init, getPrinters, getStatus, control };
