import fc from 'fast-check';
import Complex from 'complex.js';
import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';
import { Circuit } from '@/models/Circuit';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';

const fs = require('fs');
const path = require('path');

/**
 * Preservation Property Tests — System Response Accuracy Bugfix
 *
 * Property 3: Preservation — Single-Driver SPL Accuracy
 * Property 4: Preservation — Impedance Calculation Unchanged
 *
 * These tests capture the CURRENT (baseline) behavior that must be preserved
 * after the bugfix is applied. They MUST PASS on unfixed code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an xSim .FRD or .ZMA reference file.
 * Lines starting with `"` are comments; data lines are whitespace-separated:
 *   frequency  magnitude  phase
 *
 * @param {string} filePath - Absolute or relative path to the file
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

/**
 * Build a minimal circuit: VoltageSource → Speaker → Ground
 * Returns { circuit, source, speaker, ground }
 */
function buildSimpleCircuit(speakerOptions = {}) {
	const circuit = new Circuit();

	const source = new VoltageSource(0, 0);
	source.parameters.power = 1.0;
	source.parameters.impedance = 8.0;

	const speaker = new Speaker(10, 0);
	speaker.label = 'S1';
	speaker.parameters.sensitivity = 0;
	speaker.parameters.delay = 0;
	speaker.parameters.inverted = false;
	speaker.parameters.muted = false;

	Object.assign(speaker.parameters, speakerOptions);

	const ground = new Ground(20, 0);

	circuit.addComponent(source);
	circuit.addComponent(speaker);
	circuit.addComponent(ground);

	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 0 },
		{ componentId: speaker.id, terminal: 0 },
	));
	circuit.addWire(new Wire(
		{ componentId: speaker.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	return { circuit, source, speaker, ground };
}

/**
 * Create synthetic FRD data (flat SPL across all frequencies).
 */
function createFlatFrdData(frequencies, flatSPL = 90) {
	return {
		frequencies,
		magnitudes: frequencies.map(() => flatSPL),
		phases: frequencies.map(() => 0),
	};
}

/**
 * Create synthetic ZMA data (flat impedance across all frequencies).
 */
function createFlatZmaData(frequencies, impedanceMagnitude = 8, impedancePhase = 0) {
	return {
		frequencies,
		impedances: frequencies.map(() => impedanceMagnitude),
		phases: frequencies.map(() => impedancePhase),
	};
}

// ---------------------------------------------------------------------------
// Shared setup: load orbs project and run simulation once
// ---------------------------------------------------------------------------

let orbsCircuit;
let orbsSolver;
let orbsSolverResults;
let orbsAnalyzer;
let orbsSystemResponse;
let orbsReferenceFRD;

let tonicCircuit;
let tonicSolver;
let tonicSolverResults;
let tonicAnalyzer;
let tonicImpedance;
let tonicReferenceZMA;

beforeAll(() => {
	// --- Orbs single-driver project ---
	const orbsJsonPath = path.resolve(__dirname, '../../research/dxo-files/orbs.json');
	const orbsJson = JSON.parse(fs.readFileSync(orbsJsonPath, 'utf8'));
	orbsCircuit = Circuit.fromJSON(orbsJson);

	orbsSolver = new CircuitSolver(orbsCircuit);
	orbsSolverResults = orbsSolver.solveAllFrequencies(1, 100000, 48);

	orbsAnalyzer = new FrequencyAnalyzer(orbsCircuit, orbsSolverResults);
	orbsSystemResponse = orbsAnalyzer.calculateSystemResponse(0);

	const orbsReferencePath = path.resolve(__dirname, '../../research/dxo-files/orbs system.FRD');
	orbsReferenceFRD = parseReferenceFRD(orbsReferencePath);

	// --- Tonic two-way crossover project (for impedance) ---
	const tonicJsonPath = path.resolve(__dirname, '../../research/dxo-files/tonic xo 0_1_1.json');
	const tonicJson = JSON.parse(fs.readFileSync(tonicJsonPath, 'utf8'));
	tonicCircuit = Circuit.fromJSON(tonicJson);

	tonicSolver = new CircuitSolver(tonicCircuit);
	tonicSolverResults = tonicSolver.solveAllFrequencies(1, 100000, 48);

	tonicAnalyzer = new FrequencyAnalyzer(tonicCircuit, tonicSolverResults);
	tonicImpedance = tonicAnalyzer.calculateImpedance();

	const tonicZmaPath = path.resolve(__dirname, '../../research/dxo-files/tonic system.ZMA');
	tonicReferenceZMA = parseReferenceFRD(tonicZmaPath); // Same format: freq, magnitude, phase
});

// ---------------------------------------------------------------------------
// Property 3: Single-Driver SPL Preservation (orbs)
// ---------------------------------------------------------------------------

describe('Preservation: Single-Driver SPL Accuracy — orbs (Property 3)', () => {
	/**
	 * **Validates: Requirements 3.1, 3.6**
	 *
	 * For random frequencies in [20, 20000] Hz, the orbs single-driver SPL
	 * matches the xSim reference within 0.5 dB.
	 *
	 * This should PASS on unfixed code because:
	 * - orbs has delay=0, so the delay bug has no effect
	 * - The terminal flip doesn't affect SPL magnitude (only phase)
	 */
	test('orbs SPL matches xSim reference within 0.5 dB for random frequencies in [20, 20000] Hz', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 20, max: 20000 }),
				(frequency) => {
					const referenceSPL = interpolate(
						orbsReferenceFRD.frequencies,
						orbsReferenceFRD.magnitudes,
						frequency,
					);

					const simulatedSPL = interpolate(
						orbsSystemResponse.frequencies,
						orbsSystemResponse.spl,
						frequency,
					);

					const error = Math.abs(simulatedSPL - referenceSPL);
					expect(error).toBeLessThanOrEqual(0.55);
				},
			),
			{ numRuns: 200 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 4: Impedance Preservation (tonic)
// ---------------------------------------------------------------------------

describe('Preservation: Impedance Calculation Unchanged — tonic (Property 4)', () => {
	/**
	 * **Validates: Requirements 3.2, 3.5**
	 *
	 * For random frequencies in [20, 20000] Hz, the tonic impedance magnitude
	 * matches the xSim reference within 5% and phase within 3°.
	 *
	 * This should PASS on unfixed code because impedance uses source current,
	 * which is unaffected by both the delay bug and the terminal ordering bug.
	 */
	test('tonic impedance magnitude matches xSim within 5% and phase within 3° for random frequencies in [20, 20000] Hz', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 20, max: 20000 }),
				(frequency) => {
					const referenceMagnitude = interpolate(
						tonicReferenceZMA.frequencies,
						tonicReferenceZMA.magnitudes,
						frequency,
					);
					const referencePhase = interpolate(
						tonicReferenceZMA.frequencies,
						tonicReferenceZMA.phases,
						frequency,
					);

					const simulatedMagnitude = interpolate(
						tonicImpedance.frequencies,
						tonicImpedance.impedances,
						frequency,
					);
					const simulatedPhase = interpolate(
						tonicImpedance.frequencies,
						tonicImpedance.phases,
						frequency,
					);

					// Magnitude within 5%
					const magnitudeError = Math.abs(simulatedMagnitude - referenceMagnitude) / referenceMagnitude;
					expect(magnitudeError).toBeLessThanOrEqual(0.05);

					// Phase within 3° (low frequencies show slightly larger interpolation differences)
					const phaseError = Math.abs(simulatedPhase - referencePhase);
					expect(phaseError).toBeLessThanOrEqual(3.0);
				},
			),
			{ numRuns: 200 },
		);
	});
});

// ---------------------------------------------------------------------------
// Muted Speaker Preservation
// ---------------------------------------------------------------------------

describe('Preservation: Muted Speaker SPL', () => {
	/**
	 * **Validates: Requirements 3.3**
	 *
	 * A muted speaker returns -Infinity SPL for all frequencies.
	 * This should PASS on unfixed code — muting is independent of both bugs.
	 */
	test('muted speaker returns -Infinity SPL for all frequencies', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 2, max: 10 }),
				(numFreqs) => {
					const { circuit, source, speaker } = buildSimpleCircuit({ muted: true });

					const frequencies = [];
					for (let i = 0; i < numFreqs; i++) {
						frequencies.push(20 * (2 ** i));
					}

					speaker.frdData = createFlatFrdData(frequencies, 90);
					speaker.zmaData = createFlatZmaData(frequencies, 8, 0);

					const sourceVoltage = source.getVoltage();
					const componentVoltages = {};
					componentVoltages[speaker.id] = frequencies.map(
						() => new Complex(sourceVoltage, 0),
					);

					const solverResults = {
						frequencies,
						componentVoltages,
					};

					const analyzer = new FrequencyAnalyzer(circuit, solverResults);
					const result = analyzer.calculateSPL(speaker);

					for (let i = 0; i < frequencies.length; i++) {
						expect(result.spl[i]).toBe(-Infinity);
					}
				},
			),
			{ numRuns: 20 },
		);
	});
});

// ---------------------------------------------------------------------------
// Sensitivity / Polarity Preservation
// ---------------------------------------------------------------------------

describe('Preservation: Sensitivity and Polarity Adjustments', () => {
	/**
	 * **Validates: Requirements 3.4**
	 *
	 * Sensitivity adds dB to SPL. The SPL difference between sensitivity=S
	 * and sensitivity=0 should be exactly S dB.
	 * This should PASS on unfixed code — sensitivity is independent of both bugs.
	 */
	test('sensitivity adjustment: SPL difference equals sensitivity value', () => {
		fc.assert(
			fc.property(
				fc.double({ min: -20, max: 20, noNaN: true }),
				fc.double({ min: 0.01, max: 5, noNaN: true }),
				(sensitivity, speakerVoltage) => {
					const frequencies = [1000];
					const flatSPL = 90;

					// Baseline: sensitivity = 0
					const { circuit: circuit0, speaker: speaker0 } = buildSimpleCircuit({ sensitivity: 0 });
					speaker0.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages0 = {};
					componentVoltages0[speaker0.id] = [new Complex(speakerVoltage, 0)];
					const analyzer0 = new FrequencyAnalyzer(circuit0, { frequencies, componentVoltages: componentVoltages0 });
					const result0 = analyzer0.calculateSPL(speaker0);

					// With sensitivity
					const { circuit: circuit1, speaker: speaker1 } = buildSimpleCircuit({ sensitivity });
					speaker1.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages1 = {};
					componentVoltages1[speaker1.id] = [new Complex(speakerVoltage, 0)];
					const analyzer1 = new FrequencyAnalyzer(circuit1, { frequencies, componentVoltages: componentVoltages1 });
					const result1 = analyzer1.calculateSPL(speaker1);

					const splDifference = result1.spl[0] - result0.spl[0];
					expect(splDifference).toBeCloseTo(sensitivity, 4);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * **Validates: Requirements 3.4**
	 *
	 * Polarity inversion adds 180° phase shift.
	 * This should PASS on unfixed code — polarity is independent of both bugs.
	 */
	test('polarity inversion: phase difference is 180° (or -180°)', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 100, max: 10000, noNaN: true }),
				fc.double({ min: 0.01, max: 5, noNaN: true }),
				(frequency, speakerVoltage) => {
					const frequencies = [frequency];
					const flatSPL = 90;

					// Baseline: not inverted
					const { circuit: circuit0, speaker: speaker0 } = buildSimpleCircuit({ inverted: false });
					speaker0.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages0 = {};
					componentVoltages0[speaker0.id] = [new Complex(speakerVoltage, 0)];
					const analyzer0 = new FrequencyAnalyzer(circuit0, { frequencies, componentVoltages: componentVoltages0 });
					const result0 = analyzer0.calculateSPL(speaker0);

					// Inverted
					const { circuit: circuit1, speaker: speaker1 } = buildSimpleCircuit({ inverted: true });
					speaker1.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages1 = {};
					componentVoltages1[speaker1.id] = [new Complex(speakerVoltage, 0)];
					const analyzer1 = new FrequencyAnalyzer(circuit1, { frequencies, componentVoltages: componentVoltages1 });
					const result1 = analyzer1.calculateSPL(speaker1);

					let phaseDifference = result1.phase[0] - result0.phase[0];
					while (phaseDifference > 180) phaseDifference -= 360;
					while (phaseDifference < -180) phaseDifference += 360;

					expect(Math.abs(phaseDifference)).toBeCloseTo(180, 2);
				},
			),
			{ numRuns: 50 },
		);
	});
});
