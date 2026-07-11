import fc from 'fast-check';
import Complex from 'complex.js';
import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';
import { Circuit } from '@/models/Circuit';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';

/**
 * Bug Condition Exploration Tests — Speaker Impedance Model Bugfix
 *
 * Property 1: Bug Condition — Fixed Impedance & Missing SPL Normalization
 *
 * These tests encode the EXPECTED (correct) behavior. On UNFIXED code they
 * are expected to FAIL, which proves the bugs exist. After the fix is applied
 * these same tests should PASS, confirming the bugs are resolved.
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5, 2.1, 2.4, 2.5
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal circuit: VoltageSource → Speaker → Ground
 * Returns { circuit, source, speaker, ground }
 */
function buildSimpleCircuit(speakerOptions = {}) {
	const circuit = new Circuit();

	const source = new VoltageSource(0, 0);
	source.parameters.power = 1.0;
	source.parameters.impedance = 8.0; // V_source = sqrt(1*8) = 2.828 V

	const speaker = new Speaker(10, 0);
	speaker.label = 'S1';
	speaker.parameters.sensitivity = 0;
	speaker.parameters.delay = 0;
	speaker.parameters.inverted = false;
	speaker.parameters.muted = false;

	// Apply any overrides
	Object.assign(speaker.parameters, speakerOptions);

	const ground = new Ground(20, 0);

	circuit.addComponent(source);
	circuit.addComponent(speaker);
	circuit.addComponent(ground);

	// Wire: source terminal 0 → speaker terminal 0
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 0 },
		{ componentId: speaker.id, terminal: 0 },
	));
	// Wire: speaker terminal 1 → ground terminal 0
	circuit.addWire(new Wire(
		{ componentId: speaker.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));
	// Wire: source terminal 1 → ground terminal 0
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	return { circuit, source, speaker, ground };
}

/**
 * Create synthetic ZMA data with known impedance values.
 * @param {Array<{freq: number, impedance: number, phaseDeg: number}>} points
 * @returns {{ frequencies: number[], impedances: number[], phases: number[] }}
 */
function createZmaData(points) {
	return {
		frequencies: points.map((p) => p.freq),
		impedances: points.map((p) => p.impedance),
		phases: points.map((p) => p.phaseDeg),
	};
}

/**
 * Create synthetic FRD data (flat SPL across all frequencies).
 * @param {number[]} frequencies
 * @param {number} flatSPL - dB SPL value at every frequency
 * @returns {{ frequencies: number[], magnitudes: number[], phases: number[] }}
 */
function createFlatFrdData(frequencies, flatSPL = 90) {
	return {
		frequencies,
		magnitudes: frequencies.map(() => flatSPL),
		phases: frequencies.map(() => 0),
	};
}

// ---------------------------------------------------------------------------
// C1 — Fixed Impedance Bug Exploration
// ---------------------------------------------------------------------------

describe('Bug Condition Exploration: C1 — Fixed Impedance', () => {
	/**
	 * **Validates: Requirements 1.1, 2.1**
	 *
	 * When a speaker has ZMA data loaded, calculateAdmittance should return
	 * the frequency-dependent admittance derived from interpolated ZMA data,
	 * NOT the hardcoded Complex(0.125, 0).
	 *
	 * On UNFIXED code this test FAILS because the speaker case always returns
	 * Complex(0.125, 0) regardless of ZMA data.
	 */
	test('C1: speaker with ZMA data returns frequency-dependent admittance, not hardcoded 8Ω', () => {
		// Create a speaker with ZMA data: 40Ω at 50 Hz, 6Ω at 200 Hz
		const { circuit, speaker } = buildSimpleCircuit();
		speaker.zmaData = createZmaData([
			{ freq: 20, impedance: 30, phaseDeg: -20 },
			{ freq: 50, impedance: 40, phaseDeg: -10 },
			{ freq: 100, impedance: 15, phaseDeg: 5 },
			{ freq: 200, impedance: 6, phaseDeg: 10 },
			{ freq: 500, impedance: 8, phaseDeg: 0 },
			{ freq: 1000, impedance: 10, phaseDeg: -5 },
		]);

		const solver = new CircuitSolver(circuit);

		// Test at 50 Hz — ZMA says 40Ω at -10°
		const omega50 = 2 * Math.PI * 50;
		const admittance50 = solver.calculateAdmittance(speaker, omega50);

		// Expected: Z = 40*(cos(-10°) + j*sin(-10°)), Y = 1/Z
		const phaseRad50 = (-10 * Math.PI) / 180;
		const z50 = new Complex(40 * Math.cos(phaseRad50), 40 * Math.sin(phaseRad50));
		const expectedY50 = new Complex(1, 0).div(z50);

		// The admittance should NOT be the hardcoded 0.125 + 0j
		expect(admittance50.re).not.toBeCloseTo(0.125, 3);

		// The admittance SHOULD match the ZMA-derived value
		expect(admittance50.re).toBeCloseTo(expectedY50.re, 4);
		expect(admittance50.im).toBeCloseTo(expectedY50.im, 4);

		// Test at 200 Hz — ZMA says 6Ω at 10°
		const omega200 = 2 * Math.PI * 200;
		const admittance200 = solver.calculateAdmittance(speaker, omega200);

		const phaseRad200 = (10 * Math.PI) / 180;
		const z200 = new Complex(6 * Math.cos(phaseRad200), 6 * Math.sin(phaseRad200));
		const expectedY200 = new Complex(1, 0).div(z200);

		expect(admittance200.re).not.toBeCloseTo(0.125, 3);
		expect(admittance200.re).toBeCloseTo(expectedY200.re, 4);
		expect(admittance200.im).toBeCloseTo(expectedY200.im, 4);
	});

	/**
	 * **Validates: Requirements 1.2, 2.1**
	 *
	 * Property-based: for any speaker with ZMA data and any frequency within
	 * the ZMA range, the admittance returned by calculateAdmittance should
	 * differ from the hardcoded 8Ω value (unless the ZMA data happens to be
	 * exactly 8Ω at 0° phase at that frequency, which we exclude).
	 */
	test('C1 property: admittance varies with frequency for speakers with ZMA data', () => {
		fc.assert(
			fc.property(
				// Generate ZMA impedance values that are NOT 8Ω (to guarantee difference)
				fc.double({ min: 3, max: 7.9, noNaN: true }),
				fc.double({ min: 8.1, max: 100, noNaN: true }),
				fc.double({ min: -45, max: 45, noNaN: true }),
				(lowImpedance, highImpedance, phaseDeg) => {
					const { circuit, speaker } = buildSimpleCircuit();
					speaker.zmaData = createZmaData([
						{ freq: 20, impedance: highImpedance, phaseDeg },
						{ freq: 100, impedance: lowImpedance, phaseDeg: -phaseDeg },
						{ freq: 1000, impedance: highImpedance, phaseDeg },
					]);

					const solver = new CircuitSolver(circuit);

					// Test at 100 Hz (exact ZMA point)
					const omega = 2 * Math.PI * 100;
					const admittance = solver.calculateAdmittance(speaker, omega);

					// Expected admittance from ZMA data
					const phaseRad = (-phaseDeg * Math.PI) / 180;
					const zComplex = new Complex(
						lowImpedance * Math.cos(phaseRad),
						lowImpedance * Math.sin(phaseRad),
					);
					const expectedAdmittance = new Complex(1, 0).div(zComplex);

					// Should NOT be the hardcoded 0.125 (8Ω) — verify the result
					// actually comes from ZMA data by checking it matches the expected
					// complex admittance derived from the generated impedance/phase
					expect(admittance.re).toBeCloseTo(expectedAdmittance.re, 3);
					expect(admittance.im).toBeCloseTo(expectedAdmittance.im, 3);
				},
			),
			{ numRuns: 50 },
		);
	});
});

// ---------------------------------------------------------------------------
// C2 — SPL Normalization Bug Exploration
// ---------------------------------------------------------------------------

describe('Bug Condition Exploration: C2 — SPL Normalization', () => {
	/**
	 * **Validates: Requirements 1.4, 1.5, 2.4, 2.5**
	 *
	 * When V_speaker ≈ V_source (passband), the voltage contribution to SPL
	 * should be ≈ 0 dB (i.e., 20*log10(V_speaker / V_source) ≈ 0).
	 *
	 * On UNFIXED code the contribution is 20*log10(2.828) ≈ +9.03 dB because
	 * the code uses absolute voltage instead of the voltage ratio.
	 */
	test('C2: SPL voltage contribution is ~0 dB when V_speaker ≈ V_source in passband', () => {
		const { circuit, source, speaker } = buildSimpleCircuit();

		// Set up flat FRD data at 90 dB
		const frequencies = [100, 200, 500, 1000, 2000];
		const flatSPL = 90;
		speaker.frdData = createFlatFrdData(frequencies, flatSPL);

		// V_source = sqrt(1 * 8) = 2.828 V
		const sourceVoltage = source.getVoltage();

		// Simulate: speaker voltage ≈ source voltage (passband, no attenuation)
		// Build solver results where V_speaker ≈ V_source at each frequency
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

		// In passband: SPL should be ≈ flatSPL + 0 dB = 90 dB
		// On unfixed code: SPL = 90 + 20*log10(2.828) ≈ 90 + 9.03 = 99.03 dB
		for (let i = 0; i < frequencies.length; i++) {
			const voltageContribution = result.spl[i] - flatSPL;

			// The voltage contribution should be ≈ 0 dB (normalized)
			// Allow ±0.5 dB tolerance for floating point
			expect(Math.abs(voltageContribution)).toBeLessThan(0.5);
		}
	});

	/**
	 * **Validates: Requirements 2.4, 2.5**
	 *
	 * Property-based: for any source power/impedance and any speaker voltage,
	 * the SPL voltage contribution should equal 20*log10(V_speaker / V_source),
	 * not 20*log10(V_speaker).
	 */
	test('C2 property: SPL voltage contribution equals 20*log10(V_speaker / V_source)', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0.5, max: 10, noNaN: true }), // source power
				fc.double({ min: 2, max: 32, noNaN: true }), // source impedance
				fc.double({ min: 0.01, max: 10, noNaN: true }), // speaker voltage magnitude
				(power, impedance, speakerVoltageMagnitude) => {
					const { circuit, source, speaker } = buildSimpleCircuit();

					source.parameters.power = power;
					source.parameters.impedance = impedance;
					const sourceVoltage = source.getVoltage(); // sqrt(P * Z)

					const frequencies = [1000];
					const flatSPL = 90;
					speaker.frdData = createFlatFrdData(frequencies, flatSPL);

					const componentVoltages = {};
					componentVoltages[speaker.id] = [
						new Complex(speakerVoltageMagnitude, 0),
					];

					const solverResults = {
						frequencies,
						componentVoltages,
					};

					const analyzer = new FrequencyAnalyzer(circuit, solverResults);
					const result = analyzer.calculateSPL(speaker);

					// Expected: SPL = flatSPL + 20*log10(V_speaker / V_source)
					const expectedContribution = 20 * Math.log10(speakerVoltageMagnitude / sourceVoltage);
					const expectedSPL = flatSPL + expectedContribution;

					// Allow ±0.1 dB tolerance
					expect(result.spl[0]).toBeCloseTo(expectedSPL, 1);
				},
			),
			{ numRuns: 50 },
		);
	});
});
