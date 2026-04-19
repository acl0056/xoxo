<template>
	<div class="app-container">
		<ComponentPalette />
		<CircuitEditor />
		<AboutDialog
			:visible="showAboutDialog"
			@close="showAboutDialog = false"
		/>
	</div>
</template>

<script>
import ComponentPalette from './components/ComponentPalette.vue';
import CircuitEditor from './components/CircuitEditor.vue';
import AboutDialog from './components/AboutDialog.vue';

export default {
	name: 'App',
	components: {
		ComponentPalette,
		CircuitEditor,
		AboutDialog,
	},
	data() {
		return {
			showAboutDialog: false,
		};
	},
	mounted() {
		console.log('Crossover Network Simulator initialized');

		// Listen for window closing event from main process
		const { ipcRenderer } = require('electron');

		// Restore last opened file if available
		this.restoreLastOpenedFile();

		ipcRenderer.on('window-closing', async () => {
			await this.handleWindowClosing();
		});

		// Listen for menu events
		ipcRenderer.on('menu-new', async () => {
			await this.handleNewFile();
		});

		ipcRenderer.on('menu-open', async () => {
			await this.handleOpenFile();
		});

		ipcRenderer.on('menu-save', async () => {
			await this.handleSaveFile();
		});

		ipcRenderer.on('menu-save-as', async () => {
			await this.handleSaveFileAs();
		});

		ipcRenderer.on('menu-import-dxo', async () => {
			await this.handleImportDxo();
		});

		ipcRenderer.on('menu-undo', () => {
			this.$store.dispatch('circuit/undo');
		});

		ipcRenderer.on('menu-redo', () => {
			this.$store.dispatch('circuit/redo');
		});

		// Update menu undo/redo enabled state when stacks change
		this.$store.subscribe((mutation) => {
			const undoMutations = ['circuit/PUSH_UNDO', 'circuit/POP_UNDO', 'circuit/CLEAR_UNDO',
				'circuit/PUSH_REDO', 'circuit/POP_REDO', 'circuit/CLEAR_REDO'];
			if (undoMutations.includes(mutation.type)) {
				ipcRenderer.send('update-undo-state', {
					canUndo: this.$store.state.circuit.undoStack.length > 0,
					canRedo: this.$store.state.circuit.redoStack.length > 0,
				});
			}
		});

		// Listen for auto-save for crash recovery
		ipcRenderer.on('auto-save-for-crash-recovery', async () => {
			await this.saveCrashRecoveryData();
		});

		// Listen for show about dialog
		ipcRenderer.on('menu-show-about', () => {
			this.showAboutDialog = true;
		});

		// Send current simulation results when a graph window requests them
		ipcRenderer.on('send-simulation-results', () => {
			const frequencyResponse = this.$store.getters['simulation/getFrequencyResponse'];
			const impedanceResponse = this.$store.getters['simulation/getImpedanceResponse'];
			if (frequencyResponse || impedanceResponse) {
				// Deep clone via JSON to ensure all data is serializable for IPC
				const payload = JSON.parse(JSON.stringify({
					frequencyResponse,
					impedanceResponse,
					timestamp: new Date().toISOString(),
				}));
				ipcRenderer.send('simulation-results', payload);
			}
		});
	},
	methods: {
		/**
		 * Restore last opened file on startup
		 */
		async restoreLastOpenedFile() {
			const { ipcRenderer } = require('electron');
			const lastOpenedFile = await ipcRenderer.invoke('get-last-opened-file');

			if (lastOpenedFile) {
				// Try to load the last opened file
				const result = await ipcRenderer.invoke('read-file', lastOpenedFile);
				if (result.success) {
					try {
						const circuitData = JSON.parse(result.data);

						// Restore window layout if present
						if (circuitData.windowLayout) {
							ipcRenderer.send('restore-window-layout', circuitData.windowLayout);
						}

						const loadResult = await this.$store.dispatch('circuit/loadFile', {
							filePath: lastOpenedFile,
							circuitData,
						});

						if (!loadResult.success) {
							console.error('Failed to restore last opened file:', loadResult.error);
							// Fall back to new file
							this.$store.dispatch('circuit/newFile');
						}
					} catch (error) {
						console.error('Error parsing last opened file:', error);
						// Fall back to new file
						this.$store.dispatch('circuit/newFile');
					}
				} else {
					// File no longer exists, create new
					this.$store.dispatch('circuit/newFile');
				}
			} else {
				// No last opened file, create new
				this.$store.dispatch('circuit/newFile');
			}
		},

		/**
		 * Handle window closing event
		 * Check for unsaved changes and prompt user if needed
		 */
		async handleWindowClosing() {
			const { ipcRenderer } = require('electron');
			const isDirty = this.$store.getters['circuit/isDirty'];

			if (isDirty) {
				// Show unsaved changes dialog
				const response = await ipcRenderer.invoke('show-unsaved-changes-dialog');

				// response: 0=Save, 1=Don't Save, 2=Cancel
				if (response === 0) {
					// Save before closing
					const saved = await this.handleSaveFile();
					if (saved) {
						ipcRenderer.send('window-can-close');
					}
					// If save failed or was cancelled, don't close
				} else if (response === 1) {
					// Don't save, just close
					ipcRenderer.send('window-can-close');
				}
				// If response === 2 (Cancel), do nothing - window stays open
			} else {
				// No unsaved changes, close immediately
				ipcRenderer.send('window-can-close');
			}
		},

		/**
		 * Handle new file menu action
		 */
		async handleNewFile() {
			const isDirty = this.$store.getters['circuit/isDirty'];

			if (isDirty) {
				const { ipcRenderer } = require('electron');
				const response = await ipcRenderer.invoke('show-unsaved-changes-dialog');

				if (response === 0) {
					// Save before creating new
					const saved = await this.handleSaveFile();
					if (saved) {
						this.$store.dispatch('circuit/newFile');
					}
				} else if (response === 1) {
					// Don't save, create new
					this.$store.dispatch('circuit/newFile');
				}
				// If response === 2 (Cancel), do nothing
			} else {
				// No unsaved changes, create new immediately
				this.$store.dispatch('circuit/newFile');
			}
		},

		/**
		 * Handle open file menu action
		 */
		async handleOpenFile() {
			const { ipcRenderer } = require('electron');
			const isDirty = this.$store.getters['circuit/isDirty'];

			// Check for unsaved changes first
			if (isDirty) {
				const response = await ipcRenderer.invoke('show-unsaved-changes-dialog');

				if (response === 0) {
					// Save before opening
					const saved = await this.handleSaveFile();
					if (!saved) {
						return; // Save failed or was cancelled
					}
				} else if (response === 2) {
					// Cancel
					return;
				}
				// If response === 1 (Don't Save), continue to open
			}

			// Show open dialog
			const filePath = await ipcRenderer.invoke('show-open-dialog');
			if (!filePath) {
				return; // User cancelled
			}

			// Read file
			const result = await ipcRenderer.invoke('read-file', filePath);
			if (!result.success) {
				await ipcRenderer.invoke('show-error-dialog', 'Error Opening File', 'Failed to read file', result.error);
				return;
			}

			// Parse and load circuit
			try {
				const circuitData = JSON.parse(result.data);

				// Restore window layout if present
				if (circuitData.windowLayout) {
					ipcRenderer.send('restore-window-layout', circuitData.windowLayout);
				}

				const loadResult = await this.$store.dispatch('circuit/loadFile', { filePath, circuitData });

				if (!loadResult.success) {
					await ipcRenderer.invoke('show-error-dialog', 'Error Loading Circuit', 'Failed to load circuit', loadResult.error);
				}
			} catch (error) {
				await ipcRenderer.invoke('show-error-dialog', 'Error Parsing File', 'Invalid circuit file format', error.message);
			}
		},

		/**
		 * Handle save file menu action
		 * @returns {boolean} True if save was successful
		 */
		async handleSaveFile() {
			const currentFilePath = this.$store.getters['circuit/getCurrentFilePath'];

			if (currentFilePath) {
				// Save to existing file
				return this.saveToFile(currentFilePath);
			}
			// No current file, show save as dialog
			return this.handleSaveFileAs();
		},

		/**
		 * Handle save as menu action
		 * @returns {boolean} True if save was successful
		 */
		async handleSaveFileAs() {
			const { ipcRenderer } = require('electron');
			const currentFilePath = this.$store.getters['circuit/getCurrentFilePath'];

			// Show save dialog
			const filePath = await ipcRenderer.invoke('show-save-dialog', currentFilePath);
			if (!filePath) {
				return false; // User cancelled
			}

			return this.saveToFile(filePath);
		},

		/**
		 * Handle import DXO file menu action
		 */
		async handleImportDxo() {
			const { ipcRenderer } = require('electron');

			// Show file dialog for .dxo files
			const filePath = await ipcRenderer.invoke('show-import-dxo-dialog');
			if (!filePath) {
				return; // User cancelled
			}

			// Read the file content
			const result = await ipcRenderer.invoke('read-file', filePath);
			if (!result.success) {
				await ipcRenderer.invoke('show-error-dialog', 'Error Importing DXO', 'Failed to read file', result.error);
				return;
			}

			try {
				const { DxoImporter } = await import('@/io/DxoImporter');
				const circuit = DxoImporter.importFromContent(result.data, filePath);

				// Load the imported circuit directly (preserves embedded FRD/ZMA data)
				this.$store.dispatch('circuit/loadCircuitObject', {
					circuit,
					filePath: null,
				});
			} catch (error) {
				await ipcRenderer.invoke('show-error-dialog', 'Error Importing DXO', 'Failed to parse DXO file', error.message);
			}
		},

		/**
		 * Save circuit to specified file path
		 * @param {string} filePath - Path to save to
		 * @returns {boolean} True if save was successful
		 */
		async saveToFile(filePath) {
			const { ipcRenderer } = require('electron');

			// Get circuit data from store
			const result = await this.$store.dispatch('circuit/saveFile', filePath);

			if (!result.success) {
				await ipcRenderer.invoke('show-error-dialog', 'Error Saving Circuit', 'Failed to save circuit', result.error);
				return false;
			}

			// Get window layout from main process
			const windowLayout = await ipcRenderer.invoke('get-window-layout');
			if (windowLayout) {
				result.data.windowLayout = windowLayout;
			}

			// Write to file
			const circuitJson = JSON.stringify(result.data, null, 2);
			const writeResult = await ipcRenderer.invoke('write-file', filePath, circuitJson);

			if (!writeResult.success) {
				await ipcRenderer.invoke('show-error-dialog', 'Error Writing File', 'Failed to write file', writeResult.error);
				return false;
			}

			return true;
		},

		/**
		 * Save crash recovery data
		 * Called periodically to save circuit state for crash recovery
		 */
		async saveCrashRecoveryData() {
			const { ipcRenderer } = require('electron');
			const circuit = this.$store.getters['circuit/getCircuit'];

			if (circuit) {
				try {
					const circuitData = circuit.toJSON();
					await ipcRenderer.invoke('save-crash-recovery', circuitData);
				} catch (error) {
					// Silently ignore crash recovery errors - non-critical feature
					// Error typically occurs when circuit contains non-serializable data
					console.debug('Crash recovery skipped:', error.message);
				}
			}
		},
	},
};
</script>

<style scoped>
.app-container {
	display: flex;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background-color: #f5f5f5;
}
</style>
