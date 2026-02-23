import fs from 'fs';
import path from 'path';

/**
 * RecentFilesManager class manages the list of recently opened files
 * Persists the list to a JSON file for cross-session persistence
 */
export class RecentFilesManager {
	constructor(maxRecentFiles = 10, storageFilePath = null) {
		this.maxRecentFiles = Math.max(5, Math.min(maxRecentFiles, 20)); // Clamp between 5 and 20
		this.recentFiles = [];
		this.storageFilePath = storageFilePath;

		// Load recent files from storage if available
		if (this.storageFilePath) {
			this.loadFromStorage();
		}
	}

	/**
	 * Add a file to the recent files list
	 * If the file is already in the list, move it to the top
	 * @param {string} filePath - The file path to add
	 */
	addFile(filePath) {
		if (!filePath || typeof filePath !== 'string') {
			return;
		}

		// Normalize the file path
		const normalizedPath = path.resolve(filePath);

		// Remove the file if it already exists in the list
		this.recentFiles = this.recentFiles.filter((file) => file.path !== normalizedPath);

		// Add the file to the beginning of the list
		this.recentFiles.unshift({
			path: normalizedPath,
			timestamp: new Date().toISOString(),
		});

		// Trim the list to the maximum size
		if (this.recentFiles.length > this.maxRecentFiles) {
			this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
		}

		// Save to storage
		this.saveToStorage();
	}

	/**
	 * Remove a file from the recent files list
	 * @param {string} filePath - The file path to remove
	 */
	removeFile(filePath) {
		if (!filePath || typeof filePath !== 'string') {
			return;
		}

		const normalizedPath = path.resolve(filePath);
		this.recentFiles = this.recentFiles.filter((file) => file.path !== normalizedPath);

		// Save to storage
		this.saveToStorage();
	}

	/**
	 * Get the list of recent files
	 * Filters out files that no longer exist
	 * @param {boolean} filterNonExistent - Whether to filter out non-existent files
	 * @returns {Array} Array of recent file objects with {path, timestamp}
	 */
	getRecentFiles(filterNonExistent = true) {
		if (!filterNonExistent) {
			return [...this.recentFiles];
		}

		// Filter out files that no longer exist
		const existingFiles = this.recentFiles.filter((file) => {
			try {
				return fs.existsSync(file.path);
			} catch (error) {
				return false;
			}
		});

		// Update the list if any files were removed
		if (existingFiles.length !== this.recentFiles.length) {
			this.recentFiles = existingFiles;
			this.saveToStorage();
		}

		return [...this.recentFiles];
	}

	/**
	 * Clear all recent files
	 */
	clearAll() {
		this.recentFiles = [];
		this.saveToStorage();
	}

	/**
	 * Get the most recent file
	 * @param {boolean} filterNonExistent - Whether to filter out non-existent files
	 * @returns {Object|null} The most recent file object or null if list is empty
	 */
	getMostRecent(filterNonExistent = true) {
		const files = this.getRecentFiles(filterNonExistent);
		return files.length > 0 ? files[0] : null;
	}

	/**
	 * Check if a file is in the recent files list
	 * @param {string} filePath - The file path to check
	 * @returns {boolean} True if the file is in the list
	 */
	hasFile(filePath) {
		if (!filePath || typeof filePath !== 'string') {
			return false;
		}

		const normalizedPath = path.resolve(filePath);
		return this.recentFiles.some((file) => file.path === normalizedPath);
	}

	/**
	 * Save the recent files list to storage
	 * @private
	 */
	saveToStorage() {
		if (!this.storageFilePath) {
			return;
		}

		try {
			const directory = path.dirname(this.storageFilePath);
			if (!fs.existsSync(directory)) {
				fs.mkdirSync(directory, { recursive: true });
			}

			const data = {
				version: '1.0',
				maxRecentFiles: this.maxRecentFiles,
				recentFiles: this.recentFiles,
			};

			fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf8');
		} catch (error) {
			console.error('Failed to save recent files:', error);
		}
	}

	/**
	 * Load the recent files list from storage
	 * @private
	 */
	loadFromStorage() {
		if (!this.storageFilePath) {
			return;
		}

		try {
			if (!fs.existsSync(this.storageFilePath)) {
				return;
			}

			const jsonString = fs.readFileSync(this.storageFilePath, 'utf8');
			const data = JSON.parse(jsonString);

			if (data.recentFiles && Array.isArray(data.recentFiles)) {
				this.recentFiles = data.recentFiles;

				// Trim to current max size if needed
				if (this.recentFiles.length > this.maxRecentFiles) {
					this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
				}
			}
		} catch (error) {
			console.error('Failed to load recent files:', error);
			this.recentFiles = [];
		}
	}

	/**
	 * Set the maximum number of recent files to track
	 * @param {number} maxFiles - The maximum number of files (between 5 and 20)
	 */
	setMaxRecentFiles(maxFiles) {
		this.maxRecentFiles = Math.max(5, Math.min(maxFiles, 20));

		// Trim the list if needed
		if (this.recentFiles.length > this.maxRecentFiles) {
			this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
			this.saveToStorage();
		}
	}
}
