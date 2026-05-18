const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');
const { validateWire } = require('../../validation/validator');

/**
 * Handle the add_wire MCP tool invocation.
 * Validates the wire object against circuit.schema.json wire definition,
 * then forwards the request to the Electron app via WebSocket.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {object} params.wire - Wire object conforming to circuit.schema.json wire definition
 * @returns {Promise<object>} The result or error object
 */
async function handleAddWire(context, params) {
	const { userId } = context;
	const { wire } = params;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (!session.circuitLayout) {
		return { error: 'No circuit data is loaded for this session' };
	}

	const validationResult = validateWire(wire);
	if (!validationResult.valid) {
		return {
			error: `Wire validation failed: ${validationResult.errors.join('; ')}`,
		};
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:addWire',
			{ wire },
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

module.exports = handleAddWire;
