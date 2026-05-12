/**
 * Unit tests for Block_Group state management in the circuit store.
 * Tests mutations, actions, and getters for block group operations.
 */

import { createStore } from 'vuex';
import circuit from '@/renderer/store/circuit';
import simulation from '@/renderer/store/simulation';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';

// Mock the simulation dependencies
jest.mock('@/simulation/CircuitSolver');
jest.mock('@/simulation/FrequencyAnalyzer');

describe('Block_Group Store', () => {
	let store;
	let mockRunSimulation;

	beforeEach(() => {
		mockRunSimulation = jest.fn().mockResolvedValue(undefined);

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
	});

	describe('Mutations', () => {
		beforeEach(async () => {
			await store.dispatch('circuit/newFile');
		});

		describe('ADD_BLOCK_GROUP', () => {
			test('should add a block group to the circuit', () => {
				const blockGroup = {
					id: 'bg-1',
					blockIdentifier: 'LowPassFirstOrder',
					blockTitle: 'Low Pass 1st Order',
					variables: [{ name: 'freq', value: 1000, description: 'frequency [Hz]' }],
					componentIds: ['comp-1'],
					wireSegmentIds: ['ws-1'],
					formulas: ['R/(2*pi*freq)'],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				expect(store.state.circuit.circuit.blockGroups).toHaveLength(1);
				expect(store.state.circuit.circuit.blockGroups[0]).toEqual(blockGroup);
				expect(store.state.circuit.isDirty).toBe(true);
			});

			test('should initialize blockGroups array if not present', () => {
				store.state.circuit.circuit.blockGroups = undefined;

				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [],
					componentIds: [],
					wireSegmentIds: [],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				expect(store.state.circuit.circuit.blockGroups).toHaveLength(1);
			});

			test('should not add if no circuit exists', () => {
				store.commit('circuit/SET_CIRCUIT', null);

				const blockGroup = { id: 'bg-1' };
				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				// No error thrown, just a no-op
				expect(store.state.circuit.circuit).toBeNull();
			});
		});

		describe('REMOVE_BLOCK_GROUP', () => {
			test('should remove a block group by ID', () => {
				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [],
					componentIds: [],
					wireSegmentIds: [],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);
				expect(store.state.circuit.circuit.blockGroups).toHaveLength(1);

				store.commit('circuit/REMOVE_BLOCK_GROUP', 'bg-1');
				expect(store.state.circuit.circuit.blockGroups).toHaveLength(0);
				expect(store.state.circuit.isDirty).toBe(true);
			});

			test('should not error when removing non-existent block group', () => {
				store.commit('circuit/REMOVE_BLOCK_GROUP', 'non-existent');
				expect(store.state.circuit.circuit.blockGroups).toHaveLength(0);
			});
		});

		describe('UPDATE_BLOCK_GROUP_VARIABLES', () => {
			test('should update variable values in a block group', () => {
				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [
						{ name: 'freq', value: 1000, description: 'frequency [Hz]' },
						{ name: 'R', value: 8, description: 'Load resistance [Ohms]' },
					],
					componentIds: [],
					wireSegmentIds: [],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				store.commit('circuit/UPDATE_BLOCK_GROUP_VARIABLES', {
					blockGroupId: 'bg-1',
					variables: { freq: 2000, R: 4 },
				});

				const updatedGroup = store.state.circuit.circuit.blockGroups[0];
				expect(updatedGroup.variables[0].value).toBe(2000);
				expect(updatedGroup.variables[1].value).toBe(4);
				expect(store.state.circuit.isDirty).toBe(true);
			});

			test('should only update variables that are provided', () => {
				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [
						{ name: 'freq', value: 1000, description: 'frequency [Hz]' },
						{ name: 'R', value: 8, description: 'Load resistance [Ohms]' },
					],
					componentIds: [],
					wireSegmentIds: [],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				store.commit('circuit/UPDATE_BLOCK_GROUP_VARIABLES', {
					blockGroupId: 'bg-1',
					variables: { freq: 2000 },
				});

				const updatedGroup = store.state.circuit.circuit.blockGroups[0];
				expect(updatedGroup.variables[0].value).toBe(2000);
				expect(updatedGroup.variables[1].value).toBe(8); // unchanged
			});

			test('should not error when block group not found', () => {
				store.commit('circuit/UPDATE_BLOCK_GROUP_VARIABLES', {
					blockGroupId: 'non-existent',
					variables: { freq: 2000 },
				});
				// No error thrown
			});
		});
	});

	describe('Actions', () => {
		beforeEach(async () => {
			await store.dispatch('circuit/newFile');
			mockRunSimulation.mockClear();
		});

		describe('insertBlock', () => {
			test('should insert a block and trigger simulation', async () => {
				const block = {
					title: 'Low Pass 1st Order',
					identifier: 'LowPassFirstOrder',
					variables: [
						{ name: 'freq', description: 'frequency [Hz]', defaultValue: 1000 },
						{ name: 'R', description: 'Load resistance [Ohms]', defaultValue: 8 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
					],
					components: [
						{
							partType: 2, // inductor
							defaultValue: 0.001,
							esr: 0,
							rating: 300,
							position: { x: 0, y: 0 },
							isHorizontal: true,
							stepMode: 0,
							bypassMode: 1,
							formula: 'R/(2*pi*freq)',
							formulaScale: 1,
						},
					],
					grounds: [],
					wires: [],
					texts: [],
				};

				const result = await store.dispatch('circuit/insertBlock', {
					block,
					variables: { freq: 1000, R: 8 },
					insertionPoint: { x: 10, y: 10 },
				});

				expect(result.success).toBe(true);
				expect(result.blockGroup).toBeDefined();
				expect(result.blockGroup.blockTitle).toBe('Low Pass 1st Order');
				expect(store.state.circuit.circuit.blockGroups).toHaveLength(1);
				expect(store.state.circuit.isDirty).toBe(true);

				// Wait for simulation trigger
				await new Promise((resolve) => { setTimeout(resolve, 50); });
				expect(mockRunSimulation).toHaveBeenCalled();
			});

			test('should return error when no circuit is open', async () => {
				store.commit('circuit/SET_CIRCUIT', null);

				const result = await store.dispatch('circuit/insertBlock', {
					block: {},
					variables: {},
					insertionPoint: { x: 0, y: 0 },
				});

				expect(result.success).toBe(false);
				expect(result.error).toBe('No active circuit');
			});

			test('should return error when formula evaluation fails', async () => {
				const block = {
					title: 'Test Block',
					identifier: 'TestBlock',
					variables: [
						{ name: 'freq', description: '', defaultValue: 1000 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
					],
					components: [
						{
							partType: 0,
							defaultValue: 100,
							esr: 0,
							rating: 0,
							position: { x: 0, y: 0 },
							isHorizontal: true,
							stepMode: 0,
							bypassMode: 1,
							formula: 'undefinedVar/(2*pi*freq)',
							formulaScale: 1,
						},
					],
					grounds: [],
					wires: [],
					texts: [],
				};

				const result = await store.dispatch('circuit/insertBlock', {
					block,
					variables: { freq: 1000 },
					insertionPoint: { x: 0, y: 0 },
				});

				expect(result.success).toBe(false);
				expect(result.error).toContain('Formula evaluation failed');
			});
		});

		describe('tuneBlock', () => {
			let blockGroupId;

			beforeEach(async () => {
				const block = {
					title: 'Low Pass 1st Order',
					identifier: 'LowPassFirstOrder',
					variables: [
						{ name: 'freq', description: 'frequency [Hz]', defaultValue: 1000 },
						{ name: 'R', description: 'Load resistance [Ohms]', defaultValue: 8 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
					],
					components: [
						{
							partType: 2,
							defaultValue: 0.001,
							esr: 0,
							rating: 300,
							position: { x: 0, y: 0 },
							isHorizontal: true,
							stepMode: 0,
							bypassMode: 1,
							formula: 'R/(2*pi*freq)',
							formulaScale: 1,
						},
					],
					grounds: [],
					wires: [],
					texts: [],
				};

				const result = await store.dispatch('circuit/insertBlock', {
					block,
					variables: { freq: 1000, R: 8 },
					insertionPoint: { x: 10, y: 10 },
				});

				blockGroupId = result.blockGroup.id;
				mockRunSimulation.mockClear();
			});

			test('should tune a block group and trigger simulation', async () => {
				const result = await store.dispatch('circuit/tuneBlock', {
					blockGroupId,
					newVariables: { freq: 2000, R: 8 },
				});

				expect(result.success).toBe(true);
				expect(store.state.circuit.isDirty).toBe(true);

				// Verify the variable was updated
				const group = store.state.circuit.circuit.blockGroups[0];
				const freqVariable = group.variables.find((v) => v.name === 'freq');
				expect(freqVariable.value).toBe(2000);

				// Wait for simulation trigger
				await new Promise((resolve) => { setTimeout(resolve, 50); });
				expect(mockRunSimulation).toHaveBeenCalled();
			});

			test('should return error when block group not found', async () => {
				const result = await store.dispatch('circuit/tuneBlock', {
					blockGroupId: 'non-existent',
					newVariables: { freq: 2000 },
				});

				expect(result.success).toBe(false);
				expect(result.error).toContain('Block group not found');
			});

			test('should return error when no circuit is open', async () => {
				store.commit('circuit/SET_CIRCUIT', null);

				const result = await store.dispatch('circuit/tuneBlock', {
					blockGroupId: 'bg-1',
					newVariables: { freq: 2000 },
				});

				expect(result.success).toBe(false);
				expect(result.error).toBe('No active circuit');
			});
		});

		describe('dissolveBlock', () => {
			let blockGroupId;
			let componentId;

			beforeEach(async () => {
				const block = {
					title: 'Low Pass 1st Order',
					identifier: 'LowPassFirstOrder',
					variables: [
						{ name: 'freq', description: 'frequency [Hz]', defaultValue: 1000 },
						{ name: 'R', description: 'Load resistance [Ohms]', defaultValue: 8 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
						{ name: '', description: '', defaultValue: 0 },
					],
					components: [
						{
							partType: 2,
							defaultValue: 0.001,
							esr: 0,
							rating: 300,
							position: { x: 0, y: 0 },
							isHorizontal: true,
							stepMode: 0,
							bypassMode: 1,
							formula: 'R/(2*pi*freq)',
							formulaScale: 1,
						},
					],
					grounds: [],
					wires: [],
					texts: [],
				};

				const result = await store.dispatch('circuit/insertBlock', {
					block,
					variables: { freq: 1000, R: 8 },
					insertionPoint: { x: 10, y: 10 },
				});

				blockGroupId = result.blockGroup.id;
				componentId = result.blockGroup.componentIds[0];
				mockRunSimulation.mockClear();
			});

			test('should dissolve a block group', async () => {
				// Verify block group exists
				expect(store.state.circuit.circuit.blockGroups).toHaveLength(1);

				const result = await store.dispatch('circuit/dissolveBlock', { blockGroupId });

				expect(result.success).toBe(true);
				expect(store.state.circuit.circuit.blockGroups).toHaveLength(0);
				expect(store.state.circuit.isDirty).toBe(true);

				// Component should still exist in the circuit
				const component = store.state.circuit.circuit.getComponent(componentId);
				expect(component).toBeDefined();
			});

			test('should return error when block group not found', async () => {
				const result = await store.dispatch('circuit/dissolveBlock', {
					blockGroupId: 'non-existent',
				});

				expect(result.success).toBe(false);
				expect(result.error).toContain('Block group not found');
			});

			test('should return error when no circuit is open', async () => {
				store.commit('circuit/SET_CIRCUIT', null);

				const result = await store.dispatch('circuit/dissolveBlock', {
					blockGroupId: 'bg-1',
				});

				expect(result.success).toBe(false);
				expect(result.error).toBe('No active circuit');
			});
		});
	});

	describe('Getters', () => {
		beforeEach(async () => {
			await store.dispatch('circuit/newFile');
		});

		describe('getBlockGroupForComponent', () => {
			test('should return the block group containing a component', () => {
				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [],
					componentIds: ['comp-1', 'comp-2'],
					wireSegmentIds: ['ws-1'],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				const result = store.getters['circuit/getBlockGroupForComponent']('comp-1');
				expect(result).toEqual(blockGroup);
			});

			test('should return the block group for a wire segment', () => {
				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [],
					componentIds: ['comp-1'],
					wireSegmentIds: ['ws-1'],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				const result = store.getters['circuit/getBlockGroupForComponent']('ws-1');
				expect(result).toEqual(blockGroup);
			});

			test('should return null for a component not in any block group', () => {
				const result = store.getters['circuit/getBlockGroupForComponent']('comp-99');
				expect(result).toBeNull();
			});

			test('should return null when no circuit exists', () => {
				store.commit('circuit/SET_CIRCUIT', null);
				const result = store.getters['circuit/getBlockGroupForComponent']('comp-1');
				expect(result).toBeNull();
			});
		});

		describe('getBlockGroupComponentIds', () => {
			test('should return all component and wire segment IDs in a group', () => {
				const blockGroup = {
					id: 'bg-1',
					blockTitle: 'Test',
					variables: [],
					componentIds: ['comp-1', 'comp-2'],
					wireSegmentIds: ['ws-1', 'ws-2'],
					formulas: [],
					stepModes: [0, 0, 0, 0, 0, 0],
				};

				store.commit('circuit/ADD_BLOCK_GROUP', blockGroup);

				const result = store.getters['circuit/getBlockGroupComponentIds']('bg-1');
				expect(result).toEqual(['comp-1', 'comp-2', 'ws-1', 'ws-2']);
			});

			test('should return empty array for non-existent block group', () => {
				const result = store.getters['circuit/getBlockGroupComponentIds']('non-existent');
				expect(result).toEqual([]);
			});

			test('should return empty array when no circuit exists', () => {
				store.commit('circuit/SET_CIRCUIT', null);
				const result = store.getters['circuit/getBlockGroupComponentIds']('bg-1');
				expect(result).toEqual([]);
			});
		});
	});

	describe('Circuit Model Serialization', () => {
		test('should serialize blockGroups in toJSON', () => {
			const circuitInstance = new Circuit();
			circuitInstance.blockGroups = [
				{
					id: 'bg-1',
					blockIdentifier: 'LowPassFirstOrder',
					blockTitle: 'Low Pass 1st Order',
					variables: [{ name: 'freq', value: 1000, description: 'frequency [Hz]' }],
					componentIds: ['comp-1'],
					wireSegmentIds: ['ws-1'],
					formulas: ['R/(2*pi*freq)'],
					stepModes: [0, 0, 0, 0, 0, 0],
				},
			];

			const json = circuitInstance.toJSON();
			expect(json.blockGroups).toBeDefined();
			expect(json.blockGroups).toHaveLength(1);
			expect(json.blockGroups[0].id).toBe('bg-1');
			expect(json.blockGroups[0].blockTitle).toBe('Low Pass 1st Order');
		});

		test('should not include blockGroups in toJSON when empty', () => {
			const circuitInstance = new Circuit();
			const json = circuitInstance.toJSON();
			expect(json.blockGroups).toBeUndefined();
		});

		test('should deserialize blockGroups in fromJSON', () => {
			const json = {
				version: '1.0',
				metadata: { name: 'Test', created: '2024-01-01T00:00:00Z', modified: '2024-01-01T00:00:00Z' },
				components: [],
				wires: [],
				annotations: [],
				blockGroups: [
					{
						id: 'bg-1',
						blockIdentifier: 'LowPassFirstOrder',
						blockTitle: 'Low Pass 1st Order',
						variables: [{ name: 'freq', value: 1000, description: 'frequency [Hz]' }],
						componentIds: ['comp-1'],
						wireSegmentIds: ['ws-1'],
						formulas: ['R/(2*pi*freq)'],
						stepModes: [0, 0, 0, 0, 0, 0],
					},
				],
			};

			const circuitInstance = Circuit.fromJSON(json);
			expect(circuitInstance.blockGroups).toHaveLength(1);
			expect(circuitInstance.blockGroups[0].id).toBe('bg-1');
			expect(circuitInstance.blockGroups[0].blockTitle).toBe('Low Pass 1st Order');
		});

		test('should handle missing blockGroups in fromJSON', () => {
			const json = {
				version: '1.0',
				metadata: { name: 'Test', created: '2024-01-01T00:00:00Z', modified: '2024-01-01T00:00:00Z' },
				components: [],
				wires: [],
			};

			const circuitInstance = Circuit.fromJSON(json);
			expect(circuitInstance.blockGroups).toEqual([]);
		});
	});
});
