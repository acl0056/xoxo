import fs from 'fs';
import path from 'path';
import { Circuit } from '@/models/Circuit';
import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';

/**
 * Bug Condition Exploration Test — Simulation Performance
 *
 * Property 1: Bug Condition — Pipeline Execution Time >80ms
 *
 * This test encodes the EXPECTED (correct) behavior: the full simulation
 * pipeline should complete in under 80ms on the vivace 1_0_3.json circuit
 * (3-way crossover, 6 speakers, ~250 frequency points at 50 pts/decade).
 *
 * On UNFIXED code this test is EXPECTED TO FAIL (~1400ms >> 80ms target),
 * which confirms the performance bug exists. After optimization, this same
 * test should PASS, confirming the performance target is met.
 *
 * Validates: Requirements 1.1, 2.1
 */

describe('Bug Condition Exploration: Pipeline Execution Time', () => {
	let circuit;

	beforeAll(() => {
		// Load the vivace 1_0_3.json circuit file
		const jsonPath = path.resolve(__dirname, '../../research/dxo-files/vivace 1_0_3.json');
		const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
		circuit = Circuit.fromJSON(jsonData);
	});

	/**
	 * **Validates: Requirements 1.1, 2.1**
	 *
	 * The full simulation pipeline on the vivace 3-way crossover circuit
	 * (6 speakers, ~250 frequency points at 50 points/decade from 1 Hz to 100 kHz)
	 * should complete in under 80ms.
	 *
	 * Pipeline: CircuitSolver.solveAllFrequencies() →
	 *           FrequencyAnalyzer.calculateSystemResponse() +
	 *           FrequencyAnalyzer.calculateImpedance()
	 *
	 * On UNFIXED code this FAILS because the pipeline takes ~1400ms.
	 */
	test('full simulation pipeline completes in under 80ms on vivace circuit', () => {
		// Warm-up run to allow JIT compilation
		const warmupSolver = new CircuitSolver(circuit);
		const warmupResults = warmupSolver.solveAllFrequencies(1, 100000, 50);
		const warmupAnalyzer = new FrequencyAnalyzer(circuit, warmupResults);
		warmupAnalyzer.calculateSystemResponse();
		warmupAnalyzer.calculateImpedance();

		// Timed run
		const start = performance.now();

		const solver = new CircuitSolver(circuit);
		const solverResults = solver.solveAllFrequencies(1, 100000, 50);

		const analyzer = new FrequencyAnalyzer(circuit, solverResults);
		analyzer.calculateSystemResponse();
		analyzer.calculateImpedance();

		const elapsed = performance.now() - start;

		// Log the measured time for diagnostic purposes
		console.log(`Pipeline execution time: ${elapsed.toFixed(1)}ms (target: <80ms)`);

		// Assert pipeline completes under 80ms
		// On unfixed code this will fail (~1400ms >> 80ms)
		expect(elapsed).toBeLessThan(80);
	});
});
