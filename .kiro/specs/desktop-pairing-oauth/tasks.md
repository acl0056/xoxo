# Implementation Plan: Desktop Pairing OAuth

## Overview

Replace the external Auth0/JWKS-based OAuth flow with a self-contained OAuth 2.1 authorization server built into the xoxo MCP server. Authentication uses short-lived desktop pairing codes instead of user accounts. Implementation proceeds bottom-up: token signing utilities first, then pairing infrastructure, then OAuth endpoints, then middleware replacement, and finally desktop app integration.

## Tasks

- [x] 1. Implement JWT signing and verification utilities
  - [x] 1.1 Create `server/auth/token.js` with HS256 sign/verify functions
    - Implement `signAccessToken(sessionId)` that creates an HS256 JWT with `sub`, `iss`, `aud`, `iat`, `exp` claims
    - Implement `verifyAccessToken(jwtString)` that validates signature, algorithm, expiration, and issuer
    - Read `JWT_SECRET` from environment, validate it is at least 32 bytes on startup
    - Use `jsonwebtoken` package (already a dependency)
    - Issuer: `https://xoxo.practicube.com`, audience: `https://xoxo.practicube.com/mcp`, lifetime: 3600s
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.11, 9.1, 9.2, 9.3, 9.5_

  - [ ]* 1.2 Write property test for issued JWT correctness (Property 10)
    - **Property 10: Issued JWT correctness**
    - For any session ID, `signAccessToken` produces a JWT where: `alg` header is `HS256`, `sub` equals the session ID, `iss` equals `https://xoxo.practicube.com`, `aud` equals `https://xoxo.practicube.com/mcp`, and `exp - iat` equals 3600
    - **Validates: Requirements 4.4, 4.5, 4.6, 4.7, 9.1**

  - [ ]* 1.3 Write property test for token validation rejects invalid tokens (Property 11)
    - **Property 11: Token validation rejects invalid tokens**
    - For any string that is not a valid 3-part JWT, or is signed with a different secret, or uses a non-HS256 algorithm, or has an expired `exp`, or has a wrong `iss`, `verifyAccessToken` shall throw
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 9.4, 9.5**

- [x] 2. Implement pairing code generation and store
  - [x] 2.1 Create `server/pairing/generator.js` with code generation logic
    - Implement `generatePairingCode()` returning format `XOXO-XXXX-XXXX` (prefix + 4 chars from restricted set)
    - Character set: uppercase A-Z excluding O, I, L plus digits 2-9 (31 characters total)
    - Use `crypto.randomBytes` for randomness
    - _Requirements: 2.2, 9.6_

  - [x] 2.2 Create `server/pairing/store.js` with in-memory pairing code store
    - Implement `create(code, sessionId, expiresAt)`, `consume(code)`, `get(code)`, `isExpired(code)`, `cleanup()`
    - `consume` returns `{ sessionId }` and removes the entry (single-use)
    - `cleanup` removes all expired entries
    - Expiration: 5 minutes after creation
    - _Requirements: 2.6, 2.8, 3.6_

  - [ ]* 2.3 Write property test for pairing code format validity (Property 1)
    - **Property 1: Pairing code format validity**
    - For any generated pairing code, it matches `XOXO-[A-HJ-NP-Z2-9]{4}`
    - **Validates: Requirements 2.2, 9.6**

  - [ ]* 2.4 Write property test for pairing code expiration (Property 2)
    - **Property 2: Pairing code expiration**
    - For any pairing code with a creation timestamp, if current time exceeds creation + 5 minutes, the code is treated as expired
    - **Validates: Requirements 2.6**

  - [ ]* 2.5 Write property test for pairing code uniqueness (Property 3)
    - **Property 3: Pairing code uniqueness**
    - For any set of concurrently active codes, no two have the same value
    - **Validates: Requirements 2.8**

  - [ ]* 2.6 Write property test for pairing code single-use (Property 4)
    - **Property 4: Pairing code single-use**
    - After a code is consumed, a subsequent consume call returns null
    - **Validates: Requirements 3.6**

- [x] 3. Implement pairing routes
  - [x] 3.1 Create `server/pairing/routes.js` with POST /pairing/start endpoint
    - Generate a pairing code, create a session placeholder in the session store, associate code with session ID
    - Return `{ code, sessionId }` in the response body
    - Ensure uniqueness by regenerating if collision detected
    - No authentication required on this endpoint
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 2.9_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement OAuth metadata endpoints
  - [x] 5.1 Create `server/oauth/metadata.js` serving both well-known endpoints
    - GET `/.well-known/oauth-authorization-server` returns RFC 8414 metadata JSON
    - GET `/.well-known/oauth-protected-resource` returns RFC 9728 metadata JSON
    - Both endpoints accessible without authentication, return Content-Type `application/json`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1b.1, 1b.2, 1b.3, 1b.4_

- [x] 6. Implement authorization endpoint
  - [x] 6.1 Create `server/oauth/authorize.js` with GET and POST handlers
    - GET `/oauth/authorize` validates required OAuth params (response_type, client_id, redirect_uri, code_challenge, code_challenge_method), serves HTML pairing code entry page
    - POST `/oauth/authorize` validates submitted pairing code, generates authorization code (32 random bytes, base64url), stores it with code_challenge and redirect_uri, redirects to redirect_uri with code and state
    - Return error page if required params missing
    - Re-render form with error if pairing code invalid/expired
    - Accept any client_id (no hardcoded value)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 1b.8_

  - [x] 6.2 Create `server/oauth/views/authorize.html` pairing code entry page
    - HTML form with input field for XOXO-XXXX-XXXX format code
    - Display error messages when code is invalid/expired
    - Minimal, functional UI
    - _Requirements: 3.1, 3.2_

  - [ ]* 6.3 Write property test for pairing-to-session round trip (Property 5)
    - **Property 5: Pairing-to-session round trip**
    - For any session ID, generating a pairing code and submitting it at the authorization endpoint produces an authorization code associated with the same session ID
    - **Validates: Requirements 2.3, 3.3**

  - [ ]* 6.4 Write property test for invalid pairing code rejection (Property 6)
    - **Property 6: Invalid pairing code rejection**
    - For any string not corresponding to a valid, unexpired, unconsumed code, submitting it produces an error
    - **Validates: Requirements 3.4**

  - [ ]* 6.5 Write property test for missing OAuth parameter rejection (Property 7)
    - **Property 7: Missing OAuth parameter rejection**
    - For any request missing at least one required OAuth parameter, the server returns an error
    - **Validates: Requirements 3.7**

  - [ ]* 6.6 Write property test for authorization code entropy (Property 13)
    - **Property 13: Authorization code entropy**
    - For any generated authorization code, decoding from base64url yields at least 32 bytes
    - **Validates: Requirements 9.7**

- [x] 7. Implement token endpoint
  - [x] 7.1 Create `server/oauth/token-endpoint.js` with POST /oauth/token handler
    - Validate grant_type=authorization_code, code, redirect_uri, client_id, code_verifier
    - Verify PKCE: `BASE64URL(SHA256(code_verifier))` must equal stored code_challenge
    - Verify authorization code not expired (60s) and not already used
    - On success: issue JWT via `signAccessToken`, return `{ access_token, token_type: "bearer", expires_in: 3600 }`
    - On failure: return 400 with `invalid_grant` or `invalid_request` error codes
    - Consume authorization code after successful exchange (single-use)
    - Accept `resource` parameter per RFC 8707
    - No Bearer token auth required on this endpoint
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.8, 4.9, 4.10, 4.12, 1b.6_

  - [ ]* 7.2 Write property test for PKCE code verifier round trip (Property 8)
    - **Property 8: PKCE code verifier round trip**
    - For any random code_verifier, if code_challenge equals `BASE64URL(SHA256(code_verifier))`, token exchange succeeds; otherwise it fails with `invalid_grant`
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 7.3 Write property test for authorization code single-use and expiration (Property 9)
    - **Property 9: Authorization code single-use and expiration**
    - After successful exchange, a second attempt returns `invalid_grant`; if current time exceeds creation + 60s, exchange returns `invalid_grant`
    - **Validates: Requirements 3.5, 4.3, 4.9**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update auth middleware and WebSocket handler
  - [x] 9.1 Rewrite `server/auth/middleware.js` for HS256 self-issued validation
    - Remove `AUTH_DISABLED` bypass, remove `jwks-rsa` usage
    - Validate JWT using `verifyAccessToken` from `server/auth/token.js`
    - On valid token: attach decoded payload to `request.user`, call `next()`
    - On 401: include `WWW-Authenticate` header with `Bearer realm` and `resource_metadata` URL
    - Return appropriate error codes: `malformed`, `expired`, `unrecognized`
    - Check session exists and has active WebSocket for write tools (502 `desktop_disconnected`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 1b.5, 1b.7, 10.1, 10.2, 10.6_

  - [x] 9.2 Update `server/ws/handler.js` to use HS256 token verification
    - Replace `jwks-rsa` and RS256 verification with `verifyAccessToken` from `server/auth/token.js`
    - Remove the `jwksRsaClient` and `getSigningKey` function
    - Use session ID from token `sub` claim to associate WebSocket with existing session
    - _Requirements: 10.5_

  - [ ]* 9.3 Write property test for valid token resolves to correct session (Property 12)
    - **Property 12: Valid token resolves to correct session**
    - For any valid access token with `sub` = S, the middleware attaches session data for session ID S to the request
    - **Validates: Requirements 5.5, 6.1**

- [x] 10. Wire routes into server and update config
  - [x] 10.1 Update `server/index.js` to mount new routes
    - Mount pairing routes (POST /pairing/start)
    - Mount OAuth metadata routes (/.well-known/oauth-authorization-server, /.well-known/oauth-protected-resource)
    - Mount authorization endpoint (GET + POST /oauth/authorize)
    - Mount token endpoint (POST /oauth/token)
    - Serve static HTML for authorize view
    - _Requirements: 1.9, 4.10_

  - [x] 10.2 Update `server/config.js` to remove external OAuth settings
    - Remove `jwksUri`, `clientId`, `clientSecret` from oauth config
    - Add `jwtSecret` reading from `JWT_SECRET` env var
    - Keep `issuer` set to `https://xoxo.practicube.com`
    - Keep `audience` set to `https://xoxo.practicube.com/mcp`
    - Keep `tokenLifetimeSeconds: 3600`
    - _Requirements: 10.3_

- [x] 11. Implement desktop app pairing integration
  - [x] 11.1 Update `src/main/chatgpt-config.js` to reference self-issued OAuth endpoints
    - Set `oauth.issuer` to `https://xoxo.practicube.com`
    - Set `oauth.audience` to `https://xoxo.practicube.com/mcp`
    - Remove `clientId` (server accepts any client_id)
    - _Requirements: 10.4_

  - [x] 11.2 Update `src/main/chatgpt-oauth.js` to use server's token endpoint
    - Update `buildAuthorizationUrl` to use `/oauth/authorize` path
    - Update `exchangeCodeForTokens` to use `/oauth/token` path
    - Remove `scope` parameter (not needed for pairing flow)
    - Remove `audience` query parameter from authorization URL (use `resource` parameter instead per RFC 8707)
    - Remove `client_secret` from token exchange
    - _Requirements: 10.4, 1b.6_

  - [x] 11.3 Add pairing code request and display logic to desktop app
    - Implement POST to `/pairing/start` when user clicks "Connect to ChatGPT"
    - Display returned pairing code prominently to user
    - Show countdown/expiration indicator (5 minute timer)
    - Handle expiration: show message and offer to generate new code
    - Listen for `pairing:success` WebSocket event to update UI
    - Provide "Disconnect ChatGPT" option when paired
    - _Requirements: 2.1, 2.4, 2.5, 2.7, 2.9, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 12. Remove external OAuth dependencies
  - [x] 12.1 Remove `jwks-rsa` from server dependencies and clean up
    - Remove `jwks-rsa` from `server/package.json`
    - Remove or repurpose `server/auth/oauth.js` (no longer needed for external provider)
    - Remove `AUTH_DISABLED` references from any remaining code
    - _Requirements: 10.1, 10.2, 10.6_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `jsonwebtoken` package is already a server dependency and supports HS256
- `fast-check` should be added to devDependencies for property-based tests
- The server uses plain JavaScript (CommonJS), tabs for indentation, Airbnb-base style

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.3", "2.4", "2.5", "2.6", "3.1", "5.1"] },
    { "id": 2, "tasks": ["6.1", "6.2", "7.1"] },
    { "id": 3, "tasks": ["6.3", "6.4", "6.5", "6.6", "7.2", "7.3"] },
    { "id": 4, "tasks": ["9.1", "9.2"] },
    { "id": 5, "tasks": ["9.3", "10.1", "10.2"] },
    { "id": 6, "tasks": ["11.1", "11.2", "11.3", "12.1"] }
  ]
}
```
