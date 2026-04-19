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
 * Helper: allocate typed array buffers and call solver.solve() with the new signature.
 * Requires buildNodeMap() to have been called first.
 */
function solveWithBuffers(solver, frequency) {
	const n = solver.matrixSize;
	const Are = new Float64Array(n * n);
	const Aim = new Float64Array(n * n);
	const bre = new Float64Array(n);
	const bim = new Float64Array(n);
	return solver.solve(frequency, Are, Aim, bre, bim);
}

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
					const result = solveWithBuffers(solver, 1000);

					// Property: Result should have voltage data for all non-ground nodes
					expect(result.nodeVoltages).toBeDefined();
					const nodeVoltageKeys = Object.keys(result.nodeVoltages);
					expect(nodeVoltageKeys.length).toBeGreaterThan(0);

					// All node voltages should be complex numbers
					for (const nodeId of nodeVoltageKeys) {
						const voltage = result.nodeVoltages[nodeId];
						expect(nodeId).toBeDefined();
						expect(voltage).toBeDefined();
						// Refactored solver returns plain {re, im} objects
						expect(voltage.re).toBeDefined();
						expect(voltage.im).toBeDefined();
						expect(Number.isFinite(voltage.re)).toBe(true);
						expect(Number.isFinite(voltage.im)).toBe(true);
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

					const result = solveWithBuffers(solver, 1000);

					// Property: Result should have current data for voltage sources
					expect(result.sourceCurrents).toBeDefined();
					const sourceCurrentKeys = Object.keys(result.sourceCurrents);
					expect(sourceCurrentKeys.length).toBe(1);

					// Current should be a complex number
					const current = result.sourceCurrents[source.id];
					expect(current).toBeDefined();
					expect(current.re).toBeDefined();
					expect(current.im).toBeDefined();
					expect(Number.isFinite(current.re)).toBe(true);
					expect(Number.isFinite(current.im)).toBe(true);
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
					expect(results.frequencies.length).toBeGreaterThan(0);

					// Should have voltage data for components
					expect(Object.keys(results.componentVoltages).length).toBeGreaterThan(0);
					
					// Should have current data for voltage source
					expect(Object.keys(results.sourceCurrents).length).toBe(1);

					// All component voltages should be valid complex numbers with correct length
					for (const componentId of Object.keys(results.componentVoltages)) {
						const voltages = results.componentVoltages[componentId];
						expect(voltages.length).toBe(results.frequencies.length);
						for (const voltage of voltages) {
							expect(Number.isFinite(voltage.re)).toBe(true);
							expect(Number.isFinite(voltage.im)).toBe(true);
						}
					}

					// All source currents should be valid complex numbers with correct length
					for (const sourceId of Object.keys(results.sourceCurrents)) {
						const currents = results.sourceCurrents[sourceId];
						expect(currents.length).toBe(results.frequencies.length);
						for (const current of currents) {
							expect(Number.isFinite(current.re)).toBe(true);
							expect(Number.isFinite(current.im)).toBe(true);
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

					const result = solveWithBuffers(solver, 1000);

					// Property: Should have complete data for parallel circuit
					expect(result.nodeVoltages).toBeDefined();
					const nodeVoltageKeys = Object.keys(result.nodeVoltages);
					expect(nodeVoltageKeys.length).toBeGreaterThan(0);
					expect(result.sourceCurrents).toBeDefined();
					const sourceCurrentKeys = Object.keys(result.sourceCurrents);
					expect(sourceCurrentKeys.length).toBe(1);

					// All data should be valid
					for (const nodeId of nodeVoltageKeys) {
						const voltage = result.nodeVoltages[nodeId];
						expect(Number.isFinite(voltage.re)).toBe(true);
						expect(Number.isFinite(voltage.im)).toBe(true);
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

					const result = solveWithBuffers(solver, 1000);

					// Property: Should have complete data for mixed component circuit
					expect(result.nodeVoltages).toBeDefined();
					expect(result.sourceCurrents).toBeDefined();
					
					// Should have data for all nodes
					const nodeVoltageKeys = Object.keys(result.nodeVoltages);
					expect(nodeVoltageKeys.length).toBeGreaterThan(0);
					
					// All voltages and currents should be valid
					for (const nodeId of nodeVoltageKeys) {
						const voltage = result.nodeVoltages[nodeId];
						expect(Number.isFinite(voltage.re)).toBe(true);
						expect(Number.isFinite(voltage.im)).toBe(true);
					}

					for (const sourceId of Object.keys(result.sourceCurrents)) {
						const current = result.sourceCurrents[sourceId];
						expect(Number.isFinite(current.re)).toBe(true);
						expect(Number.isFinite(current.im)).toBe(true);
					}
				}
			),
			{ numRuns: 100 }
		);
	});
});
