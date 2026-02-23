import fs from 'fs';
import path from 'path';
import { JsonSerializer } from './JsonSerializer';

/**
 * FileOperations class handles file I/O operations for circuit files
 * Provides save, load, and recent files management
 */
export class FileOperations {
	/**
	 * Save a circuit to a file
	 * @param {Circuit} circuit - The circuit to save
	 * @param {string} filePath - The file path to save to
	 * @throws {Error} If save fails or validation fails
	 */
	static saveCircuit(circuit, filePath) {
		if (!circuit) {
			throw new Error('Circuit is required');
		}

		if (!filePath || typeof filePath !== 'string') {
			throw new Error('Valid file path is required');
		}

		try {
			// Serialize circuit with schema validation
			const jsonString = JsonSerializer.serialize(circuit);

			// Ensure directory exists
			const directory = path.dirname(filePath);
			if (!fs.existsSync(directory)) {
				fs.mkdirSync(directory, { recursive: true });
			}

			// Write to file
			fs.writeFileSync(filePath, jsonString, 'utf8');

			return {
				success: true,
				filePath,
			};
		} catch (error) {
			throw new Error(`Failed to save circuit: ${error.message}`);
		}
	}

	/**
	 * Load a circuit from a file
	 * @param {string} filePath - The file path to load from
	 * @returns {Circuit} The loaded circuit
	 * @throws {Error} If load fails, file doesn't exist, or validation fails
	 */
	static loadCircuit(filePath) {
		if (!filePath || typeof filePath !== 'string') {
			throw new Error('Valid file path is required');
		}

		// Check if file exists
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		try {
			// Read file content
			const jsonString = fs.readFileSync(filePath, 'utf8');

			// Deserialize with schema validation
			const circuit = JsonSerializer.deserialize(jsonString);

			return circuit;
		} catch (error) {
			// Provide more specific error messages
			if (error.message.includes('Invalid JSON')) {
				throw new Error(`Corrupted file: ${filePath} - ${error.message}`);
			}
			if (error.message.includes('validation failed')) {
				throw new Error(`Invalid file format: ${filePath} - ${error.message}`);
			}
			throw new Error(`Failed to load circuit: ${error.message}`);
		}
	}

	/**
	 * Check if a file exists and is readable
	 * @param {string} filePath - The file path to check
	 * @returns {boolean} True if file exists and is readable
	 */
	static fileExists(filePath) {
		if (!filePath || typeof filePath !== 'string') {
			return false;
		}

		try {
			return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get file information
	 * @param {string} filePath - The file path to get info for
	 * @returns {Object|null} File info with {size, modified, created} or null if file doesn't exist
	 */
	static getFileInfo(filePath) {
		if (!FileOperations.fileExists(filePath)) {
			return null;
		}

		try {
			const stats = fs.statSync(filePath);
			return {
				size: stats.size,
				modified: stats.mtime,
				created: stats.birthtime,
			};
		} catch (error) {
			return null;
		}
	}
}
