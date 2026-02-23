export default {
	namespaced: true,
	state: {
		zoomLevel: 100,
		selectedComponentId: null,
		panelSizes: {
			palette: 200,
		},
		graphScaleSettings: {
			frequencyResponse: {
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 0,
				stepSize: 5,
			},
			impedance: {
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 0,
				stepSize: 5,
			},
		},
	},
	mutations: {
		setZoomLevel(state, level) {
			state.zoomLevel = level;
		},
		setSelectedComponent(state, componentId) {
			state.selectedComponentId = componentId;
		},
		setPanelSize(state, { panel, size }) {
			state.panelSizes[panel] = size;
		},
		setGraphScaleSettings(state, { graph, settings }) {
			state.graphScaleSettings[graph] = { ...state.graphScaleSettings[graph], ...settings };
		},
	},
	actions: {
		zoomIn({ commit, state }) {
			const newZoom = Math.min(state.zoomLevel + 10, 400);
			commit('setZoomLevel', newZoom);
		},
		zoomOut({ commit, state }) {
			const newZoom = Math.max(state.zoomLevel - 10, 25);
			commit('setZoomLevel', newZoom);
		},
	},
	getters: {
		getZoomLevel: (state) => state.zoomLevel,
		getSelectedComponentId: (state) => state.selectedComponentId,
	},
};
