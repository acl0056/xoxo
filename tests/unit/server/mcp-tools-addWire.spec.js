const sessionStore = require('../../../server/session/store');
const handleAddWire = require('../../../server/mcp/tools/addWire');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/addWire', () => {
	const validCircuitLayout = {
		version: '1.0',
		components: [],
		wires: [],
	};

	const validWire = {
		id: 'wire-1',
		startNode: { componentId: 'comp-1', terminal: 0 },
		endNode: { componentId: 'comp-2', terminal: 1 },
		segments: [],
	};

	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should validate wire and forward to Electron app on success', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: validCircuitLayout });
		forwardRequest.mockResolvedValue(validWire);

		const result = await handleAddWire(
			{ userId: 'auth0|user1' },
			{ wire: validWire },
		);

		expect(result).toEqual({ result: validWire });
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:addWire',
			{ wire: validWire },
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleAddWire(
			{ userId: 'auth0|nonexistent' },
			{ wire: validWire },
		);

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when no circuit data is loaded', async () => {
		sessionStore.create('auth0|user2');

		const result = await handleAddWire(
			{ userId: 'auth0|user2' },
			{ wire: validWire },
		);

		expect(result).toEqual({ error: 'No circuit data is loaded for this session' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return a validation error for an invalid wire object', async () => {
		sessionStore.create('auth0|user3');
		sessionStore.update('auth0|user3', { circuitLayout: validCircuitLayout });

		const invalidWire = { id: 'wire-bad' };

		const result = await handleAddWire(
			{ userId: 'auth0|user3' },
			{ wire: invalidWire },
		);

		expect(result.error).toMatch(/Wire validation failed/);
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user4');
		sessionStore.update('auth0|user4', { circuitLayout: validCircuitLayout });
		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleAddWire(
			{ userId: 'auth0|user4' },
			{ wire: validWire },
		);

		expect(result).toEqual({ error: 'Request timed out: the Electron app did not respond within 30 seconds' });
	});

	it('should return an error when the Electron app connection fails', async () => {
		sessionStore.create('auth0|user5');
		sessionStore.update('auth0|user5', { circuitLayout: validCircuitLayout });
		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleAddWire(
			{ userId: 'auth0|user5' },
			{ wire: validWire },
		);

		expect(result).toEqual({ error: 'No active Electron app connection for this user' });
	});
});
