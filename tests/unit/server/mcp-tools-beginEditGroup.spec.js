const sessionStore = require('../../../server/session/store');
const sessionManager = require('../../../server/session/manager');
const handleBeginEditGroup = require('../../../server/mcp/tools/beginEditGroup');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/beginEditGroup', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should mark session in-edit-group and forward to Electron app', async () => {
		sessionStore.create('auth0|user1');
		forwardRequest.mockResolvedValue({ success: true });

		const result = await handleBeginEditGroup(
			{ userId: 'auth0|user1' },
			{ description: 'Batch optimization' },
		);

		expect(result).toEqual({ result: { success: true, description: 'Batch optimization' } });
		expect(sessionManager.isEditGroupActive('auth0|user1')).toBe(true);
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:beginEditGroup',
			{ description: 'Batch optimization' },
			expect.any(String),
		);
	});

	it('should handle missing description parameter', async () => {
		sessionStore.create('auth0|user2');
		forwardRequest.mockResolvedValue({ success: true });

		const result = await handleBeginEditGroup(
			{ userId: 'auth0|user2' },
			{},
		);

		expect(result).toEqual({ result: { success: true, description: null } });
		expect(sessionManager.isEditGroupActive('auth0|user2')).toBe(true);
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user2',
			'request:beginEditGroup',
			{ description: undefined },
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleBeginEditGroup(
			{ userId: 'auth0|nonexistent' },
			{ description: 'Test' },
		);

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should revert edit group state when forward request fails', async () => {
		sessionStore.create('auth0|user3');
		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleBeginEditGroup(
			{ userId: 'auth0|user3' },
			{ description: 'Will fail' },
		);

		expect(result).toEqual({ error: 'No active Electron app connection for this user' });
		expect(sessionManager.isEditGroupActive('auth0|user3')).toBe(false);
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user4');
		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleBeginEditGroup(
			{ userId: 'auth0|user4' },
			{ description: 'Timeout test' },
		);

		expect(result).toEqual({ error: 'Request timed out: the Electron app did not respond within 30 seconds' });
		expect(sessionManager.isEditGroupActive('auth0|user4')).toBe(false);
	});
});
