const fs = require('node:fs');
const path = require('node:path');

const FILE_PATH = path.join(__dirname, '..', 'data', 'bambuChannels.json');

function ensureFile() {
	const dir = path.dirname(FILE_PATH);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '{}');
}

function readChannels() {
	ensureFile();
	return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
}

function writeChannels(data) {
	ensureFile();
	fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

function setChannel(guildId, channelId) {
	const data = readChannels();
	data[guildId] = channelId;
	writeChannels(data);
}

function clearChannel(guildId) {
	const data = readChannels();
	delete data[guildId];
	writeChannels(data);
}

function getChannel(guildId) {
	return readChannels()[guildId];
}

function getAllChannels() {
	return Object.values(readChannels());
}

module.exports = { setChannel, clearChannel, getChannel, getAllChannels };
