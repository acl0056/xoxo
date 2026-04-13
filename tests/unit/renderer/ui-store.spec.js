/**
 * Unit tests for UI state module
 */

import { createStore } from 'vuex';
import uiModule from '@/renderer/store/ui';

describe('UI State Module', () => {
	let store;

	beforeEach(() => {
		// Create a fresh store instance for each test
		store = createStore({
			modules: {
				ui: uiModule,
			},
		});
	});

	describe('Initial State', () => {
		test('should have default zoom level of 100', () => {
			expect(store.state.ui.zoomLevel).toBe(100);
		});

		test('should have no selected component', () => {
			expect(store.state.ui.selectedComponentId).toBeNull();
		});

		test('should have default panel sizes', () => {
			expect(store.state.ui.panelSizes).toEqual({
				palette: 200,
				frequencyResponse: 400,
				impedance: 300,
			});
		});

		test('should have default panel positions', () => {
			expect(store.state.ui.panelPositions).toEqual({
				frequencyResponse: { x: 0, y: 0 },
				impedance: { x: 0, y: 0 },
			});
		});

		test('should have all panels visible by default', () => {
			expect(store.state.ui.panelVisibility).toEqual({
				palette: true,
				frequencyResponse: true,
				impedance: true,
			});
		});

		test('should have default graph scale settings', () => {
			expect(store.state.ui.graphScaleSettings).toEqual({
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
			});
		});

		test('should have default canvas scroll position', () => {
			expect(store.state.ui.canvasScroll).toEqual({ x: 0, y: 0 });
		});

		test('should have default canvas viewport size', () => {
			expect(store.state.ui.canvasViewport).toEqual({ width: 800, height: 600 });
		});
	});

	describe('Zoom Level Mutations', () => {
		test('SET_ZOOM_LEVEL should update zoom level', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 150);
			expect(store.state.ui.zoomLevel).toBe(150);
		});

		test('SET_ZOOM_LEVEL should clamp zoom level to minimum 25', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 10);
			expect(store.state.ui.zoomLevel).toBe(25);
		});

		test('SET_ZOOM_LEVEL should clamp zoom level to maximum 400', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 500);
			expect(store.state.ui.zoomLevel).toBe(400);
		});

		test('SET_ZOOM_LEVEL should accept boundary values', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 25);
			expect(store.state.ui.zoomLevel).toBe(25);

			store.commit('ui/SET_ZOOM_LEVEL', 400);
			expect(store.state.ui.zoomLevel).toBe(400);
		});
	});

	describe('Zoom Actions', () => {
		test('zoomIn should increase zoom by 10', () => {
			// Reset to known state first
			store.commit('ui/SET_ZOOM_LEVEL', 100);
			store.dispatch('ui/zoomIn');
			expect(store.state.ui.zoomLevel).toBe(110);
		});

		test('zoomIn should not exceed maximum zoom', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 395);
			store.dispatch('ui/zoomIn');
			expect(store.state.ui.zoomLevel).toBe(400);
		});

		test('zoomOut should decrease zoom by 10', () => {
			// Reset to known state first
			store.commit('ui/SET_ZOOM_LEVEL', 100);
			store.dispatch('ui/zoomOut');
			expect(store.state.ui.zoomLevel).toBe(90);
		});

		test('zoomOut should not go below minimum zoom', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 30);
			store.dispatch('ui/zoomOut');
			expect(store.state.ui.zoomLevel).toBe(25);
		});

		test('setZoom should set specific zoom level', () => {
			store.dispatch('ui/setZoom', 75);
			expect(store.state.ui.zoomLevel).toBe(75);
		});

		test('resetZoom should reset to 100%', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 200);
			store.dispatch('ui/resetZoom');
			expect(store.state.ui.zoomLevel).toBe(100);
		});
	});

	describe('Component Selection', () => {
		test('SET_SELECTED_COMPONENT should set selected component', () => {
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-123');
			expect(store.state.ui.selectedComponentId).toBe('comp-123');
		});

		test('SET_SELECTED_COMPONENT should allow null to deselect', () => {
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-123');
			store.commit('ui/SET_SELECTED_COMPONENT', null);
			expect(store.state.ui.selectedComponentId).toBeNull();
		});

		test('selectComponent action should select component', () => {
			store.dispatch('ui/selectComponent', 'comp-456');
			expect(store.state.ui.selectedComponentId).toBe('comp-456');
		});

		test('deselectComponent action should clear selection', () => {
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-789');
			store.dispatch('ui/deselectComponent');
			expect(store.state.ui.selectedComponentId).toBeNull();
		});
	});

	describe('Panel Size Management', () => {
		test('SET_PANEL_SIZE should update panel size', () => {
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: 250 });
			expect(store.state.ui.panelSizes.palette).toBe(250);
		});

		test('SET_PANEL_SIZE should not allow negative sizes', () => {
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: -50 });
			expect(store.state.ui.panelSizes.palette).toBe(0);
		});

		test('SET_PANEL_SIZE should ignore unknown panels', () => {
			const originalSizes = { ...store.state.ui.panelSizes };
			store.commit('ui/SET_PANEL_SIZE', { panel: 'unknown', size: 100 });
			expect(store.state.ui.panelSizes).toEqual(originalSizes);
		});

		test('SET_PANEL_SIZE should update multiple panels independently', () => {
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: 180 });
			store.commit('ui/SET_PANEL_SIZE', { panel: 'frequencyResponse', size: 500 });
			expect(store.state.ui.panelSizes.palette).toBe(180);
			expect(store.state.ui.panelSizes.frequencyResponse).toBe(500);
		});
	});

	describe('Panel Position Management', () => {
		test('SET_PANEL_POSITION should update panel position', () => {
			store.commit('ui/SET_PANEL_POSITION', {
				panel: 'frequencyResponse',
				position: { x: 100, y: 200 },
			});
			expect(store.state.ui.panelPositions.frequencyResponse).toEqual({ x: 100, y: 200 });
		});

		test('SET_PANEL_POSITION should ignore unknown panels', () => {
			const originalPositions = { ...store.state.ui.panelPositions };
			store.commit('ui/SET_PANEL_POSITION', {
				panel: 'unknown',
				position: { x: 50, y: 50 },
			});
			expect(store.state.ui.panelPositions).toEqual(originalPositions);
		});

		test('SET_PANEL_POSITION should create new position object', () => {
			const position = { x: 10, y: 20 };
			store.commit('ui/SET_PANEL_POSITION', {
				panel: 'impedance',
				position,
			});
			// Modify original position object
			position.x = 999;
			// Store should have its own copy
			expect(store.state.ui.panelPositions.impedance.x).toBe(10);
		});
	});

	describe('Panel Visibility Management', () => {
		test('SET_PANEL_VISIBILITY should update panel visibility', () => {
			store.commit('ui/SET_PANEL_VISIBILITY', { panel: 'palette', visible: false });
			expect(store.state.ui.panelVisibility.palette).toBe(false);
		});

		test('SET_PANEL_VISIBILITY should ignore unknown panels', () => {
			const originalVisibility = { ...store.state.ui.panelVisibility };
			store.commit('ui/SET_PANEL_VISIBILITY', { panel: 'unknown', visible: false });
			expect(store.state.ui.panelVisibility).toEqual(originalVisibility);
		});

		test('togglePanelVisibility action should toggle visibility', () => {
			// Reset to known state first
			store.commit('ui/SET_PANEL_VISIBILITY', { panel: 'palette', visible: true });
			expect(store.state.ui.panelVisibility.palette).toBe(true);
			store.dispatch('ui/togglePanelVisibility', 'palette');
			expect(store.state.ui.panelVisibility.palette).toBe(false);
			store.dispatch('ui/togglePanelVisibility', 'palette');
			expect(store.state.ui.panelVisibility.palette).toBe(true);
		});
	});

	describe('Graph Scale Settings', () => {
		test('SET_GRAPH_SCALE_SETTINGS should update scale settings', () => {
			store.commit('ui/SET_GRAPH_SCALE_SETTINGS', {
				graph: 'frequencyResponse',
				settings: { minFreq: 10, maxFreq: 30000 },
			});
			expect(store.state.ui.graphScaleSettings.frequencyResponse.minFreq).toBe(10);
			expect(store.state.ui.graphScaleSettings.frequencyResponse.maxFreq).toBe(30000);
			// Other settings should remain unchanged
			expect(store.state.ui.graphScaleSettings.frequencyResponse.centerValue).toBe(0);
			expect(store.state.ui.graphScaleSettings.frequencyResponse.stepSize).toBe(5);
		});

		test('SET_GRAPH_SCALE_SETTINGS should merge settings', () => {
			store.commit('ui/SET_GRAPH_SCALE_SETTINGS', {
				graph: 'impedance',
				settings: { stepSize: 10 },
			});
			expect(store.state.ui.graphScaleSettings.impedance).toEqual({
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 0,
				stepSize: 10,
			});
		});

		test('SET_GRAPH_SCALE_SETTINGS should ignore unknown graphs', () => {
			const originalSettings = { ...store.state.ui.graphScaleSettings };
			store.commit('ui/SET_GRAPH_SCALE_SETTINGS', {
				graph: 'unknown',
				settings: { minFreq: 100 },
			});
			expect(store.state.ui.graphScaleSettings).toEqual(originalSettings);
		});

		test('updateGraphScale action should update settings', () => {
			store.dispatch('ui/updateGraphScale', {
				graph: 'frequencyResponse',
				settings: { centerValue: -10, stepSize: 2 },
			});
			expect(store.state.ui.graphScaleSettings.frequencyResponse.centerValue).toBe(-10);
			expect(store.state.ui.graphScaleSettings.frequencyResponse.stepSize).toBe(2);
		});

		test('resetGraphScale action should reset to defaults', () => {
			store.commit('ui/SET_GRAPH_SCALE_SETTINGS', {
				graph: 'impedance',
				settings: { minFreq: 100, maxFreq: 10000, centerValue: 50, stepSize: 10 },
			});
			store.dispatch('ui/resetGraphScale', 'impedance');
			expect(store.state.ui.graphScaleSettings.impedance).toEqual({
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 0,
				stepSize: 5,
			});
		});
	});

	describe('Canvas Scroll and Viewport', () => {
		test('SET_CANVAS_SCROLL should update scroll position', () => {
			store.commit('ui/SET_CANVAS_SCROLL', { x: 100, y: 200 });
			expect(store.state.ui.canvasScroll).toEqual({ x: 100, y: 200 });
		});

		test('SET_CANVAS_SCROLL should create new position object', () => {
			const position = { x: 50, y: 75 };
			store.commit('ui/SET_CANVAS_SCROLL', position);
			position.x = 999;
			expect(store.state.ui.canvasScroll.x).toBe(50);
		});

		test('updateCanvasScroll action should update scroll position', () => {
			store.dispatch('ui/updateCanvasScroll', { x: 300, y: 400 });
			expect(store.state.ui.canvasScroll).toEqual({ x: 300, y: 400 });
		});

		test('SET_CANVAS_VIEWPORT should update viewport size', () => {
			store.commit('ui/SET_CANVAS_VIEWPORT', { width: 1024, height: 768 });
			expect(store.state.ui.canvasViewport).toEqual({ width: 1024, height: 768 });
		});

		test('SET_CANVAS_VIEWPORT should create new size object', () => {
			const size = { width: 640, height: 480 };
			store.commit('ui/SET_CANVAS_VIEWPORT', size);
			size.width = 999;
			expect(store.state.ui.canvasViewport.width).toBe(640);
		});

		test('updateCanvasViewport action should update viewport size', () => {
			store.dispatch('ui/updateCanvasViewport', { width: 1920, height: 1080 });
			expect(store.state.ui.canvasViewport).toEqual({ width: 1920, height: 1080 });
		});
	});

	describe('Reset UI State', () => {
		test('RESET_UI_STATE should reset all state to defaults', () => {
			// Modify all state
			store.commit('ui/SET_ZOOM_LEVEL', 200);
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-123');
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: 300 });
			store.commit('ui/SET_PANEL_POSITION', { panel: 'frequencyResponse', position: { x: 100, y: 100 } });
			store.commit('ui/SET_PANEL_VISIBILITY', { panel: 'palette', visible: false });
			store.commit('ui/SET_GRAPH_SCALE_SETTINGS', {
				graph: 'frequencyResponse',
				settings: { minFreq: 100, maxFreq: 10000 },
			});
			store.commit('ui/SET_CANVAS_SCROLL', { x: 500, y: 600 });
			store.commit('ui/SET_CANVAS_VIEWPORT', { width: 1024, height: 768 });

			// Reset
			store.commit('ui/RESET_UI_STATE');

			// Verify all defaults
			expect(store.state.ui.zoomLevel).toBe(100);
			expect(store.state.ui.selectedComponentId).toBeNull();
			expect(store.state.ui.panelSizes).toEqual({
				palette: 200,
				frequencyResponse: 400,
				impedance: 300,
			});
			expect(store.state.ui.panelPositions).toEqual({
				frequencyResponse: { x: 0, y: 0 },
				impedance: { x: 0, y: 0 },
			});
			expect(store.state.ui.panelVisibility).toEqual({
				palette: true,
				frequencyResponse: true,
				impedance: true,
			});
			expect(store.state.ui.graphScaleSettings).toEqual({
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
			});
			expect(store.state.ui.canvasScroll).toEqual({ x: 0, y: 0 });
			expect(store.state.ui.canvasViewport).toEqual({ width: 800, height: 600 });
		});

		test('resetUIState action should reset all state', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 150);
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-456');
			store.dispatch('ui/resetUIState');
			expect(store.state.ui.zoomLevel).toBe(100);
			expect(store.state.ui.selectedComponentId).toBeNull();
		});
	});

	describe('Getters', () => {
		test('getZoomLevel should return zoom level', () => {
			store.commit('ui/SET_ZOOM_LEVEL', 125);
			expect(store.getters['ui/getZoomLevel']).toBe(125);
		});

		test('getSelectedComponentId should return selected component ID', () => {
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-999');
			expect(store.getters['ui/getSelectedComponentId']).toBe('comp-999');
		});

		test('hasSelection should return true when component is selected', () => {
			store.commit('ui/SET_SELECTED_COMPONENT', 'comp-123');
			expect(store.getters['ui/hasSelection']).toBe(true);
		});

		test('hasSelection should return false when no component is selected', () => {
			// Reset to known state first
			store.commit('ui/SET_SELECTED_COMPONENT', null);
			expect(store.getters['ui/hasSelection']).toBe(false);
		});

		test('getPanelSize should return panel size', () => {
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: 250 });
			expect(store.getters['ui/getPanelSize']('palette')).toBe(250);
		});

		test('getPanelSize should return 0 for unknown panel', () => {
			expect(store.getters['ui/getPanelSize']('unknown')).toBe(0);
		});

		test('getPanelPosition should return panel position', () => {
			store.commit('ui/SET_PANEL_POSITION', {
				panel: 'frequencyResponse',
				position: { x: 50, y: 100 },
			});
			expect(store.getters['ui/getPanelPosition']('frequencyResponse')).toEqual({ x: 50, y: 100 });
		});

		test('getPanelPosition should return default for unknown panel', () => {
			expect(store.getters['ui/getPanelPosition']('unknown')).toEqual({ x: 0, y: 0 });
		});

		test('isPanelVisible should return panel visibility', () => {
			store.commit('ui/SET_PANEL_VISIBILITY', { panel: 'palette', visible: false });
			expect(store.getters['ui/isPanelVisible']('palette')).toBe(false);
		});

		test('isPanelVisible should return true for unknown panel', () => {
			expect(store.getters['ui/isPanelVisible']('unknown')).toBe(true);
		});

		test('getGraphScaleSettings should return graph scale settings', () => {
			store.commit('ui/SET_GRAPH_SCALE_SETTINGS', {
				graph: 'impedance',
				settings: { minFreq: 10, maxFreq: 50000 },
			});
			const settings = store.getters['ui/getGraphScaleSettings']('impedance');
			expect(settings.minFreq).toBe(10);
			expect(settings.maxFreq).toBe(50000);
		});

		test('getGraphScaleSettings should return defaults for unknown graph', () => {
			expect(store.getters['ui/getGraphScaleSettings']('unknown')).toEqual({
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 0,
				stepSize: 5,
			});
		});

		test('getCanvasScroll should return canvas scroll position', () => {
			store.commit('ui/SET_CANVAS_SCROLL', { x: 123, y: 456 });
			expect(store.getters['ui/getCanvasScroll']).toEqual({ x: 123, y: 456 });
		});

		test('getCanvasViewport should return canvas viewport size', () => {
			store.commit('ui/SET_CANVAS_VIEWPORT', { width: 1280, height: 720 });
			expect(store.getters['ui/getCanvasViewport']).toEqual({ width: 1280, height: 720 });
		});

		test('getAllPanelSizes should return all panel sizes', () => {
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: 180 });
			const sizes = store.getters['ui/getAllPanelSizes'];
			expect(sizes.palette).toBe(180);
			expect(sizes.frequencyResponse).toBe(400);
			expect(sizes.impedance).toBe(300);
		});

		test('getAllGraphScaleSettings should return all graph scale settings', () => {
			const settings = store.getters['ui/getAllGraphScaleSettings'];
			expect(settings.frequencyResponse).toBeDefined();
			expect(settings.impedance).toBeDefined();
		});
	});

	describe('Edge Cases', () => {
		test('should handle rapid zoom changes', () => {
			// Reset to known state first
			store.commit('ui/SET_ZOOM_LEVEL', 100);
			for (let i = 0; i < 10; i++) {
				store.dispatch('ui/zoomIn');
			}
			expect(store.state.ui.zoomLevel).toBe(200);

			for (let i = 0; i < 20; i++) {
				store.dispatch('ui/zoomOut');
			}
			expect(store.state.ui.zoomLevel).toBe(25);
		});

		test('should handle multiple component selections', () => {
			store.dispatch('ui/selectComponent', 'comp-1');
			expect(store.state.ui.selectedComponentId).toBe('comp-1');

			store.dispatch('ui/selectComponent', 'comp-2');
			expect(store.state.ui.selectedComponentId).toBe('comp-2');

			store.dispatch('ui/deselectComponent');
			expect(store.state.ui.selectedComponentId).toBeNull();
		});

		test('should handle panel size updates for all panels', () => {
			const panels = ['palette', 'frequencyResponse', 'impedance'];
			panels.forEach((panel, index) => {
				store.commit('ui/SET_PANEL_SIZE', { panel, size: 100 + index * 50 });
			});

			expect(store.state.ui.panelSizes.palette).toBe(100);
			expect(store.state.ui.panelSizes.frequencyResponse).toBe(150);
			expect(store.state.ui.panelSizes.impedance).toBe(200);
		});

		test('should handle extreme zoom values', () => {
			store.commit('ui/SET_ZOOM_LEVEL', -1000);
			expect(store.state.ui.zoomLevel).toBe(25);

			store.commit('ui/SET_ZOOM_LEVEL', 10000);
			expect(store.state.ui.zoomLevel).toBe(400);

			store.commit('ui/SET_ZOOM_LEVEL', 0);
			expect(store.state.ui.zoomLevel).toBe(25);
		});

		test('should handle negative panel sizes', () => {
			store.commit('ui/SET_PANEL_SIZE', { panel: 'palette', size: -100 });
			expect(store.state.ui.panelSizes.palette).toBe(0);
		});

		test('should handle negative canvas scroll positions', () => {
			store.commit('ui/SET_CANVAS_SCROLL', { x: -50, y: -100 });
			expect(store.state.ui.canvasScroll).toEqual({ x: -50, y: -100 });
		});
	});
});
