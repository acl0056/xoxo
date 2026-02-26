import fc from 'fast-check';
import { VoltageSource } from '../../src/models/VoltageSource';

/**
 * Property 25: Voltage Source Calculation
 *
 * **Validates: Requirements 17.1, 17.2, 17.3**
 *
 * For any voltage source with power P watts and reference impedance Z ohms,
 * the calculated voltage should equal sqrt(P * Z) volts RMS.
 */
describe('Feature: crossover-network-simulator, Property 25: Voltage source calculation', () => {
	it('should calculate voltage as sqrt(P * Z) for any valid power and impedance', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 0.001, max: 1000, noNaN: true }),
					impedance: fc.double({ min: 0.1, max: 100, noNaN: true }),
				}),
				(params) => {
					const source = new VoltageSource(0, 0);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					const calculatedVoltage = source.getVoltage();
					const expectedVoltage = Math.sqrt(params.power * params.impedance);

					// Voltage should match the formula V = sqrt(P * Z)
					expect(calculatedVoltage).toBeCloseTo(expectedVoltage, 10);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should maintain voltage calculation accuracy across wide range of values', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 0.0001, max: 10000, noNaN: true }),
					impedance: fc.double({ min: 0.01, max: 1000, noNaN: true }),
				}),
				(params) => {
					const source = new VoltageSource(10, 20);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					const voltage = source.getVoltage();

					// Voltage should be positive
					expect(voltage).toBeGreaterThan(0);

					// Voltage should satisfy V^2 = P * Z
					const voltageSquared = voltage * voltage;
					const powerTimesImpedance = params.power * params.impedance;

					expect(voltageSquared).toBeCloseTo(powerTimesImpedance, 5);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should calculate correct voltage for standard audio power levels', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(
					{ power: 1, impedance: 8 }, // 2.828 Vrms
					{ power: 2, impedance: 8 }, // 4.0 Vrms
					{ power: 5, impedance: 8 }, // 6.325 Vrms
					{ power: 10, impedance: 8 }, // 8.944 Vrms
					{ power: 50, impedance: 8 }, // 20.0 Vrms
					{ power: 100, impedance: 8 }, // 28.284 Vrms
					{ power: 1, impedance: 4 }, // 2.0 Vrms
					{ power: 1, impedance: 16 }, // 4.0 Vrms
				),
				(params) => {
					const source = new VoltageSource(0, 0);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					const voltage = source.getVoltage();
					const expectedVoltage = Math.sqrt(params.power * params.impedance);

					expect(voltage).toBeCloseTo(expectedVoltage, 3);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should initialize with default voltage of 2.828 Vrms (1W at 8Ω)', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -100, max: 100 }),
				fc.integer({ min: -100, max: 100 }),
				(x, y) => {
					const source = new VoltageSource(x, y);

					// Default parameters should be 1W at 8 ohms
					expect(source.parameters.power).toBe(1.0);
					expect(source.parameters.impedance).toBe(8.0);

					// Default voltage should be sqrt(1 * 8) = 2.828... Vrms
					const voltage = source.getVoltage();
					expect(voltage).toBeCloseTo(2.828427124746190, 10);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should maintain voltage calculation after serialization round-trip', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 0.1, max: 100, noNaN: true }),
					impedance: fc.double({ min: 1, max: 32, noNaN: true }),
					delay: fc.double({ min: 0, max: 100, noNaN: true }),
					inverted: fc.boolean(),
				}),
				(params) => {
					const source = new VoltageSource(15, 25);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;
					source.parameters.delay = params.delay;
					source.parameters.inverted = params.inverted;

					const originalVoltage = source.getVoltage();

					// Serialize and deserialize
					const json = source.toJSON();
					const restored = VoltageSource.fromJSON(json);

					const restoredVoltage = restored.getVoltage();

					// Voltage calculation should be identical after round-trip
					expect(restoredVoltage).toBeCloseTo(originalVoltage, 10);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should calculate voltage independently of other parameters', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 0.5, max: 50, noNaN: true }),
					impedance: fc.double({ min: 2, max: 16, noNaN: true }),
					delay: fc.double({ min: 0, max: 50, noNaN: true }),
					inverted: fc.boolean(),
					x: fc.integer({ min: -50, max: 50 }),
					y: fc.integer({ min: -50, max: 50 }),
					rotation: fc.constantFrom(0, 90, 180, 270),
				}),
				(params) => {
					const source = new VoltageSource(params.x, params.y);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;
					source.parameters.delay = params.delay;
					source.parameters.inverted = params.inverted;
					source.rotation = params.rotation;

					const voltage = source.getVoltage();
					const expectedVoltage = Math.sqrt(params.power * params.impedance);

					// Voltage should only depend on power and impedance
					// Not on delay, inverted, position, or rotation
					expect(voltage).toBeCloseTo(expectedVoltage, 10);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should handle edge case of very small power values', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 1e-6, max: 1e-3, noNaN: true }),
					impedance: fc.double({ min: 4, max: 16, noNaN: true }),
				}),
				(params) => {
					const source = new VoltageSource(0, 0);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					const voltage = source.getVoltage();
					const expectedVoltage = Math.sqrt(params.power * params.impedance);

					// Should handle very small power values accurately
					expect(voltage).toBeCloseTo(expectedVoltage, 10);
					expect(voltage).toBeGreaterThan(0);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should handle edge case of very large power values', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 1000, max: 10000, noNaN: true }),
					impedance: fc.double({ min: 4, max: 16, noNaN: true }),
				}),
				(params) => {
					const source = new VoltageSource(0, 0);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					const voltage = source.getVoltage();
					const expectedVoltage = Math.sqrt(params.power * params.impedance);

					// Should handle very large power values accurately
					expect(voltage).toBeCloseTo(expectedVoltage, 5);
					expect(voltage).toBeGreaterThan(0);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should satisfy the relationship P = V^2 / Z', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 0.1, max: 500, noNaN: true }),
					impedance: fc.double({ min: 1, max: 50, noNaN: true }),
				}),
				(params) => {
					const source = new VoltageSource(0, 0);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					const voltage = source.getVoltage();

					// Verify the power relationship: P = V^2 / Z
					const calculatedPower = (voltage * voltage) / params.impedance;

					expect(calculatedPower).toBeCloseTo(params.power, 5);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should scale voltage proportionally with square root of power', () => {
		fc.assert(
			fc.property(
				fc.record({
					basePower: fc.double({ min: 1, max: 100, noNaN: true }),
					impedance: fc.double({ min: 4, max: 16, noNaN: true }),
					powerMultiplier: fc.constantFrom(2, 4, 10, 100),
				}),
				(params) => {
					const source1 = new VoltageSource(0, 0);
					source1.parameters.power = params.basePower;
					source1.parameters.impedance = params.impedance;

					const source2 = new VoltageSource(0, 0);
					source2.parameters.power = params.basePower * params.powerMultiplier;
					source2.parameters.impedance = params.impedance;

					const voltage1 = source1.getVoltage();
					const voltage2 = source2.getVoltage();

					// Voltage should scale with square root of power
					const voltageRatio = voltage2 / voltage1;
					const expectedRatio = Math.sqrt(params.powerMultiplier);

					expect(voltageRatio).toBeCloseTo(expectedRatio, 5);
				},
			),
			{ numRuns: 100 },
		);
	});
});
