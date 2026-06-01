const {
	app, BrowserWindow, ipcMain, Menu, shell, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { createApplicationMenu } = require('./menu');
const FileHandlers = require('./fileHandlers');
const logger = require('./logger');
const { setupChatgptIntegration } = require('./chatgpt-integration');

// Set app name for macOS menu bar (overrides "Electron" in dev mode)
app.name = 'xoxo';

let mainWindow;
let frequencyResponseWindow;
let impedanceWindow;
let fileHandlers;
let chatgptIntegration;
let recentFiles = [];
let lastOpenedFile = null;
const MAX_RECENT_FILES = 10;
let isMainWindowCloseAllowed = false;
let isClosePromptInProgress = false;
let isQuitPending = false;

/**
 * Get the path to the recent files storage
 * @returns {string} Path to recent files JSON
 */
function getRecentFilesPath() {
	const userDataPath = app.getPath('userData');
	return path.join(userDataPath, 'recent-files.json');
}

/**
 * Get the path to the last opened file storage
 * @returns {string} Path to last opened file JSON
 */
function getLastOpenedFilePath() {
	const userDataPath = app.getPath('userData');
	return path.join(userDataPath, 'last-opened-file.json');
}

/**
 * Get the path to the crash recovery file
 * @returns {string} Path to crash recovery JSON
 */
function getCrashRecoveryPath() {
	const userDataPath = app.getPath('userData');
	return path.join(userDataPath, 'crash-recovery.json');
}

/**
 * Load recent files from persistent storage
 */
function loadRecentFiles() {
	try {
		const recentFilesPath = getRecentFilesPath();
		if (fs.existsSync(recentFilesPath)) {
			const data = fs.readFileSync(recentFilesPath, 'utf8');
			recentFiles = JSON.parse(data);
			// Filter out files that no longer exist
			recentFiles = recentFiles.filter((filePath) => fs.existsSync(filePath));
		}
	} catch (error) {
		console.error('Error loading recent files:', error);
		recentFiles = [];
	}
}

/**
 * Load last opened file from persistent storage
 */
function loadLastOpenedFile() {
	try {
		const lastOpenedFilePath = getLastOpenedFilePath();
		if (fs.existsSync(lastOpenedFilePath)) {
			const data = fs.readFileSync(lastOpenedFilePath, 'utf8');
			const stored = JSON.parse(data);
			// Only restore if file still exists
			if (stored.filePath && fs.existsSync(stored.filePath)) {
				lastOpenedFile = stored.filePath;
			}
		}
	} catch (error) {
		console.error('Error loading last opened file:', error);
		lastOpenedFile = null;
	}
}

/**
 * Save recent files to persistent storage
 */
function saveRecentFiles() {
	try {
		const recentFilesPath = getRecentFilesPath();
		fs.writeFileSync(recentFilesPath, JSON.stringify(recentFiles, null, 2), 'utf8');
	} catch (error) {
		console.error('Error saving recent files:', error);
	}
}

/**
 * Save last opened file to persistent storage
 * @param {string} filePath - Path to save
 */
function saveLastOpenedFile(filePath) {
	try {
		const lastOpenedFilePath = getLastOpenedFilePath();
		fs.writeFileSync(lastOpenedFilePath, JSON.stringify({ filePath }, null, 2), 'utf8');
		lastOpenedFile = filePath;
	} catch (error) {
		console.error('Error saving last opened file:', error);
	}
}

/**
 * Add a file to the recent files list
 * @param {string} filePath - Path to add
 */
function addRecentFile(filePath) {
	// Remove if already in list
	recentFiles = recentFiles.filter((file) => file !== filePath);
	// Add to beginning
	recentFiles.unshift(filePath);
	// Limit to MAX_RECENT_FILES
	if (recentFiles.length > MAX_RECENT_FILES) {
		recentFiles = recentFiles.slice(0, MAX_RECENT_FILES);
	}
	saveRecentFiles();
	saveLastOpenedFile(filePath);
	updateApplicationMenu();
}

/**
 * Get recent files menu items
 * @returns {Array} Menu items for recent files
 */
function getRecentFilesMenu() {
	if (recentFiles.length === 0) {
		return [{ label: 'No Recent Files', enabled: false }];
	}

	return recentFiles.map((filePath) => ({
		label: path.basename(filePath),
		click: () => {
			mainWindow.webContents.send('open-recent-file', filePath);
		},
	}));
}

/**
 * Set up crash recovery auto-save
 * Periodically saves circuit state for crash recovery
 */
function setupCrashRecovery() {
	// Auto-save every 30 seconds
	setInterval(() => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('auto-save-for-crash-recovery');
		}
	}, 30000); // 30 seconds
}

/**
 * Update the application menu
 */
function updateApplicationMenu() {
	const chatgptConnected = chatgptIntegration ? chatgptIntegration.isConnected() : false;

	const handlers = {
		newFile: () => mainWindow.webContents.send('menu-new'),
		openFile: () => mainWindow.webContents.send('menu-open'),
		saveFile: () => mainWindow.webContents.send('menu-save'),
		saveFileAs: () => mainWindow.webContents.send('menu-save-as'),
		importDxo: () => mainWindow.webContents.send('menu-import-dxo'),
		insertCircuitBlock: (blockIdentifier) => mainWindow.webContents.send('menu-insert-circuit-block', blockIdentifier),
		exit: () => app.quit(),
		undo: () => mainWindow.webContents.send('menu-undo'),
		redo: () => mainWindow.webContents.send('menu-redo'),
		showAbout: () => mainWindow.webContents.send('menu-show-about'),
		openFrequencyResponseWindow: () => createFrequencyResponseWindow(),
		openImpedanceWindow: () => createImpedanceWindow(),
		openDocumentation: () => {
			shell.openExternal('https://github.com/acl0056/xoxo/blob/main/README.md');
		},
		getRecentFilesMenu,
		chatgptConnect: () => {
			if (chatgptIntegration) chatgptIntegration.chatgptConnect();
		},
		chatgptDisconnect: () => chatgptIntegration && chatgptIntegration.chatgptDisconnect(),
		chatgptOpenConversation: () => chatgptIntegration && chatgptIntegration.chatgptOpenConversation(),
	};

	const menu = createApplicationMenu(mainWindow, handlers, { chatgptConnected });
	Menu.setApplicationMenu(menu);
}

/**
 * Create the frequency response graph window
 */
function createFrequencyResponseWindow() {
	if (frequencyResponseWindow && !frequencyResponseWindow.isDestroyed()) {
		frequencyResponseWindow.focus();
		return;
	}

	frequencyResponseWindow = new BrowserWindow({
		width: 900,
		height: 600,
		title: 'Frequency Response',
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	if (process.env.NODE_ENV === 'development') {
		frequencyResponseWindow.loadURL('http://localhost:5173?window=frequency-response');
	} else {
		frequencyResponseWindow.loadFile(
			path.join(__dirname, '../renderer/index.html'),
			{ query: { window: 'frequency-response' } },
		);
	}

	frequencyResponseWindow.on('closed', () => {
		frequencyResponseWindow = null;
	});
}

/**
 * Create the impedance graph window
 */
function createImpedanceWindow() {
	if (impedanceWindow && !impedanceWindow.isDestroyed()) {
		impedanceWindow.focus();
		return;
	}

	impedanceWindow = new BrowserWindow({
		width: 900,
		height: 600,
		title: 'Impedance',
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	if (process.env.NODE_ENV === 'development') {
		impedanceWindow.loadURL('http://localhost:5173?window=impedance');
	} else {
		impedanceWindow.loadFile(
			path.join(__dirname, '../renderer/index.html'),
			{ query: { window: 'impedance' } },
		);
	}

	impedanceWindow.on('closed', () => {
		impedanceWindow = null;
	});
}

/**
 * Create the main application window
 */
function createWindow() {
	isMainWindowCloseAllowed = false;
	isClosePromptInProgress = false;
	isQuitPending = false;

	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	// Initialize file handlers
	fileHandlers = new FileHandlers(mainWindow);

	// Initialize ChatGPT integration
	chatgptIntegration = setupChatgptIntegration(mainWindow, updateApplicationMenu);

	// Load recent files and last opened file
	loadRecentFiles();
	loadLastOpenedFile();

	// Set up application menu
	updateApplicationMenu();

	// Load the renderer
	if (process.env.NODE_ENV === 'development') {
		// In development, load from Vite dev server
		mainWindow.loadURL('http://localhost:5173');
		mainWindow.webContents.openDevTools();
	} else {
		// In production, load from built files
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
	}
	// Handle window close event
	mainWindow.on('close', (event) => {
		if (isMainWindowCloseAllowed) {
			return;
		}

		if (isClosePromptInProgress) {
			event.preventDefault();
			return;
		}

		// Ask renderer if there are unsaved changes
		event.preventDefault();
		isClosePromptInProgress = true;
		mainWindow.webContents.send('window-closing');
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
		fileHandlers = null;
		if (isQuitPending) {
			app.quit();
		}
	});

	// Set up crash recovery auto-save
	setupCrashRecovery();
}

// IPC Handlers

/**
 * Forward simulation results from main window to graph windows
 */
ipcMain.on('simulation-results', (event, results) => {
	if (frequencyResponseWindow && !frequencyResponseWindow.isDestroyed()) {
		frequencyResponseWindow.webContents.send('simulation-results', results);
	}
	if (impedanceWindow && !impedanceWindow.isDestroyed()) {
		impedanceWindow.webContents.send('simulation-results', results);
	}
	if (chatgptIntegration && chatgptIntegration.isConnected()) {
		// Strip fields not in the simulation-results schema (additionalProperties: false)
		const {
			frequencyResponse, impedanceResponse, timestamp, currentAngle,
		} = results;
		chatgptIntegration.pushSimulationResults({
			frequencyResponse, impedanceResponse, timestamp, angle: currentAngle || 0,
		});
	}
});

/**
 * Forward circuit layout changes to the ChatGPT server
 */
ipcMain.on('chatgpt:circuit-layout-changed', (event, layout) => {
	if (chatgptIntegration && chatgptIntegration.isConnected()) {
		chatgptIntegration.pushCircuitLayout(layout);
	}
});

/**
 * Handle graph window requesting current simulation results on open
 */
ipcMain.on('request-simulation-results', () => {
	mainWindow.webContents.send('send-simulation-results');
});

/**
 * Forward curve color updates from graph windows to the main window
 */
ipcMain.on('update-curve-color', (event, data) => {
	mainWindow.webContents.send('update-curve-color', data);
});

/**
 * Forward angle changes from graph windows to the main window
 */
ipcMain.on('switch-angle', (event, angle) => {
	mainWindow.webContents.send('switch-angle', angle);
});

/**
 * Forward graph settings changes from graph windows to the main window
 */
ipcMain.on('update-graph-settings', (event, data) => {
	mainWindow.webContents.send('update-graph-settings', data);
});

/**
 * Get current window layout (bounds of all windows)
 */
ipcMain.handle('get-window-layout', () => {
	const layout = {};

	if (mainWindow && !mainWindow.isDestroyed()) {
		layout.main = mainWindow.getBounds();
	}
	if (frequencyResponseWindow && !frequencyResponseWindow.isDestroyed()) {
		layout.frequencyResponse = frequencyResponseWindow.getBounds();
	}
	if (impedanceWindow && !impedanceWindow.isDestroyed()) {
		layout.impedance = impedanceWindow.getBounds();
	}

	return layout;
});

/**
 * Restore window layout from saved bounds.
 * Validates that positions are visible on a connected display.
 */
ipcMain.on('restore-window-layout', (event, layout) => {
	const displays = screen.getAllDisplays();

	function isVisibleOnAnyDisplay(bounds) {
		return displays.some((display) => {
			const {
				x, y, width, height,
			} = display.workArea;
			// Check that at least part of the window is visible
			return bounds.x < x + width
				&& bounds.x + bounds.width > x
				&& bounds.y < y + height
				&& bounds.y + bounds.height > y;
		});
	}

	if (layout.main && mainWindow && !mainWindow.isDestroyed()) {
		if (isVisibleOnAnyDisplay(layout.main)) {
			mainWindow.setBounds(layout.main);
		}
	}
	if (layout.frequencyResponse && frequencyResponseWindow && !frequencyResponseWindow.isDestroyed()) {
		if (isVisibleOnAnyDisplay(layout.frequencyResponse)) {
			frequencyResponseWindow.setBounds(layout.frequencyResponse);
		}
	}
	if (layout.impedance && impedanceWindow && !impedanceWindow.isDestroyed()) {
		if (isVisibleOnAnyDisplay(layout.impedance)) {
			impedanceWindow.setBounds(layout.impedance);
		}
	}
});

/**
 * Handle show-open-dialog request from renderer
 */
ipcMain.handle('show-open-dialog', async () => {
	try {
		const filePath = await fileHandlers.showOpenDialog();
		if (filePath) {
			addRecentFile(filePath);
			logger.info('File opened', { filePath });
		}
		return filePath;
	} catch (error) {
		logger.error('Error showing open dialog', error);
		throw error;
	}
});

/**
 * Handle show-save-dialog request from renderer
 */
ipcMain.handle('show-save-dialog', async (event, defaultPath) => {
	try {
		const filePath = await fileHandlers.showSaveDialog(defaultPath);
		if (filePath) {
			addRecentFile(filePath);
			logger.info('File saved', { filePath });
		}
		return filePath;
	} catch (error) {
		logger.error('Error showing save dialog', error);
		throw error;
	}
});

/**
 * Handle show-import-dxo-dialog request from renderer
 */
ipcMain.handle('show-import-dxo-dialog', async () => {
	const filePath = await fileHandlers.showImportDxoDialog();
	return filePath;
});

/**
 * Handle show-frd-file-dialog request from renderer
 */
ipcMain.handle('show-frd-file-dialog', async () => {
	const filePath = await fileHandlers.showFrdFileDialog();
	return filePath;
});

/**
 * Handle show-zma-file-dialog request from renderer
 */
ipcMain.handle('show-zma-file-dialog', async () => {
	const filePath = await fileHandlers.showZmaFileDialog();
	return filePath;
});

/**
 * Handle show-unsaved-changes-dialog request from renderer
 */
ipcMain.handle('show-unsaved-changes-dialog', async () => {
	const response = await fileHandlers.showUnsavedChangesDialog();
	return response;
});

/**
 * Handle show-error-dialog request from renderer
 */
ipcMain.handle('show-error-dialog', async (event, title, message, detail) => {
	await fileHandlers.showErrorDialog(title, message, detail);
});

/**
 * Handle show-info-dialog request from renderer
 */
ipcMain.handle('show-info-dialog', async (event, title, message, detail) => {
	await fileHandlers.showInfoDialog(title, message, detail);
});

/**
 * Handle read-file request from renderer
 */
ipcMain.handle('read-file', async (event, filePath) => {
	try {
		const data = await fileHandlers.readFile(filePath);
		logger.info('File read successfully', { filePath });
		return { success: true, data };
	} catch (error) {
		logger.error('Error reading file', { filePath, error });
		return { success: false, error: error.message };
	}
});

/**
 * Handle write-file request from renderer
 */
ipcMain.handle('write-file', async (event, filePath, data) => {
	try {
		await fileHandlers.writeFile(filePath, data);
		logger.info('File written successfully', { filePath });
		return { success: true };
	} catch (error) {
		logger.error('Error writing file', { filePath, error });
		return { success: false, error: error.message };
	}
});

/**
 * Handle file-exists request from renderer
 */
ipcMain.handle('file-exists', async (event, filePath) => fileHandlers.fileExists(filePath));

/**
 * Handle get-recent-files request from renderer
 */
ipcMain.handle('get-recent-files', async () => recentFiles);

/**
 * Handle get-last-opened-file request from renderer
 */
ipcMain.handle('get-last-opened-file', async () => lastOpenedFile);

/**
 * Handle add-recent-file request from renderer
 */
ipcMain.handle('add-recent-file', async (event, filePath) => {
	addRecentFile(filePath);
});

/**
 * Handle save-crash-recovery request from renderer
 */
ipcMain.handle('save-crash-recovery', async (event, circuitData) => {
	try {
		const recoveryPath = getCrashRecoveryPath();
		const recoveryData = {
			timestamp: new Date().toISOString(),
			circuit: circuitData,
		};
		fs.writeFileSync(recoveryPath, JSON.stringify(recoveryData, null, 2), 'utf8');
		return { success: true };
	} catch (error) {
		logger.error('Error saving crash recovery data', error);
		return { success: false, error: error.message };
	}
});

/**
 * Handle get-crash-recovery request from renderer
 */
ipcMain.handle('get-crash-recovery', async () => {
	try {
		const recoveryPath = getCrashRecoveryPath();
		if (fs.existsSync(recoveryPath)) {
			const data = fs.readFileSync(recoveryPath, 'utf8');
			const recoveryData = JSON.parse(data);
			return { success: true, data: recoveryData };
		}
		return { success: false, error: 'No recovery data found' };
	} catch (error) {
		logger.error('Error loading crash recovery data', error);
		return { success: false, error: error.message };
	}
});

/**
 * Handle clear-crash-recovery request from renderer
 */
ipcMain.handle('clear-crash-recovery', async () => {
	try {
		const recoveryPath = getCrashRecoveryPath();
		if (fs.existsSync(recoveryPath)) {
			fs.unlinkSync(recoveryPath);
		}
		return { success: true };
	} catch (error) {
		logger.error('Error clearing crash recovery data', error);
		return { success: false, error: error.message };
	}
});

/**
 * Handle get-app-version request from renderer
 */
ipcMain.handle('get-app-version', async () => {
	try {
		const packageJsonPath = path.join(__dirname, '../../package.json');
		if (fs.existsSync(packageJsonPath)) {
			const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			return packageData.version;
		}
		return app.getVersion();
	} catch (error) {
		logger.error('Error getting app version', error);
		return app.getVersion();
	}
});

/**
 * Handle window-can-close request from renderer
 */
ipcMain.on('window-can-close', () => {
	isClosePromptInProgress = false;
	isMainWindowCloseAllowed = true;

	if (isQuitPending) {
		if (frequencyResponseWindow && !frequencyResponseWindow.isDestroyed()) {
			frequencyResponseWindow.close();
		}
		if (impedanceWindow && !impedanceWindow.isDestroyed()) {
			impedanceWindow.close();
		}
	}

	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.close();
	}
});

/**
 * Handle renderer cancellation of the close request.
 */
ipcMain.on('window-close-cancelled', () => {
	isClosePromptInProgress = false;
	isQuitPending = false;
});

/**
 * Handle undo/redo state updates from renderer to enable/disable menu items
 */
ipcMain.on('update-undo-state', (event, { canUndo, canRedo }) => {
	const menu = Menu.getApplicationMenu();
	if (menu) {
		const undoItem = menu.getMenuItemById('undo');
		const redoItem = menu.getMenuItemById('redo');
		if (undoItem) undoItem.enabled = canUndo;
		if (redoItem) redoItem.enabled = canRedo;
	}
});

// Application lifecycle

app.whenReady().then(() => {
	// Initialize logger
	logger.initialize();
	logger.info('Application starting');

	createWindow();

	// Open graph windows after the main window's content has loaded
	mainWindow.webContents.on('did-finish-load', () => {
		createFrequencyResponseWindow();
		createImpedanceWindow();
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('before-quit', (event) => {
	if (mainWindow && !mainWindow.isDestroyed() && !isMainWindowCloseAllowed) {
		event.preventDefault();
		isQuitPending = true;
		mainWindow.close();
	}
});

app.on('window-all-closed', () => {
	logger.info('All windows closed');
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception', error);
	console.error('Uncaught exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled promise rejection', { reason, promise: promise.toString() });
	console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
