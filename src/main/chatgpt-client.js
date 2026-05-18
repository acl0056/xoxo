const { io } = require('socket.io-client');

/**
 * Maximum number of reconnection attempts before giving up.
 */
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Maximum reconnection delay in milliseconds (30 seconds).
 */
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Calculate exponential backoff delay for a given attempt number.
 * delay = min(2^(attempt-1) * 1000, 30000) ms
 *
 * @param {number} attempt - The attempt number (1-based)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
	return Math.min(2 ** (attempt - 1) * 1000, MAX_RECONNECT_DELAY_MS);
}

/**
 * ChatGPT WebSocket client that manages the connection between the Electron app
 * and the MCP server using socket.io.
 */
class ChatgptClient {
	constructor() {
		this.socket = null;
		this.callbacks = null;
		this.serverUrl = null;
		this.accessToken = null;
		this.reconnectAttempt = 0;
		this.reconnectTimer = null;
		this.connected = false;
		this.intentionalDisconnect = false;
	}

	/**
	 * Establish a socket.io connection to the MCP server.
	 *
	 * @param {string} serverUrl - The WebSocket server URL (e.g., "https://example.com")
	 * @param {string} accessToken - The OAuth access token for authentication
	 * @param {object} callbacks - Callback functions for client events
	 * @param {function} callbacks.getCircuitLayout - Returns current circuit layout
	 * @param {function} callbacks.getSimulationResults - Returns current simulation results
	 * @param {function} callbacks.getUserLoadedFrds - Returns current user-loaded FRDs
	 * @param {function} callbacks.onEditRequest - Called with (type, payload, requestId) for incoming edit requests
	 * @param {function} callbacks.onDisconnect - Called on unexpected disconnect
	 * @param {function} callbacks.onValidationError - Called with (errors) when server rejects a state push
	 * @param {function} [callbacks.onPairingSuccess] - Called when pairing:success event is received
	 */
	connect(serverUrl, accessToken, callbacks) {
		this.serverUrl = serverUrl;
		this.accessToken = accessToken;
		this.callbacks = callbacks;
		this.intentionalDisconnect = false;
		this.reconnectAttempt = 0;

		this.establishConnection();
	}

	/**
	 * Close the connection and stop reconnection attempts.
	 */
	disconnect() {
		this.intentionalDisconnect = true;
		this.clearReconnectTimer();

		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.connected = false;
	}

	/**
	 * Send updated circuit layout to the server.
	 *
	 * @param {object} layout - The circuit layout conforming to circuit.schema.json
	 */
	pushCircuitLayout(layout) {
		if (!this.socket || !this.connected) {
			console.log('[ChatGPT-Client] pushCircuitLayout skipped: socket=', !!this.socket, 'connected=', this.connected);
			return;
		}
		console.log('[ChatGPT-Client] pushCircuitLayout: sending state:circuit');

		this.socket.emit('state:circuit', { payload: layout });
	}

	/**
	 * Send updated simulation results to the server.
	 *
	 * @param {object} results - The simulation results conforming to simulation-results.schema.json
	 */
	pushSimulationResults(results) {
		if (!this.socket || !this.connected) {
			console.log('[ChatGPT-Client] pushSimulationResults skipped: socket=', !!this.socket, 'connected=', this.connected);
			return;
		}
		console.log('[ChatGPT-Client] pushSimulationResults: sending state:simulation');

		this.socket.emit('state:simulation', { payload: results });
	}

	/**
	 * Send updated user-loaded FRD data to the server.
	 *
	 * @param {Array} frds - Array of FRD data objects conforming to frd-data.schema.json
	 */
	pushUserLoadedFrds(frds) {
		if (!this.socket || !this.connected) {
			return;
		}

		this.socket.emit('state:userFrds', { payload: frds });
	}

	/**
	 * Returns whether the client is currently connected to the server.
	 *
	 * @returns {boolean} True if connected
	 */
	isConnected() {
		return this.connected;
	}

	/**
	 * Create the socket.io connection and attach event handlers.
	 * @private
	 */
	establishConnection() {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}

		this.socket = io(this.serverUrl, {
			path: '/ws',
			auth: {
				token: this.accessToken,
			},
			reconnection: false,
			transports: ['websocket'],
		});

		this.socket.on('connect', () => {
			console.log('[ChatGPT-Client] WebSocket connected');
			this.connected = true;
			this.reconnectAttempt = 0;
			this.pushFullState();
		});

		this.socket.on('message', (message) => {
			this.handleServerMessage(message);
		});

		// Listen for edit request events from the server
		const requestTypes = [
			'request:optimize', 'request:setCircuitLayout', 'request:addComponent',
			'request:removeComponent', 'request:addWire', 'request:removeWire',
			'request:moveComponent', 'request:beginEditGroup', 'request:endEditGroup',
		];
		for (const requestType of requestTypes) {
			this.socket.on(requestType, (message) => {
				const payload = message && message.payload !== undefined ? message.payload : message;
				const requestId = message && message.requestId;
				this.handleServerMessage({ type: requestType, payload, requestId });
			});
		}

		this.socket.on('disconnect', () => {
			console.log('[ChatGPT-Client] WebSocket disconnected');
			this.connected = false;

			if (!this.intentionalDisconnect) {
				if (this.callbacks && this.callbacks.onDisconnect) {
					this.callbacks.onDisconnect();
				}
				this.scheduleReconnect();
			}
		});

		this.socket.on('connect_error', () => {
			this.connected = false;

			if (!this.intentionalDisconnect) {
				this.scheduleReconnect();
			}
		});
	}

	/**
	 * Push full state (circuit layout, simulation results, user-loaded FRDs) to the server.
	 * Called on initial connect and on reconnect.
	 * @private
	 */
	async pushFullState() {
		if (!this.callbacks) {
			console.log('[ChatGPT-Client] pushFullState: no callbacks');
			return;
		}
		console.log('[ChatGPT-Client] pushFullState: fetching state from renderer');

		const circuitLayout = await this.callbacks.getCircuitLayout();
		console.log('[ChatGPT-Client] pushFullState: circuitLayout=', circuitLayout ? `${Object.keys(circuitLayout).length} keys` : null);
		if (circuitLayout) {
			this.pushCircuitLayout(circuitLayout);
		}

		const simulationResults = await this.callbacks.getSimulationResults();
		console.log('[ChatGPT-Client] pushFullState: simulationResults=', !!simulationResults);
		if (simulationResults) {
			this.pushSimulationResults(simulationResults);
		}

		const userLoadedFrds = await this.callbacks.getUserLoadedFrds();
		console.log('[ChatGPT-Client] pushFullState: userLoadedFrds=', !!userLoadedFrds);
		if (userLoadedFrds) {
			this.pushUserLoadedFrds(userLoadedFrds);
		}
	}

	/**
	 * Handle an incoming message from the server.
	 * @param {object} message - The message envelope with type, payload, and optional requestId
	 * @private
	 */
	handleServerMessage(message) {
		if (!message || !message.type) {
			return;
		}

		const { type, payload, requestId } = message;

		if (type === 'pairing:success') {
			if (this.callbacks && this.callbacks.onPairingSuccess) {
				this.callbacks.onPairingSuccess(payload);
			}
			return;
		}

		if (type === 'error:validation') {
			if (this.callbacks && this.callbacks.onValidationError) {
				this.callbacks.onValidationError(payload);
			}
			return;
		}

		if (type.startsWith('request:')) {
			if (this.callbacks && this.callbacks.onEditRequest) {
				this.callbacks.onEditRequest(type, payload, requestId);
			}
		}
	}

	/**
	 * Schedule a reconnection attempt with exponential backoff.
	 * @private
	 */
	scheduleReconnect() {
		this.clearReconnectTimer();

		this.reconnectAttempt++;

		if (this.reconnectAttempt > MAX_RECONNECT_ATTEMPTS) {
			return;
		}

		const delay = calculateBackoffDelay(this.reconnectAttempt);

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.establishConnection();
		}, delay);
	}

	/**
	 * Clear any pending reconnection timer.
	 * @private
	 */
	clearReconnectTimer() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
	}
}

module.exports = {
	ChatgptClient,
	calculateBackoffDelay,
	MAX_RECONNECT_ATTEMPTS,
	MAX_RECONNECT_DELAY_MS,
};
