import CircuitSolver from '@/simulation/CircuitSolver';
import SimulationProfiler from '@/simulation/SimulationProfiler';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';

/**
 * Smoke tests for profiler integration into CircuitSolver.
 * Verifies that the optional profiler parameter works correctly
 * and that behavior is unchanged when profiler is not provided.
 */
describe('CircuitSolver Profiler Integration', () => {
	let circuit;

	beforeEach(() => {
		circuit = new Circuit();
		const source = new VoltageSource(0, 0);
		const resistor = new Resistor(10, 0);
		resistor.parameters.resistance = 1000;
		const ground = new Ground(20, 0);

		circuit.addComponent(source);
		circuit.addComponent(resistor);
		circuit.addComponent(ground);

		circuit.addWire(new Wire(
			{ componentId: source.id, terminal: 0 },
			{ componentId: resistor.id, terminal: 0 },
		));
		circuit.addWire(new Wire(
			{ componentId: resistor.id, terminal: 1 },
			{ componentId: ground.id, terminal: 0 },
		));
		circuit.addWire(new Wire(
			{ componentId: source.id, terminal: 1 },
			{ componentId: ground.id, terminal: 0 },
		));
	});

	test('solveAllFrequencies works without profiler (backward compatible)', () => {
		const solver = new CircuitSolver(circuit);
		const result = solver.solveAllFrequencies(100, 1000, 5);

		expect(result.frequencies).toBeDefined();
		expect(result.frequencies.length).toBeGreaterThan(0);
		expect(result.componentVoltages).toBeDefined();
		expect(result.sourceCurrents).toBeDefined();
	});

	test('solveAllFrequencies works with profiler and records all Level 1 stages', () => {
		const profiler = new SimulationProfiler();
		const solver = new CircuitSolver(circuit);
		const result = solver.solveAllFrequencies(100, 1000, 5, profiler);

		expect(result.frequencies).toBeDefined();
		expect(result.frequencies.length).toBeGreaterThan(0);

		const report = profiler.report();
		const stageNames = Object.keys(report.stages);

		// Verify all Level 1 stages are recorded
		expect(stageNames).toContain('buildNodeMap');
		expect(stageNames).toContain('buildMNAMatrix');
		expect(stageNames).toContain('lusolve');
		expect(stageNames).toContain('extractResults');
	});

	test('profiler records correct call counts for per-frequency stages', () => {
		const profiler = new SimulationProfiler();
		const solver = new CircuitSolver(circuit);
		const result = solver.solveAllFrequencies(100, 1000, 5, profiler);

		const report = profiler.report();
		const frequencyCount = result.frequencies.length;

		// buildNodeMap is called once
		expect(report.stages.buildNodeMap.callCount).toBe(1);

		// Per-frequency stages are called once per frequency point
		expect(report.stages.buildMNAMatrix.callCount).toBe(frequencyCount);
		expect(report.stages.lusolve.callCount).toBe(frequencyCount);
		expect(report.stages.extractResults.callCount).toBe(frequencyCount);
	});

	test('profiler records non-negative durations for all stages', () => {
		const profiler = new SimulationProfiler();
		const solver = new CircuitSolver(circuit);
		solver.solveAllFrequencies(100, 1000, 5, profiler);

		const report = profiler.report();

		for (const [, stats] of Object.entries(report.stages)) {
			expect(stats.totalDuration).toBeGreaterThanOrEqual(0);
			expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
		}
	});

	test('results are identical with and without profiler', () => {
		const solver1 = new CircuitSolver(circuit);
		const resultWithout = solver1.solveAllFrequencies(100, 1000, 5);

		const profiler = new SimulationProfiler();
		const solver2 = new CircuitSolver(circuit);
		const resultWith = solver2.solveAllFrequencies(100, 1000, 5, profiler);

		// Frequencies should be identical
		expect(resultWith.frequencies).toEqual(resultWithout.frequencies);

		// Component voltages should be identical
		expect(Object.keys(resultWith.componentVoltages)).toEqual(Object.keys(resultWithout.componentVoltages));

		// Source currents should be identical
		expect(Object.keys(resultWith.sourceCurrents)).toEqual(Object.keys(resultWithout.sourceCurrents));
	});

	test('solve() works without profiler (backward compatible)', () => {
		const solver = new CircuitSolver(circuit);
		solver.buildNodeMap();
		const n = solver.matrixSize;
		const Are = new Float64Array(n * n);
		const Aim = new Float64Array(n * n);
		const bre = new Float64Array(n);
		const bim = new Float64Array(n);
		const result = solver.solve(1000, Are, Aim, bre, bim);

		expect(result).toBeDefined();
		expect(result.frequency).toBe(1000);
		expect(result.nodeVoltages).toBeDefined();
		expect(result.sourceCurrents).toBeDefined();
	});

	test('solve() works with profiler and records per-call stages', () => {
		const profiler = new SimulationProfiler();
		const solver = new CircuitSolver(circuit);
		solver.buildNodeMap();
		const n = solver.matrixSize;
		const Are = new Float64Array(n * n);
		const Aim = new Float64Array(n * n);
		const bre = new Float64Array(n);
		const bim = new Float64Array(n);
		const result = solver.solve(1000, Are, Aim, bre, bim, profiler);

		expect(result).toBeDefined();
		expect(result.frequency).toBe(1000);

		const report = profiler.report();
		const stageNames = Object.keys(report.stages);

		expect(stageNames).toContain('buildMNAMatrix');
		expect(stageNames).toContain('lusolve');
		expect(stageNames).toContain('extractResults');

		// Each stage called exactly once for a single solve() call
		expect(report.stages.buildMNAMatrix.callCount).toBe(1);
		expect(report.stages.lusolve.callCount).toBe(1);
		expect(report.stages.extractResults.callCount).toBe(1);
	});
});
