import { Wire } from '@/models/Wire';

describe('Wire', () => {
	describe('constructor', () => {
		it('should create a wire with start and end nodes', () => {
			const startNode = { componentId: 'comp1', terminal: 0 };
			const endNode = { componentId: 'comp2', terminal: 1 };
			const wire = new Wire(startNode, endNode);

			expect(wire.id).toBeDefined();
			expect(wire.startNode).toEqual(startNode);
			expect(wire.endNode).toEqual(endNode);
			expect(wire.segments).toEqual([]);
		});

		it('should generate a unique id', () => {
			const startNode = { componentId: 'comp1', terminal: 0 };
			const endNode = { componentId: 'comp2', terminal: 1 };
			const wire1 = new Wire(startNode, endNode);
			const wire2 = new Wire(startNode, endNode);

			expect(wire1.id).toBeDefined();
			expect(wire2.id).toBeDefined();
			expect(wire1.id).not.toBe(wire2.id);
		});
	});

	describe('addSegment', () => {
		it('should add a segment point to the wire', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			const segment = wire.addSegment(10, 20);

			expect(segment).toEqual({ x: 10, y: 20 });
			expect(wire.segments).toHaveLength(1);
			expect(wire.segments[0]).toEqual({ x: 10, y: 20 });
		});

		it('should add multiple segment points', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);
			wire.addSegment(30, 40);
			wire.addSegment(50, 60);

			expect(wire.segments).toHaveLength(3);
			expect(wire.segments[0]).toEqual({ x: 10, y: 20 });
			expect(wire.segments[1]).toEqual({ x: 30, y: 40 });
			expect(wire.segments[2]).toEqual({ x: 50, y: 60 });
		});
	});

	describe('removeSegment', () => {
		it('should remove a segment by index', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);
			wire.addSegment(30, 40);
			wire.addSegment(50, 60);

			const removed = wire.removeSegment(1);

			expect(removed).toEqual({ x: 30, y: 40 });
			expect(wire.segments).toHaveLength(2);
			expect(wire.segments[0]).toEqual({ x: 10, y: 20 });
			expect(wire.segments[1]).toEqual({ x: 50, y: 60 });
		});

		it('should return null for invalid index', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);

			expect(wire.removeSegment(-1)).toBeNull();
			expect(wire.removeSegment(5)).toBeNull();
			expect(wire.segments).toHaveLength(1);
		});
	});

	describe('getSegment', () => {
		it('should get a segment by index', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);
			wire.addSegment(30, 40);

			expect(wire.getSegment(0)).toEqual({ x: 10, y: 20 });
			expect(wire.getSegment(1)).toEqual({ x: 30, y: 40 });
		});

		it('should return null for invalid index', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);

			expect(wire.getSegment(-1)).toBeNull();
			expect(wire.getSegment(5)).toBeNull();
		});
	});

	describe('updateSegment', () => {
		it('should update a segment position', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);
			wire.addSegment(30, 40);

			const result = wire.updateSegment(1, 35, 45);

			expect(result).toBe(true);
			expect(wire.segments[1]).toEqual({ x: 35, y: 45 });
		});

		it('should return false for invalid index', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);

			expect(wire.updateSegment(-1, 5, 5)).toBe(false);
			expect(wire.updateSegment(5, 5, 5)).toBe(false);
		});
	});

	describe('clearSegments', () => {
		it('should remove all segments', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);
			wire.addSegment(30, 40);
			wire.addSegment(50, 60);

			wire.clearSegments();

			expect(wire.segments).toEqual([]);
		});
	});

	describe('getSegmentCount', () => {
		it('should return the number of segments', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			expect(wire.getSegmentCount()).toBe(0);

			wire.addSegment(10, 20);
			expect(wire.getSegmentCount()).toBe(1);

			wire.addSegment(30, 40);
			expect(wire.getSegmentCount()).toBe(2);
		});
	});

	describe('validate', () => {
		it('should validate a valid wire', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			const result = wire.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should validate a wire with segments', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.addSegment(10, 20);
			wire.addSegment(30, 40);

			const result = wire.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should detect missing id', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			wire.id = null;

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire must have an id');
		});

		it('should detect missing startNode', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			wire.startNode = null;

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire must have a startNode');
		});

		it('should detect missing endNode', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			wire.endNode = null;

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire must have an endNode');
		});

		it('should detect missing componentId in startNode', () => {
			const wire = new Wire(
				{ terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire startNode must have a componentId');
		});

		it('should detect missing terminal in startNode', () => {
			const wire = new Wire(
				{ componentId: 'comp1' },
				{ componentId: 'comp2', terminal: 1 },
			);

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire startNode must have a terminal number');
		});

		it('should detect missing componentId in endNode', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ terminal: 1 },
			);

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire endNode must have a componentId');
		});

		it('should detect missing terminal in endNode', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2' },
			);

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire endNode must have a terminal number');
		});

		it('should detect invalid segment coordinates', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.segments = [
				{ x: 10, y: 20 },
				{ x: NaN, y: 30 },
				{ x: 40, y: Infinity },
			];

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Segment 1 x coordinate must be a finite number');
			expect(result.errors).toContain('Segment 2 y coordinate must be a finite number');
		});

		it('should detect non-array segments', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			wire.segments = 'not an array';

			const result = wire.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Wire segments must be an array');
		});
	});

	describe('toJSON', () => {
		it('should serialize a wire without segments', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			wire.id = 'wire-123';

			const json = wire.toJSON();

			expect(json).toEqual({
				id: 'wire-123',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
				segments: [],
			});
		});

		it('should serialize a wire with segments', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			wire.id = 'wire-123';
			wire.addSegment(10, 20);
			wire.addSegment(30, 40);

			const json = wire.toJSON();

			expect(json).toEqual({
				id: 'wire-123',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
				segments: [
					{ x: 10, y: 20 },
					{ x: 30, y: 40 },
				],
			});
		});
	});

	describe('fromJSON', () => {
		it('should deserialize a wire without segments', () => {
			const json = {
				id: 'wire-123',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
				segments: [],
			};

			const wire = Wire.fromJSON(json);

			expect(wire.id).toBe('wire-123');
			expect(wire.startNode).toEqual({ componentId: 'comp1', terminal: 0 });
			expect(wire.endNode).toEqual({ componentId: 'comp2', terminal: 1 });
			expect(wire.segments).toEqual([]);
		});

		it('should deserialize a wire with segments', () => {
			const json = {
				id: 'wire-123',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
				segments: [
					{ x: 10, y: 20 },
					{ x: 30, y: 40 },
				],
			};

			const wire = Wire.fromJSON(json);

			expect(wire.id).toBe('wire-123');
			expect(wire.startNode).toEqual({ componentId: 'comp1', terminal: 0 });
			expect(wire.endNode).toEqual({ componentId: 'comp2', terminal: 1 });
			expect(wire.segments).toEqual([
				{ x: 10, y: 20 },
				{ x: 30, y: 40 },
			]);
		});

		it('should handle missing segments array', () => {
			const json = {
				id: 'wire-123',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
			};

			const wire = Wire.fromJSON(json);

			expect(wire.segments).toEqual([]);
		});
	});

	describe('serialization round-trip', () => {
		it('should preserve all data through serialization and deserialization', () => {
			const originalWire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			originalWire.addSegment(10, 20);
			originalWire.addSegment(30, 40);
			originalWire.addSegment(50, 60);

			const json = originalWire.toJSON();
			const restoredWire = Wire.fromJSON(json);

			expect(restoredWire.id).toBe(originalWire.id);
			expect(restoredWire.startNode).toEqual(originalWire.startNode);
			expect(restoredWire.endNode).toEqual(originalWire.endNode);
			expect(restoredWire.segments).toEqual(originalWire.segments);
		});
	});
});
