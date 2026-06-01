const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');
const { validateCircuitLayout } = require('../../validation/validator');

/**
 * Handle the set_circuit_layout MCP tool invocation.
 * Validates the full layout against circuit.schema.json,
 * then forwards it to the Electron app via WebSocket.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {object} params.layout - Complete Circuit_Layout conforming to circuit.schema.json
 * @returns {Promise<object>} The result or error object
 */
async function handleSetCircuitLayout(context, params) {
	const { userId } = context;
	const { layout } = params;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	const validationResult = validateCircuitLayout(layout);
	if (!validationResult.valid) {
		return {
			error: `Layout validation failed: ${validationResult.errors.join('; ')}`,
		};
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:setCircuitLayout',
			{ layout },
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

module.exports = handleSetCircuitLayout;
