const mqtt = require('mqtt');
const { EventEmitter } = require('node:events');

// Connects directly to a printer in LAN mode and re-emits status updates.
class BambuLanClient extends EventEmitter {
	constructor({ name, host, accessCode, serialNumber }) {
		super();
		this.name = name;
		this.host = host;
		this.accessCode = accessCode;
		this.serialNumber = serialNumber;
		this.lastState = null;
		this.lastStatus = null;
		this.mqttClient = null;
		this.sequenceId = 0;
	}

	connect() {
		this.mqttClient = mqtt.connect(`mqtts://${this.host}:8883`, {
			username: 'bblp',
			password: this.accessCode,
			reconnectPeriod: 5000,
			rejectUnauthorized: false,
		});

		this.mqttClient.on('connect', () => {
			this.mqttClient.subscribe(`device/${this.serialNumber}/report`);
			this.emit('connect');
		});

		this.mqttClient.on('message', (_topic, payload) => {
			let data;
			try {
				data = JSON.parse(payload.toString());
			} catch {
				return;
			}
			this.handleMessage(data);
		});

		this.mqttClient.on('error', (error) => this.emit('error', error));
		this.mqttClient.on('close', () => this.emit('disconnect'));
	}

	publishCommand(type, fields = {}) {
		if (!this.mqttClient?.connected) throw new Error('Bambu Lab MQTT is not connected.');

		const payload = {
			[type]: {
				sequence_id: String(this.sequenceId++),
				...fields,
			},
		};
		const topic = `device/${this.serialNumber}/request`;

		return new Promise((resolve, reject) => {
			this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	}

	publishPrintCommand(command, fields = {}) {
		return this.publishCommand('print', { command, ...fields });
	}

	handleMessage(data) {
		const print = data.print;
		if (!print || !print.gcode_state) return;

		this.lastStatus = { ...this.lastStatus, ...print };

		const newState = print.gcode_state;
		if (this.lastState !== null && newState !== this.lastState) {
			this.emit('stateChange', { oldState: this.lastState, newState, data: this.lastStatus });
		}
		this.lastState = newState;
		this.emit('status', this.lastStatus);
	}

	disconnect() {
		this.mqttClient?.end(true);
	}
}

module.exports = { BambuLanClient };
