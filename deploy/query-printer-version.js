require('dotenv').config({ path: '/opt/BambuBot/hom.env' });
const mqtt = require('mqtt');

const printer = JSON.parse(process.env.BAMBU_PRINTERS)[0];
const client = mqtt.connect(`mqtts://${printer.host}:8883`, {
	username: 'bblp',
	password: printer.accessCode,
	rejectUnauthorized: false,
});

const timeout = setTimeout(() => {
	console.error('VERSION_QUERY_TIMEOUT');
	client.end(true);
	process.exit(1);
}, 10000);

client.on('connect', () => {
	client.subscribe(`device/${printer.serialNumber}/report`);
	client.publish(`device/${printer.serialNumber}/request`, JSON.stringify({ info: { sequence_id: 'version-check', command: 'get_version' } }), { qos: 0 });
});

client.on('message', (_topic, payload) => {
	const message = JSON.parse(payload.toString());
	if (!message.info && !message.system) return;
	clearTimeout(timeout);
	console.log(JSON.stringify({ info: message.info, system: message.system }));
	client.end(true);
	process.exit(0);
});

client.on('error', (error) => {
	clearTimeout(timeout);
	console.error(`VERSION_QUERY_FAILED: ${error.message}`);
	process.exit(1);
});
