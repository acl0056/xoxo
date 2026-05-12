<template>
	<div
		v-if="visible"
		class="variable-dialog-overlay"
		@click.self="close"
		@mousedown.stop
	>
		<div class="variable-dialog" @click.stop>
			<div class="dialog-header">
				<h3>{{ dialogTitle }}</h3>
				<button
					class="close-x-button"
					@click="close"
				>
					×
				</button>
			</div>

			<div class="variable-fields">
				<div
					v-for="variable in activeVariables"
					:key="variable.slotIndex"
					class="variable-row"
				>
					<label class="variable-label">
						{{ variable.name }}
					</label>
					<div class="stepper-group">
						<input
							v-model="inputValues[variable.name]"
							type="text"
							class="variable-input"
							@change="handleValueChange(variable.name)"
						>
						<div class="increment-buttons">
							<button
								class="increment-button"
								@click="stepUp(variable.name)"
							>
								▲
							</button>
							<button
								class="increment-button"
								@click="stepDown(variable.name)"
							>
								▼
							</button>
						</div>
					</div>
					<span class="variable-description">
						{{ variable.description }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { filterActiveVariables } from '@/blocks/variableUtils';

export default {
	name: 'VariableDialog',
	props: {
		visible: {
			type: Boolean,
			required: true,
		},
		block: {
			type: Object,
			default: null,
		},
		blockGroup: {
			type: Object,
			default: null,
		},
		mode: {
			type: String,
			default: 'tune',
			validator: (value) => ['insert', 'tune'].includes(value),
		},
	},
	emits: ['confirm', 'cancel'],
	data() {
		return {
			inputValues: {},
		};
	},
	computed: {
		dialogTitle() {
			if (this.block) {
				return this.block.title || 'Circuit Block';
			}
			return 'Circuit Block';
		},
		activeVariables() {
			if (!this.block) return [];
			return filterActiveVariables(this.block.variables);
		},
	},
	watch: {
		visible: {
			immediate: true,
			handler(newVisible) {
				if (newVisible) {
					this.initializeValues();
				}
			},
		},
		block() {
			if (this.visible) {
				this.initializeValues();
			}
		},
		blockGroup() {
			if (this.visible) {
				this.initializeValues();
			}
		},
	},
	methods: {
		initializeValues() {
			this.inputValues = {};

			if (!this.block) return;

			const variables = this.activeVariables;

			if (this.blockGroup && this.blockGroup.variables) {
				// Pre-populate from blockGroup's current variable values
				for (const variable of variables) {
					const groupVariable = this.blockGroup.variables.find(
						(groupVar) => groupVar.name === variable.name,
					);
					const value = groupVariable ? groupVariable.value : variable.defaultValue;
					this.inputValues[variable.name] = String(value);
				}
			} else {
				// Pre-populate from block's default values
				for (const variable of variables) {
					this.inputValues[variable.name] = String(variable.defaultValue);
				}
			}
		},

		/**
		 * Calculate a reasonable step size based on the current value's order of magnitude.
		 * Step is 1/10th of the value's magnitude (e.g., 1000 → step 100, 0.5 → step 0.1).
		 * @param {number} currentValue
		 * @returns {number}
		 */
		getStepSize(currentValue) {
			if (currentValue === 0) return 1;
			const magnitude = 10 ** Math.floor(Math.log10(Math.abs(currentValue)));
			return magnitude / 10;
		},

		stepUp(name) {
			const currentValue = Number(this.inputValues[name]) || 0;
			const step = this.getStepSize(currentValue);
			const newValue = currentValue + step;
			this.inputValues[name] = String(parseFloat(newValue.toPrecision(10)));
			this.emitChange();
		},

		stepDown(name) {
			const currentValue = Number(this.inputValues[name]) || 0;
			const step = this.getStepSize(currentValue);
			const newValue = Math.max(step, currentValue - step); // Don't go below one step
			this.inputValues[name] = String(parseFloat(newValue.toPrecision(10)));
			this.emitChange();
		},

		handleValueChange(name) {
			const value = Number(this.inputValues[name]);
			if (Number.isFinite(value) && value > 0) {
				this.emitChange();
			}
		},

		emitChange() {
			const variables = {};
			let allValid = true;
			for (const variable of this.activeVariables) {
				const value = Number(this.inputValues[variable.name]);
				if (Number.isFinite(value) && value > 0) {
					variables[variable.name] = value;
				} else {
					allValid = false;
				}
			}
			if (allValid) {
				this.$emit('confirm', { variables });
			}
		},

		close() {
			this.$emit('cancel');
		},
	},
};
</script>

<style scoped>
.variable-dialog-overlay {
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

.variable-dialog {
	background-color: white;
	border-radius: 8px;
	padding: 24px;
	min-width: 400px;
	max-width: 600px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dialog-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.variable-dialog h3 {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
	color: #333;
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

.variable-fields {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.variable-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.variable-label {
	min-width: 60px;
	font-weight: 500;
	color: #333;
	font-size: 14px;
}

.stepper-group {
	display: flex;
	align-items: center;
	gap: 0;
}

.increment-buttons {
	display: flex;
	flex-direction: column;
}

.increment-button {
	padding: 2px 12px;
	border: 1px solid #ccc;
	background-color: #f5f5f5;
	cursor: pointer;
	font-size: 10px;
	line-height: 1;
}

.increment-button:first-child {
	border-radius: 0 4px 0 0;
	border-bottom: none;
}

.increment-button:last-child {
	border-radius: 0 0 4px 0;
}

.increment-button:hover {
	background-color: #e0e0e0;
}

.increment-button:active {
	background-color: #d0d0d0;
}

.variable-input {
	width: 100px;
	padding: 6px 10px;
	border: 1px solid #ccc;
	border-radius: 4px 0 0 4px;
	font-size: 14px;
	text-align: center;
}

.variable-input:focus {
	outline: none;
	border-color: #0066cc;
}

.variable-description {
	color: #666;
	font-size: 13px;
}
</style>
