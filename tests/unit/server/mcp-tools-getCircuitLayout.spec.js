const sessionStore = require('../../../server/session/store');
const handleGetCircuitLayout = require('../../../server/mcp/tools/getCircuitLayout');

describe('server/mcp/tools/getCircuitLayout', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
	});

	it('should return the circuit layout when session exists and has data', async () => {
		const layout = {
			version: '1.0',
			metadata: {
				name: 'Test Circuit',
				created: '2025-01-15T10:00:00Z',
				modified: '2025-01-15T10:00:00Z',
			},
			components: [{ id: 'comp-1', type: 'resistor' }],
			wires: [],
		};
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', { circuitLayout: layout });

		const result = await handleGetCircuitLayout({ userId: 'auth0|user1' });

		expect(result).toEqual({ result: layout });
	});

	it('should return an error when no session exists for the user', async () => {
		const result = await handleGetCircuitLayout({ userId: 'auth0|nonexistent' });

		expect(result).toEqual({ error: 'No active session found for this user' });
	});

	it('should return an error when session exists but circuitLayout is null', async () => {
		sessionStore.create('auth0|empty-user');

		const result = await handleGetCircuitLayout({ userId: 'auth0|empty-user' });

		expect(result).toEqual({ error: 'No circuit data is loaded for this session' });
	});

	it('should return the full layout object without modification', async () => {
		const layout = {
			version: '1.1',
			metadata: {
				name: 'Complex Circuit',
				created: '2025-06-01T12:00:00Z',
				modified: '2025-06-01T13:00:00Z',
			},
			components: [
				{
					id: 'r1', type: 'resistor', label: 'R1', x: 0, y: 0, rotation: 0, parameters: { resistance: 8 },
				},
				{
					id: 's1', type: 'speaker', label: 'Woofer', x: 100, y: 0, rotation: 0, parameters: {},
				},
			],
			wires: [
				{
					id: 'w1', startNode: { componentId: 'r1', terminal: 'out' }, endNode: { componentId: 's1', terminal: 'in' },
				},
			],
			annotations: [],
			curveColors: {},
			graphSettings: {},
			blockGroups: [],
		};
		sessionStore.create('auth0|full-user');
		sessionStore.update('auth0|full-user', { circuitLayout: layout });

		const result = await handleGetCircuitLayout({ userId: 'auth0|full-user' });

		expect(result.result).toEqual(layout);
		expect(result.result.version).toBe('1.1');
		expect(result.result.components).toHaveLength(2);
		expect(result.result.wires).toHaveLength(1);
	});
});
