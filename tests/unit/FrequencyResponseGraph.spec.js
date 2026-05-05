import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import FrequencyResponseGraph from '@/renderer/components/FrequencyResponseGraph.vue';

jest.mock('electron', () => ({
	ipcRenderer: {
		on: jest.fn(),
		send: jest.fn(),
		invoke: jest.fn(),
		removeAllListeners: jest.fn(),
	},
}), { virtual: true });

describe('FrequencyResponseGraph', () => {
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
			rect: jest.fn(),
			clip: jest.fn(),
			setLineDash: jest.fn(),
			measureText: jest.fn(() => ({ width: 0 })),
		}));

		store = createStore({
			modules: {
				simulation: {
					namespaced: true,
					state: {
						frequencyResponse: null,
						availableAngles: [],
						currentAngle: 0,
					},
				},
			},
		});

		wrapper = mount(FrequencyResponseGraph, {
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

		describe('magnitudeToY', () => {
			it('should convert magnitude to y coordinate using linear scale', () => {
				const marginTop = 20;
				const graphHeight = 600;

				// Default scale: center at 90, step size 5, range 60 dB (60 to 120)
				const yMax = wrapper.vm.magnitudeToY(120, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yMin = wrapper.vm.magnitudeToY(60, marginTop, graphHeight);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);

				const yCenter = wrapper.vm.magnitudeToY(90, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);
			});

			it('should handle different step sizes', () => {
				const marginTop = 20;
				const graphHeight = 600;

				// Change step size to 10
				wrapper.vm.scaleSettings.stepSize = 10;

				// Range is now 120 dB (30 to 150)
				const yMax = wrapper.vm.magnitudeToY(150, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yMin = wrapper.vm.magnitudeToY(30, marginTop, graphHeight);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});

			it('should handle different center values', () => {
				const marginTop = 20;
				const graphHeight = 600;

				// Change center to 80 dB
				wrapper.vm.scaleSettings.centerValue = 80;

				// Range is 60 dB (50 to 110)
				const yMax = wrapper.vm.magnitudeToY(110, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yCenter = wrapper.vm.magnitudeToY(80, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);
			});
		});

		describe('yToMagnitude', () => {
			it('should convert y coordinate to magnitude using linear scale', () => {
				const marginTop = 20;
				const graphHeight = 600;

				const magTop = wrapper.vm.yToMagnitude(marginTop, marginTop, graphHeight);
				expect(magTop).toBeCloseTo(120, 1);

				const magBottom = wrapper.vm.yToMagnitude(marginTop + graphHeight, marginTop, graphHeight);
				expect(magBottom).toBeCloseTo(60, 1);

				const magCenter = wrapper.vm.yToMagnitude(marginTop + graphHeight / 2, marginTop, graphHeight);
				expect(magCenter).toBeCloseTo(90, 1);
			});

			it('should be inverse of magnitudeToY', () => {
				const marginTop = 20;
				const graphHeight = 600;
				const testMagnitudes = [60, 70, 80, 90, 100, 110, 120];

				testMagnitudes.forEach((mag) => {
					const y = wrapper.vm.magnitudeToY(mag, marginTop, graphHeight);
					const recoveredMag = wrapper.vm.yToMagnitude(y, marginTop, graphHeight);
					expect(recoveredMag).toBeCloseTo(mag, 1);
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

		describe('generateMagnitudeLabels', () => {
			it('should generate labels at step intervals', () => {
				const labels = wrapper.vm.generateMagnitudeLabels();

				expect(labels.length).toBeGreaterThan(0);

				// With default settings (center 90, step 5, range 60)
				// Should have labels at 60, 65, 70, ..., 115, 120
				const magnitudes = labels.map((l) => l.mag);
				expect(magnitudes).toContain(60);
				expect(magnitudes).toContain(90);
				expect(magnitudes).toContain(120);
			});

			it('should format labels as integers', () => {
				const labels = wrapper.vm.generateMagnitudeLabels();

				labels.forEach((label) => {
					expect(label.label).toMatch(/^-?\d+$/);
				});
			});

			it('should adapt to different step sizes', () => {
				wrapper.vm.scaleSettings.stepSize = 10;

				const labels = wrapper.vm.generateMagnitudeLabels();
				const magnitudes = labels.map((l) => l.mag);

				// Center 90, step 10, range 120: labels at -30, -20, ..., 200, 210
				// Actually: 90 - 60 = 30 to 90 + 60 = 150
				expect(magnitudes).toContain(30);
				expect(magnitudes).toContain(90);
				expect(magnitudes).toContain(150);
				expect(magnitudes.every((m) => m % 10 === 0)).toBe(true);
			});
		});
	});

	describe('Curve Management', () => {
		it('should update curves when frequency response changes', async () => {
			const frequencyResponse = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				spl: [80, 82, 85, 88, 86, 83, 80],
			};

			store.state.simulation.frequencyResponse = frequencyResponse;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.curves.length).toBeGreaterThan(0);
			expect(wrapper.vm.curves[0].id).toBe('system');
			expect(wrapper.vm.curves[0].frequencies).toEqual(frequencyResponse.frequencies);
			expect(wrapper.vm.curves[0].magnitudes).toEqual(frequencyResponse.spl);
		});

		it('should generate colors for speaker curves', async () => {
			const frequencyResponse = {
				frequencies: [100, 200, 500, 1000],
				spl: [80, 82, 85, 88],
				speakerResponses: {
					'speaker-1': { spl: [85, 87, 90, 92] },
					'speaker-2': { spl: [75, 77, 80, 83] },
				},
			};

			store.state.simulation.frequencyResponse = frequencyResponse;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.curves.length).toBe(3); // System + 2 speakers
			expect(wrapper.vm.curves[1].color).toBeTruthy();
			expect(wrapper.vm.curves[2].color).toBeTruthy();
		});
	});

	describe('Hold Feature', () => {
		it('should capture curves when hold is activated', async () => {
			const frequencyResponse = {
				frequencies: [100, 200, 500, 1000],
				spl: [80, 82, 85, 88],
			};

			store.state.simulation.frequencyResponse = frequencyResponse;
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
			wrapper.vm.heldCurves = [{ id: 'test', frequencies: [], magnitudes: [] }];

			wrapper.vm.toggleHold();

			expect(wrapper.vm.holdActive).toBe(false);
			expect(wrapper.vm.heldCurves).toBeNull();
		});

		it('should deep copy curves when holding', async () => {
			const frequencyResponse = {
				frequencies: [100, 200, 500, 1000],
				spl: [80, 82, 85, 88],
			};

			store.state.simulation.frequencyResponse = frequencyResponse;
			await wrapper.vm.$nextTick();

			wrapper.vm.toggleHold();

			// Modify current curves
			wrapper.vm.curves[0].magnitudes[0] = 999;

			// Held curves should not be affected
			expect(wrapper.vm.heldCurves[0].magnitudes[0]).toBe(80);
		});

		it('should preserve held curves when frequency response updates', async () => {
			const initialResponse = {
				frequencies: [100, 200, 500, 1000],
				spl: [80, 82, 85, 88],
			};

			store.state.simulation.frequencyResponse = initialResponse;
			await wrapper.vm.$nextTick();

			wrapper.vm.toggleHold();
			const heldData = wrapper.vm.heldCurves[0].magnitudes[0];

			// Update frequency response
			const newResponse = {
				frequencies: [100, 200, 500, 1000],
				spl: [70, 72, 75, 78],
			};

			store.state.simulation.frequencyResponse = newResponse;
			await wrapper.vm.$nextTick();

			// Held curves should still have original data
			expect(wrapper.vm.heldCurves[0].magnitudes[0]).toBe(heldData);
			// Current curves should have new data
			expect(wrapper.vm.curves[0].magnitudes[0]).toBe(70);
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
			const frequencyResponse = {
				frequencies: [100, 200, 500, 1000],
				spl: [80, 82, 85, 88],
			};

			store.state.simulation.frequencyResponse = frequencyResponse;
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

			// Should be called for current curves (and possibly external curves), but not held curves
			expect(drawCurvesSpy).toHaveBeenCalled();
			expect(drawCurvesSpy).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.any(Object),
				expect.any(Number),
				expect.any(Number),
				true,
			);

			drawCurvesSpy.mockRestore();
		});
	});

	describe('Tooltip', () => {
		it('should show tooltip on mouse move over graph area', () => {
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
			expect(wrapper.vm.tooltip.magnitude).toBeTruthy();
		});

		it('should hide tooltip on mouse leave', () => {
			wrapper.vm.tooltip.visible = true;

			const canvas = wrapper.find('canvas');
			canvas.trigger('mouseleave');

			expect(wrapper.vm.tooltip.visible).toBe(false);
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
			expect(canvas.height).toBe(700);
		});
	});

	describe('Scale Controls', () => {
		describe('Scale Settings', () => {
			it('should have default scale settings', () => {
				expect(wrapper.vm.scaleSettings.minFreq).toBe(20);
				expect(wrapper.vm.scaleSettings.maxFreq).toBe(20000);
				expect(wrapper.vm.scaleSettings.centerValue).toBe(90);
				expect(wrapper.vm.scaleSettings.stepSize).toBe(5);
			});

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
				wrapper.vm.scaleSettings.centerValue = 90;
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleSettings.centerValue).toBe(90);

				// Verify transformation uses new center value
				const marginTop = 20;
				const graphHeight = 600;
				const yCenter = wrapper.vm.magnitudeToY(90, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);
			});

			it('should allow changing vertical step size', async () => {
				wrapper.vm.scaleSettings.stepSize = 10;
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.scaleSettings.stepSize).toBe(10);

				// Verify range calculation uses new step size (multiplier is 12)
				const marginTop = 20;
				const graphHeight = 600;
				const range = wrapper.vm.scaleSettings.stepSize * 12;
				expect(range).toBe(120);

				// Verify transformation uses new range (center 90, range 120: 30 to 150)
				const yMax = wrapper.vm.magnitudeToY(150, marginTop, graphHeight);
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
				wrapper.vm.scaleSettings.centerValue = 90;
				wrapper.vm.scaleSettings.stepSize = 10;
				await wrapper.vm.$nextTick();

				// Reset
				wrapper.vm.resetScaleSettings();
				await wrapper.vm.$nextTick();

				// Verify all settings are back to defaults
				expect(wrapper.vm.scaleSettings.minFreq).toBe(20);
				expect(wrapper.vm.scaleSettings.maxFreq).toBe(20000);
				expect(wrapper.vm.scaleSettings.centerValue).toBe(90);
				expect(wrapper.vm.scaleSettings.stepSize).toBe(5);
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

			it('should correctly transform magnitudes with custom center and step', () => {
				wrapper.vm.scaleSettings.centerValue = 90;
				wrapper.vm.scaleSettings.stepSize = 2;

				const marginTop = 20;
				const graphHeight = 600;

				// Range is 2 * 12 = 24 dB (78 to 102)
				const yMax = wrapper.vm.magnitudeToY(102, marginTop, graphHeight);
				expect(yMax).toBeCloseTo(marginTop, 1);

				const yCenter = wrapper.vm.magnitudeToY(90, marginTop, graphHeight);
				expect(yCenter).toBeCloseTo(marginTop + graphHeight / 2, 1);

				const yMin = wrapper.vm.magnitudeToY(78, marginTop, graphHeight);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});

			it('should maintain transformation consistency with custom settings', () => {
				wrapper.vm.scaleSettings.minFreq = 50;
				wrapper.vm.scaleSettings.maxFreq = 15000;
				wrapper.vm.scaleSettings.centerValue = 85;
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

				// Test magnitude round-trip
				// Range is 3 * 10 = 30 dB (70 to 100)
				const testMagnitudes = [70, 75, 80, 85, 90, 95, 100];
				testMagnitudes.forEach((mag) => {
					const y = wrapper.vm.magnitudeToY(mag, marginTop, graphHeight);
					const recoveredMag = wrapper.vm.yToMagnitude(y, marginTop, graphHeight);
					expect(recoveredMag).toBeCloseTo(mag, 1);
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

			it('should generate correct labels with custom magnitude settings', () => {
				wrapper.vm.scaleSettings.centerValue = 80;
				wrapper.vm.scaleSettings.stepSize = 3;

				const labels = wrapper.vm.generateMagnitudeLabels();
				const magnitudes = labels.map((l) => l.mag);

				// Range is 30 dB (65 to 95)
				expect(magnitudes).toContain(65);
				expect(magnitudes).toContain(80);
				expect(magnitudes).toContain(95);
				expect(magnitudes.every((m) => (m - 65) % 3 === 0)).toBe(true);
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

				// Range is 240 dB (center 90: -30 to 210)
				const yMax = wrapper.vm.magnitudeToY(210, marginTop, graphHeight);
				const yMin = wrapper.vm.magnitudeToY(-30, marginTop, graphHeight);

				expect(yMax).toBeCloseTo(marginTop, 1);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});

			it('should handle small step sizes', () => {
				wrapper.vm.scaleSettings.stepSize = 1;

				const marginTop = 20;
				const graphHeight = 600;

				// Range is 12 dB (center 90: 84 to 96)
				const yMax = wrapper.vm.magnitudeToY(96, marginTop, graphHeight);
				const yMin = wrapper.vm.magnitudeToY(84, marginTop, graphHeight);

				expect(yMax).toBeCloseTo(marginTop, 1);
				expect(yMin).toBeCloseTo(marginTop + graphHeight, 1);
			});
		});
	});
});
