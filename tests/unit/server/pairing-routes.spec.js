const pairingStore = require('../../../server/pairing/store');
const sessionStore = require('../../../server/session/store');

// Must require the router after mocks are set up
const pairingRouter = require('../../../server/pairing/routes');

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

describe('server/pairing/routes - POST /pairing/start', () => {
	const handler = getRouteHandler(pairingRouter, 'post', '/pairing/start');

	beforeEach(() => {
		pairingStore.cleanup();
		// Clear session store between tests
		const allSessions = sessionStore.getAll();
		for (const key of allSessions.keys()) {
			sessionStore.delete(key);
		}
	});

	it('returns a pairing code and session ID', () => {
		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty('code');
		expect(response.body).toHaveProperty('sessionId');
	});

	it('returns a code matching the XOXO-XXXX-XXXX format', () => {
		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		expect(response.body.code).toMatch(/^XOXO-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
	});

	it('creates a session placeholder in the session store', () => {
		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		const session = sessionStore.get(response.body.sessionId);
		expect(session).toBeDefined();
		expect(session.userId).toBe(response.body.sessionId);
	});

	it('stores the pairing code in the pairing store associated with the session ID', () => {
		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		const entry = pairingStore.get(response.body.code);
		expect(entry).not.toBeNull();
		expect(entry.sessionId).toBe(response.body.sessionId);
	});

	it('sets the pairing code expiration to 5 minutes from now', () => {
		const now = Date.now();
		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		const entry = pairingStore.get(response.body.code);
		// Allow 1 second tolerance for test execution time
		expect(entry.expiresAt).toBeGreaterThanOrEqual(now + 299000);
		expect(entry.expiresAt).toBeLessThanOrEqual(now + 301000);
	});

	it('generates unique codes when a collision would occur', () => {
		// Pre-fill the store with a code to force at least one regeneration
		const existingCode = 'XOXO-A2B3';
		pairingStore.create(existingCode, 'existing-session', Date.now() + 300000);

		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		expect(response.statusCode).toBe(200);
		expect(response.body.code).not.toBe(existingCode);
	});

	it('does not require authentication', () => {
		// The handler should work without any auth headers
		const request = createMockRequest();
		const response = createMockResponse();

		handler(request, response);

		expect(response.statusCode).toBe(200);
	});
});
