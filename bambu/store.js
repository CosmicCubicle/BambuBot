const fs = require('node:fs');
const path = require('node:path');

const FILE_PATH = path.join(__dirname, '..', 'data', 'bambuChannels.json');

function ensureFile() {
	const dir = path.dirname(FILE_PATH);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '{}');
}

function readData() {
	ensureFile();
	const raw = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

	// Migrate the old schema (guildId -> channelId string) to the object schema.
	const migrated = {};
	for (const [guildId, value] of Object.entries(raw)) {
		migrated[guildId] = typeof value === 'string' ? { channelId: value } : value;
	}
	return migrated;
}

function writeData(data) {
	ensureFile();
	fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

function setChannel(guildId, channelId) {
	const data = readData();
	data[guildId] = { ...data[guildId], channelId };
	writeData(data);
}

function clearChannel(guildId) {
	const data = readData();
	if (data[guildId]) delete data[guildId].channelId;
	writeData(data);
}

function getChannel(guildId) {
	return readData()[guildId]?.channelId;
}

function setNotifyUser(guildId, userId) {
	const data = readData();
	data[guildId] = { ...data[guildId], notifyUserId: userId };
	writeData(data);
}

function clearNotifyUser(guildId) {
	const data = readData();
	if (data[guildId]) delete data[guildId].notifyUserId;
	writeData(data);
}

function getNotifyUser(guildId) {
	return readData()[guildId]?.notifyUserId;
}

function getAllGuildConfigs() {
	return Object.values(readData()).filter((config) => config.channelId);
}

module.exports = {
	setChannel,
	clearChannel,
	getChannel,
	setNotifyUser,
	clearNotifyUser,
	getNotifyUser,
	getAllGuildConfigs,
};

