const fs = require('fs');
const path = require('path');
const logger = require('../../../src/main/logger');

// Mock electron app
jest.mock('electron', () => ({
	app: {
		getPath: jest.fn(() => '/mock/user/data'),
	},
}));

describe('Logger', () => {
	let mockLogFilePath;

	beforeEach(() => {
		// Reset logger state
		logger.initialized = false;
		logger.logFilePath = null;

		// Mock fs methods
		jest.spyOn(fs, 'existsSync').mockReturnValue(false);
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
		jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {});
		jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
		jest.spyOn(fs, 'statSync').mockReturnValue({ mtime: new Date() });
		jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

		// Suppress console output during tests
		jest.spyOn(console, 'log').mockImplementation(() => {});
		jest.spyOn(console, 'warn').mockImplementation(() => {});
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('initialize', () => {
		it('should create logs directory if it does not exist', () => {
			logger.initialize();

			expect(fs.mkdirSync).toHaveBeenCalledWith(
				expect.stringContaining('logs'),
				{ recursive: true },
			);
		});

		it('should create log file with timestamp', () => {
			logger.initialize();

			expect(logger.logFilePath).toMatch(/app-.*\.log$/);
		});

		it('should set initialized flag', () => {
			logger.initialize();

			expect(logger.initialized).toBe(true);
		});

		it('should only initialize once', () => {
			logger.initialize();
			const firstPath = logger.logFilePath;

			logger.initialize();
			const secondPath = logger.logFilePath;

			expect(firstPath).toBe(secondPath);
		});

		it('should handle initialization errors gracefully', () => {
			fs.mkdirSync.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			expect(() => logger.initialize()).not.toThrow();
			expect(console.error).toHaveBeenCalledWith(
				'Failed to initialize logger:',
				expect.any(Error),
			);
		});
	});

	describe('info', () => {
		beforeEach(() => {
			logger.initialize();
			jest.clearAllMocks();
		});

		it('should write info message to log file', () => {
			logger.info('Test info message');

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('[INFO] Test info message'),
				'utf8',
			);
		});

		it('should include additional data in log entry', () => {
			const data = { key: 'value' };
			logger.info('Test message', data);

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining(JSON.stringify(data, null, 2)),
				'utf8',
			);
		});

		it('should log to console', () => {
			logger.info('Test message');

			expect(console.log).toHaveBeenCalledWith(
				'[INFO] Test message',
				'',
			);
		});
	});

	describe('warn', () => {
		beforeEach(() => {
			logger.initialize();
			jest.clearAllMocks();
		});

		it('should write warning message to log file', () => {
			logger.warn('Test warning');

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('[WARN] Test warning'),
				'utf8',
			);
		});

		it('should log to console', () => {
			logger.warn('Test warning');

			expect(console.warn).toHaveBeenCalledWith(
				'[WARN] Test warning',
				'',
			);
		});
	});

	describe('error', () => {
		beforeEach(() => {
			logger.initialize();
			jest.clearAllMocks();
		});

		it('should write error message to log file', () => {
			logger.error('Test error');

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('[ERROR] Test error'),
				'utf8',
			);
		});

		it('should include error stack trace', () => {
			const error = new Error('Test error');
			logger.error('Error occurred', error);

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('Stack:'),
				'utf8',
			);
		});

		it('should log to console', () => {
			logger.error('Test error');

			expect(console.error).toHaveBeenCalledWith(
				'[ERROR] Test error',
				'',
			);
		});
	});

	describe('cleanupOldLogs', () => {
		beforeEach(() => {
			logger.initialize();
		});

		it('should delete old log files beyond keep count', () => {
			const mockFiles = Array.from({ length: 15 }, (_, i) => `app-2024-01-${String(i + 1).padStart(2, '0')}.log`);
			fs.readdirSync.mockReturnValue(mockFiles);

			logger.cleanupOldLogs('/mock/logs', 10);

			expect(fs.unlinkSync).toHaveBeenCalledTimes(5);
		});

		it('should not delete files if count is below limit', () => {
			const mockFiles = ['app-2024-01-01.log', 'app-2024-01-02.log'];
			fs.readdirSync.mockReturnValue(mockFiles);

			logger.cleanupOldLogs('/mock/logs', 10);

			expect(fs.unlinkSync).not.toHaveBeenCalled();
		});

		it('should handle cleanup errors gracefully', () => {
			fs.readdirSync.mockImplementation(() => {
				throw new Error('Read error');
			});

			expect(() => logger.cleanupOldLogs('/mock/logs', 10)).not.toThrow();
		});
	});

	describe('getLogFilePath', () => {
		it('should return null before initialization', () => {
			expect(logger.getLogFilePath()).toBeNull();
		});

		it('should return log file path after initialization', () => {
			logger.initialize();

			const logPath = logger.getLogFilePath();
			expect(logPath).toMatch(/app-.*\.log$/);
		});
	});
});
