<template>
	<div
		class="circuit-editor"
		tabindex="0"
		@click="closeContextMenu"
		@keydown="handleKeyDown"
	>
		<canvas
			ref="canvas"
			:width="canvasWidth"
			:height="canvasHeight"
			@mousedown="handleMouseDown"
			@mousemove="handleMouseMove"
			@mouseup="handleMouseUp"
			@dblclick="handleDoubleClick"
			@wheel="handleWheel"
			@contextmenu="handleContextMenu"
			@dragover="handleDragOver"
			@drop="handleDrop"
		/>
		<div class="toolbar">
			<button @click="handleZoomIn">
				Zoom In
			</button>
			<button @click="handleZoomOut">
				Zoom Out
			</button>
			<input
				v-model.number="zoomPercent"
				type="number"
				min="10"
				max="400"
				step="10"
				@change="setZoom"
			>
			<span>%</span>
		</div>
		<ContextMenu
			:visible="contextMenuVisible"
			:x="contextMenuX"
			:y="contextMenuY"
			:menu-items="contextMenuItems"
			@item-click="handleContextMenuAction"
			@close="closeContextMenu"
		/>
		<TuneDialog
			:visible="tuneDialogVisible"
			:component="tuneDialogComponent"
			@close="closeTuneDialog"
			@update="handleTuneUpdate"
		/>
		<AnnotationDialog
			:visible="annotationDialogVisible"
			:annotation="annotationDialogAnnotation"
			@close="closeAnnotationDialog"
			@update="handleAnnotationUpdate"
		/>
	</div>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import { Wire } from '@/models/Wire';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { Ground } from '@/models/Ground';
import { TextAnnotation } from '@/models/TextAnnotation';
import { formatEngineering } from '@/utils/engineeringNotation';
import ContextMenu from './ContextMenu.vue';
import TuneDialog from './TuneDialog.vue';
import AnnotationDialog from './AnnotationDialog.vue';

export default {
	name: 'CircuitEditor',
	components: {
		ContextMenu,
		TuneDialog,
		AnnotationDialog,
	},
	data() {
		return {
			canvasWidth: 1200,
			canvasHeight: 800,
			context: null,
			gridSize: 10,
			scrollX: 0,
			scrollY: 0,
			selectedComponent: null,
			dragMode: null,
			wireStart: null,
			wireSegments: [],
			selectedWire: null,
			selectedAnnotation: null,
			dragOffset: { x: 0, y: 0 },
			dragStartPosition: null,
			lastMouseX: 0,
			lastMouseY: 0,
			contextMenuVisible: false,
			contextMenuX: 0,
			contextMenuY: 0,
			contextMenuItems: [],
			contextMenuTarget: null,
			contextMenuTargetType: null,
			tuneDialogVisible: false,
			tuneDialogComponent: null,
			annotationDialogVisible: false,
			annotationDialogAnnotation: null,
		};
	},
	computed: {
		...mapState('ui', ['zoomLevel', 'selectedComponentId']),
		...mapState('simulation', ['excludedSpeakers', 'currentAngle']),
		zoomPercent: {
			get() {
				return this.zoomLevel;
			},
			set(value) {
				this.setZoomLevel(value);
			},
		},
	},
	watch: {
		'$store.state.circuit.circuit': {
			deep: true,
			handler() {
				this.$nextTick(() => {
					this.renderCircuit();
				});
			},
		},
		zoomLevel() {
			this.renderCircuit();
		},
	},
	mounted() {
		this.context = this.$refs.canvas.getContext('2d');
		this.resizeCanvas();
		this.renderCircuit();
		window.addEventListener('resize', this.resizeCanvas);
		// Focus the editor to enable keyboard shortcuts
		this.$el.focus();
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.resizeCanvas);
	},
	methods: {
		...mapMutations('ui', ['setZoomLevel']),
		...mapActions('ui', ['zoomIn', 'zoomOut']),

		resizeCanvas() {
			const container = this.$el;
			if (container) {
				this.canvasWidth = container.clientWidth;
				this.canvasHeight = container.clientHeight - 40; // Account for toolbar
				this.$nextTick(() => {
					this.renderCircuit();
				});
			}
		},

		renderCircuit() {
			if (!this.context) return;

			// Clear canvas
			this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

			// Save context state
			this.context.save();

			// Apply zoom and scroll transformations
			this.context.translate(-this.scrollX, -this.scrollY);
			this.context.scale(this.zoomLevel / 100, this.zoomLevel / 100);

			// Render grid dots
			this.renderGrid();

			// Render wires (before components so they appear underneath)
			this.renderWires();

			// Render components
			this.renderComponents();

			// Render annotations
			this.renderAnnotations();

			// Render selection highlights
			this.renderSelectionHighlights();

			// Restore context state
			this.context.restore();

			// Update scroll area bounds
			this.updateScrollAreaBounds();
		},

		updateScrollAreaBounds() {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit || !circuit.components || circuit.components.length === 0) return;

			// Find the bounding box of all components
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;

			circuit.components.forEach((component) => {
				const bounds = this.getComponentBounds(component);
				minX = Math.min(minX, bounds.left);
				maxX = Math.max(maxX, bounds.right);
				minY = Math.min(minY, bounds.top);
				maxY = Math.max(maxY, bounds.bottom);
			});

			// Add buffer zone (in world coordinates)
			// Buffer size is 20 grid units to ensure sufficient space around components
			// The scroll values are already unrestricted in the pan logic
			// allowing users to scroll freely to view the entire circuit
		},

		renderGrid() {
			const scale = this.zoomLevel / 100;
			const worldStartX = this.scrollX / scale;
			const worldStartY = this.scrollY / scale;
			const worldEndX = (this.scrollX + this.canvasWidth) / scale;
			const worldEndY = (this.scrollY + this.canvasHeight) / scale;

			// Calculate grid boundaries aligned to grid
			const startX = Math.floor(worldStartX / this.gridSize) * this.gridSize;
			const startY = Math.floor(worldStartY / this.gridSize) * this.gridSize;
			const endX = Math.ceil(worldEndX / this.gridSize) * this.gridSize;
			const endY = Math.ceil(worldEndY / this.gridSize) * this.gridSize;

			// Set grid dot style
			this.context.fillStyle = '#cccccc';
			const dotRadius = 1;

			// Draw grid dots
			for (let x = startX; x <= endX; x += this.gridSize) {
				for (let y = startY; y <= endY; y += this.gridSize) {
					this.context.beginPath();
					this.context.arc(x, y, dotRadius, 0, Math.PI * 2);
					this.context.fill();
				}
			}
		},

		renderWires() {
			// Wire objects are only used for solver connectivity, not for rendering.
			// Visual wires are WireSegment components rendered by renderComponents.
		},

		renderComponents() {
			const circuit = this.$store.state.circuit.circuit;
			if (!circuit || !circuit.components) return;

			circuit.components.forEach((component) => {
				this.context.save();
				this.context.translate(component.x * this.gridSize, component.y * this.gridSize);
				this.context.rotate((component.rotation * Math.PI) / 180);

				switch (component.type) {
					case 'resistor':
						this.renderResistor(component);
						break;
					case 'capacitor':
						this.renderCapacitor(component);
						break;
					case 'inductor':
						this.renderInductor(component);
						break;
					case 'speaker':
						this.renderSpeaker(component);
						break;
					case 'source':
						this.renderVoltageSource(component);
						break;
					case 'ground':
						this.renderGround(component);
						break;
					case 'wire-segment':
						this.renderWireSegment(component);
						break;
					default:
						break;
				}

				this.context.restore();
			});
		},

		renderResistor(component) {
			const { gridSize } = this;
			const state = component.parameters.state || 'normal';

			// Draw resistor symbol (zigzag pattern)
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;

			// Draw terminal connection dots (black, larger than grid dots)
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;

			// Left terminal
			this.context.beginPath();
			this.context.arc(-3 * gridSize, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Right terminal
			this.context.beginPath();
			this.context.arc(3 * gridSize, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			this.context.beginPath();

			// Left lead
			this.context.moveTo(-3 * gridSize, 0);
			this.context.lineTo(-2 * gridSize, 0);

			if (state === 'short') {
				// Short state: draw straight line through
				this.context.lineTo(2 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();

				// Draw "SHORT" label
				this.context.fillStyle = '#ff0000';
				this.context.font = 'bold 10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText('SHORT', 0, gridSize * 0.5);
			} else if (state === 'open') {
				// Open state: draw with gap in the middle
				this.context.stroke();

				// Draw right side separately with gap
				this.context.beginPath();
				this.context.moveTo(2 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();

				// Draw zigzag body with gap
				this.context.beginPath();
				const zigzagHeight = 0.8 * gridSize;
				const segments = 6;
				const zigzagSpan = 4 * gridSize; // from -2 to +2
				const segmentLength = zigzagSpan / segments;

				// Left half of zigzag
				for (let i = 0; i <= segments / 2; i++) {
					const x = -2 * gridSize + i * segmentLength;
					const y = (i % 2 === 0) ? -zigzagHeight / 2 : zigzagHeight / 2;
					if (i === 0) {
						this.context.moveTo(x, y);
					} else {
						this.context.lineTo(x, y);
					}
				}
				this.context.stroke();

				// Right half of zigzag
				this.context.beginPath();
				for (let i = segments / 2 + 1; i <= segments; i++) {
					const x = -2 * gridSize + i * segmentLength;
					const y = (i % 2 === 0) ? -zigzagHeight / 2 : zigzagHeight / 2;
					if (i === segments / 2 + 1) {
						this.context.moveTo(x, y);
					} else {
						this.context.lineTo(x, y);
					}
				}
				this.context.stroke();

				// Draw "OPEN" label
				this.context.fillStyle = '#ff0000';
				this.context.font = 'bold 10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText('OPEN', 0, gridSize * 0.5);
			} else {
				// Normal state: draw complete zigzag
				// Path: left lead -> zigzag body -> right lead
				// Zigzag spans from -2 to +2 gridSize with 6 diagonal segments
				const h = 0.8 * gridSize;
				const step = 4 * gridSize / 6; // 6 diagonal segments across 4 gridSize

				this.context.lineTo(-2 * gridSize + step * 0.5, -h / 2);
				this.context.lineTo(-2 * gridSize + step * 1.5, h / 2);
				this.context.lineTo(-2 * gridSize + step * 2.5, -h / 2);
				this.context.lineTo(-2 * gridSize + step * 3.5, h / 2);
				this.context.lineTo(-2 * gridSize + step * 4.5, -h / 2);
				this.context.lineTo(-2 * gridSize + step * 5.5, h / 2);
				this.context.lineTo(2 * gridSize, 0);

				// Right lead
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();
			}

			// Draw label and value
			if (component.label) {
				this.context.fillStyle = '#000000';
				this.context.font = '12px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'bottom';
				this.context.fillText(component.label, 0, -1.8 * gridSize);
			}
			if (component.parameters.resistance != null) {
				this.context.fillStyle = '#000000';
				this.context.font = '11px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText(formatEngineering(component.parameters.resistance), 0, -1.8 * gridSize);
			}
		},

		renderCapacitor(component) {
			const { gridSize } = this;
			const state = component.parameters.state || 'normal';

			// Draw capacitor symbol (two parallel lines)
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;

			// Draw terminal connection dots (black, larger than grid dots)
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;

			// Left terminal
			this.context.beginPath();
			this.context.arc(-3 * gridSize, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Right terminal
			this.context.beginPath();
			this.context.arc(3 * gridSize, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			if (state === 'short') {
				// Short state: draw straight line through
				this.context.beginPath();
				this.context.moveTo(-3 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();

				// Draw "SHORT" label
				this.context.fillStyle = '#ff0000';
				this.context.font = 'bold 10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText('SHORT', 0, gridSize * 0.5);
			} else if (state === 'open') {
				// Open state: draw plates without connecting leads
				// Left plate
				this.context.beginPath();
				this.context.moveTo(-0.5 * gridSize, -gridSize);
				this.context.lineTo(-0.5 * gridSize, gridSize);
				this.context.stroke();

				// Right plate
				this.context.beginPath();
				this.context.moveTo(0.5 * gridSize, -gridSize);
				this.context.lineTo(0.5 * gridSize, gridSize);
				this.context.stroke();

				// Draw "OPEN" label
				this.context.fillStyle = '#ff0000';
				this.context.font = 'bold 10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText('OPEN', 0, gridSize * 1.2);
			} else {
				// Normal state: draw complete capacitor
				// Left lead
				this.context.beginPath();
				this.context.moveTo(-3 * gridSize, 0);
				this.context.lineTo(-0.5 * gridSize, 0);
				this.context.stroke();

				// Left plate
				this.context.beginPath();
				this.context.moveTo(-0.5 * gridSize, -gridSize);
				this.context.lineTo(-0.5 * gridSize, gridSize);
				this.context.stroke();

				// Right plate
				this.context.beginPath();
				this.context.moveTo(0.5 * gridSize, -gridSize);
				this.context.lineTo(0.5 * gridSize, gridSize);
				this.context.stroke();

				// Right lead
				this.context.beginPath();
				this.context.moveTo(0.5 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();
			}

			// Draw label and value
			if (component.label) {
				this.context.fillStyle = '#000000';
				this.context.font = '12px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'bottom';
				this.context.fillText(component.label, 0, -2.3 * gridSize);
			}
			if (component.parameters.capacitance != null) {
				this.context.fillStyle = '#000000';
				this.context.font = '11px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText(`${formatEngineering(component.parameters.capacitance)}F`, 0, -2.3 * gridSize);
			}
		},

		renderInductor(component) {
			const { gridSize } = this;
			const state = component.parameters.state || 'normal';

			// Draw inductor symbol (coil/loops)
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;

			// Draw terminal connection dots (black, larger than grid dots)
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;

			// Left terminal
			this.context.beginPath();
			this.context.arc(-3 * gridSize, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Right terminal
			this.context.beginPath();
			this.context.arc(3 * gridSize, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			if (state === 'short') {
				// Short state: draw straight line through
				this.context.beginPath();
				this.context.moveTo(-3 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();

				// Draw "SHORT" label
				this.context.fillStyle = '#ff0000';
				this.context.font = 'bold 10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText('SHORT', 0, gridSize * 0.5);
			} else if (state === 'open') {
				// Open state: draw coils with gap in the middle
				const numLoops = 3;
				const coilSpan = 4 * gridSize; // from -2 to +2
				const loopDiameter = coilSpan / numLoops;
				const loopRadius = loopDiameter / 2;
				const loopHeight = loopRadius * 1.5;
				const coilStartX = -2 * gridSize;

				// Left lead
				this.context.beginPath();
				this.context.moveTo(-3 * gridSize, 0);
				this.context.lineTo(coilStartX, 0);
				this.context.stroke();

				// Draw left coil
				this.context.beginPath();
				this.context.ellipse(coilStartX + loopRadius, 0, loopRadius, loopHeight, 0, Math.PI, 0, false);
				this.context.stroke();

				// Draw right coil (skip middle one for gap)
				this.context.beginPath();
				this.context.ellipse(coilStartX + loopDiameter * 2 + loopRadius, 0, loopRadius, loopHeight, 0, Math.PI, 0, false);
				this.context.stroke();

				// Right lead
				this.context.beginPath();
				this.context.moveTo(2 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();

				// Draw "OPEN" label
				this.context.fillStyle = '#ff0000';
				this.context.font = 'bold 10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText('OPEN', 0, gridSize * 0.5);
			} else {
				// Normal state: draw complete inductor
				const numLoops = 3;
				const coilSpan = 4 * gridSize; // from -2 to +2
				const loopDiameter = coilSpan / numLoops;
				const loopRadius = loopDiameter / 2;
				const loopHeight = loopRadius * 1.5;
				const coilStartX = -2 * gridSize;

				// Left lead
				this.context.beginPath();
				this.context.moveTo(-3 * gridSize, 0);
				this.context.lineTo(coilStartX, 0);
				this.context.stroke();

				// Coil loops - 3 arched humps spanning full width
				for (let i = 0; i < numLoops; i++) {
					const centerX = coilStartX + loopDiameter * i + loopRadius;
					this.context.beginPath();
					this.context.ellipse(centerX, 0, loopRadius, loopHeight, 0, Math.PI, 0, false);
					this.context.stroke();
				}

				// Right lead
				this.context.beginPath();
				this.context.moveTo(2 * gridSize, 0);
				this.context.lineTo(3 * gridSize, 0);
				this.context.stroke();
			}

			// Draw label and value
			if (component.label) {
				this.context.fillStyle = '#000000';
				this.context.font = '12px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'bottom';
				this.context.fillText(component.label, 0, -2.3 * gridSize);
			}
			if (component.parameters.inductance != null) {
				this.context.fillStyle = '#000000';
				this.context.font = '11px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText(`${formatEngineering(component.parameters.inductance)}H`, 0, -2.3 * gridSize);
			}
		},

		renderSpeaker(component) {
			const { gridSize } = this;

			// Draw speaker symbol (cone shape)
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;
			this.context.lineCap = 'round';

			// Determine terminal labels based on polarity
			// Normal polarity: + on top, - below
			const topLabel = component.parameters.inverted ? '-' : '+';
			const bottomLabel = component.parameters.inverted ? '+' : '-';

			// Draw terminal connection dots (black, larger than grid dots)
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;

			// Top terminal connection point (positive for normal polarity)
			this.context.beginPath();
			this.context.arc(-gridSize, -gridSize, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Bottom terminal connection point (negative for normal polarity)
			this.context.beginPath();
			this.context.arc(-gridSize, gridSize, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Draw connection lines from terminals to speaker polygon
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;

			// Top connection line (horizontal from top terminal to speaker polygon)
			this.context.beginPath();
			this.context.moveTo(-gridSize, -gridSize);
			this.context.lineTo(gridSize, -gridSize);
			this.context.stroke();

			// Bottom connection line (horizontal from bottom terminal to speaker polygon)
			this.context.beginPath();
			this.context.moveTo(-gridSize, gridSize);
			this.context.lineTo(gridSize, gridSize);
			this.context.stroke();

			// Speaker cone - drawn to the right of the terminals
			// Polygon with left edge at terminal dots, expanding to the right
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;
			this.context.beginPath();
			this.context.moveTo(gridSize, -2 * gridSize); // Left top (aligned with top terminal)
			this.context.lineTo(gridSize, 2 * gridSize); // Left bottom (aligned with bottom terminal)
			this.context.lineTo(2.5 * gridSize, 2 * gridSize); // Middle bottom
			this.context.lineTo(5 * gridSize, 4 * gridSize); // Right bottom
			this.context.lineTo(5 * gridSize, -4 * gridSize); // Right top
			this.context.lineTo(2.5 * gridSize, -2 * gridSize); // Middle top
			this.context.closePath();
			this.context.stroke();

			// Reset line cap to default
			this.context.lineCap = 'butt';

			// Draw terminal labels
			this.context.fillStyle = '#000000';
			this.context.font = '24px Arial';
			this.context.textAlign = 'center';
			this.context.textBaseline = 'middle';
			this.context.fillText(topLabel, 2 * gridSize, -gridSize);
			this.context.fillText(bottomLabel, 2 * gridSize, gridSize);

			// Draw component label
			if (component.label) {
				this.context.font = '12px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'bottom';
				this.context.fillText(component.label, 0, -2 * gridSize);
			}

			// Draw driver name below the speaker
			if (component.parameters.name) {
				this.context.font = '10px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText(component.parameters.name, 2 * gridSize, 4 * gridSize);
			}

			// Draw mute indicator if muted
			if (component.parameters.muted) {
				this.context.strokeStyle = '#ff0000';
				this.context.lineWidth = 3;
				this.context.beginPath();
				this.context.moveTo(-2 * gridSize, -2 * gridSize);
				this.context.lineTo(2 * gridSize, 2 * gridSize);
				this.context.stroke();
			}

			// Draw warning indicator if speaker is excluded due to missing angle data
			if (this.excludedSpeakers.includes(component.id)) {
				// Draw warning triangle in top-right corner
				this.context.fillStyle = '#ff9800';
				this.context.strokeStyle = '#000000';
				this.context.lineWidth = 1;

				const warningX = 2 * gridSize;
				const warningY = -2 * gridSize;
				const warningSize = gridSize * 0.6;

				// Triangle
				this.context.beginPath();
				this.context.moveTo(warningX, warningY - warningSize);
				this.context.lineTo(warningX - warningSize * 0.866, warningY + warningSize * 0.5);
				this.context.lineTo(warningX + warningSize * 0.866, warningY + warningSize * 0.5);
				this.context.closePath();
				this.context.fill();
				this.context.stroke();

				// Exclamation mark
				this.context.fillStyle = '#000000';
				this.context.font = 'bold 8px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'middle';
				this.context.fillText('!', warningX, warningY);

				// Draw warning text below component
				this.context.font = '10px Arial';
				this.context.fillStyle = '#ff9800';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'top';
				this.context.fillText(`No ${this.currentAngle}° data`, 0, 2.5 * gridSize);
			}
		},

		renderVoltageSource(component) {
			const { gridSize } = this;

			// Draw voltage source symbol (rectangle with +/- signs)
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;

			// Determine terminal labels based on polarity
			// Normal polarity: + on top, - below
			const topLabel = component.parameters.inverted ? '-' : '+';
			const bottomLabel = component.parameters.inverted ? '+' : '-';

			// Draw terminal connection dots (black, larger than grid dots)
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;

			// Top terminal connection point (positive for normal polarity)
			this.context.beginPath();
			this.context.arc(3 * gridSize, -2 * gridSize, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Bottom terminal connection point (negative for normal polarity)
			this.context.beginPath();
			this.context.arc(3 * gridSize, 2 * gridSize, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Rectangle: 5 wide x 6 tall grid spaces, right edge 1 grid from terminals
			const rectX = -3 * gridSize;
			const rectY = -3 * gridSize;
			const rectW = 5 * gridSize;
			const rectH = 6 * gridSize;
			this.context.strokeRect(rectX, rectY, rectW, rectH);

			// Draw connection lines from rectangle right edge to terminals
			const rightEdgeX = rectX + rectW;

			// Top connection line
			this.context.beginPath();
			this.context.moveTo(rightEdgeX, -2 * gridSize);
			this.context.lineTo(3 * gridSize, -2 * gridSize);
			this.context.stroke();

			// Bottom connection line
			this.context.beginPath();
			this.context.moveTo(rightEdgeX, 2 * gridSize);
			this.context.lineTo(3 * gridSize, 2 * gridSize);
			this.context.stroke();

			// Draw +/- signs inside rectangle near the right edge
			this.context.fillStyle = '#000000';
			this.context.font = '18px Arial';
			this.context.textAlign = 'center';
			this.context.textBaseline = 'middle';
			this.context.fillText(topLabel, gridSize, -1.5 * gridSize);
			this.context.fillText(bottomLabel, gridSize, 1.5 * gridSize);

			// Draw "Power Amp." text left of center
			const textCenterX = rectX + rectW * 0.4;
			const rectCenterY = rectY + rectH / 2;
			this.context.font = '12px Arial';
			this.context.textAlign = 'center';
			this.context.textBaseline = 'middle';
			this.context.fillText('Power', textCenterX, rectCenterY - 8);
			this.context.fillText('Amp.', textCenterX, rectCenterY + 8);

			// Draw component label
			if (component.label) {
				this.context.font = '12px Arial';
				this.context.textAlign = 'center';
				this.context.textBaseline = 'bottom';
				this.context.fillText(component.label, 0, -2 * gridSize);
			}

			// Draw voltage value above the box
			const voltage = Math.sqrt(component.parameters.power * component.parameters.impedance);
			this.context.font = '11px Arial';
			this.context.textAlign = 'left';
			this.context.textBaseline = 'bottom';
			this.context.fillText(`${voltage.toFixed(3)}Vrms`, rectX, rectY - 2);

			// Draw power/impedance below the box
			this.context.textBaseline = 'top';
			this.context.fillText(`${component.parameters.power}W (${component.parameters.impedance} ohm)`, rectX, rectY + rectH + 2);
		},

		renderGround() {
			const { gridSize } = this;

			// Draw ground symbol (three horizontal lines decreasing in length)
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;

			// Draw terminal connection dot (black, larger than grid dots)
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;
			this.context.beginPath();
			this.context.arc(0, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Vertical line from terminal (doubled size)
			this.context.beginPath();
			this.context.moveTo(0, 0);
			this.context.lineTo(0, 2 * gridSize);
			this.context.stroke();

			// Three horizontal lines (doubled size)
			const lineWidths = [3.0, 2.0, 1.0];
			lineWidths.forEach((width, index) => {
				const y = 2 * gridSize + ((index + 1) * 0.6 * gridSize);
				this.context.beginPath();
				this.context.moveTo((-width * gridSize) / 2, y);
				this.context.lineTo((width * gridSize) / 2, y);
				this.context.stroke();
			});
		},

		renderWireSegment(component) {
			const { gridSize } = this;
			const halfLength = (component.parameters.length / 2) * gridSize;

			// Draw wire line
			this.context.strokeStyle = '#000000';
			this.context.lineWidth = 2;
			this.context.lineCap = 'round';

			this.context.beginPath();
			this.context.moveTo(-halfLength, 0);
			this.context.lineTo(halfLength, 0);
			this.context.stroke();

			// Draw terminal connection dots at both ends
			this.context.fillStyle = '#000000';
			const terminalRadius = 3;

			// Left/top terminal
			this.context.beginPath();
			this.context.arc(-halfLength, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Right/bottom terminal
			this.context.beginPath();
			this.context.arc(halfLength, 0, terminalRadius, 0, 2 * Math.PI);
			this.context.fill();

			// Reset line cap
			this.context.lineCap = 'butt';
		},

		renderAnnotations() {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit || !circuit.annotations) return;

			circuit.annotations.forEach((annotation) => {
				this.context.save();

				// Position at annotation location
				this.context.translate(
					annotation.x * this.gridSize,
					annotation.y * this.gridSize,
				);

				// Set text style
				this.context.fillStyle = '#000000';
				this.context.font = `${annotation.fontSize}px Arial`;
				this.context.textAlign = 'left';
				this.context.textBaseline = 'top';

				// Draw text
				this.context.fillText(annotation.text, 0, 0);

				this.context.restore();
			});
		},

		renderSelectionHighlights() {
			if (!this.selectedComponentId) return;

			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit || !circuit.components) return;

			// Find selected component
			const selectedComponent = circuit.components.find(
				(component) => component.id === this.selectedComponentId,
			);

			if (!selectedComponent) return;

			// Use getComponentBounds for consistent hit area / selection highlight
			const bounds = this.getComponentBounds(selectedComponent);
			const padding = this.gridSize * 0.5;

			this.context.strokeStyle = '#ff6600';
			this.context.lineWidth = 2;
			this.context.setLineDash([5, 5]);
			this.context.strokeRect(
				bounds.left - padding,
				bounds.top - padding,
				(bounds.right - bounds.left) + 2 * padding,
				(bounds.bottom - bounds.top) + 2 * padding,
			);
			this.context.setLineDash([]);
		},

		handleMouseDown(event) {
			// Only handle left mouse button (0) to avoid interfering with context menu
			if (event.button !== 0) return;

			const rect = this.$refs.canvas.getBoundingClientRect();
			const screenX = event.clientX - rect.left;
			const screenY = event.clientY - rect.top;

			// Convert screen coordinates to world coordinates
			const world = this.screenToWorld(screenX, screenY);

			// Check if clicking on a component
			const clickedComponent = this.getComponentAtPosition(world.x, world.y);

			if (clickedComponent) {
				// Select the component
				this.$store.commit('ui/SET_SELECTED_COMPONENT', clickedComponent.id);
				this.selectedAnnotation = null;

				// Check if clicking on a terminal for wire creation
				const terminal = this.getTerminalAtPosition(clickedComponent, world.x, world.y);

				if (terminal !== null) {
					// Prevent default drag behavior
					event.preventDefault();
					
					// Start wire creation mode
					this.dragMode = 'wire';
					const terminals = this.getComponentTerminals(clickedComponent);
					const terminalPos = terminals[terminal];
					
					this.wireStart = {
						componentId: clickedComponent.id,
						terminal,
						x: terminalPos.x * this.gridSize,
						y: terminalPos.y * this.gridSize,
					};
					this.wireSegments = [];
				} else {
					// Start component move mode
					this.dragMode = 'move';
					this.dragOffset = {
						x: world.x - clickedComponent.x * this.gridSize,
						y: world.y - clickedComponent.y * this.gridSize,
					};
					// Save original position for undo
					this.dragStartPosition = {
						x: clickedComponent.x,
						y: clickedComponent.y,
					};
				}
			} else {
				// Check if clicking on an annotation
				const clickedAnnotation = this.getAnnotationAtPosition(world.x, world.y);

				if (clickedAnnotation) {
					// Select the annotation
					this.selectedAnnotation = clickedAnnotation.id;
					this.$store.commit('ui/SET_SELECTED_COMPONENT', null);
					this.selectedWire = null;

					// Start annotation move mode
					this.dragMode = 'move-annotation';
					this.dragOffset = {
						x: world.x - clickedAnnotation.x * this.gridSize,
						y: world.y - clickedAnnotation.y * this.gridSize,
					};
					// Save original position for undo
					this.dragStartPosition = {
						x: clickedAnnotation.x,
						y: clickedAnnotation.y,
					};
				} else {
					// Check if clicking on a wire
					const clickedWire = this.getWireAtPosition(world.x, world.y);

					if (clickedWire) {
						// Select the wire (for future deletion)
						this.selectedWire = clickedWire.id;
						this.selectedAnnotation = null;
					} else {
						// Deselect everything and start pan mode
						this.$store.commit('ui/SET_SELECTED_COMPONENT', null);
						this.selectedWire = null;
						this.selectedAnnotation = null;
						this.dragMode = 'pan';
					}
				}
			}

			this.lastMouseX = screenX;
			this.lastMouseY = screenY;
		},

		handleMouseMove(event) {
			const rect = this.$refs.canvas.getBoundingClientRect();
			const screenX = event.clientX - rect.left;
			const screenY = event.clientY - rect.top;

			const deltaX = screenX - this.lastMouseX;
			const deltaY = screenY - this.lastMouseY;

			if (this.dragMode === 'move' && this.selectedComponentId) {
				// Move the selected component (direct commit, no undo entry per move)
				const world = this.screenToWorld(screenX, screenY);
				const snapped = this.snapToGrid(world.x - this.dragOffset.x, world.y - this.dragOffset.y);

				// Convert back to grid coordinates
				const gridX = Math.round(snapped.x / this.gridSize);
				const gridY = Math.round(snapped.y / this.gridSize);

				this.$store.commit('circuit/UPDATE_COMPONENT', {
					componentId: this.selectedComponentId,
					updates: { x: gridX, y: gridY },
				});

				this.renderCircuit();
			} else if (this.dragMode === 'move-annotation' && this.selectedAnnotation) {
				// Move the selected annotation (direct commit, no undo entry per move)
				const world = this.screenToWorld(screenX, screenY);
				const snapped = this.snapToGrid(world.x - this.dragOffset.x, world.y - this.dragOffset.y);

				// Convert back to grid coordinates
				const gridX = Math.round(snapped.x / this.gridSize);
				const gridY = Math.round(snapped.y / this.gridSize);

				this.$store.commit('circuit/UPDATE_ANNOTATION', {
					annotationId: this.selectedAnnotation,
					updates: { x: gridX, y: gridY },
				});

				this.renderCircuit();
			} else if (this.dragMode === 'wire' && this.wireStart) {
				// Update wire preview with Manhattan routing (only horizontal or vertical)
				this.renderCircuit();

				// Draw wire preview
				const world = this.screenToWorld(screenX, screenY);
				const snapped = this.snapToGrid(world.x, world.y);

				this.context.save();
				this.context.translate(-this.scrollX, -this.scrollY);
				this.context.scale(this.zoomLevel / 100, this.zoomLevel / 100);

				// Determine if wire should be horizontal or vertical based on which distance is greater
				const deltaX = Math.abs(snapped.x - this.wireStart.x);
				const deltaY = Math.abs(snapped.y - this.wireStart.y);

				let endX, endY;
				if (deltaX > deltaY) {
					// Horizontal wire
					endX = snapped.x;
					endY = this.wireStart.y;
				} else {
					// Vertical wire
					endX = this.wireStart.x;
					endY = snapped.y;
				}

				// Draw wire line
				this.context.strokeStyle = '#000000';
				this.context.lineWidth = 2;
				this.context.beginPath();
				this.context.moveTo(this.wireStart.x, this.wireStart.y);
				this.context.lineTo(endX, endY);
				this.context.stroke();

				// Draw terminal dots at both ends
				this.context.fillStyle = '#000000';
				const terminalRadius = 3;

				// Start terminal dot
				this.context.beginPath();
				this.context.arc(this.wireStart.x, this.wireStart.y, terminalRadius, 0, 2 * Math.PI);
				this.context.fill();

				// End terminal dot
				this.context.beginPath();
				this.context.arc(endX, endY, terminalRadius, 0, 2 * Math.PI);
				this.context.fill();

				this.context.restore();
			} else if (this.dragMode === 'pan') {
				// Pan the canvas
				this.scrollX -= deltaX;
				this.scrollY -= deltaY;
				this.renderCircuit();
			}

			this.lastMouseX = screenX;
			this.lastMouseY = screenY;
		},

		handleMouseUp(event) {
			const rect = this.$refs.canvas.getBoundingClientRect();
			const screenX = event.clientX - rect.left;
			const screenY = event.clientY - rect.top;

			// Record a single undo action for the entire drag operation
			if (this.dragMode === 'move' && this.selectedComponentId && this.dragStartPosition) {
				const component = this.$store.state.circuit.circuit?.getComponent(this.selectedComponentId);
				if (component && (component.x !== this.dragStartPosition.x || component.y !== this.dragStartPosition.y)) {
					// Push undo to restore original position
					this.$store.commit('circuit/PUSH_UNDO', {
						type: 'updateComponent',
						payload: {
							componentId: this.selectedComponentId,
							updates: { x: this.dragStartPosition.x, y: this.dragStartPosition.y },
						},
					});
					this.$store.commit('circuit/CLEAR_REDO');
					this.$store.commit('circuit/SET_DIRTY', true);

					// Check for broken/new wire connections after move
					this.updateWireConnections(this.selectedComponentId);
				}
				this.dragStartPosition = null;
			} else if (this.dragMode === 'move-annotation' && this.selectedAnnotation && this.dragStartPosition) {
				const circuit = this.$store.state.circuit.circuit;
				const annotation = circuit?.annotations?.find((a) => a.id === this.selectedAnnotation);
				if (annotation && (annotation.x !== this.dragStartPosition.x || annotation.y !== this.dragStartPosition.y)) {
					this.$store.commit('circuit/PUSH_UNDO', {
						type: 'updateAnnotation',
						payload: {
							annotationId: this.selectedAnnotation,
							updates: { x: this.dragStartPosition.x, y: this.dragStartPosition.y },
						},
					});
					this.$store.commit('circuit/CLEAR_REDO');
					this.$store.commit('circuit/SET_DIRTY', true);
				}
				this.dragStartPosition = null;
			}

			if (this.dragMode === 'wire' && this.wireStart) {
				// Complete wire segment creation
				const world = this.screenToWorld(screenX, screenY);
				const snapped = this.snapToGrid(world.x, world.y);
				
				// Convert to grid coordinates
				const endGridX = Math.round(snapped.x / this.gridSize);
				const endGridY = Math.round(snapped.y / this.gridSize);
				
				// Get start position in grid coordinates
				const startGridX = Math.round(this.wireStart.x / this.gridSize);
				const startGridY = Math.round(this.wireStart.y / this.gridSize);
				
				// Don't create wire if start and end are the same
				if (startGridX !== endGridX || startGridY !== endGridY) {
					// Calculate wire segment parameters
					const deltaX = endGridX - startGridX;
					const deltaY = endGridY - startGridY;
					
					// Determine if wire should be horizontal or vertical
					let length, rotation, centerX, centerY;
					
					if (Math.abs(deltaX) > Math.abs(deltaY)) {
						// Horizontal wire
						length = Math.abs(deltaX);
						rotation = deltaX > 0 ? 0 : 180;
						centerX = startGridX + deltaX / 2;
						centerY = startGridY;
					} else {
						// Vertical wire
						length = Math.abs(deltaY);
						rotation = deltaY > 0 ? 90 : 270;
						centerX = startGridX;
						centerY = startGridY + deltaY / 2;
					}
					
					// Import WireSegment dynamically
					import('@/models/WireSegment').then(({ WireSegment }) => {
						// Create new wire segment
						const wireSegment = new WireSegment(centerX, centerY, length, rotation);
						
						// Add to circuit
						this.$store.dispatch('circuit/addComponent', wireSegment);
						
						// Create Wire objects for any terminal overlaps
						this.$nextTick(() => {
							this.createWireConnectionsForComponent(wireSegment.id);
							this.renderCircuit();
						});
					});
				}

				this.wireStart = null;
				this.wireSegments = [];
			}

			this.dragMode = null;
			this.renderCircuit();
		},

		handleWheel(event) {
			event.preventDefault();

			// Scroll with mouse wheel
			const delta = event.deltaY;
			const scrollSpeed = 20;

			if (event.shiftKey) {
				// Horizontal scroll
				this.scrollX += delta > 0 ? scrollSpeed : -scrollSpeed;
			} else {
				// Vertical scroll
				this.scrollY += delta > 0 ? scrollSpeed : -scrollSpeed;
			}

			this.renderCircuit();
		},

		handleDoubleClick(event) {
			if (this.dragMode === 'wire' && this.wireStart) {
				// Add a segment point to the wire
				const rect = this.$refs.canvas.getBoundingClientRect();
				const screenX = event.clientX - rect.left;
				const screenY = event.clientY - rect.top;

				const world = this.screenToWorld(screenX, screenY);
				const snapped = this.snapToGrid(world.x, world.y);

				if (!this.wireSegments) {
					this.wireSegments = [];
				}

				this.wireSegments.push({ x: snapped.x, y: snapped.y });
			} else {
				// Check if double-clicking on empty canvas to create annotation
				const rect = this.$refs.canvas.getBoundingClientRect();
				const screenX = event.clientX - rect.left;
				const screenY = event.clientY - rect.top;

				const world = this.screenToWorld(screenX, screenY);

				// Check if clicking on a component or wire
				const clickedComponent = this.getComponentAtPosition(world.x, world.y);
				const clickedWire = this.getWireAtPosition(world.x, world.y);

				if (!clickedComponent && !clickedWire) {
					// Create annotation at this position
					this.createAnnotation(world.x, world.y);
				}
			}
		},

		handleContextMenu(event) {
			event.preventDefault();

			const rect = this.$refs.canvas.getBoundingClientRect();
			const screenX = event.clientX - rect.left;
			const screenY = event.clientY - rect.top;

			// Convert screen coordinates to world coordinates
			const world = this.screenToWorld(screenX, screenY);

			// Check if right-clicking on a component
			const clickedComponent = this.getComponentAtPosition(world.x, world.y);

			if (clickedComponent) {
				// Show component context menu
				this.showComponentContextMenu(event.clientX, event.clientY, clickedComponent);
			} else {
				// Check if right-clicking on an annotation
				const clickedAnnotation = this.getAnnotationAtPosition(world.x, world.y);

				if (clickedAnnotation) {
					// Show annotation context menu
					this.showAnnotationContextMenu(event.clientX, event.clientY, clickedAnnotation);
				} else {
					// Check if right-clicking on a wire
					const clickedWire = this.getWireAtPosition(world.x, world.y);

					if (clickedWire) {
						// Show wire context menu
						this.showWireContextMenu(event.clientX, event.clientY, clickedWire);
					} else {
						// Close context menu if clicking on empty space
						this.closeContextMenu();
					}
				}
			}
		},

		showComponentContextMenu(x, y, component) {
			this.contextMenuX = x;
			this.contextMenuY = y;
			this.contextMenuTarget = component;
			this.contextMenuTargetType = 'component';

			// Build menu items based on component type
			const menuItems = [];

			// Wire segments have minimal menu (no tune option)
			if (component.type === 'wire-segment') {
				menuItems.push({ label: 'Rotate', action: 'rotate' });
				menuItems.push({ label: 'Delete', action: 'delete' });
			} else {
				// Tune option for all components except ground and wire-segment
				if (component.type !== 'ground') {
					menuItems.push({ label: 'Tune', action: 'tune' });
				}

				// Rotate option for all components
				menuItems.push({ label: 'Rotate', action: 'rotate' });

				// State toggle option for passive components (resistor, capacitor, inductor)
				if (component.type === 'resistor' || component.type === 'capacitor' || component.type === 'inductor') {
					const currentState = component.parameters.state || 'normal';

					// Add submenu-style state options
					if (currentState !== 'normal') {
						menuItems.push({ label: 'State: Normal', action: 'state-normal' });
					}
					if (currentState !== 'open') {
						menuItems.push({ label: 'State: Open', action: 'state-open' });
					}
					if (currentState !== 'short') {
						menuItems.push({ label: 'State: Short', action: 'state-short' });
					}
				}

				// Invert option for speakers and voltage sources
				if (component.type === 'speaker' || component.type === 'source') {
					const isInverted = component.parameters.inverted;
					menuItems.push({
						label: isInverted ? 'Normal' : 'Invert',
						action: 'invert',
					});
				}

				// Mute option for speakers
				if (component.type === 'speaker') {
					const isMuted = component.parameters.muted;
					menuItems.push({
						label: isMuted ? 'Unmute' : 'Mute',
						action: 'mute',
					});
				}

				// Delete option for all components
				menuItems.push({ label: 'Delete', action: 'delete' });
			}

			this.contextMenuItems = menuItems;
			this.contextMenuVisible = true;
		},

		showWireContextMenu(x, y, wire) {
			this.contextMenuX = x;
			this.contextMenuY = y;
			this.contextMenuTarget = wire;
			this.contextMenuTargetType = 'wire';

			// Wire context menu only has Delete option
			this.contextMenuItems = [
				{ label: 'Delete', action: 'delete' },
			];

			this.contextMenuVisible = true;
		},

		showAnnotationContextMenu(x, y, annotation) {
			this.contextMenuX = x;
			this.contextMenuY = y;
			this.contextMenuTarget = annotation;
			this.contextMenuTargetType = 'annotation';

			// Annotation context menu has Edit and Delete options
			this.contextMenuItems = [
				{ label: 'Edit', action: 'edit' },
				{ label: 'Delete', action: 'delete' },
			];

			this.contextMenuVisible = true;
		},

		closeContextMenu() {
			this.contextMenuVisible = false;
			this.contextMenuTarget = null;
			this.contextMenuTargetType = null;
			this.contextMenuItems = [];
			// Reset any drag state interrupted by the context menu
			this.dragMode = null;
			this.wireStart = null;
			this.wireSegments = [];
		},

		handleContextMenuAction(action) {
			if (this.contextMenuTargetType === 'component') {
				this.handleComponentAction(action, this.contextMenuTarget);
			} else if (this.contextMenuTargetType === 'wire') {
				this.handleWireAction(action, this.contextMenuTarget);
			} else if (this.contextMenuTargetType === 'annotation') {
				this.handleAnnotationAction(action, this.contextMenuTarget);
			}
		},

		handleComponentAction(action, component) {
			switch (action) {
				case 'tune':
					this.openTuneDialog(component);
					break;
				case 'rotate':
					this.rotateComponent(component);
					break;
				case 'state-normal':
					this.setComponentState(component, 'normal');
					break;
				case 'state-open':
					this.setComponentState(component, 'open');
					break;
				case 'state-short':
					this.setComponentState(component, 'short');
					break;
				case 'invert':
					this.invertComponent(component);
					break;
				case 'mute':
					this.muteComponent(component);
					break;
				case 'delete':
					this.deleteComponent(component);
					break;
				default:
					console.warn(`Unknown action: ${action}`);
			}
		},

		handleWireAction(action, wire) {
			switch (action) {
				case 'delete':
					this.deleteWire(wire);
					break;
				default:
					console.warn(`Unknown action: ${action}`);
			}
		},

		handleAnnotationAction(action, annotation) {
			switch (action) {
				case 'edit':
					this.editAnnotation(annotation);
					break;
				case 'delete':
					this.deleteAnnotation(annotation);
					break;
				default:
					console.warn(`Unknown action: ${action}`);
			}
		},

		openTuneDialog(component) {
			this.tuneDialogComponent = component;
			this.tuneDialogVisible = true;
		},

		closeTuneDialog() {
			this.tuneDialogVisible = false;
			this.tuneDialogComponent = null;
			// Reset any drag state that may have been interrupted by the dialog opening
			this.dragMode = null;
			this.wireStart = null;
			this.wireSegments = [];
		},

		async handleTuneUpdate({ componentId, parameters }) {
			console.log('[EDITOR] handleTuneUpdate received');
			// Update component parameters in the store
			await this.$store.dispatch('circuit/updateComponent', {
				componentId,
				updates: { parameters },
			});
			console.log('[EDITOR] updateComponent dispatched');

			// If this is a speaker, reload FRD/ZMA data files whenever a path is set
			const circuit = this.$store.state.circuit?.circuit;
			const component = circuit?.getComponent(componentId);

			if (component && component.type === 'speaker') {
				const loadPromises = [];

				// Only try to load FRD from file if no embedded data already exists
				if (parameters.frdFile && !component.frdData) {
					loadPromises.push(
						component.loadFrdFile(parameters.frdFile).catch((error) => {
							console.error('Failed to load FRD file:', error);
						}),
					);
				}

				// Only try to load ZMA from file if no embedded data already exists
				if (parameters.zmaFile && !component.zmaData) {
					loadPromises.push(
						component.loadZmaFile(parameters.zmaFile).catch((error) => {
							console.error('Failed to load ZMA file:', error);
						}),
					);
				}

				if (loadPromises.length > 0) {
					await Promise.all(loadPromises);
				}

				// Reload off-axis FRD data whenever offAxisFiles are present
				if (parameters.offAxisFiles && parameters.offAxisFiles.length > 0) {
					await component.loadOffAxisData();
				}

				// Re-trigger simulation after FRD/ZMA data is loaded
				// (the earlier updateComponent may have triggered simulation before data was ready)
				if (loadPromises.length > 0 || (parameters.offAxisFiles && parameters.offAxisFiles.length > 0)) {
					this.$store.dispatch('simulation/runSimulation', null, { root: true });
				}
			}

			this.renderCircuit();
		},

		closeAnnotationDialog() {
			this.annotationDialogVisible = false;
			this.annotationDialogAnnotation = null;
			// Reset any drag state interrupted by the dialog opening
			this.dragMode = null;
			this.wireStart = null;
			this.wireSegments = [];
		},

		handleAnnotationUpdate({ annotationId, text, fontSize }) {
			// Update annotation in the store
			this.$store.dispatch('circuit/updateAnnotation', {
				annotationId,
				updates: { text, fontSize },
			});
			this.renderCircuit();
		},

		rotateComponent(component) {
			// Rotate component by 90 degrees clockwise
			component.rotate(90);
			
			// For wire segments, also update terminals after rotation
			if (component.type === 'wire-segment') {
				component.updateTerminals();
			}
			
			this.$store.dispatch('circuit/updateComponent', {
				componentId: component.id,
				updates: { 
					rotation: component.rotation,
					terminals: component.terminals,
				},
			});
			this.renderCircuit();
		},

		setComponentState(component, state) {
			// Set component state (normal, open, short)
			this.$store.dispatch('circuit/updateComponent', {
				componentId: component.id,
				updates: { parameters: { ...component.parameters, state } },
			});
			this.renderCircuit();
		},

		invertComponent(component) {
			// Toggle polarity inversion
			const inverted = !component.parameters.inverted;
			this.$store.dispatch('circuit/updateComponent', {
				componentId: component.id,
				updates: { parameters: { ...component.parameters, inverted } },
			});
			this.renderCircuit();
		},

		muteComponent(component) {
			// Toggle mute state
			const muted = !component.parameters.muted;
			this.$store.dispatch('circuit/updateComponent', {
				componentId: component.id,
				updates: { parameters: { ...component.parameters, muted } },
			});
			this.renderCircuit();
		},

		deleteComponent(component) {
			// Remove all wires connected to this component
			const circuit = this.$store.state.circuit?.circuit;
			const wiresToRemove = circuit?.wires?.filter(
				(wire) => wire.startNode.componentId === component.id
					|| wire.endNode.componentId === component.id,
			) || [];

			wiresToRemove.forEach((wire) => {
				this.$store.dispatch('circuit/removeWire', wire.id);
			});

			// Remove the component
			this.$store.dispatch('circuit/removeComponent', component.id);

			// Clear selection if this was the selected component
			if (this.selectedComponentId === component.id) {
				this.$store.commit('ui/SET_SELECTED_COMPONENT', null);
			}

			this.renderCircuit();
		},

		deleteWire(wire) {
			// Remove the wire
			this.$store.dispatch('circuit/removeWire', wire.id);

			// Clear selection if this was the selected wire
			if (this.selectedWire === wire.id) {
				this.selectedWire = null;
			}

			this.renderCircuit();
		},

		editAnnotation(annotation) {
			// Open annotation dialog for editing
			this.annotationDialogAnnotation = annotation;
			this.annotationDialogVisible = true;
		},

		deleteAnnotation(annotation) {
			// Remove the annotation
			this.$store.dispatch('circuit/removeAnnotation', annotation.id);

			// Clear selection if this was the selected annotation
			if (this.selectedAnnotation === annotation.id) {
				this.selectedAnnotation = null;
			}

			this.renderCircuit();
		},

		handleKeyDown(event) {
			// Handle keyboard shortcuts
			if (event.key === 'Escape') {
				// Close context menu
				this.closeContextMenu();
			} else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
				// Redo (Shift+Cmd+Z on Mac)
				event.preventDefault();
				this.$store.dispatch('circuit/redo');
				this.renderCircuit();
			} else if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
				// Undo (Ctrl+Z or Cmd+Z on Mac)
				event.preventDefault();
				this.$store.dispatch('circuit/undo');
				this.renderCircuit();
			} else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
				// Redo (Ctrl+Y or Cmd+Y on Mac)
				event.preventDefault();
				this.$store.dispatch('circuit/redo');
				this.renderCircuit();
			} else if (event.key === 'Delete' || event.key === 'Backspace') {
				// Delete selected component, wire, or annotation
				if (this.selectedComponentId) {
					const circuit = this.$store.state.circuit?.circuit;
					const component = circuit.components.find((c) => c.id === this.selectedComponentId);
					if (component) {
						this.deleteComponent(component);
					}
				} else if (this.selectedWire) {
					const circuit = this.$store.state.circuit?.circuit;
					const wire = circuit.wires.find((w) => w.id === this.selectedWire);
					if (wire) {
						this.deleteWire(wire);
					}
				} else if (this.selectedAnnotation) {
					const circuit = this.$store.state.circuit?.circuit;
					const annotation = circuit.annotations.find((a) => a.id === this.selectedAnnotation);
					if (annotation) {
						this.deleteAnnotation(annotation);
					}
				}
			} else if (event.key === 't' || event.key === 'T') {
				// Open tune dialog for selected component
				if (this.selectedComponentId) {
					const circuit = this.$store.state.circuit?.circuit;
					const component = circuit.components.find((c) => c.id === this.selectedComponentId);
					if (component && component.type !== 'ground') {
						this.openTuneDialog(component);
					}
				} else if (this.selectedAnnotation) {
					// Open annotation dialog for selected annotation
					const circuit = this.$store.state.circuit?.circuit;
					const annotation = circuit.annotations.find((a) => a.id === this.selectedAnnotation);
					if (annotation) {
						this.editAnnotation(annotation);
					}
				}
			} else if (event.key === ' ') {
				// Rotate selected component
				event.preventDefault(); // Prevent page scroll
				if (this.selectedComponentId) {
					const circuit = this.$store.state.circuit?.circuit;
					const component = circuit.components.find((c) => c.id === this.selectedComponentId);
					if (component) {
						this.rotateComponent(component);
					}
				}
			}
		},

		handleDragOver(event) {
			// Allow drop by preventing default behavior
			event.preventDefault();
			event.dataTransfer.dropEffect = 'copy';
		},

		handleDrop(event) {
			event.preventDefault();

			// Get component type from drag data
			const dragData = event.dataTransfer.getData('application/json');
			if (!dragData) return;

			const { componentType } = JSON.parse(dragData);
			if (!componentType) return;

			// Get drop position
			const rect = this.$refs.canvas.getBoundingClientRect();
			const screenX = event.clientX - rect.left;
			const screenY = event.clientY - rect.top;

			// Convert to world coordinates and snap to grid
			const world = this.screenToWorld(screenX, screenY);
			const snapped = this.snapToGrid(world.x, world.y);

			// Convert to grid coordinates
			const gridX = Math.round(snapped.x / this.gridSize);
			const gridY = Math.round(snapped.y / this.gridSize);

			// Create the component
			this.createComponent(componentType, gridX, gridY);
		},

		createComponent(componentType, gridX, gridY) {
			// Import component classes dynamically
			let ComponentClass;

			switch (componentType) {
				case 'resistor': {
					ComponentClass = Resistor;
					break;
				}
				case 'capacitor': {
					ComponentClass = Capacitor;
					break;
				}
				case 'inductor': {
					ComponentClass = Inductor;
					break;
				}
				case 'speaker': {
					ComponentClass = Speaker;
					break;
				}
				case 'ground': {
					ComponentClass = Ground;
					break;
				}
				default:
					console.error(`Unknown component type: ${componentType}`);
					return;
			}

			// Create new component instance
			const component = new ComponentClass(gridX, gridY);

			// Add component to circuit using action (for undo/redo support)
			this.$store.dispatch('circuit/addComponent', component);

			// Select the new component
			this.$store.commit('ui/SET_SELECTED_COMPONENT', component.id);

			// Render the updated circuit after state updates
			this.$nextTick(() => {
				this.renderCircuit();
			});
		},

		createAnnotation(worldX, worldY) {
			// Snap to grid
			const snapped = this.snapToGrid(worldX, worldY);
			const gridX = Math.round(snapped.x / this.gridSize);
			const gridY = Math.round(snapped.y / this.gridSize);

			// Create new annotation with default text
			const annotation = new TextAnnotation(gridX, gridY, 'New Annotation');

			// Add annotation to circuit
			this.$store.dispatch('circuit/addAnnotation', annotation);

			// Open annotation dialog for editing
			this.annotationDialogAnnotation = annotation;
			this.annotationDialogVisible = true;

			// Render the updated circuit
			this.renderCircuit();
		},

		snapToGrid(x, y) {
			// Snap world coordinates to grid
			return {
				x: Math.round(x / this.gridSize) * this.gridSize,
				y: Math.round(y / this.gridSize) * this.gridSize,
			};
		},

		screenToWorld(screenX, screenY) {
			const scale = this.zoomLevel / 100;
			return {
				x: (screenX + this.scrollX) / scale,
				y: (screenY + this.scrollY) / scale,
			};
		},

		worldToScreen(worldX, worldY) {
			const scale = this.zoomLevel / 100;
			return {
				x: worldX * scale - this.scrollX,
				y: worldY * scale - this.scrollY,
			};
		},

		getComponentAtPosition(worldX, worldY) {
			const circuit = this.$store.state.circuit?.circuit;
			
			if (!circuit || !circuit.components) {
				return null;
			}

			// Check components in reverse order (top to bottom)
			for (let i = circuit.components.length - 1; i >= 0; i--) {
				const component = circuit.components[i];
				const bounds = this.getComponentBounds(component);

				const isInside = worldX >= bounds.left && worldX <= bounds.right
					&& worldY >= bounds.top && worldY <= bounds.bottom;

				if (isInside) {
					return component;
				}
			}

			return null;
		},

		getComponentBounds(component) {
			const { gridSize } = this;
			const centerX = component.x * gridSize;
			const centerY = component.y * gridSize;

			// Default bounds for passive components (6 grid dots wide)
			let width = 6 * gridSize;
			let height = 2 * gridSize;
			let offsetX = 0;
			let offsetY = 0;

			if (component.type === 'ground') {
				width = 3 * gridSize;
				height = 4 * gridSize;
				offsetY = 2 * gridSize; // Drawing extends downward from terminal
			} else if (component.type === 'speaker') {
				// Speaker: terminals at x=-1, cone extends to x=5, y from -4 to +4
				width = 6 * gridSize;
				height = 8 * gridSize;
				offsetX = 2 * gridSize; // Visual center is 2 grid units right of origin
			} else if (component.type === 'source') {
				// VS: rectangle from x=-3 to x=2, terminals at x=3
				width = 6 * gridSize;
				height = 6 * gridSize;
			} else if (component.type === 'wire-segment') {
				// Wire segments have length-based bounds
				const length = component.parameters.length * gridSize;
				width = length;
				height = gridSize; // Small height for hit detection
			}

			// Account for rotation
			const radians = (component.rotation * Math.PI) / 180;
			const cos = Math.abs(Math.cos(radians));
			const sin = Math.abs(Math.sin(radians));

			const rotatedWidth = width * cos + height * sin;
			const rotatedHeight = width * sin + height * cos;

			let bounds = {
				left: centerX + offsetX - rotatedWidth / 2,
				right: centerX + offsetX + rotatedWidth / 2,
				top: centerY + offsetY - rotatedHeight / 2,
				bottom: centerY + offsetY + rotatedHeight / 2,
			};

			// Expand bounds to include terminal positions so they are always clickable
			if (component.terminals && component.terminals.length > 0) {
				const terminalHitRadius = gridSize * 1.0;
				const radians = (component.rotation * Math.PI) / 180;
				const cos = Math.cos(radians);
				const sin = Math.sin(radians);

				component.terminals.forEach((terminal) => {
					const rotatedX = terminal.x * cos - terminal.y * sin;
					const rotatedY = terminal.x * sin + terminal.y * cos;
					const tx = (component.x + rotatedX) * gridSize;
					const ty = (component.y + rotatedY) * gridSize;

					bounds.left = Math.min(bounds.left, tx - terminalHitRadius);
					bounds.right = Math.max(bounds.right, tx + terminalHitRadius);
					bounds.top = Math.min(bounds.top, ty - terminalHitRadius);
					bounds.bottom = Math.max(bounds.bottom, ty + terminalHitRadius);
				});
			}

			return bounds;
		},

		getTerminalAtPosition(component, worldX, worldY) {
			const { gridSize } = this;
			const hitRadius = gridSize * 1.0; // One grid unit

			// Get terminal positions for this component
			const terminals = this.getComponentTerminals(component);

			for (let i = 0; i < terminals.length; i++) {
				const terminal = terminals[i];
				const terminalWorldX = terminal.x * gridSize;
				const terminalWorldY = terminal.y * gridSize;

				const distance = Math.sqrt(
					(worldX - terminalWorldX) ** 2
					+ (worldY - terminalWorldY) ** 2,
				);

				if (distance <= hitRadius) {
					return i;
				}
			}

			return null;
		},

		getComponentTerminals(component) {
			// Return terminal positions in grid coordinates
			const terminals = [];

			// Use the component's terminal definitions if available
			if (component.terminals && component.terminals.length > 0) {
				// Apply rotation to terminal positions
				const radians = (component.rotation * Math.PI) / 180;
				const cos = Math.cos(radians);
				const sin = Math.sin(radians);

				component.terminals.forEach((terminal) => {
					// Rotate terminal offset
					const rotatedX = terminal.x * cos - terminal.y * sin;
					const rotatedY = terminal.x * sin + terminal.y * cos;

					terminals.push({
						x: component.x + rotatedX,
						y: component.y + rotatedY,
					});
				});
			}

			return terminals;
		},

		/**
		 * After a component is moved, check all its wire connections.
		 * Remove wires whose terminals no longer overlap, and
		 * create new wires where terminals now overlap with other components.
		 */
		updateWireConnections(movedComponentId) {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit) return;

			const movedComponent = circuit.getComponent(movedComponentId);
			if (!movedComponent) return;

			const movedTerminals = this.getComponentTerminals(movedComponent);

			// 1. Remove wires that are no longer spatially connected
			const wiresToRemove = [];
			for (const wire of circuit.wires) {
				const involvesMovedComponent = wire.startNode.componentId === movedComponentId
					|| wire.endNode.componentId === movedComponentId;

				if (!involvesMovedComponent) continue;

				const startComp = circuit.getComponent(wire.startNode.componentId);
				const endComp = circuit.getComponent(wire.endNode.componentId);
				if (!startComp || !endComp) {
					wiresToRemove.push(wire.id);
					continue;
				}

				const startTerminals = this.getComponentTerminals(startComp);
				const endTerminals = this.getComponentTerminals(endComp);

				const startPos = startTerminals[wire.startNode.terminal];
				const endPos = endTerminals[wire.endNode.terminal];

				if (!startPos || !endPos) {
					wiresToRemove.push(wire.id);
					continue;
				}

				// Check if terminals still overlap (within 0.1 grid units tolerance)
				const distance = Math.sqrt(
					(startPos.x - endPos.x) ** 2 + (startPos.y - endPos.y) ** 2,
				);
				if (distance > 0.1) {
					wiresToRemove.push(wire.id);
				}
			}

			for (const wireId of wiresToRemove) {
				this.$store.dispatch('circuit/removeWire', wireId);
			}

			// 2. Create new wires where moved component terminals overlap other terminals
			const allComponents = circuit.components.filter((c) => c.id !== movedComponentId);

			for (let ti = 0; ti < movedTerminals.length; ti++) {
				const movedPos = movedTerminals[ti];

				for (const otherComponent of allComponents) {
					const otherTerminals = this.getComponentTerminals(otherComponent);

					for (let oi = 0; oi < otherTerminals.length; oi++) {
						const otherPos = otherTerminals[oi];

						const distance = Math.sqrt(
							(movedPos.x - otherPos.x) ** 2 + (movedPos.y - otherPos.y) ** 2,
						);

						if (distance <= 0.1) {
							// Check if this connection already exists
							const alreadyConnected = circuit.wires.some((w) => (w.startNode.componentId === movedComponentId
									&& w.startNode.terminal === ti
									&& w.endNode.componentId === otherComponent.id
									&& w.endNode.terminal === oi)
								|| (w.startNode.componentId === otherComponent.id
									&& w.startNode.terminal === oi
									&& w.endNode.componentId === movedComponentId
									&& w.endNode.terminal === ti));

							if (!alreadyConnected) {
								import('@/models/Wire').then(({ Wire }) => {
									const newWire = new Wire(
										{ componentId: movedComponentId, terminal: ti },
										{ componentId: otherComponent.id, terminal: oi },
									);
									this.$store.dispatch('circuit/addWire', newWire);
								});
							}
						}
					}
				}
			}
		},

		/**
		 * After a new component is added (especially wire-segments), check all its
		 * terminal positions against all other component terminals and create Wire
		 * objects for any overlapping connections.
		 */
		createWireConnectionsForComponent(componentId) {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit) return;

			const component = circuit.getComponent(componentId);
			if (!component) return;

			const componentTerminals = this.getComponentTerminals(component);
			const allOtherComponents = circuit.components.filter((c) => c.id !== componentId);

			for (let ti = 0; ti < componentTerminals.length; ti++) {
				const termPos = componentTerminals[ti];

				for (const otherComponent of allOtherComponents) {
					const otherTerminals = this.getComponentTerminals(otherComponent);

					for (let oi = 0; oi < otherTerminals.length; oi++) {
						const otherPos = otherTerminals[oi];

						const distance = Math.sqrt(
							(termPos.x - otherPos.x) ** 2 + (termPos.y - otherPos.y) ** 2,
						);

						if (distance <= 0.1) {
							// Check if this connection already exists
							const alreadyConnected = circuit.wires.some((w) => (w.startNode.componentId === componentId
									&& w.startNode.terminal === ti
									&& w.endNode.componentId === otherComponent.id
									&& w.endNode.terminal === oi)
								|| (w.startNode.componentId === otherComponent.id
									&& w.startNode.terminal === oi
									&& w.endNode.componentId === componentId
									&& w.endNode.terminal === ti));

							if (!alreadyConnected) {
								import('@/models/Wire').then(({ Wire }) => {
									const newWire = new Wire(
										{ componentId, terminal: ti },
										{ componentId: otherComponent.id, terminal: oi },
									);
									this.$store.dispatch('circuit/addWire', newWire);
								});
							}
						}
					}
				}
			}
		},

		getWireAtPosition(worldX, worldY) {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit || !circuit.wires || !circuit.components) return null;

			const hitRadius = this.gridSize * 0.3;

			for (const wire of circuit.wires) {
				// Get start and end positions
				const startComponent = circuit.components.find((c) => c.id === wire.startNode.componentId);
				const endComponent = circuit.components.find((c) => c.id === wire.endNode.componentId);

				if (!startComponent || !endComponent) {
					// Skip wires with missing components
				} else {
					// Get terminal positions using helper method (returns grid coordinates)
					const startTerminals = this.getComponentTerminals(startComponent);
					const endTerminals = this.getComponentTerminals(endComponent);

					if (startTerminals[wire.startNode.terminal] && endTerminals[wire.endNode.terminal]) {
						// Convert grid coordinates to world coordinates
						const startX = startTerminals[wire.startNode.terminal].x * this.gridSize;
						const startY = startTerminals[wire.startNode.terminal].y * this.gridSize;
						const endX = endTerminals[wire.endNode.terminal].x * this.gridSize;
						const endY = endTerminals[wire.endNode.terminal].y * this.gridSize;

						// Build path including segments
						const path = [{ x: startX, y: startY }];

						if (wire.segments && wire.segments.length > 0) {
							wire.segments.forEach((segment) => {
								path.push({ x: segment.x * this.gridSize, y: segment.y * this.gridSize });
							});
						}

						path.push({ x: endX, y: endY });

						// Check each segment of the path
						for (let i = 0; i < path.length - 1; i++) {
							const distance = this.pointToLineDistance(
								worldX, worldY,
								path[i].x, path[i].y,
								path[i + 1].x, path[i + 1].y,
							);

							if (distance <= hitRadius) {
								return wire;
							}
						}
					}
				}
			}

			return null;
		},

		pointToLineDistance(px, py, x1, y1, x2, y2) {
			// Calculate distance from point (px, py) to line segment (x1, y1) to (x2, y2)
			const dx = x2 - x1;
			const dy = y2 - y1;
			const lengthSquared = dx * dx + dy * dy;

			if (lengthSquared === 0) {
				// Line segment is a point
				return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
			}

			// Calculate projection parameter
			let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
			t = Math.max(0, Math.min(1, t));

			// Calculate closest point on line segment
			const closestX = x1 + t * dx;
			const closestY = y1 + t * dy;

			// Return distance to closest point
			return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
		},

		getAnnotationAtPosition(worldX, worldY) {
			const circuit = this.$store.state.circuit?.circuit;
			if (!circuit || !circuit.annotations) return null;

			// Check annotations in reverse order (top to bottom)
			for (let i = circuit.annotations.length - 1; i >= 0; i--) {
				const annotation = circuit.annotations[i];

				// Estimate text bounds
				this.context.save();
				this.context.font = `${annotation.fontSize}px Arial`;
				const textMetrics = this.context.measureText(annotation.text);
				const textWidth = textMetrics.width;
				const textHeight = annotation.fontSize * 1.2; // Approximate height
				this.context.restore();

				const annotationX = annotation.x * this.gridSize;
				const annotationY = annotation.y * this.gridSize;

				// Check if click is within text bounds
				if (worldX >= annotationX && worldX <= annotationX + textWidth
					&& worldY >= annotationY && worldY <= annotationY + textHeight) {
					return annotation;
				}
			}

			return null;
		},

		handleZoomIn() {
			this.zoomIn();
			this.renderCircuit();
		},

		handleZoomOut() {
			this.zoomOut();
			this.renderCircuit();
		},

		setZoom() {
			const zoom = Math.max(10, Math.min(400, this.zoomPercent));
			this.setZoomLevel(zoom);
			this.renderCircuit();
		},
	},
};
</script>

<style scoped>
.circuit-editor {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	background-color: #f5f5f5;
	position: relative;
	outline: none;
}

canvas {
	flex: 1;
	background-color: white;
	cursor: crosshair;
}

.toolbar {
	display: flex;
	align-items: center;
	gap: 4px;
	background-color: #e0e0e0;
	border-top: 1px solid #ccc;
}

.toolbar button {
	padding: 2px 8px;
	background-color: #fff;
	border: 1px solid #999;
	border-radius: 3px;
	cursor: pointer;
}

.toolbar button:hover {
	background-color: #f0f0f0;
}

.toolbar input[type="number"] {
	width: 50px;
	padding: 2px 4px;
	border: 1px solid #999;
	border-radius: 3px;
}
</style>
