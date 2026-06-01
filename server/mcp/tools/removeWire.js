const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');

/**
 * Handle the remove_wire MCP tool invocation.
 * Validates the wire ID exists in the current circuit layout,
 * then forwards the removal request to the Electron app via WebSocket.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {string} params.wireId - ID of the wire to remove
 * @returns {Promise<object>} The result or error object
 */
async function handleRemoveWire(context, params) {
	const { userId } = context;
	const { wireId } = params;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (!session.circuitLayout) {
		return { error: 'No circuit data is loaded for this session' };
	}

	const wire = session.circuitLayout.wires.find(
		(item) => item.id === wireId,
	);

	if (!wire) {
		return { error: `Invalid wire ID: "${wireId}" does not exist in the current circuit layout` };
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:removeWire',
			{ wireId },
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

module.exports = handleRemoveWire;
