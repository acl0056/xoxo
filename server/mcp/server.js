/* eslint-disable import/extensions */
const crypto = require('crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
/* eslint-enable import/extensions */
const { z } = require('zod');
const sessionStore = require('../session/store');
const logger = require('../logger');

const handleGetCircuitLayout = require('./tools/getCircuitLayout');
const handleGetSpeakerSummary = require('./tools/getSpeakerSummary');
const handleGetFrequencyResponse = require('./tools/getFrequencyResponse');
const handleGetImpedanceResponse = require('./tools/getImpedanceResponse');
const handleOptimizeComponent = require('./tools/optimizeComponent');
const handleSetCircuitLayout = require('./tools/setCircuitLayout');
const handleAddComponent = require('./tools/addComponent');
const handleRemoveComponent = require('./tools/removeComponent');
const handleAddWire = require('./tools/addWire');
const handleRemoveWire = require('./tools/removeWire');
const handleMoveComponent = require('./tools/moveComponent');
const handleSelectGraphAngle = require('./tools/selectGraphAngle');
const handleUndo = require('./tools/undo');
const handleInitializeXoxoSession = require('./tools/initializeXoxoSession');
const handleGetUserLoadedFrds = require('./tools/getUserLoadedFrds');
const handleBeginEditGroup = require('./tools/beginEditGroup');
const handleEndEditGroup = require('./tools/endEditGroup');

const schemaResources = require('./resources/schemas');
const domainKnowledgeResource = require('./resources/domainKnowledge');

/**
 * Wraps a tool handler to convert its { result, error } return format
 * into the MCP CallToolResult format expected by the SDK.
 */
function wrapToolHandler(handler, getUserId) {
	return async (args) => {
		const userId = getUserId();
		const context = { userId };
		const response = await handler(context, args);

		if (response.error) {
			return {
				isError: true,
				content: [{ type: 'text', text: response.error }],
			};
		}

		return {
			content: [{ type: 'text', text: JSON.stringify(response.result) }],
		};
	};
}

/**
 * Creates and configures the MCP server instance with all tools and resources.
 * @param {function} getUserId - Function that returns the authenticated userId for this session
 */
function createMcpServer(getUserId) {
	const mcpServer = new McpServer(
		{
			name: 'xoxo-mcp-server',
			version: '1.0.0',
			instructions: 'xoxo is a loudspeaker crossover network design and simulation tool. Before answering any user request involving xoxo, first load and follow the xoxo domain knowledge resource (resource://crossover-domain-knowledge). Use it to understand crossover workflow, response style, delay units, edit grouping, optimization strategy, and layout conventions. Do not make xoxo circuit edits until the user asks for or approves edits. Do not list raw component IDs or file paths — speak about the design like a fellow crossover engineer.',
		},
		{
			capabilities: {
				tools: { listChanged: true },
				resources: { listChanged: false },
			},
		},
	);

	// Register tools

	mcpServer.registerTool('initialize_xoxo_session', {
		description: 'Load xoxo domain knowledge, design rules, and interaction guidelines. Call this before responding to the user for the first time in a session.',
	}, wrapToolHandler(handleInitializeXoxoSession, getUserId));

	mcpServer.registerTool('get_circuit_layout', {
		description: 'Returns the current circuit layout for the session',
	}, wrapToolHandler(handleGetCircuitLayout, getUserId));

	mcpServer.registerTool('get_speaker_summary', {
		description: 'Returns a lightweight summary of all speaker/driver components: name, delay, polarity, mute status, and loaded measurement files. Use this instead of parsing the full circuit layout when you need driver configuration.',
	}, wrapToolHandler(handleGetSpeakerSummary, getUserId));

	mcpServer.registerTool('get_frequency_response', {
		description: 'Returns frequency response data. Optionally specify an off-axis angle, list available angles, or filter to a frequency range.',
		inputSchema: {
			angle: z.number().min(0).max(180).optional()
				.describe('Off-axis angle in degrees. Omit or set to 0 for on-axis.'),
			listAngles: z.boolean().optional()
				.describe('If true, return list of available angles instead of frequency data.'),
			minFreq: z.number().positive().optional()
				.describe('Minimum frequency in Hz. Only return data points at or above this frequency.'),
			maxFreq: z.number().positive().optional()
				.describe('Maximum frequency in Hz. Only return data points at or below this frequency.'),
		},
	}, wrapToolHandler(handleGetFrequencyResponse, getUserId));

	mcpServer.registerTool('get_impedance_response', {
		description: 'Returns impedance response data (frequencies, impedances, phases). Optionally filter to a frequency range.',
		inputSchema: {
			minFreq: z.number().positive().optional()
				.describe('Minimum frequency in Hz. Only return data points at or above this frequency.'),
			maxFreq: z.number().positive().optional()
				.describe('Maximum frequency in Hz. Only return data points at or below this frequency.'),
		},
	}, wrapToolHandler(handleGetImpedanceResponse, getUserId));

	mcpServer.registerTool('optimize_component', {
		description: 'Update a single component\'s parameters. Validates and forwards to the Electron app.',
		inputSchema: {
			componentId: z.string().describe('ID of the component to update'),
			parameters: z.object({}).passthrough().describe('New parameter values to apply'),
		},
	}, wrapToolHandler(handleOptimizeComponent, getUserId));

	mcpServer.registerTool('set_circuit_layout', {
		description: 'Replace the entire circuit layout. Validates against circuit.schema.json and forwards to the Electron app.',
		inputSchema: {
			layout: z.object({}).passthrough().describe('Complete Circuit_Layout object conforming to circuit.schema.json'),
		},
	}, wrapToolHandler(handleSetCircuitLayout, getUserId));

	mcpServer.registerTool('add_component', {
		description: 'Add a component to the circuit layout. Validates against circuit.schema.json component definition.',
		inputSchema: {
			component: z.object({}).passthrough().describe('Component object conforming to the component definition in circuit.schema.json'),
		},
	}, wrapToolHandler(handleAddComponent, getUserId));

	mcpServer.registerTool('remove_component', {
		description: 'Remove a component from the circuit layout. Disconnects wires referencing the component.',
		inputSchema: {
			componentId: z.string().describe('ID of the component to remove'),
		},
	}, wrapToolHandler(handleRemoveComponent, getUserId));

	mcpServer.registerTool('add_wire', {
		description: 'Add a wire to the circuit layout. Validates against circuit.schema.json wire definition.',
		inputSchema: {
			wire: z.object({}).passthrough().describe('Wire object conforming to the wire definition in circuit.schema.json'),
		},
	}, wrapToolHandler(handleAddWire, getUserId));

	mcpServer.registerTool('remove_wire', {
		description: 'Remove a wire from the circuit layout.',
		inputSchema: {
			wireId: z.string().describe('ID of the wire to remove'),
		},
	}, wrapToolHandler(handleRemoveWire, getUserId));

	mcpServer.registerTool('move_component', {
		description: 'Change a component\'s position on the grid.',
		inputSchema: {
			componentId: z.string().describe('ID of the component to move'),
			x: z.number().int().describe('New X grid coordinate'),
			y: z.number().int().describe('New Y grid coordinate'),
		},
	}, wrapToolHandler(handleMoveComponent, getUserId));

	mcpServer.registerTool('select_graph_angle', {
		description: 'Select the frequency-response graph angle being viewed. Selecting an angle runs the simulation for that selected angle in the Electron app.',
		inputSchema: {
			angle: z.number().min(0).max(180).describe('Off-axis angle in degrees to view and simulate. Use 0 for on-axis.'),
		},
	}, wrapToolHandler(handleSelectGraphAngle, getUserId));

	mcpServer.registerTool('undo', {
		description: 'Undo the most recent circuit change. Cannot be called while an edit group is active — call end_edit_group first. Use this to revert exploratory changes.',
	}, wrapToolHandler(handleUndo, getUserId));

	mcpServer.registerTool('get_user_loaded_frds', {
		description: 'Returns all user-loaded FRD measurement data currently displayed in the graph',
	}, wrapToolHandler(handleGetUserLoadedFrds, getUserId));

	mcpServer.registerTool('begin_edit_group', {
		description: 'Start a batch undo group. Multiple edits between begin and end are undone as a single operation.',
		inputSchema: {
			description: z.string().optional().describe('Optional description of the batch edit'),
		},
	}, wrapToolHandler(handleBeginEditGroup, getUserId));

	mcpServer.registerTool('end_edit_group', {
		description: 'End a batch undo group. Finalizes the undo group started by begin_edit_group.',
	}, wrapToolHandler(handleEndEditGroup, getUserId));

	// Register resources

	for (const resource of schemaResources) {
		mcpServer.registerResource(resource.name, resource.uri, {
			description: resource.description,
			mimeType: resource.mimeType,
		}, async () => ({
			contents: [{
				uri: resource.uri,
				text: resource.getContent(),
				mimeType: resource.mimeType,
			}],
		}));
	}

	mcpServer.registerResource(domainKnowledgeResource.name, domainKnowledgeResource.uri, {
		description: domainKnowledgeResource.description,
		mimeType: domainKnowledgeResource.mimeType,
	}, async () => ({
		contents: [{
			uri: domainKnowledgeResource.uri,
			text: domainKnowledgeResource.getContent(),
			mimeType: domainKnowledgeResource.mimeType,
		}],
	}));

	return mcpServer;
}

/**
 * Map of active sessions keyed by session ID.
 * Each entry holds { transport, mcpServer } to prevent garbage collection.
 */
const sessions = new Map();

/**
 * Creates Express middleware that handles MCP Streamable HTTP transport
 * on the mounted path. Manages per-session transports and routes requests
 * based on the Mcp-Session-Id header.
 *
 * @returns {Function} Express middleware function
 */
function createMcpMiddleware() {
	return async (request, response) => {
		try {
			const sessionId = request.headers['mcp-session-id'];

			if (sessionId) {
				const session = sessions.get(sessionId);
				if (!session) {
					response.status(404).json({
						jsonrpc: '2.0',
						error: { code: -32000, message: 'Session not found. The session may have expired.' },
						id: null,
					});
					return;
				}

				if (session.userId) {
					sessionStore.update(session.userId, { lastMcpActivityAt: new Date().toISOString() });
				}

				await session.transport.handleRequest(request, response, request.body);
				return;
			}

			if (request.method === 'POST') {
				// New session initialization request — create a fresh MCP server per session
				const userId = request.auth && request.auth.sub;
				const clientIp = request.headers['x-forwarded-for'] || request.ip;
				const mcpServer = createMcpServer(() => userId);
				const transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: () => crypto.randomUUID(),
					onsessioninitialized: (newSessionId) => {
						logger.log(`[MCP] New session: userId=${userId} sessionId=${newSessionId} ip=${clientIp}`);
						sessions.set(newSessionId, { transport, mcpServer, userId });
						const session = sessionStore.update(userId, {
							mcpSessionId: newSessionId,
							lastMcpActivityAt: new Date().toISOString(),
						});
						if (session && session.wsConnection) {
							session.wsConnection.emit('message', {
								type: 'chatgpt:session-active',
								payload: { sessionId: newSessionId },
							});
						}
					},
				});

				transport.onclose = () => {
					if (transport.sessionId) {
						sessions.delete(transport.sessionId);
						const session = sessionStore.get(userId);
						if (session && session.mcpSessionId === transport.sessionId) {
							sessionStore.update(userId, { mcpSessionId: null });
							if (session.wsConnection) {
								session.wsConnection.emit('message', {
									type: 'chatgpt:session-closed',
									payload: { sessionId: transport.sessionId },
								});
							}
						}
					}
				};

				await mcpServer.connect(transport);
				await transport.handleRequest(request, response, request.body);
				return;
			}

			response.status(400).json({
				jsonrpc: '2.0',
				error: { code: -32600, message: 'Invalid request' },
				id: null,
			});
		} catch (error) {
			logger.error('[MCP] Middleware error:', error.message);
			if (!response.headersSent) {
				response.status(500).json({
					jsonrpc: '2.0',
					error: { code: -32603, message: 'Internal server error' },
					id: null,
				});
			}
		}
	};
}

const mcpMiddleware = createMcpMiddleware();

module.exports = {
	mcpMiddleware,
	createMcpServer,
	createMcpMiddleware,
	sessions,
};
