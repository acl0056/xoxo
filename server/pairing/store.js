const pairingCodes = new Map();

/**
 * Store a new pairing code entry.
 *
 * @param {string} code - The pairing code (e.g. "XOXO-A2B3")
 * @param {string} sessionId - The desktop session ID associated with this code
 * @param {number} expiresAt - Epoch milliseconds when this code expires
 */
function create(code, sessionId, expiresAt) {
	pairingCodes.set(code, { sessionId, expiresAt });
}

/**
 * Consume a pairing code, returning the associated session and removing the entry.
 * Single-use semantics: after consumption, the code cannot be used again.
 *
 * @param {string} code - The pairing code to consume
 * @returns {{ sessionId: string } | null} The session info, or null if code is invalid/expired
 */
function consume(code) {
	const entry = pairingCodes.get(code);
	if (!entry) {
		return null;
	}
	if (Date.now() > entry.expiresAt) {
		pairingCodes.delete(code);
		return null;
	}
	pairingCodes.delete(code);
	return { sessionId: entry.sessionId };
}

/**
 * Retrieve a pairing code entry without consuming it.
 * Returns null if the code does not exist or is expired.
 *
 * @param {string} code - The pairing code to look up
 * @returns {{ sessionId: string, expiresAt: number } | null} The entry, or null
 */
function get(code) {
	const entry = pairingCodes.get(code);
	if (!entry) {
		return null;
	}
	if (Date.now() > entry.expiresAt) {
		pairingCodes.delete(code);
		return null;
	}
	return { sessionId: entry.sessionId, expiresAt: entry.expiresAt };
}

/**
 * Check whether a pairing code is expired.
 * Returns true if the code does not exist or its expiration time has passed.
 *
 * @param {string} code - The pairing code to check
 * @returns {boolean} True if expired or not found, false if still valid
 */
function isExpired(code) {
	const entry = pairingCodes.get(code);
	if (!entry) {
		return true;
	}
	return Date.now() > entry.expiresAt;
}

/**
 * Remove all expired entries from the store.
 */
function cleanup() {
	const now = Date.now();
	for (const [code, entry] of pairingCodes) {
		if (now > entry.expiresAt) {
			pairingCodes.delete(code);
		}
	}
}

module.exports = {
	create,
	consume,
	get,
	isExpired,
	cleanup,
};
