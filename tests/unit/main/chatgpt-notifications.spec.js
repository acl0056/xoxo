const {
	IPC_CHANNEL,
	notifyConnectionLost,
	notifyAuthFailure,
	notifyValidationFailure,
} = require('../../../src/main/chatgpt-notifications');

function createMockWindow(destroyed = false) {
	return {
		isDestroyed: jest.fn(() => destroyed),
		webContents: {
			send: jest.fn(),
		},
	};
}

describe('chatgpt-notifications', () => {
	describe('notifyConnectionLost', () => {
		it('should send the connection lost message via IPC', () => {
			const mainWindow = createMockWindow();

			notifyConnectionLost(mainWindow);

			expect(mainWindow.webContents.send).toHaveBeenCalledWith(
				IPC_CHANNEL,
				'ChatGPT connection lost. Click Connect to reconnect.',
			);
		});

		it('should not throw when mainWindow is null', () => {
			expect(() => notifyConnectionLost(null)).not.toThrow();
		});

		it('should not send when mainWindow is destroyed', () => {
			const mainWindow = createMockWindow(true);

			notifyConnectionLost(mainWindow);

			expect(mainWindow.webContents.send).not.toHaveBeenCalled();
		});
	});

	describe('notifyAuthFailure', () => {
		it('should send the auth failure message with the reason via IPC', () => {
			const mainWindow = createMockWindow();

			notifyAuthFailure(mainWindow, 'token expired');

			expect(mainWindow.webContents.send).toHaveBeenCalledWith(
				IPC_CHANNEL,
				'Failed to connect to ChatGPT: token expired',
			);
		});

		it('should include the full reason string in the message', () => {
			const mainWindow = createMockWindow();

			notifyAuthFailure(mainWindow, 'network timeout after 30 seconds');

			expect(mainWindow.webContents.send).toHaveBeenCalledWith(
				IPC_CHANNEL,
				'Failed to connect to ChatGPT: network timeout after 30 seconds',
			);
		});

		it('should not throw when mainWindow is null', () => {
			expect(() => notifyAuthFailure(null, 'reason')).not.toThrow();
		});

		it('should not send when mainWindow is destroyed', () => {
			const mainWindow = createMockWindow(true);

			notifyAuthFailure(mainWindow, 'reason');

			expect(mainWindow.webContents.send).not.toHaveBeenCalled();
		});
	});

	describe('notifyValidationFailure', () => {
		it('should send the validation failure message with the reason via IPC', () => {
			const mainWindow = createMockWindow();

			notifyValidationFailure(mainWindow, 'invalid component schema');

			expect(mainWindow.webContents.send).toHaveBeenCalledWith(
				IPC_CHANNEL,
				'Synchronization failed: invalid component schema',
			);
		});

		it('should include the server-provided reason in the message', () => {
			const mainWindow = createMockWindow();

			notifyValidationFailure(mainWindow, 'components[2].parameters.resistance must be a number');

			expect(mainWindow.webContents.send).toHaveBeenCalledWith(
				IPC_CHANNEL,
				'Synchronization failed: components[2].parameters.resistance must be a number',
			);
		});

		it('should not throw when mainWindow is null', () => {
			expect(() => notifyValidationFailure(null, 'reason')).not.toThrow();
		});

		it('should not send when mainWindow is destroyed', () => {
			const mainWindow = createMockWindow(true);

			notifyValidationFailure(mainWindow, 'reason');

			expect(mainWindow.webContents.send).not.toHaveBeenCalled();
		});
	});

	describe('IPC_CHANNEL', () => {
		it('should be chatgpt:toast-error', () => {
			expect(IPC_CHANNEL).toBe('chatgpt:toast-error');
		});
	});
});
