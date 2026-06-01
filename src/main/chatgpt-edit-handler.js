const {
	RESPONSE_OPTIMIZE,
	RESPONSE_SET_CIRCUIT_LAYOUT,
	RESPONSE_ADD_COMPONENT,
	RESPONSE_REMOVE_COMPONENT,
	RESPONSE_ADD_WIRE,
	RESPONSE_REMOVE_WIRE,
	RESPONSE_MOVE_COMPONENT,
	RESPONSE_SELECT_GRAPH_ANGLE,
	RESPONSE_BEGIN_EDIT_GROUP,
	RESPONSE_END_EDIT_GROUP,
} = require('../../server/ws/messages');

/**
 * Timeout in milliseconds for auto-closing an edit group
 * if endEditGroup is not received.
 */
const EDIT_GROUP_TIMEOUT_MS = 60000;

/**
 * Creates an edit request handler that processes incoming edit requests
 * from the ChatGPT MCP server and applies them to the Electron app's circuit.
 *
 * @param {object} dependencies - Required dependencies
 * @param {object} dependencies.store - Vuex store (or store-like interface with dispatch, commit, getters)
 * @param {object} dependencies.mainWindow - The BrowserWindow for IPC communication
 * @param {object} dependencies.socket - The ChatgptClient instance for sending responses
 * @returns {object} The edit handler instance
 */
function createEditHandler({ store, mainWindow, socket }) {
	let editGroupActive = false;
	let editGroupTimer = null;

	/**
	 * Send a response message back to the server via the socket.
	 *
	 * @param {string} responseType - The response message type constant
	 * @param {object} payload - The response payload
	 * @param {string} requestId - The request ID for correlation
	 */
	function sendResponse(responseType, payload, requestId) {
		if (!socket || !socket.isConnected()) {
			return;
		}

		socket.socket.emit('message', {
			type: responseType,
			payload,
			requestId,
		});
	}

	/**
	 * Push an undo entry unless an edit group is active
	 * (edit group suppresses individual undo entries).
	 *
	 * @param {object} undoAction - The undo action to push
	 */
	function pushUndoUnlessGrouped(undoAction) {
		if (!editGroupActive) {
			store.commit('circuit/PUSH_UNDO', undoAction);
			store.commit('circuit/CLEAR_REDO');
		}
	}

	/**
	 * Trigger simulation recalculation via the store.
	 */
	function triggerSimulation() {
		store.dispatch('simulation/runSimulation');
	}

	/**
	 * Handle request:optimize — update component parameters.
	 * Pushes undo (unless grouped), applies new parameters, re-simulates.
	 * Reverts on simulation failure.
	 *
	 * @param {object} payload - { componentId, parameters }
	 * @param {string} requestId - Correlation ID
	 */
	function handleOptimize(payload, requestId) {
		const { componentId, parameters } = payload;
		const circuit = store.getters['circuit/circuit'];

		if (!circuit) {
			sendResponse(RESPONSE_OPTIMIZE, { success: false, error: 'No active circuit' }, requestId);
			return;
		}

		const component = circuit.getComponent(componentId);
		if (!component) {
			sendResponse(RESPONSE_OPTIMIZE, { success: false, error: `Component ${componentId} not found` }, requestId);
			return;
		}

		// Save previous parameters for undo
		const previousParameters = JSON.parse(JSON.stringify(component.parameters));

		pushUndoUnlessGrouped({
			type: 'updateComponent',
			payload: { componentId, updates: { parameters: previousParameters } },
		});

		// ChatGPT sends partial parameter patches; keep the rest of the component tuning intact.
		const mergedParameters = {
			...previousParameters,
			...parameters,
		};
		store.commit('circuit/UPDATE_COMPONENT', { componentId, updates: { parameters: mergedParameters } });

		// Trigger simulation
		triggerSimulation();

		// Return the updated component
		const updatedComponent = circuit.getComponent(componentId);
		const responsePayload = updatedComponent.toJSON
			? updatedComponent.toJSON()
			: JSON.parse(JSON.stringify(updatedComponent));

		sendResponse(RESPONSE_OPTIMIZE, { success: true, component: responsePayload }, requestId);
	}

	/**
	 * Handle request:setCircuitLayout — replace the entire circuit layout.
	 * Pushes undo with the previous layout, replaces, re-renders, re-simulates.
	 *
	 * @param {object} payload - { layout } — the full circuit layout object
	 * @param {string} requestId - Correlation ID
	 */
	function handleSetCircuitLayout(payload, requestId) {
		const { layout } = payload;
		const circuit = store.getters['circuit/circuit'];

		if (!circuit) {
			sendResponse(RESPONSE_SET_CIRCUIT_LAYOUT, { success: false, error: 'No active circuit' }, requestId);
			return;
		}

		// Save current layout for undo
		const previousLayout = circuit.toJSON
			? circuit.toJSON()
			: JSON.parse(JSON.stringify(circuit));

		pushUndoUnlessGrouped({
			type: 'setCircuitLayout',
			payload: previousLayout,
		});

		// Replace the circuit layout
		store.commit('circuit/SET_CIRCUIT', layout);

		// Trigger simulation
		triggerSimulation();

		// Notify renderer to re-render
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('circuit-layout-replaced');
		}

		sendResponse(RESPONSE_SET_CIRCUIT_LAYOUT, { success: true, layout }, requestId);
	}

	/**
	 * Handle request:addComponent — add a component to the layout.
	 *
	 * @param {object} payload - { component } — the component object to add
	 * @param {string} requestId - Correlation ID
	 */
	function handleAddComponent(payload, requestId) {
		const { component } = payload;

		pushUndoUnlessGrouped({
			type: 'removeComponent',
			payload: component.id,
		});

		store.commit('circuit/ADD_COMPONENT', component);
		triggerSimulation();

		sendResponse(RESPONSE_ADD_COMPONENT, { success: true, component }, requestId);
	}

	/**
	 * Handle request:removeComponent — remove a component from the layout.
	 * Disconnects wires referencing the component's terminals.
	 *
	 * @param {object} payload - { componentId }
	 * @param {string} requestId - Correlation ID
	 */
	function handleRemoveComponent(payload, requestId) {
		const { componentId } = payload;
		const circuit = store.getters['circuit/circuit'];

		if (!circuit) {
			sendResponse(RESPONSE_REMOVE_COMPONENT, { success: false, error: 'No active circuit' }, requestId);
			return;
		}

		const component = circuit.getComponent(componentId);
		if (!component) {
			sendResponse(RESPONSE_REMOVE_COMPONENT, { success: false, error: `Component ${componentId} not found` }, requestId);
			return;
		}

		// Find wires connected to this component
		const affectedWireIds = [];
		if (circuit.wires) {
			for (const wire of circuit.wires) {
				const wireData = wire.toJSON ? wire.toJSON() : wire;
				if (wireData.startNode === componentId || wireData.endNode === componentId) {
					affectedWireIds.push(wireData.id);
				}
			}
		}

		// Save component for undo
		const componentData = component.toJSON
			? component.toJSON()
			: JSON.parse(JSON.stringify(component));

		pushUndoUnlessGrouped({
			type: 'addComponent',
			payload: componentData,
		});

		store.commit('circuit/REMOVE_COMPONENT', componentId);
		triggerSimulation();

		sendResponse(RESPONSE_REMOVE_COMPONENT, { success: true, componentId, affectedWireIds }, requestId);
	}

	/**
	 * Handle request:addWire — add a wire to the layout.
	 *
	 * @param {object} payload - { wire } — the wire object to add
	 * @param {string} requestId - Correlation ID
	 */
	function handleAddWire(payload, requestId) {
		const { wire } = payload;

		pushUndoUnlessGrouped({
			type: 'removeWire',
			payload: wire.id,
		});

		store.commit('circuit/ADD_WIRE', wire);
		triggerSimulation();

		sendResponse(RESPONSE_ADD_WIRE, { success: true, wire }, requestId);
	}

	/**
	 * Handle request:removeWire — remove a wire from the layout.
	 *
	 * @param {object} payload - { wireId }
	 * @param {string} requestId - Correlation ID
	 */
	function handleRemoveWire(payload, requestId) {
		const { wireId } = payload;
		const circuit = store.getters['circuit/circuit'];

		if (!circuit) {
			sendResponse(RESPONSE_REMOVE_WIRE, { success: false, error: 'No active circuit' }, requestId);
			return;
		}

		const wire = circuit.getWire(wireId);
		if (!wire) {
			sendResponse(RESPONSE_REMOVE_WIRE, { success: false, error: `Wire ${wireId} not found` }, requestId);
			return;
		}

		// Save wire for undo
		const wireData = wire.toJSON ? wire.toJSON() : JSON.parse(JSON.stringify(wire));

		pushUndoUnlessGrouped({
			type: 'addWire',
			payload: wireData,
		});

		store.commit('circuit/REMOVE_WIRE', wireId);
		triggerSimulation();

		sendResponse(RESPONSE_REMOVE_WIRE, { success: true, wireId }, requestId);
	}

	/**
	 * Handle request:moveComponent — update a component's position.
	 *
	 * @param {object} payload - { componentId, x, y }
	 * @param {string} requestId - Correlation ID
	 */
	function handleMoveComponent(payload, requestId) {
		const { componentId, x, y } = payload;
		const circuit = store.getters['circuit/circuit'];

		if (!circuit) {
			sendResponse(RESPONSE_MOVE_COMPONENT, { success: false, error: 'No active circuit' }, requestId);
			return;
		}

		const component = circuit.getComponent(componentId);
		if (!component) {
			sendResponse(RESPONSE_MOVE_COMPONENT, { success: false, error: `Component ${componentId} not found` }, requestId);
			return;
		}

		// Save previous position for undo
		const previousX = component.x;
		const previousY = component.y;

		pushUndoUnlessGrouped({
			type: 'updateComponent',
			payload: { componentId, updates: { x: previousX, y: previousY } },
		});

		store.commit('circuit/UPDATE_COMPONENT', { componentId, updates: { x, y } });
		triggerSimulation();

		// Return updated component
		const updatedComponent = circuit.getComponent(componentId);
		const responsePayload = updatedComponent.toJSON
			? updatedComponent.toJSON()
			: JSON.parse(JSON.stringify(updatedComponent));

		sendResponse(RESPONSE_MOVE_COMPONENT, { success: true, component: responsePayload }, requestId);
	}

	/**
	 * Handle request:selectGraphAngle — change the viewed graph angle.
	 * The renderer simulation store runs the selected-angle simulation.
	 *
	 * @param {object} payload - { angle }
	 * @param {string} requestId - Correlation ID
	 */
	function handleSelectGraphAngle(payload, requestId) {
		const { angle } = payload;

		Promise.resolve(store.dispatch('simulation/switchAngle', angle))
			.then(() => {
				sendResponse(RESPONSE_SELECT_GRAPH_ANGLE, {
					success: true,
					angle,
				}, requestId);
			})
			.catch((error) => {
				sendResponse(RESPONSE_SELECT_GRAPH_ANGLE, {
					success: false,
					error: error.message || 'Failed to select graph angle',
				}, requestId);
			});
	}

	/**
	 * Handle request:beginEditGroup — save undo checkpoint and suppress
	 * individual undo entries until endEditGroup is received.
	 *
	 * @param {object} payload - { description } (optional)
	 * @param {string} requestId - Correlation ID
	 */
	function handleBeginEditGroup(payload, requestId) {
		// If already in an edit group, auto-close the previous one
		if (editGroupActive) {
			clearEditGroupTimeout();
			editGroupActive = false;
		}

		const circuit = store.getters['circuit/circuit'];

		if (!circuit) {
			sendResponse(RESPONSE_BEGIN_EDIT_GROUP, { success: false, error: 'No active circuit' }, requestId);
			return;
		}

		// Save the current circuit state as the undo checkpoint for the group
		const checkpoint = circuit.toJSON
			? circuit.toJSON()
			: JSON.parse(JSON.stringify(circuit));

		store.commit('circuit/PUSH_UNDO', {
			type: 'setCircuitLayout',
			payload: checkpoint,
		});
		store.commit('circuit/CLEAR_REDO');

		editGroupActive = true;

		// Start the 60-second timeout
		editGroupTimer = setTimeout(() => {
			editGroupActive = false;
			editGroupTimer = null;
		}, EDIT_GROUP_TIMEOUT_MS);

		sendResponse(RESPONSE_BEGIN_EDIT_GROUP, { success: true, description: payload && payload.description }, requestId);
	}

	/**
	 * Handle request:endEditGroup — finalize the undo group.
	 *
	 * @param {object} payload - (unused)
	 * @param {string} requestId - Correlation ID
	 */
	function handleEndEditGroup(payload, requestId) {
		clearEditGroupTimeout();
		editGroupActive = false;

		sendResponse(RESPONSE_END_EDIT_GROUP, { success: true }, requestId);
	}

	/**
	 * Clear the edit group timeout timer.
	 */
	function clearEditGroupTimeout() {
		if (editGroupTimer) {
			clearTimeout(editGroupTimer);
			editGroupTimer = null;
		}
	}

	/**
	 * Main entry point: handle an incoming edit request from the ChatgptClient.
	 *
	 * @param {string} type - The message type (e.g., 'request:optimize')
	 * @param {object} payload - The request payload
	 * @param {string} requestId - The request ID for correlation
	 */
	function handleEditRequest(type, payload, requestId) {
		switch (type) {
			case 'request:optimize':
				handleOptimize(payload, requestId);
				break;
			case 'request:setCircuitLayout':
				handleSetCircuitLayout(payload, requestId);
				break;
			case 'request:addComponent':
				handleAddComponent(payload, requestId);
				break;
			case 'request:removeComponent':
				handleRemoveComponent(payload, requestId);
				break;
			case 'request:addWire':
				handleAddWire(payload, requestId);
				break;
			case 'request:removeWire':
				handleRemoveWire(payload, requestId);
				break;
			case 'request:moveComponent':
				handleMoveComponent(payload, requestId);
				break;
			case 'request:selectGraphAngle':
				handleSelectGraphAngle(payload, requestId);
				break;
			case 'request:beginEditGroup':
				handleBeginEditGroup(payload, requestId);
				break;
			case 'request:endEditGroup':
				handleEndEditGroup(payload, requestId);
				break;
			default:
				sendResponse(type.replace('request:', 'response:'), { success: false, error: `Unknown edit request type: ${type}` }, requestId);
				break;
		}
	}

	/**
	 * Check whether an edit group is currently active.
	 *
	 * @returns {boolean} True if an edit group is active
	 */
	function isEditGroupActive() {
		return editGroupActive;
	}

	/**
	 * Clean up resources (clear timers).
	 */
	function destroy() {
		clearEditGroupTimeout();
		editGroupActive = false;
	}

	return {
		handleEditRequest,
		isEditGroupActive,
		destroy,
	};
}

module.exports = {
	createEditHandler,
	EDIT_GROUP_TIMEOUT_MS,
};
