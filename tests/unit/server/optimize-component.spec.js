const sessionStore = require('../../../server/session/store');
const { forwardRequest } = require('../../../server/ws/handler');
const handleOptimizeComponent = require('../../../server/mcp/tools/optimizeComponent');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

describe('server/mcp/tools/optimizeComponent', () => {
	const validLayout = {
		version: '1.0',
		metadata: {
			name: 'Test Circuit',
			created: '2025-01-15T10:00:00Z',
			modified: '2025-01-15T10:00:00Z',
		},
		components: [
			{
				id: 'resistor-1',
				type: 'resistor',
				label: 'R1',
				x: 100,
				y: 200,
				rotation: 0,
				parameters: {
					resistance: 8.2,
					tolerance: 5,
					state: 'normal',
				},
			},
			{
				id: 'capacitor-1',
				type: 'capacitor',
				label: 'C1',
				x: 200,
				y: 200,
				rotation: 90,
				parameters: {
					capacitance: 0.000022,
					tolerance: 10,
					esr: 0.01,
					state: 'normal',
				},
			},
		],
		wires: [],
	};

	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		jest.clearAllMocks();
	});

	it('should return an error when no session exists', async () => {
		const result = await handleOptimizeComponent(
			{ userId: 'auth0|nonexistent' },
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
		);

		expect(result.error).toBe('No active session found for this user');
	});

	it('should return an error when no circuit layout is loaded', async () => {
		sessionStore.create('auth0|user1');

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
		);

		expect(result.error).toBe('No circuit data is loaded for this session');
	});

	it('should return an error when the component ID does not exist', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'nonexistent-id', parameters: { resistance: 10 } },
		);

		expect(result.error).toContain('Invalid component ID');
		expect(result.error).toContain('nonexistent-id');
	});

	it('should return a validation error when parameters violate schema constraints', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: -5 } },
		);

		expect(result.error).toContain('Parameter validation failed');
		expect(result.error).toContain('resistor');
	});

	it('should forward valid requests to the Electron app and return the response', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		const updatedComponent = {
			id: 'resistor-1',
			type: 'resistor',
			label: 'R1',
			x: 100,
			y: 200,
			rotation: 0,
			parameters: {
				resistance: 10,
				tolerance: 5,
				state: 'normal',
			},
		};
		forwardRequest.mockResolvedValue(updatedComponent);

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
		);

		expect(result.result).toEqual(updatedComponent);
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:optimize',
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
			expect.any(String),
		);
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
		);

		expect(result.error).toContain('timed out');
	});

	it('should return an error when the WebSocket connection fails', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
		);

		expect(result.error).toBe('No active Electron app connection for this user');
	});

	it('should validate capacitor parameters correctly', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'capacitor-1', parameters: { capacitance: 0 } },
		);

		expect(result.error).toContain('Parameter validation failed');
		expect(result.error).toContain('capacitor');
	});

	it('should accept valid parameter updates for capacitors', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });

		const updatedComponent = {
			id: 'capacitor-1',
			type: 'capacitor',
			label: 'C1',
			x: 200,
			y: 200,
			rotation: 90,
			parameters: {
				capacitance: 0.000047,
				tolerance: 10,
				esr: 0.01,
				state: 'normal',
			},
		};
		forwardRequest.mockResolvedValue(updatedComponent);

		const result = await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'capacitor-1', parameters: { capacitance: 0.000047 } },
		);

		expect(result.result).toEqual(updatedComponent);
	});

	it('should generate a unique requestId for each call', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validLayout });
		forwardRequest.mockResolvedValue({});

		await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: 10 } },
		);
		await handleOptimizeComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'resistor-1', parameters: { resistance: 12 } },
		);

		const firstRequestId = forwardRequest.mock.calls[0][3];
		const secondRequestId = forwardRequest.mock.calls[1][3];
		expect(firstRequestId).not.toBe(secondRequestId);
	});
});
