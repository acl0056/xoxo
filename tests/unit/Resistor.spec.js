import { Resistor } from '@/models/Resistor';

describe('Resistor', () => {
	describe('constructor', () => {
		it('should initialize with resistor type', () => {
			const resistor = new Resistor(10, 20);

			expect(resistor.type).toBe('resistor');
		});

		it('should initialize with provided position', () => {
			const resistor = new Resistor(10, 20);

			expect(resistor.x).toBe(10);
			expect(resistor.y).toBe(20);
		});

		it('should initialize with default resistance of 8 ohms', () => {
			const resistor = new Resistor(0, 0);

			expect(resistor.parameters.resistance).toBe(8.0);
		});

		it('should initialize with default tolerance of 5%', () => {
			const resistor = new Resistor(0, 0);

			expect(resistor.parameters.tolerance).toBe(5);
		});

		it('should initialize with normal state', () => {
			const resistor = new Resistor(0, 0);

			expect(resistor.parameters.state).toBe('normal');
		});

		it('should initialize with two terminals', () => {
			const resistor = new Resistor(0, 0);

			expect(resistor.terminals).toHaveLength(2);
		});

		it('should have terminals at -3 and +3 from center', () => {
			const resistor = new Resistor(0, 0);

			expect(resistor.terminals[0]).toEqual({ x: -3, y: 0 });
			expect(resistor.terminals[1]).toEqual({ x: 3, y: 0 });
		});

		it('should generate a unique id', () => {
			const resistor1 = new Resistor(0, 0);
			const resistor2 = new Resistor(0, 0);

			expect(resistor1.id).toBeDefined();
			expect(resistor2.id).toBeDefined();
			expect(resistor1.id).not.toBe(resistor2.id);
		});
	});

	describe('validate', () => {
		it('should return valid for properly configured resistor', () => {
			const resistor = new Resistor(10, 20);

			const result = resistor.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect invalid resistance (negative)', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.resistance = -5;

			const result = resistor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Resistance must be a positive number'))).toBe(true);
		});

		it('should detect invalid resistance (zero)', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.resistance = 0;

			const result = resistor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Resistance must be a positive number'))).toBe(true);
		});

		it('should detect invalid resistance (non-number)', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.resistance = 'invalid';

			const result = resistor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Resistance must be a positive number'))).toBe(true);
		});

		it('should detect invalid tolerance (negative)', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.tolerance = -5;

			const result = resistor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Tolerance must be a number between 0 and 100'))).toBe(true);
		});

		it('should detect invalid tolerance (over 100)', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.tolerance = 150;

			const result = resistor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Tolerance must be a number between 0 and 100'))).toBe(true);
		});

		it('should accept tolerance of 0', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.tolerance = 0;

			const result = resistor.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept tolerance of 100', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.tolerance = 100;

			const result = resistor.validate();

			expect(result.valid).toBe(true);
		});

		it('should detect invalid state', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.state = 'invalid';

			const result = resistor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('State must be one of: normal, open, short'))).toBe(true);
		});

		it('should accept all valid states', () => {
			const validStates = ['normal', 'open', 'short'];

			validStates.forEach(state => {
				const resistor = new Resistor(10, 20);
				resistor.parameters.state = state;
				const result = resistor.validate();

				expect(result.valid).toBe(true);
			});
		});
	});

	describe('toJSON', () => {
		it('should serialize resistor to JSON format', () => {
			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			resistor.parameters.resistance = 1000;

			const json = resistor.toJSON();

			expect(json.type).toBe('resistor');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.label).toBe('R1');
			expect(json.parameters.resistance).toBe(1000);
			expect(json.parameters.tolerance).toBe(5);
			expect(json.parameters.state).toBe('normal');
		});

		it('should include all parameter fields', () => {
			const resistor = new Resistor(0, 0);

			const json = resistor.toJSON();

			expect(json.parameters).toHaveProperty('resistance');
			expect(json.parameters).toHaveProperty('tolerance');
			expect(json.parameters).toHaveProperty('state');
		});
	});

	describe('fromJSON', () => {
		it('should deserialize resistor from JSON format', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				label: 'R1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {
					resistance: 1000,
					tolerance: 5,
					state: 'normal'
				},
				terminals: [{ x: -3, y: 0 }, { x: 3, y: 0 }]
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.id).toBe('test-id');
			expect(resistor.type).toBe('resistor');
			expect(resistor.label).toBe('R1');
			expect(resistor.x).toBe(10);
			expect(resistor.y).toBe(20);
			expect(resistor.rotation).toBe(90);
			expect(resistor.parameters.resistance).toBe(1000);
			expect(resistor.parameters.tolerance).toBe(5);
			expect(resistor.parameters.state).toBe('normal');
			expect(resistor.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});

		it('should use default label if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				x: 10,
				y: 20,
				parameters: {
					resistance: 1000,
					tolerance: 5,
					state: 'normal'
				}
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.label).toBe('');
		});

		it('should use default rotation if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				x: 10,
				y: 20,
				parameters: {
					resistance: 1000,
					tolerance: 5,
					state: 'normal'
				}
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.rotation).toBe(0);
		});

		it('should use default terminals if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				x: 10,
				y: 20,
				parameters: {
					resistance: 1000,
					tolerance: 5,
					state: 'normal'
				}
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});
	});
});
