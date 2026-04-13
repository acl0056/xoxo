/**
 * Circuit Store Module Unit Tests
 * Tests all mutations, actions, and getters for the circuit state module
 */

import { createStore } from 'vuex';
import circuitModule from '@/renderer/store/circuit';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Wire } from '@/models/Wire';
import { TextAnnotation } from '@/models/TextAnnotation';

describe('Circuit Store Module', () => {
	let store;

	beforeEach(() => {
		// Create a fresh store instance for each test to ensure isolation
		store = createStore({
			modules: {
				circuit: {
					...circuitModule,
					// Deep clone the state to ensure each test gets a fresh state
					state: () => ({
						circuit: null,
						undoStack: [],
						redoStack: [],
						isDirty: false,
						currentFilePath: null,
						recentFiles: [],
					}),
				},
			},
		});
	});

	describe('Initial State', () => {
		it('should have null circuit initially', () => {
			expect(store.state.circuit.circuit).toBeNull();
		});

		it('should have empty undo stack', () => {
			expect(store.state.circuit.undoStack).toEqual([]);
		});

		it('should have empty redo stack', () => {
			expect(store.state.circuit.redoStack).toEqual([]);
		});

		it('should not be dirty initially', () => {
			expect(store.state.circuit.isDirty).toBe(false);
		});

		it('should have no current file path', () => {
			expect(store.state.circuit.currentFilePath).toBeNull();
		});

		it('should have empty recent files list', () => {
			expect(store.state.circuit.recentFiles).toEqual([]);
		});
	});

	describe('SET_CIRCUIT Mutation', () => {
		it('should set the circuit', () => {
			const circuit = new Circuit();
			store.commit('circuit/SET_CIRCUIT', circuit);
			expect(store.state.circuit.circuit).toEqual(circuit);
		});
	});

	describe('Component Mutations', () => {
		beforeEach(() => {
			const circuit = new Circuit();
			store.commit('circuit/SET_CIRCUIT', circuit);
		});

		it('should add a component and set dirty flag', () => {
			const resistor = new Resistor(10, 20);
			store.commit('circuit/ADD_COMPONENT', resistor);

			expect(store.state.circuit.circuit.components).toHaveLength(1);
			expect(store.state.circuit.circuit.components[0]).toEqual(resistor);
			expect(store.state.circuit.isDirty).toBe(true);
		});

		it('should remove a component and set dirty flag', () => {
			const resistor = new Resistor(10, 20);
			store.commit('circuit/ADD_COMPONENT', resistor);
			store.commit('circuit/CLEAR_DIRTY');

			store.commit('circuit/REMOVE_COMPONENT', resistor.id);

			expect(store.state.circuit.circuit.components).toHaveLength(0);
			expect(store.state.circuit.isDirty).toBe(true);
		});

		it('should update a component and set dirty flag', () => {
			const resistor = new Resistor(10, 20);
			store.commit('circuit/ADD_COMPONENT', resistor);
			store.commit('circuit/CLEAR_DIRTY');

			store.commit('circuit/UPDATE_COMPONENT', {
				componentId: resistor.id,
				updates: { x: 30, y: 40 },
			});

			const component = store.state.circuit.circuit.getComponent(resistor.id);
			expect(component.x).toBe(30);
			expect(component.y).toBe(40);
			expect(store.state.circuit.isDirty).toBe(true);
		});
	});

	describe('Wire Mutations', () => {
		beforeEach(() => {
			const circuit = new Circuit();
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 40);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);
			store.commit('circuit/SET_CIRCUIT', circuit);
		});

		it('should add a wire and set dirty flag', () => {
			const components = store.state.circuit.circuit.components;
			const wire = new Wire(
				{ componentId: components[0].id, terminal: 0 },
				{ componentId: components[1].id, terminal: 0 },
			);

			store.commit('circuit/ADD_WIRE', wire);

			expect(store.state.circuit.circuit.wires).toHaveLength(1);
			expect(store.state.circuit.circuit.wires[0]).toEqual(wire);
			expect(store.state.circuit.isDirty).toBe(true);
		});

		it('should remove a wire and set dirty flag', () => {
			const components = store.state.circuit.circuit.components;
			const wire = new Wire(
				{ componentId: components[0].id, terminal: 0 },
				{ componentId: components[1].id, terminal: 0 },
			);

			store.commit('circuit/ADD_WIRE', wire);
			store.commit('circuit/CLEAR_DIRTY');

			store.commit('circuit/REMOVE_WIRE', wire.id);

			expect(store.state.circuit.circuit.wires).toHaveLength(0);
			expect(store.state.circuit.isDirty).toBe(true);
		});
	});

	describe('Annotation Mutations', () => {
		beforeEach(() => {
			const circuit = new Circuit();
			store.commit('circuit/SET_CIRCUIT', circuit);
		});

		it('should add an annotation and set dirty flag', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			store.commit('circuit/ADD_ANNOTATION', annotation);

			expect(store.state.circuit.circuit.annotations).toHaveLength(1);
			expect(store.state.circuit.circuit.annotations[0]).toEqual(annotation);
			expect(store.state.circuit.isDirty).toBe(true);
		});

		it('should remove an annotation and set dirty flag', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			store.commit('circuit/ADD_ANNOTATION', annotation);
			store.commit('circuit/CLEAR_DIRTY');

			store.commit('circuit/REMOVE_ANNOTATION', annotation.id);

			expect(store.state.circuit.circuit.annotations).toHaveLength(0);
			expect(store.state.circuit.isDirty).toBe(true);
		});

		it('should update an annotation and set dirty flag', () => {
			const annotation = new TextAnnotation(10, 20, 'Test annotation');

			store.commit('circuit/ADD_ANNOTATION', annotation);
			store.commit('circuit/CLEAR_DIRTY');

			store.commit('circuit/UPDATE_ANNOTATION', {
				annotationId: annotation.id,
				updates: { text: 'Updated text', x: 30 },
			});

			const updatedAnnotation = store.state.circuit.circuit.getAnnotation(annotation.id);
			expect(updatedAnnotation.text).toBe('Updated text');
			expect(updatedAnnotation.x).toBe(30);
			expect(store.state.circuit.isDirty).toBe(true);
		});
	});

	describe('Undo/Redo Mutations', () => {
		it('should push action to undo stack', () => {
			const action = { type: 'addComponent', payload: { id: 'test' } };
			store.commit('circuit/PUSH_UNDO', action);

			expect(store.state.circuit.undoStack).toHaveLength(1);
			expect(store.state.circuit.undoStack[0]).toEqual(action);
		});

		it('should pop action from undo stack', () => {
			const action = { type: 'addComponent', payload: { id: 'test' } };
			store.commit('circuit/PUSH_UNDO', action);

			store.commit('circuit/POP_UNDO');

			expect(store.state.circuit.undoStack).toHaveLength(0);
		});

		it('should clear undo stack', () => {
			store.commit('circuit/PUSH_UNDO', { type: 'test1' });
			store.commit('circuit/PUSH_UNDO', { type: 'test2' });

			store.commit('circuit/CLEAR_UNDO');

			expect(store.state.circuit.undoStack).toEqual([]);
		});

		it('should push action to redo stack', () => {
			const action = { type: 'addComponent', payload: { id: 'test' } };
			store.commit('circuit/PUSH_REDO', action);

			expect(store.state.circuit.redoStack).toHaveLength(1);
			expect(store.state.circuit.redoStack[0]).toEqual(action);
		});

		it('should clear redo stack', () => {
			store.commit('circuit/PUSH_REDO', { type: 'test1' });
			store.commit('circuit/PUSH_REDO', { type: 'test2' });

			store.commit('circuit/CLEAR_REDO');

			expect(store.state.circuit.redoStack).toEqual([]);
		});
	});

	describe('File Operation Mutations', () => {
		it('should set dirty flag', () => {
			store.commit('circuit/SET_DIRTY', true);
			expect(store.state.circuit.isDirty).toBe(true);
		});

		it('should clear dirty flag', () => {
			store.commit('circuit/SET_DIRTY', true);
			store.commit('circuit/CLEAR_DIRTY');
			expect(store.state.circuit.isDirty).toBe(false);
		});

		it('should set file path', () => {
			const filePath = '/path/to/circuit.json';
			store.commit('circuit/SET_FILE_PATH', filePath);
			expect(store.state.circuit.currentFilePath).toBe(filePath);
		});

		it('should add recent file to beginning of list', () => {
			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file1.json');
			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file2.json');

			expect(store.state.circuit.recentFiles).toHaveLength(2);
			expect(store.state.circuit.recentFiles[0]).toBe('/path/to/file2.json');
			expect(store.state.circuit.recentFiles[1]).toBe('/path/to/file1.json');
		});

		it('should move existing file to beginning when added again', () => {
			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file1.json');
			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file2.json');
			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file1.json');

			expect(store.state.circuit.recentFiles).toHaveLength(2);
			expect(store.state.circuit.recentFiles[0]).toBe('/path/to/file1.json');
			expect(store.state.circuit.recentFiles[1]).toBe('/path/to/file2.json');
		});

		it('should limit recent files to 10', () => {
			for (let i = 0; i < 15; i++) {
				store.commit('circuit/ADD_RECENT_FILE', `/path/to/file${i}.json`);
			}

			expect(store.state.circuit.recentFiles).toHaveLength(10);
			expect(store.state.circuit.recentFiles[0]).toBe('/path/to/file14.json');
			expect(store.state.circuit.recentFiles[9]).toBe('/path/to/file5.json');
		});
	});

	describe('Actions', () => {
		describe('newFile', () => {
			it('should create a new circuit with default voltage source', () => {
				store.dispatch('circuit/newFile');

				expect(store.state.circuit.circuit).not.toBeNull();
				expect(store.state.circuit.circuit.components).toHaveLength(1);
				expect(store.state.circuit.circuit.components[0].type).toBe('source');
				expect(store.state.circuit.currentFilePath).toBeNull();
				expect(store.state.circuit.isDirty).toBe(false);
			});

			it('should clear undo and redo stacks', () => {
				store.commit('circuit/PUSH_UNDO', { type: 'test' });
				store.commit('circuit/PUSH_REDO', { type: 'test' });

				store.dispatch('circuit/newFile');

				expect(store.state.circuit.undoStack).toEqual([]);
				expect(store.state.circuit.redoStack).toEqual([]);
			});
		});

		describe('loadFile', () => {
			it('should load circuit from JSON data', async () => {
				const circuitData = {
					version: '1.0',
					metadata: {
						name: 'Test Circuit',
						created: new Date().toISOString(),
						modified: new Date().toISOString(),
					},
					components: [],
					wires: [],
					annotations: [],
				};

				const result = await store.dispatch('circuit/loadFile', {
					filePath: '/path/to/circuit.json',
					circuitData,
				});

				expect(result.success).toBe(true);
				expect(store.state.circuit.circuit).not.toBeNull();
				expect(store.state.circuit.currentFilePath).toBe('/path/to/circuit.json');
				expect(store.state.circuit.isDirty).toBe(false);
			});

			it('should add file to recent files', async () => {
				const circuitData = {
					version: '1.0',
					metadata: {
						name: 'Test Circuit',
						created: new Date().toISOString(),
						modified: new Date().toISOString(),
					},
					components: [],
					wires: [],
					annotations: [],
				};

				await store.dispatch('circuit/loadFile', {
					filePath: '/path/to/circuit.json',
					circuitData,
				});

				expect(store.state.circuit.recentFiles).toContain('/path/to/circuit.json');
			});

			it('should return error for invalid data', async () => {
				const result = await store.dispatch('circuit/loadFile', {
					filePath: '/path/to/circuit.json',
					circuitData: null,
				});

				expect(result.success).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		describe('saveFile', () => {
			beforeEach(() => {
				store.dispatch('circuit/newFile');
			});

			it('should save circuit and return JSON data', async () => {
				const result = await store.dispatch('circuit/saveFile', '/path/to/circuit.json');

				expect(result.success).toBe(true);
				expect(result.data).toBeDefined();
				expect(result.data.version).toBe('1.0');
				expect(store.state.circuit.currentFilePath).toBe('/path/to/circuit.json');
				expect(store.state.circuit.isDirty).toBe(false);
			});

			it('should add file to recent files', async () => {
				await store.dispatch('circuit/saveFile', '/path/to/circuit.json');

				expect(store.state.circuit.recentFiles).toContain('/path/to/circuit.json');
			});

			it('should return error when no circuit exists', async () => {
				store.commit('circuit/SET_CIRCUIT', null);

				const result = await store.dispatch('circuit/saveFile', '/path/to/circuit.json');

				expect(result.success).toBe(false);
				expect(result.error).toBe('No circuit to save');
			});
		});

		describe('Component Actions with Undo', () => {
			beforeEach(() => {
				const circuit = new Circuit();
				store.commit('circuit/SET_CIRCUIT', circuit);
				// Clear any existing undo/redo stacks
				store.commit('circuit/CLEAR_UNDO');
				store.commit('circuit/CLEAR_REDO');
			});

			it('should add component and record undo action', () => {
				const resistor = new Resistor(10, 20);

				store.dispatch('circuit/addComponent', resistor);

				expect(store.state.circuit.circuit.components).toHaveLength(1);
				expect(store.state.circuit.undoStack).toHaveLength(1);
				expect(store.state.circuit.undoStack[0].type).toBe('removeComponent');
			});

			it('should remove component and record undo action', () => {
				const resistor = new Resistor(10, 20);
				store.commit('circuit/ADD_COMPONENT', resistor);

				store.dispatch('circuit/removeComponent', resistor.id);

				expect(store.state.circuit.circuit.components).toHaveLength(0);
				expect(store.state.circuit.undoStack).toHaveLength(1);
				expect(store.state.circuit.undoStack[0].type).toBe('addComponent');
			});

			it('should update component and record undo action', () => {
				const resistor = new Resistor(10, 20);
				store.commit('circuit/ADD_COMPONENT', resistor);

				store.dispatch('circuit/updateComponent', {
					componentId: resistor.id,
					updates: { x: 30 },
				});

				expect(store.state.circuit.undoStack).toHaveLength(1);
				expect(store.state.circuit.undoStack[0].type).toBe('updateComponent');
				expect(store.state.circuit.undoStack[0].payload.updates.x).toBe(10);
			});

			it('should clear redo stack when adding component', () => {
				store.commit('circuit/PUSH_REDO', { type: 'test' });

				const resistor = new Resistor(10, 20);
				store.dispatch('circuit/addComponent', resistor);

				expect(store.state.circuit.redoStack).toEqual([]);
			});
		});

		describe('Undo/Redo Actions', () => {
			beforeEach(() => {
				const circuit = new Circuit();
				store.commit('circuit/SET_CIRCUIT', circuit);
				// Clear any existing undo/redo stacks
				store.commit('circuit/CLEAR_UNDO');
				store.commit('circuit/CLEAR_REDO');
			});

			it('should undo component addition', () => {
				const resistor = new Resistor(10, 20);
				store.dispatch('circuit/addComponent', resistor);

				store.dispatch('circuit/undo');

				expect(store.state.circuit.circuit.components).toHaveLength(0);
				expect(store.state.circuit.redoStack).toHaveLength(1);
			});

			it('should redo component addition', () => {
				const resistor = new Resistor(10, 20);
				store.dispatch('circuit/addComponent', resistor);
				store.dispatch('circuit/undo');

				store.dispatch('circuit/redo');

				expect(store.state.circuit.circuit.components).toHaveLength(1);
				expect(store.state.circuit.undoStack).toHaveLength(1);
			});

			it('should handle multiple undo/redo operations', () => {
				const resistor1 = new Resistor(10, 20);
				const resistor2 = new Resistor(30, 40);

				store.dispatch('circuit/addComponent', resistor1);
				store.dispatch('circuit/addComponent', resistor2);

				expect(store.state.circuit.circuit.components).toHaveLength(2);

				store.dispatch('circuit/undo');
				expect(store.state.circuit.circuit.components).toHaveLength(1);

				store.dispatch('circuit/undo');
				expect(store.state.circuit.circuit.components).toHaveLength(0);

				store.dispatch('circuit/redo');
				expect(store.state.circuit.circuit.components).toHaveLength(1);

				store.dispatch('circuit/redo');
				expect(store.state.circuit.circuit.components).toHaveLength(2);
			});
		});
	});

	describe('Getters', () => {
		it('should get circuit', () => {
			const circuit = new Circuit();
			store.commit('circuit/SET_CIRCUIT', circuit);

			const result = store.getters['circuit/getCircuit'];
			expect(result).toEqual(circuit);
		});

		it('should get component by id', () => {
			const circuit = new Circuit();
			const resistor = new Resistor(10, 20);
			circuit.addComponent(resistor);
			store.commit('circuit/SET_CIRCUIT', circuit);

			const result = store.getters['circuit/getComponentById'](resistor.id);
			expect(result).toEqual(resistor);
		});

		it('should return null for non-existent component', () => {
			const circuit = new Circuit();
			store.commit('circuit/SET_CIRCUIT', circuit);

			const result = store.getters['circuit/getComponentById']('non-existent');
			expect(result).toBeUndefined();
		});

		it('should get wire by id', () => {
			const circuit = new Circuit();
			const resistor1 = new Resistor(10, 20);
			const resistor2 = new Resistor(30, 40);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);

			const wire = new Wire(
				{ componentId: resistor1.id, terminal: 0 },
				{ componentId: resistor2.id, terminal: 0 },
			);
			circuit.addWire(wire);
			store.commit('circuit/SET_CIRCUIT', circuit);

			const result = store.getters['circuit/getWireById'](wire.id);
			expect(result).toEqual(wire);
		});

		it('should get isDirty flag', () => {
			store.commit('circuit/SET_DIRTY', true);
			expect(store.getters['circuit/isDirty']).toBe(true);
		});

		it('should get current file path', () => {
			store.commit('circuit/SET_FILE_PATH', '/path/to/file.json');
			expect(store.getters['circuit/getCurrentFilePath']).toBe('/path/to/file.json');
		});

		it('should get recent files', () => {
			// Clear any existing recent files first
			store.state.circuit.recentFiles = [];

			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file1.json');
			store.commit('circuit/ADD_RECENT_FILE', '/path/to/file2.json');

			const result = store.getters['circuit/getRecentFiles'];
			expect(result).toHaveLength(2);
		});

		it('should check if can undo', () => {
			// Clear undo stack first
			store.commit('circuit/CLEAR_UNDO');

			expect(store.getters['circuit/canUndo']).toBe(false);

			store.commit('circuit/PUSH_UNDO', { type: 'test' });
			expect(store.getters['circuit/canUndo']).toBe(true);
		});

		it('should check if can redo', () => {
			expect(store.getters['circuit/canRedo']).toBe(false);

			store.commit('circuit/PUSH_REDO', { type: 'test' });
			expect(store.getters['circuit/canRedo']).toBe(true);
		});
	});
});
