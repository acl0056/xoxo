const http = require('http');
const express = require('express');
const { Server: SocketIoServer } = require('socket.io');

// Load .env file if present (development only)
try {
	require('dotenv').config();
} catch (error) {
	// dotenv not installed — env vars must be set externally
}

const config = require('./config');
const tokenValidationMiddleware = require('./auth/middleware');
const { mcpMiddleware } = require('./mcp/server');
const { setupWebSocketHandler } = require('./ws/handler');
const oauthMetadataRouter = require('./oauth/metadata');
const pairingRouter = require('./pairing/routes');
const authorizeRouter = require('./oauth/authorize');
const tokenEndpointRouter = require('./oauth/token-endpoint');

const application = express();

application.use(express.json());
application.use(express.urlencoded({ extended: false }));

// Public routes (no authentication required)
application.use(oauthMetadataRouter);
application.use(pairingRouter);
application.use(authorizeRouter);
application.use(tokenEndpointRouter);

// Debug endpoint to inspect session data
const sessionStore = require('./session/store');
application.get('/debug/session/:userId', (req, res) => {
	const session = sessionStore.get(req.params.userId);
	if (!session) {
		return res.status(404).json({ error: 'Session not found' });
	}
	const { wsConnection, ...data } = session;
	return res.json({
		...data,
		wsConnected: !!wsConnection,
		simulationResultsKeys: data.simulationResults ? Object.keys(data.simulationResults) : null,
		circuitLayoutPresent: !!data.circuitLayout,
	});
});

// Request logging for debugging
application.use('/mcp', (req, res, next) => {
	const start = Date.now();

	res.on('finish', () => {
		// console.log('[MCP]', {
		// 	method: req.method,
		// 	path: req.path,
		// 	status: res.statusCode,
		// 	session: req.headers['mcp-session-id'] || 'none',
		// 	accept: req.headers.accept,
		// 	contentType: req.headers['content-type'],
		// 	rpcMethod: req.body?.method,
		// 	rpcId: req.body?.id,
		// 	ms: Date.now() - start,
		// });
	});

	next();
});

application.use('/mcp', tokenValidationMiddleware, mcpMiddleware);

const httpServer = http.createServer(application);

const socketIoServer = new SocketIoServer(httpServer, {
	path: '/ws',
});

setupWebSocketHandler(socketIoServer);

httpServer.listen(config.port, config.host, () => {
	console.log(`xoxo MCP server listening on http://${config.host}:${config.port}`);
});

module.exports = { application, httpServer, socketIoServer };
