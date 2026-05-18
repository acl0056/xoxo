/**
 * ChatGPT notification helpers for the main process.
 *
 * Each function sends an IPC message to the renderer process, which displays
 * a toast error notification via vue-toastification.
 */

const IPC_CHANNEL = 'chatgpt:toast-error';

/**
 * Notify the user that the ChatGPT WebSocket connection was lost.
 *
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 */
function notifyConnectionLost(mainWindow) {
	if (!mainWindow || mainWindow.isDestroyed()) {
		return;
	}
	mainWindow.webContents.send(
		IPC_CHANNEL,
		'ChatGPT connection lost. Click Connect to reconnect.',
	);
}

/**
 * Notify the user that authentication or connection to ChatGPT failed.
 *
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 * @param {string} reason - A human-readable description of the failure
 */
function notifyAuthFailure(mainWindow, reason) {
	if (!mainWindow || mainWindow.isDestroyed()) {
		return;
	}
	mainWindow.webContents.send(
		IPC_CHANNEL,
		`Failed to connect to ChatGPT: ${reason}`,
	);
}

/**
 * Notify the user that a synchronization validation error occurred.
 *
 * @param {Electron.BrowserWindow} mainWindow - The main application window
 * @param {string} reason - The server-provided reason for the validation failure
 */
function notifyValidationFailure(mainWindow, reason) {
	if (!mainWindow || mainWindow.isDestroyed()) {
		return;
	}
	mainWindow.webContents.send(
		IPC_CHANNEL,
		`Synchronization failed: ${reason}`,
	);
}

module.exports = {
	IPC_CHANNEL,
	notifyConnectionLost,
	notifyAuthFailure,
	notifyValidationFailure,
};
