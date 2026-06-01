const crypto = require('crypto');
const sessionManager = require('../../session/manager');
const { forwardRequest } = require('../../ws/handler');

/**
 * Handle the select_graph_angle MCP tool invocation.
 *
 * Selecting an angle changes the graph's viewed frequency-response angle in
 * the Electron app. The renderer runs the simulation for that selected angle
 * when auto-simulate is enabled, then pushes the resulting angle-specific
 * simulation data back to the server.
 *
 * @param {object} context - The authenticated MCP context
 * @param {string} context.userId - The authenticated user identity
 * @param {object} params - Tool parameters
 * @param {number} params.angle - Off-axis angle in degrees (0 for on-axis)
 * @returns {Promise<object>} Result object: { result: data } on success, { error: message } on failure
 */
async function handleSelectGraphAngle(context, params) {
	const { userId } = context;
	const { angle } = params;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (!session.circuitLayout) {
		return { error: 'No circuit data is loaded for this session' };
	}

	if (typeof angle !== 'number' || !Number.isFinite(angle) || angle < 0 || angle > 180) {
		return { error: `Invalid angle: expected a finite number between 0 and 180 but received ${angle}` };
	}

	const requestId = crypto.randomUUID();

	try {
		const response = await forwardRequest(
			userId,
			'request:selectGraphAngle',
			{ angle },
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

module.exports = handleSelectGraphAngle;
