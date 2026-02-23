import fs from 'fs';
import path from 'path';
import { RecentFilesManager } from '../../../src/io/RecentFilesManager';

describe('RecentFilesManager', () => {
	const testDirectory = path.join(__dirname, 'test-recent-files');
	const storageFilePath = path.join(testDirectory, 'recent-files.json');

	beforeEach(() => {
		// Create test directory if it doesn't exist
		if (!fs.existsSync(testDirectory)) {
			fs.mkdirSync(testDirectory, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test files
		if (fs.existsSync(testDirectory)) {
			fs.rmSync(testDirectory, { recursive: true, force: true });
		}
	});

	describe('initialization', () => {
		test('should initialize with empty list', () => {
			const manager = new RecentFilesManager();

			expect(manager.getRecentFiles()).toHaveLength(0);
		});

		test('should initialize with default max of 10 files', () => {
			const manager = new RecentFilesManager();

			expect(manager.maxRecentFiles).toBe(10);
		});

		test('should initialize with custom max files', () => {
			const manager = new RecentFilesManager(15);

			expect(manager.maxRecentFiles).toBe(15);
		});

		test('should clamp max files between 5 and 20', () => {
			const managerTooLow = new RecentFilesManager(3);
			expect(managerTooLow.maxRecentFiles).toBe(5);

			const managerTooHigh = new RecentFilesManager(25);
			expect(managerTooHigh.maxRecentFiles).toBe(20);
		});

		test('should load from storage if path provided', () => {
			// Create a storage file with some data
			const initialData = {
				version: '1.0',
				maxRecentFiles: 10,
				recentFiles: [
					{ path: '/path/to/file1.json', timestamp: new Date().toISOString() },
					{ path: '/path/to/file2.json', timestamp: new Date().toISOString() },
				],
			};
			fs.writeFileSync(storageFilePath, JSON.stringify(initialData), 'utf8');

			const manager = new RecentFilesManager(10, storageFilePath);

			expect(manager.getRecentFiles(false)).toHaveLength(2);
		});
	});

	describe('addFile', () => {
		test('should add a file to the list', () => {
			const manager = new RecentFilesManager();
			const filePath = '/path/to/circuit.json';

			manager.addFile(filePath);

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles).toHaveLength(1);
			expect(recentFiles[0].path).toContain('circuit.json');
		});

		test('should add file to the beginning of the list', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.addFile('/path/to/file2.json');

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles[0].path).toContain('file2.json');
			expect(recentFiles[1].path).toContain('file1.json');
		});

		test('should move existing file to the top', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.addFile('/path/to/file2.json');
			manager.addFile('/path/to/file3.json');
			manager.addFile('/path/to/file1.json'); // Re-add file1

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles).toHaveLength(3);
			expect(recentFiles[0].path).toContain('file1.json');
		});

		test('should trim list to max size', () => {
			const manager = new RecentFilesManager(5);

			for (let i = 1; i <= 10; i++) {
				manager.addFile(`/path/to/file${i}.json`);
			}

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles).toHaveLength(5);
			expect(recentFiles[0].path).toContain('file10.json');
		});

		test('should normalize file paths', () => {
			const manager = new RecentFilesManager();

			manager.addFile('./relative/path/circuit.json');
			manager.addFile('./relative/path/circuit.json'); // Same file, different format

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles).toHaveLength(1);
		});

		test('should add timestamp to file entry', () => {
			const manager = new RecentFilesManager();
			const beforeAdd = new Date();

			manager.addFile('/path/to/circuit.json');

			const recentFiles = manager.getRecentFiles(false);
			const timestamp = new Date(recentFiles[0].timestamp);
			expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
		});

		test('should ignore invalid file paths', () => {
			const manager = new RecentFilesManager();

			manager.addFile('');
			manager.addFile(null);
			manager.addFile(undefined);

			expect(manager.getRecentFiles(false)).toHaveLength(0);
		});
	});

	describe('removeFile', () => {
		test('should remove a file from the list', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.addFile('/path/to/file2.json');

			manager.removeFile('/path/to/file1.json');

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles).toHaveLength(1);
			expect(recentFiles[0].path).toContain('file2.json');
		});

		test('should handle removing non-existent file', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.removeFile('/path/to/nonexistent.json');

			expect(manager.getRecentFiles(false)).toHaveLength(1);
		});

		test('should ignore invalid file paths', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.removeFile('');
			manager.removeFile(null);

			expect(manager.getRecentFiles(false)).toHaveLength(1);
		});
	});

	describe('getRecentFiles', () => {
		test('should return copy of recent files list', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');

			const recentFiles = manager.getRecentFiles(false);
			recentFiles.push({ path: '/fake/path.json', timestamp: new Date().toISOString() });

			expect(manager.getRecentFiles(false)).toHaveLength(1);
		});

		test('should filter out non-existent files by default', () => {
			const manager = new RecentFilesManager();

			// Add a file that exists
			const existingFile = path.join(testDirectory, 'existing.json');
			fs.writeFileSync(existingFile, '{}', 'utf8');
			manager.addFile(existingFile);

			// Add a file that doesn't exist
			manager.addFile('/path/to/nonexistent.json');

			const recentFiles = manager.getRecentFiles(true);
			expect(recentFiles).toHaveLength(1);
			expect(recentFiles[0].path).toBe(existingFile);
		});

		test('should not filter when filterNonExistent is false', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/nonexistent.json');

			const recentFiles = manager.getRecentFiles(false);
			expect(recentFiles).toHaveLength(1);
		});
	});

	describe('clearAll', () => {
		test('should clear all recent files', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.addFile('/path/to/file2.json');

			manager.clearAll();

			expect(manager.getRecentFiles(false)).toHaveLength(0);
		});
	});

	describe('getMostRecent', () => {
		test('should return the most recent file', () => {
			const manager = new RecentFilesManager();

			manager.addFile('/path/to/file1.json');
			manager.addFile('/path/to/file2.json');

			const mostRecent = manager.getMostRecent(false);
			expect(mostRecent.path).toContain('file2.json');
		});

		test('should return null if list is empty', () => {
			const manager = new RecentFilesManager();

			expect(manager.getMostRecent(false)).toBeNull();
		});

		test('should filter non-existent files', () => {
			const manager = new RecentFilesManager();

			// Add a non-existent file
			manager.addFile('/path/to/nonexistent.json');

			// Add an existing file
			const existingFile = path.join(testDirectory, 'existing.json');
			fs.writeFileSync(existingFile, '{}', 'utf8');
			manager.addFile(existingFile);

			// Remove the existing file
			fs.unlinkSync(existingFile);

			expect(manager.getMostRecent(true)).toBeNull();
		});
	});

	describe('hasFile', () => {
		test('should return true if file is in the list', () => {
			const manager = new RecentFilesManager();
			const filePath = '/path/to/circuit.json';

			manager.addFile(filePath);

			expect(manager.hasFile(filePath)).toBe(true);
		});

		test('should return false if file is not in the list', () => {
			const manager = new RecentFilesManager();

			expect(manager.hasFile('/path/to/nonexistent.json')).toBe(false);
		});

		test('should handle normalized paths', () => {
			const manager = new RecentFilesManager();

			manager.addFile('./relative/path/circuit.json');

			const absolutePath = path.resolve('./relative/path/circuit.json');
			expect(manager.hasFile(absolutePath)).toBe(true);
		});

		test('should return false for invalid paths', () => {
			const manager = new RecentFilesManager();

			expect(manager.hasFile('')).toBe(false);
			expect(manager.hasFile(null)).toBe(false);
		});
	});

	describe('setMaxRecentFiles', () => {
		test('should update max recent files', () => {
			const manager = new RecentFilesManager(10);

			manager.setMaxRecentFiles(15);

			expect(manager.maxRecentFiles).toBe(15);
		});

		test('should clamp value between 5 and 20', () => {
			const manager = new RecentFilesManager(10);

			manager.setMaxRecentFiles(3);
			expect(manager.maxRecentFiles).toBe(5);

			manager.setMaxRecentFiles(25);
			expect(manager.maxRecentFiles).toBe(20);
		});

		test('should trim list if new max is smaller', () => {
			const manager = new RecentFilesManager(10);

			for (let i = 1; i <= 10; i++) {
				manager.addFile(`/path/to/file${i}.json`);
			}

			manager.setMaxRecentFiles(5);

			expect(manager.getRecentFiles(false)).toHaveLength(5);
		});
	});

	describe('persistence', () => {
		test('should save to storage when file is added', () => {
			const manager = new RecentFilesManager(10, storageFilePath);

			manager.addFile('/path/to/circuit.json');

			expect(fs.existsSync(storageFilePath)).toBe(true);

			const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf8'));
			expect(data.recentFiles).toHaveLength(1);
		});

		test('should save to storage when file is removed', () => {
			const manager = new RecentFilesManager(10, storageFilePath);

			manager.addFile('/path/to/file1.json');
			manager.addFile('/path/to/file2.json');
			manager.removeFile('/path/to/file1.json');

			const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf8'));
			expect(data.recentFiles).toHaveLength(1);
		});

		test('should save to storage when list is cleared', () => {
			const manager = new RecentFilesManager(10, storageFilePath);

			manager.addFile('/path/to/circuit.json');
			manager.clearAll();

			const data = JSON.parse(fs.readFileSync(storageFilePath, 'utf8'));
			expect(data.recentFiles).toHaveLength(0);
		});

		test('should load from storage on initialization', () => {
			const manager1 = new RecentFilesManager(10, storageFilePath);
			manager1.addFile('/path/to/file1.json');
			manager1.addFile('/path/to/file2.json');

			// Create a new manager with the same storage path
			const manager2 = new RecentFilesManager(10, storageFilePath);

			expect(manager2.getRecentFiles(false)).toHaveLength(2);
		});

		test('should handle missing storage file gracefully', () => {
			const nonExistentPath = path.join(testDirectory, 'nonexistent.json');

			expect(() => {
				const manager = new RecentFilesManager(10, nonExistentPath);
				expect(manager.getRecentFiles(false)).toHaveLength(0);
			}).not.toThrow();
		});

		test('should handle corrupted storage file gracefully', () => {
			fs.writeFileSync(storageFilePath, '{ invalid json }', 'utf8');

			expect(() => {
				const manager = new RecentFilesManager(10, storageFilePath);
				expect(manager.getRecentFiles(false)).toHaveLength(0);
			}).not.toThrow();
		});
	});
});

