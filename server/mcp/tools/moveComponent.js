const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');

/**
 * Handle the move_component MCP tool invocation.
 * Validates the component ID exists and coordinates are integers,
 * then forwards the move request to the Electron app via WebSocket.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {string} params.componentId - ID of the component to move
 * @param {number} params.x - New X grid coordinate (must be an integer)
 * @param {number} params.y - New Y grid coordinate (must be an integer)
 * @returns {Promise<object>} The result or error object
 */
async function handleMoveComponent(context, params) {
	const { userId } = context;
	const { componentId, x, y } = params;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (!session.circuitLayout) {
		return { error: 'No circuit data is loaded for this session' };
	}

	const component = session.circuitLayout.components.find(
		(item) => item.id === componentId,
	);

	if (!component) {
		return { error: `Invalid component ID: "${componentId}" does not exist in the current circuit layout` };
	}

	if (!Number.isInteger(x)) {
		return { error: `Invalid x coordinate: expected an integer but received ${JSON.stringify(x)}` };
	}

	if (!Number.isInteger(y)) {
		return { error: `Invalid y coordinate: expected an integer but received ${JSON.stringify(y)}` };
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:moveComponent',
			{ componentId, x, y },
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

module.exports = handleMoveComponent;
