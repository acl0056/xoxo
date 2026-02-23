import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
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

describe('CircuitEditor.vue', () => {
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

	describe('Coordinate Transformations', () => {
		test('should convert screen coordinates to world coordinates at 100% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.scrollX = 0;
			component.scrollY = 0;

			const result = component.screenToWorld(100, 200);

			expect(result.x).toBe(100);
			expect(result.y).toBe(200);
		});

		test('should convert screen coordinates to world coordinates at 200% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 200);
			component.scrollX = 0;
			component.scrollY = 0;

			const result = component.screenToWorld(100, 200);

			expect(result.x).toBe(50);
			expect(result.y).toBe(100);
		});

		test('should convert screen coordinates to world coordinates at 50% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 50);
			component.scrollX = 0;
			component.scrollY = 0;

			const result = component.screenToWorld(100, 200);

			expect(result.x).toBe(200);
			expect(result.y).toBe(400);
		});

		test('should account for scroll offset in screen to world conversion', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.scrollX = 50;
			component.scrollY = 100;

			const result = component.screenToWorld(100, 200);

			expect(result.x).toBe(150);
			expect(result.y).toBe(300);
		});

		test('should convert world coordinates to screen coordinates at 100% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.scrollX = 0;
			component.scrollY = 0;

			const result = component.worldToScreen(100, 200);

			expect(result.x).toBe(100);
			expect(result.y).toBe(200);
		});

		test('should convert world coordinates to screen coordinates at 200% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 200);
			component.scrollX = 0;
			component.scrollY = 0;

			const result = component.worldToScreen(100, 200);

			expect(result.x).toBe(200);
			expect(result.y).toBe(400);
		});

		test('should convert world coordinates to screen coordinates at 50% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 50);
			component.scrollX = 0;
			component.scrollY = 0;

			const result = component.worldToScreen(100, 200);

			expect(result.x).toBe(50);
			expect(result.y).toBe(100);
		});

		test('should account for scroll offset in world to screen conversion', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.scrollX = 50;
			component.scrollY = 100;

			const result = component.worldToScreen(100, 200);

			expect(result.x).toBe(50);
			expect(result.y).toBe(100);
		});

		test('should round-trip screen to world to screen conversion', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 150);
			component.scrollX = 75;
			component.scrollY = 125;

			const screenX = 250;
			const screenY = 350;

			const world = component.screenToWorld(screenX, screenY);
			const screen = component.worldToScreen(world.x, world.y);

			expect(screen.x).toBeCloseTo(screenX, 5);
			expect(screen.y).toBeCloseTo(screenY, 5);
		});

		test('should round-trip world to screen to world conversion', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 75);
			component.scrollX = 100;
			component.scrollY = 200;

			const worldX = 300;
			const worldY = 400;

			const screen = component.worldToScreen(worldX, worldY);
			const world = component.screenToWorld(screen.x, screen.y);

			expect(world.x).toBeCloseTo(worldX, 5);
			expect(world.y).toBeCloseTo(worldY, 5);
		});
	});

	describe('Grid Snapping', () => {
		test('should snap coordinates to grid at 100% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.gridSize = 10;

			const result = component.snapToGrid(23, 47);

			expect(result.x).toBe(20);
			expect(result.y).toBe(50);
		});

		test('should snap coordinates to grid at 200% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 200);
			component.gridSize = 10;

			// Grid snapping works in world coordinates, not affected by zoom
			const result = component.snapToGrid(43, 87);

			expect(result.x).toBe(40);
			expect(result.y).toBe(90);
		});

		test('should snap coordinates to grid at 50% zoom', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 50);
			component.gridSize = 10;

			// Grid snapping works in world coordinates, not affected by zoom
			const result = component.snapToGrid(8, 12);

			expect(result.x).toBe(10);
			expect(result.y).toBe(10);
		});

		test('should snap exactly on grid points to themselves', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.gridSize = 10;

			const result = component.snapToGrid(30, 50);

			expect(result.x).toBe(30);
			expect(result.y).toBe(50);
		});

		test('should snap negative coordinates correctly', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.gridSize = 10;

			const result = component.snapToGrid(-23, -47);

			expect(result.x).toBe(-20);
			expect(result.y).toBe(-50);
		});

		test('should snap coordinates at midpoint to nearest grid point', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);
			component.gridSize = 10;

			const result = component.snapToGrid(25, 35);

			expect(result.x).toBe(30);
			expect(result.y).toBe(40);
		});

		test('should maintain grid alignment at different zoom levels', () => {
			const component = wrapper.vm;
			component.gridSize = 10;

			// Test at various zoom levels
			const zoomLevels = [50, 75, 100, 150, 200];

			zoomLevels.forEach((zoom) => {
				store.commit('ui/setZoomLevel', zoom);

				// Grid snapping works in world coordinates, independent of zoom
				const result = component.snapToGrid(23, 47);

				// Result should always be a multiple of grid size (10)
				expect(result.x % component.gridSize).toBe(0);
				expect(result.y % component.gridSize).toBe(0);
				
				// Should snap to same world coordinates regardless of zoom
				expect(result.x).toBe(20);
				expect(result.y).toBe(50);
			});
		});
	});

	describe('Zoom Controls', () => {
		test('should increase zoom level when zooming in', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);

			component.handleZoomIn();

			expect(store.state.ui.zoomLevel).toBe(110);
		});

		test('should decrease zoom level when zooming out', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 100);

			component.handleZoomOut();

			expect(store.state.ui.zoomLevel).toBe(90);
		});

		test('should not zoom in beyond 400%', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 395);

			component.handleZoomIn();

			expect(store.state.ui.zoomLevel).toBe(400);

			component.handleZoomIn();

			expect(store.state.ui.zoomLevel).toBe(400);
		});

		test('should not zoom out below 25%', () => {
			const component = wrapper.vm;
			store.commit('ui/setZoomLevel', 30);

			component.handleZoomOut();

			expect(store.state.ui.zoomLevel).toBe(25);

			component.handleZoomOut();

			expect(store.state.ui.zoomLevel).toBe(25);
		});

		test('should set zoom level directly', () => {
			const component = wrapper.vm;
			component.zoomPercent = 150;

			component.setZoom();

			expect(store.state.ui.zoomLevel).toBe(150);
		});

		test('should clamp zoom level to valid range when setting directly', () => {
			const component = wrapper.vm;

			component.zoomPercent = 500;
			component.setZoom();
			expect(store.state.ui.zoomLevel).toBe(400);

			component.zoomPercent = 5;
			component.setZoom();
			expect(store.state.ui.zoomLevel).toBe(10);
		});
	});

	describe('Hit Detection and Selection', () => {
		test('should detect component at position', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);
			resistor.id = 'test-resistor';
			store.commit('circuit/addComponent', resistor);

			// Test center of component (10 * 10 = 100, 20 * 10 = 200)
			const result = component.getComponentAtPosition(100, 200);

			expect(result).not.toBeNull();
			expect(result.id).toBe('test-resistor');
		});

		test('should return null when no component at position', () => {
			const component = wrapper.vm;

			const result = component.getComponentAtPosition(1000, 1000);

			expect(result).toBeNull();
		});

		test('should detect component within bounds', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);
			resistor.id = 'test-resistor';
			store.commit('circuit/addComponent', resistor);

			// Test edge of component bounds (resistor is 6 grid units wide)
			const result = component.getComponentAtPosition(130, 200);

			expect(result).not.toBeNull();
			expect(result.id).toBe('test-resistor');
		});

		test('should not detect component outside bounds', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);
			resistor.id = 'test-resistor';
			store.commit('circuit/addComponent', resistor);

			// Test outside component bounds
			const result = component.getComponentAtPosition(200, 200);

			expect(result).toBeNull();
		});

		test('should detect topmost component when components overlap', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor1 = new Resistor(10, 20);
			resistor1.id = 'resistor-1';
			const resistor2 = new Resistor(10, 20);
			resistor2.id = 'resistor-2';

			store.commit('circuit/addComponent', resistor1);
			store.commit('circuit/addComponent', resistor2);

			const result = component.getComponentAtPosition(100, 200);

			// Should return the last added component (topmost)
			expect(result).not.toBeNull();
			expect(result.id).toBe('resistor-2');
		});

		test('should calculate correct bounds for passive components', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);
			const bounds = component.getComponentBounds(resistor);

			// Resistor is 6 grid units wide, 2 grid units tall
			// Center at (10, 20) in grid coordinates = (100, 200) in world coordinates
			expect(bounds.left).toBe(100 - 30); // 100 - (6 * 10 / 2)
			expect(bounds.right).toBe(100 + 30);
			expect(bounds.top).toBe(200 - 10); // 200 - (2 * 10 / 2)
			expect(bounds.bottom).toBe(200 + 10);
		});

		test('should calculate correct bounds for ground component', () => {
			const component = wrapper.vm;
			const { Ground } = require('@/models/Ground');

			const ground = new Ground(10, 20);
			const bounds = component.getComponentBounds(ground);

			// Ground is 2 grid units wide, 3 grid units tall
			expect(bounds.left).toBe(100 - 10); // 100 - (2 * 10 / 2)
			expect(bounds.right).toBe(100 + 10);
			expect(bounds.top).toBe(200 - 15); // 200 - (3 * 10 / 2)
			expect(bounds.bottom).toBe(200 + 15);
		});

		test('should calculate correct bounds for speaker component', () => {
			const component = wrapper.vm;
			const { Speaker } = require('@/models/Speaker');

			const speaker = new Speaker(10, 20);
			const bounds = component.getComponentBounds(speaker);

			// Speaker is 6 grid units wide, 3 grid units tall
			expect(bounds.left).toBe(100 - 30);
			expect(bounds.right).toBe(100 + 30);
			expect(bounds.top).toBe(200 - 15);
			expect(bounds.bottom).toBe(200 + 15);
		});

		test('should detect terminal at position', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);
			resistor.rotation = 0;

			// Left terminal at -3 grid units from center
			const leftTerminal = component.getTerminalAtPosition(resistor, 70, 200);
			expect(leftTerminal).toBe(0);

			// Right terminal at +3 grid units from center
			const rightTerminal = component.getTerminalAtPosition(resistor, 130, 200);
			expect(rightTerminal).toBe(1);
		});

		test('should return null when no terminal at position', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);

			const result = component.getTerminalAtPosition(resistor, 100, 200);

			expect(result).toBeNull();
		});

		test('should detect terminals with rotation', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');

			const resistor = new Resistor(10, 20);
			resistor.rotation = 90;

			// After 90 degree rotation, terminals are vertical
			// Top terminal (was left)
			const topTerminal = component.getTerminalAtPosition(resistor, 100, 170);
			expect(topTerminal).toBe(0);

			// Bottom terminal (was right)
			const bottomTerminal = component.getTerminalAtPosition(resistor, 100, 230);
			expect(bottomTerminal).toBe(1);
		});

		test('should calculate distance from point to line segment', () => {
			const component = wrapper.vm;

			// Horizontal line from (0, 0) to (100, 0)
			const distance1 = component.pointToLineDistance(50, 10, 0, 0, 100, 0);
			expect(distance1).toBeCloseTo(10, 5);

			// Vertical line from (0, 0) to (0, 100)
			const distance2 = component.pointToLineDistance(10, 50, 0, 0, 0, 100);
			expect(distance2).toBeCloseTo(10, 5);

			// Point on the line
			const distance3 = component.pointToLineDistance(50, 0, 0, 0, 100, 0);
			expect(distance3).toBeCloseTo(0, 5);

			// Point beyond line segment end
			const distance4 = component.pointToLineDistance(150, 0, 0, 0, 100, 0);
			expect(distance4).toBeCloseTo(50, 5);
		});

		test('should return null when no wire at position', () => {
			const component = wrapper.vm;

			const result = component.getWireAtPosition(1000, 1000);

			expect(result).toBeNull();
		});

		test('should detect wire with segments', () => {
			const component = wrapper.vm;
			const { Resistor } = require('@/models/Resistor');
			const { Wire } = require('@/models/Wire');

			const resistor1 = new Resistor(10, 20);
			resistor1.id = 'resistor-1';
			const resistor2 = new Resistor(20, 30);
			resistor2.id = 'resistor-2';

			store.commit('circuit/addComponent', resistor1);
			store.commit('circuit/addComponent', resistor2);

			const wire = new Wire(
				{ componentId: 'resistor-1', terminal: 1 },
				{ componentId: 'resistor-2', terminal: 0 }
			);
			wire.id = 'test-wire';
			wire.addSegment(15, 20); // Add a corner point
			wire.addSegment(15, 30);
			store.commit('circuit/addWire', wire);

			// Test point on first segment
			const result1 = component.getWireAtPosition(140, 200);
			expect(result1).not.toBeNull();
			expect(result1.id).toBe('test-wire');

			// Test point on second segment (vertical)
			const result2 = component.getWireAtPosition(150, 250);
			expect(result2).not.toBeNull();
			expect(result2.id).toBe('test-wire');
		});
	});
});

