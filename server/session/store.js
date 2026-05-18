const sessions = new Map();

/**
 * Create a new session for the given user ID.
 * Initializes all session fields to their default empty state.
 *
 * @param {string} userId - The user identity from the OAuth token sub claim
 * @param {object} [options] - Optional initial values for the session
 * @param {object} [options.wsConnection] - Active WebSocket connection reference
 * @param {string} [options.mcpSessionId] - MCP session identifier
 * @returns {object} The newly created session data
 */
function create(userId, options = {}) {
	const sessionData = {
		userId,
		circuitLayout: null,
		simulationResults: null,
		userLoadedFrds: [],
		wsConnection: options.wsConnection || null,
		mcpSessionId: options.mcpSessionId || null,
		connectedAt: new Date().toISOString(),
		editGroup: {
			active: false,
			startedAt: null,
			description: null,
		},
	};

	sessions.set(userId, sessionData);
	return sessionData;
}

/**
 * Retrieve the session data for a given user ID.
 *
 * @param {string} userId - The user identity to look up
 * @returns {object|undefined} The session data, or undefined if no session exists
 */
function get(userId) {
	return sessions.get(userId);
}

/**
 * Update an existing session with new field values.
 * Only the provided fields are merged; other fields remain unchanged.
 *
 * @param {string} userId - The user identity whose session to update
 * @param {object} updates - An object containing the fields to update
 * @returns {object|undefined} The updated session data, or undefined if no session exists
 */
function update(userId, updates) {
	const existingSession = sessions.get(userId);
	if (!existingSession) {
		return undefined;
	}

	const updatedSession = { ...existingSession, ...updates };
	sessions.set(userId, updatedSession);
	return updatedSession;
}

/**
 * Delete the session for a given user ID.
 *
 * @param {string} userId - The user identity whose session to remove
 * @returns {boolean} True if the session existed and was deleted, false otherwise
 */
function deleteSession(userId) {
	return sessions.delete(userId);
}

/**
 * Retrieve all sessions currently stored.
 * Useful for checking concurrency count.
 *
 * @returns {Map<string, object>} The full sessions map
 */
function getAll() {
	return sessions;
}

module.exports = {
	create,
	get,
	update,
	delete: deleteSession,
	getAll,
};
