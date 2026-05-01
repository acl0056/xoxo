import fc from 'fast-check';
import Complex from 'complex.js';
import CircuitSolver from '@/simulation/CircuitSolver';
import FrequencyAnalyzer from '@/simulation/FrequencyAnalyzer';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { WireSegment } from '@/models/WireSegment';
import { Wire } from '@/models/Wire';

/**
 * Preservation Property Tests — Speaker Impedance Model Bugfix
 *
 * Property 3: Preservation — Passive Component Admittance Unchanged
 * Property 4: Preservation — SPL Adjustments Unchanged
 *
 * These tests capture the CURRENT (baseline) behavior that must be preserved
 * after the bugfix is applied. They MUST PASS on unfixed code.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
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
 * Build a minimal circuit with a generic passive component for admittance testing.
 * We only need the circuit + solver to call calculateAdmittance directly.
 */
function buildCircuitWithComponent(component) {
	const circuit = new Circuit();
	const source = new VoltageSource(0, 0);
	const ground = new Ground(20, 0);

	circuit.addComponent(source);
	circuit.addComponent(component);
	circuit.addComponent(ground);

	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 0 },
		{ componentId: component.id, terminal: 0 },
	));
	circuit.addWire(new Wire(
		{ componentId: component.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	return { circuit, solver: new CircuitSolver(circuit) };
}

// ---------------------------------------------------------------------------
// Property 3: Passive Component Admittance Preservation
// ---------------------------------------------------------------------------

describe('Preservation: Passive Component Admittance (Property 3)', () => {
	/**
	 * **Validates: Requirements 3.1**
	 *
	 * For any resistor with R > 0 and any frequency, calculateAdmittance
	 * returns Y = 1/R (purely real).
	 */
	test('Resistor admittance: Y = 1/R for all R > 0 and all frequencies', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0.1, max: 1e6, noNaN: true }),   // resistance
				fc.double({ min: 1, max: 100000, noNaN: true }),   // frequency
				(resistance, frequency) => {
					const resistor = new Resistor(5, 0);
					resistor.parameters.resistance = resistance;

					const { solver } = buildCircuitWithComponent(resistor);
					const omega = 2 * Math.PI * frequency;
					const admittance = solver.calculateAdmittance(resistor, omega);

					const expectedReal = 1.0 / resistance;

					expect(admittance.re).toBeCloseTo(expectedReal, 8);
					expect(admittance.im).toBeCloseTo(0, 8);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * **Validates: Requirements 3.1**
	 *
	 * For any capacitor with C > 0, ESR ≥ 0 and any frequency,
	 * calculateAdmittance returns Y = 1/(ESR + 1/(jωC)).
	 */
	test('Capacitor admittance: Y = 1/(ESR + 1/(jωC)) for all C > 0, ESR ≥ 0', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1e-9, max: 1e-2, noNaN: true }),  // capacitance
				fc.double({ min: 0, max: 10, noNaN: true }),        // ESR
				fc.double({ min: 1, max: 100000, noNaN: true }),    // frequency
				(capacitance, esr, frequency) => {
					const capacitor = new Capacitor(5, 0);
					capacitor.parameters.capacitance = capacitance;
					capacitor.parameters.esr = esr;

					const { solver } = buildCircuitWithComponent(capacitor);
					const omega = 2 * Math.PI * frequency;
					const admittance = solver.calculateAdmittance(capacitor, omega);

					// Z = ESR + 1/(jωC) = ESR - j/(ωC)
					const capacitiveReactance = -1.0 / (omega * capacitance);
					const impedance = new Complex(esr, capacitiveReactance);
					const expectedAdmittance = new Complex(1, 0).div(impedance);

					expect(admittance.re).toBeCloseTo(expectedAdmittance.re, 6);
					expect(admittance.im).toBeCloseTo(expectedAdmittance.im, 6);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * **Validates: Requirements 3.1**
	 *
	 * For any inductor with L > 0, ESR ≥ 0 and any frequency,
	 * calculateAdmittance returns Y = 1/(ESR + jωL).
	 */
	test('Inductor admittance: Y = 1/(ESR + jωL) for all L > 0, ESR ≥ 0', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1e-6, max: 1, noNaN: true }),     // inductance
				fc.double({ min: 0, max: 10, noNaN: true }),        // ESR
				fc.double({ min: 1, max: 100000, noNaN: true }),    // frequency
				(inductance, esr, frequency) => {
					const inductor = new Inductor(5, 0);
					inductor.parameters.inductance = inductance;
					inductor.parameters.esr = esr;

					const { solver } = buildCircuitWithComponent(inductor);
					const omega = 2 * Math.PI * frequency;
					const admittance = solver.calculateAdmittance(inductor, omega);

					// Z = ESR + jωL
					const inductiveReactance = omega * inductance;
					const impedance = new Complex(esr, inductiveReactance);
					const expectedAdmittance = new Complex(1, 0).div(impedance);

					expect(admittance.re).toBeCloseTo(expectedAdmittance.re, 6);
					expect(admittance.im).toBeCloseTo(expectedAdmittance.im, 6);
				},
			),
			{ numRuns: 100 },
		);
	});

	/**
	 * **Validates: Requirements 3.2**
	 *
	 * Any passive component in 'short' state returns Complex(1e12, 0).
	 */
	test('Short state: any passive component returns Complex(1e12, 0)', () => {
		fc.assert(
			fc.property(
				fc.constantFrom('resistor', 'capacitor', 'inductor'),
				fc.double({ min: 1, max: 100000, noNaN: true }),
				(componentType, frequency) => {
					let component;
					if (componentType === 'resistor') {
						component = new Resistor(5, 0);
					} else if (componentType === 'capacitor') {
						component = new Capacitor(5, 0);
					} else {
						component = new Inductor(5, 0);
					}
					component.parameters.state = 'short';

					const { solver } = buildCircuitWithComponent(component);
					const omega = 2 * Math.PI * frequency;
					const admittance = solver.calculateAdmittance(component, omega);

					expect(admittance.re).toBeCloseTo(1e12, 0);
					expect(admittance.im).toBeCloseTo(0, 0);
				},
			),
			{ numRuns: 30 },
		);
	});

	/**
	 * **Validates: Requirements 3.5**
	 *
	 * Wire-segment returns Complex(1000, 0) (1 mΩ resistance).
	 */
	test('Wire-segment: admittance is Complex(1000, 0) for all frequencies', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1, max: 100000, noNaN: true }),
				(frequency) => {
					const wireSegment = new WireSegment(5, 0);

					const { solver } = buildCircuitWithComponent(wireSegment);
					const omega = 2 * Math.PI * frequency;
					const admittance = solver.calculateAdmittance(wireSegment, omega);

					expect(admittance.re).toBeCloseTo(1000, 0);
					expect(admittance.im).toBeCloseTo(0, 0);
				},
			),
			{ numRuns: 30 },
		);
	});
});

// ---------------------------------------------------------------------------
// No-ZMA Fallback Preservation
// ---------------------------------------------------------------------------

describe('Preservation: No-ZMA Fallback', () => {
	/**
	 * **Validates: Requirements 3.4**
	 *
	 * Speaker with zmaData = null → admittance remains Complex(0.125, 0).
	 */
	test('Speaker with null zmaData returns Complex(0.125, 0) for all frequencies', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1, max: 100000, noNaN: true }),
				(frequency) => {
					const { circuit, speaker } = buildSimpleCircuit();
					// Ensure zmaData is null (default)
					speaker.zmaData = null;

					const solver = new CircuitSolver(circuit);
					const omega = 2 * Math.PI * frequency;
					const admittance = solver.calculateAdmittance(speaker, omega);

					expect(admittance.re).toBeCloseTo(0.125, 6);
					expect(admittance.im).toBeCloseTo(0, 6);
				},
			),
			{ numRuns: 50 },
		);
	});
});

// ---------------------------------------------------------------------------
// Muted Speaker Preservation
// ---------------------------------------------------------------------------

describe('Preservation: Muted Speaker SPL', () => {
	/**
	 * **Validates: Requirements 3.6**
	 *
	 * Muted speaker → SPL is -Infinity for all frequencies.
	 */
	test('Muted speaker returns -Infinity SPL for all frequencies', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 2, max: 10 }),  // number of frequency points
				(numFreqs) => {
					const { circuit, source, speaker } = buildSimpleCircuit({ muted: true });

					const frequencies = [];
					for (let i = 0; i < numFreqs; i++) {
						frequencies.push(20 * (2 ** i)); // 20, 40, 80, ...
					}

					speaker.frdData = createFlatFrdData(frequencies, 90);

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
// Sensitivity / Delay / Polarity Preservation
// ---------------------------------------------------------------------------

describe('Preservation: Sensitivity, Delay, and Polarity Adjustments (Property 4)', () => {
	/**
	 * **Validates: Requirements 3.7**
	 *
	 * Sensitivity adds dB to SPL. For any sensitivity value, the SPL difference
	 * between sensitivity=S and sensitivity=0 should be exactly S dB.
	 */
	test('Sensitivity adjustment: SPL difference equals sensitivity value', () => {
		fc.assert(
			fc.property(
				fc.double({ min: -20, max: 20, noNaN: true }),  // sensitivity dB
				fc.double({ min: 0.01, max: 5, noNaN: true }), // speaker voltage
				(sensitivity, speakerVoltage) => {
					const frequencies = [1000];
					const flatSPL = 90;

					// Baseline: sensitivity = 0
					const { circuit: circuit0, source: source0, speaker: speaker0 } = buildSimpleCircuit({ sensitivity: 0 });
					speaker0.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages0 = {};
					componentVoltages0[speaker0.id] = [new Complex(speakerVoltage, 0)];
					const analyzer0 = new FrequencyAnalyzer(circuit0, { frequencies, componentVoltages: componentVoltages0 });
					const result0 = analyzer0.calculateSPL(speaker0);

					// With sensitivity
					const { circuit: circuit1, source: source1, speaker: speaker1 } = buildSimpleCircuit({ sensitivity });
					speaker1.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages1 = {};
					componentVoltages1[speaker1.id] = [new Complex(speakerVoltage, 0)];
					const analyzer1 = new FrequencyAnalyzer(circuit1, { frequencies, componentVoltages: componentVoltages1 });
					const result1 = analyzer1.calculateSPL(speaker1);

					// The difference should be exactly the sensitivity value
					const splDifference = result1.spl[0] - result0.spl[0];
					expect(splDifference).toBeCloseTo(sensitivity, 4);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * **Validates: Requirements 3.7**
	 *
	 * Delay adds phase shift: -360 × f × delay_seconds.
	 * The phase difference between delay=D and delay=0 should be -360 × f × D.
	 * The delay parameter is stored in seconds.
	 */
	test('Delay adjustment: phase difference equals -360 * f * delay_seconds', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0.00001, max: 0.005, noNaN: true }),   // delay in seconds
				fc.double({ min: 100, max: 5000, noNaN: true }), // frequency
				(delaySeconds, frequency) => {
					const frequencies = [frequency];
					const flatSPL = 90;
					const speakerVoltage = 1.0;

					// Baseline: delay = 0
					const { circuit: circuit0, speaker: speaker0 } = buildSimpleCircuit({ delay: 0 });
					speaker0.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages0 = {};
					componentVoltages0[speaker0.id] = [new Complex(speakerVoltage, 0)];
					const analyzer0 = new FrequencyAnalyzer(circuit0, { frequencies, componentVoltages: componentVoltages0 });
					const result0 = analyzer0.calculateSPL(speaker0);

					// With delay (parameter is in seconds)
					const { circuit: circuit1, speaker: speaker1 } = buildSimpleCircuit({ delay: delaySeconds });
					speaker1.frdData = createFlatFrdData(frequencies, flatSPL);
					const componentVoltages1 = {};
					componentVoltages1[speaker1.id] = [new Complex(speakerVoltage, 0)];
					const analyzer1 = new FrequencyAnalyzer(circuit1, { frequencies, componentVoltages: componentVoltages1 });
					const result1 = analyzer1.calculateSPL(speaker1);

					// Expected phase shift from delay (delay is already in seconds)
					const expectedPhaseShift = -360 * frequency * delaySeconds;

					// Compute raw phase difference (before normalization)
					let phaseDifference = result1.phase[0] - result0.phase[0];

					// Normalize to -180..+180 for comparison
					while (phaseDifference > 180) phaseDifference -= 360;
					while (phaseDifference < -180) phaseDifference += 360;

					let normalizedExpected = expectedPhaseShift;
					while (normalizedExpected > 180) normalizedExpected -= 360;
					while (normalizedExpected < -180) normalizedExpected += 360;

					expect(phaseDifference).toBeCloseTo(normalizedExpected, 2);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * **Validates: Requirements 3.7**
	 *
	 * Polarity inversion adds 180° phase shift.
	 */
	test('Polarity inversion: phase difference is 180° (or -180°)', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 100, max: 10000, noNaN: true }), // frequency
				fc.double({ min: 0.01, max: 5, noNaN: true }),    // speaker voltage
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

					// Phase difference should be ±180°
					let phaseDifference = result1.phase[0] - result0.phase[0];
					while (phaseDifference > 180) phaseDifference -= 360;
					while (phaseDifference < -180) phaseDifference += 360;

					expect(Math.abs(phaseDifference)).toBeCloseTo(180, 2);
				},
			),
			{ numRuns: 50 },
		);
	});

	/**
	 * **Validates: Requirements 3.8**
	 *
	 * Voltage source default: V = sqrt(1 × 8) = 2.828V.
	 */
	test('Voltage source default: V = sqrt(P × Z) = sqrt(1 × 8) ≈ 2.828V', () => {
		const source = new VoltageSource(0, 0);
		const voltage = source.getVoltage();
		expect(voltage).toBeCloseTo(Math.sqrt(1 * 8), 6);
		expect(voltage).toBeCloseTo(2.828427, 4);
	});
});
