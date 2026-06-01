const config = require('../config');
const sessionStore = require('../session/store');
const sessionManager = require('../session/manager');
const { validateFrdData } = require('../validation/validator');
const { verifyAccessToken } = require('../auth/token');
const messages = require('./messages');

/**
 * Map of pending request callbacks keyed by requestId.
 * Each entry holds { resolve, reject, timer } for the pending promise.
 */
const pendingRequests = new Map();

/**
 * Verify a JWT token and return the decoded payload.
 * Uses HS256 self-issued token verification.
 *
 * @param {string} token - The JWT access token to verify
 * @returns {object} The decoded token payload
 * @throws {Error} If the token is invalid, expired, or uses wrong algorithm
 */
function verifyToken(token) {
	return verifyAccessToken(token);
}

/**
 * Handle an incoming state:circuit message from the Electron app.
 *
 * @param {object} socket - The socket.io socket instance
 * @param {string} userId - The authenticated user ID
 * @param {object} payload - The circuit layout data
 */
function handleStateCircuit(socket, userId, payload) {
	console.log('[WS] handleStateCircuit for userId:', userId, 'payload keys:', payload ? Object.keys(payload) : 'null');
	const result = sessionManager.updateCircuitLayout(userId, payload);
	if (!result.success) {
		console.log('[WS] handleStateCircuit validation failed:', result.errors);
		socket.emit(messages.ERROR_VALIDATION, messages.createMessage(
			messages.ERROR_VALIDATION,
			{ errors: result.errors, messageType: messages.STATE_CIRCUIT },
		));
	} else {
		console.log('[WS] handleStateCircuit stored successfully for userId:', userId);
	}
}

/**
 * Handle an incoming state:simulation message from the Electron app.
 *
 * @param {object} socket - The socket.io socket instance
 * @param {string} userId - The authenticated user ID
 * @param {object} payload - The simulation results data
 */
function handleStateSimulation(socket, userId, payload) {
	console.log('[WS] handleStateSimulation for userId:', userId, 'payload keys:', payload ? Object.keys(payload) : 'null');
	const result = sessionManager.updateSimulationResults(userId, payload);
	if (!result.success) {
		console.log('[WS] handleStateSimulation validation failed:', result.errors);
		socket.emit(messages.ERROR_VALIDATION, messages.createMessage(
			messages.ERROR_VALIDATION,
			{ errors: result.errors, messageType: messages.STATE_SIMULATION },
		));
	} else {
		console.log('[WS] handleStateSimulation stored successfully for userId:', userId);
	}
}

/**
 * Handle an incoming state:userFrds message from the Electron app.
 *
 * @param {object} socket - The socket.io socket instance
 * @param {string} userId - The authenticated user ID
 * @param {object} payload - The user-loaded FRD data (expected to be an array)
 */
function handleStateUserFrds(socket, userId, payload) {
	if (!Array.isArray(payload)) {
		socket.emit(messages.ERROR_VALIDATION, messages.createMessage(
			messages.ERROR_VALIDATION,
			{ errors: ['userFrds payload must be an array'], messageType: messages.STATE_USER_FRDS },
		));
		return;
	}

	const validationErrors = [];
	for (const frdEntry of payload) {
		const result = validateFrdData(frdEntry);
		if (!result.valid) {
			validationErrors.push(...result.errors);
		}
	}

	if (validationErrors.length > 0) {
		socket.emit(messages.ERROR_VALIDATION, messages.createMessage(
			messages.ERROR_VALIDATION,
			{ errors: validationErrors, messageType: messages.STATE_USER_FRDS },
		));
		return;
	}

	sessionStore.update(userId, { userLoadedFrds: payload });
}

/**
 * Handle a response message from the Electron app that correlates to a pending request.
 *
 * @param {string} requestId - The request correlation ID
 * @param {object} payload - The response payload
 */
function handleResponse(requestId, payload) {
	console.log('[WS] handleResponse received, requestId:', requestId);
	if (!requestId) {
		return;
	}

	const pending = pendingRequests.get(requestId);
	if (!pending) {
		console.log('[WS] handleResponse: no pending request for requestId:', requestId);
		return;
	}

	console.log('[WS] handleResponse: resolving pending request:', requestId);
	clearTimeout(pending.timer);
	pendingRequests.delete(requestId);
	pending.resolve(payload);
}

/**
 * Forward a request to the connected Electron app and wait for the corresponding response.
 *
 * @param {string} userId - The authenticated user ID
 * @param {string} messageType - The message type to send (e.g., 'request:optimize')
 * @param {object} payload - The request payload
 * @param {string} requestId - A unique identifier for request/response correlation
 * @returns {Promise<object>} The response payload from the Electron app
 */
function forwardRequest(userId, messageType, payload, requestId) {
	return new Promise((resolve, reject) => {
		const session = sessionStore.get(userId);
		if (!session || !session.wsConnection) {
			reject(new Error('No active Electron app connection for this user'));
			return;
		}

		const { wsConnection } = session;
		const timeoutMs = config.ws.requestTimeoutMs;

		console.log('[WS] forwardRequest:', messageType, 'requestId:', requestId, 'to userId:', userId);

		const timer = setTimeout(() => {
			console.log('[WS] forwardRequest TIMED OUT:', messageType, 'requestId:', requestId);
			pendingRequests.delete(requestId);
			reject(new Error(`Request timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		pendingRequests.set(requestId, { resolve, reject, timer });

		wsConnection.emit(messageType, messages.createMessage(messageType, payload, requestId));
	});
}

/**
 * Set up the WebSocket handler on a socket.io Server instance.
 *
 * @param {object} socketIoServer - The socket.io Server instance
 */
function setupWebSocketHandler(socketIoServer) {
	socketIoServer.use((socket, next) => {
		const token = socket.handshake.auth.token || socket.handshake.query.token;

		if (!token) {
			next(new Error('Authentication token is required'));
			return;
		}

		try {
			const decoded = verifyToken(token);
			socket.userId = decoded.sub;
			next();
		} catch (error) {
			next(new Error('Authentication failed: invalid or expired token'));
		}
	});

	socketIoServer.on('connection', (socket) => {
		const { userId } = socket;

		const existingSession = sessionStore.get(userId);
		if (existingSession) {
			sessionStore.update(userId, { wsConnection: socket });
		} else {
			sessionStore.create(userId, { wsConnection: socket });
		}

		socket.on(messages.STATE_CIRCUIT, (message) => {
			const payload = message && message.payload !== undefined ? message.payload : message;
			handleStateCircuit(socket, userId, payload);
		});

		socket.on(messages.STATE_SIMULATION, (message) => {
			const payload = message && message.payload !== undefined ? message.payload : message;
			handleStateSimulation(socket, userId, payload);
		});

		socket.on(messages.STATE_USER_FRDS, (message) => {
			const payload = message && message.payload !== undefined ? message.payload : message;
			handleStateUserFrds(socket, userId, payload);
		});

		const responseTypes = [
			messages.RESPONSE_OPTIMIZE,
			messages.RESPONSE_SET_CIRCUIT_LAYOUT,
			messages.RESPONSE_ADD_COMPONENT,
			messages.RESPONSE_REMOVE_COMPONENT,
			messages.RESPONSE_ADD_WIRE,
			messages.RESPONSE_REMOVE_WIRE,
			messages.RESPONSE_MOVE_COMPONENT,
			messages.RESPONSE_SELECT_GRAPH_ANGLE,
			messages.RESPONSE_BEGIN_EDIT_GROUP,
			messages.RESPONSE_END_EDIT_GROUP,
		];

		for (const responseType of responseTypes) {
			socket.on(responseType, (message) => {
				const requestId = message && message.requestId;
				const payload = message && message.payload !== undefined ? message.payload : message;
				handleResponse(requestId, payload);
			});
		}

		const heartbeatInterval = setInterval(() => {
			socket.emit('ping');
		}, config.ws.heartbeatIntervalMs);

		socket.on('pong', () => {
			// Heartbeat acknowledged — connection is healthy
		});

		socket.on('disconnect', () => {
			clearInterval(heartbeatInterval);

			const session = sessionStore.get(userId);
			if (session && session.wsConnection === socket) {
				sessionStore.update(userId, { wsConnection: null });
			}
		});
	});
}

module.exports = {
	setupWebSocketHandler,
	forwardRequest,
};
