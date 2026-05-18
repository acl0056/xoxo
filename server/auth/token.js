const jsonwebtoken = require('jsonwebtoken');

const ISSUER = 'https://aix.reflect.systems';
const AUDIENCE = 'https://aix.reflect.systems/mcp';
const TOKEN_LIFETIME_SECONDS = 3600;
const MINIMUM_SECRET_LENGTH = 32;

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < MINIMUM_SECRET_LENGTH) {
	throw new Error(
		`JWT_SECRET environment variable must be set and be at least ${MINIMUM_SECRET_LENGTH} bytes. `
		+ `Current length: ${jwtSecret ? Buffer.byteLength(jwtSecret, 'utf8') : 0} bytes.`,
	);
}

/**
 * Signs an HS256 JWT access token for the given session ID.
 *
 * @param {string} sessionId - The desktop session ID to encode as the `sub` claim.
 * @returns {string} The signed JWT string.
 */
function signAccessToken(sessionId) {
	const now = Math.floor(Date.now() / 1000);
	const payload = {
		sub: sessionId,
		iss: ISSUER,
		aud: AUDIENCE,
		iat: now,
		exp: now + TOKEN_LIFETIME_SECONDS,
	};

	return jsonwebtoken.sign(payload, jwtSecret, { algorithm: 'HS256' });
}

/**
 * Verifies an HS256 JWT access token.
 *
 * Validates the signature, algorithm (HS256 only), expiration, and issuer.
 *
 * @param {string} jwtString - The JWT string to verify.
 * @returns {{ sub: string, iss: string, exp: number, iat: number }} The decoded payload.
 * @throws {Error} If the token is invalid, expired, uses wrong algorithm, or has wrong issuer.
 */
function verifyAccessToken(jwtString) {
	return jsonwebtoken.verify(jwtString, jwtSecret, {
		algorithms: ['HS256'],
		issuer: ISSUER,
		audience: AUDIENCE,
	});
}

module.exports = {
	signAccessToken,
	verifyAccessToken,
	ISSUER,
	AUDIENCE,
	TOKEN_LIFETIME_SECONDS,
};
