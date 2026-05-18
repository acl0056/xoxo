const crypto = require('crypto');
const { forwardRequest } = require('../../ws/handler');
const { validateComponent } = require('../../validation/validator');

/**
 * Handle the add_component MCP tool invocation.
 * Validates the component object against circuit.schema.json component definition,
 * then forwards the request to the Electron app via WebSocket.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {object} params.component - Component object conforming to circuit.schema.json component definition
 * @returns {Promise<object>} The result or error object
 */
async function handleAddComponent(context, params) {
	const { userId } = context;
	const { component } = params;

	const validationResult = validateComponent(component);
	if (!validationResult.valid) {
		return {
			error: `Component validation failed: ${validationResult.errors.join('; ')}`,
		};
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:addComponent',
			{ component },
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

module.exports = handleAddComponent;
