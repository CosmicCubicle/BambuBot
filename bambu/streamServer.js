const http = require('node:http');
const bambu = require('./manager');
const camera = require('./camera');

const BOUNDARY = 'bambuframe';
const activeStreams = new Map(); // printerName -> { socket, viewers: Set<ServerResponse> }

function closeStream(printerName) {
	const state = activeStreams.get(printerName);
	if (!state) return;
	for (const res of state.viewers) res.end();
	state.socket?.destroy();
	activeStreams.delete(printerName);
}

function ensureStream(printerName) {
	const existing = activeStreams.get(printerName);
	if (existing) return existing;

	const printer = bambu.getPrinterConfig(printerName);
	if (!printer) return null;

	const state = { viewers: new Set(), socket: null };
	state.socket = camera.openCameraStream(printer, (frame) => {
		for (const res of state.viewers) {
			res.write(`--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
			res.write(frame);
			res.write('\r\n');
		}
	}, (error) => {
		console.error(`Camera stream error for ${printerName}:`, error.message);
		closeStream(printerName);
	});
	state.socket.on('close', () => closeStream(printerName));

	activeStreams.set(printerName, state);
	return state;
}

function start(port) {
	const server = http.createServer((req, res) => {
		const match = req.url.match(/^\/stream\/([^/]+)\.mjpeg$/);
		if (!match) {
			res.writeHead(404).end('Not found');
			return;
		}

		const printerName = decodeURIComponent(match[1]);
		const state = ensureStream(printerName);
		if (!state) {
			res.writeHead(404).end(`Unknown printer: ${printerName}`);
			return;
		}

		res.writeHead(200, {
			'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
			'Cache-Control': 'no-cache',
			Connection: 'close',
		});
		state.viewers.add(res);

		req.on('close', () => {
			state.viewers.delete(res);
			if (state.viewers.size === 0) closeStream(printerName);
		});
	});

	server.listen(port, () => console.log(`Bambu Lab camera relay listening on port ${port}.`));
	return server;
}

module.exports = { start };
