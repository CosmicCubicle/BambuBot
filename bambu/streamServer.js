const http = require('node:http');
const bambu = require('./manager');

// Cloud mode does not support local camera relay (no direct LAN access to printer camera ports).
// Use Bambu Studio web interface or cloud image URLs instead.

function start(port) {
	const server = http.createServer((req, res) => {
		res.writeHead(410, { 'Content-Type': 'text/plain' });
		res.end('Camera relay unavailable in cloud mode. Use Bambu Studio or cloud image URLs.');
	});

	server.listen(port, () => console.log(`Bambu Lab camera relay disabled in cloud mode (listening on port ${port} for compatibility).`));
	return server;
}

module.exports = { start };
