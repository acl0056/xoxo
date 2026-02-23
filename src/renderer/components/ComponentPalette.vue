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
				:draggable="true"
				@dragstart="startDrag($event, componentType)"
			>
				<div class="palette-icon">
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
export default {
	name: 'ComponentPalette',
	emits: ['drag-start'],
	data() {
		return {
			componentTypes: [
				{
					type: 'resistor',
					label: 'Resistor',
					icon: '@/renderer/assets/icons/resistor.svg',
				},
				{
					type: 'capacitor',
					label: 'Capacitor',
					icon: '@/renderer/assets/icons/capacitor.svg',
				},
				{
					type: 'inductor',
					label: 'Inductor',
					icon: '@/renderer/assets/icons/inductor.svg',
				},
				{
					type: 'speaker',
					label: 'Speaker',
					icon: '@/renderer/assets/icons/speaker.svg',
				},
				{
					type: 'ground',
					label: 'Ground',
					icon: '@/renderer/assets/icons/ground.svg',
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
	gap: 4px;
}

.palette-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px;
	background-color: white;
	border: 1px solid #ccc;
	border-radius: 4px;
	cursor: grab;
	transition: background-color 0.2s, transform 0.1s;
}

.palette-item:hover {
	background-color: #f9f9f9;
	border-color: #999;
}

.palette-item:active {
	cursor: grabbing;
	transform: scale(0.98);
}

.palette-icon {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #fafafa;
	border: 1px solid #ddd;
	border-radius: 3px;
}

.palette-icon img {
	max-width: 28px;
	max-height: 28px;
	object-fit: contain;
}

.icon-placeholder {
	font-size: 18px;
	font-weight: bold;
	color: #666;
}

.palette-label {
	font-size: 13px;
	color: #333;
	user-select: none;
}
</style>
