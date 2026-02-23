<template>
	<div
		v-if="visible"
		class="tune-dialog-overlay"
		@click.self="close"
	>
		<div class="tune-dialog">
			<h3>Tune {{ component ? component.label : '' }}</h3>

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
					<label>Delay (ms):</label>
					<input
						v-model.number="localParameters.delay"
						type="number"
						min="0"
						step="0.01"
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

				<div class="parameter-row">
					<label>ZMA File:</label>
					<button @click="selectZmaFile">
						Choose File
					</button>
					<span class="file-path">{{ localParameters.zmaFile || 'None' }}</span>
				</div>

				<div class="parameter-row">
					<label>Phase Source:</label>
					<div class="radio-group">
						<label>
							<input
								v-model="localParameters.phaseSource"
								type="radio"
								value="measured"
							>
							As Measured
						</label>
						<label>
							<input
								v-model="localParameters.phaseSource"
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
						v-model.number="localParameters.delay"
						type="number"
						min="0"
						step="0.01"
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

			<div class="dialog-actions">
				<button
					class="close-button"
					@click="close"
				>
					Close
				</button>
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
	emits: ['close', 'update'],
	data() {
		return {
			localParameters: {},
			valueInput: '',
			incrementInterval: null,
			incrementTimeout: null,
			undoValue: null,
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
		visible(newVisible) {
			if (newVisible && this.component) {
				this.initializeParameters();
			}
		},
	},
	methods: {
		initializeParameters() {
			if (!this.component) return;

			// Deep clone the parameters
			this.localParameters = JSON.parse(JSON.stringify(this.component.parameters));

			// Initialize value input for passive components
			if (this.isPassiveComponent && this.valueParameterName) {
				const value = this.localParameters[this.valueParameterName];
				this.valueInput = formatEngineering(value);
			}
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

			this.localParameters[this.valueParameterName] = newValue;
			this.valueInput = formatEngineering(newValue);
		},
		selectFrdFile() {
			// This will be implemented with Electron IPC for file dialog
			// For now, just a placeholder
			console.log('Select FRD file');
			// TODO: Implement file dialog via Electron IPC
		},
		selectZmaFile() {
			// This will be implemented with Electron IPC for file dialog
			// For now, just a placeholder
			console.log('Select ZMA file');
			// TODO: Implement file dialog via Electron IPC
		},
		selectOffAxisFile(index) {
			// This will be implemented with Electron IPC for file dialog
			// For now, just a placeholder
			console.log('Select off-axis file for index', index);
			// TODO: Implement file dialog via Electron IPC
		},
		addOffAxisFile() {
			if (!this.localParameters.offAxisFiles) {
				this.localParameters.offAxisFiles = [];
			}
			this.localParameters.offAxisFiles.push({
				angle: 0,
				frdPath: '',
			});
		},
		removeOffAxisFile(index) {
			this.localParameters.offAxisFiles.splice(index, 1);
		},
		resetToStandard() {
			// Reset voltage source to standard values: 1W at 8Ω
			this.localParameters.power = 1.0;
			this.localParameters.impedance = 8.0;
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
	margin-top: 0;
	margin-bottom: 20px;
	font-size: 18px;
	font-weight: 600;
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
	padding: 4px 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 12px;
	user-select: none;
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

.dialog-actions {
	margin-top: 20px;
	padding-top: 20px;
	border-top: 1px solid #e0e0e0;
	display: flex;
	justify-content: flex-end;
}

.close-button {
	padding: 8px 24px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: #007bff;
	color: white;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
}

.close-button:hover {
	background-color: #0056b3;
}
</style>
