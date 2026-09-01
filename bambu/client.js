const mqtt = require('mqtt');
const { EventEmitter } = require('node:events');

// Connects to a printer via Bambu's cloud-relayed MQTT and re-emits status updates.
class BambuCloudClient extends EventEmitter {
	constructor({ name, deviceId, serialNumber, cloudAccessToken }) {
		super();
		this.name = name;
		this.deviceId = deviceId; // Bambu cloud device identifier
		this.serialNumber = serialNumber;
		this.cloudAccessToken = cloudAccessToken; // Cloud auth token (not LAN access code)
		this.lastState = null;
		this.lastStatus = null;
		this.mqttClient = null;
		this.sequenceId = 0;
	}

	connect() {
		// Connect via Bambu's cloud MQTT relay instead of direct printer IP.
		this.mqttClient = mqtt.connect('mqtts://mqtt.bambulab.com:8883', {
			clientId: `PariahBot_${this.deviceId}`,
			username: `u_${this.deviceId}`,
			password: this.cloudAccessToken,
			reconnectPeriod: 5000,
			rejectUnauthorized: true,
		});

		this.mqttClient.on('connect', () => {
			// Cloud relay uses different topic structure: /c/<device-id>/report
			this.mqttClient.subscribe(`/c/${this.deviceId}/report`);
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
		if (!this.mqttClient?.connected) throw new Error('Bambu Lab cloud MQTT is not connected.');

		const payload = {
			[type]: {
				sequence_id: String(this.sequenceId++),
				...fields,
			},
		};
		// Cloud relay uses: /c/<device-id>/request
		const topic = `/c/${this.deviceId}/request`;

		// Cloud relay brokers are more reliable; use QoS 1 for better delivery guarantee.
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timed out sending the command to the printer.')), 8000);
			this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
				clearTimeout(timeout);
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

module.exports = { BambuCloudClient };
