import fc from 'fast-check';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';

describe('Feature: crossover-network-simulator, Property 10: Parameter validation rejects invalid values', () => {
	describe('Resistor parameter validation', () => {
		test('should reject negative resistance', () => {
			fc.assert(
				fc.property(fc.double({ max: 0, noNaN: true }), (invalidResistance) => {
					const resistor = new Resistor(0, 0);
					const originalValue = resistor.parameters.resistance;
					
					// Attempt to set invalid value
					resistor.parameters.resistance = invalidResistance;
					
					// Should either throw or retain original value
					// (Implementation may vary - either is acceptable)
					const isRejected = resistor.parameters.resistance === originalValue || 
						resistor.parameters.resistance > 0;
					
					expect(isRejected).toBe(true);
				}),
				{ numRuns: 100 }
			);
		});

		test('should reject invalid tolerance', () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.double({ max: -0.1, noNaN: true }), // negative
						fc.double({ min: 100.1, noNaN: true }) // > 100%
					),
					(invalidTolerance) => {
						const resistor = new Resistor(0, 0);
						const originalValue = resistor.parameters.tolerance;
						
						// Attempt to set invalid value
						resistor.parameters.tolerance = invalidTolerance;
						
						// Should either throw or retain original value
						const isRejected = resistor.parameters.tolerance === originalValue ||
							(resistor.parameters.tolerance >= 0 && resistor.parameters.tolerance <= 100);
						
						expect(isRejected).toBe(true);
					}
				),
				{ numRuns: 100 }
			);
		});
	});

	describe('Capacitor parameter validation', () => {
		test('should reject non-positive capacitance', () => {
			fc.assert(
				fc.property(fc.double({ max: 0, noNaN: true }), (invalidCapacitance) => {
					const capacitor = new Capacitor(0, 0);
					const originalValue = capacitor.parameters.capacitance;
					
					// Attempt to set invalid value
					capacitor.parameters.capacitance = invalidCapacitance;
					
					// Should either throw or retain original value
					const isRejected = capacitor.parameters.capacitance === originalValue ||
						capacitor.parameters.capacitance > 0;
					
					expect(isRejected).toBe(true);
				}),
				{ numRuns: 100 }
			);
		});

		test('should reject negative ESR', () => {
			fc.assert(
				fc.property(fc.double({ max: -0.001, noNaN: true }), (invalidESR) => {
					const capacitor = new Capacitor(0, 0);
					const originalValue = capacitor.parameters.esr;
					
					// Attempt to set invalid value
					capacitor.parameters.esr = invalidESR;
					
					// Should either throw or retain original value
					const isRejected = capacitor.parameters.esr === originalValue ||
						capacitor.parameters.esr >= 0;
					
					expect(isRejected).toBe(true);
				}),
				{ numRuns: 100 }
			);
		});

		test('should reject invalid state', () => {
			fc.assert(
				fc.property(
					fc.string().filter(s => !['normal', 'open', 'short'].includes(s)),
					(invalidState) => {
						const capacitor = new Capacitor(0, 0);
						const originalValue = capacitor.parameters.state;
						
						// Attempt to set invalid value
						capacitor.parameters.state = invalidState;
						
						// Should either throw or retain original value
						const isRejected = capacitor.parameters.state === originalValue ||
							['normal', 'open', 'short'].includes(capacitor.parameters.state);
						
						expect(isRejected).toBe(true);
					}
				),
				{ numRuns: 100 }
			);
		});
	});

	describe('Inductor parameter validation', () => {
		test('should reject non-positive inductance', () => {
			fc.assert(
				fc.property(fc.double({ max: 0, noNaN: true }), (invalidInductance) => {
					const inductor = new Inductor(0, 0);
					const originalValue = inductor.parameters.inductance;
					
					// Attempt to set invalid value
					inductor.parameters.inductance = invalidInductance;
					
					// Should either throw or retain original value
					const isRejected = inductor.parameters.inductance === originalValue ||
						inductor.parameters.inductance > 0;
					
					expect(isRejected).toBe(true);
				}),
				{ numRuns: 100 }
			);
		});

		test('should reject negative ESR', () => {
			fc.assert(
				fc.property(fc.double({ max: -0.001, noNaN: true }), (invalidESR) => {
					const inductor = new Inductor(0, 0);
					const originalValue = inductor.parameters.esr;
					
					// Attempt to set invalid value
					inductor.parameters.esr = invalidESR;
					
					// Should either throw or retain original value
					const isRejected = inductor.parameters.esr === originalValue ||
						inductor.parameters.esr >= 0;
					
					expect(isRejected).toBe(true);
				}),
				{ numRuns: 100 }
			);
		});
	});

	describe('Valid parameter values should be accepted', () => {
		test('should accept valid resistance values', () => {
			fc.assert(
				fc.property(fc.double({ min: 0.001, max: 1e9, noNaN: true }), (validResistance) => {
					const resistor = new Resistor(0, 0);
					resistor.parameters.resistance = validResistance;
					
					// Should accept the value
					expect(resistor.parameters.resistance).toBeCloseTo(validResistance, 10);
				}),
				{ numRuns: 100 }
			);
		});

		test('should accept valid capacitance values', () => {
			fc.assert(
				fc.property(fc.double({ min: 1e-12, max: 1, noNaN: true }), (validCapacitance) => {
					const capacitor = new Capacitor(0, 0);
					capacitor.parameters.capacitance = validCapacitance;
					
					// Should accept the value
					expect(capacitor.parameters.capacitance).toBeCloseTo(validCapacitance, 10);
				}),
				{ numRuns: 100 }
			);
		});

		test('should accept valid inductance values', () => {
			fc.assert(
				fc.property(fc.double({ min: 1e-9, max: 1, noNaN: true }), (validInductance) => {
					const inductor = new Inductor(0, 0);
					inductor.parameters.inductance = validInductance;
					
					// Should accept the value
					expect(inductor.parameters.inductance).toBeCloseTo(validInductance, 10);
				}),
				{ numRuns: 100 }
			);
		});

		test('should accept valid tolerance values', () => {
			fc.assert(
				fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (validTolerance) => {
					const resistor = new Resistor(0, 0);
					resistor.parameters.tolerance = validTolerance;
					
					// Should accept the value
					expect(resistor.parameters.tolerance).toBeCloseTo(validTolerance, 10);
				}),
				{ numRuns: 100 }
			);
		});

		test('should accept valid ESR values', () => {
			fc.assert(
				fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (validESR) => {
					const capacitor = new Capacitor(0, 0);
					capacitor.parameters.esr = validESR;
					
					// Should accept the value
					expect(capacitor.parameters.esr).toBeCloseTo(validESR, 10);
				}),
				{ numRuns: 100 }
			);
		});

		test('should accept valid state values', () => {
			fc.assert(
				fc.property(fc.constantFrom('normal', 'open', 'short'), (validState) => {
					const resistor = new Resistor(0, 0);
					resistor.parameters.state = validState;
					
					// Should accept the value
					expect(resistor.parameters.state).toBe(validState);
				}),
				{ numRuns: 100 }
			);
		});
	});
});
