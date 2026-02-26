import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import FrequencyResponseGraph from '@/renderer/components/FrequencyResponseGraph.vue';
import ImpedanceGraph from '@/renderer/components/ImpedanceGraph.vue';
import FrdParser from '@/io/FrdParser';
import ZmaParser from '@/io/ZmaParser';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock Electron APIs
const mockDialog = {
	showSaveDialog: jest.fn(),
};

const mockClipboard = {
	writeImage: jest.fn(),
};

const mockNativeImage = {
	createFromPath: jest.fn(),
};

global.window = {
	require: jest.fn((moduleName) => {
		if (moduleName === 'electron') {
			return {
				clipboard: mockClipboard,
				nativeImage: mockNativeImage,
			};
		}
		if (moduleName === 'electron.remote') {
			return {
				dialog: mockDialog,
			};
		}
		if (moduleName === '@/io/FrdParser') {
			return { default: FrdParser };
		}
		if (moduleName === '@/io/ZmaParser') {
			return { default: ZmaParser };
		}
		if (moduleName === 'fs') {
			return fs;
		}
		if (moduleName === 'path') {
			return path;
		}
		if (moduleName === 'os') {
			return os;
		}
		return {};
	}),
};

describe('Graph Export Functionality', () => {
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

		// Mock canvas toDataURL
		HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

		// Mock canvas toBlob
		HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
			const blob = new Blob(['fake image data'], { type: 'image/png' });
			callback(blob);
		});

		// Reset mocks
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
	});

	describe('FrequencyResponseGraph Export', () => {
		beforeEach(() => {
			store = createStore({
				modules: {
					simulation: {
						namespaced: true,
						state: {
							frequencyResponse: {
								frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
								spl: [80, 82, 85, 88, 86, 83, 80],
								phase: [-10, -15, -20, -25, -30, -35, -40],
							},
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

		describe('FRD File Export', () => {
			it('should export FRD file with system response data', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-export.frd');

				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				// Spy on FrdParser.export
				const exportSpy = jest.spyOn(FrdParser, 'export');

				await wrapper.vm.exportFRD();

				expect(mockDialog.showSaveDialog).toHaveBeenCalledWith({
					title: 'Export Frequency Response as FRD',
					defaultPath: 'frequency-response.frd',
					filters: [
						{ name: 'FRD Files', extensions: ['frd'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				expect(exportSpy).toHaveBeenCalledWith(
					[100, 200, 500, 1000, 2000, 5000, 10000],
					[80, 82, 85, 88, 86, 83, 80],
					[-10, -15, -20, -25, -30, -35, -40],
					testFilePath,
				);

				exportSpy.mockRestore();
			});

			it('should handle missing phase data by using zeros', async () => {
				// Update store to have no phase data
				store.state.simulation.frequencyResponse = {
					frequencies: [100, 200, 500],
					spl: [80, 82, 85],
				};
				await wrapper.vm.$nextTick();

				const testFilePath = path.join(os.tmpdir(), 'test-export.frd');
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const exportSpy = jest.spyOn(FrdParser, 'export');

				await wrapper.vm.exportFRD();

				expect(exportSpy).toHaveBeenCalledWith(
					[100, 200, 500],
					[80, 82, 85],
					[0, 0, 0],
					testFilePath,
				);

				exportSpy.mockRestore();
			});

			it('should not export when user cancels dialog', async () => {
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: undefined,
				});

				const exportSpy = jest.spyOn(FrdParser, 'export');

				await wrapper.vm.exportFRD();

				expect(exportSpy).not.toHaveBeenCalled();

				exportSpy.mockRestore();
			});

			it('should show alert when no frequency response data available', async () => {
				// Clear frequency response
				store.state.simulation.frequencyResponse = null;
				await wrapper.vm.$nextTick();

				const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

				await wrapper.vm.exportFRD();

				expect(alertSpy).toHaveBeenCalledWith('No frequency response data to export');
				expect(mockDialog.showSaveDialog).not.toHaveBeenCalled();

				alertSpy.mockRestore();
			});

			it('should handle export errors gracefully', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-export.frd');
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const exportSpy = jest.spyOn(FrdParser, 'export').mockImplementation(() => {
					throw new Error('Export failed');
				});

				const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

				await wrapper.vm.exportFRD();

				expect(alertSpy).toHaveBeenCalledWith('Error exporting FRD file: Export failed');

				alertSpy.mockRestore();
				exportSpy.mockRestore();
			});
		});

		describe('PNG Snapshot Export', () => {
			it('should export graph snapshot to PNG file', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-snapshot.png');

				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

				await wrapper.vm.exportSnapshotToFile();

				expect(mockDialog.showSaveDialog).toHaveBeenCalledWith({
					title: 'Save Graph Snapshot',
					defaultPath: 'frequency-response.png',
					filters: [
						{ name: 'PNG Images', extensions: ['png'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				expect(wrapper.vm.canvas.toDataURL).toHaveBeenCalledWith('image/png');
				expect(writeFileSpy).toHaveBeenCalled();

				writeFileSpy.mockRestore();
			});

			it('should not export when user cancels dialog', async () => {
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: undefined,
				});

				const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

				await wrapper.vm.exportSnapshotToFile();

				expect(writeFileSpy).not.toHaveBeenCalled();

				writeFileSpy.mockRestore();
			});

			it('should handle snapshot export errors gracefully', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-snapshot.png');
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
					throw new Error('Write failed');
				});

				const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

				await wrapper.vm.exportSnapshotToFile();

				expect(alertSpy).toHaveBeenCalledWith('Error saving graph snapshot: Write failed');

				alertSpy.mockRestore();
				writeFileSpy.mockRestore();
			});
		});

		describe('Clipboard Export', () => {
			it('should copy graph snapshot to clipboard', async () => {
				const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
				const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

				mockNativeImage.createFromPath.mockReturnValue({ fake: 'image' });

				await wrapper.vm.exportSnapshotToClipboard();

				// Wait for blob callback to execute
				await new Promise((resolve) => setTimeout(resolve, 100));

				expect(wrapper.vm.canvas.toBlob).toHaveBeenCalled();
				expect(mockNativeImage.createFromPath).toHaveBeenCalled();
				expect(mockClipboard.writeImage).toHaveBeenCalled();

				writeFileSpy.mockRestore();
				unlinkSpy.mockRestore();
			});

			it('should clean up temporary file after clipboard copy', async () => {
				const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
				const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

				mockNativeImage.createFromPath.mockReturnValue({ fake: 'image' });

				await wrapper.vm.exportSnapshotToClipboard();

				// Wait for blob callback to execute
				await new Promise((resolve) => setTimeout(resolve, 100));

				expect(unlinkSpy).toHaveBeenCalled();

				writeFileSpy.mockRestore();
				unlinkSpy.mockRestore();
			});
		});

		describe('File Menu', () => {
			it('should toggle file menu visibility', async () => {
				expect(wrapper.vm.fileMenuVisible).toBe(false);

				wrapper.vm.toggleFileMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.fileMenuVisible).toBe(true);

				wrapper.vm.toggleFileMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.fileMenuVisible).toBe(false);
			});

			it('should close file menu', async () => {
				wrapper.vm.fileMenuVisible = true;
				await wrapper.vm.$nextTick();

				wrapper.vm.closeFileMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.fileMenuVisible).toBe(false);
			});

			it('should close file menu after export', async () => {
				wrapper.vm.fileMenuVisible = true;

				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: undefined, // User cancels
				});

				await wrapper.vm.exportFRD();

				expect(wrapper.vm.fileMenuVisible).toBe(false);
			});
		});
	});

	describe('ImpedanceGraph Export', () => {
		beforeEach(() => {
			store = createStore({
				modules: {
					simulation: {
						namespaced: true,
						state: {
							impedanceResponse: {
								frequencies: [100, 200, 500, 1000, 2000, 5000, 10000],
								impedances: [8.2, 8.5, 9.1, 10.5, 12.3, 11.8, 10.2],
								phases: [-5, -8, -12, -15, -18, -20, -22],
							},
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

		describe('ZMA File Export', () => {
			it('should export ZMA file with impedance data', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-export.zma');

				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const exportSpy = jest.spyOn(ZmaParser, 'export');

				await wrapper.vm.exportZMA();

				expect(mockDialog.showSaveDialog).toHaveBeenCalledWith({
					title: 'Export Impedance as ZMA',
					defaultPath: 'impedance.zma',
					filters: [
						{ name: 'ZMA Files', extensions: ['zma'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				expect(exportSpy).toHaveBeenCalledWith(
					[100, 200, 500, 1000, 2000, 5000, 10000],
					[8.2, 8.5, 9.1, 10.5, 12.3, 11.8, 10.2],
					[-5, -8, -12, -15, -18, -20, -22],
					testFilePath,
				);

				exportSpy.mockRestore();
			});

			it('should not export when user cancels dialog', async () => {
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: undefined,
				});

				const exportSpy = jest.spyOn(ZmaParser, 'export');

				await wrapper.vm.exportZMA();

				expect(exportSpy).not.toHaveBeenCalled();

				exportSpy.mockRestore();
			});

			it('should show alert when no impedance data available', async () => {
				store.state.simulation.impedanceResponse = null;
				await wrapper.vm.$nextTick();

				const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

				await wrapper.vm.exportZMA();

				expect(alertSpy).toHaveBeenCalledWith('No impedance data to export');
				expect(mockDialog.showSaveDialog).not.toHaveBeenCalled();

				alertSpy.mockRestore();
			});

			it('should handle export errors gracefully', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-export.zma');
				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const exportSpy = jest.spyOn(ZmaParser, 'export').mockImplementation(() => {
					throw new Error('Export failed');
				});

				const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

				await wrapper.vm.exportZMA();

				expect(alertSpy).toHaveBeenCalledWith('Error exporting ZMA file: Export failed');

				alertSpy.mockRestore();
				exportSpy.mockRestore();
			});
		});

		describe('PNG Snapshot Export', () => {
			it('should export impedance graph snapshot to PNG file', async () => {
				const testFilePath = path.join(os.tmpdir(), 'test-impedance-snapshot.png');

				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: testFilePath,
				});

				const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

				await wrapper.vm.exportSnapshotToFile();

				expect(mockDialog.showSaveDialog).toHaveBeenCalledWith({
					title: 'Save Graph Snapshot',
					defaultPath: 'impedance-graph.png',
					filters: [
						{ name: 'PNG Images', extensions: ['png'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				expect(wrapper.vm.canvas.toDataURL).toHaveBeenCalledWith('image/png');
				expect(writeFileSpy).toHaveBeenCalled();

				writeFileSpy.mockRestore();
			});
		});

		describe('File Menu', () => {
			it('should toggle file menu visibility', async () => {
				expect(wrapper.vm.fileMenuVisible).toBe(false);

				wrapper.vm.toggleFileMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.fileMenuVisible).toBe(true);

				wrapper.vm.toggleFileMenu();
				await wrapper.vm.$nextTick();

				expect(wrapper.vm.fileMenuVisible).toBe(false);
			});

			it('should close file menu after export', async () => {
				wrapper.vm.fileMenuVisible = true;

				mockDialog.showSaveDialog.mockResolvedValue({
					filePath: undefined, // User cancels
				});

				await wrapper.vm.exportZMA();

				expect(wrapper.vm.fileMenuVisible).toBe(false);
			});
		});
	});
});
