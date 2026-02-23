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
 * Property 15: Simulation Completeness
 * For any circuit with valid connections, simulation results should include
 * voltage, current, and impedance data for all nodes in the circuit.
 */
describe('Feature: crossover-network-simulator, Property 15: Simulation completeness', () => {
	test('should include voltage data for all circuit nodes', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 100, max: 10000, noNaN: true }), // resistance
				fc.double({ min: 1e-9, max: 1e-3, noNaN: true }), // capacitance
				fc.double({ min: 1e-6, max: 1e-1, noNaN: true }), // inductance
				(resistance, capacitance, inductance) => {
					// Create a circuit with multiple components
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					const resistor = new Resistor(10, 0);
					resistor.parameters.resistance = resistance;
					const capacitor = new Capacitor(20, 0);
					capacitor.parameters.capacitance = capacitance;
					const inductor = new Inductor(30, 0);
					inductor.parameters.inductance = inductance;
					const ground = new Ground(40, 0);

					circuit.addComponent(source);
					circuit.addComponent(resistor);
					circuit.addComponent(capacitor);
					circuit.addComponent(inductor);
					circuit.addComponent(ground);

					// Series connection: Source -> R -> C -> L -> Ground
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

					// Solve at a test frequency
					const result = solver.solve(1000);

					// Property: Result should have voltage data for all non-ground nodes
					expect(result.nodeVoltages).toBeDefined();
					expect(result.nodeVoltages.size).toBeGreaterThan(0);

					// All node voltages should be complex numbers
					for (const [nodeId, voltage] of result.nodeVoltages.entries()) {
						expect(nodeId).toBeDefined();
						expect(voltage).toBeDefined();
						// Complex numbers from mathjs have re and im properties
						// Handle both mathjs Complex objects and plain numbers
						if (typeof voltage === 'number') {
							expect(Number.isFinite(voltage)).toBe(true);
						} else {
							expect(voltage.re).toBeDefined();
							expect(voltage.im).toBeDefined();
							expect(Number.isFinite(voltage.re)).toBe(true);
							expect(Number.isFinite(voltage.im)).toBe(true);
						}
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('should include current data for voltage sources', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0.1, max: 10, noNaN: true }), // power
				fc.double({ min: 1, max: 16, noNaN: true }), // impedance
				fc.double({ min: 100, max: 10000, noNaN: true }), // resistance
				(power, impedance, resistance) => {
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					source.parameters.power = power;
					source.parameters.impedance = impedance;
					const resistor = new Resistor(10, 0);
					resistor.parameters.resistance = resistance;
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
					solver.buildNodeMap();

					const result = solver.solve(1000);

					// Property: Result should have current data for voltage sources
					expect(result.sourceCurrents).toBeDefined();
					expect(result.sourceCurrents.size).toBe(1);

					// Current should be a complex number
					const current = result.sourceCurrents.get(source.id);
					expect(current).toBeDefined();
					if (typeof current === 'number') {
						expect(Number.isFinite(current)).toBe(true);
					} else {
						expect(current.re).toBeDefined();
						expect(current.im).toBeDefined();
						expect(Number.isFinite(current.re)).toBe(true);
						expect(Number.isFinite(current.im)).toBe(true);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('should provide complete data across all frequency points', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1000, max: 5000, noNaN: true }), // resistance
				fc.double({ min: 1e-7, max: 1e-5, noNaN: true }), // capacitance
				(resistance, capacitance) => {
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
					const results = solver.solveAllFrequencies(100, 10000, 5);

					// Property: Every frequency point should have complete data
					expect(results.length).toBeGreaterThan(0);

					for (const result of results) {
						expect(result.frequency).toBeDefined();
						expect(result.nodeVoltages).toBeDefined();
						expect(result.sourceCurrents).toBeDefined();
						
						// Should have voltage data for nodes
						expect(result.nodeVoltages.size).toBeGreaterThan(0);
						
						// Should have current data for voltage source
						expect(result.sourceCurrents.size).toBe(1);

						// All voltages should be valid complex numbers
						for (const voltage of result.nodeVoltages.values()) {
							if (typeof voltage === 'number') {
								expect(Number.isFinite(voltage)).toBe(true);
							} else {
								expect(Number.isFinite(voltage.re)).toBe(true);
								expect(Number.isFinite(voltage.im)).toBe(true);
							}
						}

						// All currents should be valid complex numbers
						for (const current of result.sourceCurrents.values()) {
							if (typeof current === 'number') {
								expect(Number.isFinite(current)).toBe(true);
							} else {
								expect(Number.isFinite(current.re)).toBe(true);
								expect(Number.isFinite(current.im)).toBe(true);
							}
						}
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('should handle parallel circuit configurations', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1000, max: 10000, noNaN: true }), // resistor 1
				fc.double({ min: 1000, max: 10000, noNaN: true }), // resistor 2
				(resistance1, resistance2) => {
					// Create parallel resistor circuit
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					const resistor1 = new Resistor(10, 0);
					resistor1.parameters.resistance = resistance1;
					const resistor2 = new Resistor(20, 0);
					resistor2.parameters.resistance = resistance2;
					const ground = new Ground(30, 0);

					circuit.addComponent(source);
					circuit.addComponent(resistor1);
					circuit.addComponent(resistor2);
					circuit.addComponent(ground);

					// Parallel connection: both resistors connect source+ to ground
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: resistor1.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: resistor2.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: resistor1.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: resistor2.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));
					circuit.addWire(new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 }
					));

					const solver = new CircuitSolver(circuit);
					solver.buildNodeMap();

					const result = solver.solve(1000);

					// Property: Should have complete data for parallel circuit
					expect(result.nodeVoltages).toBeDefined();
					expect(result.nodeVoltages.size).toBeGreaterThan(0);
					expect(result.sourceCurrents).toBeDefined();
					expect(result.sourceCurrents.size).toBe(1);

					// All data should be valid
					for (const voltage of result.nodeVoltages.values()) {
						if (typeof voltage === 'number') {
							expect(Number.isFinite(voltage)).toBe(true);
						} else {
							expect(Number.isFinite(voltage.re)).toBe(true);
							expect(Number.isFinite(voltage.im)).toBe(true);
						}
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	test('should handle circuits with multiple component types', () => {
		fc.assert(
			fc.property(
				fc.record({
					resistance: fc.double({ min: 100, max: 10000, noNaN: true }),
					capacitance: fc.double({ min: 1e-9, max: 1e-5, noNaN: true }),
					inductance: fc.double({ min: 1e-6, max: 1e-2, noNaN: true }),
					esr: fc.double({ min: 0, max: 10, noNaN: true }),
				}),
				(params) => {
					const circuit = new Circuit();
					const source = new VoltageSource(0, 0);
					const resistor = new Resistor(10, 0);
					resistor.parameters.resistance = params.resistance;
					const capacitor = new Capacitor(20, 0);
					capacitor.parameters.capacitance = params.capacitance;
					capacitor.parameters.esr = params.esr;
					const inductor = new Inductor(30, 0);
					inductor.parameters.inductance = params.inductance;
					inductor.parameters.esr = params.esr;
					const ground = new Ground(40, 0);

					circuit.addComponent(source);
					circuit.addComponent(resistor);
					circuit.addComponent(capacitor);
					circuit.addComponent(inductor);
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

					const result = solver.solve(1000);

					// Property: Should have complete data for mixed component circuit
					expect(result.nodeVoltages).toBeDefined();
					expect(result.sourceCurrents).toBeDefined();
					
					// Should have data for all nodes
					expect(result.nodeVoltages.size).toBeGreaterThan(0);
					
					// All voltages and currents should be valid
					for (const voltage of result.nodeVoltages.values()) {
						if (typeof voltage === 'number') {
							expect(Number.isFinite(voltage)).toBe(true);
						} else {
							expect(Number.isFinite(voltage.re)).toBe(true);
							expect(Number.isFinite(voltage.im)).toBe(true);
						}
					}

					for (const current of result.sourceCurrents.values()) {
						if (typeof current === 'number') {
							expect(Number.isFinite(current)).toBe(true);
						} else {
							expect(Number.isFinite(current.re)).toBe(true);
							expect(Number.isFinite(current.im)).toBe(true);
						}
					}
				}
			),
			{ numRuns: 100 }
		);
	});
});
