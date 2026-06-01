const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');

/**
 * Handle the undo MCP tool invocation.
 *
 * Triggers an undo operation in the Electron app, reverting the most recent
 * change on the undo stack. Cannot be called while an edit group is active.
 *
 * @param {object} context - The authenticated MCP context
 * @param {string} context.userId - The authenticated user identity
 * @returns {Promise<object>} Result object: { result: data } on success, { error: message } on failure
 */
async function handleUndo(context) {
	const { userId } = context;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (sessionManager.isEditGroupActive(userId)) {
		return { error: 'Cannot undo while an edit group is active. Call end_edit_group first.' };
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:undo',
			{},
			requestId,
		);

		return { result: response };
	} catch (error) {
		if (error.message && error.message.includes('timed out')) {
			return { error: 'Request timed out: the Electron app did not respond within 30 seconds' };
		}
		return { error: error.message || 'Failed to forward request to the Electron app' };
	}
}

module.exports = handleUndo;
