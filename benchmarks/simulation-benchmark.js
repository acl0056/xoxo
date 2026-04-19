/**
 * Simulation Benchmark Script
 *
 * Loads the vivace 1_0_3.json circuit, runs the full simulation pipeline
 * with SimulationProfiler enabled, and reports per-stage timing.
 *
 * Usage:
 *   node benchmarks/simulation-benchmark.js              # Run benchmark (warm-up + 5 timed iterations, report median)
 *   node benchmarks/simulation-benchmark.js --capture    # Save golden reference to benchmarks/golden-reference.json
 *   node benchmarks/simulation-benchmark.js --verify     # Compare current output against golden reference
 *
 * Requirements: 1.1, 2.1, 2.2, 3.1, 3.2
 */

// Register babel to handle ES module imports and @ alias
require('@babel/register')({
	presets: [
		['@babel/preset-env', { targets: { node: 'current' } }],
	],
	plugins: [
		['module-resolver', { alias: { '@': './src' } }],
	],
});

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Now we can require ES module source files
const { Circuit } = require('../src/models/Circuit');
const CircuitSolver = require('../src/simulation/CircuitSolver').default;
const FrequencyAnalyzer = require('../src/simulation/FrequencyAnalyzer').default;
const SimulationProfiler = require('../src/simulation/SimulationProfiler').default;
const SchemaValidator = require('../src/simulation/SchemaValidator').default;

// --- Constants ---
const VIVACE_PATH = path.resolve(__dirname, '../research/dxo-files/vivace 1_0_3.json');
const GOLDEN_REF_PATH = path.resolve(__dirname, 'golden-reference.json');

const SPL_TOLERANCE_DB = 0.01;
const PHASE_TOLERANCE_DEG = 0.1;
const IMPEDANCE_TOLERANCE_OHM = 0.01;

const WARMUP_ITERATIONS = 1;
const TIMED_ITERATIONS = 5;

// --- Pipeline ---

/**
 * Run the full simulation pipeline on the given circuit.
 * Returns { systemResponse, impedanceResponse, profiler }.
 */
function runPipeline(circuit, enableProfiling) {
	const profiler = enableProfiling ? new SimulationProfiler() : null;

	// Stage 1: Solve all frequencies
	const solver = new CircuitSolver(circuit);
	const solverResults = solver.solveAllFrequencies(1, 100000, 50, profiler);

	// Stage 2: Calculate system response and impedance
	const analyzer = new FrequencyAnalyzer(circuit, solverResults);
	const systemResponse = analyzer.calculateSystemResponse(0, profiler);
	const impedanceResponse = analyzer.calculateImpedance(profiler);

	// Stage 3: JSON serialization
	if (profiler) profiler.startStage('jsonSerialization');
	const serialized = JSON.stringify({ systemResponse, impedanceResponse });
	JSON.parse(serialized); // simulate the deep-clone via JSON round-trip
	if (profiler) profiler.endStage('jsonSerialization');

	// Stage 4: Schema validation on final outputs
	if (profiler) profiler.startStage('schemaValidation');
	SchemaValidator.validateFrequencyResponseData(systemResponse);
	SchemaValidator.validateImpedanceResponseData(impedanceResponse);
	if (profiler) profiler.endStage('schemaValidation');

	return { systemResponse, impedanceResponse, profiler };
}

/**
 * Serialize pipeline output to a JSON-safe format for the golden reference.
 */
function serializeOutput(systemResponse, impedanceResponse) {
	const speakerResponses = {};
	for (const [speakerId, response] of Object.entries(systemResponse.speakerResponses)) {
		speakerResponses[speakerId] = {
			label: response.label,
			frequencies: response.frequencies,
			spl: response.spl,
			phase: response.phase,
		};
	}

	return {
		frequencies: systemResponse.frequencies,
		system: {
			spl: systemResponse.spl,
			phase: systemResponse.phase,
		},
		speakers: speakerResponses,
		impedance: {
			frequencies: impedanceResponse.frequencies,
			magnitudes: impedanceResponse.impedances,
			phases: impedanceResponse.phases,
		},
	};
}

// --- Verification ---

/**
 * Compare two arrays element-wise within tolerance.
 * Returns { pass, maxDeviation, failIndex } for the worst deviation.
 */
function compareArrays(actual, expected, tolerance) {
	if (actual.length !== expected.length) {
		return {
			pass: false,
			maxDeviation: Infinity,
			failIndex: -1,
			message: `Length mismatch: actual=${actual.length}, expected=${expected.length}`,
		};
	}

	let maxDeviation = 0;
	let worstIndex = 0;

	for (let i = 0; i < actual.length; i++) {
		const diff = Math.abs(actual[i] - expected[i]);
		if (diff > maxDeviation) {
			maxDeviation = diff;
			worstIndex = i;
		}
	}

	return {
		pass: maxDeviation <= tolerance,
		maxDeviation,
		failIndex: worstIndex,
	};
}

/**
 * Run golden reference verification.
 * Returns exit code 0 on pass, 1 on fail.
 */
function runVerification(circuit) {
	if (!fs.existsSync(GOLDEN_REF_PATH)) {
		console.error('ERROR: Golden reference not found at', GOLDEN_REF_PATH);
		console.error('Run with --capture first to create it.');
		return 1;
	}

	const goldenReference = JSON.parse(fs.readFileSync(GOLDEN_REF_PATH, 'utf8'));

	console.log('Running pipeline for verification...');
	const { systemResponse, impedanceResponse } = runPipeline(circuit, false);
	const currentOutput = serializeOutput(systemResponse, impedanceResponse);

	let allPassed = true;
	const results = [];

	// 1. Frequency points
	const freqResult = compareArrays(currentOutput.frequencies, goldenReference.frequencies, 0);
	results.push({ category: 'Frequency points', ...freqResult, tolerance: 0 });
	if (!freqResult.pass) allPassed = false;

	// 2. System response SPL
	const sysSplResult = compareArrays(
		currentOutput.system.spl,
		goldenReference.system.spl,
		SPL_TOLERANCE_DB,
	);
	results.push({ category: 'System SPL', ...sysSplResult, tolerance: SPL_TOLERANCE_DB });
	if (!sysSplResult.pass) allPassed = false;

	// 3. System response phase
	const sysPhaseResult = compareArrays(
		currentOutput.system.phase,
		goldenReference.system.phase,
		PHASE_TOLERANCE_DEG,
	);
	results.push({ category: 'System phase', ...sysPhaseResult, tolerance: PHASE_TOLERANCE_DEG });
	if (!sysPhaseResult.pass) allPassed = false;

	// 4. Per-speaker frequency response
	const goldenSpeakerIds = Object.keys(goldenReference.speakers);
	for (const speakerId of goldenSpeakerIds) {
		const goldenSpeaker = goldenReference.speakers[speakerId];
		const currentSpeaker = currentOutput.speakers[speakerId];

		if (!currentSpeaker) {
			results.push({
				category: `Speaker ${speakerId} SPL`,
				pass: false,
				maxDeviation: Infinity,
				message: 'Speaker not found in current output',
			});
			allPassed = false;
			continue;
		}

		const splResult = compareArrays(currentSpeaker.spl, goldenSpeaker.spl, SPL_TOLERANCE_DB);
		results.push({
			category: `Speaker ${goldenSpeaker.label || speakerId} SPL`,
			...splResult,
			tolerance: SPL_TOLERANCE_DB,
		});
		if (!splResult.pass) allPassed = false;

		const phaseResult = compareArrays(currentSpeaker.phase, goldenSpeaker.phase, PHASE_TOLERANCE_DEG);
		results.push({
			category: `Speaker ${goldenSpeaker.label || speakerId} phase`,
			...phaseResult,
			tolerance: PHASE_TOLERANCE_DEG,
		});
		if (!phaseResult.pass) allPassed = false;
	}

	// 5. Impedance magnitude
	const impMagResult = compareArrays(
		currentOutput.impedance.magnitudes,
		goldenReference.impedance.magnitudes,
		IMPEDANCE_TOLERANCE_OHM,
	);
	results.push({ category: 'Impedance magnitude', ...impMagResult, tolerance: IMPEDANCE_TOLERANCE_OHM });
	if (!impMagResult.pass) allPassed = false;

	// 6. Impedance phase
	const impPhaseResult = compareArrays(
		currentOutput.impedance.phases,
		goldenReference.impedance.phases,
		PHASE_TOLERANCE_DEG,
	);
	results.push({ category: 'Impedance phase', ...impPhaseResult, tolerance: PHASE_TOLERANCE_DEG });
	if (!impPhaseResult.pass) allPassed = false;

	// Print results table
	console.log('\n--- Golden Reference Verification ---');
	console.log('');
	for (const r of results) {
		const status = r.pass ? 'PASS' : 'FAIL';
		const deviation = r.maxDeviation === Infinity
			? r.message || 'N/A'
			: `max deviation: ${r.maxDeviation.toFixed(6)}`;
		const toleranceStr = r.tolerance !== undefined ? ` (tolerance: ${r.tolerance})` : '';
		console.log(`  [${status}] ${r.category}: ${deviation}${toleranceStr}`);
	}
	console.log('');
	console.log(allPassed ? 'RESULT: ALL PASSED' : 'RESULT: FAILED');
	console.log('--- End Verification ---');

	return allPassed ? 0 : 1;
}

// --- Benchmark ---

/**
 * Run the benchmark: warm-up + timed iterations, report median and per-stage breakdown.
 */
function runBenchmark(circuit) {
	console.log('=== Simulation Benchmark ===');
	console.log(`Circuit: vivace 1_0_3.json`);
	console.log(`Frequency range: 1 Hz – 100 kHz, 50 points/decade`);
	console.log('');

	// Warm-up
	console.log(`Warm-up (${WARMUP_ITERATIONS} iteration)...`);
	for (let i = 0; i < WARMUP_ITERATIONS; i++) {
		runPipeline(circuit, false);
	}
	console.log('Warm-up complete.');
	console.log('');

	// Timed iterations
	const times = [];
	let lastProfiler = null;

	console.log(`Running ${TIMED_ITERATIONS} timed iterations...`);
	for (let i = 0; i < TIMED_ITERATIONS; i++) {
		const start = performance.now();
		const result = runPipeline(circuit, true);
		const elapsed = performance.now() - start;
		times.push(elapsed);
		lastProfiler = result.profiler;
		console.log(`  Iteration ${i + 1}: ${elapsed.toFixed(1)}ms`);
	}

	// Calculate median
	const sorted = [...times].sort((a, b) => a - b);
	const median = sorted[Math.floor(sorted.length / 2)];
	const min = sorted[0];
	const max = sorted[sorted.length - 1];

	console.log('');
	console.log('--- Timing Summary ---');
	console.log(`  Median: ${median.toFixed(1)}ms`);
	console.log(`  Min:    ${min.toFixed(1)}ms`);
	console.log(`  Max:    ${max.toFixed(1)}ms`);

	// Per-stage breakdown from last profiled run
	if (lastProfiler) {
		console.log('');
		console.log('--- Per-Stage Breakdown (last iteration) ---');
		lastProfiler.printReport();
	}

	console.log('');
	return median;
}

// --- Capture ---

/**
 * Capture golden reference from current code.
 */
function runCapture(circuit) {
	console.log('Capturing golden reference from current code...');
	const { systemResponse, impedanceResponse } = runPipeline(circuit, false);
	const serialized = serializeOutput(systemResponse, impedanceResponse);

	// Ensure benchmarks directory exists
	const benchmarksDir = path.dirname(GOLDEN_REF_PATH);
	if (!fs.existsSync(benchmarksDir)) {
		fs.mkdirSync(benchmarksDir, { recursive: true });
	}

	fs.writeFileSync(GOLDEN_REF_PATH, JSON.stringify(serialized, null, 2));
	console.log(`Golden reference saved to ${GOLDEN_REF_PATH}`);
	console.log(`  Frequencies: ${serialized.frequencies.length} points`);
	console.log(`  Speakers: ${Object.keys(serialized.speakers).length}`);
	console.log(`  Impedance points: ${serialized.impedance.frequencies.length}`);
}

// --- Main ---

function main() {
	const args = process.argv.slice(2);
	const mode = args.includes('--capture') ? 'capture'
		: args.includes('--verify') ? 'verify'
			: 'benchmark';

	// Load circuit
	console.log('Loading vivace 1_0_3.json circuit...');
	const jsonData = JSON.parse(fs.readFileSync(VIVACE_PATH, 'utf8'));
	const circuit = Circuit.fromJSON(jsonData);
	console.log(`Circuit loaded: ${circuit.components.length} components, ${circuit.wires.length} wires`);
	console.log('');

	switch (mode) {
		case 'capture':
			runCapture(circuit);
			break;
		case 'verify':
			process.exitCode = runVerification(circuit);
			break;
		default:
			runBenchmark(circuit);
			break;
	}
}

main();
