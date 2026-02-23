export default {
	namespaced: true,
	state: {
		autoSimulate: true,
		currentAngle: 0,
		frequencyResponse: null,
		impedanceResponse: null,
		isSimulating: false,
	},
	mutations: {
		setAutoSimulate(state, value) {
			state.autoSimulate = value;
		},
		setCurrentAngle(state, angle) {
			state.currentAngle = angle;
		},
		setFrequencyResponse(state, response) {
			state.frequencyResponse = response;
		},
		setImpedanceResponse(state, response) {
			state.impedanceResponse = response;
		},
		setSimulating(state, value) {
			state.isSimulating = value;
		},
	},
	actions: {
		async runSimulation({ commit }) {
			commit('setSimulating', true);
			try {
				// Simulation logic will be implemented in later tasks
				console.log('Simulation started');
			} catch (error) {
				console.error('Simulation failed:', error);
			} finally {
				commit('setSimulating', false);
			}
		},
	},
	getters: {
		isAutoSimulateEnabled: (state) => state.autoSimulate,
		getCurrentAngle: (state) => state.currentAngle,
	},
};
