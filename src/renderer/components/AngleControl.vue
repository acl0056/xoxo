<template>
	<div class="angle-control">
		<label for="angle-selector">Angle:</label>
		<select
			id="angle-selector"
			v-model.number="selectedAngle"
			@change="handleAngleChange"
		>
			<option :value="0">
				0° (On-Axis)
			</option>
			<option :value="15">
				15°
			</option>
			<option :value="30">
				30°
			</option>
			<option :value="45">
				45°
			</option>
			<option :value="60">
				60°
			</option>
			<option :value="75">
				75°
			</option>
			<option :value="90">
				90°
			</option>
			<option value="custom">
				Custom...
			</option>
		</select>
		<input
			v-if="showCustomInput"
			v-model.number="customAngle"
			type="number"
			min="0"
			max="180"
			step="1"
			class="custom-angle-input"
			placeholder="Enter angle"
			@blur="applyCustomAngle"
			@keyup.enter="applyCustomAngle"
		>
	</div>
</template>

<script>
import { mapState } from 'vuex';
import { useToast } from 'vue-toastification';

export default {
	name: 'AngleControl',
	setup() {
		const toast = useToast();
		return { toast };
	},
	data() {
		return {
			selectedAngle: 0,
			showCustomInput: false,
			customAngle: null,
		};
	},
	computed: {
		...mapState('simulation', ['currentAngle']),
	},
	watch: {
		currentAngle: {
			immediate: true,
			handler(newAngle) {
				// Sync local state with store
				if (newAngle !== this.selectedAngle) {
					const standardAngles = [0, 15, 30, 45, 60, 75, 90];
					if (standardAngles.includes(newAngle)) {
						this.selectedAngle = newAngle;
						this.showCustomInput = false;
					} else {
						this.selectedAngle = 'custom';
						this.customAngle = newAngle;
						this.showCustomInput = true;
					}
				}
			},
		},
	},
	methods: {
		handleAngleChange() {
			if (this.selectedAngle === 'custom') {
				this.showCustomInput = true;
				this.customAngle = this.currentAngle;
			} else {
				this.showCustomInput = false;
				this.dispatchAngleChange(this.selectedAngle);
			}
		},
		applyCustomAngle() {
			if (this.customAngle === null || this.customAngle === '') {
				this.toast.warning('Please enter a valid angle');
				return;
			}

			if (this.customAngle < 0 || this.customAngle > 180) {
				this.toast.error('Angle must be between 0 and 180 degrees');
				return;
			}

			this.dispatchAngleChange(this.customAngle);
		},
		dispatchAngleChange(angle) {
			// Send angle change via IPC so the main window runs the simulation
			const { ipcRenderer } = require('electron');
			ipcRenderer.send('switch-angle', angle);
		},
	},
};
</script>

<style scoped>
.angle-control {
	display: flex;
	align-items: center;
	gap: 4px;
}

.angle-control label {
	font-size: 14px;
	font-weight: 500;
}

.angle-control select {
	padding: 2px 4px;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	background-color: #ffffff;
}

.angle-control select:focus {
	outline: none;
	border-color: #0066cc;
}

.custom-angle-input {
	padding: 2px 4px;
	border: 1px solid #cccccc;
	border-radius: 4px;
	font-size: 14px;
	width: 80px;
}

.custom-angle-input:focus {
	outline: none;
	border-color: #0066cc;
}
</style>
