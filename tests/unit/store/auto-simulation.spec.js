/**
 * Unit tests for auto-simulation functionality
 * Tests parameter change detection and debounced simulation triggering
 */

import { createStore } from 'vuex';
import circuit from '@/renderer/store/circuit';
import simulation from '@/renderer/store/simulation';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Wire } from '@/models/Wire';

// Mock the simulation dependencies
jest.mock('@/simulation/CircuitSolver');
jest.mock('@/simulation/FrequencyAnalyzer');

describe('Auto-Simulation', () => {
	let store;
	let mockRunSimulation;

	beforeEach(() => {
		// Create a mock for runSimulation
		mockRunSimulation = jest.fn().mockResolvedValue(undefined);

		// Create a fresh store instance for each test
		store = createStore({
			modules: {
				circuit,
				simulation: {
					...simulation,
					actions: {
						...simulation.actions,
						runSimulation: mockRunSimulation,
					},
				},
			},
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.clearAllTimers();
	});

	describe('Parameter Change Detection', () => {
		test('should trigger simulation when adding a component', async () => {
			// Initialize circuit
			await store.dispatch('circuit/newFile');

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Add a component
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should trigger simulation when removing a component', async () => {
			// Initialize circuit with a component
			await store.dispatch('circuit/newFile');
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Remove the component
			await store.dispatch('circuit/removeComponent', resistor.id);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should trigger simulation when updating component parameters', async () => {
			// Initialize circuit with a component
			await store.dispatch('circuit/newFile');
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Update component parameters
			await store.dispatch('circuit/updateComponent', {
				componentId: resistor.id,
				updates: { parameters: { resistance: 10000 } },
			});

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should trigger simulation when adding a wire', async () => {
			// Initialize circuit with components
			await store.dispatch('circuit/newFile');
			const resistor1 = new Resistor(10, 10);
			const resistor2 = new Resistor(20, 10);
			await store.dispatch('circuit/addComponent', resistor1);
			await store.dispatch('circuit/addComponent', resistor2);

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Add a wire
			const wire = new Wire(
				{ componentId: resistor1.id, terminal: 0 },
				{ componentId: resistor2.id, terminal: 0 },
			);
			await store.dispatch('circuit/addWire', wire);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should trigger simulation when removing a wire', async () => {
			// Initialize circuit with components and wire
			await store.dispatch('circuit/newFile');
			const resistor1 = new Resistor(10, 10);
			const resistor2 = new Resistor(20, 10);
			await store.dispatch('circuit/addComponent', resistor1);
			await store.dispatch('circuit/addComponent', resistor2);
			const wire = new Wire(
				{ componentId: resistor1.id, terminal: 0 },
				{ componentId: resistor2.id, terminal: 0 },
			);
			await store.dispatch('circuit/addWire', wire);

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Remove the wire
			await store.dispatch('circuit/removeWire', wire.id);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should NOT trigger simulation when adding/removing annotations', async () => {
			// Initialize circuit
			await store.dispatch('circuit/newFile');

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Add an annotation
			const annotation = {
				id: 'annotation-1',
				x: 10,
				y: 10,
				text: 'Test annotation',
				fontSize: 12,
			};
			await store.dispatch('circuit/addAnnotation', annotation);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was NOT triggered (annotations don't affect simulation)
			expect(mockRunSimulation).not.toHaveBeenCalled();
		});
	});

	describe('Automatic Simulation on Circuit Load', () => {
		test('should trigger simulation when loading a circuit file', async () => {
			// Create a circuit to load
			const testCircuit = new Circuit();
			const resistor = new Resistor(10, 10);
			testCircuit.addComponent(resistor);
			const circuitData = testCircuit.toJSON();

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Load the circuit
			await store.dispatch('circuit/loadFile', {
				filePath: '/test/circuit.json',
				circuitData,
			});

			// Verify simulation was triggered immediately (no debounce on load)
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should trigger simulation when creating a new file', async () => {
			// Clear previous calls
			mockRunSimulation.mockClear();

			// Create new file
			await store.dispatch('circuit/newFile');

			// Verify simulation was triggered immediately
			expect(mockRunSimulation).toHaveBeenCalled();
		});
	});

	describe('Undo/Redo Simulation Triggering', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		test('should trigger simulation when undoing component addition', async () => {
			// Initialize circuit and add a component
			await store.dispatch('circuit/newFile');
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Undo the component addition
			await store.dispatch('circuit/undo');

			// Wait for debounce delay
			jest.advanceTimersByTime(300);

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should trigger simulation when redoing component addition', async () => {
			// Initialize circuit, add a component, then undo
			await store.dispatch('circuit/newFile');
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);
			await store.dispatch('circuit/undo');

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Redo the component addition
			await store.dispatch('circuit/redo');

			// Wait for debounce delay
			jest.advanceTimersByTime(300);

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should NOT trigger simulation when undoing annotation changes', async () => {
			// Initialize circuit and add an annotation
			await store.dispatch('circuit/newFile');
			const annotation = {
				id: 'annotation-1',
				x: 10,
				y: 10,
				text: 'Test',
				fontSize: 12,
			};
			await store.dispatch('circuit/addAnnotation', annotation);

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Undo the annotation addition
			await store.dispatch('circuit/undo');

			// Wait for debounce delay
			jest.advanceTimersByTime(300);

			// Verify simulation was NOT triggered
			expect(mockRunSimulation).not.toHaveBeenCalled();
		});
	});

	describe('Auto-Simulate Toggle', () => {
		test('should respect auto-simulate setting when enabled', async () => {
			// Enable auto-simulate
			await store.dispatch('simulation/setAutoSimulate', true);

			// Initialize circuit
			await store.dispatch('circuit/newFile');

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Add a component
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was triggered
			expect(mockRunSimulation).toHaveBeenCalled();
		});

		test('should NOT trigger simulation when auto-simulate is disabled', async () => {
			// Disable auto-simulate
			await store.dispatch('simulation/setAutoSimulate', false);

			// Initialize circuit
			await store.dispatch('circuit/newFile');

			// Clear previous calls
			mockRunSimulation.mockClear();

			// Add a component
			const resistor = new Resistor(10, 10);
			await store.dispatch('circuit/addComponent', resistor);

			// Wait for debounce delay
			await new Promise((resolve) => { setTimeout(resolve, 350); });

			// Verify simulation was NOT triggered
			expect(mockRunSimulation).not.toHaveBeenCalled();
		});
	});
});
