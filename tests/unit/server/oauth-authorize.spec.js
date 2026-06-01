jest.mock('../../../server/pairing/store', () => ({
	consume: jest.fn(),
	get: jest.fn(),
	isExpired: jest.fn(),
	create: jest.fn(),
	cleanup: jest.fn(),
}));

const express = require('express');
const http = require('http');
const pairingStore = require('../../../server/pairing/store');
const authorizeRouter = require('../../../server/oauth/authorize');
const { authorizationCodes } = require('../../../server/oauth/authorize');

function createApp() {
	const app = express();
	app.use(authorizeRouter);
	return app;
}

function makeRequest(app, method, path, body) {
	return new Promise((resolve, reject) => {
		const server = app.listen(0, () => {
			const { port } = server.address();
			const options = {
				hostname: '127.0.0.1',
				port,
				path,
				method,
				headers: {},
			};

			let requestBody;
			if (body && method === 'POST') {
				requestBody = new URLSearchParams(body).toString();
				options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
				options.headers['Content-Length'] = Buffer.byteLength(requestBody);
			}

			const req = http.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => { data += chunk; });
				res.on('end', () => {
					server.close();
					resolve({
						status: res.statusCode,
						headers: res.headers,
						text: data,
					});
				});
			});

			req.on('error', (error) => {
				server.close();
				reject(error);
			});

			if (requestBody) {
				req.write(requestBody);
			}
			req.end();
		});
	});
}

const validQueryParams = {
	response_type: 'code',
	client_id: 'test-client',
	redirect_uri: 'https://example.com/callback',
	code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
	code_challenge_method: 'S256',
};

function buildQueryString(params) {
	return '?' + new URLSearchParams(params).toString();
}

describe('server/oauth/authorize', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		authorizationCodes.clear();
	});

	describe('GET /oauth/authorize', () => {
		it('should return 400 when response_type is missing', async () => {
			const app = createApp();
			const params = { ...validQueryParams };
			delete params.response_type;

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(params)}`);

			expect(response.status).toBe(400);
			expect(response.text).toContain('response_type');
		});

		it('should return 400 when client_id is missing', async () => {
			const app = createApp();
			const params = { ...validQueryParams };
			delete params.client_id;

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(params)}`);

			expect(response.status).toBe(400);
			expect(response.text).toContain('client_id');
		});

		it('should return 400 when redirect_uri is missing', async () => {
			const app = createApp();
			const params = { ...validQueryParams };
			delete params.redirect_uri;

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(params)}`);

			expect(response.status).toBe(400);
			expect(response.text).toContain('redirect_uri');
		});

		it('should return 400 when code_challenge is missing', async () => {
			const app = createApp();
			const params = { ...validQueryParams };
			delete params.code_challenge;

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(params)}`);

			expect(response.status).toBe(400);
			expect(response.text).toContain('code_challenge');
		});

		it('should return 400 when code_challenge_method is missing', async () => {
			const app = createApp();
			const params = { ...validQueryParams };
			delete params.code_challenge_method;

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(params)}`);

			expect(response.status).toBe(400);
			expect(response.text).toContain('code_challenge_method');
		});

		it('should return 400 when all params are missing', async () => {
			const app = createApp();

			const response = await makeRequest(app, 'GET', '/oauth/authorize');

			expect(response.status).toBe(400);
			expect(response.text).toContain('Missing required parameters');
		});

		it('should serve the HTML page when all params are valid', async () => {
			const app = createApp();

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(validQueryParams)}`);

			expect(response.status).toBe(200);
			expect(response.text).toContain('Pairing Code');
		});

		it('should accept any client_id value', async () => {
			const app = createApp();
			const params = { ...validQueryParams, client_id: 'any-arbitrary-client-id-12345' };

			const response = await makeRequest(app, 'GET', `/oauth/authorize${buildQueryString(params)}`);

			expect(response.status).toBe(200);
		});
	});

	describe('POST /oauth/authorize', () => {
		const validPostBody = {
			...validQueryParams,
			pairing_code: 'XOXO-A2B3',
			state: 'random-state-value',
		};

		it('should return 400 when required OAuth params are missing from POST', async () => {
			const app = createApp();

			const response = await makeRequest(app, 'POST', '/oauth/authorize', { pairing_code: 'XOXO-A2B3' });

			expect(response.status).toBe(400);
			expect(response.text).toContain('Missing required OAuth parameters');
		});

		it('should re-render form with error when pairing code is empty', async () => {
			const app = createApp();
			const body = { ...validPostBody };
			delete body.pairing_code;

			const response = await makeRequest(app, 'POST', '/oauth/authorize', body);

			expect(response.status).toBe(200);
			expect(response.text).toContain('Please enter a pairing code');
			expect(response.text).toContain('form');
		});

		it('should re-render form with error when pairing code is invalid', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue(null);

			const response = await makeRequest(app, 'POST', '/oauth/authorize', validPostBody);

			expect(response.status).toBe(200);
			expect(response.text).toContain('Invalid or expired pairing code');
			expect(response.text).toContain('form');
		});

		it('should preserve OAuth params in hidden fields when re-rendering form', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue(null);

			const response = await makeRequest(app, 'POST', '/oauth/authorize', validPostBody);

			expect(response.text).toContain(`value="${validPostBody.response_type}"`);
			expect(response.text).toContain(`value="${validPostBody.client_id}"`);
			expect(response.text).toContain(`value="${validPostBody.code_challenge}"`);
			expect(response.text).toContain(`value="${validPostBody.code_challenge_method}"`);
			expect(response.text).toContain(`value="${validPostBody.state}"`);
		});

		it('should redirect to redirect_uri with code and state on valid pairing code', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue({ sessionId: 'test-session-123' });

			const response = await makeRequest(app, 'POST', '/oauth/authorize', validPostBody);

			expect(response.status).toBe(302);
			const location = new URL(response.headers.location);
			expect(location.origin + location.pathname).toBe('https://example.com/callback');
			expect(location.searchParams.get('code')).toBeTruthy();
			expect(location.searchParams.get('state')).toBe('random-state-value');
		});

		it('should store the authorization code with correct metadata', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue({ sessionId: 'test-session-456' });

			const response = await makeRequest(app, 'POST', '/oauth/authorize', validPostBody);

			const location = new URL(response.headers.location);
			const code = location.searchParams.get('code');

			const entry = authorizationCodes.get(code);
			expect(entry).toBeDefined();
			expect(entry.sessionId).toBe('test-session-456');
			expect(entry.codeChallenge).toBe(validPostBody.code_challenge);
			expect(entry.codeChallengeMethod).toBe(validPostBody.code_challenge_method);
			expect(entry.redirectUri).toBe(validPostBody.redirect_uri);
			expect(entry.clientId).toBe(validPostBody.client_id);
			expect(entry.createdAt).toBeDefined();
			expect(entry.expiresAt).toBe(entry.createdAt + 60000);
		});

		it('should generate a 32-byte base64url authorization code', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue({ sessionId: 'test-session-789' });

			const response = await makeRequest(app, 'POST', '/oauth/authorize', validPostBody);

			const location = new URL(response.headers.location);
			const code = location.searchParams.get('code');

			// base64url decode should yield 32 bytes
			const decoded = Buffer.from(code, 'base64url');
			expect(decoded.length).toBe(32);
		});

		it('should redirect without state param when state is not provided', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue({ sessionId: 'test-session-abc' });
			const body = { ...validPostBody };
			delete body.state;

			const response = await makeRequest(app, 'POST', '/oauth/authorize', body);

			expect(response.status).toBe(302);
			const location = new URL(response.headers.location);
			expect(location.searchParams.has('state')).toBe(false);
		});

		it('should accept any client_id value', async () => {
			const app = createApp();
			pairingStore.consume.mockReturnValue({ sessionId: 'test-session-def' });
			const body = { ...validPostBody, client_id: 'completely-arbitrary-client-id' };

			const response = await makeRequest(app, 'POST', '/oauth/authorize', body);

			expect(response.status).toBe(302);
			const entry = [...authorizationCodes.values()].pop();
			expect(entry.clientId).toBe('completely-arbitrary-client-id');
		});
	});

	describe('authorizationCodes export', () => {
		it('should export authorizationCodes as a Map', () => {
			expect(authorizationCodes).toBeInstanceOf(Map);
		});
	});
});
