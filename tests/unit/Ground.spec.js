import { Ground } from '@/models/Ground';

describe('Ground', () => {
	describe('constructor', () => {
		it('should initialize with ground type', () => {
			const ground = new Ground(10, 20);

			expect(ground.type).toBe('ground');
		});

		it('should initialize with provided position', () => {
			const ground = new Ground(10, 20);

			expect(ground.x).toBe(10);
			expect(ground.y).toBe(20);
		});

		it('should initialize with empty parameters object', () => {
			const ground = new Ground(0, 0);

			expect(ground.parameters).toEqual({});
		});

		it('should initialize with empty label', () => {
			const ground = new Ground(0, 0);

			expect(ground.label).toBe('');
		});

		it('should initialize with one terminal', () => {
			const ground = new Ground(0, 0);

			expect(ground.terminals).toHaveLength(1);
		});

		it('should have terminal at center position', () => {
			const ground = new Ground(0, 0);

			expect(ground.terminals[0]).toEqual({ x: 0, y: 0 });
		});

		it('should generate a unique id', () => {
			const ground1 = new Ground(0, 0);
			const ground2 = new Ground(0, 0);

			expect(ground1.id).toBeDefined();
			expect(ground2.id).toBeDefined();
			expect(ground1.id).not.toBe(ground2.id);
		});
	});

	describe('validate', () => {
		it('should return valid for properly configured ground', () => {
			const ground = new Ground(10, 20);

			const result = ground.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect if ground has a label', () => {
			const ground = new Ground(10, 20);
			ground.label = 'GND1';

			const result = ground.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Ground component should not have a label'))).toBe(true);
		});

		it('should detect if ground has incorrect number of terminals', () => {
			const ground = new Ground(10, 20);
			ground.terminals = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

			const result = ground.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Ground component must have exactly one terminal'))).toBe(true);
		});

		it('should detect if ground has no terminals', () => {
			const ground = new Ground(10, 20);
			ground.terminals = [];

			const result = ground.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Ground component must have exactly one terminal'))).toBe(true);
		});
	});

	describe('toJSON', () => {
		it('should serialize ground to JSON format', () => {
			const ground = new Ground(10, 20);

			const json = ground.toJSON();

			expect(json.type).toBe('ground');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.label).toBe('');
			expect(json.parameters).toEqual({});
		});

		it('should include rotation in JSON', () => {
			const ground = new Ground(10, 20);
			ground.rotation = 90;

			const json = ground.toJSON();

			expect(json.rotation).toBe(90);
		});

		it('should include id in JSON', () => {
			const ground = new Ground(10, 20);

			const json = ground.toJSON();

			expect(json.id).toBeDefined();
			expect(typeof json.id).toBe('string');
		});
	});

	describe('fromJSON', () => {
		it('should deserialize ground from JSON format', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {},
				terminals: [{ x: 0, y: 0 }]
			};

			const ground = Ground.fromJSON(json);

			expect(ground.id).toBe('test-id');
			expect(ground.type).toBe('ground');
			expect(ground.x).toBe(10);
			expect(ground.y).toBe(20);
			expect(ground.rotation).toBe(90);
			expect(ground.parameters).toEqual({});
			expect(ground.terminals).toEqual([{ x: 0, y: 0 }]);
		});

		it('should ensure label is empty even if provided in JSON', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				label: 'GND1',
				x: 10,
				y: 20,
				parameters: {}
			};

			const ground = Ground.fromJSON(json);

			expect(ground.label).toBe('');
		});

		it('should use default rotation if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				x: 10,
				y: 20,
				parameters: {}
			};

			const ground = Ground.fromJSON(json);

			expect(ground.rotation).toBe(0);
		});

		it('should use default terminals if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				x: 10,
				y: 20,
				parameters: {}
			};

			const ground = Ground.fromJSON(json);

			expect(ground.terminals).toEqual([{ x: 0, y: 0 }]);
		});

		it('should use empty parameters if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				x: 10,
				y: 20
			};

			const ground = Ground.fromJSON(json);

			expect(ground.parameters).toEqual({});
		});
	});
});
