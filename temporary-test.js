/**
 * Temporary test: verify refactored CircuitSolver against golden reference.
 *
 * 1. Loads the vivace circuit
 * 2. Runs the full pipeline (CircuitSolver + FrequencyAnalyzer)
 * 3. Compares output against the golden reference at benchmarks/golden-reference.json
 * 4. Reports timing
 */

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

const { Circuit } = require('./src/models/Circuit');
const CircuitSolver = require('./src/simulation/CircuitSolver').default;
const FrequencyAnalyzer = require('./src/simulation/FrequencyAnalyzer').default;

// --- Constants ---
const VIVACE_PATH = path.resolve(__dirname, 'research/dxo-files/vivace 1_0_3.json');
const GOLDEN_REF_PATH = path.resolve(__dirname, 'benchmarks/golden-reference.json');

const SPL_TOLERANCE_DB = 0.01;
const PHASE_TOLERANCE_DEG = 0.1;
const IMPEDANCE_TOLERANCE_OHM = 0.01;

// --- Helpers ---

function compareArrays(actual, expected, tolerance) {
	if (actual.length !== expected.length) {
		return {
			pass: false,
			maxDeviation: Infinity,
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

// --- Main ---

function main() {
	console.log('=== Refactored CircuitSolver Verification ===\n');

	// Load circuit
	console.log('Loading vivace 1_0_3.json circuit...');
	const jsonData = JSON.parse(fs.readFileSync(VIVACE_PATH, 'utf8'));
	const circuit = Circuit.fromJSON(jsonData);
	console.log(`Circuit loaded: ${circuit.components.length} components, ${circuit.wires.length} wires\n`);

	// Load golden reference
	if (!fs.existsSync(GOLDEN_REF_PATH)) {
		console.error('ERROR: Golden reference not found at', GOLDEN_REF_PATH);
		process.exit(1);
	}
	const goldenReference = JSON.parse(fs.readFileSync(GOLDEN_REF_PATH, 'utf8'));
	console.log('Golden reference loaded.\n');

	// Warm-up run
	console.log('Warm-up run...');
	const warmupSolver = new CircuitSolver(circuit);
	warmupSolver.solveAllFrequencies(1, 100000, 50);
	console.log('Warm-up complete.\n');

	// Timed run
	console.log('Timed run...');
	const start = performance.now();

	const solver = new CircuitSolver(circuit);
	const solverResults = solver.solveAllFrequencies(1, 100000, 50);

	const analyzer = new FrequencyAnalyzer(circuit, solverResults);
	const systemResponse = analyzer.calculateSystemResponse();
	const impedanceResponse = analyzer.calculateImpedance();

	const elapsed = performance.now() - start;
	console.log(`Pipeline execution time: ${elapsed.toFixed(1)}ms\n`);

	// Serialize for comparison
	const currentOutput = serializeOutput(systemResponse, impedanceResponse);

	// --- Verification ---
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

	// Print results
	console.log('--- Golden Reference Verification ---\n');
	for (const r of results) {
		const status = r.pass ? 'PASS' : 'FAIL';
		const deviation = r.maxDeviation === Infinity
			? r.message || 'N/A'
			: `max deviation: ${r.maxDeviation.toExponential(4)}`;
		const toleranceStr = r.tolerance !== undefined ? ` (tolerance: ${r.tolerance})` : '';
		console.log(`  [${status}] ${r.category}: ${deviation}${toleranceStr}`);
	}
	console.log('');
	console.log(allPassed ? 'RESULT: ALL PASSED ✓' : 'RESULT: FAILED ✗');
	console.log(`\nPipeline time: ${elapsed.toFixed(1)}ms (target: <80ms)`);
	console.log('--- End Verification ---');

	process.exit(allPassed ? 0 : 1);
}

main();
