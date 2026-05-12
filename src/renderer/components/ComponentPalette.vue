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
						draggable="false"
					>
					<span
						v-else
						class="icon-placeholder"
					>{{ componentType.label[0] }}</span>
				</div>
				<span class="palette-label">{{ componentType.label }}</span>
			</div>
			<hr class="palette-separator">
			<div
				v-for="annotationType in annotationTypes"
				:key="annotationType.type"
				class="palette-item"
			>
				<div
					class="palette-icon"
					:draggable="true"
					@dragstart="startDrag($event, annotationType)"
				>
					<span class="icon-placeholder">T</span>
				</div>
				<span class="palette-label">{{ annotationType.label }}</span>
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
import peqIcon from '@/renderer/assets/icons/peq.svg';
import filterIcon from '@/renderer/assets/icons/filter.svg';
import opampIcon from '@/renderer/assets/icons/opamp.svg';

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
				{
					type: 'peq',
					label: 'PEQ',
					icon: peqIcon,
				},
				{
					type: 'filter',
					label: 'Filter',
					icon: filterIcon,
				},
				{
					type: 'opamp',
					label: 'OpAmp',
					icon: opampIcon,
				},
			],
			annotationTypes: [
				{
					type: 'text',
					label: 'Text',
				},
			],
		};
	},
	created() {
		// Pre-create transparent image for drag ghost (must be loaded before first drag)
		this.transparentDragImage = new Image();
		this.transparentDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
	},
	methods: {
		startDrag(event, componentType) {
			// Set drag data with component type information
			event.dataTransfer.effectAllowed = 'copy';
			event.dataTransfer.setData('application/json', JSON.stringify({
				componentType: componentType.type,
			}));

			// Use pre-loaded transparent 1x1 pixel as drag image
			event.dataTransfer.setDragImage(this.transparentDragImage, 0, 0);

			// Store the component type globally so CircuitEditor can access it during dragover
			// (dataTransfer.getData is not available in dragover due to browser security)
			window.__pendingDragComponentType = componentType.type;

			// Emit event to parent components if needed
			this.$emit('drag-start', componentType);
		},
	},
};
</script>

<style scoped>
.component-palette {
	width: 100px;
	flex-shrink: 0;
	height: 100%;
	background-color: #f0f0f0;
	border-right: 1px solid #ccc;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
}

.palette-title {
	margin: 0;
	padding: 8px;
	background-color: #e0e0e0;
	border-bottom: 1px solid #ccc;
	font-size: 12px;
	font-weight: bold;
	color: #333;
	text-align: center;
}

.palette-items {
	display: flex;
	flex-direction: column;
	padding: 4px;
	gap: 4px;
}

.palette-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	padding: 4px;
	background-color: white;
	border: 1px solid #ccc;
	border-radius: 4px;
}

.palette-icon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: grab;
	transition: background-color 0.2s, transform 0.1s;
}

.palette-icon:hover {
	background-color: #f0f0f0;
}

.palette-icon:active {
	cursor: grabbing;
	transform: scale(0.98);
}

.palette-icon img {
	max-width: 40px;
	max-height: 40px;
	object-fit: contain;
}

.icon-placeholder {
	font-size: 24px;
	font-weight: bold;
	color: #666;
}

.palette-label {
	font-size: 11px;
	color: #333;
	user-select: none;
	text-align: center;
}

.palette-separator {
	width: 80%;
	border: none;
	border-top: 1px solid #ccc;
	margin: 4px auto;
}
</style>
