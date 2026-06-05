const sessionManager = require('../../session/manager');

/**
 * Handle the get_frequency_response MCP tool invocation.
 *
 * Behavior:
 * - If `listAngles: true`, returns the list of available angles from simulationResults keys.
 * - If no angle parameter (or angle === 0), returns the on-axis (0°) frequency response.
 * - If an angle is specified, returns the frequency response at that off-axis angle.
 * - If the requested angle is unavailable, returns an error listing available angles.
 *
 * @param {object} context - The authenticated MCP context
 * @param {string} context.userId - The authenticated user identity
 * @param {object} params - Tool parameters
 * @param {number} [params.angle] - Off-axis angle in degrees (0 for on-axis)
 * @param {boolean} [params.listAngles] - If true, return available angles instead of data
 * @returns {object} Result object: { result: data } on success, { error: message } on failure
 */
async function handleGetFrequencyResponse(context, params) {
	const { userId } = context;
	const session = sessionManager.getSession(userId);

	if (!session) {
		return { error: 'No active session found for this user.' };
	}

	const { simulationResults } = session;

	if (!simulationResults) {
		return { error: 'No simulation results available. Please run a simulation first.' };
	}

	const availableAngles = Object.keys(simulationResults).map(Number).sort((a, b) => a - b);

	if (params && params.listAngles) {
		return { result: { availableAngles } };
	}

	const requestedAngle = (params && params.angle != null) ? params.angle : 0;

	if (!Object.prototype.hasOwnProperty.call(simulationResults, requestedAngle)) {
		return {
			error: `Angle ${requestedAngle}° is not available. Available angles: ${availableAngles.join(', ')}`,
		};
	}

	const angleResults = simulationResults[requestedAngle];

	if (!angleResults || !angleResults.frequencyResponse) {
		return { error: `No frequency response data available at angle ${requestedAngle}°.` };
	}

	const response = angleResults.frequencyResponse;

	// Apply frequency range filter if specified
	if (params && (params.minFreq || params.maxFreq)) {
		const minFreq = params.minFreq || 0;
		const maxFreq = params.maxFreq || Infinity;
		const { frequencies } = response;

		if (!frequencies || !Array.isArray(frequencies)) {
			return { result: response };
		}

		// Find indices within range
		const indices = [];
		for (let i = 0; i < frequencies.length; i++) {
			if (frequencies[i] >= minFreq && frequencies[i] <= maxFreq) {
				indices.push(i);
			}
		}

		// Filter all arrays by those indices
		const filtered = {};
		Object.keys(response).forEach((key) => {
			if (Array.isArray(response[key]) && response[key].length === frequencies.length) {
				filtered[key] = indices.map((i) => response[key][i]);
			} else {
				filtered[key] = response[key];
			}
		});

		return { result: filtered };
	}

	return { result: response };
}

module.exports = handleGetFrequencyResponse;
