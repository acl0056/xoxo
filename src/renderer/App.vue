<template>
	<div class="app-container">
		<ComponentPalette />
		<CircuitEditor />
		<AboutDialog
			:visible="showAboutDialog"
			@close="showAboutDialog = false"
		/>
		<div
			v-if="showPairingDialog"
			class="pairing-overlay"
		>
			<div class="pairing-dialog">
				<h2>Connect to ChatGPT</h2>
				<p
					class="pairing-instruction"
					:class="{ 'pairing-expired-message': pairingExpired }"
				>
					{{ pairingExpired ? 'Code expired.' : 'Enter this code in the ChatGPT authorization page:' }}
				</p>
				<div
					class="pairing-code"
					:class="{ 'pairing-code-expired': pairingExpired }"
					@click="copyPairingCode"
				>
					<span
						ref="pairingCodeText"
						class="pairing-code-text"
					>{{ pairingExpired ? 'XOXO-XXXX' : pairingCode }}</span>
					<span
						class="pairing-copied"
						:class="{ 'pairing-copied-visible': pairingCopied && !pairingExpired }"
					>
						Copied to clipboard
					</span>
				</div>
				<p class="pairing-countdown">
					<span
						:class="{ 'pairing-countdown-hidden': !pairingCountdown || pairingExpired }"
					>
						Expires in {{ Math.floor((pairingCountdown || 0) / 60) }}:{{ String((pairingCountdown || 0) % 60).padStart(2, '0') }}
					</span>
				</p>
				<div class="pairing-action-slot">
					<button
						v-if="pairingExpired"
						class="pairing-button"
						@click="requestNewCode"
					>
						Generate New Code
					</button>
				</div>
				<button
					class="pairing-button pairing-cancel"
					@click="cancelPairing"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import { useToast } from 'vue-toastification';
import { Circuit } from '@/models/Circuit';
import { Wire } from '@/models/Wire';
import AboutDialog from './components/AboutDialog.vue';
import CircuitEditor from './components/CircuitEditor.vue';
import ComponentPalette from './components/ComponentPalette.vue';

function toIpcPayload(value) {
	return JSON.parse(JSON.stringify(value));
}

export default {
	name: 'App',
	components: {
		ComponentPalette,
		CircuitEditor,
		AboutDialog,
	},
	setup() {
		const toast = useToast();
		return { toast };
	},
	data() {
		return {
			showAboutDialog: false,
			showPairingDialog: false,
			pairingCode: null,
			pairingCountdown: null,
			pairingExpired: false,
			pairingCopied: false,
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

		ipcRenderer.on('open-recent-file', async (event, filePath) => {
			await this.handleOpenRecentFile(filePath);
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

		ipcRenderer.on('menu-insert-circuit-block', (event, blockIdentifier) => {
			this.handleInsertCircuitBlock(blockIdentifier);
		});

		ipcRenderer.on('menu-undo', () => {
			this.$store.dispatch('circuit/undo');
		});

		ipcRenderer.on('menu-redo', () => {
			this.$store.dispatch('circuit/redo');
		});

		// ChatGPT data request handlers
		ipcRenderer.on('chatgpt:get-circuit-layout', () => {
			try {
				const circuit = this.$store.getters['circuit/getCircuit'];
				if (!circuit) {
					console.log('[ChatGPT IPC] get-circuit-layout: no circuit loaded');
					ipcRenderer.send('chatgpt:get-circuit-layout:response', null);
					return;
				}
				const layout = JSON.parse(JSON.stringify(circuit.toJSON()));
				console.log('[ChatGPT IPC] get-circuit-layout: sending layout with', layout.components?.length, 'components');
				ipcRenderer.send('chatgpt:get-circuit-layout:response', layout);
			} catch (error) {
				console.error('[ChatGPT IPC] get-circuit-layout error:', error);
				ipcRenderer.send('chatgpt:get-circuit-layout:response', null);
			}
		});

		ipcRenderer.on('chatgpt:get-simulation-results', () => {
			const frequencyResponse = this.$store.getters['simulation/getFrequencyResponse'];
			const impedanceResponse = this.$store.getters['simulation/getImpedanceResponse'];
			if (frequencyResponse || impedanceResponse) {
				const data = {
					frequencyResponse,
					impedanceResponse,
					timestamp: new Date().toISOString(),
				};
				ipcRenderer.send('chatgpt:get-simulation-results:response', JSON.parse(JSON.stringify(data)));
			} else {
				ipcRenderer.send('chatgpt:get-simulation-results:response', null);
			}
		});

		ipcRenderer.on('chatgpt:get-user-loaded-frds', () => {
			const frds = this.$store.state.simulation.userLoadedFrds || null;
			ipcRenderer.send('chatgpt:get-user-loaded-frds:response', frds);
		});

		// Auto-accept edit requests from ChatGPT (no confirmation dialog)
		let editGroupActions = null; // Collects actions during an edit group

		ipcRenderer.on('chatgpt:edit-request', async (event, { type, payload, requestId }) => {
			console.log('[ChatGPT IPC] edit-request:', type, requestId);
			try {
				const responseType = type.replace('request:', 'response:');
				let result = { success: true };

				if (type === 'request:beginEditGroup') {
					editGroupActions = [];
				} else if (type === 'request:endEditGroup') {
					if (editGroupActions && editGroupActions.length > 0) {
						// Replace individual undo entries with a single batch entry
						// Pop the individual entries that were pushed during the group
						for (let i = 0; i < editGroupActions.length; i++) {
							this.$store.state.circuit.undoStack.pop();
						}
						// Push a single batch undo entry
						this.$store.commit('circuit/PUSH_UNDO', {
							type: 'batch',
							payload: editGroupActions,
						});
					}
					editGroupActions = null;
				} else if (type === 'request:optimize') {
					const { componentId, parameters } = payload;
					const circuit = this.$store.getters['circuit/getCircuit'];
					const component = circuit ? circuit.getComponent(componentId) : null;
					const previousParameters = component
						? JSON.parse(JSON.stringify(component.parameters))
						: null;
					const mergedParameters = previousParameters
						? { ...previousParameters, ...parameters }
						: parameters;

					// Capture previous values for the batch undo
					if (editGroupActions !== null && previousParameters) {
						editGroupActions.push({
							type: 'updateComponent',
							payload: { componentId, updates: { parameters: previousParameters } },
						});
					}
					this.$store.dispatch('circuit/updateComponent', {
						componentId,
						updates: { parameters: mergedParameters },
					});
				} else if (type === 'request:addComponent') {
					const componentData = payload.component || payload;
					const component = Circuit.deserializeComponent(componentData);
					if (editGroupActions !== null) {
						editGroupActions.push({ type: 'removeComponent', payload: component.id });
					}
					this.$store.dispatch('circuit/addComponent', component);
					// Auto-create wire connections for overlapping terminals
					this.$nextTick(() => {
						this.createWireConnectionsForComponent(component.id);
					});
				} else if (type === 'request:removeComponent') {
					if (editGroupActions !== null) {
						const circuit = this.$store.getters['circuit/getCircuit'];
						const component = circuit ? circuit.getComponent(payload.componentId) : null;
						if (component) {
							editGroupActions.push({
								type: 'addComponent',
								payload: JSON.parse(JSON.stringify(component.toJSON())),
							});
						}
					}
					this.$store.dispatch('circuit/removeComponent', payload.componentId);
				} else if (type === 'request:addWire') {
					const wireData = payload.wire || payload;
					const wire = Wire.fromJSON(wireData);
					if (editGroupActions !== null) {
						editGroupActions.push({ type: 'removeWire', payload: wire.id });
					}
					this.$store.dispatch('circuit/addWire', wire);
				} else if (type === 'request:removeWire') {
					if (editGroupActions !== null) {
						const circuit = this.$store.getters['circuit/getCircuit'];
						const wire = circuit ? circuit.getWire(payload.wireId) : null;
						if (wire) {
							editGroupActions.push({
								type: 'addWire',
								payload: JSON.parse(JSON.stringify(wire.toJSON())),
							});
						}
					}
					this.$store.dispatch('circuit/removeWire', payload.wireId);
				} else if (type === 'request:moveComponent') {
					const { componentId, x, y } = payload;
					this.$store.dispatch('circuit/updateComponent', {
						componentId,
						updates: { x, y },
					});
				} else if (type === 'request:selectGraphAngle') {
					const { angle } = payload;
					await this.$store.dispatch('simulation/switchAngle', angle);
					result = {
						success: true,
						angle: this.$store.state.simulation.currentAngle,
						availableAngles: [...this.$store.state.simulation.availableAngles],
						excludedSpeakerIds: [...this.$store.state.simulation.excludedSpeakers],
					};
				} else if (type === 'request:setCircuitLayout') {
					this.$store.dispatch('circuit/loadFromJSON', payload.layout || payload);
				} else {
					console.warn('[ChatGPT IPC] Unhandled edit request type:', type);
					result = { success: false, error: `Unhandled request type: ${type}` };
				}

				ipcRenderer.send('chatgpt:edit-response', toIpcPayload({ responseType, payload: result, requestId }));
			} catch (error) {
				console.error('[ChatGPT IPC] edit-request error:', error);
				const responseType = type.replace('request:', 'response:');
				ipcRenderer.send('chatgpt:edit-response', {
					responseType,
					payload: { success: false, error: error.message },
					requestId,
				});
			}
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

			// Push circuit layout to server on any circuit-modifying mutation
			const circuitMutations = [
				'circuit/ADD_COMPONENT', 'circuit/REMOVE_COMPONENT', 'circuit/UPDATE_COMPONENT',
				'circuit/ADD_WIRE', 'circuit/REMOVE_WIRE', 'circuit/SET_CIRCUIT',
			];
			if (circuitMutations.includes(mutation.type)) {
				const circuit = this.$store.getters['circuit/getCircuit'];
				if (circuit) {
					try {
						const layout = JSON.parse(JSON.stringify(circuit.toJSON()));
						ipcRenderer.send('chatgpt:circuit-layout-changed', layout);
					} catch (error) {
						// Ignore serialization errors
					}
				}
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
			const circuit = this.$store.getters['circuit/getCircuit'];
			if (frequencyResponse || impedanceResponse) {
				// Deep clone via JSON to ensure all data is serializable for IPC
				const data = {
					frequencyResponse,
					impedanceResponse,
					currentAngle: this.$store.state.simulation.currentAngle,
					availableAngles: this.$store.state.simulation.availableAngles,
					timestamp: new Date().toISOString(),
				};
				if (circuit && circuit.curveColors) {
					data.curveColors = circuit.curveColors;
				}
				if (circuit && circuit.graphSettings) {
					data.graphSettings = circuit.graphSettings;
				}
				const payload = JSON.parse(JSON.stringify(data));
				ipcRenderer.send('simulation-results', payload);
			}
		});

		// Listen for curve color updates from graph windows
		ipcRenderer.on('update-curve-color', (event, { graphType, curveId, color }) => {
			this.$store.commit('circuit/SET_CURVE_COLORS', { graphType, curveId, color });
		});

		// Listen for angle changes from graph windows
		ipcRenderer.on('switch-angle', (event, angle) => {
			this.$store.dispatch('simulation/switchAngle', angle);
		});

		// Listen for graph settings changes from graph windows
		ipcRenderer.on('update-graph-settings', (event, { graphType, settings }) => {
			this.$store.commit('circuit/SET_GRAPH_SETTINGS', { graphType, settings });
		});

		// ChatGPT pairing flow
		ipcRenderer.on('chatgpt:pairing-code', (event, { code }) => {
			this.pairingCode = code;
			this.pairingCountdown = null;
			this.pairingExpired = false;
			this.pairingCopied = false;
			this.showPairingDialog = true;
		});

		ipcRenderer.on('chatgpt:pairing-countdown', (event, { remainingSeconds }) => {
			this.pairingCountdown = remainingSeconds;
		});

		ipcRenderer.on('chatgpt:pairing-expired', () => {
			this.pairingExpired = true;
			this.pairingCountdown = null;
		});

		ipcRenderer.on('chatgpt:pairing-success', () => {
			this.showPairingDialog = false;
			this.pairingCode = null;
			this.toast.success('ChatGPT connected successfully');
		});

		ipcRenderer.on('chatgpt:disconnected', () => {
			this.showPairingDialog = false;
			this.pairingCode = null;
		});
	},
	methods: {
		/**
		 * Close the pairing dialog without cancelling the pairing flow.
		 */
		cancelPairing() {
			this.showPairingDialog = false;
			this.pairingCopied = false;
		},
		/**
		 * Auto-create wire connections for a component based on terminal position overlap.
		 * Mirrors the logic in CircuitEditor.createWireConnectionsForComponent.
		 */
		createWireConnectionsForComponent(componentId) {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit) return;

			const component = circuit.getComponent(componentId);
			if (!component) return;

			const getTerminals = (comp) => comp.terminals.map((terminal, index) => {
				const pos = comp.getTerminalPosition(index);
				return pos;
			}).filter(Boolean);

			const componentTerminals = getTerminals(component);
			const allOtherComponents = circuit.components.filter((c) => c.id !== componentId);

			for (let ti = 0; ti < componentTerminals.length; ti++) {
				const termPos = componentTerminals[ti];

				for (const otherComponent of allOtherComponents) {
					const otherTerminals = getTerminals(otherComponent);

					for (let oi = 0; oi < otherTerminals.length; oi++) {
						const otherPos = otherTerminals[oi];

						const distance = Math.sqrt(
							(termPos.x - otherPos.x) ** 2 + (termPos.y - otherPos.y) ** 2,
						);

						if (distance <= 0.1) {
							const alreadyConnected = circuit.wires.some((w) => (w.startNode.componentId === componentId
									&& w.startNode.terminal === ti
									&& w.endNode.componentId === otherComponent.id
									&& w.endNode.terminal === oi)
								|| (w.startNode.componentId === otherComponent.id
									&& w.startNode.terminal === oi
									&& w.endNode.componentId === componentId
									&& w.endNode.terminal === ti));

							if (!alreadyConnected) {
								const newWire = new Wire(
									{ componentId, terminal: ti },
									{ componentId: otherComponent.id, terminal: oi },
								);
								this.$store.dispatch('circuit/addWire', newWire);
							}
						}
					}
				}
			}
		},
		/**
		 * Copy the pairing code to clipboard and show confirmation.
		 */
		copyPairingCode() {
			if (!this.pairingCode) return;
			navigator.clipboard.writeText(this.pairingCode);
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(this.$refs.pairingCodeText);
			selection.removeAllRanges();
			selection.addRange(range);
			this.pairingCopied = true;
			setTimeout(() => { this.pairingCopied = false; }, 2000);
		},
		/**
		 * Request a new pairing code after expiration.
		 */
		requestNewCode() {
			const { ipcRenderer } = require('electron');
			ipcRenderer.send('chatgpt:request-new-code');
		},
		/**
		 * Handle circuit block insertion from the menu.
		 * Loads the block from the registry and inserts it directly with default values.
		 * @param {string} blockIdentifier - The block identifier (filename without extension)
		 */
		async handleInsertCircuitBlock(blockIdentifier) {
			if (!this.$store.state.circuit.circuit) {
				this.toast.warning('Open a circuit first to insert a block');
				return;
			}

			const path = require('path');
			const { loadBlockRegistry } = await import('@/blocks/BlockRegistry');
			const { filterActiveVariables } = await import('@/blocks/variableUtils');
			let blocksDirectory;
			if (process.env.NODE_ENV === 'production') {
				const appRoot = path.join(process.resourcesPath, 'app.asar');
				blocksDirectory = path.join(appRoot, 'src/data/circuit-blocks');
			} else {
				blocksDirectory = path.join(process.cwd(), 'src/data/circuit-blocks');
			}
			const registry = loadBlockRegistry(blocksDirectory);
			const block = registry.getBlock(blockIdentifier);

			if (!block) {
				this.toast.error(`Circuit block not found: ${blockIdentifier}`);
				return;
			}

			// Build variable values from defaults (no dialog)
			const activeVars = filterActiveVariables(block.variables);
			const variables = {};
			for (const variable of activeVars) {
				variables[variable.name] = variable.defaultValue;
			}

			const result = await this.$store.dispatch('circuit/insertBlock', {
				block,
				variables,
				insertionPoint: { x: 20, y: 20 },
			});

			if (!result.success) {
				this.toast.error(`Failed to insert block: ${result.error}`);
			}
		},

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
					} else {
						ipcRenderer.send('window-close-cancelled');
					}
					// If save failed or was cancelled, don't close
				} else if (response === 1) {
					// Don't save, just close
					ipcRenderer.send('window-can-close');
				} else {
					ipcRenderer.send('window-close-cancelled');
				}
				// If response === 2 (Cancel), notify main so future close requests can prompt again.
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
		 * Handle opening a recent file from the File > Recent Files menu
		 * @param {string} filePath - The path of the recent file to open
		 */
		async handleOpenRecentFile(filePath) {
			const { ipcRenderer } = require('electron');
			const isDirty = this.$store.getters['circuit/isDirty'];

			// Check for unsaved changes first
			if (isDirty) {
				const response = await ipcRenderer.invoke('show-unsaved-changes-dialog');

				if (response === 0) {
					// Save before opening
					const saved = await this.handleSaveFile();
					if (!saved) {
						return;
					}
				} else if (response === 2) {
					// Cancel
					return;
				}
				// If response === 1 (Don't Save), continue to open
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
				} else {
					// Update recent files and last opened file tracking
					await ipcRenderer.invoke('add-recent-file', filePath);
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

.pairing-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}

.pairing-dialog {
	background: #fff;
	border-radius: 8px;
	padding: 32px;
	text-align: center;
	width: 460px;
	min-height: 330px;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.pairing-dialog h2 {
	margin: 0 0 12px;
}

.pairing-instruction {
	min-height: 20px;
	margin: 0;
}

.pairing-code {
	font-size: 36px;
	font-weight: bold;
	font-family: monospace;
	letter-spacing: 4px;
	margin: 20px 0;
	padding: 16px;
	background: #f0f0f0;
	border-radius: 6px;
	cursor: pointer;
	position: relative;
	user-select: text;
}

.pairing-code-text {
	display: block;
	min-height: 43px;
	white-space: nowrap;
}

.pairing-code-expired {
	cursor: default;
	color: transparent;
	user-select: none;
}

.pairing-code:not(.pairing-code-expired):hover {
	background: #e4e4e4;
}

.pairing-copied {
	display: block;
	visibility: hidden;
	font-size: 12px;
	font-weight: normal;
	letter-spacing: normal;
	color: #2a7d2a;
	margin-top: 8px;
}

.pairing-copied-visible {
	visibility: visible;
}

.pairing-countdown {
	color: #666;
	min-height: 17px;
	margin: 8px 0 16px;
}

.pairing-countdown-hidden {
	visibility: hidden;
}

.pairing-expired-message {
	color: #c00;
	font-weight: bold;
}

.pairing-action-slot {
	min-height: 46px;
}

.pairing-button {
	display: block;
	width: 100%;
	padding: 10px 20px;
	margin-top: 12px;
	border: none;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	background: #4a90d9;
	color: #fff;
}

.pairing-button:hover {
	background: #357abd;
}

.pairing-cancel {
	background: #999;
}

.pairing-cancel:hover {
	background: #777;
}
</style>
