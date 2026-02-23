/**
 * App.vue component test
 * Validates the basic Vue 3 renderer process with App.vue
 */

import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import App from '@/renderer/App.vue';
import circuit from '@/renderer/store/circuit';
import simulation from '@/renderer/store/simulation';
import ui from '@/renderer/store/ui';

describe('App.vue', () => {
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

	it('should mount the App component', () => {
		const wrapper = mount(App, {
			global: {
				plugins: [store],
			},
		});
		expect(wrapper.exists()).toBe(true);
	});

	it('should render the application title', () => {
		const wrapper = mount(App, {
			global: {
				plugins: [store],
			},
		});
		expect(wrapper.text()).toContain('Crossover Network Simulator');
	});

	it('should render the initialization message', () => {
		const wrapper = mount(App, {
			global: {
				plugins: [store],
			},
		});
		expect(wrapper.text()).toContain('Application initialized successfully');
	});

	it('should have the app-container class', () => {
		const wrapper = mount(App, {
			global: {
				plugins: [store],
			},
		});
		const container = wrapper.find('.app-container');
		expect(container.exists()).toBe(true);
	});

	it('should log initialization message on mount', () => {
		const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

		mount(App, {
			global: {
				plugins: [store],
			},
		});

		expect(consoleSpy).toHaveBeenCalledWith('Crossover Network Simulator initialized');
		consoleSpy.mockRestore();
	});
});
