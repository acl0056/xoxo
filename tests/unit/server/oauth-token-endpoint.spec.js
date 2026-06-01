const crypto = require('crypto');

const TEST_SECRET = 'test-secret-that-is-at-least-32-bytes-long';
process.env.JWT_SECRET = TEST_SECRET;

const { authorizationCodes } = require('../../../server/oauth/authorize');
const tokenEndpointRouter = require('../../../server/oauth/token-endpoint');
const { verifyAccessToken, TOKEN_LIFETIME_SECONDS } = require('../../../server/auth/token');
const sessionStore = require('../../../server/session/store');

// Extract the route handler from the router stack
function getRouteHandler(router, method, path) {
	const layer = router.stack.find(
		(routeLayer) => routeLayer.route
			&& routeLayer.route.path === path
			&& routeLayer.route.methods[method],
	);
	if (!layer) {
		throw new Error(`No ${method.toUpperCase()} ${path} handler found`);
	}
	return layer.route.stack[0].handle;
}

function createMockRequest(body = {}) {
	return { body };
}

function createMockResponse() {
	const response = {
		statusCode: null,
		body: null,
		status(code) {
			response.statusCode = code;
			return response;
		},
		json(data) {
			response.body = data;
			return response;
		},
	};
	return response;
}

/**
 * Creates a valid authorization code entry in the store.
 */
function createAuthCodeEntry(overrides = {}) {
	const codeVerifier = crypto.randomBytes(32).toString('base64url');
	const codeChallenge = crypto
		.createHash('sha256')
		.update(codeVerifier)
		.digest('base64url');

	const code = crypto.randomBytes(32).toString('base64url');
	const now = Date.now();

	const entry = {
		code,
		sessionId: 'test-session-id',
		codeChallenge,
		codeChallengeMethod: 'S256',
		redirectUri: 'https://chatgpt.com/callback',
		clientId: 'test-client',
		createdAt: now,
		expiresAt: now + 60000,
		...overrides,
	};

	authorizationCodes.set(code, entry);

	return { code, codeVerifier, entry };
}

describe('POST /oauth/token', () => {
	const handler = getRouteHandler(tokenEndpointRouter, 'post', '/oauth/token');

	beforeEach(() => {
		authorizationCodes.clear();
		sessionStore.getAll().clear();
	});

	describe('successful token exchange', () => {
		it('should return 200 with access token for valid request', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(200);
			expect(response.body.access_token).toBeDefined();
			expect(response.body.token_type).toBe('bearer');
			expect(response.body.expires_in).toBe(TOKEN_LIFETIME_SECONDS);
		});

		it('should notify the desktop app with the remote token lifetime', () => {
			const wsConnection = { emit: jest.fn() };
			sessionStore.create('test-session-id', { wsConnection });
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(wsConnection.emit).toHaveBeenCalledWith('message', {
				type: 'pairing:success',
				payload: {
					sessionId: 'test-session-id',
					expiresIn: TOKEN_LIFETIME_SECONDS,
				},
			});
		});

		it('should issue a JWT with the correct session ID as sub', () => {
			const { code, codeVerifier } = createAuthCodeEntry({
				sessionId: 'my-desktop-session',
			});
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			const decoded = verifyAccessToken(response.body.access_token);
			expect(decoded.sub).toBe('my-desktop-session');
		});

		it('should consume the authorization code (single-use)', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(authorizationCodes.has(code)).toBe(false);
		});

		it('should accept optional resource parameter', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
				resource: 'https://xoxo.practicube.com/mcp',
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(200);
			expect(response.body.access_token).toBeDefined();
		});
	});

	describe('invalid_request errors', () => {
		it('should return 400 invalid_request when grant_type is missing', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_request');
		});

		it('should return 400 invalid_request when code is missing', () => {
			const request = createMockRequest({
				grant_type: 'authorization_code',
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: 'some-verifier',
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_request');
		});

		it('should return 400 invalid_request when redirect_uri is missing', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_request');
		});

		it('should return 400 invalid_request when client_id is missing', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_request');
		});

		it('should return 400 invalid_request when code_verifier is missing', () => {
			const { code } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_request');
		});

		it('should return 400 invalid_request for unsupported grant_type', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'client_credentials',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_request');
		});
	});

	describe('invalid_grant errors', () => {
		it('should return 400 invalid_grant for non-existent authorization code', () => {
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code: 'non-existent-code',
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: 'some-verifier',
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_grant');
		});

		it('should return 400 invalid_grant for expired authorization code', () => {
			const { code, codeVerifier } = createAuthCodeEntry({
				expiresAt: Date.now() - 1000,
			});
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_grant');
		});

		it('should return 400 invalid_grant for PKCE mismatch', () => {
			const { code } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: 'wrong-verifier-that-does-not-match',
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_grant');
		});

		it('should return 400 invalid_grant for redirect_uri mismatch', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://evil.example.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_grant');
		});

		it('should return 400 invalid_grant for client_id mismatch', () => {
			const { code, codeVerifier } = createAuthCodeEntry();
			const request = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'wrong-client-id',
				code_verifier: codeVerifier,
			});
			const response = createMockResponse();

			handler(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.body.error).toBe('invalid_grant');
		});

		it('should return 400 invalid_grant for already-used authorization code', () => {
			const { code, codeVerifier } = createAuthCodeEntry();

			// First exchange succeeds
			const request1 = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response1 = createMockResponse();
			handler(request1, response1);
			expect(response1.statusCode).toBe(200);

			// Second exchange fails
			const request2 = createMockRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://chatgpt.com/callback',
				client_id: 'test-client',
				code_verifier: codeVerifier,
			});
			const response2 = createMockResponse();
			handler(request2, response2);

			expect(response2.statusCode).toBe(400);
			expect(response2.body.error).toBe('invalid_grant');
		});
	});
});
