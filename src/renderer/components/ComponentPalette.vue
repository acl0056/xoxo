<template>
	<div class="component-palette">
		<h3 class="palette-title">
			Components
		</h3>
		<div class="palette-items">
			<div
				v-for="componentType in componentTypes"
				:key="componentType.type"
				class="palette-item"
			>
				<div
					class="palette-icon"
					:draggable="true"
					@dragstart="startDrag($event, componentType)"
				>
					<img
						v-if="componentType.icon"
						:src="componentType.icon"
						:alt="componentType.label"
					>
					<span
						v-else
						class="icon-placeholder"
					>{{ componentType.label[0] }}</span>
				</div>
				<span class="palette-label">{{ componentType.label }}</span>
			</div>
		</div>
	</div>
</template>

<script>
import resistorIcon from '@/renderer/assets/icons/resistor.svg';
import capacitorIcon from '@/renderer/assets/icons/capacitor.svg';
import inductorIcon from '@/renderer/assets/icons/inductor.svg';
import speakerIcon from '@/renderer/assets/icons/speaker.svg';
import groundIcon from '@/renderer/assets/icons/ground.svg';

export default {
	name: 'ComponentPalette',
	emits: ['drag-start'],
	data() {
		return {
			componentTypes: [
				{
					type: 'resistor',
					label: 'Resistor',
					icon: resistorIcon,
				},
				{
					type: 'capacitor',
					label: 'Capacitor',
					icon: capacitorIcon,
				},
				{
					type: 'inductor',
					label: 'Inductor',
					icon: inductorIcon,
				},
				{
					type: 'speaker',
					label: 'Speaker',
					icon: speakerIcon,
				},
				{
					type: 'ground',
					label: 'Ground',
					icon: groundIcon,
				},
			],
		};
	},
	methods: {
		startDrag(event, componentType) {
			// Set drag data with component type information
			event.dataTransfer.effectAllowed = 'copy';
			event.dataTransfer.setData('application/json', JSON.stringify({
				componentType: componentType.type,
			}));

			// Emit event to parent components if needed
			this.$emit('drag-start', componentType);
		},
	},
};
</script>

<style scoped>
.component-palette {
	width: 200px;
	height: 100%;
	background-color: #f0f0f0;
	border-right: 1px solid #ccc;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
}

.palette-title {
	margin: 0;
	padding: 12px;
	background-color: #e0e0e0;
	border-bottom: 1px solid #ccc;
	font-size: 14px;
	font-weight: bold;
	color: #333;
}

.palette-items {
	display: flex;
	flex-direction: column;
	padding: 8px;
	gap: 8px;
}

.palette-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 12px;
	background-color: white;
	border: 1px solid #ccc;
	border-radius: 4px;
}

.palette-icon {
	width: 64px;
	height: 64px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #fafafa;
	border: 1px solid #ddd;
	border-radius: 3px;
	cursor: grab;
	transition: background-color 0.2s, transform 0.1s;
}

.palette-icon:hover {
	background-color: #f0f0f0;
	border-color: #999;
}

.palette-icon:active {
	cursor: grabbing;
	transform: scale(0.98);
}

.palette-icon img {
	max-width: 56px;
	max-height: 56px;
	object-fit: contain;
}

.icon-placeholder {
	font-size: 32px;
	font-weight: bold;
	color: #666;
}

.palette-label {
	font-size: 13px;
	color: #333;
	user-select: none;
	text-align: center;
}
</style>
