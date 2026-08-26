const fs = require('node:fs');
const path = require('node:path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'commands.log');

let eventHubProducer = null;
if (process.env.EVENT_HUB_CONNECTION_STRING && process.env.EVENT_HUB_NAME) {
	try {
		const { EventHubProducerClient } = require('@azure/event-hubs');
		eventHubProducer = new EventHubProducerClient(process.env.EVENT_HUB_CONNECTION_STRING, process.env.EVENT_HUB_NAME);
	} catch (error) {
		console.error('Failed to initialize Azure Event Hub client:', error.message);
	}
}

function ensureLogDir() {
	if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatOptions(interaction) {
	if (!interaction.options?.data?.length) return '';
	return interaction.options.data.map((opt) => `${opt.name}=${opt.value}`).join(', ');
}

function buildEntry(interaction, status, durationMs, error) {
	return {
		timestamp: new Date().toISOString(),
		command: interaction.commandName,
		options: formatOptions(interaction),
		user: `${interaction.user.tag} (${interaction.user.id})`,
		guild: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM',
		channel: interaction.channel?.name ?? interaction.channelId,
		status,
		durationMs,
		error: error?.message,
	};
}

function toHumanLine(entry) {
	const options = entry.options ? ` (${entry.options})` : '';
	const errorSuffix = entry.error ? ` — error: ${entry.error}` : '';
	return `[${entry.timestamp}] ${entry.status.toUpperCase()} /${entry.command}${options} by ${entry.user} in #${entry.channel} (${entry.guild}) — ${entry.durationMs}ms${errorSuffix}`;
}

async function logCommand(entry) {
	ensureLogDir();
	fs.appendFileSync(LOG_FILE, `${toHumanLine(entry)}\n`);

	if (!eventHubProducer) return;
	try {
		const batch = await eventHubProducer.createBatch();
		batch.tryAdd({ body: entry });
		await eventHubProducer.sendBatch(batch);
	} catch (error) {
		console.error('Failed to send command log to Event Hub:', error.message);
	}
}

module.exports = { logCommand, buildEntry };
