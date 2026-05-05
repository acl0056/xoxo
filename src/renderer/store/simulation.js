import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import simulationResultsSchema from '@/schemas/simulation-results.schema.json';

const ajv = new Ajv();
addFormats(ajv);
const validateSimulationResults = ajv.compile(simulationResultsSchema);

export default {
	namespaced: true,
	state: {
		autoSimulate: true,
		currentAngle: 0,
		availableAngles: [],
		frequencyResponse: null,
		impedanceResponse: null,
		isSimulating: false,
		simulationPending: false,
		simulationError: null,
		excludedSpeakers: [], // Array of speaker IDs excluded due to missing angle data
	},
	mutations: {
		SET_AUTO_SIMULATE(state, value) {
			state.autoSimulate = value;
		},
		SET_CURRENT_ANGLE(state, angle) {
			state.currentAngle = angle;
		},
		SET_AVAILABLE_ANGLES(state, angles) {
			state.availableAngles = angles;
		},
		SET_FREQUENCY_RESPONSE(state, response) {
			state.frequencyResponse = response;
		},
		SET_IMPEDANCE_RESPONSE(state, response) {
			state.impedanceResponse = response;
		},
		SET_SIMULATING(state, value) {
			state.isSimulating = value;
		},
		SET_SIMULATION_PENDING(state, value) {
			state.simulationPending = value;
		},
		SET_SIMULATION_ERROR(state, error) {
			state.simulationError = error;
		},
		SET_EXCLUDED_SPEAKERS(state, speakerIds) {
			state.excludedSpeakers = speakerIds;
		},
	},
	actions: {
		/**
		 * Toggle auto-simulate mode
		 */
		toggleAutoSimulate({ commit, state, dispatch }) {
			const newValue = !state.autoSimulate;
			commit('SET_AUTO_SIMULATE', newValue);

			// If enabling auto-simulate, run simulation immediately
			if (newValue) {
				dispatch('runSimulation');
			}
		},

		/**
		 * Set auto-simulate mode
		 */
		setAutoSimulate({ commit, dispatch }, value) {
			commit('SET_AUTO_SIMULATE', value);

			// If enabling auto-simulate, run simulation immediately
			if (value) {
				dispatch('runSimulation');
			}
		},

		/**
		 * Run circuit simulation asynchronously
		 */
		async runSimulation({
			commit, rootState, state, dispatch,
		}) {
			console.log('[SIM] runSimulation called, isSimulating:', state.isSimulating);
			// If already simulating, queue a re-run after current one finishes
			if (state.isSimulating) {
				console.log('[SIM] already simulating, setting pending');
				commit('SET_SIMULATION_PENDING', true);
				return;
			}

			commit('SET_SIMULATING', true);
			console.log('[SIM] starting simulation');
			const simStart = performance.now();
			commit('SET_SIMULATION_PENDING', false);
			commit('SET_SIMULATION_ERROR', null);

			try {
				// Get the circuit from the circuit module
				const { circuit } = rootState.circuit;

				if (!circuit) {
					throw new Error('No circuit loaded');
				}

				// Validate the circuit before simulation
				const validationResult = circuit.validate();
				if (!validationResult.valid) {
					throw new Error(`Circuit validation failed: ${validationResult.errors.join(', ')}`);
				}

				// Run simulation synchronously (~90ms is fast enough to not block UI noticeably)
				const solver = new CircuitSolver(circuit);
				const solverResults = solver.solveAllFrequencies(1, 100000, 50);
				const analyzer = new FrequencyAnalyzer(circuit, solverResults);

				// Calculate impedance response first (doesn't depend on speakers)
				let impedanceResponse = null;
				try {
					impedanceResponse = analyzer.calculateImpedance();
				} catch (impedanceError) {
					console.warn('[SIM] impedance calculation failed:', impedanceError.message);
				}

				// Calculate frequency response (requires speakers with FRD data)
				let frequencyResponse = null;
				try {
					frequencyResponse = analyzer.calculateSystemResponse(state.currentAngle);
				} catch (freqError) {
					console.warn('[SIM] frequency response calculation failed:', freqError.message);
				}

				// Compute available off-axis angles (intersection across all speakers with FRD data)
				const speakers = circuit.components.filter((c) => c.type === 'speaker' && c.frdData);
				let availableAngles = [];
				if (speakers.length > 0) {
					const angleSets = speakers.map(
						(s) => new Set((s.offAxisData || []).map((d) => d.angle)),
					);
					// Intersect: only angles present on every speaker
					availableAngles = [...angleSets[0]].filter(
						(angle) => angleSets.every((set) => set.has(angle)),
					).sort((a, b) => a - b);
				}
				commit('SET_AVAILABLE_ANGLES', availableAngles);

				if (!impedanceResponse && !frequencyResponse) {
					throw new Error('Both impedance and frequency response calculations failed');
				}

				const simulationResults = { frequencyResponse, impedanceResponse };

				// Update state with simulation results
				commit('SET_FREQUENCY_RESPONSE', simulationResults.frequencyResponse);
				commit('SET_IMPEDANCE_RESPONSE', simulationResults.impedanceResponse);

				// Broadcast results to graph windows via IPC
				// Deep clone via JSON to ensure all data is serializable for IPC
				// (strips -Infinity, NaN, Complex instances etc.)
				const ipcData = {
					timestamp: new Date().toISOString(),
					currentAngle: state.currentAngle,
					availableAngles,
				};
				if (simulationResults.frequencyResponse) {
					ipcData.frequencyResponse = simulationResults.frequencyResponse;
				}
				if (simulationResults.impedanceResponse) {
					ipcData.impedanceResponse = simulationResults.impedanceResponse;
				}

				// Include curve colors from the circuit so graph windows can use them
				if (circuit.curveColors) {
					ipcData.curveColors = circuit.curveColors;
				}

				// Include graph settings so graph windows can restore scale settings
				if (circuit.graphSettings) {
					ipcData.graphSettings = circuit.graphSettings;
				}

				const ipcPayload = JSON.parse(JSON.stringify(ipcData));

				// Only validate if both responses are present (schema requires both)
				// Validate without curveColors since it's not part of the simulation results schema
				if (ipcPayload.frequencyResponse && ipcPayload.impedanceResponse) {
					const {
						curveColors: _, currentAngle: __, availableAngles: ___, graphSettings: ____, ...simulationOnly
					} = ipcPayload;
					if (!validateSimulationResults(simulationOnly)) {
						console.error('Simulation results failed schema validation:', validateSimulationResults.errors);
					}
				}

				const { ipcRenderer } = require('electron');
				ipcRenderer.send('simulation-results', ipcPayload);
			} catch (error) {
				console.error('Simulation error:', error.message);
				commit('SET_SIMULATION_ERROR', error.message);

				// Clear results on error
				commit('SET_FREQUENCY_RESPONSE', null);
				commit('SET_IMPEDANCE_RESPONSE', null);
				commit('SET_AVAILABLE_ANGLES', []);

				// Broadcast cleared results to graph windows so they don't show stale data
				const { ipcRenderer } = require('electron');
				ipcRenderer.send('simulation-results', {
					timestamp: new Date().toISOString(),
					frequencyResponse: null,
					impedanceResponse: null,
					currentAngle: state.currentAngle,
					availableAngles: [],
				});
			} finally {
				commit('SET_SIMULATING', false);
				console.log('[SIM] simulation complete', `${(performance.now() - simStart).toFixed(0)}ms`);

				// If a simulation was requested while we were running, run again
				if (state.simulationPending) {
					console.log('[SIM] re-running pending simulation');
					commit('SET_SIMULATION_PENDING', false);
					dispatch('runSimulation');
				}
			}
		},

		/**
		 * Switch to a different off-axis angle
		 */
		async switchAngle({
			commit, rootState, state, dispatch,
		}, angle) {
			// Switch all speakers to the specified angle
			commit('SET_CURRENT_ANGLE', angle);

			// Get all speaker components from the circuit
			const {
				circuit,
			} = rootState.circuit;
			if (!circuit || !circuit.components) {
				commit('SET_EXCLUDED_SPEAKERS', []);
				return;
			}

			const speakers = circuit.components.filter((component) => component.type === 'speaker');
			const excludedSpeakerIds = [];

			// For each speaker, check if it has off-axis data for this angle
			for (const speaker of speakers) {
				if (angle === 0) {
					// Use on-axis data (primary FRD file)
					// All speakers should have on-axis data, so no exclusion needed
					continue;
				}

				// Check if speaker has off-axis data for this angle
				const hasOffAxisData = speaker.parameters.offAxisFiles
					&& speaker.parameters.offAxisFiles.some((file) => file.angle === angle);

				if (!hasOffAxisData) {
					console.warn(`Speaker ${speaker.label} does not have off-axis data for angle ${angle}°`);
					excludedSpeakerIds.push(speaker.id);
				}
			}

			// Update the list of excluded speakers
			commit('SET_EXCLUDED_SPEAKERS', excludedSpeakerIds);

			// Trigger re-simulation if auto-simulate is enabled
			if (state.autoSimulate) {
				await dispatch('runSimulation');
			}
		},

		/**
		 * Clear simulation results
		 */
		clearResults({ commit }) {
			commit('SET_FREQUENCY_RESPONSE', null);
			commit('SET_IMPEDANCE_RESPONSE', null);
			commit('SET_SIMULATION_ERROR', null);
		},
	},
	getters: {
		isAutoSimulateEnabled: (state) => state.autoSimulate,
		getCurrentAngle: (state) => state.currentAngle,
		getFrequencyResponse: (state) => state.frequencyResponse,
		getImpedanceResponse: (state) => state.impedanceResponse,
		isSimulating: (state) => state.isSimulating,
		getSimulationError: (state) => state.simulationError,
		hasSimulationResults: (state) => state.frequencyResponse !== null && state.impedanceResponse !== null,
		isSpeakerExcluded: (state) => (speakerId) => state.excludedSpeakers.includes(speakerId),
		getExcludedSpeakers: (state) => state.excludedSpeakers,
	},
};
