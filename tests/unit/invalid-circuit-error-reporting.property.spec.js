/**
 * Property-Based Test: Invalid Circuit Error Reporting (Property 16)
 *
 * Feature: crossover-network-simulator
 * Property 16: Invalid circuit error reporting
 *
 * For any circuit with invalid connections (floating nodes, short circuits, missing ground),
 * attempting to simulate should produce specific error messages identifying the problem
 * rather than crashing or producing invalid results.
 *
 * Validates: Requirements 4.7
 */

import fc from 'fast-check';
import { Circuit } from '@/models/Circuit';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Resistor } from '@/models/Resistor';
import { Wire } from '@/models/Wire';
import CircuitValidator from '@/validation/CircuitValidator';

describe('Feature: crossover-network-simulator, Property 16: Invalid circuit error reporting', () => {
	it('should report specific errors for circuits without ground', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 5 }), // Number of components
				(componentCount) => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					circuit.addComponent(source);

					// Add components but no ground
					for (let i = 0; i < componentCount; i++) {
						const resistor = new Resistor(30 + i * 20, 10);
						circuit.addComponent(resistor);
					}

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should report missing ground error
					expect(result.valid).toBe(false);
					expect(result.errors.some((e) => e.includes('no ground reference'))).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should report specific errors for circuits without voltage source', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 5 }), // Number of components
				(componentCount) => {
					const circuit = new Circuit();
					const ground = new Ground(10, 10);
					circuit.addComponent(ground);

					// Add components but no source
					for (let i = 0; i < componentCount; i++) {
						const resistor = new Resistor(30 + i * 20, 10);
						circuit.addComponent(resistor);
					}

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should report missing voltage source error
					expect(result.valid).toBe(false);
					expect(result.errors.some((e) => e.includes('no voltage source'))).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should report specific errors for short circuits', () => {
		fc.assert(
			fc.property(
				fc.constant(null), // No randomization needed for this test
				() => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					const ground = new Ground(30, 10);

					circuit.addComponent(source);
					circuit.addComponent(ground);

					// Create short circuit: connect source terminals directly
					const wire = new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: source.id, terminal: 1 },
					);
					circuit.addWire(wire);

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should report short circuit error
					expect(result.valid).toBe(false);
					expect(result.errors.some((e) => e.includes('Short circuit detected'))).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should not crash on invalid circuits', () => {
		fc.assert(
			fc.property(
				fc.record({
					hasGround: fc.boolean(),
					hasSource: fc.boolean(),
					componentCount: fc.integer({ min: 0, max: 10 }),
				}),
				({ hasGround, hasSource, componentCount }) => {
					const circuit = new Circuit();

					if (hasSource) {
						const source = new VoltageSource(10, 10);
						circuit.addComponent(source);
					}

					if (hasGround) {
						const ground = new Ground(30, 10);
						circuit.addComponent(ground);
					}

					// Add random components
					for (let i = 0; i < componentCount; i++) {
						const resistor = new Resistor(50 + i * 20, 10);
						circuit.addComponent(resistor);
					}

					// Validator should not crash
					const validator = new CircuitValidator(circuit);
					expect(() => validator.validate()).not.toThrow();

					const result = validator.validate();

					// Result should always have valid, errors, and warnings properties
					expect(result).toHaveProperty('valid');
					expect(result).toHaveProperty('errors');
					expect(result).toHaveProperty('warnings');
					expect(Array.isArray(result.errors)).toBe(true);
					expect(Array.isArray(result.warnings)).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should provide actionable error messages', () => {
		fc.assert(
			fc.property(
				fc.constant(null),
				() => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					circuit.addComponent(source);
					// Missing ground

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Error messages should be strings and non-empty
					expect(result.errors.length).toBeGreaterThan(0);
					result.errors.forEach((error) => {
						expect(typeof error).toBe('string');
						expect(error.length).toBeGreaterThan(0);
						// Error should contain useful information
						expect(error.toLowerCase()).toMatch(/circuit|ground|source|component|wire/);
					});
				},
			),
			{ numRuns: 100 },
		);
	});
});
