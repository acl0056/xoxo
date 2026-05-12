import { mount } from '@vue/test-utils';
import ComponentPalette from '@/renderer/components/ComponentPalette.vue';

describe('ComponentPalette', () => {
	let wrapper;

	beforeEach(() => {
		wrapper = mount(ComponentPalette);
	});

	afterEach(() => {
		wrapper.unmount();
	});

	describe('Component Rendering', () => {
		it('should render the component palette', () => {
			expect(wrapper.find('.component-palette').exists()).toBe(true);
		});

		it('should render the palette title', () => {
			const title = wrapper.find('.palette-title');
			expect(title.exists()).toBe(true);
			expect(title.text()).toBe('Components');
		});

		it('should render all component types', () => {
			const items = wrapper.findAll('.palette-item');
			expect(items.length).toBe(9); // resistor, capacitor, inductor, speaker, ground, peq, filter, opamp + text annotation
		});

		it('should render component labels correctly', () => {
			const labels = wrapper.findAll('.palette-label');
			const labelTexts = labels.map((label) => label.text());

			expect(labelTexts).toContain('Resistor');
			expect(labelTexts).toContain('Capacitor');
			expect(labelTexts).toContain('Inductor');
			expect(labelTexts).toContain('Speaker');
			expect(labelTexts).toContain('Ground');
		});

		it('should render component icons', () => {
			const icons = wrapper.findAll('.palette-icon');
			expect(icons.length).toBe(9);
		});
	});

	describe('Drag and Drop', () => {
		it('should make palette items draggable', () => {
			const icons = wrapper.findAll('.palette-icon');
			icons.forEach((icon) => {
				expect(icon.attributes('draggable')).toBe('true');
			});
		});

		it('should call startDrag when drag starts on resistor', async () => {
			const startDragSpy = jest.spyOn(wrapper.vm, 'startDrag');
			const resistorIcon = wrapper.findAll('.palette-icon')[0];

			// Trigger dragstart event
			await resistorIcon.trigger('dragstart', {
				dataTransfer: {
					effectAllowed: '',
					setData: jest.fn(),
					setDragImage: jest.fn(),
				},
			});

			expect(startDragSpy).toHaveBeenCalled();
		});

		it('should set drag data with component type', () => {
			const mockDataTransfer = {
				effectAllowed: '',
				setData: jest.fn(),
				setDragImage: jest.fn(),
			};

			const mockEvent = {
				dataTransfer: mockDataTransfer,
			};

			const componentType = {
				type: 'resistor',
				label: 'Resistor',
			};

			wrapper.vm.startDrag(mockEvent, componentType);

			expect(mockDataTransfer.effectAllowed).toBe('copy');
			expect(mockDataTransfer.setData).toHaveBeenCalledWith(
				'application/json',
				JSON.stringify({ componentType: 'resistor' }),
			);
		});

		it('should emit drag-start event with component type', () => {
			const mockDataTransfer = {
				effectAllowed: '',
				setData: jest.fn(),
				setDragImage: jest.fn(),
			};

			const mockEvent = {
				dataTransfer: mockDataTransfer,
			};

			const componentType = {
				type: 'capacitor',
				label: 'Capacitor',
			};

			wrapper.vm.startDrag(mockEvent, componentType);

			expect(wrapper.emitted('drag-start')).toBeTruthy();
			expect(wrapper.emitted('drag-start')[0]).toEqual([componentType]);
		});
	});

	describe('Component Types', () => {
		it('should have correct component type data', () => {
			const { componentTypes } = wrapper.vm;

			expect(componentTypes).toHaveLength(8);

			const types = componentTypes.map((ct) => ct.type);
			expect(types).toContain('resistor');
			expect(types).toContain('capacitor');
			expect(types).toContain('inductor');
			expect(types).toContain('speaker');
			expect(types).toContain('ground');
			expect(types).toContain('peq');
			expect(types).toContain('filter');
			expect(types).toContain('opamp');
		});

		it('should have labels for all component types', () => {
			const { componentTypes } = wrapper.vm;

			componentTypes.forEach((componentType) => {
				expect(componentType.label).toBeTruthy();
				expect(typeof componentType.label).toBe('string');
			});
		});

		it('should have icons for all component types', () => {
			const { componentTypes } = wrapper.vm;

			componentTypes.forEach((componentType) => {
				expect(componentType.icon).toBeTruthy();
			});
		});
	});

	describe('Styling', () => {
		it('should apply correct CSS classes', () => {
			expect(wrapper.find('.component-palette').exists()).toBe(true);
			expect(wrapper.find('.palette-title').exists()).toBe(true);
			expect(wrapper.find('.palette-items').exists()).toBe(true);
			expect(wrapper.find('.palette-item').exists()).toBe(true);
			expect(wrapper.find('.palette-icon').exists()).toBe(true);
			expect(wrapper.find('.palette-label').exists()).toBe(true);
		});
	});
});
