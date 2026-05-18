const sessionStore = require('./store');
const config = require('../config');
const { validateCircuitLayout, validateSimulationResults } = require('../validation/validator');

/**
 * Retrieve the session data for a given user ID.
 *
 * @param {string} userId - The authenticated user identity
 * @returns {object|undefined} The session data, or undefined if no session exists
 */
function getSession(userId) {
	return sessionStore.get(userId);
}

/**
 * Validate and store a circuit layout for the given user.
 * Returns an error object if validation fails (does not throw).
 *
 * @param {string} userId - The authenticated user identity
 * @param {object} layout - The circuit layout object to validate and store
 * @returns {object} Result object: { success: true } or { success: false, errors: string[] }
 */
function updateCircuitLayout(userId, layout) {
	const validationResult = validateCircuitLayout(layout);
	if (!validationResult.valid) {
		return { success: false, errors: validationResult.errors };
	}

	const updatedSession = sessionStore.update(userId, { circuitLayout: layout });
	if (!updatedSession) {
		return { success: false, errors: ['Session not found for the specified user'] };
	}

	return { success: true };
}

/**
 * Validate and store simulation results for the given user.
 * Returns an error object if validation fails (does not throw).
 *
 * @param {string} userId - The authenticated user identity
 * @param {object} results - The simulation results object to validate and store
 * @returns {object} Result object: { success: true } or { success: false, errors: string[] }
 */
function updateSimulationResults(userId, results) {
	const validationResult = validateSimulationResults(results);
	if (!validationResult.valid) {
		return { success: false, errors: validationResult.errors };
	}

	const session = sessionStore.get(userId);
	if (!session) {
		return { success: false, errors: ['Session not found for the specified user'] };
	}

	// Store results keyed by angle for multi-angle access
	const angle = results.angle != null ? results.angle : 0;
	const existingResults = session.simulationResults || {};
	const mergedResults = { ...existingResults, [angle]: results };

	const updatedSession = sessionStore.update(userId, { simulationResults: mergedResults });
	if (!updatedSession) {
		return { success: false, errors: ['Session not found for the specified user'] };
	}

	return { success: true };
}

/**
 * Retrieve the active WebSocket connection for a given user.
 *
 * @param {string} userId - The authenticated user identity
 * @returns {object|null} The WebSocket connection reference, or null if not connected
 */
function getElectronConnection(userId) {
	const session = sessionStore.get(userId);
	if (!session) {
		return null;
	}
	return session.wsConnection;
}

/**
 * Begin an edit group for the given user.
 * Marks the session as in-edit-group and records the start timestamp.
 *
 * @param {string} userId - The authenticated user identity
 * @param {string} [description] - Optional description of the batch edit
 * @returns {object} Result object: { success: true } or { success: false, errors: string[] }
 */
function beginEditGroup(userId, description) {
	const session = sessionStore.get(userId);
	if (!session) {
		return { success: false, errors: ['Session not found for the specified user'] };
	}

	const updatedSession = sessionStore.update(userId, {
		editGroup: {
			active: true,
			startedAt: new Date().toISOString(),
			description: description || null,
		},
	});

	if (!updatedSession) {
		return { success: false, errors: ['Failed to update session edit group state'] };
	}

	return { success: true };
}

/**
 * End the active edit group for the given user.
 * Marks the session as not-in-edit-group.
 *
 * @param {string} userId - The authenticated user identity
 * @returns {object} Result object: { success: true } or { success: false, errors: string[] }
 */
function endEditGroup(userId) {
	const session = sessionStore.get(userId);
	if (!session) {
		return { success: false, errors: ['Session not found for the specified user'] };
	}

	const updatedSession = sessionStore.update(userId, {
		editGroup: {
			active: false,
			startedAt: null,
			description: null,
		},
	});

	if (!updatedSession) {
		return { success: false, errors: ['Failed to update session edit group state'] };
	}

	return { success: true };
}

/**
 * Check if an edit group is currently active for the given user.
 *
 * @param {string} userId - The authenticated user identity
 * @returns {boolean} True if an edit group is active, false otherwise
 */
function isEditGroupActive(userId) {
	const session = sessionStore.get(userId);
	if (!session) {
		return false;
	}
	return session.editGroup.active;
}

/**
 * Check if the active edit group has exceeded the timeout threshold.
 * If 60 seconds have elapsed since the edit group began, auto-close it.
 *
 * @param {string} userId - The authenticated user identity
 * @returns {object} Result object: { timedOut: true } if auto-closed, { timedOut: false } otherwise
 */
function checkEditGroupTimeout(userId) {
	const session = sessionStore.get(userId);
	if (!session || !session.editGroup.active) {
		return { timedOut: false };
	}

	const startedAt = new Date(session.editGroup.startedAt).getTime();
	const elapsedMilliseconds = Date.now() - startedAt;

	if (elapsedMilliseconds >= config.editGroup.timeoutMs) {
		endEditGroup(userId);
		return { timedOut: true };
	}

	return { timedOut: false };
}

module.exports = {
	getSession,
	updateCircuitLayout,
	updateSimulationResults,
	getElectronConnection,
	beginEditGroup,
	endEditGroup,
	isEditGroupActive,
	checkEditGroupTimeout,
};
