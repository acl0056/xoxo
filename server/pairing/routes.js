const crypto = require('crypto');
const { Router } = require('express');
const { generatePairingCode } = require('./generator');
const pairingStore = require('./store');
const sessionStore = require('../session/store');
const { signAccessToken } = require('../auth/token');

const router = Router();

const PAIRING_CODE_EXPIRY_MS = 300000; // 5 minutes
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * POST /pairing/start
 *
 * Generates a unique pairing code, creates a session placeholder in the
 * session store, and associates the code with the session ID.
 * Returns a JWT token for the desktop app to use for its WebSocket connection.
 *
 * No authentication required.
 *
 * Response: { code, sessionId, token }
 */
router.post('/pairing/start', (req, res) => {
	const sessionId = crypto.randomUUID();

	let code;
	let attempts = 0;
	do {
		code = generatePairingCode();
		attempts++;
		if (attempts > MAX_GENERATION_ATTEMPTS) {
			return res.status(503).json({ error: 'Unable to generate unique pairing code' });
		}
	} while (pairingStore.get(code) !== null);

	sessionStore.create(sessionId);

	const expiresAt = Date.now() + PAIRING_CODE_EXPIRY_MS;
	pairingStore.create(code, sessionId, expiresAt);

	const token = signAccessToken(sessionId);

	return res.status(200).json({ code, sessionId, token });
});

module.exports = router;
