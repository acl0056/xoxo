const { shell } = require('electron');
const crypto = require('crypto');
const http = require('http');

/**
 * Generates a cryptographically random code verifier for PKCE.
 * The verifier is a URL-safe base64 string of 32 random bytes.
 *
 * @returns {string} A 43-character code verifier
 */
function generateCodeVerifier() {
	return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derives the S256 code challenge from a code verifier.
 *
 * @param {string} codeVerifier - The PKCE code verifier
 * @returns {string} The base64url-encoded SHA-256 hash of the verifier
 */
function generateCodeChallenge(codeVerifier) {
	return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Generates a random state parameter for CSRF protection.
 *
 * @returns {string} A 16-byte hex string
 */
function generateState() {
	return crypto.randomBytes(16).toString('hex');
}

/**
 * Builds the OAuth 2.1 authorization URL with PKCE parameters.
 *
 * @param {object} oauthConfig - OAuth configuration object
 * @param {string} oauthConfig.issuer - The OAuth issuer base URL
 * @param {string} oauthConfig.audience - The OAuth audience (used as resource per RFC 8707)
 * @param {string} clientId - The OAuth client ID
 * @param {string} redirectUri - The local redirect URI for the callback
 * @param {string} state - The random state parameter
 * @param {string} codeChallenge - The PKCE code challenge
 * @returns {string} The full authorization URL
 */
function buildAuthorizationUrl(oauthConfig, clientId, redirectUri, state, codeChallenge) {
	const authorizationEndpoint = `${oauthConfig.issuer}/oauth/authorize`;

	const queryParameters = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		state,
		code_challenge: codeChallenge,
		code_challenge_method: 'S256',
		resource: oauthConfig.audience,
	});

	return `${authorizationEndpoint}?${queryParameters.toString()}`;
}

/**
 * Exchanges an authorization code for tokens using the OAuth token endpoint.
 *
 * @param {object} oauthConfig - OAuth configuration object
 * @param {string} oauthConfig.issuer - The OAuth issuer base URL
 * @param {string} oauthConfig.audience - The OAuth audience (used as resource per RFC 8707)
 * @param {string} clientId - The OAuth client ID
 * @param {string} authorizationCode - The authorization code from the callback
 * @param {string} redirectUri - The redirect URI used in the authorization request
 * @param {string} codeVerifier - The PKCE code verifier
 * @returns {Promise<{accessToken: string}>} The access token
 * @throws {Error} If the token exchange fails
 */
async function exchangeCodeForTokens(oauthConfig, clientId, authorizationCode, redirectUri, codeVerifier) {
	const tokenEndpoint = `${oauthConfig.issuer}/oauth/token`;

	const requestBody = new URLSearchParams({
		grant_type: 'authorization_code',
		client_id: clientId,
		code: authorizationCode,
		redirect_uri: redirectUri,
		code_verifier: codeVerifier,
		resource: oauthConfig.audience,
	});

	const response = await fetch(tokenEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: requestBody.toString(),
	});

	const responseBody = await response.json();

	if (!response.ok) {
		const errorDescription = responseBody.error_description || responseBody.error || 'Token exchange failed';
		throw new Error(`OAuth token exchange failed: ${errorDescription}`);
	}

	return {
		accessToken: responseBody.access_token,
	};
}

/**
 * Starts a local HTTP server on a random port to receive the OAuth callback.
 * Returns the server, port, and a promise that resolves with the authorization code.
 *
 * @param {string} expectedState - The state parameter to validate against
 * @returns {Promise<{server: http.Server, port: number, codePromise: Promise<{code: string}>}>}
 */
function startCallbackServer(expectedState) {
	return new Promise((resolve, reject) => {
		let resolveCode;
		let rejectCode;
		const codePromise = new Promise((codeResolve, codeReject) => {
			resolveCode = codeResolve;
			rejectCode = codeReject;
		});

		const server = http.createServer((request, response) => {
			const requestUrl = new URL(request.url, 'http://localhost');

			if (requestUrl.pathname !== '/callback') {
				response.writeHead(404);
				response.end('Not found');
				return;
			}

			const error = requestUrl.searchParams.get('error');
			if (error) {
				const errorDescription = requestUrl.searchParams.get('error_description') || error;
				response.writeHead(200, { 'Content-Type': 'text/html' });
				response.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
				server.close();
				rejectCode(new Error(`OAuth authorization failed: ${errorDescription}`));
				return;
			}

			const state = requestUrl.searchParams.get('state');
			if (state !== expectedState) {
				response.writeHead(200, { 'Content-Type': 'text/html' });
				response.end('<html><body><h1>Authentication Failed</h1><p>Invalid state parameter. You can close this window.</p></body></html>');
				server.close();
				rejectCode(new Error('OAuth authorization failed: state parameter mismatch'));
				return;
			}

			const code = requestUrl.searchParams.get('code');
			if (!code) {
				response.writeHead(200, { 'Content-Type': 'text/html' });
				response.end('<html><body><h1>Authentication Failed</h1><p>No authorization code received. You can close this window.</p></body></html>');
				server.close();
				rejectCode(new Error('OAuth authorization failed: no authorization code received'));
				return;
			}

			response.writeHead(200, { 'Content-Type': 'text/html' });
			response.end('<html><body><h1>Authentication Successful</h1><p>You can close this window and return to xoxo.</p></body></html>');
			server.close();
			resolveCode({ code });
		});

		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address();
			resolve({ server, port, codePromise });
		});

		server.on('error', (serverError) => {
			reject(new Error(`Failed to start OAuth callback server: ${serverError.message}`));
		});
	});
}

/**
 * Initiates the full OAuth 2.1 authorization flow with PKCE.
 *
 * 1. Generates PKCE code_verifier and code_challenge (S256)
 * 2. Generates a random state parameter
 * 3. Starts a local HTTP server on a random port to receive the callback
 * 4. Builds the authorization URL using the OAuth config
 * 5. Opens the URL in the default browser via shell.openExternal
 * 6. Waits for the callback with the authorization code
 * 7. Exchanges the code for tokens
 *
 * @param {object} oauthConfig - OAuth configuration object
 * @param {string} oauthConfig.issuer - The OAuth issuer base URL
 * @param {string} oauthConfig.audience - The OAuth audience (used as resource per RFC 8707)
 * @param {string} clientId - The OAuth client ID (server accepts any value)
 * @returns {Promise<{accessToken: string}>}
 *   Resolves with the access token
 * @throws {Error} If any step of the OAuth flow fails
 */
async function initiateOAuthFlow(oauthConfig, clientId) {
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);
	const state = generateState();

	const { server, port, codePromise } = await startCallbackServer(state);

	const redirectUri = `http://127.0.0.1:${port}/callback`;
	const authorizationUrl = buildAuthorizationUrl(oauthConfig, clientId, redirectUri, state, codeChallenge);

	try {
		await shell.openExternal(authorizationUrl);
	} catch (openError) {
		server.close();
		throw new Error(`Failed to open browser for authentication: ${openError.message}`);
	}

	let code;
	try {
		const result = await codePromise;
		code = result.code;
	} catch (callbackError) {
		server.close();
		throw callbackError;
	}

	const tokens = await exchangeCodeForTokens(oauthConfig, clientId, code, redirectUri, codeVerifier);
	return tokens;
}

module.exports = {
	initiateOAuthFlow,
	generateCodeVerifier,
	generateCodeChallenge,
	generateState,
	buildAuthorizationUrl,
	exchangeCodeForTokens,
	startCallbackServer,
};
