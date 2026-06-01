const sessionStore = require('../../../server/session/store');
const sessionManager = require('../../../server/session/manager');
const handleUndo = require('../../../server/mcp/tools/undo');

jest.mock('../../../server/ws/handler', () => ({
	forwardRequest: jest.fn(),
}));

const { forwardRequest } = require('../../../server/ws/handler');

describe('server/mcp/tools/undo', () => {
	beforeEach(() => {
		const allSessions = sessionStore.getAll();
		for (const userId of allSessions.keys()) {
			sessionStore.delete(userId);
		}
		forwardRequest.mockReset();
	});

	it('should forward an undo request to the Electron app', async () => {
		sessionStore.create('auth0|user1');

		forwardRequest.mockResolvedValue({ success: true });

		const result = await handleUndo({ userId: 'auth0|user1' });

		expect(result).toEqual({ result: { success: true } });
		expect(forwardRequest).toHaveBeenCalledWith(
			'auth0|user1',
			'request:undo',
			{},
			expect.any(String),
		);
	});

	it('should return an error when no session exists', async () => {
		const result = await handleUndo({ userId: 'auth0|missing' });

		expect(result).toEqual({ error: 'No active session found for this user' });
		expect(forwardRequest).not.toHaveBeenCalled();
	});

	it('should return an error when an edit group is active', async () => {
		sessionStore.create('auth0|user2');
		sessionManager.beginEditGroup('auth0|user2', 'test group');

		const result = await handleUndo({ userId: 'auth0|user2' });

		expect(result).toEqual({ error: 'Cannot undo while an edit group is active. Call end_edit_group first.' });
		expect(forwardRequest).not.toHaveBeenCalled();

		// Clean up
		sessionManager.endEditGroup('auth0|user2');
	});

	it('should return a timeout error when the Electron app does not respond', async () => {
		sessionStore.create('auth0|user3');

		forwardRequest.mockRejectedValue(new Error('Request timed out after 30000ms'));

		const result = await handleUndo({ userId: 'auth0|user3' });

		expect(result).toEqual({ error: 'Request timed out: the Electron app did not respond within 30 seconds' });
	});
});
