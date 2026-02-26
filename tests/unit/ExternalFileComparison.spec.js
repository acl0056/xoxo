import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import FrequencyResponseGraph from '@/renderer/components/FrequencyResponseGraph.vue';
import ImpedanceGraph from '@/renderer/components/ImpedanceGraph.vue';

// Mock Electron modules
const mockDialog = {
	showOpenDialog: jest.fn(),
};

const mockFrdParser = {
	parse: jest.fn(),
};

const mockZmaParser = {
	parse: jest.fn(),
};

const mockPath = {
	basename: jest.fn((filePath, extension) => {
		const fileName = filePath.split('/').pop();
		if (extension) {
			return fileName.replace(extension, '');
		}
		return fileName;
	}),
};

// Mock window.require before tests run
beforeAll(() => {
	global.window.require = jest.fn((moduleName) => {
		if (moduleName === 'electron') {
			return {
				remote: {
					dialog: mockDialog,
				},
			};
		}
		if (moduleName === '@/io/FrdParser') {
			return { default: mockFrdParser };
		}
		if (moduleName === '@/io/ZmaParser') {
			return { default: mockZmaParser };
		}
		if (moduleName === 'path') {
			return mockPath;
		}
		return {};
	});
});

describe('External File Comparison', () => {
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

		// Reset mocks
		mockDialog.showOpenDialog.mockReset();
		mockFrdParser.parse.mockReset();
		mockZmaParser.parse.mockReset();
		mockPath.basename.mockClear();
	});

	describe('FrequencyResponseGraph - External FRD Files', () => {
		let wrapper;
		let store;

		beforeEach(() => {
			store = createStore({
				modules: {
					simulation: {
						namespaced: true,
						state: {
							frequencyResponse: null,
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

		it('should have Get File button in Curves menu', async () => {
			wrapper.vm.curvesMenuVisible = true;
			await wrapper.vm.$nextTick();

			const buttons = wrapper.findAll('button');
			const getFileButton = buttons.find((b) => b.text().includes('Get File'));

			expect(getFileButton).toBeTruthy();
		});

		it('should load external FRD file when user selects a file', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				magnitudes: [85, 87, 90, 92, 90, 87, 85],
				phases: [-10, -5, 0, 5, 10, 5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external-measurement.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(mockDialog.showOpenDialog).toHaveBeenCalledWith({
				title: 'Load External FRD File',
				filters: [
					{ name: 'FRD Files', extensions: ['frd'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['openFile'],
			});

			expect(mockFrdParser.parse).toHaveBeenCalledWith('/path/to/external-measurement.frd');
			expect(wrapper.vm.externalCurves.length).toBe(1);
			expect(wrapper.vm.externalCurves[0].frequencies).toEqual(mockFrdData.frequencies);
			expect(wrapper.vm.externalCurves[0].magnitudes).toEqual(mockFrdData.magnitudes);
		});

		it('should not load file when user cancels dialog', async () => {
			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: [],
			});

			await wrapper.vm.loadExternalFile();

			expect(mockFrdParser.parse).not.toHaveBeenCalled();
			expect(wrapper.vm.externalCurves.length).toBe(0);
		});

		it('should generate unique ID for each external curve', async () => {
			const mockFrdData1 = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			const mockFrdData2 = {
				frequencies: [100, 200, 500],
				magnitudes: [80, 82, 85],
				phases: [-15, -10, -5],
			};

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file1.frd'],
			});
			mockFrdParser.parse.mockReturnValueOnce(mockFrdData1);

			await wrapper.vm.loadExternalFile();

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file2.frd'],
			});
			mockFrdParser.parse.mockReturnValueOnce(mockFrdData2);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves.length).toBe(2);
			expect(wrapper.vm.externalCurves[0].id).not.toBe(wrapper.vm.externalCurves[1].id);
		});

		it('should use filename as curve label', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/tweeter-measurement.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].label).toBe('tweeter-measurement');
		});

		it('should assign color to external curve', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].color).toBeTruthy();
			expect(wrapper.vm.externalCurves[0].color).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('should set external curve as visible by default', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].visible).toBe(true);
		});

		it('should set smoothing to none by default for external curves', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].smoothing).toBe('none');
		});

		it('should store original magnitudes for smoothing', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].originalMagnitudes).toEqual(mockFrdData.magnitudes);
			expect(wrapper.vm.externalCurves[0].originalMagnitudes).not.toBe(mockFrdData.magnitudes);
		});

		it('should remove external curve when remove button is clicked', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves.length).toBe(1);

			const curveId = wrapper.vm.externalCurves[0].id;
			wrapper.vm.removeExternalCurve(curveId);

			expect(wrapper.vm.externalCurves.length).toBe(0);
		});

		it('should render external curves on graph', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500, 1000],
				magnitudes: [85, 87, 90, 92],
				phases: [-10, -5, 0, 5],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			const drawCurvesSpy = jest.spyOn(wrapper.vm, 'drawCurves');

			wrapper.vm.renderGraph();

			expect(drawCurvesSpy).toHaveBeenCalledWith(
				wrapper.vm.externalCurves,
				expect.any(Object),
				expect.any(Number),
				expect.any(Number),
				false,
			);

			drawCurvesSpy.mockRestore();
		});

		it('should allow toggling external curve visibility', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].visible).toBe(true);

			wrapper.vm.externalCurves[0].visible = false;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.externalCurves[0].visible).toBe(false);
		});

		it('should allow changing external curve color', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			const originalColor = wrapper.vm.externalCurves[0].color;
			wrapper.vm.externalCurves[0].color = '#ff0000';
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.externalCurves[0].color).toBe('#ff0000');
			expect(wrapper.vm.externalCurves[0].color).not.toBe(originalColor);
		});

		it('should apply smoothing to external curves', async () => {
			const mockFrdData = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				magnitudes: [85, 87, 90, 92, 90, 87, 85],
				phases: [-10, -5, 0, 5, 10, 5, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.frd'],
			});

			mockFrdParser.parse.mockReturnValue(mockFrdData);

			await wrapper.vm.loadExternalFile();

			const curve = wrapper.vm.externalCurves[0];

			// Verify smoothing can be changed
			expect(curve.smoothing).toBe('none');
			curve.smoothing = '1/3';
			expect(curve.smoothing).toBe('1/3');

			// applySmoothingToCurve should be callable without errors
			expect(() => wrapper.vm.applySmoothingToCurve(curve)).not.toThrow();
		});

		it('should handle file loading errors gracefully', async () => {
			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/invalid.frd'],
			});

			mockFrdParser.parse.mockImplementation(() => {
				throw new Error('Invalid FRD file format');
			});

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
			const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

			await wrapper.vm.loadExternalFile();

			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error loading FRD file'));
			expect(wrapper.vm.externalCurves.length).toBe(0);

			consoleErrorSpy.mockRestore();
			alertSpy.mockRestore();
		});

		it('should support loading multiple external files simultaneously', async () => {
			const mockFrdData1 = {
				frequencies: [100, 200, 500],
				magnitudes: [85, 87, 90],
				phases: [-10, -5, 0],
			};

			const mockFrdData2 = {
				frequencies: [100, 200, 500],
				magnitudes: [80, 82, 85],
				phases: [-15, -10, -5],
			};

			const mockFrdData3 = {
				frequencies: [100, 200, 500],
				magnitudes: [90, 92, 95],
				phases: [-5, 0, 5],
			};

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file1.frd'],
			});
			mockFrdParser.parse.mockReturnValueOnce(mockFrdData1);
			await wrapper.vm.loadExternalFile();

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file2.frd'],
			});
			mockFrdParser.parse.mockReturnValueOnce(mockFrdData2);
			await wrapper.vm.loadExternalFile();

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file3.frd'],
			});
			mockFrdParser.parse.mockReturnValueOnce(mockFrdData3);
			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves.length).toBe(3);
		});
	});

	describe('ImpedanceGraph - External ZMA Files', () => {
		let wrapper;
		let store;

		beforeEach(() => {
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

		it('should have Get File button in Curves menu', async () => {
			wrapper.vm.curvesMenuVisible = true;
			await wrapper.vm.$nextTick();

			const buttons = wrapper.findAll('button');
			const getFileButton = buttons.find((b) => b.text().includes('Get File'));

			expect(getFileButton).toBeTruthy();
		});

		it('should load external ZMA file when user selects a file', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				impedances: [8.0, 8.2, 8.5, 9.0, 8.8, 8.3, 8.0],
				phases: [-5, -3, 0, 5, 3, -2, -5],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external-impedance.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(mockDialog.showOpenDialog).toHaveBeenCalledWith({
				title: 'Load External ZMA File',
				filters: [
					{ name: 'ZMA Files', extensions: ['zma'] },
					{ name: 'All Files', extensions: ['*'] },
				],
				properties: ['openFile'],
			});

			expect(mockZmaParser.parse).toHaveBeenCalledWith('/path/to/external-impedance.zma');
			expect(wrapper.vm.externalCurves.length).toBe(1);
			expect(wrapper.vm.externalCurves[0].frequencies).toEqual(mockZmaData.frequencies);
			expect(wrapper.vm.externalCurves[0].values).toEqual(mockZmaData.impedances);
		});

		it('should not load file when user cancels dialog', async () => {
			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: [],
			});

			await wrapper.vm.loadExternalFile();

			expect(mockZmaParser.parse).not.toHaveBeenCalled();
			expect(wrapper.vm.externalCurves.length).toBe(0);
		});

		it('should generate unique ID for each external curve', async () => {
			const mockZmaData1 = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			const mockZmaData2 = {
				frequencies: [100, 200, 500],
				impedances: [7.5, 7.8, 8.0],
				phases: [-10, -8, -5],
			};

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file1.zma'],
			});
			mockZmaParser.parse.mockReturnValueOnce(mockZmaData1);

			await wrapper.vm.loadExternalFile();

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file2.zma'],
			});
			mockZmaParser.parse.mockReturnValueOnce(mockZmaData2);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves.length).toBe(2);
			expect(wrapper.vm.externalCurves[0].id).not.toBe(wrapper.vm.externalCurves[1].id);
		});

		it('should use filename as curve label', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/woofer-impedance.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].label).toBe('woofer-impedance');
		});

		it('should assign color to external curve', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].color).toBeTruthy();
			expect(wrapper.vm.externalCurves[0].color).toMatch(/^#[0-9a-f]{6}$/i);
		});

		it('should set external curve as visible by default', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].visible).toBe(true);
		});

		it('should set smoothing to none by default for external curves', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].smoothing).toBe('none');
		});

		it('should store original impedance values for smoothing', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].originalValues).toEqual(mockZmaData.impedances);
			expect(wrapper.vm.externalCurves[0].originalValues).not.toBe(mockZmaData.impedances);
		});

		it('should remove external curve when remove button is clicked', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves.length).toBe(1);

			const curveId = wrapper.vm.externalCurves[0].id;
			wrapper.vm.removeExternalCurve(curveId);

			expect(wrapper.vm.externalCurves.length).toBe(0);
		});

		it('should render external curves on graph', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500, 1000],
				impedances: [8.0, 8.2, 8.5, 9.0],
				phases: [-5, -3, 0, 5],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			const drawCurvesSpy = jest.spyOn(wrapper.vm, 'drawCurves');

			wrapper.vm.renderGraph();

			expect(drawCurvesSpy).toHaveBeenCalledWith(
				wrapper.vm.externalCurves,
				expect.any(Object),
				expect.any(Number),
				expect.any(Number),
				false,
			);

			drawCurvesSpy.mockRestore();
		});

		it('should allow toggling external curve visibility', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].visible).toBe(true);

			wrapper.vm.externalCurves[0].visible = false;
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.externalCurves[0].visible).toBe(false);
		});

		it('should allow changing external curve color', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			const originalColor = wrapper.vm.externalCurves[0].color;
			wrapper.vm.externalCurves[0].color = '#00ff00';
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.externalCurves[0].color).toBe('#00ff00');
			expect(wrapper.vm.externalCurves[0].color).not.toBe(originalColor);
		});

		it('should apply smoothing to external curves', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
				impedances: [8.0, 8.2, 8.5, 9.0, 8.8, 8.3, 8.0],
				phases: [-5, -3, 0, 5, 3, -2, -5],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			const curve = wrapper.vm.externalCurves[0];

			// Verify smoothing can be changed
			expect(curve.smoothing).toBe('none');
			curve.smoothing = '1/3';
			expect(curve.smoothing).toBe('1/3');

			// applySmoothingToCurve should be callable without errors
			expect(() => wrapper.vm.applySmoothingToCurve(curve)).not.toThrow();
		});

		it('should handle file loading errors gracefully', async () => {
			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/invalid.zma'],
			});

			mockZmaParser.parse.mockImplementation(() => {
				throw new Error('Invalid ZMA file format');
			});

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
			const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

			await wrapper.vm.loadExternalFile();

			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error loading ZMA file'));
			expect(wrapper.vm.externalCurves.length).toBe(0);

			consoleErrorSpy.mockRestore();
			alertSpy.mockRestore();
		});

		it('should support loading multiple external files simultaneously', async () => {
			const mockZmaData1 = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			const mockZmaData2 = {
				frequencies: [100, 200, 500],
				impedances: [7.5, 7.8, 8.0],
				phases: [-10, -8, -5],
			};

			const mockZmaData3 = {
				frequencies: [100, 200, 500],
				impedances: [9.0, 9.2, 9.5],
				phases: [0, 2, 5],
			};

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file1.zma'],
			});
			mockZmaParser.parse.mockReturnValueOnce(mockZmaData1);
			await wrapper.vm.loadExternalFile();

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file2.zma'],
			});
			mockZmaParser.parse.mockReturnValueOnce(mockZmaData2);
			await wrapper.vm.loadExternalFile();

			mockDialog.showOpenDialog.mockResolvedValueOnce({
				filePaths: ['/path/to/file3.zma'],
			});
			mockZmaParser.parse.mockReturnValueOnce(mockZmaData3);
			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves.length).toBe(3);
		});

		it('should set isPhase to false for impedance external curves', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].isPhase).toBe(false);
		});

		it('should store phase data from ZMA file', async () => {
			const mockZmaData = {
				frequencies: [100, 200, 500],
				impedances: [8.0, 8.2, 8.5],
				phases: [-5, -3, 0],
			};

			mockDialog.showOpenDialog.mockResolvedValue({
				filePaths: ['/path/to/external.zma'],
			});

			mockZmaParser.parse.mockReturnValue(mockZmaData);

			await wrapper.vm.loadExternalFile();

			expect(wrapper.vm.externalCurves[0].phases).toEqual(mockZmaData.phases);
		});
	});
});
