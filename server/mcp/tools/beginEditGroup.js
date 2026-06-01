const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');

/**
 * Handle the begin_edit_group MCP tool invocation.
 * Marks the session as in-edit-group with a timestamp and signals
 * the Electron app to save the current state as an undo checkpoint.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {string} [params.description] - Optional description of the batch edit
 * @returns {Promise<object>} The result or error object
 */
async function handleBeginEditGroup(context, params) {
	const { userId } = context;
	const description = params && params.description ? params.description : undefined;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	const markResult = sessionManager.beginEditGroup(userId, description);
	if (!markResult.success) {
		return { error: markResult.errors.join('; ') };
	}

	const requestId = crypto.randomUUID();

	try {
		await forwardRequest(
			userId,
			'request:beginEditGroup',
			{ description },
			requestId,
		);

		return { result: { success: true, description: description || null } };
	} catch (error) {
		// Revert the session edit group state since the forward failed
		sessionManager.endEditGroup(userId);

		if (error.message && error.message.includes('timed out')) {
			return { error: 'Request timed out: the Electron app did not respond within 30 seconds' };
		}
		return { error: error.message || 'Failed to forward request to the Electron app' };
	}
}

module.exports = handleBeginEditGroup;
