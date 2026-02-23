/**
 * Vuex store integration test
 * Validates the store modules are properly configured
 */

import { createStore } from 'vuex';
import circuit from '@/renderer/store/circuit';
import simulation from '@/renderer/store/simulation';
import ui from '@/renderer/store/ui';

describe('Vuex Store', () => {
	let store;

	beforeEach(() => {
		store = createStore({
			modules: {
				circuit,
				simulation,
				ui,
			},
		});
	});

	describe('Circuit Module', () => {
		it('should have initial state', () => {
			expect(store.state.circuit.components).toEqual([]);
			expect(store.state.circuit.wires).toEqual([]);
			expect(store.state.circuit.nodes).toEqual([]);
			expect(store.state.circuit.annotations).toEqual([]);
			expect(store.state.circuit.metadata.version).toBe('1.0');
		});

		it('should add a component', () => {
			const component = { id: 'test-1', type: 'resistor' };
			store.commit('circuit/addComponent', component);
			expect(store.state.circuit.components).toHaveLength(1);
			expect(store.state.circuit.components[0]).toEqual(component);
		});

		it('should remove a component', () => {
			const component = { id: 'test-1', type: 'resistor' };
			store.commit('circuit/addComponent', component);
			store.commit('circuit/removeComponent', 'test-1');
			expect(store.state.circuit.components).toHaveLength(0);
		});
	});

	describe('Simulation Module', () => {
		it('should have initial state', () => {
			expect(store.state.simulation.autoSimulate).toBe(true);
			expect(store.state.simulation.currentAngle).toBe(0);
			expect(store.state.simulation.frequencyResponse).toBeNull();
			expect(store.state.simulation.impedanceResponse).toBeNull();
			expect(store.state.simulation.isSimulating).toBe(false);
		});

		it('should toggle auto-simulate', () => {
			store.commit('simulation/setAutoSimulate', false);
			expect(store.state.simulation.autoSimulate).toBe(false);
		});

		it('should set current angle', () => {
			store.commit('simulation/setCurrentAngle', 30);
			expect(store.state.simulation.currentAngle).toBe(30);
		});
	});

	describe('UI Module', () => {
		it('should have initial state', () => {
			expect(store.state.ui.zoomLevel).toBe(100);
			expect(store.state.ui.selectedComponentId).toBeNull();
			expect(store.state.ui.panelSizes.palette).toBe(200);
		});

		it('should set zoom level', () => {
			store.commit('ui/setZoomLevel', 150);
			expect(store.state.ui.zoomLevel).toBe(150);
		});

		it('should zoom in from default level', () => {
			store.commit('ui/setZoomLevel', 100);
			store.dispatch('ui/zoomIn');
			expect(store.state.ui.zoomLevel).toBe(110);
		});

		it('should zoom out from default level', () => {
			store.commit('ui/setZoomLevel', 100);
			store.dispatch('ui/zoomOut');
			expect(store.state.ui.zoomLevel).toBe(90);
		});

		it('should not zoom beyond maximum', () => {
			store.commit('ui/setZoomLevel', 400);
			store.dispatch('ui/zoomIn');
			expect(store.state.ui.zoomLevel).toBe(400);
		});

		it('should not zoom below minimum', () => {
			store.commit('ui/setZoomLevel', 25);
			store.dispatch('ui/zoomOut');
			expect(store.state.ui.zoomLevel).toBe(25);
		});
	});
});
