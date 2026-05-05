import { createStore } from 'vuex';
import simulationModule from '@/renderer/store/simulation';
import { Circuit } from '@/models/Circuit';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';

// Mock electron
jest.mock('electron', () => ({
	ipcRenderer: {
		on: jest.fn(),
		send: jest.fn(),
		invoke: jest.fn(),
	},
}), { virtual: true });

// Mock the simulation modules
jest.mock('@/simulation/CircuitSolver');
jest.mock('@/simulation/FrequencyAnalyzer');

describe('Simulation Store Module', () => {
	let store;

	// Helper function to create a valid circuit with voltage source and ground
	const createValidCircuit = () => {
		const circuit = new Circuit();
		const voltageSource = new VoltageSource(10, 20);
		const ground = new Ground(10, 40);
		circuit.addComponent(voltageSource);
		circuit.addComponent(ground);
		return circuit;
	};

	beforeEach(() => {
		// Create a fresh store instance for each test
		store = createStore({
			modules: {
				simulation: {
					...simulationModule,
					state: () => ({
						autoSimulate: true,
						currentAngle: 0,
						frequencyResponse: null,
						impedanceResponse: null,
						isSimulating: false,
						simulationError: null,
						excludedSpeakers: [],
					}),
				},
				circuit: {
					namespaced: true,
					state: () => ({
						circuit: null,
					}),
					mutations: {
						SET_CIRCUIT(state, circuit) {
							state.circuit = circuit;
						},
					},
				},
			},
		});

		// Clear all mocks
		jest.clearAllMocks();
	});

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			const state = store.state.simulation;

			expect(state.autoSimulate).toBe(true);
			expect(state.currentAngle).toBe(0);
			expect(state.frequencyResponse).toBeNull();
			expect(state.impedanceResponse).toBeNull();
			expect(state.isSimulating).toBe(false);
			expect(state.simulationError).toBeNull();
			expect(state.excludedSpeakers).toEqual([]);
		});
	});

	describe('Mutations', () => {
		it('SET_AUTO_SIMULATE should update autoSimulate state', () => {
			store.commit('simulation/SET_AUTO_SIMULATE', false);
			expect(store.state.simulation.autoSimulate).toBe(false);

			store.commit('simulation/SET_AUTO_SIMULATE', true);
			expect(store.state.simulation.autoSimulate).toBe(true);
		});

		it('SET_CURRENT_ANGLE should update currentAngle state', () => {
			store.commit('simulation/SET_CURRENT_ANGLE', 30);
			expect(store.state.simulation.currentAngle).toBe(30);

			store.commit('simulation/SET_CURRENT_ANGLE', 45);
			expect(store.state.simulation.currentAngle).toBe(45);
		});

		it('SET_FREQUENCY_RESPONSE should update frequencyResponse state', () => {
			const mockResponse = {
				frequencies: [100, 1000, 10000],
				spl: [80, 85, 82],
				phase: [0, -45, -90],
			};

			store.commit('simulation/SET_FREQUENCY_RESPONSE', mockResponse);
			expect(store.state.simulation.frequencyResponse).toEqual(mockResponse);
		});

		it('SET_IMPEDANCE_RESPONSE should update impedanceResponse state', () => {
			const mockResponse = {
				frequencies: [100, 1000, 10000],
				impedances: [8, 10, 12],
				phases: [0, 15, 30],
			};

			store.commit('simulation/SET_IMPEDANCE_RESPONSE', mockResponse);
			expect(store.state.simulation.impedanceResponse).toEqual(mockResponse);
		});

		it('SET_SIMULATING should update isSimulating state', () => {
			store.commit('simulation/SET_SIMULATING', true);
			expect(store.state.simulation.isSimulating).toBe(true);

			store.commit('simulation/SET_SIMULATING', false);
			expect(store.state.simulation.isSimulating).toBe(false);
		});

		it('SET_SIMULATION_ERROR should update simulationError state', () => {
			const errorMessage = 'Circuit validation failed';

			store.commit('simulation/SET_SIMULATION_ERROR', errorMessage);
			expect(store.state.simulation.simulationError).toBe(errorMessage);

			store.commit('simulation/SET_SIMULATION_ERROR', null);
			expect(store.state.simulation.simulationError).toBeNull();
		});

		it('SET_EXCLUDED_SPEAKERS should update excludedSpeakers state', () => {
			const speakerIds = ['speaker-1', 'speaker-2'];

			store.commit('simulation/SET_EXCLUDED_SPEAKERS', speakerIds);
			expect(store.state.simulation.excludedSpeakers).toEqual(speakerIds);
		});
	});

	describe('Actions', () => {
		describe('toggleAutoSimulate', () => {
			it('should toggle autoSimulate from true to false', async () => {
				expect(store.state.simulation.autoSimulate).toBe(true);

				await store.dispatch('simulation/toggleAutoSimulate');

				expect(store.state.simulation.autoSimulate).toBe(false);
			});

			it('should toggle autoSimulate from false to true and trigger simulation', async () => {
				// Set up a valid circuit
				const circuit = createValidCircuit();
				store.commit('circuit/SET_CIRCUIT', circuit);

				// Disable auto-simulate first
				store.commit('simulation/SET_AUTO_SIMULATE', false);
				expect(store.state.simulation.autoSimulate).toBe(false);

				// Mock the simulation modules
				const CircuitSolver = require('@/simulation/CircuitSolver').default;
				const FrequencyAnalyzer = require('@/simulation/FrequencyAnalyzer').default;

				CircuitSolver.mockImplementation(() => ({
					solveAllFrequencies: jest.fn().mockReturnValue([]),
				}));

				FrequencyAnalyzer.mockImplementation(() => ({
					calculateSystemResponse: jest.fn().mockReturnValue({
						frequencies: [100],
						spl: [80],
						phase: [0],
					}),
					calculateImpedance: jest.fn().mockReturnValue({
						frequencies: [100],
						impedances: [8],
						phases: [0],
					}),
				}));

				// Toggle to enable
				await store.dispatch('simulation/toggleAutoSimulate');

				expect(store.state.simulation.autoSimulate).toBe(true);
			});
		});

		describe('setAutoSimulate', () => {
			it('should set autoSimulate to false without triggering simulation', async () => {
				await store.dispatch('simulation/setAutoSimulate', false);

				expect(store.state.simulation.autoSimulate).toBe(false);
			});

			it('should set autoSimulate to true and trigger simulation', async () => {
				// Set up a valid circuit
				const circuit = createValidCircuit();
				store.commit('circuit/SET_CIRCUIT', circuit);

				// Disable first
				store.commit('simulation/SET_AUTO_SIMULATE', false);

				// Mock the simulation modules
				const CircuitSolver = require('@/simulation/CircuitSolver').default;
				const FrequencyAnalyzer = require('@/simulation/FrequencyAnalyzer').default;

				CircuitSolver.mockImplementation(() => ({
					solveAllFrequencies: jest.fn().mockReturnValue([]),
				}));

				FrequencyAnalyzer.mockImplementation(() => ({
					calculateSystemResponse: jest.fn().mockReturnValue({
						frequencies: [100],
						spl: [80],
						phase: [0],
					}),
					calculateImpedance: jest.fn().mockReturnValue({
						frequencies: [100],
						impedances: [8],
						phases: [0],
					}),
				}));

				await store.dispatch('simulation/setAutoSimulate', true);

				expect(store.state.simulation.autoSimulate).toBe(true);
			});
		});

		describe('runSimulation', () => {
			it('should not run if already simulating', async () => {
				store.commit('simulation/SET_SIMULATING', true);

				await store.dispatch('simulation/runSimulation');

				// Should still be true (not reset)
				expect(store.state.simulation.isSimulating).toBe(true);
			});

			it('should handle missing circuit error', async () => {
				await store.dispatch('simulation/runSimulation');

				expect(store.state.simulation.simulationError).toBe('No circuit loaded');
				expect(store.state.simulation.frequencyResponse).toBeNull();
				expect(store.state.simulation.impedanceResponse).toBeNull();
			});

			it('should handle circuit validation error', async () => {
				const circuit = new Circuit();
				// Don't add any components - circuit will be invalid
				store.commit('circuit/SET_CIRCUIT', circuit);

				await store.dispatch('simulation/runSimulation');

				expect(store.state.simulation.simulationError).toContain('Circuit validation failed');
				expect(store.state.simulation.frequencyResponse).toBeNull();
				expect(store.state.simulation.impedanceResponse).toBeNull();
			});

			it('should successfully run simulation with valid circuit', async () => {
				// Set up a valid circuit
				const circuit = createValidCircuit();
				store.commit('circuit/SET_CIRCUIT', circuit);

				// Mock the simulation modules
				const CircuitSolver = require('@/simulation/CircuitSolver').default;
				const FrequencyAnalyzer = require('@/simulation/FrequencyAnalyzer').default;

				const mockFrequencyResponse = {
					frequencies: [100, 1000, 10000],
					spl: [80, 85, 82],
					phase: [0, -45, -90],
				};

				const mockImpedanceResponse = {
					frequencies: [100, 1000, 10000],
					impedances: [8, 10, 12],
					phases: [0, 15, 30],
				};

				CircuitSolver.mockImplementation(() => ({
					solveAllFrequencies: jest.fn().mockReturnValue([]),
				}));

				FrequencyAnalyzer.mockImplementation(() => ({
					calculateSystemResponse: jest.fn().mockReturnValue(mockFrequencyResponse),
					calculateImpedance: jest.fn().mockReturnValue(mockImpedanceResponse),
				}));

				await store.dispatch('simulation/runSimulation');

				expect(store.state.simulation.frequencyResponse).toEqual(mockFrequencyResponse);
				expect(store.state.simulation.impedanceResponse).toEqual(mockImpedanceResponse);
				expect(store.state.simulation.simulationError).toBeNull();
				expect(store.state.simulation.isSimulating).toBe(false);
			});

			it('should handle simulation errors gracefully', async () => {
				// Set up a valid circuit
				const circuit = createValidCircuit();
				store.commit('circuit/SET_CIRCUIT', circuit);

				// Mock the simulation modules to throw an error
				const CircuitSolver = require('@/simulation/CircuitSolver').default;

				CircuitSolver.mockImplementation(() => {
					throw new Error('Solver failed');
				});

				await store.dispatch('simulation/runSimulation');

				expect(store.state.simulation.simulationError).toBe('Solver failed');
				expect(store.state.simulation.frequencyResponse).toBeNull();
				expect(store.state.simulation.impedanceResponse).toBeNull();
				expect(store.state.simulation.isSimulating).toBe(false);
			});
		});

		describe('switchAngle', () => {
			it('should switch to on-axis angle (0 degrees)', async () => {
				await store.dispatch('simulation/switchAngle', 0);

				expect(store.state.simulation.currentAngle).toBe(0);
				expect(store.state.simulation.excludedSpeakers).toEqual([]);
			});

			it('should handle missing circuit gracefully', async () => {
				await store.dispatch('simulation/switchAngle', 30);

				expect(store.state.simulation.currentAngle).toBe(30);
				expect(store.state.simulation.excludedSpeakers).toEqual([]);
			});

			it('should exclude speakers without off-axis data for the selected angle', async () => {
				// Create circuit with speakers
				const circuit = createValidCircuit();

				const speaker1 = new Speaker(30, 40);
				speaker1.id = 'speaker-1';
				speaker1.label = 'S1';
				speaker1.parameters.offAxisFiles = [
					{ angle: 30, frdPath: '/path/to/30deg.frd' },
				];
				circuit.addComponent(speaker1);

				const speaker2 = new Speaker(50, 60);
				speaker2.id = 'speaker-2';
				speaker2.label = 'S2';
				speaker2.parameters.offAxisFiles = []; // No off-axis data
				circuit.addComponent(speaker2);

				store.commit('circuit/SET_CIRCUIT', circuit);

				// Switch to 30 degrees
				await store.dispatch('simulation/switchAngle', 30);

				expect(store.state.simulation.currentAngle).toBe(30);
				expect(store.state.simulation.excludedSpeakers).toEqual(['speaker-2']);
			});

			it('should trigger simulation if auto-simulate is enabled', async () => {
				// Set up a valid circuit
				const circuit = createValidCircuit();
				store.commit('circuit/SET_CIRCUIT', circuit);

				// Enable auto-simulate
				store.commit('simulation/SET_AUTO_SIMULATE', true);

				// Mock the simulation modules
				const CircuitSolver = require('@/simulation/CircuitSolver').default;
				const FrequencyAnalyzer = require('@/simulation/FrequencyAnalyzer').default;

				CircuitSolver.mockImplementation(() => ({
					solveAllFrequencies: jest.fn().mockReturnValue([]),
				}));

				FrequencyAnalyzer.mockImplementation(() => ({
					calculateSystemResponse: jest.fn().mockReturnValue({
						frequencies: [100],
						spl: [80],
						phase: [0],
					}),
					calculateImpedance: jest.fn().mockReturnValue({
						frequencies: [100],
						impedances: [8],
						phases: [0],
					}),
				}));

				await store.dispatch('simulation/switchAngle', 30);

				expect(store.state.simulation.currentAngle).toBe(30);
			});

			it('should not trigger simulation if auto-simulate is disabled', async () => {
				// Set up a valid circuit
				const circuit = createValidCircuit();
				store.commit('circuit/SET_CIRCUIT', circuit);

				// Disable auto-simulate
				store.commit('simulation/SET_AUTO_SIMULATE', false);

				await store.dispatch('simulation/switchAngle', 30);

				expect(store.state.simulation.currentAngle).toBe(30);
				expect(store.state.simulation.frequencyResponse).toBeNull();
			});
		});

		describe('clearResults', () => {
			it('should clear all simulation results and errors', () => {
				// Set some results and error
				store.commit('simulation/SET_FREQUENCY_RESPONSE', { frequencies: [100] });
				store.commit('simulation/SET_IMPEDANCE_RESPONSE', { frequencies: [100] });
				store.commit('simulation/SET_SIMULATION_ERROR', 'Some error');

				store.dispatch('simulation/clearResults');

				expect(store.state.simulation.frequencyResponse).toBeNull();
				expect(store.state.simulation.impedanceResponse).toBeNull();
				expect(store.state.simulation.simulationError).toBeNull();
			});
		});
	});

	describe('Getters', () => {
		it('isAutoSimulateEnabled should return autoSimulate state', () => {
			expect(store.getters['simulation/isAutoSimulateEnabled']).toBe(true);

			store.commit('simulation/SET_AUTO_SIMULATE', false);
			expect(store.getters['simulation/isAutoSimulateEnabled']).toBe(false);
		});

		it('getCurrentAngle should return currentAngle state', () => {
			expect(store.getters['simulation/getCurrentAngle']).toBe(0);

			store.commit('simulation/SET_CURRENT_ANGLE', 45);
			expect(store.getters['simulation/getCurrentAngle']).toBe(45);
		});

		it('getFrequencyResponse should return frequencyResponse state', () => {
			expect(store.getters['simulation/getFrequencyResponse']).toBeNull();

			const mockResponse = { frequencies: [100], spl: [80] };
			store.commit('simulation/SET_FREQUENCY_RESPONSE', mockResponse);
			expect(store.getters['simulation/getFrequencyResponse']).toEqual(mockResponse);
		});

		it('getImpedanceResponse should return impedanceResponse state', () => {
			expect(store.getters['simulation/getImpedanceResponse']).toBeNull();

			const mockResponse = { frequencies: [100], impedances: [8] };
			store.commit('simulation/SET_IMPEDANCE_RESPONSE', mockResponse);
			expect(store.getters['simulation/getImpedanceResponse']).toEqual(mockResponse);
		});

		it('isSimulating should return isSimulating state', () => {
			expect(store.getters['simulation/isSimulating']).toBe(false);

			store.commit('simulation/SET_SIMULATING', true);
			expect(store.getters['simulation/isSimulating']).toBe(true);
		});

		it('getSimulationError should return simulationError state', () => {
			expect(store.getters['simulation/getSimulationError']).toBeNull();

			store.commit('simulation/SET_SIMULATION_ERROR', 'Error message');
			expect(store.getters['simulation/getSimulationError']).toBe('Error message');
		});

		it('hasSimulationResults should return true when both responses exist', () => {
			expect(store.getters['simulation/hasSimulationResults']).toBe(false);

			store.commit('simulation/SET_FREQUENCY_RESPONSE', { frequencies: [100] });
			expect(store.getters['simulation/hasSimulationResults']).toBe(false);

			store.commit('simulation/SET_IMPEDANCE_RESPONSE', { frequencies: [100] });
			expect(store.getters['simulation/hasSimulationResults']).toBe(true);
		});

		it('isSpeakerExcluded should return true for excluded speakers', () => {
			store.commit('simulation/SET_EXCLUDED_SPEAKERS', ['speaker-1', 'speaker-2']);

			expect(store.getters['simulation/isSpeakerExcluded']('speaker-1')).toBe(true);
			expect(store.getters['simulation/isSpeakerExcluded']('speaker-2')).toBe(true);
			expect(store.getters['simulation/isSpeakerExcluded']('speaker-3')).toBe(false);
		});

		it('getExcludedSpeakers should return excludedSpeakers array', () => {
			expect(store.getters['simulation/getExcludedSpeakers']).toEqual([]);

			const speakerIds = ['speaker-1', 'speaker-2'];
			store.commit('simulation/SET_EXCLUDED_SPEAKERS', speakerIds);
			expect(store.getters['simulation/getExcludedSpeakers']).toEqual(speakerIds);
		});
	});
});
