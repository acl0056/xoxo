<template>
	<div class="angle-control">
		<label for="angle-selector">Angle:</label>
		<select
			id="angle-selector"
			v-model.number="selectedAngle"
			:disabled="availableAngles.length === 0 && currentAngle === 0"
			@change="handleAngleChange"
		>
			<option :value="0">
				0° (On-Axis)
			</option>
			<option
				v-if="availableAngles.length === 0"
				disabled
			>
				No off-axis data
			</option>
			<option
				v-for="angle in availableAngles"
				:key="angle"
				:value="angle"
			>
				{{ angle }}°
			</option>
		</select>
	</div>
</template>

<script>
import { mapState } from 'vuex';

export default {
	name: 'AngleControl',
	data() {
		return {
			selectedAngle: 0,
		};
	},
	computed: {
		...mapState('simulation', ['currentAngle', 'availableAngles']),
	},
	watch: {
		currentAngle: {
			immediate: true,
			handler(newAngle) {
				if (newAngle !== this.selectedAngle) {
					this.selectedAngle = newAngle;
				}
			},
		},
	},
	methods: {
		handleAngleChange() {
			const { ipcRenderer } = require('electron');
			ipcRenderer.send('switch-angle', this.selectedAngle);
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
</style>
