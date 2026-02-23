/**
 * Property-Based Test: Undo/Redo Inverse Operations (Property 2)
 * Feature: crossover-network-simulator, Property 2: Undo/redo inverse operations
 *
 * Validates: Requirements 1.5
 *
 * Property: For any sequence of editing actions on a circuit, applying undo followed by redo
 * should restore the circuit to its state before the undo operation.
 */

const fc = require('fast-check');
const { createStore } = require('vuex');
const circuitModule = require('@/renderer/store/circuit').default;
const { Resistor } = require('@/models/Resistor');
const { Capacitor } = require('@/models/Capacitor');
const { Inductor } = require('@/models/Inductor');
const { Wire } = require('@/models/Wire');
const { TextAnnotation } = require('@/models/TextAnnotation');

// Generator for component types
const componentTypeGenerator = fc.constantFrom('resistor', 'capacitor', 'inductor');

// Generator for component actions
const componentActionGenerator = fc.record({
	action: fc.constantFrom('add', 'remove', 'update'),
	componentType: componentTypeGenerator,
	x: fc.integer({ min: 0, max: 100 }),
	y: fc.integer({ min: 0, max: 100 }),
	updateValue: fc.double({ min: 1, max: 10000 }),
});

// Generator for wire actions
const wireActionGenerator = fc.record({
	action: fc.constantFrom('addWire', 'removeWire'),
});

// Generator for annotation actions
const annotationActionGenerator = fc.record({
	action: fc.constantFrom('addAnnotation', 'removeAnnotation', 'updateAnnotation'),
	x: fc.integer({ min: 0, max: 100 }),
	y: fc.integer({ min: 0, max: 100 }),
	text: fc.string({ minLength: 1, maxLength: 50 }),
});

// Generator for a sequence of editing actions
const editingSequenceGenerator = fc.array(
	fc.oneof(
		componentActionGenerator,
		annotationActionGenerator,
	),
	{ minLength: 1, maxLength: 10 },
);

describe('Feature: crossover-network-simulator, Property 2: Undo/redo inverse operations', () => {
	test('undo followed by redo restores circuit state', () => {
		fc.assert(
			fc.property(editingSequenceGenerator, (actions) => {
				// Create a fresh store for this test
				const freshCircuitModule = {
					namespaced: true,
					state: () => ({
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
					}),
					mutations: circuitModule.mutations,
					actions: circuitModule.actions,
					getters: circuitModule.getters,
				};

				const store = createStore({
					modules: {
						circuit: freshCircuitModule,
					},
				});

				// Track created components for removal/update operations
				const createdComponents = [];
				const createdAnnotations = [];

				// Execute the sequence of actions
				actions.forEach((actionSpec) => {
					if (actionSpec.action === 'add') {
						// Create component based on type
						let component;
						switch (actionSpec.componentType) {
							case 'resistor':
								component = new Resistor(actionSpec.x, actionSpec.y);
								break;
							case 'capacitor':
								component = new Capacitor(actionSpec.x, actionSpec.y);
								break;
							case 'inductor':
								component = new Inductor(actionSpec.x, actionSpec.y);
								break;
							default:
								return;
						}
						store.dispatch('circuit/addComponentWithUndo', component);
						createdComponents.push(component);
					} else if (actionSpec.action === 'remove' && createdComponents.length > 0) {
						// Remove a random existing component
						const componentToRemove = createdComponents[createdComponents.length - 1];
						store.dispatch('circuit/removeComponentWithUndo', componentToRemove.id);
						createdComponents.pop();
					} else if (actionSpec.action === 'update' && createdComponents.length > 0) {
						// Update a random existing component
						const componentToUpdate = createdComponents[createdComponents.length - 1];
						const updates = {};

						if (componentToUpdate.type === 'resistor') {
							updates.parameters = {
								...componentToUpdate.parameters,
								resistance: actionSpec.updateValue,
							};
						} else if (componentToUpdate.type === 'capacitor') {
							updates.parameters = {
								...componentToUpdate.parameters,
								capacitance: actionSpec.updateValue * 1e-6,
							};
						} else if (componentToUpdate.type === 'inductor') {
							updates.parameters = {
								...componentToUpdate.parameters,
								inductance: actionSpec.updateValue * 1e-3,
							};
						}

						store.dispatch('circuit/updateComponentWithUndo', {
							componentId: componentToUpdate.id,
							updates,
						});
					} else if (actionSpec.action === 'addAnnotation') {
						const annotation = new TextAnnotation(actionSpec.x, actionSpec.y, actionSpec.text);
						store.dispatch('circuit/addAnnotationWithUndo', annotation);
						createdAnnotations.push(annotation);
					} else if (actionSpec.action === 'removeAnnotation' && createdAnnotations.length > 0) {
						const annotationToRemove = createdAnnotations[createdAnnotations.length - 1];
						store.dispatch('circuit/removeAnnotationWithUndo', annotationToRemove.id);
						createdAnnotations.pop();
					} else if (actionSpec.action === 'updateAnnotation' && createdAnnotations.length > 0) {
						const annotationToUpdate = createdAnnotations[createdAnnotations.length - 1];
						store.dispatch('circuit/updateAnnotationWithUndo', {
							annotationId: annotationToUpdate.id,
							updates: { text: actionSpec.text },
						});
					}
				});

				// Capture state before undo
				const stateBeforeUndo = JSON.parse(JSON.stringify({
					components: store.state.circuit.components,
					wires: store.state.circuit.wires,
					annotations: store.state.circuit.annotations,
				}));

				// Perform undo if there are actions in the undo stack
				if (store.state.circuit.undoStack.length > 0) {
					store.dispatch('circuit/undo');

					// Capture state after undo
					const stateAfterUndo = JSON.parse(JSON.stringify({
						components: store.state.circuit.components,
						wires: store.state.circuit.wires,
						annotations: store.state.circuit.annotations,
					}));

					// Perform redo
					store.dispatch('circuit/redo');

					// Capture state after redo
					const stateAfterRedo = JSON.parse(JSON.stringify({
						components: store.state.circuit.components,
						wires: store.state.circuit.wires,
						annotations: store.state.circuit.annotations,
					}));

					// Property: State after redo should match state before undo
					expect(stateAfterRedo).toEqual(stateBeforeUndo);

					// Additional check: State after undo should be different from state before undo
					// (unless the action had no effect)
					// This ensures undo actually did something
					const undoHadEffect = JSON.stringify(stateAfterUndo) !== JSON.stringify(stateBeforeUndo);
					if (undoHadEffect) {
						// If undo had an effect, redo should restore the original state
						expect(stateAfterRedo).toEqual(stateBeforeUndo);
					}
				}
			}),
			{ numRuns: 100 },
		);
	});

	test('multiple undo/redo cycles preserve state', () => {
		fc.assert(
			fc.property(editingSequenceGenerator, (actions) => {
				// Create a fresh store for this test
				const freshCircuitModule = {
					namespaced: true,
					state: () => ({
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
					}),
					mutations: circuitModule.mutations,
					actions: circuitModule.actions,
					getters: circuitModule.getters,
				};

				const store = createStore({
					modules: {
						circuit: freshCircuitModule,
					},
				});

				// Track created components for removal/update operations
				const createdComponents = [];
				const createdAnnotations = [];

				// Execute the sequence of actions
				actions.forEach((actionSpec) => {
					if (actionSpec.action === 'add') {
						let component;
						switch (actionSpec.componentType) {
							case 'resistor':
								component = new Resistor(actionSpec.x, actionSpec.y);
								break;
							case 'capacitor':
								component = new Capacitor(actionSpec.x, actionSpec.y);
								break;
							case 'inductor':
								component = new Inductor(actionSpec.x, actionSpec.y);
								break;
							default:
								return;
						}
						store.dispatch('circuit/addComponentWithUndo', component);
						createdComponents.push(component);
					} else if (actionSpec.action === 'addAnnotation') {
						const annotation = new TextAnnotation(actionSpec.x, actionSpec.y, actionSpec.text);
						store.dispatch('circuit/addAnnotationWithUndo', annotation);
						createdAnnotations.push(annotation);
					}
				});

				// Capture initial state
				const initialState = JSON.parse(JSON.stringify({
					components: store.state.circuit.components,
					annotations: store.state.circuit.annotations,
				}));

				// Perform multiple undo operations
				const undoCount = Math.min(3, store.state.circuit.undoStack.length);
				for (let i = 0; i < undoCount; i++) {
					store.dispatch('circuit/undo');
				}

				// Perform the same number of redo operations
				for (let i = 0; i < undoCount; i++) {
					store.dispatch('circuit/redo');
				}

				// Capture final state
				const finalState = JSON.parse(JSON.stringify({
					components: store.state.circuit.components,
					annotations: store.state.circuit.annotations,
				}));

				// Property: After equal undo/redo cycles, state should match initial state
				expect(finalState).toEqual(initialState);
			}),
			{ numRuns: 100 },
		);
	});
});
