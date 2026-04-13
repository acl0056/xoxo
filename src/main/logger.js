const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Logger class for writing errors and events to log file
 */
class Logger {
	constructor() {
		this.logFilePath = null;
		this.initialized = false;
	}

	/**
	 * Initialize the logger with log file path
	 */
	initialize() {
		if (this.initialized) {
			return;
		}

		try {
			const userDataPath = app.getPath('userData');
			const logsDirectory = path.join(userDataPath, 'logs');

			// Create logs directory if it doesn't exist
			if (!fs.existsSync(logsDirectory)) {
				fs.mkdirSync(logsDirectory, { recursive: true });
			}

			// Create log file with timestamp
			const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
			this.logFilePath = path.join(logsDirectory, `app-${timestamp}.log`);

			// Write initial log entry
			this.writeToFile('INFO', 'Logger initialized');
			this.initialized = true;

			// Clean up old log files (keep last 10)
			this.cleanupOldLogs(logsDirectory);
		} catch (error) {
			console.error('Failed to initialize logger:', error);
		}
	}

	/**
	 * Write a log entry to the file
	 * @param {string} level - Log level (INFO, WARN, ERROR)
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data to log
	 */
	writeToFile(level, message, data = null) {
		if (!this.initialized || !this.logFilePath) {
			return;
		}

		try {
			const timestamp = new Date().toISOString();
			let logEntry = `[${timestamp}] [${level}] ${message}`;

			if (data) {
				if (data instanceof Error) {
					logEntry += `\n  Error: ${data.message}`;
					if (data.stack) {
						logEntry += `\n  Stack: ${data.stack}`;
					}
				} else {
					logEntry += `\n  Data: ${JSON.stringify(data, null, 2)}`;
				}
			}

			logEntry += '\n';

			fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
		} catch (error) {
			console.error('Failed to write to log file:', error);
		}
	}

	/**
	 * Log an info message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	info(message, data = null) {
		console.log(`[INFO] ${message}`, data || '');
		this.writeToFile('INFO', message, data);
	}

	/**
	 * Log a warning message
	 * @param {string} message - Log message
	 * @param {Object} data - Additional data
	 */
	warn(message, data = null) {
		console.warn(`[WARN] ${message}`, data || '');
		this.writeToFile('WARN', message, data);
	}

	/**
	 * Log an error message
	 * @param {string} message - Log message
	 * @param {Error|Object} error - Error object or additional data
	 */
	error(message, error = null) {
		console.error(`[ERROR] ${message}`, error || '');
		this.writeToFile('ERROR', message, error);
	}

	/**
	 * Clean up old log files, keeping only the most recent ones
	 * @param {string} logsDirectory - Path to logs directory
	 * @param {number} keepCount - Number of log files to keep
	 */
	cleanupOldLogs(logsDirectory, keepCount = 10) {
		try {
			const files = fs.readdirSync(logsDirectory);
			const logFiles = files
				.filter((file) => file.startsWith('app-') && file.endsWith('.log'))
				.map((file) => ({
					name: file,
					path: path.join(logsDirectory, file),
					time: fs.statSync(path.join(logsDirectory, file)).mtime.getTime(),
				}))
				.sort((a, b) => b.time - a.time);

			// Delete old log files beyond keepCount
			if (logFiles.length > keepCount) {
				const filesToDelete = logFiles.slice(keepCount);
				filesToDelete.forEach((file) => {
					try {
						fs.unlinkSync(file.path);
						console.log(`Deleted old log file: ${file.name}`);
					} catch (deleteError) {
						console.error(`Failed to delete log file ${file.name}:`, deleteError);
					}
				});
			}
		} catch (error) {
			console.error('Failed to clean up old logs:', error);
		}
	}

	/**
	 * Get the current log file path
	 * @returns {string|null} Log file path
	 */
	getLogFilePath() {
		return this.logFilePath;
	}
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
