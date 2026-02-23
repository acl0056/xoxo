import fc from 'fast-check';
import CircuitSolver from '@/simulation/CircuitSolver';
import { Circuit } from '@/models/Circuit';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';

/**
 * Property 12: ESR Simulation Impact
 * 
 * For any circuit containing capacitors or inductors with non-zero ESR,
 * the simulation results should differ from the same circuit with zero ESR,
 * demonstrating that ESR is included in calculations.
 * 
 * Validates: Requirements 3.6, 3.7
 */
describe('Feature: crossover-network-simulator, Property 12: ESR simulation impact', () => {
	test('capacitor with non-zero ESR produces different results than zero ESR', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1e-9, max: 1e-3 }), // capacitance in farads
				fc.double({ min: 0.01, max: 10.0 }), // ESR in ohms
				fc.double({ min: 100, max: 10000 }), // test frequency in Hz
				(capacitance, equivalentSeriesResistance, frequency) => {
					// Create circuit with capacitor
					const circuit = new Circuit();
					
					const source = new VoltageSource(0, 0);
					source.parameters.power = 1.0;
					source.parameters.impedance = 8.0;
					
					const capacitor = new Capacitor(10, 0);
					capacitor.parameters.capacitance = capacitance;
					capacitor.parameters.esr = equivalentSeriesResistance;
					
					const ground = new Ground(20, 0);

					circuit.addComponent(source);
					circuit.addComponent(capacitor);
					circuit.addComponent(ground);

					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
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
					solver.buildNodeMap();

					// Solve with ESR
					const resultWithESR = solver.solve(frequency);

					// Now solve with zero ESR
					capacitor.parameters.esr = 0;
					solver.buildNodeMap();
					const resultWithoutESR = solver.solve(frequency);

					// Both should succeed
					expect(resultWithESR).toBeDefined();
					expect(resultWithoutESR).toBeDefined();

					// Get node voltages for comparison
					const nodeIdWithESR = `${capacitor.id}_0`;
					const voltageWithESR = resultWithESR.nodeVoltages.get(nodeIdWithESR);
					const voltageWithoutESR = resultWithoutESR.nodeVoltages.get(nodeIdWithESR);

					// If both voltages exist, they should be different
					if (voltageWithESR && voltageWithoutESR) {
						const magnitudeWithESR = Math.sqrt(voltageWithESR.re ** 2 + voltageWithESR.im ** 2);
						const magnitudeWithoutESR = Math.sqrt(voltageWithoutESR.re ** 2 + voltageWithoutESR.im ** 2);

						// ESR should cause a measurable difference (at least 0.1% difference)
						const relativeDifference = Math.abs(magnitudeWithESR - magnitudeWithoutESR) / Math.max(magnitudeWithESR, magnitudeWithoutESR);
						expect(relativeDifference).toBeGreaterThan(0.001);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('inductor with non-zero ESR produces different results than zero ESR', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1e-6, max: 1.0 }), // inductance in henries
				fc.double({ min: 0.01, max: 10.0 }), // ESR in ohms
				fc.double({ min: 100, max: 10000 }), // test frequency in Hz
				(inductance, equivalentSeriesResistance, frequency) => {
					// Create circuit with inductor
					const circuit = new Circuit();
					
					const source = new VoltageSource(0, 0);
					source.parameters.power = 1.0;
					source.parameters.impedance = 8.0;
					
					const inductor = new Inductor(10, 0);
					inductor.parameters.inductance = inductance;
					inductor.parameters.esr = equivalentSeriesResistance;
					
					const ground = new Ground(20, 0);

					circuit.addComponent(source);
					circuit.addComponent(inductor);
					circuit.addComponent(ground);

					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: inductor.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: inductor.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));

					const solver = new CircuitSolver(circuit);
					solver.buildNodeMap();

					// Solve with ESR
					const resultWithESR = solver.solve(frequency);

					// Now solve with zero ESR
					inductor.parameters.esr = 0;
					solver.buildNodeMap();
					const resultWithoutESR = solver.solve(frequency);

					// Both should succeed
					expect(resultWithESR).toBeDefined();
					expect(resultWithoutESR).toBeDefined();

					// Get node voltages for comparison
					const nodeIdWithESR = `${inductor.id}_0`;
					const voltageWithESR = resultWithESR.nodeVoltages.get(nodeIdWithESR);
					const voltageWithoutESR = resultWithoutESR.nodeVoltages.get(nodeIdWithESR);

					// If both voltages exist, they should be different
					if (voltageWithESR && voltageWithoutESR) {
						const magnitudeWithESR = Math.sqrt(voltageWithESR.re ** 2 + voltageWithESR.im ** 2);
						const magnitudeWithoutESR = Math.sqrt(voltageWithoutESR.re ** 2 + voltageWithoutESR.im ** 2);

						// ESR should cause a measurable difference (at least 0.1% difference)
						const relativeDifference = Math.abs(magnitudeWithESR - magnitudeWithoutESR) / Math.max(magnitudeWithESR, magnitudeWithoutESR);
						expect(relativeDifference).toBeGreaterThan(0.001);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('ESR impact increases with higher ESR values', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1e-6, max: 1e-3 }), // capacitance in farads
				fc.double({ min: 0.1, max: 1.0 }), // low ESR in ohms
				fc.double({ min: 2.0, max: 10.0 }), // high ESR in ohms
				fc.double({ min: 1000, max: 5000 }), // test frequency in Hz
				(capacitance, lowESR, highESR, frequency) => {
					// Create circuit with capacitor
					const circuit = new Circuit();
					
					const source = new VoltageSource(0, 0);
					source.parameters.power = 1.0;
					source.parameters.impedance = 8.0;
					
					const capacitor = new Capacitor(10, 0);
					capacitor.parameters.capacitance = capacitance;
					
					const ground = new Ground(20, 0);

					circuit.addComponent(source);
					circuit.addComponent(capacitor);
					circuit.addComponent(ground);

					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
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

					// Solve with zero ESR
					capacitor.parameters.esr = 0;
					solver.buildNodeMap();
					const resultZeroESR = solver.solve(frequency);

					// Solve with low ESR
					capacitor.parameters.esr = lowESR;
					solver.buildNodeMap();
					const resultLowESR = solver.solve(frequency);

					// Solve with high ESR
					capacitor.parameters.esr = highESR;
					solver.buildNodeMap();
					const resultHighESR = solver.solve(frequency);

					// All should succeed
					expect(resultZeroESR).toBeDefined();
					expect(resultLowESR).toBeDefined();
					expect(resultHighESR).toBeDefined();

					// Get node voltages
					const nodeId = `${capacitor.id}_0`;
					const voltageZero = resultZeroESR.nodeVoltages.get(nodeId);
					const voltageLow = resultLowESR.nodeVoltages.get(nodeId);
					const voltageHigh = resultHighESR.nodeVoltages.get(nodeId);

					if (voltageZero && voltageLow && voltageHigh) {
						const magnitudeZero = Math.sqrt(voltageZero.re ** 2 + voltageZero.im ** 2);
						const magnitudeLow = Math.sqrt(voltageLow.re ** 2 + voltageLow.im ** 2);
						const magnitudeHigh = Math.sqrt(voltageHigh.re ** 2 + voltageHigh.im ** 2);

						// Difference from zero ESR should increase with ESR value
						const diffLow = Math.abs(magnitudeLow - magnitudeZero);
						const diffHigh = Math.abs(magnitudeHigh - magnitudeZero);

						// Higher ESR should cause larger difference
						expect(diffHigh).toBeGreaterThanOrEqual(diffLow);
					}
				}
			),
			{ numRuns: 100 }
		);
	});
});
