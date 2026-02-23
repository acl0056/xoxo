import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import CircuitEditor from '@/renderer/components/CircuitEditor.vue';
import { Resistor } from '@/models/Resistor';
import { Wire } from '@/models/Wire';

describe('CircuitEditor - Keyboard Event Handling', () => {
	let store;
	let wrapper;
	let resistor;
	let wire;
	let removeComponentMock;
	let removeWireMock;
	let updateComponentMock;

	beforeEach(() => {
		// Create test components
		resistor = new Resistor(5, 5);
		resistor.label = 'R1';

		wire = new Wire(
			{ componentId: 'comp1', terminal: 0 },
			{ componentId: 'comp2', terminal: 1 },
		);

		// Create mock functions
		removeComponentMock = jest.fn();
		removeWireMock = jest.fn();
		updateComponentMock = jest.fn();

		// Create Vuex store
		store = createStore({
			modules: {
				circuit: {
					namespaced: true,
					state: {
						components: [resistor],
						wires: [wire],
						nodes: [],
						annotations: [],
					},
					mutations: {
						removeComponent: removeComponentMock,
						removeWire: removeWireMock,
						updateComponent: updateComponentMock,
						addComponent: jest.fn(),
						addWire: jest.fn(),
					},
				},
				ui: {
					namespaced: true,
					state: {
						zoomLevel: 100,
						selectedComponentId: null,
					},
					mutations: {
						setZoomLevel: jest.fn(),
						setSelectedComponent: jest.fn(),
					},
					actions: {
						zoomIn: jest.fn(),
						zoomOut: jest.fn(),
					},
				},
			},
		});

		// Mount component
		wrapper = mount(CircuitEditor, {
			global: {
				plugins: [store],
			},
		});
	});

	afterEach(() => {
		wrapper.unmount();
	});

	describe('Escape key', () => {
		it('should close context menu when Escape is pressed', async () => {
			// Open context menu
			wrapper.vm.contextMenuVisible = true;
			wrapper.vm.contextMenuItems = [{ label: 'Delete', action: 'delete' }];

			// Press Escape
			await wrapper.trigger('keydown', { key: 'Escape' });

			// Context menu should be closed
			expect(wrapper.vm.contextMenuVisible).toBe(false);
		});
	});

	describe('Delete key', () => {
		it('should delete selected component when Delete key is pressed', async () => {
			// Select component
			store.state.ui.selectedComponentId = resistor.id;

			// Press Delete
			await wrapper.trigger('keydown', { key: 'Delete' });

			// Component should be deleted
			expect(removeComponentMock).toHaveBeenCalledWith(
				expect.anything(),
				resistor.id,
			);
		});

		it('should delete selected wire when Delete key is pressed', async () => {
			// Select wire
			wrapper.vm.selectedWire = wire.id;

			// Press Delete
			await wrapper.trigger('keydown', { key: 'Delete' });

			// Wire should be deleted
			expect(removeWireMock).toHaveBeenCalledWith(
				expect.anything(),
				wire.id,
			);
		});

		it('should do nothing when Delete is pressed with no selection', async () => {
			// No selection
			store.state.ui.selectedComponentId = null;
			wrapper.vm.selectedWire = null;

			// Press Delete
			await wrapper.trigger('keydown', { key: 'Delete' });

			// Nothing should be deleted
			expect(removeComponentMock).not.toHaveBeenCalled();
			expect(removeWireMock).not.toHaveBeenCalled();
		});
	});

	describe('Backspace key', () => {
		it('should delete selected component when Backspace key is pressed', async () => {
			// Select component
			store.state.ui.selectedComponentId = resistor.id;

			// Press Backspace
			await wrapper.trigger('keydown', { key: 'Backspace' });

			// Component should be deleted
			expect(removeComponentMock).toHaveBeenCalledWith(
				expect.anything(),
				resistor.id,
			);
		});
	});

	describe('T key', () => {
		it('should open tune dialog for selected component when T is pressed', async () => {
			// Select component
			store.state.ui.selectedComponentId = resistor.id;

			// Spy on openTuneDialog method
			const openTuneDialogSpy = jest.spyOn(wrapper.vm, 'openTuneDialog');

			// Press T
			await wrapper.trigger('keydown', { key: 't' });

			// Tune dialog should be opened
			expect(openTuneDialogSpy).toHaveBeenCalledWith(resistor);
		});

		it('should open tune dialog when uppercase T is pressed', async () => {
			// Select component
			store.state.ui.selectedComponentId = resistor.id;

			// Spy on openTuneDialog method
			const openTuneDialogSpy = jest.spyOn(wrapper.vm, 'openTuneDialog');

			// Press T (uppercase)
			await wrapper.trigger('keydown', { key: 'T' });

			// Tune dialog should be opened
			expect(openTuneDialogSpy).toHaveBeenCalledWith(resistor);
		});

		it('should do nothing when T is pressed with no selection', async () => {
			// No selection
			store.state.ui.selectedComponentId = null;

			// Spy on openTuneDialog method
			const openTuneDialogSpy = jest.spyOn(wrapper.vm, 'openTuneDialog');

			// Press T
			await wrapper.trigger('keydown', { key: 't' });

			// Tune dialog should not be opened
			expect(openTuneDialogSpy).not.toHaveBeenCalled();
		});
	});

	describe('Spacebar key', () => {
		it('should rotate selected component when Spacebar is pressed', async () => {
			// Select component
			store.state.ui.selectedComponentId = resistor.id;

			// Initial rotation
			const initialRotation = resistor.rotation;

			// Press Spacebar
			await wrapper.trigger('keydown', { key: ' ' });

			// Component should be rotated
			expect(updateComponentMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					componentId: resistor.id,
					updates: expect.objectContaining({
						rotation: expect.any(Number),
					}),
				}),
			);
		});

		it('should do nothing when Spacebar is pressed with no selection', async () => {
			// No selection
			store.state.ui.selectedComponentId = null;

			// Press Spacebar
			await wrapper.trigger('keydown', { key: ' ' });

			// Component should not be rotated
			expect(updateComponentMock).not.toHaveBeenCalled();
		});
	});

	describe('Multiple key presses', () => {
		it('should handle multiple Delete key presses', async () => {
			// Select component
			store.state.ui.selectedComponentId = resistor.id;

			// Press Delete twice
			await wrapper.trigger('keydown', { key: 'Delete' });
			await wrapper.trigger('keydown', { key: 'Delete' });

			// Component should be deleted (called at least once)
			expect(removeComponentMock).toHaveBeenCalled();
		});

		it('should handle Escape after opening context menu', async () => {
			// Open context menu
			wrapper.vm.contextMenuVisible = true;

			// Press Escape
			await wrapper.trigger('keydown', { key: 'Escape' });

			// Context menu should be closed
			expect(wrapper.vm.contextMenuVisible).toBe(false);

			// Press Escape again (should not cause errors)
			await wrapper.trigger('keydown', { key: 'Escape' });

			// Context menu should still be closed
			expect(wrapper.vm.contextMenuVisible).toBe(false);
		});
	});
});
