const {
	app, BrowserWindow, ipcMain, Menu, shell,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { createApplicationMenu } = require('./menu');
const FileHandlers = require('./fileHandlers');
const logger = require('./logger');

let mainWindow;
let fileHandlers;
let recentFiles = [];
let lastOpenedFile = null;
const MAX_RECENT_FILES = 10;

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
	const menu = createApplicationMenu(mainWindow, {
		newFile: () => mainWindow.webContents.send('menu-new'),
		openFile: () => mainWindow.webContents.send('menu-open'),
		saveFile: () => mainWindow.webContents.send('menu-save'),
		saveFileAs: () => mainWindow.webContents.send('menu-save-as'),
		importDxo: () => mainWindow.webContents.send('menu-import-dxo'),
		exit: () => app.quit(),
		undo: () => mainWindow.webContents.send('menu-undo'),
		redo: () => mainWindow.webContents.send('menu-redo'),
		zoomIn: () => mainWindow.webContents.send('menu-zoom-in'),
		zoomOut: () => mainWindow.webContents.send('menu-zoom-out'),
		resetZoom: () => mainWindow.webContents.send('menu-reset-zoom'),
		showAbout: () => mainWindow.webContents.send('menu-show-about'),
		openDocumentation: () => {
			shell.openExternal('https://github.com/yourusername/xoxo/blob/main/README.md');
		},
		getRecentFilesMenu,
	});
	Menu.setApplicationMenu(menu);
}

/**
 * Create the main application window
 */
function createWindow() {
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
		// Ask renderer if there are unsaved changes
		event.preventDefault();
		mainWindow.webContents.send('window-closing');
	});

	mainWindow.on('closed', () => {
		mainWindow = null;
		fileHandlers = null;
	});

	// Set up crash recovery auto-save
	setupCrashRecovery();
}

// IPC Handlers

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
	mainWindow.destroy();
});

// Application lifecycle

app.whenReady().then(() => {
	// Initialize logger
	logger.initialize();
	logger.info('Application starting');

	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
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
