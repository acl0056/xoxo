const chatgptConfig = require('./chatgpt-config');

/**
 * Duration in milliseconds before a pairing code expires (5 minutes).
 */
const PAIRING_CODE_EXPIRY_MS = 300000;

/**
 * Interval in milliseconds for updating the countdown display.
 */
const COUNTDOWN_INTERVAL_MS = 1000;

/**
 * Manages the pairing code lifecycle for the ChatGPT integration.
 *
 * Responsibilities:
 * - Requests a pairing code from the server via POST /pairing/start
 * - Displays the code to the user via IPC to the renderer
 * - Manages a 5-minute countdown timer
 * - Handles code expiration with option to regenerate
 * - Listens for pairing:success WebSocket event
 */
class ChatgptPairing {
	constructor() {
		this.sessionId = null;
		this.pairingCode = null;
		this.countdownTimer = null;
		this.expiresAt = null;
		this.paired = false;
	}

	/**
	 * Request a new pairing code from the server.
	 *
	 * POSTs to /pairing/start and returns the code and sessionId.
	 *
	 * @returns {Promise<{code: string, sessionId: string}>} The pairing code and session ID
	 * @throws {Error} If the request fails
	 */
	async requestPairingCode() {
		const response = await fetch(`${chatgptConfig.serverUrl}/pairing/start`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			throw new Error(body.error || `Server returned ${response.status}`);
		}

		const { code, sessionId, token } = await response.json();
		this.pairingCode = code;
		this.sessionId = sessionId;
		this.token = token;
		this.expiresAt = Date.now() + PAIRING_CODE_EXPIRY_MS;
		this.paired = false;

		return { code, sessionId, token };
	}

	/**
	 * Start the countdown timer that notifies the renderer of remaining time.
	 * When the timer expires, sends an expiration notification.
	 *
	 * @param {Electron.BrowserWindow} mainWindow - The main application window
	 */
	startCountdown(mainWindow) {
		this.stopCountdown();

		this.countdownTimer = setInterval(() => {
			if (!mainWindow || mainWindow.isDestroyed()) {
				this.stopCountdown();
				return;
			}

			const remainingMs = this.expiresAt - Date.now();

			if (remainingMs <= 0) {
				this.stopCountdown();
				this.pairingCode = null;
				mainWindow.webContents.send('chatgpt:pairing-expired');
				return;
			}

			const remainingSeconds = Math.ceil(remainingMs / 1000);
			mainWindow.webContents.send('chatgpt:pairing-countdown', { remainingSeconds });
		}, COUNTDOWN_INTERVAL_MS);
	}

	/**
	 * Stop the countdown timer.
	 */
	stopCountdown() {
		if (this.countdownTimer) {
			clearInterval(this.countdownTimer);
			this.countdownTimer = null;
		}
	}

	/**
	 * Mark pairing as successful and clean up the countdown.
	 */
	markPaired() {
		this.paired = true;
		this.stopCountdown();
		this.pairingCode = null;
	}

	/**
	 * Reset pairing state (used on disconnect).
	 */
	reset() {
		this.stopCountdown();
		this.sessionId = null;
		this.pairingCode = null;
		this.expiresAt = null;
		this.paired = false;
	}

	/**
	 * Returns whether the pairing has been completed successfully.
	 *
	 * @returns {boolean} True if paired
	 */
	isPaired() {
		return this.paired;
	}

	/**
	 * Returns the current session ID (used for WebSocket connection).
	 *
	 * @returns {string|null} The session ID or null if not yet requested
	 */
	getSessionId() {
		return this.sessionId;
	}
}

module.exports = {
	ChatgptPairing,
	PAIRING_CODE_EXPIRY_MS,
	COUNTDOWN_INTERVAL_MS,
};
