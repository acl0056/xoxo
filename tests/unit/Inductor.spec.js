import { Inductor } from '@/models/Inductor';

describe('Inductor', () => {
	describe('constructor', () => {
		it('should initialize with inductor type', () => {
			const inductor = new Inductor(10, 20);

			expect(inductor.type).toBe('inductor');
		});

		it('should initialize with provided position', () => {
			const inductor = new Inductor(10, 20);

			expect(inductor.x).toBe(10);
			expect(inductor.y).toBe(20);
		});

		it('should initialize with default inductance of 1 millihenry', () => {
			const inductor = new Inductor(0, 0);

			expect(inductor.parameters.inductance).toBe(1e-3);
		});

		it('should initialize with default tolerance of 10%', () => {
			const inductor = new Inductor(0, 0);

			expect(inductor.parameters.tolerance).toBe(10);
		});

		it('should initialize with default ESR of 0', () => {
			const inductor = new Inductor(0, 0);

			expect(inductor.parameters.esr).toBe(0.0);
		});

		it('should initialize with normal state', () => {
			const inductor = new Inductor(0, 0);

			expect(inductor.parameters.state).toBe('normal');
		});

		it('should initialize with two terminals', () => {
			const inductor = new Inductor(0, 0);

			expect(inductor.terminals).toHaveLength(2);
		});

		it('should have terminals at -3 and +3 from center', () => {
			const inductor = new Inductor(0, 0);

			expect(inductor.terminals[0]).toEqual({ x: -3, y: 0 });
			expect(inductor.terminals[1]).toEqual({ x: 3, y: 0 });
		});

		it('should generate a unique id', () => {
			const inductor1 = new Inductor(0, 0);
			const inductor2 = new Inductor(0, 0);

			expect(inductor1.id).toBeDefined();
			expect(inductor2.id).toBeDefined();
			expect(inductor1.id).not.toBe(inductor2.id);
		});
	});

	describe('validate', () => {
		it('should return valid for properly configured inductor', () => {
			const inductor = new Inductor(10, 20);

			const result = inductor.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect invalid inductance (negative)', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.inductance = -5;

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Inductance must be a positive number'))).toBe(true);
		});

		it('should detect invalid inductance (zero)', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.inductance = 0;

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Inductance must be a positive number'))).toBe(true);
		});

		it('should detect invalid inductance (non-number)', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.inductance = 'invalid';

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Inductance must be a positive number'))).toBe(true);
		});

		it('should detect invalid tolerance (negative)', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.tolerance = -5;

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Tolerance must be a number between 0 and 100'))).toBe(true);
		});

		it('should detect invalid tolerance (over 100)', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.tolerance = 150;

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Tolerance must be a number between 0 and 100'))).toBe(true);
		});

		it('should accept tolerance of 0', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.tolerance = 0;

			const result = inductor.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept tolerance of 100', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.tolerance = 100;

			const result = inductor.validate();

			expect(result.valid).toBe(true);
		});

		it('should detect invalid ESR (negative)', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.esr = -1;

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('ESR must be a non-negative number'))).toBe(true);
		});

		it('should accept ESR of 0', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.esr = 0;

			const result = inductor.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept positive ESR values', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.esr = 0.5;

			const result = inductor.validate();

			expect(result.valid).toBe(true);
		});

		it('should detect invalid state', () => {
			const inductor = new Inductor(10, 20);
			inductor.parameters.state = 'invalid';

			const result = inductor.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('State must be one of: normal, open, short'))).toBe(true);
		});

		it('should accept all valid states', () => {
			const validStates = ['normal', 'open', 'short'];

			validStates.forEach(state => {
				const inductor = new Inductor(10, 20);
				inductor.parameters.state = state;
				const result = inductor.validate();

				expect(result.valid).toBe(true);
			});
		});
	});

	describe('toJSON', () => {
		it('should serialize inductor to JSON format', () => {
			const inductor = new Inductor(10, 20);
			inductor.label = 'L1';
			inductor.parameters.inductance = 2e-3;
			inductor.parameters.esr = 0.2;

			const json = inductor.toJSON();

			expect(json.type).toBe('inductor');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.label).toBe('L1');
			expect(json.parameters.inductance).toBe(2e-3);
			expect(json.parameters.tolerance).toBe(10);
			expect(json.parameters.esr).toBe(0.2);
			expect(json.parameters.state).toBe('normal');
		});

		it('should include all parameter fields', () => {
			const inductor = new Inductor(0, 0);

			const json = inductor.toJSON();

			expect(json.parameters).toHaveProperty('inductance');
			expect(json.parameters).toHaveProperty('tolerance');
			expect(json.parameters).toHaveProperty('esr');
			expect(json.parameters).toHaveProperty('state');
		});
	});

	describe('fromJSON', () => {
		it('should deserialize inductor from JSON format', () => {
			const json = {
				id: 'test-id',
				type: 'inductor',
				label: 'L1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {
					inductance: 2e-3,
					tolerance: 10,
					esr: 0.2,
					state: 'normal'
				},
				terminals: [{ x: -3, y: 0 }, { x: 3, y: 0 }]
			};

			const inductor = Inductor.fromJSON(json);

			expect(inductor.id).toBe('test-id');
			expect(inductor.type).toBe('inductor');
			expect(inductor.label).toBe('L1');
			expect(inductor.x).toBe(10);
			expect(inductor.y).toBe(20);
			expect(inductor.rotation).toBe(90);
			expect(inductor.parameters.inductance).toBe(2e-3);
			expect(inductor.parameters.tolerance).toBe(10);
			expect(inductor.parameters.esr).toBe(0.2);
			expect(inductor.parameters.state).toBe('normal');
			expect(inductor.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});

		it('should use default label if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'inductor',
				x: 10,
				y: 20,
				parameters: {
					inductance: 2e-3,
					tolerance: 10,
					esr: 0.2,
					state: 'normal'
				}
			};

			const inductor = Inductor.fromJSON(json);

			expect(inductor.label).toBe('');
		});

		it('should use default rotation if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'inductor',
				x: 10,
				y: 20,
				parameters: {
					inductance: 2e-3,
					tolerance: 10,
					esr: 0.2,
					state: 'normal'
				}
			};

			const inductor = Inductor.fromJSON(json);

			expect(inductor.rotation).toBe(0);
		});

		it('should use default terminals if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'inductor',
				x: 10,
				y: 20,
				parameters: {
					inductance: 2e-3,
					tolerance: 10,
					esr: 0.2,
					state: 'normal'
				}
			};

			const inductor = Inductor.fromJSON(json);

			expect(inductor.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});
	});
});
