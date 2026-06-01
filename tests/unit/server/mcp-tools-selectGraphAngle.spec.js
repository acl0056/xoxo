const sessionStore = require('../../../server/session/store');
const handleSelectGraphAngle = require('../../../server/mcp/tools/selectGraphAngle');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/selectGraphAngle', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should forward a valid graph angle selection request', async () => {
		sessionStore.create('auth0|user1');
		sessionStore.update('auth0|user1', {
			circuitLayout: {
				version: '1.0',
				metadata: { name: 'Test', created: '2026-01-01T00:00:00Z', modified: '2026-01-01T00:00:00Z' },
				components: [],
				wires: [],
			},
		});

		const response = {
			success: true,
			angle: 30,
			availableAngles: [30, 60],
			excludedSpeakerIds: [],
		};
		forwardRequest.mockResolvedValue(response);

		const result = await handleSelectGraphAngle(
			{ userId: 'auth0|user1' },
			{ angle: 30 },
		);

		expect(result).toEqual({ result: response });
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:selectGraphAngle',
			{ angle: 30 },
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleSelectGraphAngle(
			{ userId: 'auth0|missing' },
			{ angle: 30 },
		);

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when no circuit layout is loaded', async () => {
		sessionStore.create('auth0|user2');

		const result = await handleSelectGraphAngle(
			{ userId: 'auth0|user2' },
			{ angle: 30 },
		);

		expect(result).toEqual({ error: 'No circuit data is loaded for this session' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should reject invalid angles', async () => {
		sessionStore.create('auth0|user3');
		sessionStore.update('auth0|user3', {
			circuitLayout: {
				version: '1.0',
				metadata: { name: 'Test', created: '2026-01-01T00:00:00Z', modified: '2026-01-01T00:00:00Z' },
				components: [],
				wires: [],
			},
		});

		const result = await handleSelectGraphAngle(
			{ userId: 'auth0|user3' },
			{ angle: 181 },
		);

		expect(result).toEqual({
			error: 'Invalid angle: expected a finite number between 0 and 180 but received 181',
		});
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user4');
		sessionStore.update('auth0|user4', {
			circuitLayout: {
				version: '1.0',
				metadata: { name: 'Test', created: '2026-01-01T00:00:00Z', modified: '2026-01-01T00:00:00Z' },
				components: [],
				wires: [],
			},
		});
		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleSelectGraphAngle(
			{ userId: 'auth0|user4' },
			{ angle: 30 },
		);

		expect(result).toEqual({ error: 'Request timed out: the Electron app did not respond within 30 seconds' });
	});
});
