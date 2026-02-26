import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import ImpedanceGraph from '@/renderer/components/ImpedanceGraph.vue';

describe('ImpedanceGraph', () => {
	let wrapper;
	let store;

	beforeEach(() => {
		// Mock canvas getContext
		HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
			clearRect: jest.fn(),
			fillRect: jest.fn(),
			strokeRect: jest.fn(),
			beginPath: jest.fn(),
			moveTo: jest.fn(),
			lineTo: jest.fn(),
			stroke: jest.fn(),
			fill: jest.fn(),
			fillText: jest.fn(),
			save: jest.fn(),
			restore: jest.fn(),
			translate: jest.fn(),
			rotate: jest.fn(),
			scale: jest.fn(),
		}));

		store = createStore({
			modules: {
				simulation: {
					namespaced: true,
					state: {
						impedanceResponse: null,
					},
				},
			},
		});

		wrapper = mount(ImpedanceGraph, {
			global: {
				plugins: [store],
			},
		});
	});

	afterEach(() => {
		wrapper.unmount();
	});

	describe('Axis Calculations', () => {
		describe('frequencyToX', () => {
			it('should convert frequency to x coordinate using logarithmic scale', () => {
				const marginLeft = 60;
				const graphWidth = 800;

				// Test at minimum frequency (20 Hz)
				const xMin = wrapper.vm.frequencyToX(20, marginLeft, graphWidth);
				expect(xMin).toBeCloseTo(marginLeft, 1);

				// Test at maximum frequency (20000 Hz)
				const xMax = wrapper.vm.frequencyToX(20000, marginLeft, graphWidth);
				expect(xMax).toBeCloseTo(marginLeft + graphWidth, 1);

				// Test at middle frequency (logarithmic middle)
				const middleFreq = Math.sqrt(20 * 20000); // Geometric mean
				const xMiddle = wrapper.vm.frequencyToX(middleFreq, marginLeft, graphWidth);
				expect(xMiddle).toBeCloseTo(marginLeft + graphWidth / 2, 1);
			});

			it('should handle frequencies at decade boundaries', () => {
				const marginLeft = 60;
				const graphWidth = 800;

				const x100 = wrapper.vm.frequencyToX(100, marginLeft, graphWidth);
				const x1000 = wrapper.vm.frequencyToX(1000, marginLeft, graphWidth);
				const x10000 = wrapper.vm.frequencyToX(10000, marginLeft, graphWidth);

				// Each decade should be evenly spaced on logarithmic scale
				const spacing1 = x1000 - x100;
				const spacing2 = x10000 - x1000;
				expect(spacing1).toBeCloseTo(spacing2, 1);
			});
		});

		describe('xToFrequency', () => {
			it('should convert x coordinate to frequency using logarithmic scale', () => {
				const marginLeft = 60;
				const graphWidth = 800;

				// Test at left edge
				const freqMin = wrapper.vm.xToFrequency(marginLeft, marginLeft, graphWidth);
				expect(freqMin).toBeCloseTo(20, 1);

				// Test at right edge
				const freqMax = wrapper.vm.xToFrequency(marginLeft + graphWidth, marginLeft, graphWidth);
				expect(freqMax).toBeCloseTo(20000, 1);

				// Test at middle
				const freqMiddle = wrapper.vm.xToFrequency(marginLeft + graphWidth / 2, marginLeft, graphWidth);
				const expectedMiddle = Math.sqrt(20 * 20000);
				expect(freqMiddle).toBeCloseTo(expectedMiddle, 1);
			});

			it('should be inverse of frequencyToX', () => {
				const marginLeft = 60;
				const graphWidth = 800;
				const testFrequencies = [20, 100, 500, 1000, 5000, 10000, 20000];

				testFrequencies.forEach((freq) => {
					const x = wrapper.vm.frequencyToX(freq, marginLeft, graphWidth);
					const recoveredFreq = wrapper.vm.xToFrequency(x, marginLeft, graphWidth);
					expect(recoveredFreq).toBeCloseTo(freq, 1);
				});
			});
		});

		describe('valueToY', () => {
			it('should convert impedance value to y coordinate using linear scale', () => {
				const marginTop = 20;
				const graphHeight = 600;

				// Default scale: center at 8, step size 2, range 20 Ω (-2 to +18)
				const yMax = wrapper.vm.valueToY(18, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yMin = wrapper.vm.valueToY(-2, marginTop, graphHeight);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);

				const yCenter = wrapper.vm.valueToY(8, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);
			});

			it('should handle different step sizes', () => {
				const marginTop = 20;
				const graphHeight = 600;

				// Change step size to 5
				wrapper.vm.scaleSettings.stepSize = 5;

				// Range is now 50 Ω (-17 to +33)
				const yMax = wrapper.vm.valueToY(33, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yMin = wrapper.vm.valueToY(-17, marginTop, graphHeight);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});

			it('should handle different center values', () => {
				const marginTop = 20;
				const graphHeight = 600;

				// Change center to 16 Ω
				wrapper.vm.scaleSettings.centerValue = 16;

				// Range is 20 Ω (6 to 26)
				const yMax = wrapper.vm.valueToY(26, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yCenter = wrapper.vm.valueToY(16, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);
			});
		});

		describe('yToValue', () => {
			it('should convert y coordinate to impedance value using linear scale', () => {
				const marginTop = 20;
				const graphHeight = 600;

				const valueTop = wrapper.vm.yToValue(marginTop, marginTop, graphHeight);
				expect(valueTop).toBeCloseTo(18, 1);

				const valueBottom = wrapper.vm.yToValue(marginTop + graphHeight, marginTop, graphHeight);
				expect(valueBottom).toBeCloseTo(-2, 1);

				const valueCenter = wrapper.vm.yToValue(marginTop + graphHeight / 2, marginTop, graphHeight);
				expect(valueCenter).toBeCloseTo(8, 1);
			});

			it('should be inverse of valueToY', () => {
				const marginTop = 20;
				const graphHeight = 600;
				const testValues = [-2, 0, 4, 8, 12, 16, 18];

				testValues.forEach((value) => {
					const y = wrapper.vm.valueToY(value, marginTop, graphHeight);
					const recoveredValue = wrapper.vm.yToValue(y, marginTop, graphHeight);
					expect(recoveredValue).toBeCloseTo(value, 1);
				});
			});
		});

		describe('generateFrequencyLabels', () => {
			it('should generate labels at decade boundaries', () => {
				const labels = wrapper.vm.generateFrequencyLabels();

				expect(labels.length).toBeGreaterThan(0);

				// Should include 100, 1000, 10000
				const frequencies = labels.map((l) => l.freq);
				expect(frequencies).toContain(100);
				expect(frequencies).toContain(1000);
				expect(frequencies).toContain(10000);
			});

			it('should format labels correctly', () => {
				const labels = wrapper.vm.generateFrequencyLabels();

				const label100 = labels.find((l) => l.freq === 100);
				expect(label100.label).toBe('100');

				const label1000 = labels.find((l) => l.freq === 1000);
				expect(label1000.label).toBe('1k');

				const label10000 = labels.find((l) => l.freq === 10000);
				expect(label10000.label).toBe('10k');
			});

			it('should adapt to different frequency ranges', () => {
				wrapper.vm.scaleSettings.minFreq = 100;
				wrapper.vm.scaleSettings.maxFreq = 10000;

				const labels = wrapper.vm.generateFrequencyLabels();
				const frequencies = labels.map((l) => l.freq);

				expect(frequencies).toContain(100);
				expect(frequencies).toContain(1000);
				expect(frequencies).toContain(10000);
				expect(frequencies).not.toContain(20);
			});
		});

		describe('generateValueLabels', () => {
			it('should generate labels at step intervals', () => {
				const labels = wrapper.vm.generateValueLabels();

				expect(labels.length).toBeGreaterThan(0);

				// With default settings (center 8, step 2, range 20)
				// Should have labels at -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18
				const values = labels.map((l) => l.value);
				expect(values).toContain(-2);
				expect(values).toContain(8);
				expect(values).toContain(18);
			});

			it('should format labels as integers', () => {
				const labels = wrapper.vm.generateValueLabels();

				labels.forEach((label) => {
					expect(label.label).toMatch(/^-?\d+$/);
				});
			});

			it('should adapt to different step sizes', () => {
				wrapper.vm.scaleSettings.stepSize = 5;

				const labels = wrapper.vm.generateValueLabels();
				const values = labels.map((l) => l.value);

				// Should have labels at -17, -12, -7, -2, 3, 8, 13, 18, 23, 28, 33
				expect(values).toContain(-17);
				expect(values).toContain(8);
				expect(values).toContain(33);
			});
		});
	});

	describe('Curve Management', () => {
		it('should update curves when impedance response changes', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				impedances: [8.0, 8.2, 8.5, 9.0, 8.8, 8.3, 8.0],
				phases: [-5, -3, 0, 5, 3, -2, -5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.curves.length).toBeGreaterThan(0);
			expect(wrapper.vm.curves[0].id).toBe('impedance');
			expect(wrapper.vm.curves[0].frequencies).toEqual(impedanceResponse.frequencies);
			expect(wrapper.vm.curves[0].values).toEqual(impedanceResponse.impedances);
		});

		it('should include phase curve when showPhase is enabled', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			wrapper.vm.showPhase = true;
			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.curves.length).toBe(2); // Impedance + Phase
			expect(wrapper.vm.curves[0].id).toBe('impedance');
			expect(wrapper.vm.curves[1].id).toBe('phase');
			expect(wrapper.vm.curves[1].values).toEqual(impedanceResponse.phases);
		});

		it('should not include phase curve when showPhase is disabled', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			wrapper.vm.showPhase = false;
			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.curves.length).toBe(1); // Only impedance
			expect(wrapper.vm.curves[0].id).toBe('impedance');
		});

		it('should skip infinite impedance values when drawing curves', () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, Infinity, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;
			wrapper.vm.updateCurves();

			// Should not throw error when rendering
			expect(() => wrapper.vm.renderGraph()).not.toThrow();
		});
	});

	describe('Hold Feature', () => {
		it('should capture curves when hold is activated', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.holdActive).toBe(false);
			expect(wrapper.vm.heldCurves).toBeNull();

			wrapper.vm.toggleHold();

			expect(wrapper.vm.holdActive).toBe(true);
			expect(wrapper.vm.heldCurves).toBeTruthy();
			expect(wrapper.vm.heldCurves.length).toBe(wrapper.vm.curves.length);
		});

		it('should release held curves when hold is deactivated', () => {
			wrapper.vm.holdActive = true;
			wrapper.vm.heldCurves = [{ id: 'test', frequencies: [], values: [] }];

			wrapper.vm.toggleHold();

			expect(wrapper.vm.holdActive).toBe(false);
			expect(wrapper.vm.heldCurves).toBeNull();
		});

		it('should deep copy curves when holding', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			wrapper.vm.toggleHold();

			// Modify current curves
			wrapper.vm.curves[0].values[0] = 999;

			// Held curves should not be affected
			expect(wrapper.vm.heldCurves[0].values[0]).toBe(8.0);
		});

		it('should preserve held curves when impedance response updates', async () => {
			const initialResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			store.state.simulation.impedanceResponse = initialResponse;
			await wrapper.vm.$nextTick();

			wrapper.vm.toggleHold();
			const heldData = wrapper.vm.heldCurves[0].values[0];

			// Update impedance response
			const newResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [6.0, 6.2, 6.5, 7.0],
				phases: [-10, -8, -5, 0],
			};

			store.state.simulation.impedanceResponse = newResponse;
			await wrapper.vm.$nextTick();

			// Held curves should still have original data
			expect(wrapper.vm.heldCurves[0].values[0]).toBe(heldData);
			// Current curves should have new data
			expect(wrapper.vm.curves[0].values[0]).toBe(6.0);
		});

		it('should toggle button text between Hold and Release', async () => {
			expect(wrapper.vm.holdActive).toBe(false);

			const buttons = wrapper.findAll('button');
			const holdButton = buttons.find((b) => b.text().includes('Hold') || b.text().includes('Release'));

			expect(holdButton.text()).toBe('Hold');

			wrapper.vm.toggleHold();
			await wrapper.vm.$nextTick();

			expect(holdButton.text()).toBe('Release');

			wrapper.vm.toggleHold();
			await wrapper.vm.$nextTick();

			expect(holdButton.text()).toBe('Hold');
		});

		it('should render held curves in gray', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			wrapper.vm.toggleHold();

			// Mock the drawCurves method to verify it's called with isHeld=true
			const drawCurvesSpy = jest.spyOn(wrapper.vm, 'drawCurves');

			wrapper.vm.renderGraph();

			// Should be called twice: once for held curves (isHeld=true), once for current curves (isHeld=false)
			expect(drawCurvesSpy).toHaveBeenCalledWith(
				wrapper.vm.heldCurves,
				expect.any(Object),
				expect.any(Number),
				expect.any(Number),
				true,
			);

			expect(drawCurvesSpy).toHaveBeenCalledWith(
				wrapper.vm.curves,
				expect.any(Object),
				expect.any(Number),
				expect.any(Number),
				false,
			);

			drawCurvesSpy.mockRestore();
		});

		it('should not render held curves when hold is inactive', () => {
			wrapper.vm.holdActive = false;
			wrapper.vm.heldCurves = null;

			const drawCurvesSpy = jest.spyOn(wrapper.vm, 'drawCurves');

			wrapper.vm.renderGraph();

			// Should only be called once for current curves
			expect(drawCurvesSpy).toHaveBeenCalledTimes(1);
			expect(drawCurvesSpy).toHaveBeenCalledWith(
				wrapper.vm.curves,
				expect.any(Object),
				expect.any(Number),
				expect.any(Number),
				false,
			);

			drawCurvesSpy.mockRestore();
		});
	});

	describe('Tooltip', () => {
		it('should show tooltip on mouse move over graph area', async () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				impedances: [8.0, 8.2, 8.5, 9.0, 8.8, 8.3, 8.0],
				phases: [-5, -3, 0, 5, 3, -2, -5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;
			await wrapper.vm.$nextTick();

			const canvas = wrapper.find('canvas');
			const canvasElement = canvas.element;

			// Mock canvas dimensions
			canvasElement.width = 900;
			canvasElement.height = 640;

			// Mock getBoundingClientRect
			canvasElement.getBoundingClientRect = jest.fn(() => ({
				left: 0,
				top: 0,
				width: 900,
				height: 640,
			}));

			// Simulate mouse move in graph area
			canvas.trigger('mousemove', {
				clientX: 400,
				clientY: 300,
			});

			expect(wrapper.vm.tooltip.visible).toBe(true);
			expect(wrapper.vm.tooltip.frequency).toBeTruthy();
			expect(wrapper.vm.tooltip.impedance).toBeTruthy();
			expect(wrapper.vm.tooltip.phase).toBeTruthy();
		});

		it('should hide tooltip on mouse leave', () => {
			wrapper.vm.tooltip.visible = true;

			const canvas = wrapper.find('canvas');
			canvas.trigger('mouseleave');

			expect(wrapper.vm.tooltip.visible).toBe(false);
		});

		it('should find closest frequency index for tooltip', () => {
			const impedanceResponse = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				impedances: [8.0, 8.2, 8.5, 9.0, 8.8, 8.3, 8.0],
				phases: [-5, -3, 0, 5, 3, -2, -5],
			};

			store.state.simulation.impedanceResponse = impedanceResponse;

			// Test finding closest to 150 Hz (should be index 0 or 1)
			const index1 = wrapper.vm.findClosestFrequencyIndex(150);
			expect([0, 1]).toContain(index1);

			// Test finding closest to 1000 Hz (should be index 3)
			const index2 = wrapper.vm.findClosestFrequencyIndex(1000);
			expect(index2).toBe(3);

			// Test finding closest to 7500 Hz (should be index 5 or 6)
			const index3 = wrapper.vm.findClosestFrequencyIndex(7500);
			expect([5, 6]).toContain(index3);
		});
	});

	describe('Canvas Rendering', () => {
		it('should initialize canvas on mount', () => {
			expect(wrapper.vm.canvas).toBeTruthy();
			expect(wrapper.vm.context).toBeTruthy();
		});

		it('should resize canvas to fit container', () => {
			const canvas = wrapper.vm.canvas;
			const parentElement = canvas.parentElement;

			// Mock parent dimensions
			Object.defineProperty(parentElement, 'clientWidth', {
				value: 1000,
				writable: true,
			});
			Object.defineProperty(parentElement, 'clientHeight', {
				value: 700,
				writable: true,
			});

			wrapper.vm.resizeCanvas();

			expect(canvas.width).toBe(1000);
			expect(canvas.height).toBe(660); // 700 - 40 for menu bar
		});

		it('should render without errors when no data is available', () => {
			expect(() => wrapper.vm.renderGraph()).not.toThrow();
		});
	});

	describe('Default Settings', () => {
		it('should have appropriate default scale settings for impedance', () => {
			expect(wrapper.vm.scaleSettings.minFreq).toBe(20);
			expect(wrapper.vm.scaleSettings.maxFreq).toBe(20000);
			expect(wrapper.vm.scaleSettings.centerValue).toBe(8);
			expect(wrapper.vm.scaleSettings.stepSize).toBe(2);
		});

		it('should have default colors for impedance and phase curves', () => {
			expect(wrapper.vm.curveColors.impedance).toBeTruthy();
			expect(wrapper.vm.curveColors.phase).toBeTruthy();
		});

		it('should have phase curve disabled by default', () => {
			expect(wrapper.vm.showPhase).toBe(false);
		});
	});

	describe('Scale Controls', () => {
		describe('Scale Settings', () => {
			it('should allow changing min frequency', async () => {
				wrapper.vm.scaleSettings.minFreq = 100;
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleSettings.minFreq).toBe(100);

				// Verify transformation uses new min frequency
				const marginLeft = 60;
				const graphWidth = 800;
				const xMin = wrapper.vm.frequencyToX(100, marginLeft, graphWidth);
				expect(xMin).toBeCloseTo(marginLeft, 1);
			});

			it('should allow changing max frequency', async () => {
				wrapper.vm.scaleSettings.maxFreq = 10000;
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleSettings.maxFreq).toBe(10000);

				// Verify transformation uses new max frequency
				const marginLeft = 60;
				const graphWidth = 800;
				const xMax = wrapper.vm.frequencyToX(10000, marginLeft, graphWidth);
				expect(xMax).toBeCloseTo(marginLeft + graphWidth, 1);
			});

			it('should allow changing vertical center value', async () => {
				wrapper.vm.scaleSettings.centerValue = 16;
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleSettings.centerValue).toBe(16);

				// Verify transformation uses new center value
				const marginTop = 20;
				const graphHeight = 600;
				const yCenter = wrapper.vm.valueToY(16, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);
			});

			it('should allow changing vertical step size', async () => {
				wrapper.vm.scaleSettings.stepSize = 5;
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleSettings.stepSize).toBe(5);

				// Verify range calculation uses new step size
				const marginTop = 20;
				const graphHeight = 600;
				const range = wrapper.vm.scaleSettings.stepSize * 10;
				expect(range).toBe(50);

				// Verify transformation uses new range
				const yMax = wrapper.vm.valueToY(33, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);
			});
		});

		describe('Scale Menu', () => {
			it('should toggle scale menu visibility', async () => {
				expect(wrapper.vm.scaleMenuVisible).toBe(false);

				wrapper.vm.toggleScaleMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleMenuVisible).toBe(true);

				wrapper.vm.toggleScaleMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleMenuVisible).toBe(false);
			});

			it('should close scale menu', async () => {
				wrapper.vm.scaleMenuVisible = true;
				await wrapper.vm.$nextTick();

				wrapper.vm.closeScaleMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleMenuVisible).toBe(false);
			});

			it('should reset scale settings to defaults', async () => {
				// Change all settings
				wrapper.vm.scaleSettings.minFreq = 100;
				wrapper.vm.scaleSettings.maxFreq = 10000;
				wrapper.vm.scaleSettings.centerValue = 16;
				wrapper.vm.scaleSettings.stepSize = 5;
				await wrapper.vm.$nextTick();

				// Reset
				wrapper.vm.resetScaleSettings();
				await wrapper.vm.$nextTick();

				// Verify all settings are back to defaults
				expect(wrapper.vm.scaleSettings.minFreq).toBe(20);
				expect(wrapper.vm.scaleSettings.maxFreq).toBe(20000);
				expect(wrapper.vm.scaleSettings.centerValue).toBe(8);
				expect(wrapper.vm.scaleSettings.stepSize).toBe(2);
			});
		});

		describe('Scale Transformations with Custom Settings', () => {
			it('should correctly transform frequencies with custom range', () => {
				wrapper.vm.scaleSettings.minFreq = 100;
				wrapper.vm.scaleSettings.maxFreq = 10000;

				const marginLeft = 60;
				const graphWidth = 800;

				// Test boundaries
				const xMin = wrapper.vm.frequencyToX(100, marginLeft, graphWidth);
				expect(xMin).toBeCloseTo(marginLeft, 1);

				const xMax = wrapper.vm.frequencyToX(10000, marginLeft, graphWidth);
				expect(xMax).toBeCloseTo(marginLeft + graphWidth, 1);

				// Test middle (geometric mean)
				const middleFreq = Math.sqrt(100 * 10000); // 1000 Hz
				const xMiddle = wrapper.vm.frequencyToX(middleFreq, marginLeft, graphWidth);
				expect(xMiddle).toBeCloseTo(marginLeft + graphWidth / 2, 1);
			});

			it('should correctly transform impedance values with custom center and step', () => {
				wrapper.vm.scaleSettings.centerValue = 16;
				wrapper.vm.scaleSettings.stepSize = 1;

				const marginTop = 20;
				const graphHeight = 600;

				// Range is 1 * 10 = 10 Ω (11 to 21)
				const yMax = wrapper.vm.valueToY(21, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yCenter = wrapper.vm.valueToY(16, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);

				const yMin = wrapper.vm.valueToY(11, marginTop, graphHeight);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});

			it('should maintain transformation consistency with custom settings', () => {
				wrapper.vm.scaleSettings.minFreq = 50;
				wrapper.vm.scaleSettings.maxFreq = 15000;
				wrapper.vm.scaleSettings.centerValue = 12;
				wrapper.vm.scaleSettings.stepSize = 3;

				const marginLeft = 60;
				const graphWidth = 800;
				const marginTop = 20;
				const graphHeight = 600;

				// Test frequency round-trip
				const testFrequencies = [50, 100, 500, 1000, 5000, 10000, 15000];
				testFrequencies.forEach((freq) => {
					const x = wrapper.vm.frequencyToX(freq, marginLeft, graphWidth);
					const recoveredFreq = wrapper.vm.xToFrequency(x, marginLeft, graphWidth);
					expect(recoveredFreq).toBeCloseTo(freq, 1);
				});

				// Test impedance value round-trip
				// Range is 3 * 10 = 30 Ω (-3 to 27)
				const testValues = [-3, 0, 6, 12, 18, 24, 27];
				testValues.forEach((value) => {
					const y = wrapper.vm.valueToY(value, marginTop, graphHeight);
					const recoveredValue = wrapper.vm.yToValue(y, marginTop, graphHeight);
					expect(recoveredValue).toBeCloseTo(value, 1);
				});
			});

			it('should generate correct labels with custom frequency range', () => {
				wrapper.vm.scaleSettings.minFreq = 200;
				wrapper.vm.scaleSettings.maxFreq = 8000;

				const labels = wrapper.vm.generateFrequencyLabels();
				const frequencies = labels.map((l) => l.freq);

				// Should include decades within range
				expect(frequencies).toContain(1000);
				expect(frequencies).not.toContain(100);
				expect(frequencies).not.toContain(10000);
			});

			it('should generate correct labels with custom impedance settings', () => {
				wrapper.vm.scaleSettings.centerValue = 16;
				wrapper.vm.scaleSettings.stepSize = 4;

				const labels = wrapper.vm.generateValueLabels();
				const values = labels.map((l) => l.value);

				// Range is 40 Ω (-4 to 36)
				expect(values).toContain(-4);
				expect(values).toContain(16);
				expect(values).toContain(36);
				expect(values.every((v) => (v + 4) % 4 === 0)).toBe(true);
			});
		});

		describe('Edge Cases', () => {
			it('should handle very narrow frequency ranges', () => {
				wrapper.vm.scaleSettings.minFreq = 900;
				wrapper.vm.scaleSettings.maxFreq = 1100;

				const marginLeft = 60;
				const graphWidth = 800;

				const xMin = wrapper.vm.frequencyToX(900, marginLeft, graphWidth);
				const xMax = wrapper.vm.frequencyToX(1100, marginLeft, graphWidth);

				expect(xMin).toBeCloseTo(marginLeft, 1);
				expect(xMax).toBeCloseTo(marginLeft + graphWidth, 1);
			});

			it('should handle very wide frequency ranges', () => {
				wrapper.vm.scaleSettings.minFreq = 1;
				wrapper.vm.scaleSettings.maxFreq = 100000;

				const marginLeft = 60;
				const graphWidth = 800;

				const xMin = wrapper.vm.frequencyToX(1, marginLeft, graphWidth);
				const xMax = wrapper.vm.frequencyToX(100000, marginLeft, graphWidth);

				expect(xMin).toBeCloseTo(marginLeft, 1);
				expect(xMax).toBeCloseTo(marginLeft + graphWidth, 1);
			});

			it('should handle large step sizes', () => {
				wrapper.vm.scaleSettings.stepSize = 20;

				const marginTop = 20;
				const graphHeight = 600;

				// Range is 200 Ω (-92 to +108)
				const yMax = wrapper.vm.valueToY(108, marginTop, graphHeight);
				const yMin = wrapper.vm.valueToY(-92, marginTop, graphHeight);

				expect(yMax).toBeCloseTo(marginTop, 1);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});

			it('should handle small step sizes', () => {
				wrapper.vm.scaleSettings.stepSize = 1;

				const marginTop = 20;
				const graphHeight = 600;

				// Range is 10 Ω (3 to 13)
				const yMax = wrapper.vm.valueToY(13, marginTop, graphHeight);
				const yMin = wrapper.vm.valueToY(3, marginTop, graphHeight);

				expect(yMax).toBeCloseTo(marginTop, 1);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});
		});
	});
});
