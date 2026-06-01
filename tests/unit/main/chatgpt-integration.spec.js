let mockLastClient;
let mockIpcHandlers;

jest.mock('electron', () => ({
	ipcMain: {
		on: jest.fn((channel, handler) => {
			mockIpcHandlers[channel] = handler;
		}),
		once: jest.fn(),
		removeAllListeners: jest.fn(),
	},
}));

jest.mock('../../../src/main/chatgpt-client', () => ({
	ChatgptClient: jest.fn().mockImplementation(() => {
		mockLastClient = {
			connect: jest.fn((serverUrl, accessToken, callbacks) => {
				mockLastClient.callbacks = callbacks;
				mockLastClient.connected = true;
			}),
			disconnect: jest.fn(() => {
				mockLastClient.connected = false;
			}),
			isConnected: jest.fn(() => mockLastClient.connected),
			pushSimulationResults: jest.fn(),
			pushCircuitLayout: jest.fn(),
			socket: { emit: jest.fn() },
		};
		return mockLastClient;
	}),
}));

jest.mock('../../../src/main/chatgpt-pairing', () => ({
	ChatgptPairing: jest.fn().mockImplementation(() => ({
		requestPairingCode: jest.fn(async () => ({
			code: 'XOXO-1234',
			sessionId: 'session-1',
			token: 'token-1',
		})),
		startCountdown: jest.fn(),
		stopCountdown: jest.fn(),
		markPaired: jest.fn(function markPaired() {
			this.paired = true;
		}),
		reset: jest.fn(function reset() {
			this.paired = false;
		}),
		isPaired: jest.fn(function isPaired() {
			return !!this.paired;
		}),
		getSessionId: jest.fn(() => 'session-1'),
		paired: false,
	})),
}));

jest.mock('../../../src/main/chatgpt-open-conversation', () => jest.fn());
jest.mock('../../../src/main/chatgpt-notifications', () => ({
	notifyConnectionLost: jest.fn(),
	notifyValidationFailure: jest.fn(),
	notifyAuthFailure: jest.fn(),
}));
jest.mock('../../../src/main/chatgpt-config', () => ({
	serverUrl: 'https://example.com',
	conversationUrl: 'https://chatgpt.com',
}));

const { setupChatgptIntegration } = require('../../../src/main/chatgpt-integration');
const { notifyConnectionLost } = require('../../../src/main/chatgpt-notifications');

describe('chatgpt integration', () => {
	let mainWindow;
	let rebuildMenu;

	beforeEach(() => {
		jest.clearAllMocks();
		mockIpcHandlers = {};
		mockLastClient = null;
		mainWindow = {
			isDestroyed: jest.fn(() => false),
			webContents: {
				send: jest.fn(),
			},
		};
		rebuildMenu = jest.fn();
	});

	it('does not disconnect the desktop websocket when an MCP session closes', async () => {
		const integration = setupChatgptIntegration(mainWindow, rebuildMenu);

		await integration.chatgptConnect();
		mockLastClient.callbacks.onPairingSuccess({ expiresIn: 3600 });

		expect(integration.isConnected()).toBe(true);

		mockLastClient.callbacks.onRemoteDisconnect({ sessionId: 'mcp-session-1' });

		expect(mockLastClient.disconnect).not.toHaveBeenCalled();
		expect(mainWindow.webContents.send).not.toHaveBeenCalledWith('chatgpt:disconnected');
		expect(notifyConnectionLost).not.toHaveBeenCalled();
		expect(integration.isConnected()).toBe(true);
	});
});
