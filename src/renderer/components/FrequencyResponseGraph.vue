<template>
	<div class="frequency-response-graph">
		<div class="graph-menu">
			<button @click="toggleCurvesMenu">
				Curves
			</button>
			<button @click="toggleScaleMenu">
				Scale
			</button>
			<button @click="toggleFileMenu">
				File
			</button>
			<button @click="toggleHold">
				{{ holdActive ? 'Release' : 'Hold' }}
			</button>
			<AngleControl />
		</div>

		<!-- Scale Menu Modal -->
		<div
			v-if="scaleMenuVisible"
			class="modal-overlay"
			@click.self="closeScaleMenu"
		>
			<div class="modal-content scale-menu">
				<h3>Scale Settings</h3>
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
						<label>Vertical Center (dB):</label>
						<input
							v-model.number="scaleSettings.centerValue"
							type="number"
							step="1"
							@change="renderGraph"
						>
					</div>
					<div class="control-group">
						<label>Vertical Step Size (dB):</label>
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
					<button @click="closeScaleMenu">
						Close
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
				<h3>File</h3>
				<div class="file-menu-options">
					<button
						class="menu-option"
						@click="exportFRD"
					>
						Export as FRD File...
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
				<div class="modal-actions">
					<button @click="closeFileMenu">
						Close
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
				<h3>Curves</h3>
				<div class="curves-list">
					<div
						v-for="curve in curves"
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
								class="hide-button"
								@click="hideCurve(curve.id)"
							>
								Hide
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
								<label>
									<input
										v-model="curve.showPhase"
										type="checkbox"
										@change="renderGraph"
									>
									Show Phase
								</label>
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
					<button @click="closeCurvesMenu">
						Close
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
			<div>Magnitude: {{ tooltip.magnitude }} dB</div>
		</div>
	</div>
</template>

<script>
import { mapState } from 'vuex';
import { useToast } from 'vue-toastification';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import simulationResultsSchema from '@/schemas/simulation-results.schema.json';
import AngleControl from './AngleControl.vue';

const ajv = new Ajv();
addFormats(ajv);
const validateSimulationResults = ajv.compile(simulationResultsSchema);

export default {
	name: 'FrequencyResponseGraph',
	components: {
		AngleControl,
	},
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
			scaleSettings: {
				minFreq: 20,
				maxFreq: 20000,
				centerValue: 90,
				stepSize: 5,
			},
			curves: [],
			externalCurves: [],
			curveColors: {},
			tooltip: {
				visible: false,
				frequency: 0,
				magnitude: 0,
				x: 0,
				y: 0,
			},
		};
	},
	computed: {
		...mapState('simulation', ['frequencyResponse', 'currentAngle']),
		tooltipStyle() {
			return {
				left: `${this.tooltip.x + 10}px`,
				top: `${this.tooltip.y + 10}px`,
			};
		},
	},
	watch: {
		frequencyResponse: {
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
			if (!validateSimulationResults(results)) {
				console.error('Received invalid simulation results:', validateSimulationResults.errors);
				return;
			}
			this.$store.commit('simulation/SET_FREQUENCY_RESPONSE', results.frequencyResponse);
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
			this.canvas.width = container.clientWidth;
			this.canvas.height = container.clientHeight - 40; // Account for menu bar
			this.renderGraph();
		},
		updateCurves() {
			if (!this.frequencyResponse) {
				this.curves = [];
				return;
			}

			this.curves = [
				{
					id: 'system',
					label: 'System Response',
					frequencies: this.frequencyResponse.frequencies || [],
					magnitudes: this.frequencyResponse.spl || [],
					originalMagnitudes: [...(this.frequencyResponse.spl || [])],
					color: this.curveColors.system || '#0066cc',
					visible: true,
					showPhase: false,
					smoothing: 'none',
				},
			];

			// Add individual speaker curves if available
			if (this.frequencyResponse.speakerResponses) {
				Object.entries(this.frequencyResponse.speakerResponses).forEach(([id, response]) => {
					this.curves.push({
						id,
						label: response.label || `Speaker ${id}`,
						frequencies: this.frequencyResponse.frequencies || [],
						magnitudes: response.spl || [],
						originalMagnitudes: [...(response.spl || [])],
						color: this.curveColors[id] || this.generateColor(id),
						visible: true,
						showPhase: false,
						smoothing: 'none',
					});
				});
			}
		},
		generateColor(id) {
			const colors = [
				'#ff6b6b',
				'#4ecdc4',
				'#45b7d1',
				'#f9ca24',
				'#6c5ce7',
			];
			const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
			return colors[hash % colors.length];
		},
		renderGraph() {
			if (!this.context) return;

			const { width, height } = this.canvas;
			const margin = {
				top: 20,
				right: 20,
				bottom: 55,
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

			// Draw angle indicator
			this.drawAngleIndicator(width, margin);

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

			// Horizontal grid lines (magnitude)
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

			// X-axis labels (frequency) with solid background
			const freqLabels = this.generateFrequencyLabels();
			this.context.font = '12px sans-serif';
			freqLabels.forEach(({ freq, label }) => {
				const x = this.frequencyToX(freq, margin.left, graphWidth);
				const textX = x - 15;
				const textY = margin.top + graphHeight + 18;
				const textWidth = this.context.measureText(label).width;
				this.context.fillStyle = '#ffffff';
				this.context.fillRect(textX - 2, textY - 12, textWidth + 4, 16);
				this.context.fillStyle = '#000000';
				this.context.fillText(label, textX, textY);
			});

			// Y-axis labels (magnitude) with solid background
			const magLabels = this.generateMagnitudeLabels();
			magLabels.forEach(({ mag, label }) => {
				const y = this.magnitudeToY(mag, margin.top, graphHeight);
				const textX = margin.left - 40;
				const textY = y + 4;
				const textWidth = this.context.measureText(label).width;
				this.context.fillStyle = '#ffffff';
				this.context.fillRect(textX - 2, textY - 12, textWidth + 4, 16);
				this.context.fillStyle = '#000000';
				this.context.fillText(label, textX, textY);
			});

			// Axis titles
			this.context.font = '14px sans-serif';
			this.context.fillStyle = '#000000';
			this.context.textAlign = 'center';
			this.context.fillText('Frequency (Hz)', margin.left + graphWidth / 2, margin.top + graphHeight + 40);
			this.context.textAlign = 'left';
			this.context.save();
			this.context.translate(15, margin.top + graphHeight / 2);
			this.context.rotate(-Math.PI / 2);
			this.context.fillText('Magnitude (dB)', -50, 0);
			this.context.restore();
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
					const mag = curve.magnitudes[i];

					if (freq < this.scaleSettings.minFreq || freq > this.scaleSettings.maxFreq) {
						continue;
					}

					const x = this.frequencyToX(freq, margin.left, graphWidth);
					const y = this.magnitudeToY(mag, margin.top, graphHeight);

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
		drawAngleIndicator(width, margin) {
			// Draw angle indicator in top-right corner
			const angleText = this.currentAngle === 0
				? 'Angle: 0° (On-Axis)'
				: `Angle: ${this.currentAngle}°`;

			this.context.font = '14px sans-serif';
			this.context.fillStyle = '#333333';
			this.context.textAlign = 'right';
			this.context.fillText(angleText, width - margin.right - 10, margin.top + 15);
			this.context.textAlign = 'left'; // Reset text alignment
		},
		frequencyToX(freq, marginLeft, graphWidth) {
			const logMin = Math.log10(this.scaleSettings.minFreq);
			const logMax = Math.log10(this.scaleSettings.maxFreq);
			const logFreq = Math.log10(freq);
			const normalized = (logFreq - logMin) / (logMax - logMin);
			return marginLeft + normalized * graphWidth;
		},
		magnitudeToY(mag, marginTop, graphHeight) {
			const range = this.scaleSettings.stepSize * 10;
			const minMag = this.scaleSettings.centerValue - range / 2;
			const maxMag = this.scaleSettings.centerValue + range / 2;
			const normalized = (maxMag - mag) / (maxMag - minMag);
			return marginTop + normalized * graphHeight;
		},
		xToFrequency(x, marginLeft, graphWidth) {
			const normalized = (x - marginLeft) / graphWidth;
			const logMin = Math.log10(this.scaleSettings.minFreq);
			const logMax = Math.log10(this.scaleSettings.maxFreq);
			const logFreq = logMin + normalized * (logMax - logMin);
			return 10 ** logFreq;
		},
		yToMagnitude(y, marginTop, graphHeight) {
			const normalized = (y - marginTop) / graphHeight;
			const range = this.scaleSettings.stepSize * 10;
			const minMag = this.scaleSettings.centerValue - range / 2;
			const maxMag = this.scaleSettings.centerValue + range / 2;
			return maxMag - normalized * (maxMag - minMag);
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
		generateMagnitudeLabels() {
			const labels = [];
			const range = this.scaleSettings.stepSize * 10;
			const minMag = this.scaleSettings.centerValue - range / 2;
			const maxMag = this.scaleSettings.centerValue + range / 2;

			for (let mag = minMag; mag <= maxMag; mag += this.scaleSettings.stepSize) {
				labels.push({
					mag,
					label: `${mag.toFixed(0)}`,
				});
			}

			return labels;
		},
		handleMouseMove(event) {
			const rect = this.canvas.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;

			const margin = {
				top: 20,
				right: 20,
				bottom: 55,
				left: 60,
			};
			const graphWidth = this.canvas.width - margin.left - margin.right;
			const graphHeight = this.canvas.height - margin.top - margin.bottom;

			if (x >= margin.left
				&& x <= margin.left + graphWidth
				&& y >= margin.top
				&& y <= margin.top + graphHeight) {
				const freq = this.xToFrequency(x, margin.left, graphWidth);
				const mag = this.yToMagnitude(y, margin.top, graphHeight);

				this.tooltip.visible = true;
				this.tooltip.frequency = freq.toFixed(1);
				this.tooltip.magnitude = mag.toFixed(2);
				this.tooltip.x = event.clientX - rect.left;
				this.tooltip.y = event.clientY - rect.top;
			} else {
				this.tooltip.visible = false;
			}
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
		hideCurve(curveId) {
			const curve = this.curves.find((c) => c.id === curveId);
			if (curve) {
				curve.visible = false;
				this.renderGraph();
			}
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
				// Use Electron's dialog to select FRD file
				const { dialog } = window.require('electron').remote;
				const { filePaths } = await dialog.showOpenDialog({
					title: 'Load External FRD File',
					filters: [
						{ name: 'FRD Files', extensions: ['frd'] },
						{ name: 'All Files', extensions: ['*'] },
					],
					properties: ['openFile'],
				});

				if (!filePaths || filePaths.length === 0) {
					return; // User cancelled
				}

				const filePath = filePaths[0];

				// Import FrdParser
				const { default: FrdParser } = window.require('@/io/FrdParser');
				const path = window.require('path');

				// Parse the FRD file
				const data = FrdParser.parse(filePath);

				// Generate a unique ID for this external curve
				const curveId = `external-${Date.now()}`;
				const fileName = path.basename(filePath, '.frd');

				// Add to external curves
				this.externalCurves.push({
					id: curveId,
					label: fileName,
					frequencies: data.frequencies,
					magnitudes: data.magnitudes,
					originalMagnitudes: [...data.magnitudes],
					phases: data.phases,
					color: this.generateColor(curveId),
					visible: true,
					smoothing: 'none',
					filePath,
				});

				this.renderGraph();
			} catch (error) {
				console.error('Error loading external FRD file:', error);
				this.toast.error(`Error loading FRD file: ${error.message}`);
			}
		},
		applySmoothingToCurve(curve) {
			if (curve.smoothing === 'none') {
				curve.magnitudes = [...curve.originalMagnitudes];
			} else {
				curve.magnitudes = this.applySmoothing(
					curve.frequencies,
					curve.originalMagnitudes,
					curve.smoothing,
				);
			}
			this.renderGraph();
		},
		applySmoothing(frequencies, magnitudes, smoothingType) {
			if (smoothingType === 'none' || frequencies.length === 0) {
				return magnitudes;
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
						sum += magnitudes[j];
						count++;
					}
				}

				smoothed[i] = count > 0 ? sum / count : magnitudes[i];
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
			this.scaleSettings.centerValue = 90;
			this.scaleSettings.stepSize = 5;
			this.renderGraph();
		},
		toggleFileMenu() {
			this.fileMenuVisible = !this.fileMenuVisible;
		},
		closeFileMenu() {
			this.fileMenuVisible = false;
		},
		async exportFRD() {
			if (!this.frequencyResponse || !this.frequencyResponse.frequencies) {
				this.toast.warning('No frequency response data to export');
				return;
			}

			try {
				// Use Electron's dialog to get save path
				const { dialog } = window.require('electron').remote;
				const { filePath } = await dialog.showSaveDialog({
					title: 'Export Frequency Response as FRD',
					defaultPath: 'frequency-response.frd',
					filters: [
						{ name: 'FRD Files', extensions: ['frd'] },
						{ name: 'All Files', extensions: ['*'] },
					],
				});

				if (!filePath) {
					return; // User cancelled
				}

				// Import FrdParser
				const { default: FrdParser } = window.require('@/io/FrdParser');

				// Export system response
				const { frequencies } = this.frequencyResponse;
				const { spl: magnitudes } = this.frequencyResponse;
				const phases = this.frequencyResponse.phase || new Array(frequencies.length).fill(0);

				FrdParser.export(frequencies, magnitudes, phases, filePath);

				this.toast.success(`FRD file exported successfully to ${filePath}`);
			} catch (error) {
				console.error('Error exporting FRD file:', error);
				this.toast.error(`Error exporting FRD file: ${error.message}`);
			}

			this.closeFileMenu();
		},
		async exportSnapshotToFile() {
			try {
				// Use Electron's dialog to get save path
				const { dialog } = window.require('electron').remote;
				const { filePath } = await dialog.showSaveDialog({
					title: 'Save Graph Snapshot',
					defaultPath: 'frequency-response.png',
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
.frequency-response-graph {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background-color: #f5f5f5;
	position: relative;
}

.graph-menu {
	display: flex;
	gap: 8px;
	padding: 8px;
	background-color: #ffffff;
	border-bottom: 1px solid #cccccc;
}

.graph-menu button {
	padding: 6px 12px;
	background-color: #ffffff;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
}

.graph-menu button:hover {
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
}

.modal-content h3 {
	margin-top: 0;
	margin-bottom: 16px;
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

.hide-button,
.remove-button {
	padding: 4px 8px;
	background-color: #ffffff;
	border: 1px solid #cccccc;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
}

.hide-button:hover,
.remove-button:hover {
	background-color: #f0f0f0;
}

.remove-button {
	color: #d32f2f;
	border-color: #d32f2f;
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
