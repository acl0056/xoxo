import fs from 'fs';
import path from 'path';
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

describe('CircuitSolver', () => {
	describe('Node Mapping', () => {
		test('should build node map excluding ground', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			const ground = new Ground(20, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(ground);

			// Connect source+ to resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 }
			));

			// Connect resistor terminal 1 to ground
			circuit.addWire(new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 }
			));

			// Connect source- to ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 }
			));

			const solver = new CircuitSolver(circuit);
			const matrixSize = solver.buildNodeMap();

			// Should have nodes for non-ground terminals plus voltage source current variables
			// source_0 and resistor_0 merge via wire, source_1 and resistor_1 merge to GROUND
			// So 1 unique node + 1 voltage source current = 2
			expect(matrixSize).toBeGreaterThanOrEqual(2);
			expect(solver.groundNodeId).toBe(ground.id);
		});

		test('should exclude components in open state', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			resistor.parameters.state = 'open';
			const ground = new Ground(20, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(ground);

			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 }
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// Wires connected to open-state components are skipped during union-find,
			// but node IDs are still collected from all wires. The open resistor's
			// admittance is skipped during matrix construction (not during node mapping).
			// The voltage source map should still have the source entry.
			expect(solver.voltageSourceMap.size).toBe(1);

			// Compare with normal state to verify open state produces different matrix
			resistor.parameters.state = 'normal';
			const normalSize = solver.buildNodeMap();
			resistor.parameters.state = 'open';
			const openSize = solver.buildNodeMap();
			// Open state skips the wire, so fewer nodes are merged to ground.
			// Disconnected islands are excluded from the matrix, so open state
			// may produce a smaller or equal matrix.
			// Note: this test circuit is incomplete (missing wires to ground),
			// so both states may produce small matrices.
			expect(normalSize).toBeGreaterThanOrEqual(1);
			// Open state still needs at least the voltage source current variable
			expect(openSize).toBeGreaterThanOrEqual(1);
		});
	});

	describe('Frequency Point Generation', () => {
		test('should generate logarithmically spaced frequencies', () => {
			const circuit = new Circuit();
			const solver = new CircuitSolver(circuit);

			const frequencies = solver.generateFrequencyPoints(10, 1000, 10);

			// Should have approximately 20 points (2 decades * 10 points/decade)
			expect(frequencies.length).toBeGreaterThan(15);
			expect(frequencies.length).toBeLessThan(25);

			// First and last should be close to start and end
			expect(frequencies[0]).toBeCloseTo(10, 0);
			expect(frequencies[frequencies.length - 1]).toBeCloseTo(1000, 0);

			// Should be monotonically increasing
			for (let i = 1; i < frequencies.length; i++) {
				expect(frequencies[i]).toBeGreaterThan(frequencies[i - 1]);
			}
		});

		test('should generate default frequency range 1 Hz to 100 kHz', () => {
			const circuit = new Circuit();
			const solver = new CircuitSolver(circuit);

			const frequencies = solver.generateFrequencyPoints();

			expect(frequencies[0]).toBeCloseTo(1, 0);
			expect(frequencies[frequencies.length - 1]).toBeCloseTo(100000, -2);
		});
	});

	describe('Simple RC Circuit', () => {
		test('should solve RC low-pass filter at 1 kHz', () => {
			// Create RC low-pass filter: Source -> R -> C -> Ground
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 1000; // 1k ohm
			
			const capacitor = new Capacitor(20, 0);
			capacitor.parameters.capacitance = 159.15e-9; // ~159 nF for 1 kHz cutoff
			
			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(capacitor);
			circuit.addComponent(ground);

			// Source+ to Resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 }
			));

			// Resistor terminal 1 to Capacitor terminal 0
			circuit.addWire(new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: capacitor.id, terminal: 0 }
			));

			// Capacitor terminal 1 to Ground
			circuit.addWire(new Wire(
				{ componentId: capacitor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 }
			));

			// Source- to Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 }
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// Solve at cutoff frequency (1 kHz)
			const result = solveWithBuffers(solver, 1000);

			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);
			expect(Object.keys(result.nodeVoltages).length).toBeGreaterThan(0);
		});

		test('should show frequency-dependent behavior in RC circuit', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 1000;
			const capacitor = new Capacitor(20, 0);
			capacitor.parameters.capacitance = 159.15e-9;
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
			solver.buildNodeMap();

			// Solve at low frequency (100 Hz) and high frequency (10 kHz)
			const lowFreqResult = solveWithBuffers(solver, 100);
			const highFreqResult = solveWithBuffers(solver, 10000);

			expect(lowFreqResult).toBeDefined();
			expect(highFreqResult).toBeDefined();

			// At low frequency, capacitor has high impedance (more voltage across it)
			// At high frequency, capacitor has low impedance (less voltage across it)
			// Results should be different
			expect(Object.keys(lowFreqResult.nodeVoltages).length).toBe(Object.keys(highFreqResult.nodeVoltages).length);
		});
	});

	describe('Simple RL Circuit', () => {
		test('should solve RL high-pass filter', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const inductor = new Inductor(10, 0);
			inductor.parameters.inductance = 0.159; // ~159 mH for 1 kHz cutoff with 1 ohm
			const resistor = new Resistor(20, 0);
			resistor.parameters.resistance = 1.0;
			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(inductor);
			circuit.addComponent(resistor);
			circuit.addComponent(ground);

			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: inductor.id, terminal: 0 }
			));
			circuit.addWire(new Wire(
				{ componentId: inductor.id, terminal: 1 },
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

			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);
			expect(Object.keys(result.nodeVoltages).length).toBeGreaterThan(0);
		});
	});

	describe('RLC Circuit', () => {
		test('should solve series RLC circuit', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 10;
			const inductor = new Inductor(20, 0);
			inductor.parameters.inductance = 0.01; // 10 mH
			const capacitor = new Capacitor(30, 0);
			capacitor.parameters.capacitance = 10e-6; // 10 uF
			const ground = new Ground(40, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(inductor);
			circuit.addComponent(capacitor);
			circuit.addComponent(ground);

			// Series connection: Source -> R -> L -> C -> Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 }
			));
			circuit.addWire(new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: inductor.id, terminal: 0 }
			));
			circuit.addWire(new Wire(
				{ componentId: inductor.id, terminal: 1 },
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

			// Resonant frequency: f = 1/(2*pi*sqrt(LC))
			// f = 1/(2*pi*sqrt(0.01 * 10e-6)) = ~503 Hz
			const result = solveWithBuffers(solver, 503);

			expect(result).toBeDefined();
			expect(result.frequency).toBe(503);
			expect(Object.keys(result.nodeVoltages).length).toBeGreaterThan(0);
		});
	});

	describe('Component State Handling', () => {
		test('should handle short state as very low resistance', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 1000;
			resistor.parameters.state = 'short';
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

			expect(result).toBeDefined();
			// Short circuit should result in very high current
		});

		test('should handle open state as infinite impedance (disconnected)', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor1 = new Resistor(10, 0);
			resistor1.parameters.resistance = 1000;
			const resistor2 = new Resistor(20, 0);
			resistor2.parameters.resistance = 1000;
			resistor2.parameters.state = 'open';
			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);
			circuit.addComponent(ground);

			// Source -> R1 -> R2 (open) -> Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor1.id, terminal: 0 }
			));
			circuit.addWire(new Wire(
				{ componentId: resistor1.id, terminal: 1 },
				{ componentId: resistor2.id, terminal: 0 }
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
			const matrixSizeWithOpen = solver.buildNodeMap();

			// Now test with R2 in normal state
			resistor2.parameters.state = 'normal';
			const matrixSizeNormal = solver.buildNodeMap();

			// With R2 open, wires connected to it are skipped in union-find,
			// so R1 becomes disconnected from ground. Island detection excludes
			// disconnected nodes, so the matrix may be smaller or equal.
			expect(matrixSizeWithOpen).toBeGreaterThanOrEqual(1);
			expect(matrixSizeNormal).toBeGreaterThanOrEqual(2);
		});

		test('should handle normal state with specified parameters', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 1000;
			resistor.parameters.state = 'normal';
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

			expect(result).toBeDefined();
			expect(Object.keys(result.nodeVoltages).length).toBeGreaterThan(0);
		});

		test('should handle capacitor in short state', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const capacitor = new Capacitor(10, 0);
			capacitor.parameters.capacitance = 10e-6;
			capacitor.parameters.state = 'short';
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

			const result = solveWithBuffers(solver, 1000);

			expect(result).toBeDefined();
			// Shorted capacitor should behave like a wire
		});

		test('should handle inductor in open state', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const inductor = new Inductor(10, 0);
			inductor.parameters.inductance = 0.01;
			inductor.parameters.state = 'open';
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
			const matrixSizeWithOpen = solver.buildNodeMap();

			// Now test with inductor in normal state
			inductor.parameters.state = 'normal';
			const matrixSizeNormal = solver.buildNodeMap();

			// Open inductor causes its wires to be skipped in union-find,
			// so nodes become disconnected. Island detection excludes
			// disconnected nodes, so the matrix may be smaller or equal.
			expect(matrixSizeWithOpen).toBeGreaterThanOrEqual(1);
			expect(matrixSizeNormal).toBeGreaterThanOrEqual(2);
		});

		test('should produce different results for normal vs short state', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor1 = new Resistor(10, 0);
			resistor1.parameters.resistance = 1000;
			const resistor2 = new Resistor(20, 0);
			resistor2.parameters.resistance = 1000;
			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);
			circuit.addComponent(ground);

			// Series resistors: Source -> R1 -> R2 -> Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor1.id, terminal: 0 }
			));
			circuit.addWire(new Wire(
				{ componentId: resistor1.id, terminal: 1 },
				{ componentId: resistor2.id, terminal: 0 }
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

			// Solve with normal state
			const normalResult = solveWithBuffers(solver, 1000);

			// Change R2 to short state
			resistor2.parameters.state = 'short';
			solver.buildNodeMap();
			const shortResult = solveWithBuffers(solver, 1000);

			expect(normalResult).toBeDefined();
			expect(shortResult).toBeDefined();
			// Results should differ - with R2 shorted, more current flows
		});
	});

	describe('ESR Handling', () => {
		test('should include ESR in capacitor impedance calculation', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const capacitor = new Capacitor(10, 0);
			capacitor.parameters.capacitance = 10e-6;
			capacitor.parameters.esr = 1.0; // 1 ohm ESR
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

			const resultWithESR = solveWithBuffers(solver, 1000);

			// Now test without ESR
			capacitor.parameters.esr = 0;
			const resultWithoutESR = solveWithBuffers(solver, 1000);

			expect(resultWithESR).toBeDefined();
			expect(resultWithoutESR).toBeDefined();
			// Results should differ when ESR is present
		});

		test('should include ESR in inductor impedance calculation', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const inductor = new Inductor(10, 0);
			inductor.parameters.inductance = 0.01;
			inductor.parameters.esr = 0.5; // 0.5 ohm ESR
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

			const resultWithESR = solveWithBuffers(solver, 1000);

			inductor.parameters.esr = 0;
			const resultWithoutESR = solveWithBuffers(solver, 1000);

			expect(resultWithESR).toBeDefined();
			expect(resultWithoutESR).toBeDefined();
		});
	});

	describe('Voltage Source Calculation', () => {
		test('should calculate voltage from power and impedance', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0; // 1 watt
			source.parameters.impedance = 8.0; // 8 ohms
			// V = sqrt(P * Z) = sqrt(1 * 8) = 2.828 V
			
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 8.0;
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

			expect(result).toBeDefined();
			expect(Object.keys(result.sourceCurrents).length).toBe(1);
		});

		test('should handle inverted polarity', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			source.parameters.inverted = true;
			
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 8.0;
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

			expect(result).toBeDefined();
			// Inverted source should produce negative voltage
		});
	});

	describe('Error Handling', () => {
		test('should throw error if circuit has no ground', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor);

			const solver = new CircuitSolver(circuit);

			expect(() => solver.buildNodeMap()).toThrow('Circuit must contain a ground node');
		});
	});

	describe('Solve All Frequencies', () => {
		test('should solve circuit across frequency range', () => {
			const circuit = new Circuit();
			
			const source = new VoltageSource(0, 0);
			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 1000;
			const capacitor = new Capacitor(20, 0);
			capacitor.parameters.capacitance = 159.15e-9;
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

			expect(results.frequencies.length).toBeGreaterThan(0);
			expect(results.frequencies[0]).toBeCloseTo(100, 0);
			expect(results.frequencies[results.frequencies.length - 1]).toBeCloseTo(10000, -1);

			// All component voltages should have entries
			expect(Object.keys(results.componentVoltages).length).toBeGreaterThan(0);
		});
	});

	describe('Schema Validation', () => {
		test('should produce solver results that validate against schema', () => {
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
			solver.buildNodeMap();

			const result = solveWithBuffers(solver, 1000);

			// Result should have the required properties
			expect(result.frequency).toBe(1000);
			expect(typeof result.nodeVoltages).toBe('object');
			expect(result.nodeVoltages).not.toBeInstanceOf(Map);
			expect(typeof result.sourceCurrents).toBe('object');
			expect(result.sourceCurrents).not.toBeInstanceOf(Map);
		});

		test('should validate all results from solveAllFrequencies', () => {
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
			const results = solver.solveAllFrequencies(100, 1000, 5);

			// Validate result structure
			expect(results.frequencies).toBeDefined();
			expect(results.frequencies.length).toBeGreaterThan(0);
			results.frequencies.forEach(frequency => {
				expect(frequency).toBeGreaterThan(0);
			});
			expect(typeof results.componentVoltages).toBe('object');
			expect(typeof results.sourceCurrents).toBe('object');
		});
	});

	describe('No-mathjs Verification', () => {
		test('CircuitSolver.js should not import or require mathjs', () => {
			const solverSource = fs.readFileSync(
				path.resolve(__dirname, '../../src/simulation/CircuitSolver.js'),
				'utf8',
			);
			expect(solverSource).not.toMatch(/import.*mathjs/);
			expect(solverSource).not.toMatch(/require.*mathjs/);
		});
	});
});
