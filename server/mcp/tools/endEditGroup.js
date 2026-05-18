const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');

/**
 * Handle the end_edit_group MCP tool invocation.
 * Signals the Electron app to finalize the undo group and marks
 * the session as not-in-edit-group.
 *
 * @param {object} context - The MCP request context containing userId
 * @returns {Promise<object>} The result or error object
 */
async function handleEndEditGroup(context) {
	const { userId } = context;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	const requestId = crypto.randomUUID();

	try {
		await forwardRequest(
			userId,
			'request:endEditGroup',
			{},
			requestId,
		);

		sessionManager.endEditGroup(userId);

		return { result: { success: true } };
	} catch (error) {
		if (error.message && error.message.includes('timed out')) {
			return { error: 'Request timed out: the Electron app did not respond within 30 seconds' };
		}
		return { error: error.message || 'Failed to forward request to the Electron app' };
	}
}

module.exports = handleEndEditGroup;
