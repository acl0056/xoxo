/**
 * WebSocket message type definitions and envelope helpers.
 *
 * Defines all message types exchanged between the Electron app and the MCP server,
 * plus a helper function to create properly structured message envelopes.
 */

// --- Electron → Server: State push messages ---
const STATE_CIRCUIT = 'state:circuit';
const STATE_SIMULATION = 'state:simulation';
const STATE_USER_FRDS = 'state:userFrds';

// --- Electron → Server: Response messages (acknowledgments of forwarded requests) ---
const RESPONSE_OPTIMIZE = 'response:optimize';
const RESPONSE_SET_CIRCUIT_LAYOUT = 'response:setCircuitLayout';
const RESPONSE_ADD_COMPONENT = 'response:addComponent';
const RESPONSE_REMOVE_COMPONENT = 'response:removeComponent';
const RESPONSE_ADD_WIRE = 'response:addWire';
const RESPONSE_REMOVE_WIRE = 'response:removeWire';
const RESPONSE_MOVE_COMPONENT = 'response:moveComponent';
const RESPONSE_SELECT_GRAPH_ANGLE = 'response:selectGraphAngle';
const RESPONSE_UNDO = 'response:undo';
const RESPONSE_BEGIN_EDIT_GROUP = 'response:beginEditGroup';
const RESPONSE_END_EDIT_GROUP = 'response:endEditGroup';

// --- Server → Electron: Request messages (forwarded from MCP tools) ---
const REQUEST_OPTIMIZE = 'request:optimize';
const REQUEST_SET_CIRCUIT_LAYOUT = 'request:setCircuitLayout';
const REQUEST_ADD_COMPONENT = 'request:addComponent';
const REQUEST_REMOVE_COMPONENT = 'request:removeComponent';
const REQUEST_ADD_WIRE = 'request:addWire';
const REQUEST_REMOVE_WIRE = 'request:removeWire';
const REQUEST_MOVE_COMPONENT = 'request:moveComponent';
const REQUEST_SELECT_GRAPH_ANGLE = 'request:selectGraphAngle';
const REQUEST_UNDO = 'request:undo';
const REQUEST_BEGIN_EDIT_GROUP = 'request:beginEditGroup';
const REQUEST_END_EDIT_GROUP = 'request:endEditGroup';

// --- Server → Electron: Error messages ---
const ERROR_VALIDATION = 'error:validation';

/**
 * Create a message envelope with the standard structure.
 *
 * @param {string} type - The message type identifier (use one of the exported constants)
 * @param {object} payload - The type-specific payload data
 * @param {string} [requestId] - Optional identifier for request/response correlation
 * @returns {object} A message envelope object with type, payload, and optionally requestId
 */
function createMessage(type, payload, requestId) {
	const message = {
		type,
		payload,
	};

	if (requestId !== undefined) {
		message.requestId = requestId;
	}

	return message;
}

module.exports = {
	// State messages (Electron → Server)
	STATE_CIRCUIT,
	STATE_SIMULATION,
	STATE_USER_FRDS,

	// Response messages (Electron → Server)
	RESPONSE_OPTIMIZE,
	RESPONSE_SET_CIRCUIT_LAYOUT,
	RESPONSE_ADD_COMPONENT,
	RESPONSE_REMOVE_COMPONENT,
	RESPONSE_ADD_WIRE,
	RESPONSE_REMOVE_WIRE,
	RESPONSE_MOVE_COMPONENT,
	RESPONSE_SELECT_GRAPH_ANGLE,
	RESPONSE_UNDO,
	RESPONSE_BEGIN_EDIT_GROUP,
	RESPONSE_END_EDIT_GROUP,

	// Request messages (Server → Electron)
	REQUEST_OPTIMIZE,
	REQUEST_SET_CIRCUIT_LAYOUT,
	REQUEST_ADD_COMPONENT,
	REQUEST_REMOVE_COMPONENT,
	REQUEST_ADD_WIRE,
	REQUEST_REMOVE_WIRE,
	REQUEST_MOVE_COMPONENT,
	REQUEST_SELECT_GRAPH_ANGLE,
	REQUEST_UNDO,
	REQUEST_BEGIN_EDIT_GROUP,
	REQUEST_END_EDIT_GROUP,

	// Error messages (Server → Electron)
	ERROR_VALIDATION,

	// Helper
	createMessage,
};
