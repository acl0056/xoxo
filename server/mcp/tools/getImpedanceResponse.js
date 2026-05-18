const sessionManager = require('../../session/manager');

/**
 * Handle the get_impedance_response MCP tool invocation.
 * Returns the impedance response (frequencies, impedances, phases) from the
 * on-axis simulation results for the authenticated user.
 *
 * @param {object} context - The MCP request context containing userId
 * @returns {object} Result object with impedanceResponse data, or error message
 */
async function handleGetImpedanceResponse(context) {
	const { userId } = context;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'Authentication required. No active session found.' };
	}

	const { simulationResults } = session;
	if (!simulationResults || !simulationResults[0]) {
		return { error: 'No simulation results available. Please run a simulation first.' };
	}

	const onAxisResults = simulationResults[0];
	const { impedanceResponse } = onAxisResults;

	return { result: impedanceResponse };
}

module.exports = handleGetImpedanceResponse;
