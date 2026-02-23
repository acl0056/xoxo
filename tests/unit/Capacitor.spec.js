import { Capacitor } from '@/models/Capacitor';

describe('Capacitor', () => {
	describe('constructor', () => {
		it('should initialize with capacitor type', () => {
			const capacitor = new Capacitor(10, 20);

			expect(capacitor.type).toBe('capacitor');
		});

		it('should initialize with provided position', () => {
			const capacitor = new Capacitor(10, 20);

			expect(capacitor.x).toBe(10);
			expect(capacitor.y).toBe(20);
		});

		it('should initialize with default capacitance of 10 microfarads', () => {
			const capacitor = new Capacitor(0, 0);

			expect(capacitor.parameters.capacitance).toBe(10e-6);
		});

		it('should initialize with default tolerance of 10%', () => {
			const capacitor = new Capacitor(0, 0);

			expect(capacitor.parameters.tolerance).toBe(10);
		});

		it('should initialize with default ESR of 0', () => {
			const capacitor = new Capacitor(0, 0);

			expect(capacitor.parameters.esr).toBe(0.0);
		});

		it('should initialize with normal state', () => {
			const capacitor = new Capacitor(0, 0);

			expect(capacitor.parameters.state).toBe('normal');
		});

		it('should initialize with two terminals', () => {
			const capacitor = new Capacitor(0, 0);

			expect(capacitor.terminals).toHaveLength(2);
		});

		it('should have terminals at -3 and +3 from center', () => {
			const capacitor = new Capacitor(0, 0);

			expect(capacitor.terminals[0]).toEqual({ x: -3, y: 0 });
			expect(capacitor.terminals[1]).toEqual({ x: 3, y: 0 });
		});

		it('should generate a unique id', () => {
			const capacitor1 = new Capacitor(0, 0);
			const capacitor2 = new Capacitor(0, 0);

			expect(capacitor1.id).toBeDefined();
			expect(capacitor2.id).toBeDefined();
			expect(capacitor1.id).not.toBe(capacitor2.id);
		});
	});

	describe('validate', () => {
		it('should return valid for properly configured capacitor', () => {
			const capacitor = new Capacitor(10, 20);

			const result = capacitor.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect invalid capacitance (negative)', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.capacitance = -5;

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Capacitance must be a positive number'))).toBe(true);
		});

		it('should detect invalid capacitance (zero)', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.capacitance = 0;

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Capacitance must be a positive number'))).toBe(true);
		});

		it('should detect invalid capacitance (non-number)', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.capacitance = 'invalid';

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Capacitance must be a positive number'))).toBe(true);
		});

		it('should detect invalid tolerance (negative)', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.tolerance = -5;

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Tolerance must be a number between 0 and 100'))).toBe(true);
		});

		it('should detect invalid tolerance (over 100)', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.tolerance = 150;

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Tolerance must be a number between 0 and 100'))).toBe(true);
		});

		it('should accept tolerance of 0', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.tolerance = 0;

			const result = capacitor.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept tolerance of 100', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.tolerance = 100;

			const result = capacitor.validate();

			expect(result.valid).toBe(true);
		});

		it('should detect invalid ESR (negative)', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.esr = -1;

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('ESR must be a non-negative number'))).toBe(true);
		});

		it('should accept ESR of 0', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.esr = 0;

			const result = capacitor.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept positive ESR values', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.esr = 0.5;

			const result = capacitor.validate();

			expect(result.valid).toBe(true);
		});

		it('should detect invalid state', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.parameters.state = 'invalid';

			const result = capacitor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('State must be one of: normal, open, short'))).toBe(true);
		});

		it('should accept all valid states', () => {
			const validStates = ['normal', 'open', 'short'];

			validStates.forEach(state => {
				const capacitor = new Capacitor(10, 20);
				capacitor.parameters.state = state;
				const result = capacitor.validate();

				expect(result.valid).toBe(true);
			});
		});
	});

	describe('toJSON', () => {
		it('should serialize capacitor to JSON format', () => {
			const capacitor = new Capacitor(10, 20);
			capacitor.label = 'C1';
			capacitor.parameters.capacitance = 100e-6;
			capacitor.parameters.esr = 0.1;

			const json = capacitor.toJSON();

			expect(json.type).toBe('capacitor');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.label).toBe('C1');
			expect(json.parameters.capacitance).toBe(100e-6);
			expect(json.parameters.tolerance).toBe(10);
			expect(json.parameters.esr).toBe(0.1);
			expect(json.parameters.state).toBe('normal');
		});

		it('should include all parameter fields', () => {
			const capacitor = new Capacitor(0, 0);

			const json = capacitor.toJSON();

			expect(json.parameters).toHaveProperty('capacitance');
			expect(json.parameters).toHaveProperty('tolerance');
			expect(json.parameters).toHaveProperty('esr');
			expect(json.parameters).toHaveProperty('state');
		});
	});

	describe('fromJSON', () => {
		it('should deserialize capacitor from JSON format', () => {
			const json = {
				id: 'test-id',
				type: 'capacitor',
				label: 'C1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {
					capacitance: 100e-6,
					tolerance: 10,
					esr: 0.1,
					state: 'normal'
				},
				terminals: [{ x: -3, y: 0 }, { x: 3, y: 0 }]
			};

			const capacitor = Capacitor.fromJSON(json);

			expect(capacitor.id).toBe('test-id');
			expect(capacitor.type).toBe('capacitor');
			expect(capacitor.label).toBe('C1');
			expect(capacitor.x).toBe(10);
			expect(capacitor.y).toBe(20);
			expect(capacitor.rotation).toBe(90);
			expect(capacitor.parameters.capacitance).toBe(100e-6);
			expect(capacitor.parameters.tolerance).toBe(10);
			expect(capacitor.parameters.esr).toBe(0.1);
			expect(capacitor.parameters.state).toBe('normal');
			expect(capacitor.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});

		it('should use default label if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'capacitor',
				x: 10,
				y: 20,
				parameters: {
					capacitance: 100e-6,
					tolerance: 10,
					esr: 0.1,
					state: 'normal'
				}
			};

			const capacitor = Capacitor.fromJSON(json);

			expect(capacitor.label).toBe('');
		});

		it('should use default rotation if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'capacitor',
				x: 10,
				y: 20,
				parameters: {
					capacitance: 100e-6,
					tolerance: 10,
					esr: 0.1,
					state: 'normal'
				}
			};

			const capacitor = Capacitor.fromJSON(json);

			expect(capacitor.rotation).toBe(0);
		});

		it('should use default terminals if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'capacitor',
				x: 10,
				y: 20,
				parameters: {
					capacitance: 100e-6,
					tolerance: 10,
					esr: 0.1,
					state: 'normal'
				}
			};

			const capacitor = Capacitor.fromJSON(json);

			expect(capacitor.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});
	});
});
