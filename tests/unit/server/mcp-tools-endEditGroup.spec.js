const sessionStore = require('../../../server/session/store');
const sessionManager = require('../../../server/session/manager');
const handleEndEditGroup = require('../../../server/mcp/tools/endEditGroup');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/endEditGroup', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should forward to Electron app and mark session not-in-edit-group', async () => {
		sessionStore.create('auth0|user1');
		sessionManager.beginEditGroup('auth0|user1', 'Test group');
		forwardRequest.mockResolvedValue({ success: true });

		const result = await handleEndEditGroup({ userId: 'auth0|user1' });

		expect(result).toEqual({ result: { success: true } });
		expect(sessionManager.isEditGroupActive('auth0|user1')).toBe(false);
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:endEditGroup',
			{},
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleEndEditGroup({ userId: 'auth0|nonexistent' });

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user2');
		sessionManager.beginEditGroup('auth0|user2', 'Timeout group');
		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleEndEditGroup({ userId: 'auth0|user2' });

		expect(result).toEqual({ error: 'Request timed out: the Electron app did not respond within 30 seconds' });
	});

	it('should return a generic error when forward request fails', async () => {
		sessionStore.create('auth0|user3');
		sessionManager.beginEditGroup('auth0|user3', 'Error group');
		forwardRequest.mockRejectedValue(new Error('No active Electron app connection for this user'));

		const result = await handleEndEditGroup({ userId: 'auth0|user3' });

		expect(result).toEqual({ error: 'No active Electron app connection for this user' });
	});
});
