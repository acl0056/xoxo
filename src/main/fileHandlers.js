const { dialog } = require('electron');
const fs = require('fs');

/**
 * File dialog handlers for open, save, and import operations
 */
class FileHandlers {
	constructor(mainWindow) {
		this.mainWindow = mainWindow;
		this.currentFilePath = null;
	}

	/**
	 * Show open file dialog and return selected file path
	 * @returns {Promise<string|null>} Selected file path or null if cancelled
	 */
	async showOpenDialog() {
		const result = await dialog.showOpenDialog(this.mainWindow, {
			title: 'Open Circuit File',
			filters: [
				{ name: 'Circuit Files', extensions: ['json'] },
				{ name: 'All Files', extensions: ['*'] },
			],
			properties: ['openFile'],
		});

		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}

		return result.filePaths[0];
	}

	/**
	 * Show save file dialog and return selected file path
	 * @param {string} defaultPath - Default file path
	 * @returns {Promise<string|null>} Selected file path or null if cancelled
	 */
	async showSaveDialog(defaultPath = null) {
		const options = {
			title: 'Save Circuit File',
			filters: [
				{ name: 'Circuit Files', extensions: ['json'] },
				{ name: 'All Files', extensions: ['*'] },
			],
			properties: ['createDirectory', 'showOverwriteConfirmation'],
		};

		if (defaultPath) {
			options.defaultPath = defaultPath;
		}

		const result = await dialog.showSaveDialog(this.mainWindow, options);

		if (result.canceled || !result.filePath) {
			return null;
		}

		return result.filePath;
	}

	/**
	 * Show import DXO file dialog and return selected file path
	 * @returns {Promise<string|null>} Selected file path or null if cancelled
	 */
	async showImportDxoDialog() {
		const result = await dialog.showOpenDialog(this.mainWindow, {
			title: 'Import XSim .dxo File',
			filters: [
				{ name: 'XSim Files', extensions: ['dxo'] },
				{ name: 'All Files', extensions: ['*'] },
			],
			properties: ['openFile'],
		});

		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}

		return result.filePaths[0];
	}

	/**
	 * Show FRD file selection dialog
	 * @returns {Promise<string|null>} Selected file path or null if cancelled
	 */
	async showFrdFileDialog() {
		const result = await dialog.showOpenDialog(this.mainWindow, {
			title: 'Select FRD File',
			filters: [
				{ name: 'FRD Files', extensions: ['frd', 'txt'] },
				{ name: 'All Files', extensions: ['*'] },
			],
			properties: ['openFile'],
		});

		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}

		return result.filePaths[0];
	}

	/**
	 * Show ZMA file selection dialog
	 * @returns {Promise<string|null>} Selected file path or null if cancelled
	 */
	async showZmaFileDialog() {
		const result = await dialog.showOpenDialog(this.mainWindow, {
			title: 'Select ZMA File',
			filters: [
				{ name: 'ZMA Files', extensions: ['zma', 'txt'] },
				{ name: 'All Files', extensions: ['*'] },
			],
			properties: ['openFile'],
		});

		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}

		return result.filePaths[0];
	}

	/**
	 * Show unsaved changes confirmation dialog
	 * @returns {Promise<number>} Button index: 0=Save, 1=Don't Save, 2=Cancel
	 */
	async showUnsavedChangesDialog() {
		const result = await dialog.showMessageBox(this.mainWindow, {
			type: 'warning',
			title: 'Unsaved Changes',
			message: 'Do you want to save the changes you made?',
			detail: 'Your changes will be lost if you don\'t save them.',
			buttons: ['Save', 'Don\'t Save', 'Cancel'],
			defaultId: 0,
			cancelId: 2,
		});

		return result.response;
	}

	/**
	 * Show error message dialog
	 * @param {string} title - Dialog title
	 * @param {string} message - Error message
	 * @param {string} detail - Additional error details
	 */
	async showErrorDialog(title, message, detail = '') {
		await dialog.showMessageBox(this.mainWindow, {
			type: 'error',
			title,
			message,
			detail,
			buttons: ['OK'],
		});
	}

	/**
	 * Show info message dialog
	 * @param {string} title - Dialog title
	 * @param {string} message - Info message
	 * @param {string} detail - Additional details
	 */
	async showInfoDialog(title, message, detail = '') {
		await dialog.showMessageBox(this.mainWindow, {
			type: 'info',
			title,
			message,
			detail,
			buttons: ['OK'],
		});
	}

	/**
	 * Read file contents
	 * @param {string} filePath - Path to file
	 * @returns {Promise<string>} File contents
	 */
	async readFile(filePath) {
		return new Promise((resolve, reject) => {
			fs.readFile(filePath, 'utf8', (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * Write file contents
	 * @param {string} filePath - Path to file
	 * @param {string} data - Data to write
	 * @returns {Promise<void>}
	 */
	async writeFile(filePath, data) {
		return new Promise((resolve, reject) => {
			fs.writeFile(filePath, data, 'utf8', (error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Check if file exists
	 * @param {string} filePath - Path to file
	 * @returns {boolean} True if file exists
	 */
	fileExists(filePath) {
		try {
			return fs.existsSync(filePath);
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get current file path
	 * @returns {string|null} Current file path
	 */
	getCurrentFilePath() {
		return this.currentFilePath;
	}

	/**
	 * Set current file path
	 * @param {string} filePath - File path to set
	 */
	setCurrentFilePath(filePath) {
		this.currentFilePath = filePath;
	}

	/**
	 * Clear current file path
	 */
	clearCurrentFilePath() {
		this.currentFilePath = null;
	}
}

module.exports = FileHandlers;
