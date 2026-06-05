const sessionManager = require('../../session/manager');

/**
 * Handle the get_impedance_response MCP tool invocation.
 * Returns the impedance response (frequencies, impedances, phases) from the
 * on-axis simulation results for the authenticated user.
 *
 * @param {object} context - The MCP request context containing userId
 * @returns {object} Result object with impedanceResponse data, or error message
 */
async function handleGetImpedanceResponse(context, params) {
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

	// Apply frequency range filter if specified
	if (params && (params.minFreq || params.maxFreq)) {
		const minFreq = params.minFreq || 0;
		const maxFreq = params.maxFreq || Infinity;
		const { frequencies } = impedanceResponse;

		if (!frequencies || !Array.isArray(frequencies)) {
			return { result: impedanceResponse };
		}

		const indices = [];
		for (let i = 0; i < frequencies.length; i++) {
			if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
				indices.push(i);
			}
		}

		const filtered = {};
		Object.keys(impedanceResponse).forEach((key) => {
			if (Array.isArray(impedanceResponse[key]) && impedanceResponse[key].length === frequencies.length) {
				filtered[key] = indices.map((i) => impedanceResponse[key][i]);
			} else {
				filtered[key] = impedanceResponse[key];
			}
		});

		return { result: filtered };
	}

	return { result: impedanceResponse };
}

module.exports = handleGetImpedanceResponse;
