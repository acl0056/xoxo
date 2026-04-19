import fc from 'fast-check';
import CircuitSolver from '@/simulation/CircuitSolver';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';

/**
 * Property 14: Simulation Frequency Range
 * For any circuit, simulation results should include frequency response data
 * covering the range from 1 Hz to 100 kHz with logarithmically spaced frequency points.
 */
describe('Feature: crossover-network-simulator, Property 14: Simulation frequency range', () => {
	test('should generate frequency points from 1 Hz to 100 kHz with logarithmic spacing', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 5, max: 20 }), // points per decade
				(pointsPerDecade) => {
					// Create a simple valid circuit
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					const resistor = new Resistor(10, 0);
					resistor.parameters.resistance = 1000;
					const ground = new Ground(20, 0);

					circuit.addComponent(source);
					circuit.addComponent(resistor);
					circuit.addComponent(ground);

					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: resistor.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: resistor.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));

					const solver = new CircuitSolver(circuit);
					const results = solver.solveAllFrequencies(1, 100000, pointsPerDecade);

					// Property: Results should cover the full frequency range
					expect(results.frequencies.length).toBeGreaterThan(0);
					
					// First frequency should be close to 1 Hz
					expect(results.frequencies[0]).toBeGreaterThanOrEqual(1);
					expect(results.frequencies[0]).toBeLessThanOrEqual(10);
					
					// Last frequency should be close to 100 kHz
					const lastFreq = results.frequencies[results.frequencies.length - 1];
					expect(lastFreq).toBeGreaterThanOrEqual(10000);
					expect(lastFreq).toBeLessThanOrEqual(100000);

					// Frequencies should be monotonically increasing
					for (let i = 1; i < results.frequencies.length; i++) {
						expect(results.frequencies[i]).toBeGreaterThan(results.frequencies[i - 1]);
					}

					// Frequencies should be logarithmically spaced
					// Check that the ratio between consecutive frequencies is roughly constant
					if (results.frequencies.length > 2) {
						const ratios = [];
						for (let i = 1; i < Math.min(results.frequencies.length, 10); i++) {
							const ratio = results.frequencies[i] / results.frequencies[i - 1];
							ratios.push(ratio);
						}
						
						// All ratios should be similar (within 20% of each other)
						const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
						for (const ratio of ratios) {
							expect(Math.abs(ratio - avgRatio) / avgRatio).toBeLessThan(0.2);
						}
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('should include frequency response data for all generated frequency points', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 100, max: 10000 }), // resistance
				fc.double({ min: 1e-9, max: 1e-3 }), // capacitance
				(resistance, capacitance) => {
					// Create RC circuit
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					const resistor = new Resistor(10, 0);
					resistor.parameters.resistance = resistance;
					const capacitor = new Capacitor(20, 0);
					capacitor.parameters.capacitance = capacitance;
					const ground = new Ground(30, 0);

					circuit.addComponent(source);
					circuit.addComponent(resistor);
					circuit.addComponent(capacitor);
					circuit.addComponent(ground);

					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: resistor.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: resistor.id, terminal: 1 },
						{ componentId: capacitor.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: capacitor.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));

					const solver = new CircuitSolver(circuit);
					const results = solver.solveAllFrequencies(1, 100000, 10);

					// Property: Every frequency should have response data
					expect(results.frequencies.length).toBeGreaterThan(0);
					for (const freq of results.frequencies) {
						expect(freq).toBeDefined();
						expect(freq).toBeGreaterThanOrEqual(1);
						expect(freq).toBeLessThanOrEqual(100000);
					}
					// Should have component voltage data
					expect(Object.keys(results.componentVoltages).length).toBeGreaterThan(0);
					// Each component's voltage array should match frequency count
					for (const voltages of Object.values(results.componentVoltages)) {
						expect(voltages.length).toBe(results.frequencies.length);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('should handle custom frequency ranges', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 10, max: 1000, noNaN: true }), // start frequency
				fc.double({ min: 10000, max: 50000, noNaN: true }), // end frequency
				(startFrequency, endFrequency) => {
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					const resistor = new Resistor(10, 0);
					const ground = new Ground(20, 0);

					circuit.addComponent(source);
					circuit.addComponent(resistor);
					circuit.addComponent(ground);

					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: resistor.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: resistor.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));

					const solver = new CircuitSolver(circuit);
					const results = solver.solveAllFrequencies(startFrequency, endFrequency, 10);

					// Property: Results should respect custom frequency range
					expect(results.frequencies.length).toBeGreaterThan(0);
					expect(results.frequencies[0]).toBeGreaterThanOrEqual(startFrequency * 0.9);
					expect(results.frequencies[results.frequencies.length - 1]).toBeLessThanOrEqual(endFrequency * 1.1);
				}
			),
			{ numRuns: 100 }
		);
	});
});
