const sessionStore = require('../../../server/session/store');
const handleRemoveWire = require('../../../server/mcp/tools/removeWire');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/removeWire', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should forward the remove wire request and return the result on success', async () => {
		const layout = {
			version: '1.0',
			components: [
				{ id: 'r1', type: 'resistor' },
				{ id: 's1', type: 'speaker' },
			],
			wires: [
				{ id: 'w1', startNode: { componentId: 'r1', terminal: 'out' }, endNode: { componentId: 's1', terminal: 'in' } },
			],
		};
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: layout });
		forwardRequest.mockResolvedValue({ wireId: 'w1' });

		const result = await handleRemoveWire(
			{ userId: 'auth0|user1' },
			{ wireId: 'w1' },
		);

		expect(result).toEqual({ result: { wireId: 'w1' } });
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:removeWire',
			{ wireId: 'w1' },
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleRemoveWire(
			{ userId: 'auth0|nonexistent' },
			{ wireId: 'w1' },
		);

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when no circuit layout is loaded', async () => {
		sessionStore.create('auth0|user2');

		const result = await handleRemoveWire(
			{ userId: 'auth0|user2' },
			{ wireId: 'w1' },
		);

		expect(result).toEqual({ error: 'No circuit data is loaded for this session' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when the wire ID does not exist in the layout', async () => {
		const layout = {
			version: '1.0',
			components: [{ id: 'r1', type: 'resistor' }],
			wires: [
				{ id: 'w1', startNode: { componentId: 'r1', terminal: 'out' }, endNode: { componentId: 'r1', terminal: 'in' } },
			],
		};
		sessionStore.create('auth0|user3');
		sessionStore.update('auth0|user3', { circuitLayout: layout });

		const result = await handleRemoveWire(
			{ userId: 'auth0|user3' },
			{ wireId: 'w-nonexistent' },
		);

		expect(result).toEqual({
			error: 'Invalid wire ID: "w-nonexistent" does not exist in the current circuit layout',
		});
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		const layout = {
			version: '1.0',
			components: [{ id: 'r1', type: 'resistor' }],
			wires: [{ id: 'w1', startNode: { componentId: 'r1', terminal: 'out' }, endNode: { componentId: 'r1', terminal: 'in' } }],
		};
		sessionStore.create('auth0|user4');
		sessionStore.update('auth0|user4', { circuitLayout: layout });
		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleRemoveWire(
			{ userId: 'auth0|user4' },
			{ wireId: 'w1' },
		);

		expect(result).toEqual({
			error: 'Request timed out: the Electron app did not respond within 30 seconds',
		});
	});

	it('should return a generic error when the forward request fails', async () => {
		const layout = {
			version: '1.0',
			components: [{ id: 'r1', type: 'resistor' }],
			wires: [{ id: 'w1', startNode: { componentId: 'r1', terminal: 'out' }, endNode: { componentId: 'r1', terminal: 'in' } }],
		};
		sessionStore.create('auth0|user5');
		sessionStore.update('auth0|user5', { circuitLayout: layout });
		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleRemoveWire(
			{ userId: 'auth0|user5' },
			{ wireId: 'w1' },
		);

		expect(result).toEqual({
			error: 'No active Electron app connection for this user',
		});
	});
});
