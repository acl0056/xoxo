const jsonwebtoken = require('jsonwebtoken');

const TEST_SECRET = 'a-test-secret-that-is-at-least-32-bytes-long';

// Mock the token module to use our test secret
jest.mock('../../../server/auth/token', () => {
	const jwt = require('jsonwebtoken');
	const secret = 'a-test-secret-that-is-at-least-32-bytes-long';
	const ISSUER = 'https://aix.reflect.systems';
	const AUDIENCE = 'https://aix.reflect.systems/mcp';

	return {
		verifyAccessToken(jwtString) {
			return jwt.verify(jwtString, secret, {
				algorithms: ['HS256'],
				issuer: ISSUER,
				audience: AUDIENCE,
			});
		},
		signAccessToken(sessionId) {
			const now = Math.floor(Date.now() / 1000);
			return jwt.sign(
				{ sub: sessionId, iss: ISSUER, aud: AUDIENCE, iat: now, exp: now + 3600 },
				secret,
				{ algorithm: 'HS256' },
			);
		},
		ISSUER,
		AUDIENCE,
	};
});

// Mock the session store
const mockSessions = new Map();
jest.mock('../../../server/session/store', () => ({
	get: (userId) => mockSessions.get(userId),
}));

const tokenValidationMiddleware = require('../../../server/auth/middleware');

function createMockRequest(authorizationHeader, body = {}) {
	return {
		headers: {
			authorization: authorizationHeader,
		},
		body,
	};
}

function createMockResponse() {
	const response = {
		statusCode: null,
		body: null,
		headers: {},
		status(code) {
			response.statusCode = code;
			return response;
		},
		json(data) {
			response.body = data;
			return response;
		},
		set(name, value) {
			response.headers[name] = value;
			return response;
		},
	};
	return response;
}

function signTestToken(payload = {}, options = {}) {
	const defaultPayload = {
		sub: 'test-session-id',
		iss: 'https://aix.reflect.systems',
		aud: 'https://aix.reflect.systems/mcp',
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		...payload,
	};
	return jsonwebtoken.sign(defaultPayload, options.secret || TEST_SECRET, {
		algorithm: options.algorithm || 'HS256',
	});
}

describe('server/auth/middleware', () => {
	beforeEach(() => {
		mockSessions.clear();
		mockSessions.set('test-session-id', {
			userId: 'test-session-id',
			wsConnection: { connected: true },
			circuitLayout: null,
		});
	});

	describe('missing or malformed Authorization header', () => {
		it('should return 401 malformed when no Authorization header is present', () => {
			const request = createMockRequest(undefined);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(401);
			expect(response.body.error).toBe('malformed');
			expect(response.headers['WWW-Authenticate']).toContain('Bearer realm=');
		});

		it('should return 401 malformed when Authorization header does not start with Bearer', () => {
			const request = createMockRequest('Basic abc123');
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(401);
			expect(response.body.error).toBe('malformed');
		});

		it('should return 401 malformed when token is not a valid JWT', () => {
			const request = createMockRequest('Bearer not-a-jwt');
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(401);
			expect(response.body.error).toBe('malformed');
		});
	});

	describe('valid token', () => {
		it('should call next() and attach decoded payload to request.user', () => {
			const token = signTestToken({ sub: 'test-session-id' });
			const request = createMockRequest(`Bearer ${token}`);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).toHaveBeenCalled();
			expect(request.user).toBeDefined();
			expect(request.user.sub).toBe('test-session-id');
			expect(request.user.iss).toBe('https://aix.reflect.systems');
			expect(request.user.aud).toBe('https://aix.reflect.systems/mcp');
		});
	});

	describe('expired token', () => {
		it('should return 401 expired when token is past expiry', () => {
			const token = signTestToken({
				iat: Math.floor(Date.now() / 1000) - 7200,
				exp: Math.floor(Date.now() / 1000) - 3600,
			});
			const request = createMockRequest(`Bearer ${token}`);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(401);
			expect(response.body.error).toBe('expired');
			expect(response.headers['WWW-Authenticate']).toContain('Bearer realm=');
		});
	});

	describe('unrecognized token (wrong issuer)', () => {
		it('should return 401 unrecognized when issuer does not match', () => {
			const token = signTestToken({ iss: 'https://wrong-issuer.example.com' });
			const request = createMockRequest(`Bearer ${token}`);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(401);
			expect(response.body.error).toBe('unrecognized');
			expect(response.headers['WWW-Authenticate']).toContain('resource_metadata=');
		});
	});

	describe('signature verification failure', () => {
		it('should return 401 malformed when token is signed with a different secret', () => {
			const token = signTestToken({}, { secret: 'a-completely-different-secret-key-here' });
			const request = createMockRequest(`Bearer ${token}`);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(401);
			expect(response.body.error).toBe('malformed');
		});
	});

	describe('session checks', () => {
		it('should return 502 session_not_found when session does not exist', () => {
			const token = signTestToken({ sub: 'nonexistent-session' });
			const request = createMockRequest(`Bearer ${token}`);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(502);
			expect(response.body.error).toBe('session_not_found');
		});

		it('should return 502 desktop_disconnected for write tool when WebSocket is not connected', () => {
			mockSessions.set('disconnected-session', {
				userId: 'disconnected-session',
				wsConnection: null,
				circuitLayout: null,
			});

			const token = signTestToken({ sub: 'disconnected-session' });
			const body = { method: 'tools/call', params: { name: 'optimize_component' } };
			const request = createMockRequest(`Bearer ${token}`, body);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(502);
			expect(response.body.error).toBe('desktop_disconnected');
		});

		it('should allow read tools even when WebSocket is not connected', () => {
			mockSessions.set('disconnected-session', {
				userId: 'disconnected-session',
				wsConnection: null,
				circuitLayout: null,
			});

			const token = signTestToken({ sub: 'disconnected-session' });
			const body = { method: 'tools/call', params: { name: 'get_circuit_layout' } };
			const request = createMockRequest(`Bearer ${token}`, body);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).toHaveBeenCalled();
		});

		it('should allow non-tool requests even when WebSocket is not connected', () => {
			mockSessions.set('disconnected-session', {
				userId: 'disconnected-session',
				wsConnection: null,
				circuitLayout: null,
			});

			const token = signTestToken({ sub: 'disconnected-session' });
			const body = { method: 'initialize', params: {} };
			const request = createMockRequest(`Bearer ${token}`, body);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(next).toHaveBeenCalled();
		});
	});

	describe('WWW-Authenticate header', () => {
		it('should include Bearer realm and resource_metadata URL in 401 responses', () => {
			const request = createMockRequest(undefined);
			const response = createMockResponse();
			const next = jest.fn();

			tokenValidationMiddleware(request, response, next);

			expect(response.headers['WWW-Authenticate']).toBe(
				'Bearer realm="https://aix.reflect.systems", resource_metadata="https://aix.reflect.systems/.well-known/oauth-protected-resource"',
			);
		});
	});
});
