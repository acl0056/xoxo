<template>
	<div class="impedance-graph">
		<div
			ref="graphMenu"
			class="graph-menu"
		>
			<button @click="toggleFileMenu">
				File
			</button>
			<button @click="toggleScaleMenu">
				Scale
			</button>
			<button @click="toggleCurvesMenu">
				Curves
			</button>
		</div>

		<!-- Scale Menu Modal -->
		<div
			v-if="scaleMenuVisible"
			class="modal-overlay"
			@click.self="closeScaleMenu"
		>
			<div class="modal-content scale-menu">
				<div class="modal-header">
					<h3>Scale Settings</h3>
					<button
						class="close-button"
						@click="closeScaleMenu"
					>
						×
					</button>
				</div>
				<div class="scale-controls">
					<div class="control-group">
						<label>Min Frequency (Hz):</label>
						<input
							v-model.number="scaleSettings.minFreq"
							type="number"
							min="1"
							:max="scaleSettings.maxFreq"
							@change="renderGraph"
						>
					</div>
					<div class="control-group">
						<label>Max Frequency (Hz):</label>
						<input
							v-model.number="scaleSettings.maxFreq"
							type="number"
							:min="scaleSettings.minFreq"
							max="100000"
							@change="renderGraph"
						>
					</div>
					<div class="control-group">
						<label>Vertical Center (Ω):</label>
						<input
							v-model.number="scaleSettings.centerValue"
							type="number"
							step="1"
							@change="renderGraph"
						>
					</div>
					<div class="control-group">
						<label>Vertical Step Size (Ω):</label>
						<input
							v-model.number="scaleSettings.stepSize"
							type="number"
							min="1"
							max="20"
							step="1"
							@change="renderGraph"
						>
					</div>
				</div>
				<div class="modal-actions">
					<button @click="resetScaleSettings">
						Reset to Default
					</button>
				</div>
			</div>
		</div>

		<!-- File Menu Modal -->
		<div
			v-if="fileMenuVisible"
			class="modal-overlay"
			@click.self="closeFileMenu"
		>
			<div class="modal-content file-menu">
				<div class="modal-header">
					<h3>File</h3>
					<button
						class="close-button"
						@click="closeFileMenu"
					>
						×
					</button>
				</div>
				<div class="file-menu-options">
					<button
						class="menu-option"
						@click="exportZMA"
					>
						Export as ZMA File...
					</button>
					<button
						class="menu-option"
						@click="exportSnapshotToFile"
					>
						Save Snapshot to File...
					</button>
					<button
						class="menu-option"
						@click="exportSnapshotToClipboard"
					>
						Copy Snapshot to Clipboard
					</button>
				</div>
			</div>
		</div>

		<!-- Curves Menu Modal -->
		<div
			v-if="curvesMenuVisible"
			class="modal-overlay"
			@click.self="closeCurvesMenu"
		>
			<div class="modal-content curves-menu">
				<div class="modal-header">
					<h3>Curves</h3>
					<button
						class="close-button"
						@click="closeCurvesMenu"
					>
						×
					</button>
				</div>
				<div class="curves-list">
					<div class="curve-item">
						<div class="curve-header">
							<label>
								<input
									v-model="impedanceCurveVisible"
									type="checkbox"
									@change="updateCurves"
								>
								Impedance
							</label>
						</div>
						<div class="curve-controls">
							<div class="control-group">
								<label>Color:</label>
								<input
									v-model="curveColors.impedance"
									type="color"
									@change="saveImpedanceCurveColor('impedance', curveColors.impedance)"
								>
							</div>
							<div class="control-group">
								<label>
									<input
										v-model="showPhase"
										type="checkbox"
										@change="updateCurves"
									>
									Show Phase
								</label>
							</div>
							<div class="control-group">
								<label>Smoothing:</label>
								<select
									v-model="impedanceSmoothing"
									@change="applyImpedanceSmoothing"
								>
									<option value="none">
										None
									</option>
									<option value="1/24">
										1/24 octave
									</option>
									<option value="1/12">
										1/12 octave
									</option>
									<option value="1/6">
										1/6 octave
									</option>
									<option value="1/3">
										1/3 octave
									</option>
									<option value="1/2">
										1/2 octave
									</option>
									<option value="1">
										1 octave
									</option>
									<option value="erb">
										ERB
									</option>
								</select>
							</div>
						</div>
					</div>
					<div
						v-if="externalCurves.length > 0"
						class="external-curves-section"
					>
						<h4>External Files</h4>
						<div
							v-for="curve in externalCurves"
							:key="curve.id"
							class="curve-item"
						>
							<div class="curve-header">
								<label>
									<input
										v-model="curve.visible"
										type="checkbox"
										@change="renderGraph"
									>
									{{ curve.label }}
								</label>
								<button
									class="remove-button"
									@click="removeExternalCurve(curve.id)"
								>
									Remove
								</button>
							</div>
							<div class="curve-controls">
								<div class="control-group">
									<label>Color:</label>
									<input
										v-model="curve.color"
										type="color"
										@change="renderGraph"
									>
								</div>
								<div class="control-group">
									<label>Smoothing:</label>
									<select
										v-model="curve.smoothing"
										@change="applySmoothingToCurve(curve)"
									>
										<option value="none">
											None
										</option>
										<option value="1/24">
											1/24 octave
										</option>
										<option value="1/12">
											1/12 octave
										</option>
										<option value="1/6">
											1/6 octave
										</option>
										<option value="1/3">
											1/3 octave
										</option>
										<option value="1/2">
											1/2 octave
										</option>
										<option value="1">
											1 octave
										</option>
										<option value="erb">
											ERB
										</option>
									</select>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="modal-actions">
					<button @click="loadExternalFile">
						Get File...
					</button>
				</div>
			</div>
		</div>

		<canvas
			ref="graphCanvas"
			@mousemove="handleMouseMove"
			@mouseleave="handleMouseLeave"
		/>
		<div
			v-if="tooltip.visible"
			class="tooltip"
			:style="tooltipStyle"
		>
			<div>Frequency: {{ tooltip.frequency }} Hz</div>
			<div>Impedance: {{ tooltip.impedance }} Ω</div>
			<div v-if="showPhase">
				Phase: {{ tooltip.phase }}°
			</div>
		</div>
		<button
			class="hold-button"
			@click="toggleHold"
		>
			{{ holdActive ? 'Release' : 'Hold' }}
		</button>
	</div>
</template>

<script>
import { mapState } from 'vuex';
import { useToast } from 'vue-toastification';

export default {
	name: 'ImpedanceGraph',
	setup() {
		const toast = useToast();
		return { toast };
	},
	data() {
		return {
			canvas: null,
			context: null,
			holdActive: false,
			heldCurves: null,
			curvesMenuVisible: false,
			scaleMenuVisible: false,
			fileMenuVisible: false,
			showPhase: false,
			impedanceCurveVisible: true,
			impedanceSmoothing: 'none',
			scaleSettings: {
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 8,
				stepSize: 2,
			},
			curves: [],
			externalCurves: [],
			curveColors: {
				impedance: '#0066cc',
				phase: '#ff6b6b',
			},
			originalImpedanceData: null,
			savedCurveColors: {},
			tooltip: {
				visible: false,
				frequency: 0,
				impedance: 0,
				phase: 0,
				x: 0,
				y: 0,
			},
		};
	},
	computed: {
		...mapState('simulation', ['impedanceResponse']),
		tooltipStyle() {
			return {
				left: `${this.tooltip.x + 10}px`,
				top: `${this.tooltip.y + 10}px`,
			};
		},
	},
	watch: {
		impedanceResponse: {
			handler() {
				this.updateCurves();
				this.renderGraph();
			},
			deep: true,
		},
	},
	mounted() {
		this.canvas = this.$refs.graphCanvas;
		this.context = this.canvas.getContext('2d');
		this.resizeCanvas();
		window.addEventListener('resize', this.resizeCanvas);
		this.renderGraph();

		// Listen for simulation results broadcast from main window
		const { ipcRenderer } = require('electron');
		ipcRenderer.on('simulation-results', (event, results) => {
			if (results.curveColors && results.curveColors.impedance) {
				this.savedCurveColors = results.curveColors.impedance;
			}
			// Always commit impedance response (including null to clear stale data)
			this.$store.commit('simulation/SET_IMPEDANCE_RESPONSE', results.impedanceResponse || null);
		});

		// Request current results in case simulation already ran
		ipcRenderer.send('request-simulation-results');
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.resizeCanvas);
		const { ipcRenderer } = require('electron');
		ipcRenderer.removeAllListeners('simulation-results');
	},
	methods: {
		resizeCanvas() {
			const container = this.canvas.parentElement;
			const menuHeight = this.$refs.graphMenu ? this.$refs.graphMenu.offsetHeight : 0;
			this.canvas.width = container.clientWidth;
			this.canvas.height = container.clientHeight - menuHeight;
			this.renderGraph();
		},
		updateCurves() {
			if (!this.impedanceResponse) {
				this.curves = [];
				return;
			}

			const saved = this.savedCurveColors || {};

			// Apply saved colors to local tracking
			if (saved.impedance) {
				this.curveColors.impedance = saved.impedance;
			}
			if (saved.phase) {
				this.curveColors.phase = saved.phase;
			}

			// Store original data for smoothing
			if (!this.originalImpedanceData) {
				this.originalImpedanceData = {
					frequencies: [...(this.impedanceResponse.frequencies || [])],
					impedances: [...(this.impedanceResponse.impedances || [])],
					phases: [...(this.impedanceResponse.phases || [])],
				};
			}

			this.curves = [];

			if (this.impedanceCurveVisible) {
				this.curves.push({
					id: 'impedance',
					label: 'Impedance',
					frequencies: this.impedanceResponse.frequencies || [],
					values: this.impedanceResponse.impedances || [],
					color: this.curveColors.impedance,
					visible: true,
					isPhase: false,
				});
			}

			// Add phase curve if enabled
			if (this.showPhase && this.impedanceResponse.phases) {
				this.curves.push({
					id: 'phase',
					label: 'Phase',
					frequencies: this.impedanceResponse.frequencies || [],
					values: this.impedanceResponse.phases || [],
					color: this.curveColors.phase,
					visible: true,
					isPhase: true,
				});
			}

			this.renderGraph();
		},
		renderGraph() {
			if (!this.context) return;

			const { width, height } = this.canvas;
			const hasPhase = this.showPhase && this.impedanceResponse && this.impedanceResponse.phases;
			const margin = {
				top: 7,
				right: hasPhase ? 60 : 20,
				bottom: 40,
				left: 60,
			};
			const graphWidth = width - margin.left - margin.right;
			const graphHeight = height - margin.top - margin.bottom;

			// Clear canvas
			this.context.clearRect(0, 0, width, height);

			// Draw background
			this.context.fillStyle = '#ffffff';
			this.context.fillRect(0, 0, width, height);

			// Draw grid and axes
			this.drawGrid(margin, graphWidth, graphHeight);
			this.drawAxes(margin, graphWidth, graphHeight);

			// Draw phase axis if enabled
			if (hasPhase) {
				this.drawPhaseAxis(margin, graphWidth, graphHeight);
			}

			// Draw held curves if active
			if (this.holdActive && this.heldCurves) {
				this.drawCurves(this.heldCurves, margin, graphWidth, graphHeight, true);
			}

			// Draw current curves
			this.drawCurves(this.curves, margin, graphWidth, graphHeight, false);

			// Draw external curves
			this.drawCurves(this.externalCurves, margin, graphWidth, graphHeight, false);
		},
		drawGrid(margin, graphWidth, graphHeight) {
			this.context.strokeStyle = '#e0e0e0';
			this.context.lineWidth = 1;

			// Vertical grid lines (frequency)
			const freqDecades = Math.log10(this.scaleSettings.maxFreq / this.scaleSettings.minFreq);
			const numVerticalLines = Math.ceil(freqDecades) * 10;

			for (let i = 0; i <= numVerticalLines; i++) {
				const logPos = i / numVerticalLines;
				const x = margin.left + logPos * graphWidth;
				this.context.beginPath();
				this.context.moveTo(x, margin.top);
				this.context.lineTo(x, margin.top + graphHeight);
				this.context.stroke();
			}

			// Horizontal grid lines (impedance/phase)
			const range = this.scaleSettings.stepSize * 10;
			const numHorizontalLines = Math.ceil(range / this.scaleSettings.stepSize);

			for (let i = 0; i <= numHorizontalLines; i++) {
				const y = margin.top + (i / numHorizontalLines) * graphHeight;
				this.context.beginPath();
				this.context.moveTo(margin.left, y);
				this.context.lineTo(margin.left + graphWidth, y);
				this.context.stroke();
			}
		},
		drawAxes(margin, graphWidth, graphHeight) {
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;
			this.context.font = '12px sans-serif';
			this.context.fillStyle = '#000000';

			// Draw axes
			this.context.beginPath();
			this.context.moveTo(margin.left, margin.top);
			this.context.lineTo(margin.left, margin.top + graphHeight);
			this.context.lineTo(margin.left + graphWidth, margin.top + graphHeight);
			this.context.stroke();

			// X-axis labels (frequency)
			const freqLabels = this.generateFrequencyLabels();
			freqLabels.forEach(({ freq, label }) => {
				const x = this.frequencyToX(freq, margin.left, graphWidth);
				this.context.fillText(label, x - 15, margin.top + graphHeight + 20);
			});

			// Y-axis labels (impedance)
			const valueLabels = this.generateValueLabels();
			valueLabels.forEach(({ value, label }) => {
				const y = this.valueToY(value, margin.top, graphHeight);
				this.context.fillText(label, margin.left - 40, y + 4);
			});

			// Axis titles
			this.context.font = '14px sans-serif';
			this.context.fillText('Frequency (Hz)', margin.left + graphWidth / 2 - 50, margin.top + graphHeight + 35);
			this.context.save();
			this.context.translate(15, margin.top + graphHeight / 2);
			this.context.rotate(-Math.PI / 2);
			this.context.fillText('Impedance (Ω)', -50, 0);
			this.context.restore();
		},
		drawPhaseAxis(margin, graphWidth, graphHeight) {
			const rightX = margin.left + graphWidth;

			// Draw right axis line
			this.context.strokeStyle = this.curveColors.phase;
			this.context.lineWidth = 2;
			this.context.beginPath();
			this.context.moveTo(rightX, margin.top);
			this.context.lineTo(rightX, margin.top + graphHeight);
			this.context.stroke();

			// Phase axis labels (-90° to +90° in 30° steps)
			this.context.font = '12px sans-serif';
			this.context.fillStyle = this.curveColors.phase;
			this.context.textAlign = 'left';

			for (let phase = -90; phase <= 90; phase += 30) {
				const y = this.phaseToY(phase, margin.top, graphHeight);
				this.context.fillText(`${phase}°`, rightX + 5, y + 4);

				// Small tick mark
				this.context.beginPath();
				this.context.moveTo(rightX, y);
				this.context.lineTo(rightX + 4, y);
				this.context.stroke();
			}

			// Phase axis title
			this.context.font = '14px sans-serif';
			this.context.save();
			this.context.translate(rightX + 50, margin.top + graphHeight / 2);
			this.context.rotate(-Math.PI / 2);
			this.context.textAlign = 'center';
			this.context.fillText('Phase (°)', 0, 0);
			this.context.restore();

			// Reset text alignment
			this.context.textAlign = 'left';
			this.context.fillStyle = '#000000';
		},
		drawCurves(curves, margin, graphWidth, graphHeight, isHeld) {
			// Clip curves to graph area
			this.context.save();
			this.context.beginPath();
			this.context.rect(margin.left, margin.top, graphWidth, graphHeight);
			this.context.clip();

			curves.forEach((curve) => {
				if (!curve.visible || curve.frequencies.length === 0) return;

				this.context.strokeStyle = isHeld ? '#cccccc' : curve.color;
				this.context.lineWidth = isHeld ? 1 : 2;
				this.context.beginPath();

				let firstPoint = true;
				for (let i = 0; i < curve.frequencies.length; i++) {
					const freq = curve.frequencies[i];
					const value = curve.values[i];

					if (freq < this.scaleSettings.minFreq || freq > this.scaleSettings.maxFreq) {
						continue;
					}

					// Skip infinite values
					if (!Number.isFinite(value)) {
						firstPoint = true;
						continue;
					}

					const x = this.frequencyToX(freq, margin.left, graphWidth);
					const y = curve.isPhase
						? this.phaseToY(value, margin.top, graphHeight)
						: this.valueToY(value, margin.top, graphHeight);

					if (firstPoint) {
						this.context.moveTo(x, y);
						firstPoint = false;
					} else {
						this.context.lineTo(x, y);
					}
				}

				this.context.stroke();
			});

			this.context.restore(); // Remove clip region
		},
		frequencyToX(freq, marginLeft, graphWidth) {
			const logMin = Math.log10(this.scaleSettings.minFreq);
			const logMax = Math.log10(this.scaleSettings.maxFreq);
			const logFreq = Math.log10(freq);
			const normalized = (logFreq - logMin) / (logMax - logMin);
			return marginLeft + normalized * graphWidth;
		},
		valueToY(value, marginTop, graphHeight) {
			const range = this.scaleSettings.stepSize * 10;
			const minValue = this.scaleSettings.centerValue - range / 2;
			const maxValue = this.scaleSettings.centerValue + range / 2;
			const normalized = (maxValue - value) / (maxValue - minValue);
			return marginTop + normalized * graphHeight;
		},
		phaseToY(phase, marginTop, graphHeight) {
			const minPhase = -90;
			const maxPhase = 90;
			const normalized = (maxPhase - phase) / (maxPhase - minPhase);
			return marginTop + normalized * graphHeight;
		},
		xToFrequency(x, marginLeft, graphWidth) {
			const normalized = (x - marginLeft) / graphWidth;
			const logMin = Math.log10(this.scaleSettings.minFreq);
			const logMax = Math.log10(this.scaleSettings.maxFreq);
			const logFreq = logMin + normalized * (logMax - logMin);
			return 10 ** logFreq;
		},
		yToValue(y, marginTop, graphHeight) {
			const normalized = (y - marginTop) / graphHeight;
			const range = this.scaleSettings.stepSize * 10;
			const minValue = this.scaleSettings.centerValue - range / 2;
			const maxValue = this.scaleSettings.centerValue + range / 2;
			return maxValue - normalized * (maxValue - minValue);
		},
		generateFrequencyLabels() {
			const labels = [];
			const logMin = Math.log10(this.scaleSettings.minFreq);
			const logMax = Math.log10(this.scaleSettings.maxFreq);

			for (let logFreq = Math.ceil(logMin); logFreq <= Math.floor(logMax); logFreq++) {
				const freq = 10 ** logFreq;
				labels.push({
					freq,
					label: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
				});
			}

			return labels;
		},
		generateValueLabels() {
			const labels = [];
			const range = this.scaleSettings.stepSize * 10;
			const minValue = this.scaleSettings.centerValue - range / 2;
			const maxValue = this.scaleSettings.centerValue + range / 2;

			for (let value = minValue; value <= maxValue; value += this.scaleSettings.stepSize) {
				labels.push({
					value,
					label: `${value.toFixed(0)}`,
				});
			}

			return labels;
		},
		handleMouseMove(event) {
			const rect = this.canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			const margin = {
				top: 7,
				right: 20,
				bottom: 40,
				left: 60,
			};
			const graphWidth = this.canvas.width - margin.left - margin.right;
			const graphHeight = this.canvas.height - margin.top - margin.bottom;

			if (x >= margin.left
				&& x <= margin.left + graphWidth
				&& y >= margin.top
				&& y <= margin.top + graphHeight) {
				const freq = this.xToFrequency(x, margin.left, graphWidth);

				// Find closest data point for accurate tooltip
				if (this.impedanceResponse && this.impedanceResponse.frequencies) {
					const closestIndex = this.findClosestFrequencyIndex(freq);
					if (closestIndex !== -1) {
						this.tooltip.visible = true;
						this.tooltip.frequency = this.impedanceResponse.frequencies[closestIndex].toFixed(1);
						this.tooltip.impedance = this.impedanceResponse.impedances[closestIndex].toFixed(2);
						this.tooltip.phase = this.impedanceResponse.phases[closestIndex].toFixed(1);
						this.tooltip.x = event.clientX - rect.left;
						this.tooltip.y = event.clientY - rect.top;
					}
				}
			} else {
				this.tooltip.visible = false;
			}
		},
		findClosestFrequencyIndex(targetFreq) {
			if (!this.impedanceResponse || !this.impedanceResponse.frequencies) {
				return -1;
			}

			let closestIndex = 0;
			let minDiff = Math.abs(Math.log10(this.impedanceResponse.frequencies[0]) - Math.log10(targetFreq));

			for (let i = 1; i < this.impedanceResponse.frequencies.length; i++) {
				const diff = Math.abs(Math.log10(this.impedanceResponse.frequencies[i]) - Math.log10(targetFreq));
				if (diff < minDiff) {
					minDiff = diff;
					closestIndex = i;
				}
			}

			return closestIndex;
		},
		handleMouseLeave() {
			this.tooltip.visible = false;
		},
		toggleCurvesMenu() {
			this.curvesMenuVisible = !this.curvesMenuVisible;
		},
		closeCurvesMenu() {
			this.curvesMenuVisible = false;
		},
		generateColor(id) {
			const colors = [
				'#ff6b6b',
				'#4ecdc4',
				'#45b7d1',
				'#f9ca24',
				'#6c5ce7',
			];
			const hash = id.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
			return colors[hash % colors.length];
		},
		saveImpedanceCurveColor(curveId, color) {
			this.savedCurveColors[curveId] = color;
			const { ipcRenderer } = require('electron');
			ipcRenderer.send('update-curve-color', {
				graphType: 'impedance',
				curveId,
				color,
			});
			this.updateCurves();
		},
		removeExternalCurve(curveId) {
			const index = this.externalCurves.findIndex((c) => c.id === curveId);
			if (index !== -1) {
				this.externalCurves.splice(index, 1);
				this.renderGraph();
			}
		},
		async loadExternalFile() {
			try {
				// Use Electron's dialog to select ZMA file
				const { dialog } = window.require('electron').remote;
				const { filePaths } = await dialog.showOpenDialog({
					title: 'Load External ZMA File',
					filters: [
						{ name: 'ZMA Files', extensions: ['zma'] },
						{ name: 'All Files', extensions: ['*'] },
					],
					properties: ['openFile'],
				});

				if (!filePaths || filePaths.length === 0) {
					return; // User cancelled
				}

				const filePath = filePaths[0];

				// Import ZmaParser
				const { default: ZmaParser } = window.require('@/io/ZmaParser');
				const path = window.require('path');

				// Parse the ZMA file
				const data = ZmaParser.parse(filePath);

				// Generate a unique ID for this external curve
				const curveId = `external-${Date.now()}`;
				const fileName = path.basename(filePath, '.zma');

				// Add to external curves
				this.externalCurves.push({
					id: curveId,
					label: fileName,
					frequencies: data.frequencies,
					values: data.impedances,
					originalValues: [...data.impedances],
					phases: data.phases,
					color: this.generateColor(curveId),
					visible: true,
					smoothing: 'none',
					isPhase: false,
					filePath,
				});

				this.renderGraph();
			} catch (error) {
				console.error('Error loading external ZMA file:', error);
				this.toast.error(`Error loading ZMA file: ${error.message}`);
			}
		},
		applyImpedanceSmoothing() {
			if (!this.originalImpedanceData) return;

			if (this.impedanceSmoothing === 'none') {
				// Restore original data
				if (this.impedanceResponse) {
					this.impedanceResponse.impedances = [...this.originalImpedanceData.impedances];
					this.impedanceResponse.phases = [...this.originalImpedanceData.phases];
				}
			} else {
				// Apply smoothing
				const smoothedImpedances = this.applySmoothing(
					this.originalImpedanceData.frequencies,
					this.originalImpedanceData.impedances,
					this.impedanceSmoothing,
				);
				const smoothedPhases = this.applySmoothing(
					this.originalImpedanceData.frequencies,
					this.originalImpedanceData.phases,
					this.impedanceSmoothing,
				);

				if (this.impedanceResponse) {
					this.impedanceResponse.impedances = smoothedImpedances;
					this.impedanceResponse.phases = smoothedPhases;
				}
			}

			this.updateCurves();
		},
		applySmoothingToCurve(curve) {
			if (curve.smoothing === 'none') {
				// Restore original data - would need to store original per external curve
				return;
			}

			curve.values = this.applySmoothing(
				curve.frequencies,
				curve.originalValues || curve.values,
				curve.smoothing,
			);
			this.renderGraph();
		},
		applySmoothing(frequencies, values, smoothingType) {
			if (smoothingType === 'none' || frequencies.length === 0) {
				return values;
			}

			const smoothed = [];
			const octaveFraction = this.getSmoothingFraction(smoothingType);

			for (let i = 0; i < frequencies.length; i++) {
				const centerFreq = frequencies[i];
				const lowerFreq = centerFreq / (2 ** (octaveFraction / 2));
				const upperFreq = centerFreq * (2 ** (octaveFraction / 2));

				let sum = 0;
				let count = 0;

				for (let j = 0; j < frequencies.length; j++) {
					if (frequencies[j] >= lowerFreq && frequencies[j] <= upperFreq) {
						sum += values[j];
						count++;
					}
				}

				smoothed[i] = count > 0 ? sum / count : values[i];
			}

			return smoothed;
		},
		getSmoothingFraction(smoothingType) {
			const fractions = {
				'1/24': 1 / 24,
				'1/12': 1 / 12,
				'1/6': 1 / 6,
				'1/3': 1 / 3,
				'1/2': 1 / 2,
				1: 1,
				erb: 1 / 3, // ERB approximation (roughly 1/3 octave)
			};
			return fractions[smoothingType] || 0;
		},
		toggleScaleMenu() {
			this.scaleMenuVisible = !this.scaleMenuVisible;
		},
		closeScaleMenu() {
			this.scaleMenuVisible = false;
		},
		resetScaleSettings() {
			this.scaleSettings.minFreq = 20;
			this.scaleSettings.maxFreq = 20000;
			this.scaleSettings.centerValue = 8;
			this.scaleSettings.stepSize = 2;
			this.renderGraph();
		},
		toggleFileMenu() {
			this.fileMenuVisible = !this.fileMenuVisible;
		},
		closeFileMenu() {
			this.fileMenuVisible = false;
		},
		async exportZMA() {
			if (!this.impedanceResponse || !this.impedanceResponse.frequencies) {
				this.toast.warning('No impedance data to export');
				return;
			}

			try {
				// Use Electron's dialog to get save path
				const { dialog } = window.require('electron').remote;
				const { filePath } = await dialog.showSaveDialog({
					title: 'Export Impedance as ZMA',
					defaultPath: 'impedance.zma',
					filters: [
						{ name: 'ZMA Files', extensions: ['zma'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				if (!filePath) {
					return; // User cancelled
				}

				// Import ZmaParser
				const { default: ZmaParser } = window.require('@/io/ZmaParser');

				// Export impedance data
				const { frequencies, impedances, phases } = this.impedanceResponse;

				ZmaParser.export(frequencies, impedances, phases, filePath);

				this.toast.success(`ZMA file exported successfully to ${filePath}`);
			} catch (error) {
				console.error('Error exporting ZMA file:', error);
				this.toast.error(`Error exporting ZMA file: ${error.message}`);
			}

			this.closeFileMenu();
		},
		async exportSnapshotToFile() {
			try {
				// Use Electron's dialog to get save path
				const { dialog } = window.require('electron').remote;
				const { filePath } = await dialog.showSaveDialog({
					title: 'Save Graph Snapshot',
					defaultPath: 'impedance-graph.png',
					filters: [
						{ name: 'PNG Images', extensions: ['png'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				if (!filePath) {
					return; // User cancelled
				}

				// Convert canvas to PNG data
				const dataURL = this.canvas.toDataURL('image/png');
				const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');

				// Write to file using Node.js fs
				const fs = window.require('fs');
				fs.writeFileSync(filePath, base64Data, 'base64');

				this.toast.success(`Graph snapshot saved successfully to ${filePath}`);
			} catch (error) {
				console.error('Error saving graph snapshot:', error);
				this.toast.error(`Error saving graph snapshot: ${error.message}`);
			}

			this.closeFileMenu();
		},
		async exportSnapshotToClipboard() {
			try {
				// Convert canvas to blob
				this.canvas.toBlob((blob) => {
					// Use Electron's clipboard API
					const { clipboard, nativeImage } = window.require('electron');
					const fs = window.require('fs');
					const path = window.require('path');
					const os = window.require('os');

					// Create temporary file
					const tempPath = path.join(os.tmpdir(), 'graph-snapshot.png');

					// Convert blob to buffer and write to temp file
					const reader = new FileReader();
					reader.onload = () => {
						const arrayBuffer = reader.result;
						const buffer = Buffer.from(arrayBuffer);
						fs.writeFileSync(tempPath, buffer);

						// Read as native image and copy to clipboard
						const image = nativeImage.createFromPath(tempPath);
						clipboard.writeImage(image);

						// Clean up temp file
						fs.unlinkSync(tempPath);

						this.toast.success('Graph snapshot copied to clipboard');
					};
					reader.readAsArrayBuffer(blob);
				}, 'image/png');
			} catch (error) {
				console.error('Error copying graph snapshot to clipboard:', error);
				this.toast.error(`Error copying to clipboard: ${error.message}`);
			}

			this.closeFileMenu();
		},
		toggleHold() {
			if (this.holdActive) {
				this.holdActive = false;
				this.heldCurves = null;
			} else {
				this.holdActive = true;
				this.heldCurves = JSON.parse(JSON.stringify(this.curves));
			}
			this.renderGraph();
		},
	},
};
</script>

<style scoped>
.impedance-graph {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background-color: #f5f5f5;
	position: relative;
}

.graph-menu {
	display: flex;
	gap: 4px;
	align-items: center;
	background-color: #ffffff;
	border-bottom: 1px solid #cccccc;
}

.graph-menu button {
	padding: 2px 8px;
	background-color: #ffffff;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
}

.graph-menu button:hover {
	background-color: #f0f0f0;
}

.hold-button {
	position: absolute;
	bottom: 4px;
	right: 4px;
	padding: 2px 8px;
	background-color: #ffffff;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	z-index: 10;
}

.hold-button:hover {
	background-color: #f0f0f0;
}

canvas {
	flex: 1;
	cursor: crosshair;
}

.tooltip {
	position: absolute;
	background-color: rgba(0, 0, 0, 0.8);
	color: #ffffff;
	padding: 8px;
	border-radius: 4px;
	font-size: 12px;
	pointer-events: none;
	z-index: 1000;
}

.tooltip div {
	margin: 2px 0;
}

.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
}

.modal-content {
	background-color: #ffffff;
	border-radius: 8px;
	padding: 20px;
	max-width: 600px;
	max-height: 80vh;
	overflow-y: auto;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	position: relative;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
}

.close-button {
	background: none;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	color: #666666;
	padding: 0 4px;
}

.close-button:hover {
	color: #000000;
	background-color: #f0f0f0;
}

.modal-content h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
}

.modal-content h4 {
	margin-top: 16px;
	margin-bottom: 8px;
	font-size: 14px;
	font-weight: 600;
}

.curves-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.curve-item {
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	padding: 12px;
	background-color: #f9f9f9;
}

.curve-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}

.curve-header label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 500;
}

.curve-header input[type="checkbox"] {
	cursor: pointer;
}

.remove-button {
	padding: 4px 8px;
	background-color: #ffffff;
	border: 1px solid #d32f2f;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
	color: #d32f2f;
}

.remove-button:hover {
	background-color: #ffebee;
}

.curve-controls {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.control-group {
	display: flex;
	align-items: center;
	gap: 8px;
}

.control-group label {
	font-size: 14px;
	min-width: 80px;
}

.control-group input[type="color"] {
	width: 50px;
	height: 30px;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
}

.control-group input[type="checkbox"] {
	cursor: pointer;
}

.control-group select {
	padding: 4px 8px;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
}

.external-curves-section {
	margin-top: 16px;
	padding-top: 16px;
	border-top: 2px solid #e0e0e0;
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid #e0e0e0;
}

.modal-actions button {
	padding: 8px 16px;
	background-color: #ffffff;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
}

.modal-actions button:hover {
	background-color: #f0f0f0;
}

.scale-menu .scale-controls {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.scale-menu .control-group {
	display: flex;
	align-items: center;
	gap: 12px;
}

.scale-menu .control-group label {
	font-size: 14px;
	min-width: 180px;
	font-weight: 500;
}

.scale-menu .control-group input[type="number"] {
	padding: 6px 10px;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 14px;
	width: 120px;
}

.scale-menu .control-group input[type="number"]:focus {
	outline: none;
	border-color: #0066cc;
	box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.file-menu .file-menu-options {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.file-menu .menu-option {
	padding: 10px 16px;
	background-color: #ffffff;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	text-align: left;
	transition: background-color 0.2s;
}

.file-menu .menu-option:hover {
	background-color: #f0f0f0;
}
</style>
