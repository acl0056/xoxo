export default {
	namespaced: true,
	state: {
		components: [],
		wires: [],
		nodes: [],
		annotations: [],
		metadata: {
			name: '',
			created: null,
			modified: null,
			version: '1.0',
		},
		undoStack: [],
		redoStack: [],
	},
	mutations: {
		// Component mutations
		addComponent(state, component) {
			state.components.push(component);
		},
		removeComponent(state, componentId) {
			state.components = state.components.filter((component) => component.id !== componentId);
		},
		updateComponent(state, { componentId, updates }) {
			const component = state.components.find((c) => c.id === componentId);
			if (component) {
				Object.assign(component, updates);
			}
		},
		// Wire mutations
		addWire(state, wire) {
			state.wires.push(wire);
		},
		removeWire(state, wireId) {
			state.wires = state.wires.filter((wire) => wire.id !== wireId);
		},
		// Annotation mutations
		addAnnotation(state, annotation) {
			state.annotations.push(annotation);
		},
		removeAnnotation(state, annotationId) {
			state.annotations = state.annotations.filter((annotation) => annotation.id !== annotationId);
		},
		updateAnnotation(state, { annotationId, updates }) {
			const annotation = state.annotations.find((a) => a.id === annotationId);
			if (annotation) {
				Object.assign(annotation, updates);
			}
		},
		// Metadata mutations
		updateMetadata(state, metadata) {
			state.metadata = { ...state.metadata, ...metadata };
		},
		// Undo/Redo mutations
		pushUndo(state, action) {
			state.undoStack.push(action);
		},
		popUndo(state) {
			return state.undoStack.pop();
		},
		clearUndoStack(state) {
			state.undoStack = [];
		},
		pushRedo(state, action) {
			state.redoStack.push(action);
		},
		popRedo(state) {
			return state.redoStack.pop();
		},
		clearRedoStack(state) {
			state.redoStack = [];
		},
	},
	actions: {
		// Undoable actions for components
		addComponentWithUndo({ commit }, component) {
			// Record the action for undo
			const undoAction = {
				type: 'removeComponent',
				payload: component.id,
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('addComponent', component);
		},
		removeComponentWithUndo({ commit, state }, componentId) {
			// Find the component to save its state for undo
			const component = state.components.find((c) => c.id === componentId);
			if (!component) return;

			const undoAction = {
				type: 'addComponent',
				payload: JSON.parse(JSON.stringify(component)), // Deep clone
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('removeComponent', componentId);
		},
		updateComponentWithUndo({ commit, state }, { componentId, updates }) {
			// Find the component to save its previous state
			const component = state.components.find((c) => c.id === componentId);
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
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('updateComponent', { componentId, updates });
		},
		// Undoable actions for wires
		addWireWithUndo({ commit }, wire) {
			const undoAction = {
				type: 'removeWire',
				payload: wire.id,
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('addWire', wire);
		},
		removeWireWithUndo({ commit, state }, wireId) {
			const wire = state.wires.find((w) => w.id === wireId);
			if (!wire) return;

			const undoAction = {
				type: 'addWire',
				payload: JSON.parse(JSON.stringify(wire)),
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('removeWire', wireId);
		},
		// Undoable actions for annotations
		addAnnotationWithUndo({ commit }, annotation) {
			const undoAction = {
				type: 'removeAnnotation',
				payload: annotation.id,
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('addAnnotation', annotation);
		},
		removeAnnotationWithUndo({ commit, state }, annotationId) {
			const annotation = state.annotations.find((a) => a.id === annotationId);
			if (!annotation) return;

			const undoAction = {
				type: 'addAnnotation',
				payload: JSON.parse(JSON.stringify(annotation)),
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('removeAnnotation', annotationId);
		},
		updateAnnotationWithUndo({ commit, state }, { annotationId, updates }) {
			const annotation = state.annotations.find((a) => a.id === annotationId);
			if (!annotation) return;

			const previousValues = {};
			Object.keys(updates).forEach((key) => {
				previousValues[key] = JSON.parse(JSON.stringify(annotation[key]));
			});

			const undoAction = {
				type: 'updateAnnotation',
				payload: { annotationId, updates: previousValues },
			};
			commit('pushUndo', undoAction);
			commit('clearRedoStack');
			commit('updateAnnotation', { annotationId, updates });
		},
		// Undo action
		undo({ commit, state }) {
			if (state.undoStack.length === 0) return;

			const action = state.undoStack[state.undoStack.length - 1];
			commit('popUndo');

			// Create the redo action (inverse of the undo action)
			let redoAction;
			switch (action.type) {
				case 'addComponent': {
					redoAction = {
						type: 'removeComponent',
						payload: action.payload.id,
					};
					commit('removeComponent', action.payload.id);
					commit('addComponent', action.payload);
					break;
				}
				case 'removeComponent': {
					const component = state.components.find((c) => c.id === action.payload);
					if (component) {
						redoAction = {
							type: 'addComponent',
							payload: JSON.parse(JSON.stringify(component)),
						};
					}
					commit('removeComponent', action.payload);
					break;
				}
				case 'updateComponent': {
					const component = state.components.find((c) => c.id === action.payload.componentId);
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
					commit('updateComponent', action.payload);
					break;
				}
				case 'addWire': {
					redoAction = {
						type: 'removeWire',
						payload: action.payload.id,
					};
					commit('removeWire', action.payload.id);
					commit('addWire', action.payload);
					break;
				}
				case 'removeWire': {
					const wire = state.wires.find((w) => w.id === action.payload);
					if (wire) {
						redoAction = {
							type: 'addWire',
							payload: JSON.parse(JSON.stringify(wire)),
						};
					}
					commit('removeWire', action.payload);
					break;
				}
				case 'addAnnotation': {
					redoAction = {
						type: 'removeAnnotation',
						payload: action.payload.id,
					};
					commit('removeAnnotation', action.payload.id);
					commit('addAnnotation', action.payload);
					break;
				}
				case 'removeAnnotation': {
					const annotation = state.annotations.find((a) => a.id === action.payload);
					if (annotation) {
						redoAction = {
							type: 'addAnnotation',
							payload: JSON.parse(JSON.stringify(annotation)),
						};
					}
					commit('removeAnnotation', action.payload);
					break;
				}
				case 'updateAnnotation': {
					const annotation = state.annotations.find((a) => a.id === action.payload.annotationId);
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
					commit('updateAnnotation', action.payload);
					break;
				}
				default:
					break;
			}

			if (redoAction) {
				commit('pushRedo', redoAction);
			}
		},
		// Redo action
		redo({ commit, state }) {
			if (state.redoStack.length === 0) return;

			const action = state.redoStack[state.redoStack.length - 1];
			commit('popRedo');

			// Create the undo action (inverse of the redo action)
			let undoAction;
			switch (action.type) {
				case 'addComponent': {
					undoAction = {
						type: 'removeComponent',
						payload: action.payload.id,
					};
					commit('addComponent', action.payload);
					break;
				}
				case 'removeComponent': {
					const component = state.components.find((c) => c.id === action.payload);
					if (component) {
						undoAction = {
							type: 'addComponent',
							payload: JSON.parse(JSON.stringify(component)),
						};
					}
					commit('removeComponent', action.payload);
					break;
				}
				case 'updateComponent': {
					const component = state.components.find((c) => c.id === action.payload.componentId);
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
					commit('updateComponent', action.payload);
					break;
				}
				case 'addWire': {
					undoAction = {
						type: 'removeWire',
						payload: action.payload.id,
					};
					commit('addWire', action.payload);
					break;
				}
				case 'removeWire': {
					const wire = state.wires.find((w) => w.id === action.payload);
					if (wire) {
						undoAction = {
							type: 'addWire',
							payload: JSON.parse(JSON.stringify(wire)),
						};
					}
					commit('removeWire', action.payload);
					break;
				}
				case 'addAnnotation': {
					undoAction = {
						type: 'removeAnnotation',
						payload: action.payload.id,
					};
					commit('addAnnotation', action.payload);
					break;
				}
				case 'removeAnnotation': {
					const annotation = state.annotations.find((a) => a.id === action.payload);
					if (annotation) {
						undoAction = {
							type: 'addAnnotation',
							payload: JSON.parse(JSON.stringify(annotation)),
						};
					}
					commit('removeAnnotation', action.payload);
					break;
				}
				case 'updateAnnotation': {
					const annotation = state.annotations.find((a) => a.id === action.payload.annotationId);
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
					commit('updateAnnotation', action.payload);
					break;
				}
				default:
					break;
			}

			if (undoAction) {
				commit('pushUndo', undoAction);
			}
		},
	},
	getters: {
		getComponentById: (state) => (componentId) => state.components.find((c) => c.id === componentId),
		getWireById: (state) => (wireId) => state.wires.find((w) => w.id === wireId),
	},
};
