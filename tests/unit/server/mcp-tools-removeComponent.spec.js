const sessionStore = require('../../../server/session/store');
const handleRemoveComponent = require('../../../server/mcp/tools/removeComponent');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/removeComponent', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should forward the removal request and return the response', async () => {
		const layout = {
			version: '1.0',
			metadata: { name: 'Test', created: '2025-01-01T00:00:00Z', modified: '2025-01-01T00:00:00Z' },
			components: [
				{
					id: 'r1', type: 'resistor', label: 'R1', x: 0, y: 0, rotation: 0, parameters: { resistance: 8 },
				},
			],
			wires: [
				{ id: 'w1', startNode: { componentId: 'r1', terminal: 'out' }, endNode: { componentId: 's1', terminal: 'in' } },
			],
		};
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: layout });

		const electronResponse = { componentId: 'r1', affectedWireIds: ['w1'] };
		forwardRequest.mockResolvedValue(electronResponse);

		const result = await handleRemoveComponent(
			{ userId: 'auth0|user1' },
			{ componentId: 'r1' },
		);

		expect(result).toEqual({ result: electronResponse });
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:removeComponent',
			{ componentId: 'r1' },
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleRemoveComponent(
			{ userId: 'auth0|nonexistent' },
			{ componentId: 'r1' },
		);

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when no circuit layout is loaded', async () => {
		sessionStore.create('auth0|user2');

		const result = await handleRemoveComponent(
			{ userId: 'auth0|user2' },
			{ componentId: 'r1' },
		);

		expect(result).toEqual({ error: 'No circuit data is loaded for this session' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when the component ID does not exist', async () => {
		const layout = {
			version: '1.0',
			metadata: { name: 'Test', created: '2025-01-01T00:00:00Z', modified: '2025-01-01T00:00:00Z' },
			components: [
				{
					id: 'r1', type: 'resistor', label: 'R1', x: 0, y: 0, rotation: 0, parameters: { resistance: 8 },
				},
			],
			wires: [],
		};
		sessionStore.create('auth0|user3');
		sessionStore.update('auth0|user3', { circuitLayout: layout });

		const result = await handleRemoveComponent(
			{ userId: 'auth0|user3' },
			{ componentId: 'nonexistent-id' },
		);

		expect(result).toEqual({
			error: 'Invalid component ID: "nonexistent-id" does not exist in the current circuit layout',
		});
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		const layout = {
			version: '1.0',
			metadata: { name: 'Test', created: '2025-01-01T00:00:00Z', modified: '2025-01-01T00:00:00Z' },
			components: [
				{
					id: 'c1', type: 'capacitor', label: 'C1', x: 50, y: 50, rotation: 90, parameters: { capacitance: 0.001 },
				},
			],
			wires: [],
		};
		sessionStore.create('auth0|user4');
		sessionStore.update('auth0|user4', { circuitLayout: layout });

		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleRemoveComponent(
			{ userId: 'auth0|user4' },
			{ componentId: 'c1' },
		);

		expect(result).toEqual({ error: 'Request timed out: the Electron app did not respond within 30 seconds' });
	});

	it('should return an error when the Electron app connection fails', async () => {
		const layout = {
			version: '1.0',
			metadata: { name: 'Test', created: '2025-01-01T00:00:00Z', modified: '2025-01-01T00:00:00Z' },
			components: [
				{
					id: 'l1', type: 'inductor', label: 'L1', x: 10, y: 20, rotation: 0, parameters: { inductance: 0.5 },
				},
			],
			wires: [],
		};
		sessionStore.create('auth0|user5');
		sessionStore.update('auth0|user5', { circuitLayout: layout });

		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleRemoveComponent(
			{ userId: 'auth0|user5' },
			{ componentId: 'l1' },
		);

		expect(result).toEqual({ error: 'No active Electron app connection for this user' });
	});
});
