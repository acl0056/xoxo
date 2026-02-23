import { Component } from '@/models/Component';
import { generateUniqueId } from '@/utils/idGenerator';

describe('Component', () => {
	describe('constructor', () => {
		it('should initialize with provided type and position', () => {
			const component = new Component('resistor', 10, 20);

			expect(component.type).toBe('resistor');
			expect(component.x).toBe(10);
			expect(component.y).toBe(20);
		});

		it('should generate a unique id', () => {
			const component1 = new Component('resistor', 0, 0);
			const component2 = new Component('capacitor', 0, 0);

			expect(component1.id).toBeDefined();
			expect(component2.id).toBeDefined();
			expect(component1.id).not.toBe(component2.id);
		});

		it('should initialize with empty label', () => {
			const component = new Component('resistor', 0, 0);

			expect(component.label).toBe('');
		});

		it('should initialize with zero rotation', () => {
			const component = new Component('resistor', 0, 0);

			expect(component.rotation).toBe(0);
		});

		it('should initialize with empty terminals array', () => {
			const component = new Component('resistor', 0, 0);

			expect(component.terminals).toEqual([]);
		});

		it('should initialize with empty parameters object', () => {
			const component = new Component('resistor', 0, 0);

			expect(component.parameters).toEqual({});
		});
	});

	describe('getTerminalPosition', () => {
		it('should return null for invalid terminal index', () => {
			const component = new Component('resistor', 10, 20);
			component.terminals = [{ x: 5, y: 0 }];

			expect(component.getTerminalPosition(-1)).toBeNull();
			expect(component.getTerminalPosition(1)).toBeNull();
		});

		it('should return terminal position without rotation', () => {
			const component = new Component('resistor', 10, 20);
			component.terminals = [{ x: 5, y: 0 }];

			const position = component.getTerminalPosition(0);

			expect(position.x).toBe(15);
			expect(position.y).toBe(20);
		});

		it('should apply 90 degree rotation to terminal position', () => {
			const component = new Component('resistor', 10, 20);
			component.terminals = [{ x: 5, y: 0 }];
			component.rotation = 90;

			const position = component.getTerminalPosition(0);

			expect(position.x).toBeCloseTo(10, 10);
			expect(position.y).toBeCloseTo(25, 10);
		});

		it('should apply 180 degree rotation to terminal position', () => {
			const component = new Component('resistor', 10, 20);
			component.terminals = [{ x: 5, y: 0 }];
			component.rotation = 180;

			const position = component.getTerminalPosition(0);

			expect(position.x).toBeCloseTo(5, 10);
			expect(position.y).toBeCloseTo(20, 10);
		});

		it('should apply 270 degree rotation to terminal position', () => {
			const component = new Component('resistor', 10, 20);
			component.terminals = [{ x: 5, y: 0 }];
			component.rotation = 270;

			const position = component.getTerminalPosition(0);

			expect(position.x).toBeCloseTo(10, 10);
			expect(position.y).toBeCloseTo(15, 10);
		});

		it('should handle multiple terminals', () => {
			const component = new Component('resistor', 10, 20);
			component.terminals = [
				{ x: -3, y: 0 },
				{ x: 3, y: 0 }
			];

			const position0 = component.getTerminalPosition(0);
			const position1 = component.getTerminalPosition(1);

			expect(position0.x).toBe(7);
			expect(position0.y).toBe(20);
			expect(position1.x).toBe(13);
			expect(position1.y).toBe(20);
		});
	});

	describe('rotate', () => {
		it('should rotate component by 90 degrees', () => {
			const component = new Component('resistor', 0, 0);

			component.rotate(90);

			expect(component.rotation).toBe(90);
		});

		it('should rotate component by -90 degrees', () => {
			const component = new Component('resistor', 0, 0);

			component.rotate(-90);

			expect(component.rotation).toBe(270);
		});

		it('should normalize rotation to 0-360 range', () => {
			const component = new Component('resistor', 0, 0);

			component.rotate(450);

			expect(component.rotation).toBe(90);
		});

		it('should handle multiple rotations', () => {
			const component = new Component('resistor', 0, 0);

			component.rotate(90);
			component.rotate(90);
			component.rotate(90);

			expect(component.rotation).toBe(270);
		});

		it('should wrap around after 360 degrees', () => {
			const component = new Component('resistor', 0, 0);

			component.rotate(90);
			component.rotate(90);
			component.rotate(90);
			component.rotate(90);

			expect(component.rotation).toBe(0);
		});

		it('should normalize to nearest 90 degree increment', () => {
			const component = new Component('resistor', 0, 0);

			component.rotate(95);

			expect(component.rotation).toBe(90);
		});
	});

	describe('validate', () => {
		it('should return valid for properly configured component', () => {
			const component = new Component('resistor', 10, 20);

			const result = component.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect missing id', () => {
			const component = new Component('resistor', 10, 20);
			component.id = null;

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Component must have an id');
		});

		it('should detect missing type', () => {
			const component = new Component('resistor', 10, 20);
			component.type = null;

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Component must have a type');
		});

		it('should detect invalid type', () => {
			const component = new Component('resistor', 10, 20);
			component.type = 'invalid-type';

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Invalid component type'))).toBe(true);
		});

		it('should accept all valid component types', () => {
			const validTypes = ['resistor', 'capacitor', 'inductor', 'speaker', 'ground', 'source'];

			validTypes.forEach(type => {
				const component = new Component(type, 10, 20);
				const result = component.validate();

				expect(result.valid).toBe(true);
			});
		});

		it('should detect invalid x position', () => {
			const component = new Component('resistor', 10, 20);
			component.x = 'invalid';

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('x position must be a finite number'))).toBe(true);
		});

		it('should detect invalid y position', () => {
			const component = new Component('resistor', 10, 20);
			component.y = NaN;

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('y position must be a finite number'))).toBe(true);
		});

		it('should detect invalid rotation', () => {
			const component = new Component('resistor', 10, 20);
			component.rotation = 45;

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Invalid rotation'))).toBe(true);
		});

		it('should accept all valid rotations', () => {
			const validRotations = [0, 90, 180, 270];

			validRotations.forEach(rotation => {
				const component = new Component('resistor', 10, 20);
				component.rotation = rotation;
				const result = component.validate();

				expect(result.valid).toBe(true);
			});
		});

		it('should return multiple errors when multiple issues exist', () => {
			const component = new Component('resistor', 10, 20);
			component.id = null;
			component.type = null;
			component.rotation = 45;

			const result = component.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe('toJSON', () => {
		it('should serialize component to JSON format', () => {
			const component = new Component('resistor', 10, 20);
			component.label = 'R1';
			component.rotation = 90;
			component.parameters = { resistance: 1000 };

			const json = component.toJSON();

			expect(json.id).toBe(component.id);
			expect(json.type).toBe('resistor');
			expect(json.label).toBe('R1');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.rotation).toBe(90);
			expect(json.parameters).toEqual({ resistance: 1000 });
		});

		it('should include empty label if not set', () => {
			const component = new Component('resistor', 10, 20);

			const json = component.toJSON();

			expect(json.label).toBe('');
		});

		it('should include empty parameters if not set', () => {
			const component = new Component('resistor', 10, 20);

			const json = component.toJSON();

			expect(json.parameters).toEqual({});
		});
	});

	describe('fromJSON', () => {
		it('should deserialize component from JSON format', () => {
			const json = {
				id: generateUniqueId(),
				type: 'resistor',
				label: 'R1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: { resistance: 1000 },
				terminals: [{ x: -3, y: 0 }, { x: 3, y: 0 }]
			};

			const component = Component.fromJSON(json);

			expect(component.id).toBe(json.id);
			expect(component.type).toBe('resistor');
			expect(component.label).toBe('R1');
			expect(component.x).toBe(10);
			expect(component.y).toBe(20);
			expect(component.rotation).toBe(90);
			expect(component.parameters).toEqual({ resistance: 1000 });
			expect(component.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});

		it('should use defaults for missing optional fields', () => {
			const json = {
				id: generateUniqueId(),
				type: 'resistor',
				x: 10,
				y: 20
			};

			const component = Component.fromJSON(json);

			expect(component.label).toBe('');
			expect(component.rotation).toBe(0);
			expect(component.parameters).toEqual({});
			expect(component.terminals).toEqual([]);
		});

		it('should preserve component id from JSON', () => {
			const originalId = generateUniqueId();
			const json = {
				id: originalId,
				type: 'capacitor',
				x: 5,
				y: 15
			};

			const component = Component.fromJSON(json);

			expect(component.id).toBe(originalId);
		});
	});
});
