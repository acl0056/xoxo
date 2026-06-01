jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
	StreamableHTTPServerTransport: jest.fn().mockImplementation(() => ({
		sessionId: 'mock-session-id',
		handleRequest: jest.fn().mockResolvedValue(undefined),
		onclose: null,
	})),
}));

const mockRegisteredTools = {};
const mockRegisteredResources = {};

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
	McpServer: jest.fn().mockImplementation(() => ({
		constructor: { name: 'McpServer' },
		server: { constructor: { name: 'Server' } },
		registerTool(name, config, callback) {
			mockRegisteredTools[name] = { config, callback };
		},
		registerResource(name, uri, metadata, callback) {
			mockRegisteredResources[name] = { uri, metadata, callback };
		},
		connect: jest.fn().mockResolvedValue(undefined),
	})),
}));

// Mock tool handlers to avoid pulling in ws/handler dependencies
jest.mock('../../../server/mcp/tools/getCircuitLayout', () => jest.fn());
jest.mock('../../../server/mcp/tools/getFrequencyResponse', () => jest.fn());
jest.mock('../../../server/mcp/tools/getImpedanceResponse', () => jest.fn());
jest.mock('../../../server/mcp/tools/optimizeComponent', () => jest.fn());
jest.mock('../../../server/mcp/tools/setCircuitLayout', () => jest.fn());
jest.mock('../../../server/mcp/tools/addComponent', () => jest.fn());
jest.mock('../../../server/mcp/tools/removeComponent', () => jest.fn());
jest.mock('../../../server/mcp/tools/addWire', () => jest.fn());
jest.mock('../../../server/mcp/tools/removeWire', () => jest.fn());
jest.mock('../../../server/mcp/tools/moveComponent', () => jest.fn());
jest.mock('../../../server/mcp/tools/selectGraphAngle', () => jest.fn());
jest.mock('../../../server/mcp/tools/undo', () => jest.fn());
jest.mock('../../../server/mcp/tools/initializeXoxoSession', () => jest.fn());
jest.mock('../../../server/mcp/tools/getSpeakerSummary', () => jest.fn());
jest.mock('../../../server/mcp/tools/getUserLoadedFrds', () => jest.fn());
jest.mock('../../../server/mcp/tools/beginEditGroup', () => jest.fn());
jest.mock('../../../server/mcp/tools/endEditGroup', () => jest.fn());

// Mock resource modules
jest.mock('../../../server/mcp/resources/schemas', () => [
	{
		uri: 'resource://schema/circuit.schema.json',
		name: 'circuit.schema.json',
		description: 'Circuit schema',
		mimeType: 'application/json',
		getContent: () => '{}',
	},
	{
		uri: 'resource://schema/simulation-results.schema.json',
		name: 'simulation-results.schema.json',
		description: 'Simulation results schema',
		mimeType: 'application/json',
		getContent: () => '{}',
	},
	{
		uri: 'resource://schema/frd-data.schema.json',
		name: 'frd-data.schema.json',
		description: 'FRD data schema',
		mimeType: 'application/json',
		getContent: () => '{}',
	},
]);

jest.mock('../../../server/mcp/resources/domainKnowledge', () => ({
	uri: 'resource://crossover-domain-knowledge',
	name: 'Crossover Domain Knowledge',
	description: 'Domain knowledge resource',
	mimeType: 'text/markdown',
	getContent: () => '# Domain Knowledge',
}));

const { createMcpServer, createMcpMiddleware, sessions } = require('../../../server/mcp/server');

describe('server/mcp/server', () => {
	beforeEach(() => {
		Object.keys(mockRegisteredTools).forEach((key) => delete mockRegisteredTools[key]);
		Object.keys(mockRegisteredResources).forEach((key) => delete mockRegisteredResources[key]);
	});

	describe('module exports', () => {
		it('should export createMcpServer as a function', () => {
			expect(typeof createMcpServer).toBe('function');
		});

		it('should export createMcpMiddleware as a function', () => {
			expect(typeof createMcpMiddleware).toBe('function');
		});

		it('should export sessions as a Map', () => {
			expect(sessions).toBeInstanceOf(Map);
		});
	});

	describe('createMcpServer', () => {
		it('should create an MCP server instance', () => {
			const server = createMcpServer();
			expect(server).toBeDefined();
		});

		it('should register all 17 tools', () => {
			createMcpServer();
			const toolNames = Object.keys(mockRegisteredTools);
			expect(toolNames).toHaveLength(17);
			expect(toolNames).toContain('initialize_xoxo_session');
			expect(toolNames).toContain('get_circuit_layout');
			expect(toolNames).toContain('get_speaker_summary');
			expect(toolNames).toContain('get_frequency_response');
			expect(toolNames).toContain('get_impedance_response');
			expect(toolNames).toContain('optimize_component');
			expect(toolNames).toContain('set_circuit_layout');
			expect(toolNames).toContain('add_component');
			expect(toolNames).toContain('remove_component');
			expect(toolNames).toContain('add_wire');
			expect(toolNames).toContain('remove_wire');
			expect(toolNames).toContain('move_component');
			expect(toolNames).toContain('select_graph_angle');
			expect(toolNames).toContain('undo');
			expect(toolNames).toContain('get_user_loaded_frds');
			expect(toolNames).toContain('begin_edit_group');
			expect(toolNames).toContain('end_edit_group');
		});

		it('should register all 4 resources', () => {
			createMcpServer();
			const resourceNames = Object.keys(mockRegisteredResources);
			expect(resourceNames).toHaveLength(4);
		});

		it('should register schema resources with correct URIs', () => {
			createMcpServer();
			expect(mockRegisteredResources['circuit.schema.json'].uri).toBe('resource://schema/circuit.schema.json');
			expect(mockRegisteredResources['simulation-results.schema.json'].uri).toBe('resource://schema/simulation-results.schema.json');
			expect(mockRegisteredResources['frd-data.schema.json'].uri).toBe('resource://schema/frd-data.schema.json');
		});

		it('should register domain knowledge resource', () => {
			createMcpServer();
			expect(mockRegisteredResources['Crossover Domain Knowledge']).toBeDefined();
			expect(mockRegisteredResources['Crossover Domain Knowledge'].uri).toBe('resource://crossover-domain-knowledge');
		});

		it('should register tools with descriptions', () => {
			createMcpServer();
			for (const [, tool] of Object.entries(mockRegisteredTools)) {
				expect(tool.config.description).toBeDefined();
				expect(tool.config.description.length).toBeGreaterThan(0);
			}
		});

		it('should register tools with callbacks', () => {
			createMcpServer();
			for (const [, tool] of Object.entries(mockRegisteredTools)) {
				expect(typeof tool.callback).toBe('function');
			}
		});

		it('should register get_frequency_response with inputSchema', () => {
			createMcpServer();
			const tool = mockRegisteredTools.get_frequency_response;
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.inputSchema.angle).toBeDefined();
			expect(tool.config.inputSchema.listAngles).toBeDefined();
		});

		it('should register optimize_component with inputSchema', () => {
			createMcpServer();
			const tool = mockRegisteredTools.optimize_component;
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.inputSchema.componentId).toBeDefined();
			expect(tool.config.inputSchema.parameters).toBeDefined();
		});

		it('should register move_component with inputSchema', () => {
			createMcpServer();
			const tool = mockRegisteredTools.move_component;
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.inputSchema.componentId).toBeDefined();
			expect(tool.config.inputSchema.x).toBeDefined();
			expect(tool.config.inputSchema.y).toBeDefined();
		});

		it('should register select_graph_angle with inputSchema', () => {
			createMcpServer();
			const tool = mockRegisteredTools.select_graph_angle;
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.inputSchema.angle).toBeDefined();
		});
	});

	describe('createMcpMiddleware', () => {
		it('should return a function', () => {
			const server = createMcpServer();
			const middleware = createMcpMiddleware(server);
			expect(typeof middleware).toBe('function');
		});

		it('should return 404 for a request with an unknown session ID', async () => {
			const server = createMcpServer();
			const middleware = createMcpMiddleware(server);

			const request = {
				method: 'POST',
				headers: { 'mcp-session-id': 'nonexistent-session-id' },
				body: {},
			};
			const response = createMockResponse();

			await middleware(request, response);

			expect(response.statusCode).toBe(404);
			expect(response.jsonBody.error.message).toMatch(/session/i);
		});

		it('should return 400 for a GET request without a session ID', async () => {
			const server = createMcpServer();
			const middleware = createMcpMiddleware(server);

			const request = {
				method: 'GET',
				headers: {},
			};
			const response = createMockResponse();

			await middleware(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.jsonBody.error.message).toMatch(/Invalid request/);
		});

		it('should return 400 for non-POST/GET requests without a session ID', async () => {
			const server = createMcpServer();
			const middleware = createMcpMiddleware(server);

			const request = {
				method: 'DELETE',
				headers: {},
			};
			const response = createMockResponse();

			await middleware(request, response);

			expect(response.statusCode).toBe(400);
			expect(response.jsonBody.error.message).toMatch(/Invalid request/);
		});

		it('should create a new transport for POST without session ID', async () => {
			// eslint-disable-next-line import/extensions, import/no-unresolved
			const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
			StreamableHTTPServerTransport.mockClear();

			const server = createMcpServer();
			const middleware = createMcpMiddleware(server);

			const request = {
				method: 'POST',
				headers: {},
				body: { jsonrpc: '2.0', method: 'initialize', id: 1 },
			};
			const response = createMockResponse();

			await middleware(request, response);

			expect(StreamableHTTPServerTransport).toHaveBeenCalled();
		});
	});
});

function createMockResponse() {
	const response = {
		statusCode: null,
		jsonBody: null,
		headers: {},
		status(code) {
			response.statusCode = code;
			return response;
		},
		json(body) {
			response.jsonBody = body;
			return response;
		},
		setHeader(name, value) {
			response.headers[name] = value;
			return response;
		},
	};
	return response;
}
