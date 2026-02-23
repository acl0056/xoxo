import { Node } from '@/models/Node';

describe('Node', () => {
	describe('constructor', () => {
		test('should create a node with valid position', () => {
			const node = new Node(10, 20);

			expect(node.id).toBeDefined();
			expect(typeof node.id).toBe('string');
			expect(node.id.length).toBeGreaterThan(0);
			expect(node.x).toBe(10);
			expect(node.y).toBe(20);
			expect(node.connectedWires).toEqual([]);
		});

		test('should create nodes with unique IDs', () => {
			const node1 = new Node(0, 0);
			const node2 = new Node(0, 0);

			expect(node1.id).not.toBe(node2.id);
		});

		test('should handle zero coordinates', () => {
			const node = new Node(0, 0);

			expect(node.x).toBe(0);
			expect(node.y).toBe(0);
		});

		test('should handle negative coordinates', () => {
			const node = new Node(-10, -20);

			expect(node.x).toBe(-10);
			expect(node.y).toBe(-20);
		});

		test('should handle floating point coordinates', () => {
			const node = new Node(10.5, 20.7);

			expect(node.x).toBe(10.5);
			expect(node.y).toBe(20.7);
		});
	});

	describe('addWire', () => {
		test('should add a wire ID to the node', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';

			const result = node.addWire(wireId);

			expect(result).toBe(true);
			expect(node.connectedWires).toContain(wireId);
			expect(node.connectedWires.length).toBe(1);
		});

		test('should add multiple wire IDs', () => {
			const node = new Node(10, 20);
			const wireId1 = 'wire-123';
			const wireId2 = 'wire-456';

			node.addWire(wireId1);
			node.addWire(wireId2);

			expect(node.connectedWires).toContain(wireId1);
			expect(node.connectedWires).toContain(wireId2);
			expect(node.connectedWires.length).toBe(2);
		});

		test('should not add duplicate wire IDs', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';

			const result1 = node.addWire(wireId);
			const result2 = node.addWire(wireId);

			expect(result1).toBe(true);
			expect(result2).toBe(false);
			expect(node.connectedWires.length).toBe(1);
		});

		test('should return false for null wire ID', () => {
			const node = new Node(10, 20);

			const result = node.addWire(null);

			expect(result).toBe(false);
			expect(node.connectedWires.length).toBe(0);
		});

		test('should return false for undefined wire ID', () => {
			const node = new Node(10, 20);

			const result = node.addWire(undefined);

			expect(result).toBe(false);
			expect(node.connectedWires.length).toBe(0);
		});

		test('should return false for empty string wire ID', () => {
			const node = new Node(10, 20);

			const result = node.addWire('');

			expect(result).toBe(false);
			expect(node.connectedWires.length).toBe(0);
		});
	});

	describe('removeWire', () => {
		test('should remove a wire ID from the node', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';
			node.addWire(wireId);

			const result = node.removeWire(wireId);

			expect(result).toBe(true);
			expect(node.connectedWires).not.toContain(wireId);
			expect(node.connectedWires.length).toBe(0);
		});

		test('should return false when removing non-existent wire', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';

			const result = node.removeWire(wireId);

			expect(result).toBe(false);
		});

		test('should only remove the specified wire', () => {
			const node = new Node(10, 20);
			const wireId1 = 'wire-123';
			const wireId2 = 'wire-456';
			node.addWire(wireId1);
			node.addWire(wireId2);

			node.removeWire(wireId1);

			expect(node.connectedWires).not.toContain(wireId1);
			expect(node.connectedWires).toContain(wireId2);
			expect(node.connectedWires.length).toBe(1);
		});
	});

	describe('hasWire', () => {
		test('should return true for connected wire', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';
			node.addWire(wireId);

			expect(node.hasWire(wireId)).toBe(true);
		});

		test('should return false for non-connected wire', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';

			expect(node.hasWire(wireId)).toBe(false);
		});

		test('should return false after wire is removed', () => {
			const node = new Node(10, 20);
			const wireId = 'wire-123';
			node.addWire(wireId);
			node.removeWire(wireId);

			expect(node.hasWire(wireId)).toBe(false);
		});
	});

	describe('getWireCount', () => {
		test('should return 0 for new node', () => {
			const node = new Node(10, 20);

			expect(node.getWireCount()).toBe(0);
		});

		test('should return correct count after adding wires', () => {
			const node = new Node(10, 20);
			node.addWire('wire-1');
			node.addWire('wire-2');
			node.addWire('wire-3');

			expect(node.getWireCount()).toBe(3);
		});

		test('should return correct count after removing wires', () => {
			const node = new Node(10, 20);
			node.addWire('wire-1');
			node.addWire('wire-2');
			node.removeWire('wire-1');

			expect(node.getWireCount()).toBe(1);
		});
	});

	describe('clearWires', () => {
		test('should remove all wire connections', () => {
			const node = new Node(10, 20);
			node.addWire('wire-1');
			node.addWire('wire-2');
			node.addWire('wire-3');

			node.clearWires();

			expect(node.connectedWires).toEqual([]);
			expect(node.getWireCount()).toBe(0);
		});

		test('should work on node with no wires', () => {
			const node = new Node(10, 20);

			node.clearWires();

			expect(node.connectedWires).toEqual([]);
		});
	});

	describe('isAtSamePosition', () => {
		test('should return true for nodes at same position', () => {
			const node1 = new Node(10, 20);
			const node2 = new Node(10, 20);

			expect(node1.isAtSamePosition(node2)).toBe(true);
		});

		test('should return false for nodes at different positions', () => {
			const node1 = new Node(10, 20);
			const node2 = new Node(15, 25);

			expect(node1.isAtSamePosition(node2)).toBe(false);
		});

		test('should return false when x coordinates differ', () => {
			const node1 = new Node(10, 20);
			const node2 = new Node(15, 20);

			expect(node1.isAtSamePosition(node2)).toBe(false);
		});

		test('should return false when y coordinates differ', () => {
			const node1 = new Node(10, 20);
			const node2 = new Node(10, 25);

			expect(node1.isAtSamePosition(node2)).toBe(false);
		});

		test('should work with position object', () => {
			const node = new Node(10, 20);
			const position = { x: 10, y: 20 };

			expect(node.isAtSamePosition(position)).toBe(true);
		});

		test('should return false for null', () => {
			const node = new Node(10, 20);

			expect(node.isAtSamePosition(null)).toBe(false);
		});

		test('should return false for undefined', () => {
			const node = new Node(10, 20);

			expect(node.isAtSamePosition(undefined)).toBe(false);
		});
	});

	describe('validate', () => {
		test('should validate a valid node', () => {
			const node = new Node(10, 20);
			node.addWire('wire-123');

			const result = node.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		test('should detect missing id', () => {
			const node = new Node(10, 20);
			node.id = null;

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Node must have an id');
		});

		test('should detect invalid x coordinate (non-number)', () => {
			const node = new Node(10, 20);
			node.x = 'invalid';

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Node x position must be a finite number');
		});

		test('should detect invalid x coordinate (NaN)', () => {
			const node = new Node(10, 20);
			node.x = NaN;

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Node x position must be a finite number');
		});

		test('should detect invalid x coordinate (Infinity)', () => {
			const node = new Node(10, 20);
			node.x = Infinity;

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Node x position must be a finite number');
		});

		test('should detect invalid y coordinate (non-number)', () => {
			const node = new Node(10, 20);
			node.y = 'invalid';

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Node y position must be a finite number');
		});

		test('should detect invalid connectedWires (not an array)', () => {
			const node = new Node(10, 20);
			node.connectedWires = 'not-an-array';

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Node connectedWires must be an array');
		});

		test('should detect invalid wire ID (non-string)', () => {
			const node = new Node(10, 20);
			node.connectedWires = [123, 'wire-456'];

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Connected wire at index 0 must be a non-empty string');
		});

		test('should detect invalid wire ID (empty string)', () => {
			const node = new Node(10, 20);
			node.connectedWires = ['', 'wire-456'];

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Connected wire at index 0 must be a non-empty string');
		});

		test('should report multiple errors', () => {
			const node = new Node(10, 20);
			node.id = null;
			node.x = NaN;
			node.y = Infinity;

			const result = node.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe('toJSON', () => {
		test('should serialize node to JSON', () => {
			const node = new Node(10, 20);
			node.addWire('wire-123');
			node.addWire('wire-456');

			const json = node.toJSON();

			expect(json).toEqual({
				id: node.id,
				x: 10,
				y: 20,
				connectedWires: ['wire-123', 'wire-456'],
			});
		});

		test('should serialize node with no wires', () => {
			const node = new Node(10, 20);

			const json = node.toJSON();

			expect(json).toEqual({
				id: node.id,
				x: 10,
				y: 20,
				connectedWires: [],
			});
		});

		test('should create a copy of connectedWires array', () => {
			const node = new Node(10, 20);
			node.addWire('wire-123');

			const json = node.toJSON();
			json.connectedWires.push('wire-456');

			expect(node.connectedWires).toEqual(['wire-123']);
			expect(json.connectedWires).toEqual(['wire-123', 'wire-456']);
		});
	});

	describe('fromJSON', () => {
		test('should deserialize node from JSON', () => {
			const json = {
				id: 'node-123',
				x: 10,
				y: 20,
				connectedWires: ['wire-123', 'wire-456'],
			};

			const node = Node.fromJSON(json);

			expect(node.id).toBe('node-123');
			expect(node.x).toBe(10);
			expect(node.y).toBe(20);
			expect(node.connectedWires).toEqual(['wire-123', 'wire-456']);
		});

		test('should handle missing connectedWires', () => {
			const json = {
				id: 'node-123',
				x: 10,
				y: 20,
			};

			const node = Node.fromJSON(json);

			expect(node.connectedWires).toEqual([]);
		});

		test('should handle empty connectedWires array', () => {
			const json = {
				id: 'node-123',
				x: 10,
				y: 20,
				connectedWires: [],
			};

			const node = Node.fromJSON(json);

			expect(node.connectedWires).toEqual([]);
		});
	});

	describe('serialization round-trip', () => {
		test('should preserve all data through serialization and deserialization', () => {
			const originalNode = new Node(10, 20);
			originalNode.addWire('wire-123');
			originalNode.addWire('wire-456');

			const json = originalNode.toJSON();
			const restoredNode = Node.fromJSON(json);

			expect(restoredNode.id).toBe(originalNode.id);
			expect(restoredNode.x).toBe(originalNode.x);
			expect(restoredNode.y).toBe(originalNode.y);
			expect(restoredNode.connectedWires).toEqual(originalNode.connectedWires);
		});

		test('should work with node at origin', () => {
			const originalNode = new Node(0, 0);

			const json = originalNode.toJSON();
			const restoredNode = Node.fromJSON(json);

			expect(restoredNode.x).toBe(0);
			expect(restoredNode.y).toBe(0);
		});

		test('should work with negative coordinates', () => {
			const originalNode = new Node(-10, -20);

			const json = originalNode.toJSON();
			const restoredNode = Node.fromJSON(json);

			expect(restoredNode.x).toBe(-10);
			expect(restoredNode.y).toBe(-20);
		});
	});
});
