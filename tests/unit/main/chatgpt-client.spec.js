const { io, _mockSocket: mockSocket } = require('socket.io-client');
const {
	ChatgptClient, calculateBackoffDelay, MAX_RECONNECT_ATTEMPTS, MAX_RECONNECT_DELAY_MS,
} = require('../../../src/main/chatgpt-client');

jest.mock('socket.io-client', () => {
	const listeners = {};
	const socket = {
		on: jest.fn((event, handler) => {
			if (!listeners[event]) {
				listeners[event] = [];
			}
			listeners[event].push(handler);
		}),
		emit: jest.fn(),
		disconnect: jest.fn(),
		_listeners: listeners,
		_trigger: (event, ...args) => {
			if (listeners[event]) {
				listeners[event].forEach((handler) => handler(...args));
			}
		},
		_reset: () => {
			Object.keys(listeners).forEach((key) => delete listeners[key]);
			socket.on.mockClear();
			socket.emit.mockClear();
			socket.disconnect.mockClear();
		},
	};

	return {
		io: jest.fn(() => socket),
		_mockSocket: socket,
	};
});

describe('ChatgptClient', () => {
	let client;
	let callbacks;

	beforeEach(() => {
		jest.useFakeTimers();
		mockSocket._reset();
		io.mockClear();

		client = new ChatgptClient();
		callbacks = {
			getCircuitLayout: jest.fn(() => ({ version: '1.0', components: [] })),
			getSimulationResults: jest.fn(() => ({ frequencyResponse: {} })),
			getUserLoadedFrds: jest.fn(() => []),
			onEditRequest: jest.fn(),
			onDisconnect: jest.fn(),
			onValidationError: jest.fn(),
			onRemoteDisconnect: jest.fn(),
		};
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('connect', () => {
		it('should create a socket.io connection with the correct options', () => {
			client.connect('https://example.com', 'test-token', callbacks);

			expect(io).toHaveBeenCalledWith('https://example.com', {
				path: '/ws',
				auth: { token: 'test-token' },
				reconnection: false,
				transports: ['websocket'],
			});
		});

		it('should push full state on connect', async () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');
			await Promise.resolve();
			await Promise.resolve();

			expect(callbacks.getCircuitLayout).toHaveBeenCalled();
			expect(callbacks.getSimulationResults).toHaveBeenCalled();
			expect(callbacks.getUserLoadedFrds).toHaveBeenCalled();
			expect(mockSocket.emit).toHaveBeenCalledWith('state:circuit', {
				payload: { version: '1.0', components: [] },
			});
			expect(mockSocket.emit).toHaveBeenCalledWith('state:simulation', {
				payload: { frequencyResponse: {} },
			});
		});

		it('should set connected state to true on connect', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			expect(client.isConnected()).toBe(false);

			mockSocket._trigger('connect');
			expect(client.isConnected()).toBe(true);
		});

		it('should not push null circuit layout', () => {
			callbacks.getCircuitLayout.mockReturnValue(null);
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			const circuitEmits = mockSocket.emit.mock.calls.filter(
				(call) => call[0] === 'state:circuit',
			);
			expect(circuitEmits).toHaveLength(0);
		});
	});

	describe('disconnect', () => {
		it('should close the socket connection', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			client.disconnect();

			expect(mockSocket.disconnect).toHaveBeenCalled();
			expect(client.isConnected()).toBe(false);
		});

		it('should not trigger onDisconnect callback on intentional disconnect', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			client.disconnect();
			mockSocket._trigger('disconnect');

			expect(callbacks.onDisconnect).not.toHaveBeenCalled();
		});
	});

	describe('pushCircuitLayout', () => {
		it('should emit state:circuit message when connected', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');
			mockSocket.emit.mockClear();

			const layout = { version: '1.0', components: [{ id: 'r1' }] };
			client.pushCircuitLayout(layout);

			expect(mockSocket.emit).toHaveBeenCalledWith('state:circuit', {
				payload: layout,
			});
		});

		it('should not emit when not connected', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket.emit.mockClear();

			client.pushCircuitLayout({ version: '1.0' });

			expect(mockSocket.emit).not.toHaveBeenCalled();
		});
	});

	describe('pushSimulationResults', () => {
		it('should emit state:simulation message when connected', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');
			mockSocket.emit.mockClear();

			const results = { frequencyResponse: { frequencies: [100, 200] } };
			client.pushSimulationResults(results);

			expect(mockSocket.emit).toHaveBeenCalledWith('state:simulation', {
				payload: results,
			});
		});
	});

	describe('pushUserLoadedFrds', () => {
		it('should emit state:userFrds message when connected', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');
			mockSocket.emit.mockClear();

			const frds = [{ label: 'test.frd', frequencies: [100] }];
			client.pushUserLoadedFrds(frds);

			expect(mockSocket.emit).toHaveBeenCalledWith('state:userFrds', {
				payload: frds,
			});
		});
	});

	describe('incoming messages', () => {
		it('should call onEditRequest for request: messages', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			mockSocket._trigger('message', {
				type: 'request:optimize',
				payload: { componentId: 'r1', parameters: { resistance: 10 } },
				requestId: 'req-123',
			});

			expect(callbacks.onEditRequest).toHaveBeenCalledWith(
				'request:optimize',
				{ componentId: 'r1', parameters: { resistance: 10 } },
				'req-123',
			);
		});

		it('should call onEditRequest when selectGraphAngle is received as a socket event', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			mockSocket._trigger('request:selectGraphAngle', {
				payload: { angle: 30 },
				requestId: 'req-angle',
			});

			expect(callbacks.onEditRequest).toHaveBeenCalledWith(
				'request:selectGraphAngle',
				{ angle: 30 },
				'req-angle',
			);
		});

		it('should call onValidationError for error:validation messages', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			const errors = [{ field: 'components', message: 'invalid' }];
			mockSocket._trigger('message', {
				type: 'error:validation',
				payload: errors,
			});

			expect(callbacks.onValidationError).toHaveBeenCalledWith(errors);
		});

		it('should call onRemoteDisconnect for chatgpt:session-closed messages', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			const payload = { sessionId: 'mcp-session-1' };
			mockSocket._trigger('message', {
				type: 'chatgpt:session-closed',
				payload,
			});

			expect(callbacks.onRemoteDisconnect).toHaveBeenCalledWith(payload);
		});

		it('should ignore messages with no type', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			mockSocket._trigger('message', { payload: 'something' });
			mockSocket._trigger('message', null);

			expect(callbacks.onEditRequest).not.toHaveBeenCalled();
			expect(callbacks.onValidationError).not.toHaveBeenCalled();
		});
	});

	describe('unexpected disconnect and reconnection', () => {
		it('should call onDisconnect on unexpected disconnect', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			mockSocket._trigger('disconnect');

			expect(callbacks.onDisconnect).toHaveBeenCalled();
		});

		it('should attempt reconnection with exponential backoff', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');
			io.mockClear();

			mockSocket._trigger('disconnect');

			// First reconnect after 1s
			jest.advanceTimersByTime(1000);
			expect(io).toHaveBeenCalledTimes(1);
		});

		it('should stop reconnecting after max attempts', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			for (let attempt = 0; attempt < MAX_RECONNECT_ATTEMPTS; attempt++) {
				io.mockClear();
				mockSocket._trigger('disconnect');
				jest.advanceTimersByTime(MAX_RECONNECT_DELAY_MS + 1000);
			}

			// After max attempts, one more disconnect should not schedule reconnect
			io.mockClear();
			mockSocket._trigger('disconnect');
			jest.advanceTimersByTime(MAX_RECONNECT_DELAY_MS + 1000);
			expect(io).not.toHaveBeenCalled();
		});

		it('should reset reconnect attempts on successful connect', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');

			// Simulate disconnect and reconnect
			mockSocket._trigger('disconnect');
			jest.advanceTimersByTime(1000);

			// Simulate successful reconnect
			mockSocket._trigger('connect');
			expect(client.reconnectAttempt).toBe(0);
		});

		it('should push full state on reconnect', async () => {
			client.connect('https://example.com', 'test-token', callbacks);
			mockSocket._trigger('connect');
			await Promise.resolve();
			await Promise.resolve();
			callbacks.getCircuitLayout.mockClear();
			callbacks.getSimulationResults.mockClear();
			callbacks.getUserLoadedFrds.mockClear();

			// Simulate disconnect and reconnect
			mockSocket._trigger('disconnect');
			jest.advanceTimersByTime(1000);
			mockSocket._trigger('connect');
			await Promise.resolve();
			await Promise.resolve();

			expect(callbacks.getCircuitLayout).toHaveBeenCalled();
			expect(callbacks.getSimulationResults).toHaveBeenCalled();
			expect(callbacks.getUserLoadedFrds).toHaveBeenCalled();
		});
	});

	describe('connect_error handling', () => {
		it('should schedule reconnect on connect_error', () => {
			client.connect('https://example.com', 'test-token', callbacks);
			io.mockClear();

			mockSocket._trigger('connect_error');

			jest.advanceTimersByTime(1000);
			expect(io).toHaveBeenCalledTimes(1);
		});
	});
});

describe('calculateBackoffDelay', () => {
	it('should return 1000ms for attempt 1', () => {
		expect(calculateBackoffDelay(1)).toBe(1000);
	});

	it('should return 2000ms for attempt 2', () => {
		expect(calculateBackoffDelay(2)).toBe(2000);
	});

	it('should return 4000ms for attempt 3', () => {
		expect(calculateBackoffDelay(3)).toBe(4000);
	});

	it('should return 8000ms for attempt 4', () => {
		expect(calculateBackoffDelay(4)).toBe(8000);
	});

	it('should return 16000ms for attempt 5', () => {
		expect(calculateBackoffDelay(5)).toBe(16000);
	});

	it('should cap at 30000ms for attempt 6 and beyond', () => {
		expect(calculateBackoffDelay(6)).toBe(30000);
		expect(calculateBackoffDelay(7)).toBe(30000);
		expect(calculateBackoffDelay(8)).toBe(30000);
		expect(calculateBackoffDelay(9)).toBe(30000);
		expect(calculateBackoffDelay(10)).toBe(30000);
	});
});
