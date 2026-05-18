const jsonwebtoken = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-that-is-at-least-32-bytes-long';

// Set JWT_SECRET before requiring the module
process.env.JWT_SECRET = TEST_SECRET;

const {
	signAccessToken,
	verifyAccessToken,
	ISSUER,
	AUDIENCE,
	TOKEN_LIFETIME_SECONDS,
} = require('../../../server/auth/token');

describe('server/auth/token', () => {
	describe('signAccessToken', () => {
		it('should return a valid JWT string with three parts', () => {
			const token = signAccessToken('session-123');
			const parts = token.split('.');
			expect(parts).toHaveLength(3);
		});

		it('should set the alg header to HS256', () => {
			const token = signAccessToken('session-123');
			const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
			expect(header.alg).toBe('HS256');
		});

		it('should set sub claim to the provided session ID', () => {
			const token = signAccessToken('my-session-id');
			const decoded = jsonwebtoken.decode(token);
			expect(decoded.sub).toBe('my-session-id');
		});

		it('should set iss claim to the correct issuer', () => {
			const token = signAccessToken('session-123');
			const decoded = jsonwebtoken.decode(token);
			expect(decoded.iss).toBe('https://aix.reflect.systems');
		});

		it('should set aud claim to the correct audience', () => {
			const token = signAccessToken('session-123');
			const decoded = jsonwebtoken.decode(token);
			expect(decoded.aud).toBe('https://aix.reflect.systems/mcp');
		});

		it('should set exp - iat to 3600 seconds', () => {
			const token = signAccessToken('session-123');
			const decoded = jsonwebtoken.decode(token);
			expect(decoded.exp - decoded.iat).toBe(3600);
		});

		it('should produce a token verifiable with the server secret', () => {
			const token = signAccessToken('session-123');
			const decoded = jsonwebtoken.verify(token, TEST_SECRET, { algorithms: ['HS256'] });
			expect(decoded.sub).toBe('session-123');
		});
	});

	describe('verifyAccessToken', () => {
		it('should return decoded payload for a valid token', () => {
			const token = signAccessToken('session-456');
			const payload = verifyAccessToken(token);
			expect(payload.sub).toBe('session-456');
			expect(payload.iss).toBe(ISSUER);
			expect(payload.aud).toBe(AUDIENCE);
			expect(payload.exp - payload.iat).toBe(TOKEN_LIFETIME_SECONDS);
		});

		it('should throw for a token signed with a different secret', () => {
			const token = jsonwebtoken.sign(
				{ sub: 'session-789', iss: ISSUER, aud: AUDIENCE },
				'a-completely-different-secret-key-here',
				{ algorithm: 'HS256' },
			);
			expect(() => verifyAccessToken(token)).toThrow();
		});

		it('should throw for a token using RS256 algorithm', () => {
			const { privateKey } = require('crypto').generateKeyPairSync('rsa', {
				modulusLength: 2048,
				publicKeyEncoding: { type: 'spki', format: 'pem' },
				privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			});
			const token = jsonwebtoken.sign(
				{ sub: 'session-789', iss: ISSUER, aud: AUDIENCE },
				privateKey,
				{ algorithm: 'RS256' },
			);
			expect(() => verifyAccessToken(token)).toThrow();
		});

		it('should throw for an expired token', () => {
			const token = jsonwebtoken.sign(
				{
					sub: 'session-expired',
					iss: ISSUER,
					aud: AUDIENCE,
					iat: Math.floor(Date.now() / 1000) - 7200,
					exp: Math.floor(Date.now() / 1000) - 3600,
				},
				TEST_SECRET,
				{ algorithm: 'HS256' },
			);
			expect(() => verifyAccessToken(token)).toThrow();
		});

		it('should throw for a token with wrong issuer', () => {
			const token = jsonwebtoken.sign(
				{ sub: 'session-wrong-iss', iss: 'https://evil.example.com', aud: AUDIENCE },
				TEST_SECRET,
				{ algorithm: 'HS256' },
			);
			expect(() => verifyAccessToken(token)).toThrow();
		});

		it('should throw for a token with wrong audience', () => {
			const token = jsonwebtoken.sign(
				{ sub: 'session-wrong-aud', iss: ISSUER, aud: 'https://wrong.example.com' },
				TEST_SECRET,
				{ algorithm: 'HS256' },
			);
			expect(() => verifyAccessToken(token)).toThrow();
		});

		it('should throw for a malformed token string', () => {
			expect(() => verifyAccessToken('not-a-jwt')).toThrow();
		});

		it('should throw for an empty string', () => {
			expect(() => verifyAccessToken('')).toThrow();
		});
	});

	describe('module constants', () => {
		it('should export the correct issuer', () => {
			expect(ISSUER).toBe('https://aix.reflect.systems');
		});

		it('should export the correct audience', () => {
			expect(AUDIENCE).toBe('https://aix.reflect.systems/mcp');
		});

		it('should export the correct token lifetime', () => {
			expect(TOKEN_LIFETIME_SECONDS).toBe(3600);
		});
	});
});
