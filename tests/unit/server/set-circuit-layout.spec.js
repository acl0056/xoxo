const sessionStore = require('../../../server/session/store');
const { forwardRequest } = require('../../../server/ws/handler');
const handleSetCircuitLayout = require('../../../server/mcp/tools/setCircuitLayout');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

describe('server/mcp/tools/setCircuitLayout', () => {
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
		const result = await handleSetCircuitLayout(
			{ userId: 'auth0|nonexistent' },
			{ layout: validLayout },
		);

		expect(result.error).toBe('No active session found for this user');
	});

	it('should return a validation error when the layout does not conform to schema', async () => {
		sessionStore.create('auth0|user1');

		const invalidLayout = { components: 'not-an-array' };

		const result = await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: invalidLayout },
		);

		expect(result.error).toContain('Layout validation failed');
	});

	it('should forward valid layouts to the Electron app and return the response', async () => {
		sessionStore.create('auth0|user1');

		forwardRequest.mockResolvedValue(validLayout);

		const result = await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: validLayout },
		);

		expect(result.result).toEqual(validLayout);
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:setCircuitLayout',
			{ layout: validLayout },
			expect.any(String),
		);
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user1');

		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: validLayout },
		);

		expect(result.error).toContain('timed out');
	});

	it('should return an error when the WebSocket connection fails', async () => {
		sessionStore.create('auth0|user1');

		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: validLayout },
		);

		expect(result.error).toBe('No active Electron app connection for this user');
	});

	it('should generate a unique requestId for each call', async () => {
		sessionStore.create('auth0|user1');
		forwardRequest.mockResolvedValue(validLayout);

		await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: validLayout },
		);
		await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: validLayout },
		);

		const firstRequestId = forwardRequest.mock.calls[0][3];
		const secondRequestId = forwardRequest.mock.calls[1][3];
		expect(firstRequestId).not.toBe(secondRequestId);
	});

	it('should include specific schema violation details in validation errors', async () => {
		sessionStore.create('auth0|user1');

		const layoutMissingVersion = {
			metadata: {
				name: 'Test',
				created: '2025-01-15T10:00:00Z',
				modified: '2025-01-15T10:00:00Z',
			},
			components: [],
			wires: [],
		};

		const result = await handleSetCircuitLayout(
			{ userId: 'auth0|user1' },
			{ layout: layoutMissingVersion },
		);

		expect(result.error).toContain('Layout validation failed');
		expect(result.error).toContain('version');
	});
});
