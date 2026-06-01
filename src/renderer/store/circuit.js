import { Circuit } from '@/models/Circuit';
import { VoltageSource } from '@/models/VoltageSource';
import { insertBlock as engineInsertBlock, tuneBlock as engineTuneBlock, dissolveBlock as engineDissolveBlock } from '@/blocks/InsertionEngine';

/**
 * Run simulation immediately whenever circuit changes
 */
function triggerSimulation(store) {
	console.log('[CIRCUIT] triggerSimulation called');
	const rootState = store.state || store.rootState;
	if (rootState && rootState.simulation && rootState.simulation.autoSimulate) {
		store.dispatch('simulation/runSimulation', null, { root: true });
	} else {
		console.log('[CIRCUIT] autoSimulate is off, skipping');
	}
}

/**
 * Debounced undo state for tuning operations.
 * Coalesces rapid parameter changes into a single undo entry.
 */
let tuningUndoTimer = null;
let tuningUndoSnapshot = null;
let tuningUndoComponentId = null;
const TUNING_UNDO_DEBOUNCE_MS = 1000;

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
			console.log('[PUSH_UNDO]', JSON.stringify(action, null, 2));
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
			console.log('[CLEAR_REDO] clearing', state.redoStack.length, 'redo entries');
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
		SET_CURVE_COLORS(state, { graphType, curveId, color }) {
			if (state.circuit) {
				if (!state.circuit.curveColors) {
					state.circuit.curveColors = { frequencyResponse: {}, impedance: {} };
				}
				if (!state.circuit.curveColors[graphType]) {
					state.circuit.curveColors[graphType] = {};
				}
				state.circuit.curveColors[graphType][curveId] = color;
				state.isDirty = true;
			}
		},
		SET_GRAPH_SETTINGS(state, { graphType, settings }) {
			if (state.circuit) {
				if (!state.circuit.graphSettings) {
					state.circuit.graphSettings = { frequencyResponse: {}, impedance: {} };
				}
				state.circuit.graphSettings[graphType] = settings;
				state.isDirty = true;
			}
		},
		// Block_Group mutations
		ADD_BLOCK_GROUP(state, blockGroup) {
			if (state.circuit) {
				if (!state.circuit.blockGroups) {
					state.circuit.blockGroups = [];
				}
				state.circuit.blockGroups.push(blockGroup);
				state.isDirty = true;
			}
		},
		REMOVE_BLOCK_GROUP(state, blockGroupId) {
			if (state.circuit && state.circuit.blockGroups) {
				const index = state.circuit.blockGroups.findIndex((group) => group.id === blockGroupId);
				if (index !== -1) {
					state.circuit.blockGroups.splice(index, 1);
					state.isDirty = true;
				}
			}
		},
		UPDATE_BLOCK_GROUP_VARIABLES(state, { blockGroupId, variables }) {
			if (state.circuit && state.circuit.blockGroups) {
				const blockGroup = state.circuit.blockGroups.find((group) => group.id === blockGroupId);
				if (blockGroup) {
					for (const variable of blockGroup.variables) {
						if (Object.prototype.hasOwnProperty.call(variables, variable.name)) {
							variable.value = variables[variable.name];
						}
					}
					state.isDirty = true;
				}
			}
		},
	},
	actions: {
		// Initialize a new circuit
		newFile({ commit, dispatch }) {
			const circuit = new Circuit();
			// Add default voltage source as per requirements
			const voltageSource = new VoltageSource(20, 40);
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

		// Load a Circuit object directly (preserves non-serialized data like embedded FRD/ZMA)
		loadCircuitObject({ commit, dispatch }, { circuit, filePath = null }) {
			commit('SET_CIRCUIT', circuit);
			commit('SET_FILE_PATH', filePath);
			commit('CLEAR_DIRTY');
			commit('CLEAR_UNDO');
			commit('CLEAR_REDO');

			// Trigger simulation after loading circuit
			dispatch('simulation/runSimulation', null, { root: true });
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
			triggerSimulation(this);
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
			triggerSimulation(this);
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
			triggerSimulation(this);
		},

		/**
		 * Update a component from the tune dialog with debounced undo.
		 * Applies the change immediately but coalesces rapid changes into
		 * a single undo entry.
		 */
		updateComponentTuning({ commit, state }, { componentId, updates }) {
			if (!state.circuit) return;

			const component = state.circuit.getComponent(componentId);
			if (!component) return;

			// If switching to a different component, flush the pending undo first
			if (tuningUndoSnapshot && tuningUndoComponentId !== componentId) {
				commit('PUSH_UNDO', {
					type: 'updateComponent',
					payload: { componentId: tuningUndoComponentId, updates: tuningUndoSnapshot },
				});
				commit('CLEAR_REDO');
				tuningUndoSnapshot = null;
				tuningUndoComponentId = null;
			}

			// On the first change in a burst, capture the "before" snapshot
			if (!tuningUndoSnapshot) {
				const previousValues = {};
				Object.keys(updates).forEach((key) => {
					previousValues[key] = JSON.parse(JSON.stringify(component[key]));
				});
				tuningUndoSnapshot = previousValues;
				tuningUndoComponentId = componentId;
			}

			// Apply the change immediately
			commit('UPDATE_COMPONENT', { componentId, updates });

			// Trigger simulation immediately
			triggerSimulation(this);

			// Reset the debounce timer
			if (tuningUndoTimer) {
				clearTimeout(tuningUndoTimer);
			}
			tuningUndoTimer = setTimeout(() => {
				// Timer fired — push the coalesced undo entry
				if (tuningUndoSnapshot) {
					commit('PUSH_UNDO', {
						type: 'updateComponent',
						payload: { componentId: tuningUndoComponentId, updates: tuningUndoSnapshot },
					});
					commit('CLEAR_REDO');
					tuningUndoSnapshot = null;
					tuningUndoComponentId = null;
				}
				tuningUndoTimer = null;
			}, TUNING_UNDO_DEBOUNCE_MS);
		},

		/**
		 * Flush any pending debounced tuning undo entry immediately.
		 * Call this when the tune dialog closes or before an undo operation.
		 */
		flushTuningUndo({ commit }) {
			if (tuningUndoTimer) {
				clearTimeout(tuningUndoTimer);
				tuningUndoTimer = null;
			}
			if (tuningUndoSnapshot) {
				commit('PUSH_UNDO', {
					type: 'updateComponent',
					payload: { componentId: tuningUndoComponentId, updates: tuningUndoSnapshot },
				});
				commit('CLEAR_REDO');
				tuningUndoSnapshot = null;
				tuningUndoComponentId = null;
			}
		},

		/**
		 * Insert a circuit block into the active circuit.
		 * Calls InsertionEngine, commits ADD_BLOCK_GROUP, and triggers simulation refresh.
		 * @param {Object} context - Vuex action context
		 * @param {Object} payload - { block, variables, insertionPoint }
		 */
		insertBlock({ state }, { block, variables, insertionPoint }) {
			if (!state.circuit) {
				return { success: false, error: 'No active circuit' };
			}

			const result = engineInsertBlock(state.circuit, block, variables, insertionPoint);
			if (!result.success) {
				return result;
			}

			// Force Vue reactivity by replacing the components array reference
			// The InsertionEngine already pushed components to the array, but Vue
			// may not detect deeply nested array mutations. Trigger reactivity:
			state.circuit.components = [...state.circuit.components];

			// Same for blockGroups
			if (state.circuit.blockGroups) {
				state.circuit.blockGroups = [...state.circuit.blockGroups];
			}

			state.isDirty = true;

			// Trigger simulation refresh
			triggerSimulation(this);

			return result;
		},

		/**
		 * Tune a block group with new variable values.
		 * Calls tuning logic, commits UPDATE_BLOCK_GROUP_VARIABLES, and triggers simulation refresh.
		 * @param {Object} context - Vuex action context
		 * @param {Object} payload - { blockGroupId, newVariables }
		 */
		tuneBlock({ commit, state }, { blockGroupId, newVariables }) {
			if (!state.circuit) {
				return { success: false, error: 'No active circuit' };
			}

			const result = engineTuneBlock(state.circuit, blockGroupId, newVariables);
			if (!result.success) {
				return result;
			}

			// The tuneBlock engine directly mutated component.parameters values,
			// which Vue's reactivity may not detect. Force reactivity by committing
			// UPDATE_COMPONENT for each affected component.
			const blockGroup = state.circuit.blockGroups.find((g) => g.id === blockGroupId);
			if (blockGroup) {
				for (const componentId of blockGroup.componentIds) {
					const component = state.circuit.getComponent(componentId);
					if (component) {
						commit('UPDATE_COMPONENT', {
							componentId,
							updates: { parameters: { ...component.parameters } },
						});
					}
				}
			}

			state.isDirty = true;

			// Trigger simulation refresh
			triggerSimulation(this);

			return result;
		},

		/**
		 * Dissolve a block group into independent components.
		 * Calls dissolution logic and commits REMOVE_BLOCK_GROUP.
		 * @param {Object} context - Vuex action context
		 * @param {Object} payload - { blockGroupId }
		 */
		dissolveBlock({ state }, { blockGroupId }) {
			if (!state.circuit) {
				return { success: false, error: 'No active circuit' };
			}

			const result = engineDissolveBlock(state.circuit, blockGroupId);
			if (!result.success) {
				return result;
			}

			// The dissolveBlock engine already removed the blockGroup from the circuit.
			// We just need to mark dirty.
			state.isDirty = true;

			return result;
		},

		addWire({ commit }, wire) {
			const undoAction = {
				type: 'removeWire',
				payload: wire.id,
			};
			commit('PUSH_UNDO', undoAction);
			commit('CLEAR_REDO');
			commit('ADD_WIRE', wire);

			// Trigger debounced simulation
			triggerSimulation(this);
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
			triggerSimulation(this);
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
		undo({ commit, state, dispatch }) {
			// Flush any pending tuning undo so it's on the stack before we pop
			dispatch('flushTuningUndo');

			if (state.undoStack.length === 0 || !state.circuit) return;

			const action = state.undoStack[state.undoStack.length - 1];
			commit('POP_UNDO');

			console.log('[UNDO]', action.type, action.type === 'batch' ? `(${action.payload.length} sub-actions)` : '', action.payload);

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
				case 'batch': {
					// Batch undo: execute all sub-actions in reverse order
					const redoSubActions = [];
					const subActions = [...action.payload].reverse();
					for (const subAction of subActions) {
						if (subAction.type === 'addComponent') {
							// Re-add the component using Circuit.deserializeComponent
							const componentData = subAction.payload;
							const comp = Circuit.deserializeComponent(componentData);
							if (comp) {
								state.circuit.components.push(comp);
								redoSubActions.push({ type: 'removeComponent', payload: comp.id });
							}
						} else if (subAction.type === 'removeComponent') {
							const comp = state.circuit.getComponent(subAction.payload);
							if (comp) {
								redoSubActions.push({
									type: 'addComponent',
									payload: JSON.parse(JSON.stringify(comp.toJSON ? comp.toJSON() : comp)),
								});
								state.circuit.removeComponent(subAction.payload);
							}
						} else if (subAction.type === 'updateComponent') {
							const comp = state.circuit.getComponent(subAction.payload.componentId);
							if (comp) {
								const currentValues = {};
								Object.keys(subAction.payload.updates).forEach((key) => {
									currentValues[key] = JSON.parse(JSON.stringify(comp[key]));
								});
								redoSubActions.push({
									type: 'updateComponent',
									payload: { componentId: subAction.payload.componentId, updates: currentValues },
								});
								state.circuit.updateComponent(subAction.payload.componentId, subAction.payload.updates);
							}
						}
					}
					redoAction = { type: 'batch', payload: redoSubActions };
					shouldTriggerSimulation = true;
					// Force reactivity
					state.circuit.components = [...state.circuit.components];
					break;
				}
				case 'dissolveBlock': {
					// Undo dissolution: re-add the block group
					if (!state.circuit.blockGroups) {
						state.circuit.blockGroups = [];
					}
					state.circuit.blockGroups.push(action.payload);
					redoAction = { type: 'dissolveBlock', payload: action.payload };
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
				triggerSimulation(this);
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
				case 'batch': {
					// Batch redo: execute all sub-actions in order
					const undoSubActions = [];
					for (const subAction of action.payload) {
						if (subAction.type === 'removeComponent') {
							const comp = state.circuit.getComponent(subAction.payload);
							if (comp) {
								undoSubActions.push({
									type: 'addComponent',
									payload: JSON.parse(JSON.stringify(comp.toJSON ? comp.toJSON() : comp)),
								});
								state.circuit.removeComponent(subAction.payload);
							}
						} else if (subAction.type === 'addComponent') {
							const componentData = subAction.payload;
							const comp = Circuit.deserializeComponent(componentData);
							if (comp) {
								state.circuit.components.push(comp);
								undoSubActions.push({ type: 'removeComponent', payload: comp.id });
							}
						} else if (subAction.type === 'updateComponent') {
							const comp = state.circuit.getComponent(subAction.payload.componentId);
							if (comp) {
								const currentValues = {};
								Object.keys(subAction.payload.updates).forEach((key) => {
									currentValues[key] = JSON.parse(JSON.stringify(comp[key]));
								});
								undoSubActions.push({
									type: 'updateComponent',
									payload: { componentId: subAction.payload.componentId, updates: currentValues },
								});
								state.circuit.updateComponent(subAction.payload.componentId, subAction.payload.updates);
							}
						}
					}
					undoAction = { type: 'batch', payload: undoSubActions };
					shouldTriggerSimulation = true;
					state.circuit.components = [...state.circuit.components];
					break;
				}
				case 'dissolveBlock': {
					// Redo dissolution: remove the block group again
					if (state.circuit.blockGroups) {
						const index = state.circuit.blockGroups.findIndex((g) => g.id === action.payload.id);
						if (index !== -1) {
							state.circuit.blockGroups.splice(index, 1);
						}
					}
					undoAction = { type: 'dissolveBlock', payload: action.payload };
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
				triggerSimulation(this);
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
		getCurveColors: (state) => (graphType) => {
			if (!state.circuit || !state.circuit.curveColors) return {};
			return state.circuit.curveColors[graphType] || {};
		},
		/**
		 * Get the BlockGroup that contains a given component.
		 * @param {Object} state - Vuex state
		 * @returns {Function} Function that takes componentId and returns the BlockGroup or null
		 */
		getBlockGroupForComponent: (state) => (componentId) => {
			if (!state.circuit || !state.circuit.blockGroups) return null;
			return state.circuit.blockGroups.find(
				(group) => group.componentIds.includes(componentId)
					|| group.wireSegmentIds.includes(componentId),
			) || null;
		},
		/**
		 * Get all component and wire segment IDs in a block group.
		 * @param {Object} state - Vuex state
		 * @returns {Function} Function that takes blockGroupId and returns array of IDs
		 */
		getBlockGroupComponentIds: (state) => (blockGroupId) => {
			if (!state.circuit || !state.circuit.blockGroups) return [];
			const group = state.circuit.blockGroups.find((g) => g.id === blockGroupId);
			if (!group) return [];
			return [...group.componentIds, ...group.wireSegmentIds];
		},
	},
};
