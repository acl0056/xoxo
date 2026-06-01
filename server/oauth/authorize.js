const crypto = require('crypto');
const path = require('path');
const express = require('express');
const pairingStore = require('../pairing/store');

const router = express.Router();

// Parse URL-encoded form bodies for the POST handler
router.use(express.urlencoded({ extended: false }));

/**
 * In-memory store for authorization codes.
 * Maps authorization code string to entry object:
 * { code, sessionId, codeChallenge, codeChallengeMethod, redirectUri, clientId, createdAt, expiresAt }
 */
const authorizationCodes = new Map();

const AUTHORIZATION_CODE_LIFETIME_MS = 60000; // 60 seconds

const REQUIRED_PARAMS = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method'];

/**
 * Build an HTML error page that re-renders the pairing code form with an error message.
 * Includes hidden fields so the user can retry without losing OAuth params.
 *
 * @param {string} errorMessage - The error message to display
 * @param {object} params - The OAuth parameters to preserve in hidden fields
 * @returns {string} HTML string
 */
function buildErrorFormHtml(errorMessage, params) {
	const {
		responseType, clientId, redirectUri, codeChallenge, codeChallengeMethod, state,
	} = params;
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Enter Pairing Code</title></head>
<body>
<h1>Enter Pairing Code</h1>
<p style="color: red;">${errorMessage}</p>
<form method="POST" action="/oauth/authorize">
<input type="hidden" name="response_type" value="${responseType || ''}">
<input type="hidden" name="client_id" value="${clientId || ''}">
<input type="hidden" name="redirect_uri" value="${redirectUri || ''}">
<input type="hidden" name="code_challenge" value="${codeChallenge || ''}">
<input type="hidden" name="code_challenge_method" value="${codeChallengeMethod || ''}">
${state ? `<input type="hidden" name="state" value="${state}">` : ''}
<label for="pairing_code">Pairing Code:</label>
<input type="text" id="pairing_code" name="pairing_code" placeholder="XOXO-XXXX-XXXX" required>
<button type="submit">Submit</button>
</form>
</body>
</html>`;
}

/**
 * GET /oauth/authorize
 *
 * Validates required OAuth parameters and serves the pairing code entry page.
 */
router.get('/oauth/authorize', (req, res) => {
	const missingParams = REQUIRED_PARAMS.filter((param) => !req.query[param]);

	if (missingParams.length > 0) {
		return res.status(400).send(
			`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Authorization Error</title></head>
<body>
<h1>Authorization Error</h1>
<p>Missing required parameters: ${missingParams.join(', ')}</p>
</body>
</html>`,
		);
	}

	if (req.query.response_type !== 'code') {
		return res.status(400).send(
			`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Authorization Error</title></head>
<body>
<h1>Authorization Error</h1>
<p>Unsupported response_type. Only "code" is supported.</p>
</body>
</html>`,
		);
	}

	if (req.query.code_challenge_method !== 'S256') {
		return res.status(400).send(
			`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Authorization Error</title></head>
<body>
<h1>Authorization Error</h1>
<p>Unsupported code_challenge_method. Only "S256" is supported.</p>
</body>
</html>`,
		);
	}

	const htmlPath = path.join(__dirname, 'views', 'authorize.html');
	return res.sendFile(htmlPath);
});

/**
 * POST /oauth/authorize
 *
 * Validates submitted pairing code, generates authorization code, redirects.
 */
router.post('/oauth/authorize', (req, res) => {
	const {
		pairing_code: pairingCode,
		response_type: responseType,
		client_id: clientId,
		redirect_uri: redirectUri,
		code_challenge: codeChallenge,
		code_challenge_method: codeChallengeMethod,
		state,
	} = req.body;

	// Validate required OAuth params are still present in POST
	if (!responseType || !clientId || !redirectUri || !codeChallenge || !codeChallengeMethod) {
		return res.status(400).send(
			`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Authorization Error</title></head>
<body>
<h1>Authorization Error</h1>
<p>Missing required OAuth parameters.</p>
</body>
</html>`,
		);
	}

	if (!pairingCode) {
		return res.status(200).send(buildErrorFormHtml(
			'Please enter a pairing code.',
			{
				responseType, clientId, redirectUri, codeChallenge, codeChallengeMethod, state,
			},
		));
	}

	// Consume the pairing code
	const pairingEntry = pairingStore.consume(pairingCode);

	if (!pairingEntry) {
		return res.status(200).send(buildErrorFormHtml(
			'Invalid or expired pairing code. Please try again.',
			{
				responseType, clientId, redirectUri, codeChallenge, codeChallengeMethod, state,
			},
		));
	}

	// Generate authorization code (32 random bytes, base64url-encoded)
	const authCode = crypto.randomBytes(32).toString('base64url');
	const now = Date.now();

	const authCodeEntry = {
		code: authCode,
		sessionId: pairingEntry.sessionId,
		codeChallenge,
		codeChallengeMethod,
		redirectUri,
		clientId,
		createdAt: now,
		expiresAt: now + AUTHORIZATION_CODE_LIFETIME_MS,
	};

	authorizationCodes.set(authCode, authCodeEntry);

	// Redirect to redirect_uri with code and state
	const redirectUrl = new URL(redirectUri);
	redirectUrl.searchParams.set('code', authCode);
	if (state) {
		redirectUrl.searchParams.set('state', state);
	}

	return res.redirect(302, redirectUrl.toString());
});

module.exports = router;
module.exports.authorizationCodes = authorizationCodes;
