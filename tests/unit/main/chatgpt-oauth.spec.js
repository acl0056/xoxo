const http = require('http');
const crypto = require('crypto');

jest.mock('electron', () => ({
	shell: {
		openExternal: jest.fn().mockResolvedValue(undefined),
	},
}));

const { shell } = require('electron');
const {
	generateCodeVerifier,
	generateCodeChallenge,
	generateState,
	buildAuthorizationUrl,
	exchangeCodeForTokens,
	startCallbackServer,
	initiateOAuthFlow,
} = require('../../../src/main/chatgpt-oauth');

describe('chatgpt-oauth', () => {
	const oauthConfig = {
		issuer: 'https://auth.example.com',
		audience: 'https://api.example.com',
	};

	const clientId = 'test-client-id';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('generateCodeVerifier', () => {
		it('should return a base64url-encoded string', () => {
			const verifier = generateCodeVerifier();
			expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it('should return a 43-character string (32 bytes base64url)', () => {
			const verifier = generateCodeVerifier();
			expect(verifier.length).toBe(43);
		});

		it('should generate unique values on each call', () => {
			const verifier1 = generateCodeVerifier();
			const verifier2 = generateCodeVerifier();
			expect(verifier1).not.toBe(verifier2);
		});
	});

	describe('generateCodeChallenge', () => {
		it('should return a base64url-encoded SHA-256 hash', () => {
			const verifier = 'test-verifier-value';
			const challenge = generateCodeChallenge(verifier);
			expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it('should produce a deterministic result for the same input', () => {
			const verifier = 'deterministic-test';
			const challenge1 = generateCodeChallenge(verifier);
			const challenge2 = generateCodeChallenge(verifier);
			expect(challenge1).toBe(challenge2);
		});

		it('should match the expected SHA-256 hash', () => {
			const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
			const expected = crypto.createHash('sha256').update(verifier).digest('base64url');
			const challenge = generateCodeChallenge(verifier);
			expect(challenge).toBe(expected);
		});
	});

	describe('generateState', () => {
		it('should return a 32-character hex string', () => {
			const state = generateState();
			expect(state).toMatch(/^[0-9a-f]{32}$/);
		});

		it('should generate unique values on each call', () => {
			const state1 = generateState();
			const state2 = generateState();
			expect(state1).not.toBe(state2);
		});
	});

	describe('buildAuthorizationUrl', () => {
		it('should build a URL with the correct authorization endpoint', () => {
			const url = buildAuthorizationUrl(oauthConfig, clientId, 'http://127.0.0.1:3000/callback', 'test-state', 'test-challenge');
			expect(url).toMatch(/^https:\/\/auth\.example\.com\/oauth\/authorize\?/);
		});

		it('should include all required query parameters', () => {
			const url = buildAuthorizationUrl(oauthConfig, clientId, 'http://127.0.0.1:3000/callback', 'test-state', 'test-challenge');
			const parsedUrl = new URL(url);
			const params = parsedUrl.searchParams;

			expect(params.get('response_type')).toBe('code');
			expect(params.get('client_id')).toBe('test-client-id');
			expect(params.get('redirect_uri')).toBe('http://127.0.0.1:3000/callback');
			expect(params.get('state')).toBe('test-state');
			expect(params.get('code_challenge')).toBe('test-challenge');
			expect(params.get('code_challenge_method')).toBe('S256');
			expect(params.get('resource')).toBe('https://api.example.com');
			expect(params.has('scope')).toBe(false);
			expect(params.has('audience')).toBe(false);
		});
	});

	describe('exchangeCodeForTokens', () => {
		beforeEach(() => {
			global.fetch = jest.fn();
		});

		afterEach(() => {
			delete global.fetch;
		});

		it('should exchange an authorization code for tokens', async () => {
			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					access_token: 'test-access-token',
				}),
			});

			const tokens = await exchangeCodeForTokens(
				oauthConfig,
				clientId,
				'auth-code-123',
				'http://127.0.0.1:3000/callback',
				'code-verifier-xyz',
			);

			expect(tokens).toEqual({
				accessToken: 'test-access-token',
			});
		});

		it('should send the correct request body', async () => {
			global.fetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					access_token: 'token',
				}),
			});

			await exchangeCodeForTokens(
				oauthConfig,
				clientId,
				'auth-code-123',
				'http://127.0.0.1:3000/callback',
				'code-verifier-xyz',
			);

			expect(global.fetch).toHaveBeenCalledWith(
				'https://auth.example.com/oauth/token',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				}),
			);

			const callBody = global.fetch.mock.calls[0][1].body;
			const params = new URLSearchParams(callBody);
			expect(params.get('grant_type')).toBe('authorization_code');
			expect(params.get('client_id')).toBe('test-client-id');
			expect(params.get('code')).toBe('auth-code-123');
			expect(params.get('redirect_uri')).toBe('http://127.0.0.1:3000/callback');
			expect(params.get('code_verifier')).toBe('code-verifier-xyz');
			expect(params.get('resource')).toBe('https://api.example.com');
			expect(params.has('client_secret')).toBe(false);
		});

		it('should throw an error when the token exchange fails', async () => {
			global.fetch.mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({
					error: 'invalid_grant',
					error_description: 'Authorization code expired',
				}),
			});

			await expect(
				exchangeCodeForTokens(oauthConfig, clientId, 'expired-code', 'http://127.0.0.1:3000/callback', 'verifier'),
			).rejects.toThrow('OAuth token exchange failed: Authorization code expired');
		});

		it('should use error field when error_description is missing', async () => {
			global.fetch.mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({
					error: 'server_error',
				}),
			});

			await expect(
				exchangeCodeForTokens(oauthConfig, clientId, 'code', 'http://127.0.0.1:3000/callback', 'verifier'),
			).rejects.toThrow('OAuth token exchange failed: server_error');
		});
	});

	describe('startCallbackServer', () => {
		it('should start a server on a random port and return the port', async () => {
			const { server, port } = await startCallbackServer('expected-state');
			expect(port).toBeGreaterThan(0);
			server.close();
		});

		it('should resolve codePromise when a valid callback arrives', async () => {
			const { port, codePromise } = await startCallbackServer('valid-state');

			const response = await new Promise((resolve) => {
				http.get(
					`http://127.0.0.1:${port}/callback?code=test-code&state=valid-state`,
					(res) => {
						let data = '';
						res.on('data', (chunk) => { data += chunk; });
						res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
					},
				);
			});

			const result = await codePromise;
			expect(result.code).toBe('test-code');
			expect(response.statusCode).toBe(200);
			expect(response.body).toContain('Authentication Successful');
		});

		it('should reject codePromise when state does not match', async () => {
			const { port, codePromise } = await startCallbackServer('expected-state');

			// Attach a catch handler to prevent unhandled rejection
			const rejectionPromise = codePromise.catch((error) => error);

			await new Promise((resolve) => {
				http.get(
					`http://127.0.0.1:${port}/callback?code=test-code&state=wrong-state`,
					(res) => {
						res.on('data', () => {});
						res.on('end', resolve);
					},
				);
			});

			const error = await rejectionPromise;
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toContain('state parameter mismatch');
		});

		it('should reject codePromise when an error parameter is present', async () => {
			const { port, codePromise } = await startCallbackServer('state');

			const rejectionPromise = codePromise.catch((error) => error);

			await new Promise((resolve) => {
				http.get(
					`http://127.0.0.1:${port}/callback?error=access_denied&error_description=User+denied+access`,
					(res) => {
						res.on('data', () => {});
						res.on('end', resolve);
					},
				);
			});

			const error = await rejectionPromise;
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toContain('OAuth authorization failed: User denied access');
		});

		it('should reject codePromise when no code is present', async () => {
			const { port, codePromise } = await startCallbackServer('state');

			const rejectionPromise = codePromise.catch((error) => error);

			await new Promise((resolve) => {
				http.get(
					`http://127.0.0.1:${port}/callback?state=state`,
					(res) => {
						res.on('data', () => {});
						res.on('end', resolve);
					},
				);
			});

			const error = await rejectionPromise;
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toContain('no authorization code received');
		});

		it('should return 404 for non-callback paths', async () => {
			const { server, port } = await startCallbackServer('state');

			const response = await new Promise((resolve) => {
				http.get(
					`http://127.0.0.1:${port}/other-path`,
					(res) => {
						res.on('data', () => {});
						res.on('end', () => resolve({ statusCode: res.statusCode }));
					},
				);
			});

			expect(response.statusCode).toBe(404);
			server.close();
		});
	});

	describe('initiateOAuthFlow', () => {
		beforeEach(() => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					access_token: 'flow-access-token',
				}),
			});
		});

		afterEach(() => {
			delete global.fetch;
		});

		it('should open the authorization URL in the default browser', async () => {
			// Mock shell.openExternal to simulate the callback
			shell.openExternal.mockImplementation(async (url) => {
				const parsedUrl = new URL(url);
				const state = parsedUrl.searchParams.get('state');
				const redirectUri = parsedUrl.searchParams.get('redirect_uri');

				// Simulate the OAuth provider redirecting back
				await new Promise((resolve) => {
					http.get(`${redirectUri}?code=auth-code&state=${state}`, (res) => {
						res.on('data', () => {});
						res.on('end', resolve);
					});
				});
			});

			const tokens = await initiateOAuthFlow(oauthConfig, clientId);

			expect(shell.openExternal).toHaveBeenCalledTimes(1);
			expect(tokens).toEqual({
				accessToken: 'flow-access-token',
			});
		});

		it('should throw when shell.openExternal fails', async () => {
			shell.openExternal.mockRejectedValue(new Error('No browser available'));

			await expect(initiateOAuthFlow(oauthConfig, clientId)).rejects.toThrow(
				'Failed to open browser for authentication: No browser available',
			);
		});
	});
});
