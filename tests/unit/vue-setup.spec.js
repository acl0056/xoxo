/**
 * Vue 3 setup verification test
 * This test ensures Jest is properly configured to test Vue 3 components
 */

import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

// Simple test component
const TestComponent = defineComponent({
	name: 'TestComponent',
	template: '<div class="test-component">{{ message }}</div>',
	data() {
		return {
			message: 'Hello Vue 3',
		};
	},
});

describe('Vue 3 Setup', () => {
	it('should mount Vue 3 components', () => {
		const wrapper = mount(TestComponent);
		expect(wrapper.exists()).toBe(true);
	});

	it('should render component content', () => {
		const wrapper = mount(TestComponent);
		expect(wrapper.text()).toBe('Hello Vue 3');
	});

	it('should find elements by class', () => {
		const wrapper = mount(TestComponent);
		const element = wrapper.find('.test-component');
		expect(element.exists()).toBe(true);
	});

	it('should access component data', () => {
		const wrapper = mount(TestComponent);
		expect(wrapper.vm.message).toBe('Hello Vue 3');
	});
});
