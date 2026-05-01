import fc from 'fast-check';
import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';
import { Circuit } from '@/models/Circuit';

const fs = require('fs');
const path = require('path');

/**
 * Bug Condition Exploration Tests — System Response Accuracy Bugfix
 *
 * Property 1: Bug Condition — Delay Units Mismatch & Terminal Ordering
 *
 * These tests encode the EXPECTED (correct) behavior. On UNFIXED code they
 * are expected to FAIL, which proves the bugs exist. After the fix is applied
 * these same tests should PASS, confirming the bugs are resolved.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an xSim .FRD reference file.
 * Lines starting with `"` are comments; data lines are whitespace-separated:
 *   frequency  magnitude  phase
 *
 * @param {string} filePath - Absolute or relative path to the .FRD file
 * @returns {{ frequencies: number[], magnitudes: number[], phases: number[] }}
 */
function parseReferenceFRD(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split(/\r?\n/);
	const frequencies = [];
	const magnitudes = [];
	const phases = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('"')) continue;

		const parts = trimmed.split(/\s+/);
		if (parts.length >= 3) {
			const freq = parseFloat(parts[0]);
			const mag = parseFloat(parts[1]);
			const phase = parseFloat(parts[2]);
			if (!Number.isNaN(freq) && !Number.isNaN(mag) && !Number.isNaN(phase)) {
				frequencies.push(freq);
				magnitudes.push(mag);
				phases.push(phase);
			}
		}
	}

	return { frequencies, magnitudes, phases };
}

/**
 * Linear interpolation helper for reference data.
 * @param {number[]} xArray - Sorted ascending X values
 * @param {number[]} yArray - Corresponding Y values
 * @param {number} x - X value to interpolate at
 * @returns {number} Interpolated Y value
 */
function interpolate(xArray, yArray, x) {
	if (x <= xArray[0]) return yArray[0];
	if (x >= xArray[xArray.length - 1]) return yArray[yArray.length - 1];

	let low = 0;
	let high = xArray.length - 1;
	while (high - low > 1) {
		const mid = (low + high) >> 1;
		if (xArray[mid] <= x) {
			low = mid;
		} else {
			high = mid;
		}
	}

	const t = (x - xArray[low]) / (xArray[high] - xArray[low]);
	return yArray[low] + t * (yArray[high] - yArray[low]);
}

// ---------------------------------------------------------------------------
// Shared setup: load tonic project and run simulation once
// ---------------------------------------------------------------------------

let circuit;
let solver;
let solverResults;
let analyzer;
let systemResponse;
let referenceFRD;

beforeAll(() => {
	// Load the tonic two-way crossover project
	const tonicJsonPath = path.resolve(__dirname, '../../research/dxo-files/tonic xo 0_1_1.json');
	const tonicJson = JSON.parse(fs.readFileSync(tonicJsonPath, 'utf8'));
	circuit = Circuit.fromJSON(tonicJson);

	// The JSON already has embedded frdData and zmaData on the speaker components

	// Run the simulation
	solver = new CircuitSolver(circuit);
	solverResults = solver.solveAllFrequencies(1, 100000, 48);

	// Calculate system response
	analyzer = new FrequencyAnalyzer(circuit, solverResults);
	systemResponse = analyzer.calculateSystemResponse(0);

	// Load xSim reference data
	const referencePath = path.resolve(__dirname, '../../research/dxo-files/tonic 0_1_1 system.FRD');
	referenceFRD = parseReferenceFRD(referencePath);
});

// ---------------------------------------------------------------------------
// C1 — Delay Units Mismatch (PRIMARY — causes 2.4 dB crossover dip)
// ---------------------------------------------------------------------------

describe('C1 — Delay Units Mismatch (PRIMARY)', () => {
	/**
	 * **Validates: Requirements 2.1, 2.2**
	 *
	 * For random frequencies in the crossover region [1000, 3000] Hz,
	 * the system SPL should be within 1 dB of the xSim reference.
	 *
	 * On UNFIXED code: the delay phase shift is ~1000x too small, causing
	 * partial cancellation and a 2.4 dB dip → test FAILS.
	 */
	it('system SPL matches xSim reference within 1 dB across crossover region (1000–3000 Hz)', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1000, max: 3000 }),
				(frequency) => {
					// Interpolate xSim reference SPL at this frequency
					const referenceSPL = interpolate(
						referenceFRD.frequencies,
						referenceFRD.magnitudes,
						frequency,
					);

					// Interpolate simulated system SPL at this frequency
					const simulatedSPL = interpolate(
						systemResponse.frequencies,
						systemResponse.spl,
						frequency,
					);

					const error = Math.abs(simulatedSPL - referenceSPL);

					// Assert within 1 dB tolerance
					expect(error).toBeLessThanOrEqual(1.0);
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// C2 — Terminal Ordering (causes 180° absolute phase offset)
// ---------------------------------------------------------------------------

describe('C2 — Terminal Ordering', () => {
	/**
	 * **Validates: Requirements 2.3, 2.4**
	 *
	 * For each speaker component, getComponentTerminals() should return
	 * terminals in sorted order: terminals[0] should lexicographically
	 * come before terminals[1] (i.e., _0 before _1).
	 *
	 * On UNFIXED code: terminals are returned as [componentId_1, componentId_0]
	 * (reversed) → test FAILS.
	 */
	it('getComponentTerminals returns terminals in sorted order for all speakers', () => {
		// Build node map so getComponentTerminals works correctly
		solver.buildNodeMap();

		const speakers = circuit.components.filter((c) => c.type === 'speaker');
		expect(speakers.length).toBeGreaterThanOrEqual(2);

		for (const speaker of speakers) {
			const terminals = solver.getComponentTerminals(speaker);
			expect(terminals.length).toBe(2);

			// terminals[0] should come before terminals[1] lexicographically
			expect(terminals[0] < terminals[1]).toBe(true);
		}
	});
});
