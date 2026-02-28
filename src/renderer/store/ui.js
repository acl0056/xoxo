/**
 * UI State Module
 *
 * Manages UI-specific state including:
 * - Panel sizes and positions
 * - Zoom level
 * - Selected component
 * - Graph scale settings
 */
export default {
	namespaced: true,
	state: {
		// Zoom level (percentage, 25-400)
		zoomLevel: 100,

		// Currently selected component ID
		selectedComponentId: null,

		// Panel sizes (in pixels)
		panelSizes: {
			palette: 200, // Component palette width
			frequencyResponse: 400, // Frequency response graph height
			impedance: 300, // Impedance graph height
		},

		// Panel positions (for floating/docked panels)
		panelPositions: {
			frequencyResponse: { x: 0, y: 0 },
			impedance: { x: 0, y: 0 },
		},

		// Panel visibility
		panelVisibility: {
			palette: true,
			frequencyResponse: true,
			impedance: true,
		},

		// Graph scale settings
		graphScaleSettings: {
			frequencyResponse: {
				minFreq: 20, // Hz
				maxFreq: 20000, // Hz
				centerValue: 0, // dB
				stepSize: 5, // dB per grid line
			},
			impedance: {
				minFreq: 20, // Hz
				maxFreq: 20000, // Hz
				centerValue: 0, // Ohms or dB
				stepSize: 5, // Ohms or dB per grid line
			},
		},

		// Canvas scroll position
		canvasScroll: {
			x: 0,
			y: 0,
		},

		// Canvas viewport size
		canvasViewport: {
			width: 800,
			height: 600,
		},
	},
	mutations: {
		/**
		 * Set zoom level
		 * @param {Object} state - Vuex state
		 * @param {number} level - Zoom level (25-400)
		 */
		SET_ZOOM_LEVEL(state, level) {
			state.zoomLevel = Math.max(25, Math.min(400, level));
		},

		/**
		 * Set selected component
		 * @param {Object} state - Vuex state
		 * @param {string|null} componentId - Component ID or null to deselect
		 */
		SET_SELECTED_COMPONENT(state, componentId) {
			state.selectedComponentId = componentId;
		},

		/**
		 * Set panel size
		 * @param {Object} state - Vuex state
		 * @param {Object} payload - Panel name and size
		 * @param {string} payload.panel - Panel name
		 * @param {number} payload.size - Panel size in pixels
		 */
		SET_PANEL_SIZE(state, { panel, size }) {
			if (state.panelSizes[panel] !== undefined) {
				state.panelSizes[panel] = Math.max(0, size);
			}
		},

		/**
		 * Set panel position
		 * @param {Object} state - Vuex state
		 * @param {Object} payload - Panel name and position
		 * @param {string} payload.panel - Panel name
		 * @param {Object} payload.position - Position {x, y}
		 */
		SET_PANEL_POSITION(state, { panel, position }) {
			if (state.panelPositions[panel] !== undefined) {
				state.panelPositions[panel] = { ...position };
			}
		},

		/**
		 * Set panel visibility
		 * @param {Object} state - Vuex state
		 * @param {Object} payload - Panel name and visibility
		 * @param {string} payload.panel - Panel name
		 * @param {boolean} payload.visible - Visibility flag
		 */
		SET_PANEL_VISIBILITY(state, { panel, visible }) {
			if (state.panelVisibility[panel] !== undefined) {
				state.panelVisibility[panel] = visible;
			}
		},

		/**
		 * Set graph scale settings
		 * @param {Object} state - Vuex state
		 * @param {Object} payload - Graph name and settings
		 * @param {string} payload.graph - Graph name ('frequencyResponse' or 'impedance')
		 * @param {Object} payload.settings - Scale settings to merge
		 */
		SET_GRAPH_SCALE_SETTINGS(state, { graph, settings }) {
			if (state.graphScaleSettings[graph] !== undefined) {
				state.graphScaleSettings[graph] = {
					...state.graphScaleSettings[graph],
					...settings,
				};
			}
		},

		/**
		 * Set canvas scroll position
		 * @param {Object} state - Vuex state
		 * @param {Object} position - Scroll position {x, y}
		 */
		SET_CANVAS_SCROLL(state, position) {
			state.canvasScroll = { ...position };
		},

		/**
		 * Set canvas viewport size
		 * @param {Object} state - Vuex state
		 * @param {Object} size - Viewport size {width, height}
		 */
		SET_CANVAS_VIEWPORT(state, size) {
			state.canvasViewport = { ...size };
		},

		/**
		 * Reset all UI state to defaults
		 * @param {Object} state - Vuex state
		 */
		RESET_UI_STATE(state) {
			state.zoomLevel = 100;
			state.selectedComponentId = null;
			state.panelSizes = {
				palette: 200,
				frequencyResponse: 400,
				impedance: 300,
			};
			state.panelPositions = {
				frequencyResponse: { x: 0, y: 0 },
				impedance: { x: 0, y: 0 },
			};
			state.panelVisibility = {
				palette: true,
				frequencyResponse: true,
				impedance: true,
			};
			state.graphScaleSettings = {
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
			};
			state.canvasScroll = { x: 0, y: 0 };
			state.canvasViewport = { width: 800, height: 600 };
		},
	},
	actions: {
		/**
		 * Zoom in by 10%
		 * @param {Object} context - Vuex action context
		 */
		zoomIn({ commit, state }) {
			const newZoom = Math.min(state.zoomLevel + 10, 400);
			commit('SET_ZOOM_LEVEL', newZoom);
		},

		/**
		 * Zoom out by 10%
		 * @param {Object} context - Vuex action context
		 */
		zoomOut({ commit, state }) {
			const newZoom = Math.max(state.zoomLevel - 10, 25);
			commit('SET_ZOOM_LEVEL', newZoom);
		},

		/**
		 * Set zoom to specific level
		 * @param {Object} context - Vuex action context
		 * @param {number} level - Zoom level (25-400)
		 */
		setZoom({ commit }, level) {
			commit('SET_ZOOM_LEVEL', level);
		},

		/**
		 * Reset zoom to 100%
		 * @param {Object} context - Vuex action context
		 */
		resetZoom({ commit }) {
			commit('SET_ZOOM_LEVEL', 100);
		},

		/**
		 * Select a component
		 * @param {Object} context - Vuex action context
		 * @param {string} componentId - Component ID
		 */
		selectComponent({ commit }, componentId) {
			commit('SET_SELECTED_COMPONENT', componentId);
		},

		/**
		 * Deselect current component
		 * @param {Object} context - Vuex action context
		 */
		deselectComponent({ commit }) {
			commit('SET_SELECTED_COMPONENT', null);
		},

		/**
		 * Toggle panel visibility
		 * @param {Object} context - Vuex action context
		 * @param {string} panel - Panel name
		 */
		togglePanelVisibility({ commit, state }, panel) {
			if (state.panelVisibility[panel] !== undefined) {
				commit('SET_PANEL_VISIBILITY', {
					panel,
					visible: !state.panelVisibility[panel],
				});
			}
		},

		/**
		 * Update graph scale settings
		 * @param {Object} context - Vuex action context
		 * @param {Object} payload - Graph name and settings
		 */
		updateGraphScale({ commit }, { graph, settings }) {
			commit('SET_GRAPH_SCALE_SETTINGS', { graph, settings });
		},

		/**
		 * Reset graph scale to defaults
		 * @param {Object} context - Vuex action context
		 * @param {string} graph - Graph name
		 */
		resetGraphScale({ commit }, graph) {
			const defaultSettings = {
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 0,
				stepSize: 5,
			};
			commit('SET_GRAPH_SCALE_SETTINGS', { graph, settings: defaultSettings });
		},

		/**
		 * Update canvas scroll position
		 * @param {Object} context - Vuex action context
		 * @param {Object} position - Scroll position {x, y}
		 */
		updateCanvasScroll({ commit }, position) {
			commit('SET_CANVAS_SCROLL', position);
		},

		/**
		 * Update canvas viewport size
		 * @param {Object} context - Vuex action context
		 * @param {Object} size - Viewport size {width, height}
		 */
		updateCanvasViewport({ commit }, size) {
			commit('SET_CANVAS_VIEWPORT', size);
		},

		/**
		 * Reset all UI state to defaults
		 * @param {Object} context - Vuex action context
		 */
		resetUIState({ commit }) {
			commit('RESET_UI_STATE');
		},
	},
	getters: {
		/**
		 * Get current zoom level
		 * @param {Object} state - Vuex state
		 * @returns {number} Zoom level
		 */
		getZoomLevel: (state) => state.zoomLevel,

		/**
		 * Get selected component ID
		 * @param {Object} state - Vuex state
		 * @returns {string|null} Component ID or null
		 */
		getSelectedComponentId: (state) => state.selectedComponentId,

		/**
		 * Check if a component is selected
		 * @param {Object} state - Vuex state
		 * @returns {boolean} True if a component is selected
		 */
		hasSelection: (state) => state.selectedComponentId !== null,

		/**
		 * Get panel size
		 * @param {Object} state - Vuex state
		 * @returns {Function} Function that takes panel name and returns size
		 */
		getPanelSize: (state) => (panel) => state.panelSizes[panel] || 0,

		/**
		 * Get panel position
		 * @param {Object} state - Vuex state
		 * @returns {Function} Function that takes panel name and returns position
		 */
		getPanelPosition: (state) => (panel) => state.panelPositions[panel] || { x: 0, y: 0 },

		/**
		 * Get panel visibility
		 * @param {Object} state - Vuex state
		 * @returns {Function} Function that takes panel name and returns visibility
		 */
		isPanelVisible: (state) => (panel) => state.panelVisibility[panel] !== false,

		/**
		 * Get graph scale settings
		 * @param {Object} state - Vuex state
		 * @returns {Function} Function that takes graph name and returns settings
		 */
		getGraphScaleSettings: (state) => (graph) => state.graphScaleSettings[graph] || {
			minFreq: 20,
			maxFreq: 20000,
			centerValue: 0,
			stepSize: 5,
		},

		/**
		 * Get canvas scroll position
		 * @param {Object} state - Vuex state
		 * @returns {Object} Scroll position {x, y}
		 */
		getCanvasScroll: (state) => state.canvasScroll,

		/**
		 * Get canvas viewport size
		 * @param {Object} state - Vuex state
		 * @returns {Object} Viewport size {width, height}
		 */
		getCanvasViewport: (state) => state.canvasViewport,

		/**
		 * Get all panel sizes
		 * @param {Object} state - Vuex state
		 * @returns {Object} Panel sizes object
		 */
		getAllPanelSizes: (state) => state.panelSizes,

		/**
		 * Get all graph scale settings
		 * @param {Object} state - Vuex state
		 * @returns {Object} Graph scale settings object
		 */
		getAllGraphScaleSettings: (state) => state.graphScaleSettings,
	},
};
