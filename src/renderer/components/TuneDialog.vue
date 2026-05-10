<template>
	<div
		v-if="visible"
		class="tune-dialog-overlay"
		@click.self="close"
	>
		<div class="tune-dialog">
			<div class="dialog-header">
				<h3>Tune {{ component ? component.label : '' }}</h3>
				<button
					class="close-x-button"
					@click="close"
				>
					×
				</button>
			</div>

			<!-- Passive component parameters (Resistor, Capacitor, Inductor) -->
			<div
				v-if="isPassiveComponent"
				class="parameter-section"
			>
				<div class="parameter-row">
					<label>Value:</label>
					<input
						v-model="valueInput"
						type="text"
						class="value-input"
						@input="handleValueInput"
						@blur="parseValueInput"
					>
					<div class="increment-buttons">
						<button
							class="increment-button"
							@mousedown="startIncrement(1)"
							@mouseup="stopIncrement"
							@mouseleave="stopIncrement"
						>
							▲
						</button>
						<button
							class="increment-button"
							@mousedown="startIncrement(-1)"
							@mouseup="stopIncrement"
							@mouseleave="stopIncrement"
						>
							▼
						</button>
					</div>
				</div>

				<div class="parameter-row">
					<label>Tolerance (%):</label>
					<input
						v-model.number="localParameters.tolerance"
						type="number"
						min="0"
						max="100"
						step="1"
					>
				</div>

				<div
					v-if="hasESR"
					class="parameter-row"
				>
					<label>ESR (Ω):</label>
					<input
						v-model.number="localParameters.esr"
						type="number"
						min="0"
						step="0.01"
					>
				</div>

				<div class="parameter-row">
					<label>State:</label>
					<select v-model="localParameters.state">
						<option value="normal">
							Normal
						</option>
						<option value="open">
							Open
						</option>
						<option value="short">
							Short
						</option>
					</select>
				</div>
			</div>

			<!-- Speaker parameters -->
			<div
				v-if="component && component.type === 'speaker'"
				class="parameter-section"
			>
				<div class="parameter-row">
					<label>Name:</label>
					<input
						v-model="localParameters.name"
						type="text"
					>
				</div>

				<div class="parameter-row">
					<label>Sensitivity (dB):</label>
					<input
						v-model.number="localParameters.sensitivity"
						type="number"
						step="0.25"
					>
				</div>

				<div class="parameter-row">
					<label>Delay:</label>
					<input
						:value="delayDisplayValue"
						type="number"
						min="0"
						step="0.01"
						@input="setDelayFromDisplay($event.target.value)"
					>
					<select
						v-model="localParameters.delayUnit"
						class="delay-unit-select"
					>
						<option value="in">
							in
						</option>
						<option value="cm">
							cm
						</option>
						<option value="ms">
							ms
						</option>
					</select>
				</div>

				<div class="parameter-row">
					<label>
						<input
							v-model="localParameters.inverted"
							type="checkbox"
						>
						Invert Polarity
					</label>
				</div>

				<div class="parameter-row">
					<label>
						<input
							v-model="localParameters.muted"
							type="checkbox"
						>
						Mute
					</label>
				</div>

				<div class="parameter-row">
					<label>FRD File:</label>
					<button @click="selectFrdFile">
						Choose File
					</button>
					<span class="file-path">{{ localParameters.frdFile || 'None' }}</span>
				</div>

				<div
					v-if="localParameters.frdFile"
					class="parameter-row"
				>
					<label>FRD phase source:</label>
					<div class="radio-group">
						<label>
							<input
								v-model="localParameters.frdPhaseSource"
								type="radio"
								value="measured"
							>
							As Measured
						</label>
						<label>
							<input
								v-model="localParameters.frdPhaseSource"
								type="radio"
								value="derived"
							>
							Derived (Minimum Phase)
						</label>
					</div>
				</div>

				<div class="parameter-row">
					<label>ZMA File:</label>
					<button @click="selectZmaFile">
						Choose File
					</button>
					<span class="file-path">{{ localParameters.zmaFile || 'None' }}</span>
				</div>

				<div
					v-if="localParameters.zmaFile"
					class="parameter-row"
				>
					<label>ZMA phase source:</label>
					<div class="radio-group">
						<label>
							<input
								v-model="localParameters.zmaPhaseSource"
								type="radio"
								value="measured"
							>
							As Measured
						</label>
						<label>
							<input
								v-model="localParameters.zmaPhaseSource"
								type="radio"
								value="derived"
							>
							Derived (Minimum Phase)
						</label>
					</div>
				</div>

				<div class="off-axis-section">
					<h4>Off-Axis Measurements</h4>
					<div
						v-for="(offAxis, index) in localParameters.offAxisFiles"
						:key="index"
						class="off-axis-row"
					>
						<input
							v-model.number="offAxis.angle"
							type="number"
							min="0"
							max="180"
							step="1"
							class="angle-input"
						>
						<span>°</span>
						<button @click="selectOffAxisFile(index)">
							Choose File
						</button>
						<span class="file-path">{{ offAxis.frdPath }}</span>
						<button
							class="remove-button"
							@click="removeOffAxisFile(index)"
						>
							Remove
						</button>
						<div
							v-if="offAxis.frdPath"
							class="radio-group"
						>
							<label>
								<input
									v-model="offAxis.phaseSource"
									type="radio"
									value="measured"
								>
								As Measured
							</label>
							<label>
								<input
									v-model="offAxis.phaseSource"
									type="radio"
									value="derived"
								>
								Derived (Minimum Phase)
							</label>
						</div>
					</div>
					<button
						class="add-button"
						@click="addOffAxisFile"
					>
						Add Off-Axis File
					</button>
				</div>
			</div>

			<!-- Voltage source parameters -->
			<div
				v-if="component && component.type === 'source'"
				class="parameter-section"
			>
				<div class="parameter-row">
					<label>Power (W):</label>
					<input
						v-model.number="localParameters.power"
						type="number"
						min="0"
						step="0.1"
					>
					<span class="at-label">at</span>
					<label>Impedance (Ω):</label>
					<input
						v-model.number="localParameters.impedance"
						type="number"
						min="0"
						step="0.1"
					>
					<button
						class="std-button"
						@click="resetToStandard"
					>
						Std
					</button>
				</div>

				<div class="parameter-row">
					<label>Delay (ms):</label>
					<input
						:value="localParameters.delay * 1000"
						type="number"
						min="0"
						step="0.01"
						@input="localParameters.delay = $event.target.value / 1000"
					>
				</div>

				<div class="parameter-row">
					<label>
						<input
							v-model="localParameters.inverted"
							type="checkbox"
						>
						Invert Polarity
					</label>
				</div>
			</div>

			<!-- PEQ parameters -->
			<div
				v-if="component && component.type === 'peq'"
				class="parameter-section"
			>
				<div class="parameter-row">
					<label>Global Gain (dB):</label>
					<input
						v-model.number="localParameters.gain"
						type="number"
						step="0.5"
					>
				</div>

				<div class="parameter-row">
					<label>Delay (s):</label>
					<input
						v-model.number="localParameters.delay"
						type="number"
						min="0"
						step="0.001"
					>
				</div>

				<div class="parameter-row">
					<label>DSP Rate (sps):</label>
					<input
						list="dsp-rate-options"
						type="number"
						min="1"
						:value="localParameters.dspRate"
						@input="localParameters.dspRate = Number($event.target.value)"
					>
					<datalist id="dsp-rate-options">
						<option value="48000">
							48000
						</option>
						<option value="96000">
							96000
						</option>
						<option value="192000">
							192000
						</option>
					</datalist>
				</div>

				<div class="parameter-row">
					<label>
						<input
							v-model="localParameters.muted"
							type="checkbox"
						>
						Muted
					</label>
				</div>

				<div class="peq-sections">
					<h4>Filter Sections</h4>
					<div
						v-for="(section, index) in localParameters.sections"
						:key="index"
						class="peq-section-row"
					>
						<span class="section-number">{{ index + 1 }}.</span>

						<select
							v-model="section.filterType"
							class="filter-type-select"
							@change="emitPeqUpdate"
						>
							<option value="peaking">
								PEQ
							</option>
							<option value="highShelf">
								High Shelf
							</option>
							<option value="lowShelf">
								Low Shelf
							</option>
							<option value="lowPass1">
								LP 1pole
							</option>
							<option value="highPass1">
								HP 1pole
							</option>
							<option value="lowPass2">
								LP 2pole
							</option>
							<option value="highPass2">
								HP 2pole
							</option>
							<option value="allPass">
								All-pass
							</option>
						</select>

						<label class="inline-label">Freq:</label>
						<input
							v-model.number="section.frequency"
							type="number"
							min="1"
							step="1"
							class="freq-input"
							@input="emitPeqUpdate"
						>
						<span class="unit-label">Hz</span>

						<span
							v-if="section.frequency > localParameters.dspRate / 2"
							class="nyquist-warning"
							title="Frequency exceeds Nyquist (dspRate / 2)"
						>⚠</span>

						<label class="inline-label">Q:</label>
						<input
							v-model.number="section.q"
							type="number"
							min="0.01"
							step="0.01"
							class="q-input"
							@input="emitPeqUpdate"
						>

						<template v-if="sectionHasGain(section.filterType)">
							<label class="inline-label">Gain:</label>
							<input
								v-model.number="section.gain"
								type="number"
								step="0.5"
								class="section-gain-input"
								@input="emitPeqUpdate"
							>
							<span class="unit-label">dB</span>
						</template>

						<label class="inline-label bypass-label">
							<input
								v-model="section.bypass"
								type="checkbox"
								@change="emitPeqUpdate"
							>
							Bypass
						</label>

						<button
							class="remove-button"
							:disabled="localParameters.sections.length <= 1"
							@click="removePeqSection(index)"
						>
							Remove
						</button>
					</div>
				</div>

				<div class="peq-actions">
					<button
						class="add-button"
						:disabled="localParameters.sections.length >= 10"
						@click="addPeqSection"
					>
						Add Section
					</button>
					<button
						class="export-biquad-button"
						@click="openBiquadExport"
					>
						View/Export BiQuads
					</button>
				</div>
			</div>

			<!-- Filter parameters -->
			<div
				v-if="component && component.type === 'filter'"
				class="parameter-section"
			>
				<div class="parameter-row">
					<label>Filter Shape:</label>
					<select
						v-model="localParameters.filterShape"
						@change="handleFilterShapeChange"
					>
						<option value="butterworth">
							Butterworth
						</option>
						<option value="linkwitzRiley">
							Linkwitz-Riley
						</option>
						<option value="bessel">
							Bessel
						</option>
					</select>
				</div>

				<div class="parameter-row">
					<label>Filter Type:</label>
					<select
						v-model="localParameters.filterType"
						@change="emitFilterUpdate"
					>
						<option value="lowPass">
							Low Pass
						</option>
						<option value="highPass">
							High Pass
						</option>
						<option value="bandpass">
							Bandpass
						</option>
					</select>
				</div>

				<div class="parameter-row">
					<label>Order:</label>
					<input
						v-model.number="localParameters.filterOrder"
						type="number"
						min="1"
						max="40"
						:step="localParameters.filterShape === 'linkwitzRiley' ? 2 : 1"
						@input="handleFilterOrderInput"
					>
				</div>

				<div class="parameter-row">
					<label>Turn Frequency:</label>
					<input
						v-model="filterFrequencyInput"
						type="text"
						class="value-input"
						@blur="parseFilterFrequencyInput"
						@keyup.enter="parseFilterFrequencyInput"
					>
					<span class="unit-label">Hz</span>
					<span
						v-if="localParameters.turnFrequency > filterNyquist"
						class="nyquist-warning"
						title="Frequency exceeds Nyquist (dspRate / 2)"
					>⚠</span>
				</div>

				<div class="parameter-row">
					<label>Gain (dB):</label>
					<input
						v-model.number="localParameters.gain"
						type="number"
						step="0.5"
						@input="emitFilterUpdate"
					>
				</div>

				<div class="parameter-row">
					<label>Delay (s):</label>
					<input
						v-model.number="localParameters.delay"
						type="number"
						min="0"
						step="0.001"
						@input="emitFilterUpdate"
					>
				</div>

				<div class="parameter-row">
					<label>
						<input
							v-model="localParameters.muted"
							type="checkbox"
							@change="emitFilterUpdate"
						>
						Muted
					</label>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { parseEngineering, formatEngineering } from '@/utils/engineeringNotation';
import { stepE24 } from '@/utils/standardValues';

export default {
	name: 'TuneDialog',
	props: {
		component: {
			type: Object,
			default: null,
		},
		visible: {
			type: Boolean,
			default: false,
		},
	},
	emits: ['close', 'update', 'open-biquad-export'],
	data() {
		return {
			localParameters: {},
			valueInput: '',
			filterFrequencyInput: '',
			incrementInterval: null,
			incrementTimeout: null,
			undoValue: null,
			initializing: false,
		};
	},
	computed: {
		isPassiveComponent() {
			if (!this.component) return false;
			return ['resistor', 'capacitor', 'inductor'].includes(this.component.type);
		},
		hasESR() {
			if (!this.component) return false;
			return ['capacitor', 'inductor'].includes(this.component.type);
		},
		valueParameterName() {
			if (!this.component) return null;
			switch (this.component.type) {
				case 'resistor':
					return 'resistance';
				case 'capacitor':
					return 'capacitance';
				case 'inductor':
					return 'inductance';
				default:
					return null;
			}
		},
		delayDisplayValue() {
			const delaySec = this.localParameters.delay || 0;
			const unit = this.localParameters.delayUnit || 'in';
			switch (unit) {
				case 'in':
					return +(delaySec * 13504).toFixed(4);
				case 'cm':
					return +(delaySec * 34300).toFixed(4);
				case 'ms':
					return +(delaySec * 1000).toFixed(4);
				default:
					return +(delaySec * 13504).toFixed(4);
			}
		},
		filterNyquist() {
			const dspRate = this.localParameters.dspRate || 48000;
			return dspRate / 2;
		},
	},
	watch: {
		component: {
			immediate: true,
			handler(newComponent) {
				if (newComponent) {
					this.initializeParameters();
				}
			},
		},
		'component.parameters': {
			deep: true,
			handler(newParameters) {
				if (!newParameters || this.initializing) return;
				// Sync local parameters when the component is updated externally (e.g., undo)
				this.initializing = true;
				this.localParameters = JSON.parse(JSON.stringify(newParameters));
				if (this.isPassiveComponent && this.valueParameterName) {
					this.valueInput = formatEngineering(this.localParameters[this.valueParameterName]);
				}
				this.$nextTick(() => {
					this.initializing = false;
				});
			},
		},
		visible(newVisible) {
			if (newVisible && this.component) {
				this.initializeParameters();
			}
		},
		'localParameters.inverted': function inverted() {
			this.emitUpdate();
		},
		'localParameters.muted': function muted() {
			this.emitUpdate();
		},
		'localParameters.sensitivity': function sensitivity() {
			this.emitUpdate();
		},
		'localParameters.delay': function delay() {
			this.emitUpdate();
		},
		'localParameters.frdPhaseSource': function frdPhaseSource() {
			this.emitUpdate();
		},
		'localParameters.zmaPhaseSource': function zmaPhaseSource() {
			this.emitUpdate();
		},
		'localParameters.offAxisFiles': {
			deep: true,
			handler() {
				this.emitUpdate();
			},
		},
		'localParameters.gain': function peqGain() {
			if (this.component && this.component.type === 'peq') {
				this.emitUpdate();
			}
		},
		'localParameters.dspRate': function peqDspRate() {
			if (this.component && this.component.type === 'peq') {
				this.emitUpdate();
			}
		},
		'localParameters.sections': {
			deep: true,
			handler() {
				if (this.component && this.component.type === 'peq') {
					this.emitUpdate();
				}
			},
		},
		'localParameters.filterShape': function filterShape() {
			if (this.component && this.component.type === 'filter') {
				this.emitUpdate();
			}
		},
		'localParameters.filterType': function filterType() {
			if (this.component && this.component.type === 'filter') {
				this.emitUpdate();
			}
		},
		'localParameters.filterOrder': function filterOrder() {
			if (this.component && this.component.type === 'filter') {
				this.emitUpdate();
			}
		},
		'localParameters.turnFrequency': function turnFrequency() {
			if (this.component && this.component.type === 'filter') {
				this.emitUpdate();
			}
		},
	},
	methods: {
		setDelayFromDisplay(displayValue) {
			const value = parseFloat(displayValue) || 0;
			const unit = this.localParameters.delayUnit || 'in';
			switch (unit) {
				case 'in':
					this.localParameters.delay = value / 13504;
					break;
				case 'cm':
					this.localParameters.delay = value / 34300;
					break;
				case 'ms':
					this.localParameters.delay = value / 1000;
					break;
				default:
					this.localParameters.delay = value / 13504;
			}
		},
		initializeParameters() {
			if (!this.component) return;

			this.initializing = true;

			// Deep clone the parameters
			this.localParameters = JSON.parse(JSON.stringify(this.component.parameters));

			// Initialize value input for passive components
			if (this.isPassiveComponent && this.valueParameterName) {
				const value = this.localParameters[this.valueParameterName];
				this.valueInput = formatEngineering(value);
			}

			// Initialize filter frequency input
			if (this.component.type === 'filter' && this.localParameters.turnFrequency) {
				this.filterFrequencyInput = formatEngineering(this.localParameters.turnFrequency);
			}

			this.$nextTick(() => {
				this.initializing = false;
			});
		},
		handleValueInput() {
			// Allow user to type freely without immediate parsing
			// Parsing happens on blur or when using increment buttons
		},
		parseValueInput() {
			if (!this.isPassiveComponent || !this.valueParameterName) return;

			try {
				const parsedValue = parseEngineering(this.valueInput);
				if (parsedValue > 0) {
					this.localParameters[this.valueParameterName] = parsedValue;
				} else {
					// Revert to previous value if invalid
					this.valueInput = formatEngineering(this.localParameters[this.valueParameterName]);
				}
			} catch (error) {
				// Revert to previous value if parsing fails
				this.valueInput = formatEngineering(this.localParameters[this.valueParameterName]);
			}
		},
		startIncrement(direction) {
			if (!this.isPassiveComponent || !this.valueParameterName) return;
			console.log('[TUNE] startIncrement', direction);

			// Parse current value first
			this.parseValueInput();

			// Store the initial value for undo
			this.undoValue = this.localParameters[this.valueParameterName];

			// Perform first increment immediately
			this.incrementValue(direction);

			// Set up repeated increments after a delay
			this.incrementTimeout = setTimeout(() => {
				this.incrementInterval = setInterval(() => {
					this.incrementValue(direction);
				}, 100); // Repeat every 100ms
			}, 500); // Start repeating after 500ms hold
		},
		stopIncrement() {
			// Clear timers
			if (this.incrementTimeout) {
				clearTimeout(this.incrementTimeout);
				this.incrementTimeout = null;
			}
			if (this.incrementInterval) {
				clearInterval(this.incrementInterval);
				this.incrementInterval = null;
			}

			// Reset undo value
			this.undoValue = null;
		},
		incrementValue(direction) {
			if (!this.isPassiveComponent || !this.valueParameterName) return;

			const currentValue = this.localParameters[this.valueParameterName];

			// Use E24 series for stepping
			const newValue = stepE24(currentValue, direction);
			console.log('[TUNE] incrementValue', direction, currentValue, '->', newValue);

			this.localParameters[this.valueParameterName] = newValue;
			this.valueInput = formatEngineering(newValue);

			// Emit update so the simulation refreshes immediately
			console.log('[TUNE] emitting update');
			this.$emit('update', {
				componentId: this.component.id,
				parameters: this.localParameters,
			});
		},
		async selectFrdFile() {
			const { ipcRenderer } = require('electron');
			const filePath = await ipcRenderer.invoke('show-frd-file-dialog');
			if (filePath) {
				this.localParameters.frdFile = filePath;
			}
		},
		async selectZmaFile() {
			const { ipcRenderer } = require('electron');
			const filePath = await ipcRenderer.invoke('show-zma-file-dialog');
			if (filePath) {
				this.localParameters.zmaFile = filePath;
			}
		},
		async selectOffAxisFile(index) {
			const { ipcRenderer } = require('electron');
			const filePath = await ipcRenderer.invoke('show-frd-file-dialog');
			if (filePath) {
				this.localParameters.offAxisFiles[index].frdPath = filePath;
			}
		},
		addOffAxisFile() {
			if (!this.localParameters.offAxisFiles) {
				this.localParameters.offAxisFiles = [];
			}
			this.localParameters.offAxisFiles.push({
				angle: 0,
				frdPath: '',
				phaseSource: 'measured',
			});
		},
		removeOffAxisFile(index) {
			this.localParameters.offAxisFiles.splice(index, 1);
		},
		resetToStandard() {
			// Reset voltage source to standard values: 1W at 8Ω
			this.localParameters.power = 1.0;
			this.localParameters.impedance = 8.0;
			this.emitUpdate();
		},
		sectionHasGain(filterType) {
			return ['peaking', 'highShelf', 'lowShelf'].includes(filterType);
		},
		addPeqSection() {
			if (!this.localParameters.sections) return;
			if (this.localParameters.sections.length >= 10) return;
			this.localParameters.sections.push({
				filterType: 'peaking',
				frequency: 1000,
				q: 0.707,
				gain: 0,
				bypass: false,
			});
			this.emitUpdate();
		},
		removePeqSection(index) {
			if (!this.localParameters.sections) return;
			if (this.localParameters.sections.length <= 1) return;
			this.localParameters.sections.splice(index, 1);
			this.emitUpdate();
		},
		emitPeqUpdate() {
			this.emitUpdate();
		},
		handleFilterShapeChange() {
			// When switching to Linkwitz-Riley, enforce even order
			if (this.localParameters.filterShape === 'linkwitzRiley') {
				if (this.localParameters.filterOrder % 2 !== 0) {
					this.localParameters.filterOrder += 1;
				}
			}
			this.emitUpdate();
		},
		handleFilterOrderInput() {
			// Enforce even order for Linkwitz-Riley
			if (this.localParameters.filterShape === 'linkwitzRiley') {
				if (this.localParameters.filterOrder % 2 !== 0) {
					this.localParameters.filterOrder = Math.min(40, this.localParameters.filterOrder + 1);
				}
			}
			// Clamp to valid range
			if (this.localParameters.filterOrder < 1) {
				this.localParameters.filterOrder = 1;
			}
			if (this.localParameters.filterOrder > 40) {
				this.localParameters.filterOrder = 40;
			}
			this.emitUpdate();
		},
		parseFilterFrequencyInput() {
			try {
				const parsedValue = parseEngineering(this.filterFrequencyInput);
				if (parsedValue > 0) {
					this.localParameters.turnFrequency = parsedValue;
					this.filterFrequencyInput = formatEngineering(parsedValue);
				} else {
					// Revert to previous value if invalid
					this.filterFrequencyInput = formatEngineering(this.localParameters.turnFrequency);
				}
			} catch (error) {
				// Revert to previous value if parsing fails
				this.filterFrequencyInput = formatEngineering(this.localParameters.turnFrequency);
			}
		},
		emitFilterUpdate() {
			this.emitUpdate();
		},
		openBiquadExport() {
			this.$emit('open-biquad-export', {
				componentId: this.component.id,
				parameters: this.localParameters,
			});
		},
		emitUpdate() {
			if (!this.component || this.initializing) return;
			this.$emit('update', {
				componentId: this.component.id,
				parameters: this.localParameters,
			});
		},
		close() {
			// Apply changes before closing
			if (this.component) {
				// Parse value input one last time for passive components
				if (this.isPassiveComponent) {
					this.parseValueInput();
				}

				// Emit update event with the modified parameters
				this.$emit('update', {
					componentId: this.component.id,
					parameters: this.localParameters,
				});
			}

			// Emit close event
			this.$emit('close');
		},
	},
};
</script>

<style scoped>
.tune-dialog-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.tune-dialog {
	background-color: white;
	border-radius: 8px;
	padding: 20px;
	min-width: 500px;
	max-width: 700px;
	max-height: 80vh;
	overflow-y: auto;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tune-dialog h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
}

.dialog-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.close-x-button {
	background: none;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	color: #666666;
	padding: 0 4px;
}

.close-x-button:hover {
	color: #000000;
	background-color: #f0f0f0;
}

.parameter-section {
	margin-bottom: 20px;
}

.parameter-row {
	display: flex;
	align-items: center;
	margin-bottom: 12px;
	gap: 8px;
}

.parameter-row label {
	min-width: 120px;
	font-weight: 500;
}

.parameter-row input[type="text"],
.parameter-row input[type="number"],
.parameter-row select {
	flex: 1;
	padding: 6px 10px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
}

.parameter-row input[type="checkbox"] {
	margin-right: 8px;
}

.value-input {
	max-width: 150px;
}

.increment-button {
	padding: 2px 12px;
	border: 1px solid #ccc;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 10px;
	user-select: none;
	line-height: 1;
}

.increment-button:first-child {
	border-radius: 4px 4px 0 0;
	border-bottom: none;
}

.increment-button:last-child {
	border-radius: 0 0 4px 4px;
}

.increment-buttons {
	display: flex;
	flex-direction: column;
}

.increment-button:hover {
	background-color: #e0e0e0;
}

.increment-button:active {
	background-color: #d0d0d0;
}

.at-label {
	margin: 0 8px;
	font-weight: 500;
}

.std-button {
	padding: 6px 16px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 14px;
}

.std-button:hover {
	background-color: #e0e0e0;
}

.radio-group {
	display: flex;
	gap: 16px;
}

.radio-group label {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: auto;
}

.file-path {
	flex: 1;
	font-size: 12px;
	color: #666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.off-axis-section {
	margin-top: 20px;
	padding-top: 20px;
	border-top: 1px solid #e0e0e0;
}

.off-axis-section h4 {
	margin-top: 0;
	margin-bottom: 12px;
	font-size: 14px;
	font-weight: 600;
}

.off-axis-row {
	display: flex;
	align-items: center;
	margin-bottom: 8px;
	gap: 8px;
}

.angle-input {
	width: 80px;
	padding: 4px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 14px;
}

.add-button,
.remove-button {
	padding: 4px 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 12px;
}

.add-button:hover,
.remove-button:hover {
	background-color: #e0e0e0;
}

.remove-button {
	background-color: #ffe0e0;
	border-color: #ffcccc;
}

.remove-button:hover {
	background-color: #ffcccc;
}

.peq-sections {
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid #e0e0e0;
}

.peq-sections h4 {
	margin-top: 0;
	margin-bottom: 12px;
	font-size: 14px;
	font-weight: 600;
}

.peq-section-row {
	display: flex;
	align-items: center;
	margin-bottom: 8px;
	gap: 6px;
	flex-wrap: wrap;
}

.section-number {
	font-weight: 600;
	min-width: 20px;
}

.filter-type-select {
	padding: 4px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 13px;
}

.freq-input {
	width: 80px;
	padding: 4px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 13px;
}

.q-input {
	width: 60px;
	padding: 4px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 13px;
}

.section-gain-input {
	width: 60px;
	padding: 4px 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-size: 13px;
}

.inline-label {
	font-size: 13px;
	font-weight: 500;
	min-width: auto;
}

.unit-label {
	font-size: 12px;
	color: #666;
}

.bypass-label {
	display: flex;
	align-items: center;
	gap: 4px;
}

.nyquist-warning {
	color: #e67e00;
	font-size: 16px;
	cursor: help;
}

.peq-actions {
	display: flex;
	gap: 8px;
	margin-top: 12px;
}

.export-biquad-button {
	padding: 6px 14px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 13px;
}

.export-biquad-button:hover {
	background-color: #e0e0e0;
}

.remove-button:disabled,
.add-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
