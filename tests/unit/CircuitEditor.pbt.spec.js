import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import fc from 'fast-check';
import CircuitEditor from '@/renderer/components/CircuitEditor.vue';
import uiModule from '@/renderer/store/ui';
import circuitModule from '@/renderer/store/circuit';

// Mock canvas context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
	clearRect: jest.fn(),
	save: jest.fn(),
	restore: jest.fn(),
	translate: jest.fn(),
	scale: jest.fn(),
	rotate: jest.fn(),
	fillStyle: '',
	strokeStyle: '',
	lineWidth: 0,
	lineCap: '',
	lineJoin: '',
	font: '',
	textAlign: '',
	textBaseline: '',
	beginPath: jest.fn(),
	moveTo: jest.fn(),
	lineTo: jest.fn(),
	arc: jest.fn(),
	fill: jest.fn(),
	stroke: jest.fn(),
	fillText: jest.fn(),
	strokeRect: jest.fn(),
	setLineDash: jest.fn(),
	closePath: jest.fn(),
}));

describe('CircuitEditor.vue - Property-Based Tests', () => {
	let store;
	let wrapper;

	beforeEach(() => {
		// Create a mock store
		store = createStore({
			modules: {
				ui: uiModule,
				circuit: circuitModule,
			},
		});

		// Mount the component
		wrapper = mount(CircuitEditor, {
			global: {
				plugins: [store],
			},
		});
	});

	afterEach(() => {
		wrapper.unmount();
	});

	describe('Feature: crossover-network-simulator, Property 5: Grid Snapping Invariant', () => {
		test('should always snap coordinates to integer multiples of grid size at any zoom level', () => {
			const component = wrapper.vm;
			component.gridSize = 10;

			fc.assert(
				fc.property(
					fc.double({ min: -10000, max: 10000 }), // x coordinate
					fc.double({ min: -10000, max: 10000 }), // y coordinate
					fc.integer({ min: 10, max: 400 }), // zoom level (10% to 400%)
					(x, y, zoomLevel) => {
						// Set zoom level
						store.commit('ui/setZoomLevel', zoomLevel);

						// Snap coordinates to grid
						const snapped = component.snapToGrid(x, y);

						// Calculate adjusted grid size based on zoom
						const scale = zoomLevel / 100;
						const adjustedGridSize = component.gridSize * scale;

						// Verify snapped coordinates are multiples of adjusted grid size
						const xRemainder = Math.abs(snapped.x % adjustedGridSize);
						const yRemainder = Math.abs(snapped.y % adjustedGridSize);

						// Allow for floating point precision errors
						const epsilon = 0.0001;

						return xRemainder < epsilon && yRemainder < epsilon;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should maintain grid alignment regardless of zoom level', () => {
			const component = wrapper.vm;
			component.gridSize = 10;

			fc.assert(
				fc.property(
					fc.double({ min: -5000, max: 5000 }), // x coordinate
					fc.double({ min: -5000, max: 5000 }), // y coordinate
					fc.integer({ min: 10, max: 400 }), // zoom level 1
					fc.integer({ min: 10, max: 400 }), // zoom level 2
					(x, y, zoom1, zoom2) => {
						// Snap at first zoom level
						store.commit('ui/setZoomLevel', zoom1);
						const snapped1 = component.snapToGrid(x, y);

						// Snap at second zoom level
						store.commit('ui/setZoomLevel', zoom2);
						const snapped2 = component.snapToGrid(x, y);

						// Both should be valid grid points
						const scale1 = zoom1 / 100;
						const scale2 = zoom2 / 100;
						const adjustedGridSize1 = component.gridSize * scale1;
						const adjustedGridSize2 = component.gridSize * scale2;

						const epsilon = 0.0001;

						const valid1 = Math.abs(snapped1.x % adjustedGridSize1) < epsilon
							&& Math.abs(snapped1.y % adjustedGridSize1) < epsilon;

						const valid2 = Math.abs(snapped2.x % adjustedGridSize2) < epsilon
							&& Math.abs(snapped2.y % adjustedGridSize2) < epsilon;

						return valid1 && valid2;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should snap to nearest grid point', () => {
			const component = wrapper.vm;
			component.gridSize = 10;

			fc.assert(
				fc.property(
					fc.double({ min: -1000, max: 1000 }), // x coordinate
					fc.double({ min: -1000, max: 1000 }), // y coordinate
					fc.integer({ min: 50, max: 200 }), // zoom level
					(x, y, zoomLevel) => {
						store.commit('ui/setZoomLevel', zoomLevel);

						const snapped = component.snapToGrid(x, y);
						const scale = zoomLevel / 100;
						const adjustedGridSize = component.gridSize * scale;

						// Calculate distance from original to snapped point
						const distanceX = Math.abs(snapped.x - x);
						const distanceY = Math.abs(snapped.y - y);

						// Distance should be at most half the grid size
						return distanceX <= adjustedGridSize / 2 + 0.01
							&& distanceY <= adjustedGridSize / 2 + 0.01;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should produce consistent results for the same input', () => {
			const component = wrapper.vm;
			component.gridSize = 10;

			fc.assert(
				fc.property(
					fc.double({ min: -1000, max: 1000 }), // x coordinate
					fc.double({ min: -1000, max: 1000 }), // y coordinate
					fc.integer({ min: 10, max: 400 }), // zoom level
					(x, y, zoomLevel) => {
						store.commit('ui/setZoomLevel', zoomLevel);

						// Snap twice with same inputs
						const snapped1 = component.snapToGrid(x, y);
						const snapped2 = component.snapToGrid(x, y);

						// Results should be identical
						return snapped1.x === snapped2.x && snapped1.y === snapped2.y;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should handle edge cases: zero, negative, and very large coordinates', () => {
			const component = wrapper.vm;
			component.gridSize = 10;

			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant(0),
						fc.double({ min: -100000, max: -1000 }),
						fc.double({ min: 1000, max: 100000 }),
						fc.double({ min: -10, max: 10 }),
					),
					fc.oneof(
						fc.constant(0),
						fc.double({ min: -100000, max: -1000 }),
						fc.double({ min: 1000, max: 100000 }),
						fc.double({ min: -10, max: 10 }),
					),
					fc.integer({ min: 50, max: 200 }),
					(x, y, zoomLevel) => {
						store.commit('ui/setZoomLevel', zoomLevel);

						const snapped = component.snapToGrid(x, y);
						const scale = zoomLevel / 100;
						const adjustedGridSize = component.gridSize * scale;

						// Verify snapped coordinates are valid grid points
						const epsilon = 0.0001;
						const xRemainder = Math.abs(snapped.x % adjustedGridSize);
						const yRemainder = Math.abs(snapped.y % adjustedGridSize);

						return xRemainder < epsilon && yRemainder < epsilon;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: crossover-network-simulator, Property 3: Wire Connectivity Invariant', () => {
		test('should maintain wire connections when moving a component', () => {
			const { Resistor } = require('@/models/Resistor');
			const { Wire } = require('@/models/Wire');

			fc.assert(
				fc.property(
					fc.integer({ min: 5, max: 50 }), // initial x position
					fc.integer({ min: 5, max: 50 }), // initial y position
					fc.integer({ min: 5, max: 50 }), // new x position
					fc.integer({ min: 5, max: 50 }), // new y position
					fc.integer({ min: 0, max: 1 }), // terminal index
					(initialX, initialY, newX, newY, terminalIndex) => {
						// Create two resistors
						const resistor1 = new Resistor(initialX, initialY);
						resistor1.id = 'resistor-1';
						const resistor2 = new Resistor(initialX + 10, initialY);
						resistor2.id = 'resistor-2';

						store.commit('circuit/addComponent', resistor1);
						store.commit('circuit/addComponent', resistor2);

						// Create a wire connecting them
						const wire = new Wire(
							{ componentId: 'resistor-1', terminal: 1 },
							{ componentId: 'resistor-2', terminal: 0 },
						);
						store.commit('circuit/addWire', wire);

						// Move resistor1 to new position
						store.commit('circuit/updateComponent', {
							componentId: 'resistor-1',
							updates: { x: newX, y: newY },
						});

						// Verify wire still references the correct components
						const circuit = store.state.circuit;
						const updatedWire = circuit.wires.find((w) => w.id === wire.id);

						const wireStillConnected = updatedWire
							&& updatedWire.startNode.componentId === 'resistor-1'
							&& updatedWire.endNode.componentId === 'resistor-2';

						// Clean up for next iteration
						store.commit('circuit/removeWire', wire.id);
						store.commit('circuit/removeComponent', 'resistor-1');
						store.commit('circuit/removeComponent', 'resistor-2');

						return wireStillConnected;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should maintain correct terminal connections after component movement', () => {
			const { Resistor } = require('@/models/Resistor');
			const { Wire } = require('@/models/Wire');

			fc.assert(
				fc.property(
					fc.integer({ min: 10, max: 40 }), // initial x
					fc.integer({ min: 10, max: 40 }), // initial y
					fc.integer({ min: 10, max: 40 }), // new x
					fc.integer({ min: 10, max: 40 }), // new y
					(initialX, initialY, newX, newY) => {
						const resistor1 = new Resistor(initialX, initialY);
						resistor1.id = 'test-r1';
						const resistor2 = new Resistor(initialX + 15, initialY);
						resistor2.id = 'test-r2';

						store.commit('circuit/addComponent', resistor1);
						store.commit('circuit/addComponent', resistor2);

						// Connect terminal 1 of resistor1 to terminal 0 of resistor2
						const wire = new Wire(
							{ componentId: 'test-r1', terminal: 1 },
							{ componentId: 'test-r2', terminal: 0 },
						);
						store.commit('circuit/addWire', wire);

						// Move resistor1
						store.commit('circuit/updateComponent', {
							componentId: 'test-r1',
							updates: { x: newX, y: newY },
						});

						// Verify terminal indices remain correct
						const circuit = store.state.circuit;
						const updatedWire = circuit.wires.find((w) => w.id === wire.id);

						const terminalsCorrect = updatedWire
							&& updatedWire.startNode.terminal === 1
							&& updatedWire.endNode.terminal === 0;

						// Clean up
						store.commit('circuit/removeWire', wire.id);
						store.commit('circuit/removeComponent', 'test-r1');
						store.commit('circuit/removeComponent', 'test-r2');

						return terminalsCorrect;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: crossover-network-simulator, Property 6: Multi-Segment Wire Validity', () => {
		test('should ensure all wire segments are at valid grid points', () => {
			const { Wire } = require('@/models/Wire');

			fc.assert(
				fc.property(
					fc.array(
						fc.record({
							x: fc.integer({ min: 0, max: 100 }),
							y: fc.integer({ min: 0, max: 100 }),
						}),
						{ minLength: 0, maxLength: 10 },
					),
					(segments) => {
						const wire = new Wire(
							{ componentId: 'comp-1', terminal: 0 },
							{ componentId: 'comp-2', terminal: 0 },
						);

						// Add segments
						segments.forEach((segment) => {
							wire.addSegment(segment.x, segment.y);
						});

						// Verify all segments have integer coordinates (grid points)
						const allSegmentsValid = wire.segments.every(
							(segment) => Number.isInteger(segment.x) && Number.isInteger(segment.y),
						);

						return allSegmentsValid;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should maintain segment order and connectivity', () => {
			const { Wire } = require('@/models/Wire');

			fc.assert(
				fc.property(
					fc.array(
						fc.record({
							x: fc.integer({ min: 0, max: 50 }),
							y: fc.integer({ min: 0, max: 50 }),
						}),
						{ minLength: 1, maxLength: 5 },
					),
					(segments) => {
						const wire = new Wire(
							{ componentId: 'comp-1', terminal: 0 },
							{ componentId: 'comp-2', terminal: 0 },
						);

						// Add segments in order
						segments.forEach((segment) => {
							wire.addSegment(segment.x, segment.y);
						});

						// Verify segments are stored in the same order
						const orderPreserved = wire.segments.every(
							(segment, index) => segment.x === segments[index].x
								&& segment.y === segments[index].y,
						);

						// Verify segment count matches
						const countMatches = wire.segments.length === segments.length;

						return orderPreserved && countMatches;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should handle segment addition and removal correctly', () => {
			const { Wire } = require('@/models/Wire');

			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 10 }), // number of segments to add
					fc.integer({ min: 0, max: 9 }), // index to remove
					(segmentCount, removeIndex) => {
						const wire = new Wire(
							{ componentId: 'comp-1', terminal: 0 },
							{ componentId: 'comp-2', terminal: 0 },
						);

						// Add segments
						for (let i = 0; i < segmentCount; i++) {
							wire.addSegment(i * 10, i * 10);
						}

						const initialCount = wire.segments.length;

						// Remove a segment if valid index
						if (removeIndex < segmentCount) {
							wire.removeSegment(removeIndex);
							const afterRemovalCount = wire.segments.length;
							return afterRemovalCount === initialCount - 1;
						}

						return true;
					},
				),
				{ numRuns: 100 },
			);
		});

		test('should validate wire structure with segments', () => {
			const { Wire } = require('@/models/Wire');

			fc.assert(
				fc.property(
					fc.array(
						fc.record({
							x: fc.integer({ min: -100, max: 100 }),
							y: fc.integer({ min: -100, max: 100 }),
						}),
						{ minLength: 0, maxLength: 8 },
					),
					(segments) => {
						const wire = new Wire(
							{ componentId: 'comp-1', terminal: 0 },
							{ componentId: 'comp-2', terminal: 1 },
						);

						// Add segments
						segments.forEach((segment) => {
							wire.addSegment(segment.x, segment.y);
						});

						// Validate the wire
						const validation = wire.validate();

						// Wire should be valid if all segments have valid coordinates
						const allSegmentsHaveValidCoords = segments.every(
							(segment) => Number.isFinite(segment.x) && Number.isFinite(segment.y),
						);

						return validation.valid === allSegmentsHaveValidCoords;
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
