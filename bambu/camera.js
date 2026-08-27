const tls = require('node:tls');

const CAMERA_PORT = 6000;

// Bambu Lab's onboard camera speaks a proprietary framed-JPEG protocol over a raw
// TLS socket: an 80-byte auth packet, then a stream of frames each prefixed by a
// 16-byte header whose first 4 bytes (LE) are the JPEG payload length.
function buildAuthPacket(accessCode) {
	const packet = Buffer.alloc(80);
	packet.writeUInt32LE(0x40, 0);
	packet.writeUInt32LE(0x3000, 4);
	Buffer.from('bblp', 'utf8').copy(packet, 16);
	Buffer.from(accessCode, 'utf8').copy(packet, 48);
	return packet;
}

// Opens the camera connection and invokes onFrame(Buffer) for each JPEG frame received.
// Returns the socket; the caller is responsible for destroying it when done.
function openCameraStream({ host, accessCode }, onFrame, onError) {
	const socket = tls.connect({ host, port: CAMERA_PORT, rejectUnauthorized: false }, () => {
		socket.write(buildAuthPacket(accessCode));
	});

	let buffer = Buffer.alloc(0);
	let expectedSize = null;

	socket.on('data', (chunk) => {
		buffer = Buffer.concat([buffer, chunk]);

		for (;;) {
			if (expectedSize === null) {
				if (buffer.length < 16) return;
				expectedSize = buffer.readUInt32LE(0);
				buffer = buffer.subarray(16);
			}
			if (buffer.length < expectedSize) return;

			const frame = Buffer.from(buffer.subarray(0, expectedSize));
			buffer = buffer.subarray(expectedSize);
			expectedSize = null;
			onFrame(frame);
		}
	});

	socket.on('error', (error) => onError?.(error));

	return socket;
}

function getSnapshot(printer, timeoutMs = 8000) {
	return new Promise((resolve, reject) => {
		let settled = false;
		const timeout = setTimeout(() => {
			if (settled) return;
			settled = true;
			socket.destroy();
			reject(new Error('Timed out waiting for a camera frame.'));
		}, timeoutMs);

		const socket = openCameraStream(printer, (frame) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			socket.destroy();
			resolve(frame);
		}, (error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			reject(error);
		});
	});
}

module.exports = { openCameraStream, getSnapshot };
