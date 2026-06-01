const { ChatgptPairing, PAIRING_CODE_EXPIRY_MS, COUNTDOWN_INTERVAL_MS } = require('../../../src/main/chatgpt-pairing');

// Mock fetch globally
global.fetch = jest.fn();

// Mock chatgpt-config
jest.mock('../../../src/main/chatgpt-config', () => ({
	serverUrl: 'https://xoxo.practicube.com',
}));

describe('ChatgptPairing', () => {
	let pairing;

	beforeEach(() => {
		jest.useFakeTimers();
		fetch.mockReset();
		pairing = new ChatgptPairing();
	});

	afterEach(() => {
		pairing.stopCountdown();
		jest.useRealTimers();
	});

	describe('requestPairingCode', () => {
		it('should POST to /pairing/start and return code and sessionId', async () => {
			fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ code: 'XOXO-A2B3', sessionId: 'session-123' }),
			});

			const result = await pairing.requestPairingCode();

			expect(fetch).toHaveBeenCalledWith('https://xoxo.practicube.com/pairing/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			expect(result).toEqual({ code: 'XOXO-A2B3', sessionId: 'session-123' });
			expect(pairing.getSessionId()).toBe('session-123');
		});

		it('should throw on server error', async () => {
			fetch.mockResolvedValue({
				ok: false,
				status: 503,
				json: () => Promise.resolve({ error: 'Unable to generate unique pairing code' }),
			});

			await expect(pairing.requestPairingCode()).rejects.toThrow(
				'Unable to generate unique pairing code',
			);
		});

		it('should throw with status code when no error body', async () => {
			fetch.mockResolvedValue({
				ok: false,
				status: 500,
				json: () => Promise.reject(new Error('parse error')),
			});

			await expect(pairing.requestPairingCode()).rejects.toThrow('Server returned 500');
		});

		it('should set expiresAt to 5 minutes from now', async () => {
			const now = Date.now();
			jest.setSystemTime(now);

			fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ code: 'XOXO-A2B3', sessionId: 'session-123' }),
			});

			await pairing.requestPairingCode();

			expect(pairing.expiresAt).toBe(now + PAIRING_CODE_EXPIRY_MS);
		});
	});

	describe('startCountdown', () => {
		let mainWindow;

		beforeEach(async () => {
			mainWindow = {
				isDestroyed: jest.fn(() => false),
				webContents: { send: jest.fn() },
			};

			fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ code: 'XOXO-A2B3', sessionId: 'session-123' }),
			});

			await pairing.requestPairingCode();
		});

		it('should send countdown updates every second', () => {
			pairing.startCountdown(mainWindow);

			jest.advanceTimersByTime(COUNTDOWN_INTERVAL_MS);

			expect(mainWindow.webContents.send).toHaveBeenCalledWith(
				'chatgpt:pairing-countdown',
				expect.objectContaining({ remainingSeconds: expect.any(Number) }),
			);
		});

		it('should send pairing-expired when time runs out', () => {
			pairing.startCountdown(mainWindow);

			jest.advanceTimersByTime(PAIRING_CODE_EXPIRY_MS + COUNTDOWN_INTERVAL_MS);

			expect(mainWindow.webContents.send).toHaveBeenCalledWith('chatgpt:pairing-expired');
		});

		it('should stop countdown when window is destroyed', () => {
			pairing.startCountdown(mainWindow);
			mainWindow.isDestroyed.mockReturnValue(true);

			jest.advanceTimersByTime(COUNTDOWN_INTERVAL_MS);

			// Should not throw and should stop the timer
			expect(pairing.countdownTimer).toBeNull();
		});
	});

	describe('markPaired', () => {
		it('should set paired to true and stop countdown', async () => {
			fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ code: 'XOXO-A2B3', sessionId: 'session-123' }),
			});
			await pairing.requestPairingCode();

			const mainWindow = {
				isDestroyed: jest.fn(() => false),
				webContents: { send: jest.fn() },
			};
			pairing.startCountdown(mainWindow);

			pairing.markPaired();

			expect(pairing.isPaired()).toBe(true);
			expect(pairing.countdownTimer).toBeNull();
		});
	});

	describe('reset', () => {
		it('should clear all state', async () => {
			fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ code: 'XOXO-A2B3', sessionId: 'session-123' }),
			});
			await pairing.requestPairingCode();
			pairing.markPaired();

			pairing.reset();

			expect(pairing.isPaired()).toBe(false);
			expect(pairing.getSessionId()).toBeNull();
			expect(pairing.pairingCode).toBeNull();
			expect(pairing.expiresAt).toBeNull();
		});
	});

	describe('constants', () => {
		it('should have 5 minute expiry', () => {
			expect(PAIRING_CODE_EXPIRY_MS).toBe(300000);
		});

		it('should have 1 second countdown interval', () => {
			expect(COUNTDOWN_INTERVAL_MS).toBe(1000);
		});
	});
});
