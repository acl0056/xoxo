const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');
const { validateComponent } = require('../../validation/validator');

/**
 * Handle the optimize_component MCP tool invocation.
 * Validates the component ID exists and parameters conform to schema,
 * then forwards the update to the Electron app via WebSocket.
 *
 * @param {object} context - The MCP request context containing userId
 * @param {object} params - The tool parameters
 * @param {string} params.componentId - ID of the component to update
 * @param {object} params.parameters - New parameter values to apply
 * @returns {Promise<object>} The result or error object
 */
async function handleOptimizeComponent(context, params) {
	const { userId } = context;
	const { componentId, parameters } = params;

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

	const candidateComponent = {
		...component,
		parameters: { ...component.parameters, ...parameters },
	};

	const validationResult = validateComponent(candidateComponent);
	if (!validationResult.valid) {
		return {
			error: `Parameter validation failed for component type "${component.type}": ${validationResult.errors.join('; ')}`,
		};
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:optimize',
			{ componentId, parameters },
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

module.exports = handleOptimizeComponent;
