import { VoltageSource } from '@/models/VoltageSource';

describe('VoltageSource', () => {
	describe('constructor', () => {
		it('should initialize with source type', () => {
			const source = new VoltageSource(10, 20);

			expect(source.type).toBe('source');
		});

		it('should initialize with provided position', () => {
			const source = new VoltageSource(10, 20);

			expect(source.x).toBe(10);
			expect(source.y).toBe(20);
		});

		it('should initialize with default power of 1W', () => {
			const source = new VoltageSource(0, 0);

			expect(source.parameters.power).toBe(1.0);
		});

		it('should initialize with default impedance of 8 ohms', () => {
			const source = new VoltageSource(0, 0);

			expect(source.parameters.impedance).toBe(8.0);
		});

		it('should initialize with default delay of 0ms', () => {
			const source = new VoltageSource(0, 0);

			expect(source.parameters.delay).toBe(0.0);
		});

		it('should initialize with inverted set to false', () => {
			const source = new VoltageSource(0, 0);

			expect(source.parameters.inverted).toBe(false);
		});

		it('should initialize with two terminals', () => {
			const source = new VoltageSource(0, 0);

			expect(source.terminals).toHaveLength(2);
		});

		it('should have terminals at correct positions', () => {
			const source = new VoltageSource(0, 0);

			expect(source.terminals[0]).toEqual({ x: 3, y: -2 });
			expect(source.terminals[1]).toEqual({ x: 3, y: 2 });
		});

		it('should generate a unique id', () => {
			const source1 = new VoltageSource(0, 0);
			const source2 = new VoltageSource(0, 0);

			expect(source1.id).toBeDefined();
			expect(source2.id).toBeDefined();
			expect(source1.id).not.toBe(source2.id);
		});
	});

	describe('getVoltage', () => {
		it('should calculate voltage as sqrt(P * Z) for default values', () => {
			const source = new VoltageSource(0, 0);
			// Default: 1W at 8 ohms = sqrt(1 * 8) = 2.828... Vrms

			const voltage = source.getVoltage();

			expect(voltage).toBeCloseTo(2.828, 3);
		});

		it('should calculate voltage correctly for 2W at 8 ohms', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.power = 2.0;
			source.parameters.impedance = 8.0;
			// sqrt(2 * 8) = sqrt(16) = 4 Vrms

			const voltage = source.getVoltage();

			expect(voltage).toBe(4.0);
		});

		it('should calculate voltage correctly for 1W at 4 ohms', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 4.0;
			// sqrt(1 * 4) = 2 Vrms

			const voltage = source.getVoltage();

			expect(voltage).toBe(2.0);
		});

		it('should calculate voltage correctly for 10W at 8 ohms', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.power = 10.0;
			source.parameters.impedance = 8.0;
			// sqrt(10 * 8) = sqrt(80) = 8.944... Vrms

			const voltage = source.getVoltage();

			expect(voltage).toBeCloseTo(8.944, 3);
		});

		it('should calculate voltage correctly for 100W at 8 ohms', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.power = 100.0;
			source.parameters.impedance = 8.0;
			// sqrt(100 * 8) = sqrt(800) = 28.284... Vrms

			const voltage = source.getVoltage();

			expect(voltage).toBeCloseTo(28.284, 3);
		});
	});

	describe('validate', () => {
		it('should return valid for properly configured voltage source', () => {
			const source = new VoltageSource(10, 20);

			const result = source.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect invalid power (negative)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.power = -5;

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Power must be a positive number'))).toBe(true);
		});

		it('should detect invalid power (zero)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.power = 0;

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Power must be a positive number'))).toBe(true);
		});

		it('should detect invalid power (non-number)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.power = 'invalid';

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Power must be a positive number'))).toBe(true);
		});

		it('should detect invalid impedance (negative)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.impedance = -5;

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Impedance must be a positive number'))).toBe(true);
		});

		it('should detect invalid impedance (zero)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.impedance = 0;

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Impedance must be a positive number'))).toBe(true);
		});

		it('should detect invalid impedance (non-number)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.impedance = 'invalid';

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Impedance must be a positive number'))).toBe(true);
		});

		it('should detect invalid delay (negative)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.delay = -5;

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Delay must be a non-negative number'))).toBe(true);
		});

		it('should accept delay of 0', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.delay = 0;

			const result = source.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept positive delay values', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.delay = 10.5;

			const result = source.validate();

			expect(result.valid).toBe(true);
		});

		it('should detect invalid inverted (non-boolean)', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.inverted = 'invalid';

			const result = source.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Inverted must be a boolean'))).toBe(true);
		});

		it('should accept inverted as true', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.inverted = true;

			const result = source.validate();

			expect(result.valid).toBe(true);
		});

		it('should accept inverted as false', () => {
			const source = new VoltageSource(10, 20);
			source.parameters.inverted = false;

			const result = source.validate();

			expect(result.valid).toBe(true);
		});
	});

	describe('toJSON', () => {
		it('should serialize voltage source to JSON format', () => {
			const source = new VoltageSource(10, 20);
			source.label = 'V1';
			source.parameters.power = 2.0;
			source.parameters.impedance = 4.0;

			const json = source.toJSON();

			expect(json.type).toBe('source');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.label).toBe('V1');
			expect(json.parameters.power).toBe(2.0);
			expect(json.parameters.impedance).toBe(4.0);
			expect(json.parameters.delay).toBe(0.0);
			expect(json.parameters.inverted).toBe(false);
		});

		it('should include all parameter fields', () => {
			const source = new VoltageSource(0, 0);

			const json = source.toJSON();

			expect(json.parameters).toHaveProperty('power');
			expect(json.parameters).toHaveProperty('impedance');
			expect(json.parameters).toHaveProperty('delay');
			expect(json.parameters).toHaveProperty('inverted');
		});

		it('should serialize with inverted set to true', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.inverted = true;

			const json = source.toJSON();

			expect(json.parameters.inverted).toBe(true);
		});
	});

	describe('fromJSON', () => {
		it('should deserialize voltage source from JSON format', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				label: 'V1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {
					power: 2.0,
					impedance: 4.0,
					delay: 5.0,
					inverted: true
				},
				terminals: [{ x: -3, y: 0 }, { x: 3, y: 0 }]
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.id).toBe('test-id');
			expect(source.type).toBe('source');
			expect(source.label).toBe('V1');
			expect(source.x).toBe(10);
			expect(source.y).toBe(20);
			expect(source.rotation).toBe(90);
			expect(source.parameters.power).toBe(2.0);
			expect(source.parameters.impedance).toBe(4.0);
			expect(source.parameters.delay).toBe(5.0);
			expect(source.parameters.inverted).toBe(true);
			expect(source.terminals).toEqual([{ x: -3, y: 0 }, { x: 3, y: 0 }]);
		});

		it('should use default label if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					power: 1.0,
					impedance: 8.0,
					delay: 0.0,
					inverted: false
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.label).toBe('');
		});

		it('should use default rotation if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					power: 1.0,
					impedance: 8.0,
					delay: 0.0,
					inverted: false
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.rotation).toBe(0);
		});

		it('should use default terminals if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					power: 1.0,
					impedance: 8.0,
					delay: 0.0,
					inverted: false
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.terminals).toEqual([{ x: 3, y: -2 }, { x: 3, y: 2 }]);
		});

		it('should use default power if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					impedance: 8.0,
					delay: 0.0,
					inverted: false
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.parameters.power).toBe(1.0);
		});

		it('should use default impedance if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					power: 1.0,
					delay: 0.0,
					inverted: false
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.parameters.impedance).toBe(8.0);
		});

		it('should use default delay if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					power: 1.0,
					impedance: 8.0,
					inverted: false
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.parameters.delay).toBe(0.0);
		});

		it('should use default inverted if not provided', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				x: 10,
				y: 20,
				parameters: {
					power: 1.0,
					impedance: 8.0,
					delay: 0.0
				}
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.parameters.inverted).toBe(false);
		});
	});
});
