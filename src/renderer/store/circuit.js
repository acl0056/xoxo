import { Circuit } from '@/models/Circuit';
import { VoltageSource } from '@/models/VoltageSource';

// Debounce timer for auto-simulation
let simulationDebounceTimer = null;
const SIMULATION_DEBOUNCE_DELAY = 300; // milliseconds

/**
 * Trigger debounced simulation
 * This function will be called whenever circuit parameters change
 * @param {Object} store - Vuex store instance
 */
function triggerDebouncedSimulation(store) {
	// Clear any existing timer
	if (simulationDebounceTimer) {
		clearTimeout(simulationDebounceTimer);
	}

	// Set a new timer to run simulation after delay
	simulationDebounceTimer = setTimeout(() => {
		// Check if auto-simulate is enabled
		// Access the root state through the store's state property
		const rootState = store.state || store.rootState;
		if (rootState && rootState.simulation && rootState.simulation.autoSimulate) {
			store.dispatch('simulation/runSimulation', null, { root: true });
		}
		simulationDebounceTimer = null;
	}, SIMULATION_DEBOUNCE_DELAY);
}

export default {
	namespaced: true,
	state: {
		circuit: null, // Circuit instance
		undoStack: [],
		redoStack: [],
		isDirty: false, // Unsaved changes flag
		currentFilePath: null, // Path to the currently loaded file
		recentFiles: [], // Array of recently opened file paths
	},
	mutations: {
		// Circuit mutations
		SET_CIRCUIT(state, circuit) {
			state.circuit = circuit;
		},
		// Component mutations
		ADD_COMPONENT(state, component) {
			if (state.circuit) {
				state.circuit.addComponent(component);
				state.isDirty = true;
			}
		},
		REMOVE_COMPONENT(state, componentId) {
			if (state.circuit) {
				state.circuit.removeComponent(componentId);
				state.isDirty = true;
			}
		},
		UPDATE_COMPONENT(state, { componentId, updates }) {
			if (state.circuit) {
				state.circuit.updateComponent(componentId, updates);
				state.isDirty = true;
			}
		},
		// Wire mutations
		ADD_WIRE(state, wire) {
			if (state.circuit) {
				state.circuit.addWire(wire);
				state.isDirty = true;
			}
		},
		REMOVE_WIRE(state, wireId) {
			if (state.circuit) {
				state.circuit.removeWire(wireId);
				state.isDirty = true;
			}
		},
		// Annotation mutations
		ADD_ANNOTATION(state, annotation) {
			if (state.circuit) {
				state.circuit.addAnnotation(annotation);
				state.isDirty = true;
			}
		},
		REMOVE_ANNOTATION(state, annotationId) {
			if (state.circuit) {
				state.circuit.removeAnnotation(annotationId);
				state.isDirty = true;
			}
		},
		UPDATE_ANNOTATION(state, { annotationId, updates }) {
			if (state.circuit) {
				state.circuit.updateAnnotation(annotationId, updates);
				state.isDirty = true;
			}
		},
		// Undo/Redo mutations
		PUSH_UNDO(state, action) {
			state.undoStack.push(action);
		},
		POP_UNDO(state) {
			return state.undoStack.pop();
		},
		CLEAR_UNDO(state) {
			state.undoStack = [];
		},
		PUSH_REDO(state, action) {
			state.redoStack.push(action);
		},
		POP_REDO(state) {
			return state.redoStack.pop();
		},
		CLEAR_REDO(state) {
			state.redoStack = [];
		},
		// File operation mutations
		SET_DIRTY(state, isDirty) {
			state.isDirty = isDirty;
		},
		CLEAR_DIRTY(state) {
			state.isDirty = false;
		},
		SET_FILE_PATH(state, filePath) {
			state.currentFilePath = filePath;
		},
		ADD_RECENT_FILE(state, filePath) {
			// Remove the file if it already exists in the list
			state.recentFiles = state.recentFiles.filter((f) => f !== filePath);
			// Add to the beginning of the list
			state.recentFiles.unshift(filePath);
			// Keep only the last 10 files
			if (state.recentFiles.length > 10) {
				state.recentFiles = state.recentFiles.slice(0, 10);
			}
		},
	},
	actions: {
		// Initialize a new circuit
		newFile({ commit, dispatch }) {
			const circuit = new Circuit();
			// Add default voltage source as per requirements
			const voltageSource = new VoltageSource(10, 20);
			circuit.addComponent(voltageSource);

			commit('SET_CIRCUIT', circuit);
			commit('SET_FILE_PATH', null);
			commit('CLEAR_DIRTY');
			commit('CLEAR_UNDO');
			commit('CLEAR_REDO');

			// Trigger initial simulation
			dispatch('simulation/runSimulation', null, { root: true });
		},

		// Load a circuit from file
		async loadFile({ commit, dispatch }, { filePath, circuitData }) {
			try {
				const circuit = Circuit.fromJSON(circuitData);
				commit('SET_CIRCUIT', circuit);
				commit('SET_FILE_PATH', filePath);
				commit('ADD_RECENT_FILE', filePath);
				commit('CLEAR_DIRTY');
				commit('CLEAR_UNDO');
				commit('CLEAR_REDO');

				// Trigger simulation after loading circuit
				dispatch('simulation/runSimulation', null, { root: true });

				return { success: true };
			} catch (error) {
				return { success: false, error: error.message };
			}
		},

		// Save the current circuit
		async saveFile({ state, commit }, filePath) {
			if (!state.circuit) {
				return { success: false, error: 'No circuit to save' };
			}

			try {
				const circuitData = state.circuit.toJSON();
				commit('SET_FILE_PATH', filePath);
				commit('ADD_RECENT_FILE', filePath);
				commit('CLEAR_DIRTY');
				return { success: true, data: circuitData };
			} catch (error) {
				return { success: false, error: error.message };
			}
		},

		// Undoable actions for components
		addComponent({ commit, state }, component) {
			if (!state.circuit) return;

			// Record the action for undo
			const undoAction = {
				type: 'removeComponent',
				payload: component.id,
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('ADD_COMPONENT', component);

			// Trigger debounced simulation
			triggerDebouncedSimulation(this);
		},
		removeComponent({ commit, state }, componentId) {
			if (!state.circuit) return;

			// Find the component to save its state for undo
			const component = state.circuit.getComponent(componentId);
			if (!component) return;

			const undoAction = {
				type: 'addComponent',
				payload: JSON.parse(JSON.stringify(component.toJSON ? component.toJSON() : component)),
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('REMOVE_COMPONENT', componentId);

			// Trigger debounced simulation
			triggerDebouncedSimulation(this);
		},
		updateComponent({ commit, state }, { componentId, updates }) {
			if (!state.circuit) return;

			// Find the component to save its previous state
			const component = state.circuit.getComponent(componentId);
			if (!component) return;

			// Save the previous values of the fields being updated
			const previousValues = {};
			Object.keys(updates).forEach((key) => {
				previousValues[key] = JSON.parse(JSON.stringify(component[key]));
			});

			const undoAction = {
				type: 'updateComponent',
				payload: { componentId, updates: previousValues },
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('UPDATE_COMPONENT', { componentId, updates });

			// Trigger debounced simulation
			triggerDebouncedSimulation(this);
		},
		// Undoable actions for wires
		addWire({ commit }, wire) {
			const undoAction = {
				type: 'removeWire',
				payload: wire.id,
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('ADD_WIRE', wire);

			// Trigger debounced simulation
			triggerDebouncedSimulation(this);
		},
		removeWire({ commit, state }, wireId) {
			if (!state.circuit) return;

			const wire = state.circuit.getWire(wireId);
			if (!wire) return;

			const undoAction = {
				type: 'addWire',
				payload: JSON.parse(JSON.stringify(wire.toJSON ? wire.toJSON() : wire)),
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('REMOVE_WIRE', wireId);

			// Trigger debounced simulation
			triggerDebouncedSimulation(this);
		},
		// Undoable actions for annotations
		addAnnotation({ commit }, annotation) {
			const undoAction = {
				type: 'removeAnnotation',
				payload: annotation.id,
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('ADD_ANNOTATION', annotation);
		},
		removeAnnotation({ commit, state }, annotationId) {
			if (!state.circuit) return;

			const annotation = state.circuit.getAnnotation(annotationId);
			if (!annotation) return;

			const undoAction = {
				type: 'addAnnotation',
				payload: JSON.parse(JSON.stringify(annotation.toJSON ? annotation.toJSON() : annotation)),
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('REMOVE_ANNOTATION', annotationId);
		},
		updateAnnotation({ commit, state }, { annotationId, updates }) {
			if (!state.circuit) return;

			const annotation = state.circuit.getAnnotation(annotationId);
			if (!annotation) return;

			const previousValues = {};
			Object.keys(updates).forEach((key) => {
				previousValues[key] = JSON.parse(JSON.stringify(annotation[key]));
			});

			const undoAction = {
				type: 'updateAnnotation',
				payload: { annotationId, updates: previousValues },
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('UPDATE_ANNOTATION', { annotationId, updates });
		},
		// Undo action
		undo({ commit, state }) {
			if (state.undoStack.length === 0 || !state.circuit) return;

			const action = state.undoStack[state.undoStack.length - 1];
			commit('POP_UNDO');

			// Create the redo action (inverse of the undo action)
			let redoAction;
			let shouldTriggerSimulation = false;
			switch (action.type) {
				case 'addComponent': {
					const component = state.circuit.getComponent(action.payload.id);
					if (component) {
						redoAction = {
							type: 'removeComponent',
							payload: component.id,
						};
						commit('REMOVE_COMPONENT', action.payload.id);
					}
					commit('ADD_COMPONENT', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'removeComponent': {
					const component = state.circuit.getComponent(action.payload);
					if (component) {
						redoAction = {
							type: 'addComponent',
							payload: JSON.parse(JSON.stringify(component.toJSON ? component.toJSON() : component)),
						};
					}
					commit('REMOVE_COMPONENT', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'updateComponent': {
					const component = state.circuit.getComponent(action.payload.componentId);
					if (component) {
						const currentValues = {};
						Object.keys(action.payload.updates).forEach((key) => {
							currentValues[key] = JSON.parse(JSON.stringify(component[key]));
						});
						redoAction = {
							type: 'updateComponent',
							payload: { componentId: action.payload.componentId, updates: currentValues },
						};
					}
					commit('UPDATE_COMPONENT', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'addWire': {
					const wire = state.circuit.getWire(action.payload.id);
					if (wire) {
						redoAction = {
							type: 'removeWire',
							payload: wire.id,
						};
						commit('REMOVE_WIRE', action.payload.id);
					}
					commit('ADD_WIRE', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'removeWire': {
					const wire = state.circuit.getWire(action.payload);
					if (wire) {
						redoAction = {
							type: 'addWire',
							payload: JSON.parse(JSON.stringify(wire.toJSON ? wire.toJSON() : wire)),
						};
					}
					commit('REMOVE_WIRE', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'addAnnotation': {
					const annotation = state.circuit.getAnnotation(action.payload.id);
					if (annotation) {
						redoAction = {
							type: 'removeAnnotation',
							payload: annotation.id,
						};
						commit('REMOVE_ANNOTATION', action.payload.id);
					}
					commit('ADD_ANNOTATION', action.payload);
					// Annotations don't affect simulation
					break;
				}
				case 'removeAnnotation': {
					const annotation = state.circuit.getAnnotation(action.payload);
					if (annotation) {
						redoAction = {
							type: 'addAnnotation',
							payload: JSON.parse(JSON.stringify(annotation.toJSON ? annotation.toJSON() : annotation)),
						};
					}
					commit('REMOVE_ANNOTATION', action.payload);
					// Annotations don't affect simulation
					break;
				}
				case 'updateAnnotation': {
					const annotation = state.circuit.getAnnotation(action.payload.annotationId);
					if (annotation) {
						const currentValues = {};
						Object.keys(action.payload.updates).forEach((key) => {
							currentValues[key] = JSON.parse(JSON.stringify(annotation[key]));
						});
						redoAction = {
							type: 'updateAnnotation',
							payload: { annotationId: action.payload.annotationId, updates: currentValues },
						};
					}
					commit('UPDATE_ANNOTATION', action.payload);
					// Annotations don't affect simulation
					break;
				}
				default:
					break;
			}

			if (redoAction) {
				commit('PUSH_REDO', redoAction);
			}

			// Trigger debounced simulation if needed
			if (shouldTriggerSimulation) {
				triggerDebouncedSimulation(this);
			}
		},
		// Redo action
		redo({ commit, state }) {
			if (state.redoStack.length === 0 || !state.circuit) return;

			const action = state.redoStack[state.redoStack.length - 1];
			commit('POP_REDO');

			// Create the undo action (inverse of the redo action)
			let undoAction;
			let shouldTriggerSimulation = false;
			switch (action.type) {
				case 'addComponent': {
					undoAction = {
						type: 'removeComponent',
						payload: action.payload.id,
					};
					commit('ADD_COMPONENT', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'removeComponent': {
					const component = state.circuit.getComponent(action.payload);
					if (component) {
						undoAction = {
							type: 'addComponent',
							payload: JSON.parse(JSON.stringify(component.toJSON ? component.toJSON() : component)),
						};
					}
					commit('REMOVE_COMPONENT', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'updateComponent': {
					const component = state.circuit.getComponent(action.payload.componentId);
					if (component) {
						const currentValues = {};
						Object.keys(action.payload.updates).forEach((key) => {
							currentValues[key] = JSON.parse(JSON.stringify(component[key]));
						});
						undoAction = {
							type: 'updateComponent',
							payload: { componentId: action.payload.componentId, updates: currentValues },
						};
					}
					commit('UPDATE_COMPONENT', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'addWire': {
					undoAction = {
						type: 'removeWire',
						payload: action.payload.id,
					};
					commit('ADD_WIRE', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'removeWire': {
					const wire = state.circuit.getWire(action.payload);
					if (wire) {
						undoAction = {
							type: 'addWire',
							payload: JSON.parse(JSON.stringify(wire.toJSON ? wire.toJSON() : wire)),
						};
					}
					commit('REMOVE_WIRE', action.payload);
					shouldTriggerSimulation = true;
					break;
				}
				case 'addAnnotation': {
					undoAction = {
						type: 'removeAnnotation',
						payload: action.payload.id,
					};
					commit('ADD_ANNOTATION', action.payload);
					// Annotations don't affect simulation
					break;
				}
				case 'removeAnnotation': {
					const annotation = state.circuit.getAnnotation(action.payload);
					if (annotation) {
						undoAction = {
							type: 'addAnnotation',
							payload: JSON.parse(JSON.stringify(annotation.toJSON ? annotation.toJSON() : annotation)),
						};
					}
					commit('REMOVE_ANNOTATION', action.payload);
					// Annotations don't affect simulation
					break;
				}
				case 'updateAnnotation': {
					const annotation = state.circuit.getAnnotation(action.payload.annotationId);
					if (annotation) {
						const currentValues = {};
						Object.keys(action.payload.updates).forEach((key) => {
							currentValues[key] = JSON.parse(JSON.stringify(annotation[key]));
						});
						undoAction = {
							type: 'updateAnnotation',
							payload: { annotationId: action.payload.annotationId, updates: currentValues },
						};
					}
					commit('UPDATE_ANNOTATION', action.payload);
					// Annotations don't affect simulation
					break;
				}
				default:
					break;
			}

			if (undoAction) {
				commit('PUSH_UNDO', undoAction);
			}

			// Trigger debounced simulation if needed
			if (shouldTriggerSimulation) {
				triggerDebouncedSimulation(this);
			}
		},
	},
	getters: {
		getCircuit: (state) => state.circuit,
		getComponentById: (state) => (componentId) => {
			if (!state.circuit) return null;
			return state.circuit.getComponent(componentId);
		},
		getWireById: (state) => (wireId) => {
			if (!state.circuit) return null;
			return state.circuit.getWire(wireId);
		},
		isDirty: (state) => state.isDirty,
		getCurrentFilePath: (state) => state.currentFilePath,
		getRecentFiles: (state) => state.recentFiles,
		canUndo: (state) => state.undoStack.length > 0,
		canRedo: (state) => state.redoStack.length > 0,
	},
};
