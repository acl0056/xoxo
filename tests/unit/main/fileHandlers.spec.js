const FileHandlers = require('../../../src/main/fileHandlers');
const { dialog } = require('electron');
const fs = require('fs');

// Mock electron dialog
jest.mock('electron', () => ({
	dialog: {
		showOpenDialog: jest.fn(),
		showSaveDialog: jest.fn(),
		showMessageBox: jest.fn(),
	},
}));

// Mock fs
jest.mock('fs');

describe('FileHandlers', () => {
	let fileHandlers;
	let mockWindow;

	beforeEach(() => {
		mockWindow = {
			webContents: {
				send: jest.fn(),
			},
		};
		fileHandlers = new FileHandlers(mockWindow);
		jest.clearAllMocks();
	});

	describe('showOpenDialog', () => {
		it('should return file path when user selects a file', async () => {
			const expectedPath = '/path/to/circuit.json';
			dialog.showOpenDialog.mockResolvedValue({
				canceled: false,
				filePaths: [expectedPath],
			});

			const result = await fileHandlers.showOpenDialog();

			expect(result).toBe(expectedPath);
			expect(dialog.showOpenDialog).toHaveBeenCalledWith(mockWindow, {
				title: 'Open Circuit File',
				filters: [
					{ name: 'Circuit Files', extensions: ['json'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['openFile'],
			});
		});

		it('should return null when user cancels', async () => {
			dialog.showOpenDialog.mockResolvedValue({
				canceled: true,
				filePaths: [],
			});

			const result = await fileHandlers.showOpenDialog();

			expect(result).toBeNull();
		});

		it('should return null when no files selected', async () => {
			dialog.showOpenDialog.mockResolvedValue({
				canceled: false,
				filePaths: [],
			});

			const result = await fileHandlers.showOpenDialog();

			expect(result).toBeNull();
		});
	});

	describe('showSaveDialog', () => {
		it('should return file path when user selects a location', async () => {
			const expectedPath = '/path/to/save/circuit.json';
			dialog.showSaveDialog.mockResolvedValue({
				canceled: false,
				filePath: expectedPath,
			});

			const result = await fileHandlers.showSaveDialog();

			expect(result).toBe(expectedPath);
			expect(dialog.showSaveDialog).toHaveBeenCalledWith(mockWindow, {
				title: 'Save Circuit File',
				filters: [
					{ name: 'Circuit Files', extensions: ['json'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['createDirectory', 'showOverwriteConfirmation'],
			});
		});

		it('should use default path when provided', async () => {
			const defaultPath = '/default/path/circuit.json';
			const expectedPath = '/path/to/save/circuit.json';
			dialog.showSaveDialog.mockResolvedValue({
				canceled: false,
				filePath: expectedPath,
			});

			const result = await fileHandlers.showSaveDialog(defaultPath);

			expect(result).toBe(expectedPath);
			expect(dialog.showSaveDialog).toHaveBeenCalledWith(mockWindow, expect.objectContaining({
				defaultPath,
			}));
		});

		it('should return null when user cancels', async () => {
			dialog.showSaveDialog.mockResolvedValue({
				canceled: true,
				filePath: null,
			});

			const result = await fileHandlers.showSaveDialog();

			expect(result).toBeNull();
		});
	});

	describe('showImportDxoDialog', () => {
		it('should return file path when user selects a DXO file', async () => {
			const expectedPath = '/path/to/circuit.dxo';
			dialog.showOpenDialog.mockResolvedValue({
				canceled: false,
				filePaths: [expectedPath],
			});

			const result = await fileHandlers.showImportDxoDialog();

			expect(result).toBe(expectedPath);
			expect(dialog.showOpenDialog).toHaveBeenCalledWith(mockWindow, {
				title: 'Import XSim .dxo File',
				filters: [
					{ name: 'XSim Files', extensions: ['dxo'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['openFile'],
			});
		});

		it('should return null when user cancels', async () => {
			dialog.showOpenDialog.mockResolvedValue({
				canceled: true,
				filePaths: [],
			});

			const result = await fileHandlers.showImportDxoDialog();

			expect(result).toBeNull();
		});
	});

	describe('showFrdFileDialog', () => {
		it('should return file path when user selects an FRD file', async () => {
			const expectedPath = '/path/to/speaker.frd';
			dialog.showOpenDialog.mockResolvedValue({
				canceled: false,
				filePaths: [expectedPath],
			});

			const result = await fileHandlers.showFrdFileDialog();

			expect(result).toBe(expectedPath);
			expect(dialog.showOpenDialog).toHaveBeenCalledWith(mockWindow, {
				title: 'Select FRD File',
				filters: [
					{ name: 'FRD Files', extensions: ['frd', 'txt'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['openFile'],
			});
		});
	});

	describe('showZmaFileDialog', () => {
		it('should return file path when user selects a ZMA file', async () => {
			const expectedPath = '/path/to/speaker.zma';
			dialog.showOpenDialog.mockResolvedValue({
				canceled: false,
				filePaths: [expectedPath],
			});

			const result = await fileHandlers.showZmaFileDialog();

			expect(result).toBe(expectedPath);
			expect(dialog.showOpenDialog).toHaveBeenCalledWith(mockWindow, {
				title: 'Select ZMA File',
				filters: [
					{ name: 'ZMA Files', extensions: ['zma', 'txt'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['openFile'],
			});
		});
	});

	describe('showUnsavedChangesDialog', () => {
		it('should return 0 when user clicks Save', async () => {
			dialog.showMessageBox.mockResolvedValue({ response: 0 });

			const result = await fileHandlers.showUnsavedChangesDialog();

			expect(result).toBe(0);
			expect(dialog.showMessageBox).toHaveBeenCalledWith(mockWindow, expect.objectContaining({
				type: 'warning',
				title: 'Unsaved Changes',
				buttons: ['Save', 'Don\'t Save', 'Cancel'],
			}));
		});

		it('should return 1 when user clicks Don\'t Save', async () => {
			dialog.showMessageBox.mockResolvedValue({ response: 1 });

			const result = await fileHandlers.showUnsavedChangesDialog();

			expect(result).toBe(1);
		});

		it('should return 2 when user clicks Cancel', async () => {
			dialog.showMessageBox.mockResolvedValue({ response: 2 });

			const result = await fileHandlers.showUnsavedChangesDialog();

			expect(result).toBe(2);
		});
	});

	describe('showErrorDialog', () => {
		it('should display error dialog with title and message', async () => {
			dialog.showMessageBox.mockResolvedValue({ response: 0 });

			await fileHandlers.showErrorDialog('Error Title', 'Error message', 'Error details');

			expect(dialog.showMessageBox).toHaveBeenCalledWith(mockWindow, {
				type: 'error',
				title: 'Error Title',
				message: 'Error message',
				detail: 'Error details',
				buttons: ['OK'],
			});
		});
	});

	describe('showInfoDialog', () => {
		it('should display info dialog with title and message', async () => {
			dialog.showMessageBox.mockResolvedValue({ response: 0 });

			await fileHandlers.showInfoDialog('Info Title', 'Info message', 'Info details');

			expect(dialog.showMessageBox).toHaveBeenCalledWith(mockWindow, {
				type: 'info',
				title: 'Info Title',
				message: 'Info message',
				detail: 'Info details',
				buttons: ['OK'],
			});
		});
	});

	describe('readFile', () => {
		it('should read file contents successfully', async () => {
			const fileContent = '{"test": "data"}';
			fs.readFile.mockImplementation((path, encoding, callback) => {
				callback(null, fileContent);
			});

			const result = await fileHandlers.readFile('/path/to/file.json');

			expect(result).toBe(fileContent);
			expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf8', expect.any(Function));
		});

		it('should reject on read error', async () => {
			const error = new Error('Read error');
			fs.readFile.mockImplementation((path, encoding, callback) => {
				callback(error, null);
			});

			await expect(fileHandlers.readFile('/path/to/file.json')).rejects.toThrow('Read error');
		});
	});

	describe('writeFile', () => {
		it('should write file contents successfully', async () => {
			fs.writeFile.mockImplementation((path, data, encoding, callback) => {
				callback(null);
			});

			await fileHandlers.writeFile('/path/to/file.json', '{"test": "data"}');

			expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.json', '{"test": "data"}', 'utf8', expect.any(Function));
		});

		it('should reject on write error', async () => {
			const error = new Error('Write error');
			fs.writeFile.mockImplementation((path, data, encoding, callback) => {
				callback(error);
			});

			await expect(fileHandlers.writeFile('/path/to/file.json', '{"test": "data"}')).rejects.toThrow('Write error');
		});
	});

	describe('fileExists', () => {
		it('should return true when file exists', () => {
			fs.existsSync.mockReturnValue(true);

			const result = fileHandlers.fileExists('/path/to/file.json');

			expect(result).toBe(true);
			expect(fs.existsSync).toHaveBeenCalledWith('/path/to/file.json');
		});

		it('should return false when file does not exist', () => {
			fs.existsSync.mockReturnValue(false);

			const result = fileHandlers.fileExists('/path/to/file.json');

			expect(result).toBe(false);
		});

		it('should return false on error', () => {
			fs.existsSync.mockImplementation(() => {
				throw new Error('Access denied');
			});

			const result = fileHandlers.fileExists('/path/to/file.json');

			expect(result).toBe(false);
		});
	});

	describe('getCurrentFilePath', () => {
		it('should return null initially', () => {
			expect(fileHandlers.getCurrentFilePath()).toBeNull();
		});

		it('should return current file path after setting', () => {
			const filePath = '/path/to/file.json';
			fileHandlers.setCurrentFilePath(filePath);

			expect(fileHandlers.getCurrentFilePath()).toBe(filePath);
		});
	});

	describe('setCurrentFilePath', () => {
		it('should set current file path', () => {
			const filePath = '/path/to/file.json';
			fileHandlers.setCurrentFilePath(filePath);

			expect(fileHandlers.getCurrentFilePath()).toBe(filePath);
		});
	});

	describe('clearCurrentFilePath', () => {
		it('should clear current file path', () => {
			fileHandlers.setCurrentFilePath('/path/to/file.json');
			fileHandlers.clearCurrentFilePath();

			expect(fileHandlers.getCurrentFilePath()).toBeNull();
		});
	});
});
