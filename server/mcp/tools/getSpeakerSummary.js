const sessionManager = require('../../session/manager');

/**
 * Handle the get_speaker_summary MCP tool invocation.
 *
 * Returns a lightweight summary of all speaker components in the circuit,
 * including delay, polarity, mute status, and loaded measurement files.
 * This avoids parsing the full circuit layout (which can be large and
 * truncated) just to inspect driver configuration.
 *
 * @param {object} context - The authenticated MCP context
 * @param {string} context.userId - The authenticated user identity
 * @returns {object} Result object with speaker summaries or error
 */
function handleGetSpeakerSummary(context) {
	const { userId } = context;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	if (!session.circuitLayout) {
		return { error: 'No circuit data is loaded for this session' };
	}

	const { components } = session.circuitLayout;
	if (!components || !Array.isArray(components)) {
		return { error: 'Circuit layout has no components array' };
	}

	const speakers = components
		.filter((component) => component.type === 'speaker')
		.map((speaker) => {
			const params = speaker.parameters || {};
			const offAxisAngles = (params.offAxisFiles || []).map((file) => file.angle);

			return {
				id: speaker.id,
				label: speaker.label,
				name: params.name || null,
				delay: params.delay || 0,
				delayUnit: params.delayUnit || null,
				inverted: params.inverted || false,
				muted: params.muted || false,
				frdFile: params.frdFile || null,
				zmaFile: params.zmaFile || null,
				offAxisAngles,
			};
		});

	return { result: speakers };
}

module.exports = handleGetSpeakerSummary;
