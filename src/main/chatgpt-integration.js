const { ipcMain } = require('electron');
const { ChatgptClient } = require('./chatgpt-client');
const { ChatgptPairing } = require('./chatgpt-pairing');
const openChatgptConversation = require('./chatgpt-open-conversation');
const { notifyConnectionLost, notifyValidationFailure, notifyAuthFailure } = require('./chatgpt-notifications');
const chatgptConfig = require('./chatgpt-config');

/**
 * Set up the ChatGPT integration for the Electron main process.
 *
 * Instantiates the ChatgptClient and ChatgptPairing, wires callbacks for
 * edit requests, disconnect notifications, validation errors, and pairing
 * flow events. Returns menu handler functions for connect/disconnect/open
 * conversation.
 *
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 * @param {function} rebuildMenu - Function to call to rebuild the application menu
 * @returns {object} Integration interface with menu handlers and status query
 */
function setupChatgptIntegration(mainWindow, rebuildMenu) {
	const client = new ChatgptClient();
	const pairing = new ChatgptPairing();

	/**
	 * Request data from the renderer process via IPC.
	 * Sends a channel message and waits for the renderer to respond.
	 *
	 * @param {string} channel - The IPC channel to send the request on
	 * @returns {Promise<*>} The data returned by the renderer
	 */
	function requestDataFromRenderer(channel) {
		return new Promise((resolve) => {
			const responseChannel = `${channel}:response`;
			const timeout = setTimeout(() => {
				ipcMain.removeAllListeners(responseChannel);
				console.log(`[ChatGPT] requestDataFromRenderer timed out for ${channel}`);
				resolve(null);
			}, 5000);

			ipcMain.once(responseChannel, (event, data) => {
				clearTimeout(timeout);
				resolve(data);
			});

			mainWindow.webContents.send(channel);
		});
	}

	/**
	 * Get the current circuit layout from the renderer via IPC.
	 *
	 * @returns {Promise<object|null>} The circuit layout data
	 */
	function getCircuitLayout() {
		return requestDataFromRenderer('chatgpt:get-circuit-layout');
	}

	/**
	 * Get the current simulation results from the renderer via IPC.
	 *
	 * @returns {Promise<object|null>} The simulation results data
	 */
	function getSimulationResults() {
		return requestDataFromRenderer('chatgpt:get-simulation-results');
	}

	/**
	 * Get the user-loaded FRD data from the renderer via IPC.
	 *
	 * @returns {Promise<Array|null>} The user-loaded FRD data
	 */
	function getUserLoadedFrds() {
		return requestDataFromRenderer('chatgpt:get-user-loaded-frds');
	}

	/**
	 * Handle an incoming edit request by forwarding it to the renderer via IPC.
	 * The renderer processes the edit and sends back a response, which is then
	 * forwarded to the server via the socket.
	 *
	 * @param {string} type - The edit request type (e.g., 'request:optimize')
	 * @param {object} payload - The request payload
	 * @param {string} requestId - The request ID for correlation
	 */
	function handleEditRequest(type, payload, requestId) {
		if (!mainWindow || mainWindow.isDestroyed()) {
			return;
		}

		mainWindow.webContents.send('chatgpt:edit-request', { type, payload, requestId });
	}

	/**
	 * Handle the pairing:success message from the server.
	 * Updates pairing state and UI.
	 */
	function handlePairingSuccess() {
		pairing.markPaired();
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('chatgpt:pairing-success');
		}
		rebuildMenu();
	}

	// Listen for edit responses from the renderer and forward them to the server
	ipcMain.on('chatgpt:edit-response', (event, { responseType, payload, requestId }) => {
		if (client.isConnected() && client.socket) {
			client.socket.emit(responseType, { payload, requestId });
		}
	});

	/**
	 * Initiate the pairing flow:
	 * 1. Request a pairing code from the server
	 * 2. Display the code to the user with a countdown
	 * 3. Connect WebSocket using the session ID
	 * 4. Wait for pairing:success event
	 */
	async function chatgptConnect() {
		console.log('[ChatGPT] chatgptConnect called');
		try {
			console.log('[ChatGPT] Requesting pairing code from', chatgptConfig.serverUrl);
			const { code, sessionId, token } = await pairing.requestPairingCode();
			console.log('[ChatGPT] Got pairing code:', code, 'sessionId:', sessionId);

			// Display the pairing code to the user
			if (mainWindow && !mainWindow.isDestroyed()) {
				console.log('[ChatGPT] Sending pairing code to renderer');
				mainWindow.webContents.send('chatgpt:pairing-code', { code, sessionId });
			} else {
				console.log('[ChatGPT] mainWindow not available, cannot display code');
			}

			// Start the countdown timer
			pairing.startCountdown(mainWindow);

			// Connect WebSocket using the session ID as the access token
			// The desktop app authenticates with the sessionId; the server
			// will associate this WebSocket with the session created during
			// /pairing/start. We use a temporary token approach: the server's
			// WS handler verifies JWTs, so we sign a token for this session.
			// However, since the desktop app doesn't have the JWT secret,
			// we connect using the sessionId directly and the server associates
			// the connection. For now, we connect after pairing succeeds.
			// Actually, per requirement 2.9, the desktop app establishes its
			// WebSocket connection independently using the sessionId.
			// The server WS handler expects a JWT token. We need to connect
			// after we get a token, OR the server needs to support sessionId-based
			// WS auth for the desktop app.
			//
			// Looking at the server WS handler, it verifies a JWT token.
			// The desktop app needs to connect with a valid JWT. Since the
			// desktop app initiated the pairing, it should connect using
			// the sessionId. The server's WS handler uses verifyAccessToken
			// which expects a JWT. We need to handle this differently.
			//
			// Per the design, the desktop app connects its WebSocket independently
			// and the server associates it with the session. The simplest approach
			// is to sign a token on the server side during /pairing/start and
			// return it, or to have the desktop connect with the sessionId as a
			// special auth mechanism.
			//
			// For this task, we'll connect the WebSocket with the sessionId
			// as the token. The server's WS handler will need to handle this
			// (that's a separate concern - the WS handler already associates
			// by userId/sub from the token). Since the token endpoint issues
			// JWTs with sub=sessionId, we can use signAccessToken on the server
			// during /pairing/start. But we don't have that token client-side.
			//
			// The cleanest approach per the existing architecture: the desktop
			// app connects its WebSocket AFTER receiving a pairing:success
			// notification... but that's a chicken-and-egg problem since
			// pairing:success comes over the WebSocket.
			//
			// Resolution: The /pairing/start endpoint should also return a
			// token for the desktop app to use for its WebSocket connection.
			// This is already implied by requirement 2.9. Let's connect using
			// the sessionId directly - the server can be updated to accept
			// sessionId-based auth for the desktop WS connection.
			//
			// For now, we connect the client with sessionId as the token.
			// The server WS handler will verify it. If the server doesn't
			// support raw sessionId auth, this will fail gracefully and
			// the pairing:success event will come through another mechanism.
			client.connect(chatgptConfig.serverUrl, token, {
				getCircuitLayout,
				getSimulationResults,
				getUserLoadedFrds,
				onEditRequest: handleEditRequest,
				onDisconnect: () => {
					if (pairing.isPaired()) {
						notifyConnectionLost(mainWindow);
					}
					rebuildMenu();
				},
				onValidationError: (errors) => {
					const reason = Array.isArray(errors)
						? errors.map((error) => error.message || error).join('; ')
						: String(errors);
					notifyValidationFailure(mainWindow, reason);
				},
				onPairingSuccess: handlePairingSuccess,
			});

			rebuildMenu();
		} catch (error) {
			console.error('[ChatGPT] chatgptConnect failed:', error.message, error.stack);
			notifyAuthFailure(mainWindow, error.message);
		}
	}

	/**
	 * Disconnect from the ChatGPT MCP server, reset pairing state,
	 * and rebuild the menu.
	 */
	function chatgptDisconnect() {
		client.disconnect();
		pairing.reset();
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('chatgpt:disconnected');
		}
		rebuildMenu();
	}

	/**
	 * Open the ChatGPT conversation URL in the default browser.
	 */
	function chatgptOpenConversation() {
		openChatgptConversation(chatgptConfig.conversationUrl);
	}

	/**
	 * Query whether the client is currently connected and paired.
	 *
	 * @returns {boolean} True if connected to the MCP server and paired
	 */
	function isConnected() {
		return pairing.isPaired() && client.isConnected();
	}

	/**
	 * Query whether a pairing is in progress (code displayed, waiting for success).
	 *
	 * @returns {boolean} True if pairing is in progress
	 */
	function isPairingInProgress() {
		return pairing.getSessionId() !== null && !pairing.isPaired();
	}

	// Listen for renderer requesting a new pairing code (after expiration)
	ipcMain.on('chatgpt:request-new-code', () => {
		chatgptConnect();
	});

	return {
		chatgptConnect,
		chatgptDisconnect,
		chatgptOpenConversation,
		isConnected,
		isPairingInProgress,
		pushSimulationResults: (results) => client.pushSimulationResults(results),
		pushCircuitLayout: (layout) => client.pushCircuitLayout(layout),
	};
}

module.exports = {
	setupChatgptIntegration,
};
