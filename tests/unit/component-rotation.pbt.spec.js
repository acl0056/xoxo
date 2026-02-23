import fc from 'fast-check';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Wire } from '@/models/Wire';

/**
 * Property 24: Component Rotation Preserves Connections
 *
 * **Validates: Requirements 13.6, 13.7**
 *
 * For any component with connected wires, rotating the component by 90 degrees
 * should update terminal positions and maintain all wire connections to the
 * correct terminals.
 */
describe('Property 24: Component Rotation Preserves Connections', () => {
	// Generator for component types that can be rotated
	const rotatableComponentGenerator = fc.oneof(
		fc.constant('resistor'),
		fc.constant('capacitor'),
		fc.constant('inductor'),
		fc.constant('speaker'),
		fc.constant('source'),
	);

	// Generator for grid positions
	const gridPositionGenerator = fc.record({
		x: fc.integer({ min: 0, max: 100 }),
		y: fc.integer({ min: 0, max: 100 }),
	});

	// Generator for rotation angles (0, 90, 180, 270)
	const rotationAngleGenerator = fc.constantFrom(0, 90, 180, 270);

	// Generator for terminal indices (0 or 1 for two-terminal components)
	const terminalIndexGenerator = fc.constantFrom(0, 1);

	// Helper function to create a component of a given type
	function createComponent(type, x, y) {
		switch (type) {
			case 'resistor':
				return new Resistor(x, y);
			case 'capacitor':
				return new Capacitor(x, y);
			case 'inductor':
				return new Inductor(x, y);
			case 'speaker':
				return new Speaker(x, y);
			case 'source':
				return new VoltageSource(x, y);
			default:
				throw new Error(`Unknown component type: ${type}`);
		}
	}

	it('should preserve wire connections after rotation', () => {
		fc.assert(
			fc.property(
				rotatableComponentGenerator,
				gridPositionGenerator,
				rotationAngleGenerator,
				terminalIndexGenerator,
				(componentType, position, initialRotation, terminalIndex) => {
					// Create a component at the given position with initial rotation
					const component = createComponent(componentType, position.x, position.y);
					component.rotation = initialRotation;

					// Get the initial terminal position before rotation
					const initialTerminalPosition = component.getTerminalPosition(terminalIndex);

					// Verify initial terminal position is valid
					expect(initialTerminalPosition).not.toBeNull();
					expect(initialTerminalPosition).toHaveProperty('x');
					expect(initialTerminalPosition).toHaveProperty('y');

					// Create a wire connected to this terminal
					const wire = new Wire(
						{ componentId: component.id, terminal: terminalIndex },
						{ componentId: 'other-component', terminal: 0 },
					);

					// Store the wire's start node reference
					const wireStartNode = wire.startNode;

					// Rotate the component by 90 degrees
					component.rotate(90);

					// Get the terminal position after rotation
					const rotatedTerminalPosition = component.getTerminalPosition(terminalIndex);

					// Verify rotated terminal position is valid
					expect(rotatedTerminalPosition).not.toBeNull();
					expect(rotatedTerminalPosition).toHaveProperty('x');
					expect(rotatedTerminalPosition).toHaveProperty('y');

					// Verify the wire still references the same component and terminal
					expect(wireStartNode.componentId).toBe(component.id);
					expect(wireStartNode.terminal).toBe(terminalIndex);

					// Verify the terminal position has changed (unless rotation is 360 degrees)
					const rotationDelta = (component.rotation - initialRotation + 360) % 360;
					if (rotationDelta !== 0) {
						// Terminal position should have changed
						const positionChanged = initialTerminalPosition.x !== rotatedTerminalPosition.x
							|| initialTerminalPosition.y !== rotatedTerminalPosition.y;
						expect(positionChanged).toBe(true);
					}

					// Verify rotation is normalized to 0, 90, 180, or 270
					expect([0, 90, 180, 270]).toContain(component.rotation);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should maintain terminal count after rotation', () => {
		fc.assert(
			fc.property(
				rotatableComponentGenerator,
				gridPositionGenerator,
				rotationAngleGenerator,
				(componentType, position, initialRotation) => {
					// Create a component
					const component = createComponent(componentType, position.x, position.y);
					component.rotation = initialRotation;

					// Get initial terminal count
					const initialTerminalCount = component.terminals.length;

					// Rotate the component multiple times
					component.rotate(90);
					component.rotate(90);
					component.rotate(90);
					component.rotate(90);

					// Terminal count should remain the same
					expect(component.terminals.length).toBe(initialTerminalCount);

					// Component should be back to original rotation (360 degrees)
					expect(component.rotation).toBe(initialRotation);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should preserve component ID and type after rotation', () => {
		fc.assert(
			fc.property(
				rotatableComponentGenerator,
				gridPositionGenerator,
				rotationAngleGenerator,
				(componentType, position, initialRotation) => {
					// Create a component
					const component = createComponent(componentType, position.x, position.y);
					component.rotation = initialRotation;

					// Store initial properties
					const initialId = component.id;
					const initialType = component.type;

					// Rotate the component
					component.rotate(90);

					// ID and type should remain unchanged
					expect(component.id).toBe(initialId);
					expect(component.type).toBe(initialType);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should handle multiple rotations correctly', () => {
		fc.assert(
			fc.property(
				rotatableComponentGenerator,
				gridPositionGenerator,
				fc.array(fc.constantFrom(90, -90, 180, -180), { minLength: 1, maxLength: 10 }),
				(componentType, position, rotations) => {
					// Create a component
					const component = createComponent(componentType, position.x, position.y);

					// Apply multiple rotations
					rotations.forEach((angle) => {
						component.rotate(angle);
					});

					// Final rotation should be normalized to 0, 90, 180, or 270
					expect([0, 90, 180, 270]).toContain(component.rotation);

					// Terminal positions should still be valid
					for (let i = 0; i < component.terminals.length; i++) {
						const terminalPosition = component.getTerminalPosition(i);
						expect(terminalPosition).not.toBeNull();
						expect(terminalPosition).toHaveProperty('x');
						expect(terminalPosition).toHaveProperty('y');
						expect(Number.isFinite(terminalPosition.x)).toBe(true);
						expect(Number.isFinite(terminalPosition.y)).toBe(true);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should maintain wire connectivity through rotation', () => {
		fc.assert(
			fc.property(
				rotatableComponentGenerator,
				gridPositionGenerator,
				fc.array(terminalIndexGenerator, { minLength: 1, maxLength: 2 }),
				(componentType, position, terminalIndices) => {
					// Create a component
					const component = createComponent(componentType, position.x, position.y);

					// Create wires connected to the component's terminals
					const wires = terminalIndices.map((terminalIndex) => new Wire(
						{ componentId: component.id, terminal: terminalIndex },
						{ componentId: 'other-component', terminal: 0 },
					));

					// Rotate the component
					component.rotate(90);

					// All wires should still reference the correct component and terminals
					wires.forEach((wire, index) => {
						expect(wire.startNode.componentId).toBe(component.id);
						expect(wire.startNode.terminal).toBe(terminalIndices[index]);
					});

					// Terminal positions should still be accessible
					terminalIndices.forEach((terminalIndex) => {
						const terminalPosition = component.getTerminalPosition(terminalIndex);
						expect(terminalPosition).not.toBeNull();
					});
				},
			),
			{ numRuns: 100 },
		);
	});
});
