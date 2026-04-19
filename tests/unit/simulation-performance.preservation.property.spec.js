import fs from 'fs';
import path from 'path';
import { Circuit } from '@/models/Circuit';
import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';

/**
 * Preservation Property Tests — Simulation Output Numerical Equivalence
 *
 * Property 2: Preservation — The simulation pipeline must produce numerically
 * identical results (within floating-point tolerance) before and after any
 * performance optimizations.
 *
 * These tests capture a golden reference from the CURRENT (unfixed) code,
 * then compare the pipeline output against that reference. On unfixed code
 * the output matches itself, so these tests trivially PASS. After optimization,
 * these same tests verify that correctness is preserved.
 *
 * Validates: Requirements 2.2, 3.1, 3.2, 3.5
 */

// Tolerance constants
const SPL_TOLERANCE_DB = 0.01;
const PHASE_TOLERANCE_DEG = 0.1;
const IMPEDANCE_TOLERANCE_OHM = 0.01;

const GOLDEN_REFERENCE_PATH = path.resolve(__dirname, '../../benchmarks/golden-reference.json');
const VIVACE_CIRCUIT_PATH = path.resolve(__dirname, '../../research/dxo-files/vivace 1_0_3.json');

/**
 * Run the full simulation pipeline on the vivace circuit and return all outputs.
 */
function runPipeline(circuit) {
	const solver = new CircuitSolver(circuit);
	const solverResults = solver.solveAllFrequencies(1, 100000, 50);

	const analyzer = new FrequencyAnalyzer(circuit, solverResults);
	const systemResponse = analyzer.calculateSystemResponse();
	const impedanceResponse = analyzer.calculateImpedance();

	return { systemResponse, impedanceResponse };
}

/**
 * Serialize pipeline output to a JSON-safe format for the golden reference.
 * Complex objects and -Infinity values need special handling.
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

describe('Preservation: Simulation Output Numerical Equivalence', () => {
	let circuit;
	let goldenReference;

	beforeAll(() => {
		// Load the vivace 1_0_3.json circuit
		const jsonData = JSON.parse(fs.readFileSync(VIVACE_CIRCUIT_PATH, 'utf8'));
		circuit = Circuit.fromJSON(jsonData);

		// Capture or load golden reference
		if (!fs.existsSync(GOLDEN_REFERENCE_PATH)) {
			// Golden reference doesn't exist yet — capture it from current (unfixed) code
			console.log('Golden reference not found. Capturing from current code...');
			const { systemResponse, impedanceResponse } = runPipeline(circuit);
			const serialized = serializeOutput(systemResponse, impedanceResponse);

			// Ensure benchmarks directory exists
			const benchmarksDir = path.dirname(GOLDEN_REFERENCE_PATH);
			if (!fs.existsSync(benchmarksDir)) {
				fs.mkdirSync(benchmarksDir, { recursive: true });
			}

			fs.writeFileSync(GOLDEN_REFERENCE_PATH, JSON.stringify(serialized, null, 2));
			console.log(`Golden reference saved to ${GOLDEN_REFERENCE_PATH}`);
			goldenReference = serialized;
		} else {
			// Load existing golden reference
			goldenReference = JSON.parse(fs.readFileSync(GOLDEN_REFERENCE_PATH, 'utf8'));
			console.log('Loaded existing golden reference.');
		}
	}, 60000); // 60s timeout for beforeAll (pipeline is slow on unfixed code)

	/**
	 * Helper: assert two arrays are element-wise equal within tolerance.
	 */
	function assertArrayWithinTolerance(actual, expected, tolerance, label) {
		expect(actual.length).toBe(expected.length);
		for (let i = 0; i < actual.length; i++) {
			const diff = Math.abs(actual[i] - expected[i]);
			if (diff > tolerance) {
				throw new Error(
					`${label} mismatch at index ${i}: actual=${actual[i]}, expected=${expected[i]}, diff=${diff}, tolerance=${tolerance}`,
				);
			}
		}
	}

	/**
	 * **Validates: Requirements 3.1, 3.5**
	 *
	 * Frequency point count and values must be identical.
	 */
	test('frequency points are identical', () => {
		const { systemResponse } = runPipeline(circuit);

		expect(systemResponse.frequencies.length).toBe(goldenReference.frequencies.length);

		for (let i = 0; i < systemResponse.frequencies.length; i++) {
			expect(systemResponse.frequencies[i]).toBe(goldenReference.frequencies[i]);
		}
	}, 60000);

	/**
	 * **Validates: Requirements 2.2, 3.1**
	 *
	 * Per-speaker frequency response SPL must match golden reference within ±0.01 dB.
	 */
	test('per-speaker frequency response SPL within ±0.01 dB', () => {
		const { systemResponse } = runPipeline(circuit);

		const goldenSpeakerIds = Object.keys(goldenReference.speakers);
		const currentSpeakerIds = Object.keys(systemResponse.speakerResponses);

		expect(currentSpeakerIds.sort()).toEqual(goldenSpeakerIds.sort());

		for (const speakerId of goldenSpeakerIds) {
			const currentSpeaker = systemResponse.speakerResponses[speakerId];
			const goldenSpeaker = goldenReference.speakers[speakerId];

			assertArrayWithinTolerance(
				currentSpeaker.spl,
				goldenSpeaker.spl,
				SPL_TOLERANCE_DB,
				`Speaker ${speakerId} SPL`,
			);
		}
	}, 60000);

	/**
	 * **Validates: Requirements 2.2, 3.1**
	 *
	 * Per-speaker frequency response phase must match golden reference within ±0.1°.
	 */
	test('per-speaker frequency response phase within ±0.1°', () => {
		const { systemResponse } = runPipeline(circuit);

		const goldenSpeakerIds = Object.keys(goldenReference.speakers);

		for (const speakerId of goldenSpeakerIds) {
			const currentSpeaker = systemResponse.speakerResponses[speakerId];
			const goldenSpeaker = goldenReference.speakers[speakerId];

			assertArrayWithinTolerance(
				currentSpeaker.phase,
				goldenSpeaker.phase,
				PHASE_TOLERANCE_DEG,
				`Speaker ${speakerId} phase`,
			);
		}
	}, 60000);

	/**
	 * **Validates: Requirements 2.2, 3.1**
	 *
	 * Combined system response SPL must match golden reference within ±0.01 dB
	 * and phase within ±0.1°.
	 */
	test('combined system response SPL within ±0.01 dB and phase within ±0.1°', () => {
		const { systemResponse } = runPipeline(circuit);

		assertArrayWithinTolerance(
			systemResponse.spl,
			goldenReference.system.spl,
			SPL_TOLERANCE_DB,
			'System SPL',
		);

		assertArrayWithinTolerance(
			systemResponse.phase,
			goldenReference.system.phase,
			PHASE_TOLERANCE_DEG,
			'System phase',
		);
	}, 60000);

	/**
	 * **Validates: Requirements 2.2, 3.2**
	 *
	 * Impedance magnitude must match golden reference within ±0.01 Ω
	 * and phase within ±0.1°.
	 */
	test('impedance magnitude within ±0.01 Ω and phase within ±0.1°', () => {
		const { impedanceResponse } = runPipeline(circuit);

		assertArrayWithinTolerance(
			impedanceResponse.impedances,
			goldenReference.impedance.magnitudes,
			IMPEDANCE_TOLERANCE_OHM,
			'Impedance magnitude',
		);

		assertArrayWithinTolerance(
			impedanceResponse.phases,
			goldenReference.impedance.phases,
			PHASE_TOLERANCE_DEG,
			'Impedance phase',
		);
	}, 60000);
});
