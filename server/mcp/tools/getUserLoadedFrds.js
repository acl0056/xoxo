const sessionManager = require('../../session/manager');

/**
 * Handle the get_user_loaded_frds MCP tool invocation.
 *
 * Returns all user-loaded FRD measurement data currently displayed in the graph.
 * Each entry includes the label, frequency/magnitude/phase arrays (conforming to
 * frd-data.schema.json), and metadata such as measurement angle and description.
 *
 * Returns an empty list (not an error) if no FRD files are loaded.
 * The Electron app pushes user-loaded FRD data via `state:userFrds` message
 * when files are loaded or removed.
 *
 * @param {object} context - The authenticated MCP context
 * @param {string} context.userId - The authenticated user identity
 * @returns {object} Result object: { result: [...] } on success, { error: message } on failure
 */
async function handleGetUserLoadedFrds(context) {
	const { userId } = context;

	const session = sessionManager.getSession(userId);
	if (!session) {
		return { error: 'No active session found for this user' };
	}

	return { result: session.userLoadedFrds || [] };
}

module.exports = handleGetUserLoadedFrds;
