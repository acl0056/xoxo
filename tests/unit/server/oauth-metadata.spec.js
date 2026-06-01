const metadataRouter = require('../../../server/oauth/metadata');

function createMockRequest(path) {
	return {
		method: 'GET',
		url: path,
		path,
		headers: {},
	};
}

function createMockResponse() {
	const response = {
		statusCode: null,
		headers: {},
		body: null,
		status(code) {
			response.statusCode = code;
			return response;
		},
		json(data) {
			response.body = data;
			response.headers['content-type'] = 'application/json';
			return response;
		},
		setHeader(name, value) {
			response.headers[name.toLowerCase()] = value;
			return response;
		},
		getHeader(name) {
			return response.headers[name.toLowerCase()];
		},
	};
	return response;
}

describe('OAuth metadata endpoints', () => {
	describe('GET /.well-known/oauth-authorization-server', () => {
		let response;

		beforeEach(() => {
			const request = createMockRequest('/.well-known/oauth-authorization-server');
			response = createMockResponse();

			// Find the matching route handler in the router stack
			const layer = metadataRouter.stack.find(
				(routeLayer) => routeLayer.route
					&& routeLayer.route.path === '/.well-known/oauth-authorization-server'
					&& routeLayer.route.methods.get,
			);
			layer.route.stack[0].handle(request, response);
		});

		it('returns status 200', () => {
			expect(response.statusCode).toBe(200);
		});

		it('returns application/json content type', () => {
			expect(response.headers['content-type']).toBe('application/json');
		});

		it('returns correct issuer', () => {
			expect(response.body.issuer).toBe('https://xoxo.practicube.com');
		});

		it('returns correct authorization_endpoint', () => {
			expect(response.body.authorization_endpoint).toBe('https://xoxo.practicube.com/oauth/authorize');
		});

		it('returns correct token_endpoint', () => {
			expect(response.body.token_endpoint).toBe('https://xoxo.practicube.com/oauth/token');
		});

		it('includes code in response_types_supported', () => {
			expect(response.body.response_types_supported).toEqual(['code']);
		});

		it('includes authorization_code in grant_types_supported', () => {
			expect(response.body.grant_types_supported).toEqual(['authorization_code']);
		});

		it('includes S256 in code_challenge_methods_supported', () => {
			expect(response.body.code_challenge_methods_supported).toEqual(['S256']);
		});
	});

	describe('GET /.well-known/oauth-protected-resource', () => {
		let response;

		beforeEach(() => {
			const request = createMockRequest('/.well-known/oauth-protected-resource');
			response = createMockResponse();

			const layer = metadataRouter.stack.find(
				(routeLayer) => routeLayer.route
					&& routeLayer.route.path === '/.well-known/oauth-protected-resource'
					&& routeLayer.route.methods.get,
			);
			layer.route.stack[0].handle(request, response);
		});

		it('returns status 200', () => {
			expect(response.statusCode).toBe(200);
		});

		it('returns application/json content type', () => {
			expect(response.headers['content-type']).toBe('application/json');
		});

		it('returns correct resource field', () => {
			expect(response.body.resource).toBe('https://xoxo.practicube.com/mcp');
		});

		it('returns correct authorization_servers', () => {
			expect(response.body.authorization_servers).toEqual(['https://xoxo.practicube.com']);
		});
	});
});
