const { createStore } = require('vuex');
const circuitModule = require('@/renderer/store/circuit').default;
const { Resistor } = require('@/models/Resistor');
const { Capacitor } = require('@/models/Capacitor');
const { Wire } = require('@/models/Wire');
const { TextAnnotation } = require('@/models/TextAnnotation');

describe('Undo/Redo System', () => {
	let store;

	beforeEach(() => {
		// Create a fresh store instance for each test with a fresh copy of the module
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

		store = createStore({
			modules: {
				circuit: freshCircuitModule,
			},
		});
	});

	describe('Component Operations', () => {
		test('should undo component addition', () => {
			const resistor = new Resistor(10, 20);

			// Add component
			store.dispatch('circuit/addComponentWithUndo', resistor);
			expect(store.state.circuit.components).toHaveLength(1);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(0);
			expect(store.state.circuit.redoStack).toHaveLength(1);
		});

		test('should redo component addition', () => {
			const resistor = new Resistor(10, 20);

			// Add component
			store.dispatch('circuit/addComponentWithUndo', resistor);
			expect(store.state.circuit.components).toHaveLength(1);

			// Undo
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(0);

			// Redo
			store.dispatch('circuit/redo');
			expect(store.state.circuit.components).toHaveLength(1);
			expect(store.state.circuit.components[0].id).toBe(resistor.id);
		});

		test('should undo component removal', () => {
			const resistor = new Resistor(10, 20);

			// Add component
			store.dispatch('circuit/addComponentWithUndo', resistor);
			expect(store.state.circuit.components).toHaveLength(1);

			// Clear undo stack to isolate removal test
			store.commit('circuit/clearUndoStack');

			// Remove component
			store.dispatch('circuit/removeComponentWithUndo', resistor.id);
			expect(store.state.circuit.components).toHaveLength(0);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo removal
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(1);
			expect(store.state.circuit.components[0].id).toBe(resistor.id);
		});

		test('should undo component update', () => {
			const resistor = new Resistor(10, 20);
			const originalResistance = resistor.parameters.resistance;

			// Add component
			store.dispatch('circuit/addComponentWithUndo', resistor);

			// Clear undo stack to isolate update test
			store.commit('circuit/clearUndoStack');

			// Update component
			const newParameters = { ...resistor.parameters, resistance: 1000 };
			store.dispatch('circuit/updateComponentWithUndo', {
				componentId: resistor.id,
				updates: { parameters: newParameters },
			});

			expect(store.state.circuit.components[0].parameters.resistance).toBe(1000);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo update
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components[0].parameters.resistance).toBe(originalResistance);
		});
	});

	describe('Wire Operations', () => {
		test('should undo wire addition', () => {
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 20);

			// Add components
			store.commit('circuit/addComponent', resistor1);
			store.commit('circuit/addComponent', resistor2);

			// Create wire
			const wire = new Wire(
				{ componentId: resistor1.id, terminal: 1 },
				{ componentId: resistor2.id, terminal: 0 },
			);

			// Add wire with undo
			store.dispatch('circuit/addWireWithUndo', wire);
			expect(store.state.circuit.wires).toHaveLength(1);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo
			store.dispatch('circuit/undo');
			expect(store.state.circuit.wires).toHaveLength(0);
			expect(store.state.circuit.redoStack).toHaveLength(1);
		});

		test('should undo wire removal', () => {
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 20);

			// Add components
			store.commit('circuit/addComponent', resistor1);
			store.commit('circuit/addComponent', resistor2);

			// Create and add wire
			const wire = new Wire(
				{ componentId: resistor1.id, terminal: 1 },
				{ componentId: resistor2.id, terminal: 0 },
			);
			store.dispatch('circuit/addWireWithUndo', wire);

			// Clear undo stack to isolate removal test
			store.commit('circuit/clearUndoStack');

			// Remove wire
			store.dispatch('circuit/removeWireWithUndo', wire.id);
			expect(store.state.circuit.wires).toHaveLength(0);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo removal
			store.dispatch('circuit/undo');
			expect(store.state.circuit.wires).toHaveLength(1);
			expect(store.state.circuit.wires[0].id).toBe(wire.id);
		});
	});

	describe('Annotation Operations', () => {
		test('should undo annotation addition', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			// Add annotation
			store.dispatch('circuit/addAnnotationWithUndo', annotation);
			expect(store.state.circuit.annotations).toHaveLength(1);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo
			store.dispatch('circuit/undo');
			expect(store.state.circuit.annotations).toHaveLength(0);
			expect(store.state.circuit.redoStack).toHaveLength(1);
		});

		test('should undo annotation removal', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			// Add annotation
			store.dispatch('circuit/addAnnotationWithUndo', annotation);

			// Clear undo stack to isolate removal test
			store.commit('circuit/clearUndoStack');

			// Remove annotation
			store.dispatch('circuit/removeAnnotationWithUndo', annotation.id);
			expect(store.state.circuit.annotations).toHaveLength(0);
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo removal
			store.dispatch('circuit/undo');
			expect(store.state.circuit.annotations).toHaveLength(1);
			expect(store.state.circuit.annotations[0].id).toBe(annotation.id);
		});

		test('should undo annotation update', () => {
			const annotation = new TextAnnotation(10, 20, 'Original text');

			// Add annotation
			store.dispatch('circuit/addAnnotationWithUndo', annotation);

			// Clear undo stack to isolate update test
			store.commit('circuit/clearUndoStack');

			// Update annotation
			store.dispatch('circuit/updateAnnotationWithUndo', {
				annotationId: annotation.id,
				updates: { text: 'Updated text' },
			});

			expect(store.state.circuit.annotations[0].text).toBe('Updated text');
			expect(store.state.circuit.undoStack).toHaveLength(1);

			// Undo update
			store.dispatch('circuit/undo');
			expect(store.state.circuit.annotations[0].text).toBe('Original text');
		});
	});

	describe('Undo/Redo Stack Management', () => {
		test('should clear redo stack when new action is performed', () => {
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 20);

			// Add first component
			store.dispatch('circuit/addComponentWithUndo', resistor1);

			// Undo
			store.dispatch('circuit/undo');
			expect(store.state.circuit.redoStack).toHaveLength(1);

			// Add second component (should clear redo stack)
			store.dispatch('circuit/addComponentWithUndo', resistor2);
			expect(store.state.circuit.redoStack).toHaveLength(0);
		});

		test('should handle empty undo stack gracefully', () => {
			// Try to undo with empty stack
			expect(() => {
				store.dispatch('circuit/undo');
			}).not.toThrow();

			expect(store.state.circuit.undoStack).toHaveLength(0);
		});

		test('should handle empty redo stack gracefully', () => {
			// Try to redo with empty stack
			expect(() => {
				store.dispatch('circuit/redo');
			}).not.toThrow();

			expect(store.state.circuit.redoStack).toHaveLength(0);
		});
	});

	describe('Multiple Operations', () => {
		test('should handle multiple undo operations in sequence', () => {
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 20);
			const capacitor = new Capacitor(50, 20);

			// Add three components
			store.dispatch('circuit/addComponentWithUndo', resistor1);
			store.dispatch('circuit/addComponentWithUndo', resistor2);
			store.dispatch('circuit/addComponentWithUndo', capacitor);

			expect(store.state.circuit.components).toHaveLength(3);
			expect(store.state.circuit.undoStack).toHaveLength(3);

			// Undo all three
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(2);

			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(1);

			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(0);

			expect(store.state.circuit.redoStack).toHaveLength(3);
		});

		test('should handle multiple redo operations in sequence', () => {
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 20);
			const capacitor = new Capacitor(50, 20);

			// Add three components
			store.dispatch('circuit/addComponentWithUndo', resistor1);
			store.dispatch('circuit/addComponentWithUndo', resistor2);
			store.dispatch('circuit/addComponentWithUndo', capacitor);

			// Undo all three
			store.dispatch('circuit/undo');
			store.dispatch('circuit/undo');
			store.dispatch('circuit/undo');

			expect(store.state.circuit.components).toHaveLength(0);

			// Redo all three
			store.dispatch('circuit/redo');
			expect(store.state.circuit.components).toHaveLength(1);

			store.dispatch('circuit/redo');
			expect(store.state.circuit.components).toHaveLength(2);

			store.dispatch('circuit/redo');
			expect(store.state.circuit.components).toHaveLength(3);

			expect(store.state.circuit.undoStack).toHaveLength(3);
		});

		test('should handle mixed operations (add, remove, update)', () => {
			const resistor = new Resistor(10, 20);
			const originalResistance = resistor.parameters.resistance;

			// Add component
			store.dispatch('circuit/addComponentWithUndo', resistor);
			expect(store.state.circuit.components).toHaveLength(1);

			// Update component
			const newParameters = { ...resistor.parameters, resistance: 1000 };
			store.dispatch('circuit/updateComponentWithUndo', {
				componentId: resistor.id,
				updates: { parameters: newParameters },
			});
			expect(store.state.circuit.components[0].parameters.resistance).toBe(1000);

			// Remove component
			store.dispatch('circuit/removeComponentWithUndo', resistor.id);
			expect(store.state.circuit.components).toHaveLength(0);

			// Undo remove
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(1);
			expect(store.state.circuit.components[0].parameters.resistance).toBe(1000);

			// Undo update
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components[0].parameters.resistance).toBe(originalResistance);

			// Undo add
			store.dispatch('circuit/undo');
			expect(store.state.circuit.components).toHaveLength(0);
		});
	});
});
