/**
 * Unit tests for TuneDialog component
 * Tests parameter validation, engineering notation parsing, and increment functionality
 */

import { mount } from '@vue/test-utils';
import TuneDialog from '@/renderer/components/TuneDialog.vue';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';

describe('TuneDialog', () => {
	describe('Component Initialization', () => {
		it('should not display when visible is false', () => {
			const wrapper = mount(TuneDialog, {
				props: {
					visible: false,
					component: null,
				},
			});

			expect(wrapper.find('.tune-dialog-overlay').exists()).toBe(false);
		});

		it('should display when visible is true', () => {
			const resistor = new Resistor(0, 0);
			resistor.label = 'R1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			expect(wrapper.find('.tune-dialog-overlay').exists()).toBe(true);
			expect(wrapper.find('.tune-dialog').exists()).toBe(true);
		});

		it('should display component label in title', () => {
			const resistor = new Resistor(0, 0);
			resistor.label = 'R1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			expect(wrapper.find('h3').text()).toContain('R1');
		});
	});

	describe('Passive Component Parameters', () => {
		it('should display resistor parameters', () => {
			const resistor = new Resistor(0, 0);
			resistor.label = 'R1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			expect(wrapper.text()).toContain('Value:');
			expect(wrapper.text()).toContain('State:');
			expect(wrapper.find('.value-input').exists()).toBe(true);
		});

		it('should display capacitor parameters including ESR', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.label = 'C1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: capacitor,
				},
			});

			expect(wrapper.text()).toContain('Value:');
			expect(wrapper.text()).toContain('ESR');
			expect(wrapper.text()).toContain('State:');
		});

		it('should display inductor parameters including ESR', () => {
			const inductor = new Inductor(0, 0);
			inductor.label = 'L1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: inductor,
				},
			});

			expect(wrapper.text()).toContain('Value:');
			expect(wrapper.text()).toContain('ESR');
			expect(wrapper.text()).toContain('State:');
		});

		it('should initialize with component parameter values', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 4700;
			resistor.parameters.tolerance = 5;
			resistor.parameters.state = 'normal';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			expect(wrapper.vm.localParameters.resistance).toBe(4700);
			expect(wrapper.vm.localParameters.tolerance).toBe(5);
			expect(wrapper.vm.localParameters.state).toBe('normal');
		});



		it('should validate ESR is non-negative', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.label = 'C1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: capacitor,
				},
			});

			const esrInputs = wrapper.findAll('input[type="number"]');
			const esrInput = esrInputs.find((input) => input.element.value === '0');
			expect(esrInput.attributes('min')).toBe('0');
		});
	});

	describe('Engineering Notation Parsing', () => {
		it('should format resistance value in engineering notation', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 4700;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			expect(wrapper.vm.valueInput).toBe('4.7k');
		});

		it('should format capacitance value in engineering notation', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.capacitance = 10e-6;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: capacitor,
				},
			});

			expect(wrapper.vm.valueInput).toBe('10u');
		});

		it('should parse engineering notation on blur', async () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 1000;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const valueInput = wrapper.find('.value-input');
			await valueInput.setValue('4.7k');
			await valueInput.trigger('blur');

			expect(wrapper.vm.localParameters.resistance).toBe(4700);
		});

		it('should revert to previous value on invalid input', async () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 1000;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const valueInput = wrapper.find('.value-input');
			await valueInput.setValue('invalid');
			await valueInput.trigger('blur');

			expect(wrapper.vm.localParameters.resistance).toBe(1000);
			expect(wrapper.vm.valueInput).toBe('1k');
		});

		it('should reject negative values', async () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 1000;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const valueInput = wrapper.find('.value-input');
			await valueInput.setValue('-4.7k');
			await valueInput.trigger('blur');

			expect(wrapper.vm.localParameters.resistance).toBe(1000);
		});
	});

	describe('Increment Buttons', () => {
		it('should display increment and decrement buttons', () => {
			const resistor = new Resistor(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const buttons = wrapper.findAll('.increment-button');
			expect(buttons).toHaveLength(2);
			expect(buttons[0].text()).toBe('▲');
			expect(buttons[1].text()).toBe('▼');
		});

		it('should increment value using E24 series on up button', async () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 1000;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const upButton = wrapper.findAll('.increment-button')[0];
			await upButton.trigger('mousedown');
			await upButton.trigger('mouseup');

			expect(wrapper.vm.localParameters.resistance).toBe(1100);
		});

		it('should decrement value using E24 series on down button', async () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 1000;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const downButton = wrapper.findAll('.increment-button')[1];
			await downButton.trigger('mousedown');
			await downButton.trigger('mouseup');

			expect(wrapper.vm.localParameters.resistance).toBe(910);
		});
	});

	describe('Speaker Parameters', () => {
		it('should display speaker-specific parameters', () => {
			const speaker = new Speaker(0, 0);
			speaker.label = 'S1';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			expect(wrapper.text()).toContain('Name:');
			expect(wrapper.text()).toContain('Sensitivity');
			expect(wrapper.text()).toContain('Delay');
			expect(wrapper.text()).toContain('Invert Polarity');
			expect(wrapper.text()).toContain('Mute');
			expect(wrapper.text()).toContain('FRD File:');
			expect(wrapper.text()).toContain('ZMA File:');
		});

		it('should display phase source radio buttons when FRD file is set', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.frdFile = '/path/to/test.frd';

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			expect(wrapper.text()).toContain('FRD phase source:');
			expect(wrapper.text()).toContain('As Measured');
			expect(wrapper.text()).toContain('Derived (Minimum Phase)');
		});

		it('should display off-axis measurements section', () => {
			const speaker = new Speaker(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			expect(wrapper.text()).toContain('Off-Axis Measurements');
			expect(wrapper.find('.add-button').exists()).toBe(true);
		});

		it('should add off-axis file entry', async () => {
			const speaker = new Speaker(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			const addButton = wrapper.find('.add-button');
			await addButton.trigger('click');

			expect(wrapper.vm.localParameters.offAxisFiles).toHaveLength(1);
			expect(wrapper.vm.localParameters.offAxisFiles[0]).toEqual({
				angle: 0,
				frdPath: '',
				phaseSource: 'measured',
			});
		});

		it('should remove off-axis file entry', async () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/file.frd' },
			];

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			const removeButton = wrapper.find('.remove-button');
			await removeButton.trigger('click');

			expect(wrapper.vm.localParameters.offAxisFiles).toHaveLength(0);
		});

		it('should validate sensitivity step size (0.25 dB)', () => {
			const speaker = new Speaker(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			const inputs = wrapper.findAll('input[type="number"]');
			const sensitivityInput = inputs.find((input) => {
				const label = input.element.previousElementSibling;
				return label && label.textContent.includes('Sensitivity');
			});

			expect(sensitivityInput.attributes('step')).toBe('0.25');
		});
	});

	describe('Voltage Source Parameters', () => {
		it('should display voltage source parameters', () => {
			const source = new VoltageSource(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: source,
				},
			});

			expect(wrapper.text()).toContain('Power (W):');
			expect(wrapper.text()).toContain('at');
			expect(wrapper.text()).toContain('Impedance (Ω):');
			expect(wrapper.text()).toContain('Delay');
			expect(wrapper.text()).toContain('Invert Polarity');
			expect(wrapper.find('.std-button').exists()).toBe(true);
		});

		it('should reset to standard values (1W at 8Ω)', async () => {
			const source = new VoltageSource(0, 0);
			source.parameters.power = 10;
			source.parameters.impedance = 4;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: source,
				},
			});

			const stdButton = wrapper.find('.std-button');
			await stdButton.trigger('click');

			expect(wrapper.vm.localParameters.power).toBe(1.0);
			expect(wrapper.vm.localParameters.impedance).toBe(8.0);
		});

		it('should validate power is positive', () => {
			const source = new VoltageSource(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: source,
				},
			});

			const inputs = wrapper.findAll('input[type="number"]');
			const powerInput = inputs[0];
			expect(powerInput.attributes('min')).toBe('0');
		});

		it('should validate impedance is positive', () => {
			const source = new VoltageSource(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: source,
				},
			});

			const inputs = wrapper.findAll('input[type="number"]');
			const impedanceInput = inputs[1];
			expect(impedanceInput.attributes('min')).toBe('0');
		});
	});

	describe('Dialog Actions', () => {
		it('should emit close event when close button clicked', async () => {
			const resistor = new Resistor(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const closeButton = wrapper.find('.close-x-button');
			await closeButton.trigger('click');

			expect(wrapper.emitted('close')).toBeTruthy();
		});

		it('should emit update event with modified parameters on close', async () => {
			const resistor = new Resistor(0, 0);
			resistor.id = 'test-id';
			resistor.parameters.resistance = 1000;

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			// Modify the local parameters
			wrapper.vm.localParameters.resistance = 4700;
			wrapper.vm.valueInput = '4.7k';

			const closeButton = wrapper.find('.close-x-button');
			await closeButton.trigger('click');

			expect(wrapper.emitted('update')).toBeTruthy();
			const updateEvent = wrapper.emitted('update')[0][0];
			expect(updateEvent.componentId).toBe('test-id');
			expect(updateEvent.parameters.resistance).toBe(4700);
		});

		it('should close when clicking overlay background', async () => {
			const resistor = new Resistor(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const overlay = wrapper.find('.tune-dialog-overlay');
			await overlay.trigger('click');

			expect(wrapper.emitted('close')).toBeTruthy();
		});
	});

	describe('Parameter Validation', () => {
		it('should validate state values for passive components', () => {
			const resistor = new Resistor(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: resistor,
				},
			});

			const stateSelect = wrapper.find('select');
			const options = stateSelect.findAll('option');

			expect(options).toHaveLength(3);
			expect(options[0].text()).toBe('Normal');
			expect(options[1].text()).toBe('Open');
			expect(options[2].text()).toBe('Short');
		});

		it('should validate delay is non-negative for all components', () => {
			const speaker = new Speaker(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			const inputs = wrapper.findAll('input[type="number"]');
			const delayInput = inputs.find((input) => {
				const previousElement = input.element.previousElementSibling;
				return previousElement && previousElement.textContent.includes('Delay');
			});

			expect(delayInput.attributes('min')).toBe('0');
		});

		it('should validate off-axis angle range (0-180)', async () => {
			const speaker = new Speaker(0, 0);

			const wrapper = mount(TuneDialog, {
				props: {
					visible: true,
					component: speaker,
				},
			});

			const addButton = wrapper.find('.add-button');
			await addButton.trigger('click');

			const angleInput = wrapper.find('.angle-input');
			expect(angleInput.attributes('min')).toBe('0');
			expect(angleInput.attributes('max')).toBe('180');
		});
	});
});
