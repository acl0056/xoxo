const crypto = require('crypto');
const { Router } = require('express');
const { signAccessToken, TOKEN_LIFETIME_SECONDS } = require('../auth/token');
const { authorizationCodes } = require('./authorize');
const sessionStore = require('../session/store');

const router = Router();

/**
 * Computes BASE64URL(SHA256(codeVerifier)) for PKCE S256 verification.
 *
 * @param {string} codeVerifier - The plain code_verifier string.
 * @returns {string} The base64url-encoded SHA-256 hash.
 */
function computeCodeChallenge(codeVerifier) {
	return crypto
		.createHash('sha256')
		.update(codeVerifier)
		.digest('base64url');
}

/**
 * POST /oauth/token
 *
 * Exchanges an authorization code for a JWT access token.
 * Validates PKCE code_verifier against stored code_challenge.
 * No Bearer token authentication required on this endpoint.
 */
router.post('/oauth/token', (req, res) => {
	const {
		grant_type: grantType,
		code,
		redirect_uri: redirectUri,
		client_id: clientId,
		code_verifier: codeVerifier,
	} = req.body;

	// Validate required parameters
	if (!grantType || !code || !redirectUri || !clientId || !codeVerifier) {
		return res.status(400).json({ error: 'invalid_request' });
	}

	if (grantType !== 'authorization_code') {
		return res.status(400).json({ error: 'invalid_request' });
	}

	// Look up the authorization code
	const authCodeEntry = authorizationCodes.get(code);

	if (!authCodeEntry) {
		return res.status(400).json({ error: 'invalid_grant' });
	}

	// Verify authorization code has not expired (60s lifetime)
	if (Date.now() > authCodeEntry.expiresAt) {
		authorizationCodes.delete(code);
		return res.status(400).json({ error: 'invalid_grant' });
	}

	// Verify redirect_uri matches
	if (authCodeEntry.redirectUri !== redirectUri) {
		return res.status(400).json({ error: 'invalid_grant' });
	}

	// Verify client_id matches
	if (authCodeEntry.clientId !== clientId) {
		return res.status(400).json({ error: 'invalid_grant' });
	}

	// Verify PKCE: BASE64URL(SHA256(code_verifier)) must equal stored code_challenge
	const computedChallenge = computeCodeChallenge(codeVerifier);
	if (computedChallenge !== authCodeEntry.codeChallenge) {
		return res.status(400).json({ error: 'invalid_grant' });
	}

	// Consume the authorization code (single-use)
	authorizationCodes.delete(code);

	// Issue JWT access token
	const accessToken = signAccessToken(authCodeEntry.sessionId);

	// Notify the desktop app via WebSocket that pairing succeeded
	const session = sessionStore.get(authCodeEntry.sessionId);
	if (session && session.wsConnection) {
		session.wsConnection.emit('message', {
			type: 'pairing:success',
			payload: {
				sessionId: authCodeEntry.sessionId,
				expiresIn: TOKEN_LIFETIME_SECONDS,
			},
		});
	}

	return res.status(200).json({
		access_token: accessToken,
		token_type: 'bearer',
		expires_in: TOKEN_LIFETIME_SECONDS,
	});
});

module.exports = router;
