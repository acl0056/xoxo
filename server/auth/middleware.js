const { verifyAccessToken } = require('./token');
const sessionStore = require('../session/store');
const logger = require('../logger');

const WWW_AUTHENTICATE_HEADER = 'Bearer realm="https://xoxo.practicube.com", resource_metadata="https://xoxo.practicube.com/.well-known/oauth-protected-resource"';

const WRITE_TOOLS = new Set([
	'optimize_component',
	'set_circuit_layout',
	'add_component',
	'remove_component',
	'add_wire',
	'remove_wire',
	'move_component',
	'select_graph_angle',
	'undo',
	'begin_edit_group',
	'end_edit_group',
]);

/**
 * Extract the Bearer token from the Authorization header.
 *
 * @param {string|undefined} authorizationHeader - The raw Authorization header value
 * @returns {string|null} The token string, or null if missing/malformed
 */
function extractBearerToken(authorizationHeader) {
	if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
		return null;
	}
	return authorizationHeader.slice(7);
}

/**
 * Determine whether the incoming request is invoking a write tool.
 * Inspects the JSON-RPC body for a tools/call method with a write tool name.
 *
 * @param {object} body - The parsed request body
 * @returns {boolean} True if the request is a write tool invocation
 */
function isWriteToolRequest(body) {
	if (!body || body.method !== 'tools/call') {
		return false;
	}
	const toolName = body.params && body.params.name;
	return WRITE_TOOLS.has(toolName);
}

/**
 * Express middleware that validates self-issued HS256 JWT access tokens.
 *
 * On valid token: attaches decoded payload to request.user and calls next().
 * On invalid token: returns 401 with WWW-Authenticate header and error code.
 * On missing session or disconnected desktop: returns 502 with error code.
 */
function tokenValidationMiddleware(request, response, next) {
	const token = extractBearerToken(request.headers.authorization);

	if (!token) {
		response.set('WWW-Authenticate', WWW_AUTHENTICATE_HEADER);
		return response.status(401).json({ error: 'malformed' });
	}

	let decoded;
	try {
		decoded = verifyAccessToken(token);
	} catch (verificationError) {
		response.set('WWW-Authenticate', WWW_AUTHENTICATE_HEADER);

		if (verificationError.name === 'TokenExpiredError') {
			return response.status(401).json({ error: 'expired' });
		}

		if (
			verificationError.message.includes('issuer')
			|| verificationError.message.includes('audience')
			|| verificationError.message.includes('jwt issuer invalid')
			|| verificationError.message.includes('jwt audience invalid')
		) {
			return response.status(401).json({ error: 'unrecognized' });
		}

		return response.status(401).json({ error: 'malformed' });
	}

	const sessionId = decoded.sub;
	const session = sessionStore.get(sessionId);

	if (!session) {
		return response.status(502).json({ error: 'session_not_found' });
	}

	if (isWriteToolRequest(request.body) && !session.wsConnection) {
		return response.status(502).json({ error: 'desktop_disconnected' });
	}

	request.user = decoded;
	request.auth = decoded;
	logger.log('[Auth] Token validated, request.auth.sub =', decoded.sub);
	return next();
}

module.exports = tokenValidationMiddleware;
