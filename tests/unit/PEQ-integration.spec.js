import CircuitSolver from '@/simulation/CircuitSolver';
import BiquadCalculator from '@/simulation/BiquadCalculator';
import { Circuit } from '@/models/Circuit';
import { PEQ } from '@/models/PEQ';
import { Resistor } from '@/models/Resistor';
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

/**
 * Helper: compute complex magnitude from {re, im} object.
 */
function complexMagnitude(complex) {
	return Math.sqrt(complex.re * complex.re + complex.im * complex.im);
}

/**
 * Helper: compute complex division (a / b) for {re, im} objects.
 */
function complexDivide(a, b) {
	const denominator = b.re * b.re + b.im * b.im;
	return {
		re: (a.re * b.re + a.im * b.im) / denominator,
		im: (a.im * b.re - a.re * b.im) / denominator,
	};
}

/**
 * Build a simple test circuit: Source → PEQ → Resistor → Ground
 *
 * Topology:
 *   Source terminal 0 (+) → PEQ terminal 0 (+in)
 *   Source terminal 1 (-) → Ground
 *   PEQ terminal 1 (-in) → Ground
 *   PEQ terminal 2 (+out) → Resistor terminal 0
 *   PEQ terminal 3 (-out) → Ground
 *   Resistor terminal 1 → Ground
 *
 * This creates a circuit where the PEQ input sees the full source voltage
 * (since -in is grounded and +in is at source voltage), and the output
 * drives a load resistor referenced to ground.
 */
function buildSimplePEQCircuit(peqOptions = {}) {
	const circuit = new Circuit();

	const source = new VoltageSource(0, 0);
	source.parameters.power = 1.0;
	source.parameters.impedance = 8.0;

	const peq = new PEQ(10, 0);
	if (peqOptions.gain !== undefined) peq.parameters.gain = peqOptions.gain;
	if (peqOptions.delay !== undefined) peq.parameters.delay = peqOptions.delay;
	if (peqOptions.dspRate !== undefined) peq.parameters.dspRate = peqOptions.dspRate;
	if (peqOptions.muted !== undefined) peq.parameters.muted = peqOptions.muted;
	if (peqOptions.sections !== undefined) peq.parameters.sections = peqOptions.sections;

	const loadResistor = new Resistor(20, 0);
	loadResistor.parameters.resistance = 8.0;

	const ground = new Ground(30, 0);

	circuit.addComponent(source);
	circuit.addComponent(peq);
	circuit.addComponent(loadResistor);
	circuit.addComponent(ground);

	// Source+ → PEQ +in
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 0 },
		{ componentId: peq.id, terminal: 0 },
	));

	// Source- → Ground
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	// PEQ -in → Ground
	circuit.addWire(new Wire(
		{ componentId: peq.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	// PEQ +out → Resistor terminal 0
	circuit.addWire(new Wire(
		{ componentId: peq.id, terminal: 2 },
		{ componentId: loadResistor.id, terminal: 0 },
	));

	// PEQ -out → Ground
	circuit.addWire(new Wire(
		{ componentId: peq.id, terminal: 3 },
		{ componentId: ground.id, terminal: 0 },
	));

	// Resistor terminal 1 → Ground
	circuit.addWire(new Wire(
		{ componentId: loadResistor.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	return { circuit, source, peq, loadResistor, ground };
}

describe('PEQ Integration with CircuitSolver', () => {
	describe('Single PEQ in simple circuit: output voltage = input × H(f)', () => {
		test('should produce output voltage equal to input voltage times H(f) for a peaking filter', () => {
			const sections = [{
				filterType: 'peaking',
				frequency: 1000,
				q: 1.0,
				gain: 6,
				bypass: false,
			}];

			const { circuit, peq } = buildSimplePEQCircuit({ sections });
			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 500, 1000, 2000, 5000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				// Get input voltage: V(+in) - V(-in)
				const inputPosNodeId = `${peq.id}_0`;
				const inputNegNodeId = `${peq.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get output voltage: V(+out) - V(-out)
				const outputPosNodeId = `${peq.id}_2`;
				const outputNegNodeId = `${peq.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				// Expected transfer function
				const expectedH = BiquadCalculator.evaluatePEQ(peq.parameters, frequency);

				// Compute actual ratio: V_out / V_in
				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue; // Skip if input is essentially zero

				const actualRatio = complexDivide(vOutput, vInput);
				const expectedMagnitude = complexMagnitude(expectedH);
				const actualMagnitude = complexMagnitude(actualRatio);

				// Verify magnitude matches within 1% tolerance
				expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 2);
			}
		});

		test('should produce output voltage equal to input voltage times H(f) for a low-pass filter', () => {
			const sections = [{
				filterType: 'lowPass2',
				frequency: 2000,
				q: 0.707,
				gain: 0,
				bypass: false,
			}];

			const { circuit, peq } = buildSimplePEQCircuit({ sections });
			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [200, 1000, 2000, 5000, 10000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				const inputPosNodeId = `${peq.id}_0`;
				const inputNegNodeId = `${peq.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				const outputPosNodeId = `${peq.id}_2`;
				const outputNegNodeId = `${peq.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const expectedH = BiquadCalculator.evaluatePEQ(peq.parameters, frequency);

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				const actualRatio = complexDivide(vOutput, vInput);
				const expectedMagnitude = complexMagnitude(expectedH);
				const actualMagnitude = complexMagnitude(actualRatio);

				expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 2);
			}
		});
	});

	describe('PEQ with unity gain (all sections bypassed): output equals input', () => {
		test('should pass signal unchanged when all sections are bypassed and gain is 0 dB', () => {
			const sections = [
				{ filterType: 'peaking', frequency: 1000, q: 1.0, gain: 6, bypass: true },
				{ filterType: 'highShelf', frequency: 5000, q: 0.707, gain: -3, bypass: true },
			];

			const { circuit, peq } = buildSimplePEQCircuit({ sections, gain: 0 });
			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 1000, 5000, 10000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				const inputPosNodeId = `${peq.id}_0`;
				const inputNegNodeId = `${peq.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				const outputPosNodeId = `${peq.id}_2`;
				const outputNegNodeId = `${peq.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				const actualRatio = complexDivide(vOutput, vInput);

				// Unity gain: ratio should be 1+0j
				expect(actualRatio.re).toBeCloseTo(1.0, 4);
				expect(actualRatio.im).toBeCloseTo(0.0, 4);
			}
		});
	});

	describe('PEQ muted: zero output', () => {
		test('should produce zero output voltage when PEQ is muted', () => {
			const { circuit, peq } = buildSimplePEQCircuit({
				muted: true,
				sections: [{ filterType: 'peaking', frequency: 1000, q: 1.0, gain: 6, bypass: false }],
			});

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 1000, 5000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				const outputPosNodeId = `${peq.id}_2`;
				const outputNegNodeId = `${peq.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const outputMagnitude = complexMagnitude(vOutput);

				// Muted PEQ should produce zero output
				expect(outputMagnitude).toBeCloseTo(0, 10);
			}
		});
	});

	describe('Multiple PEQs in series: cascaded transfer functions', () => {
		test('should cascade transfer functions of two PEQs in series', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const peq1 = new PEQ(10, 0);
			peq1.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 1.0, gain: 6, bypass: false,
			}];

			const peq2 = new PEQ(20, 0);
			peq2.parameters.sections = [{
				filterType: 'highShelf', frequency: 3000, q: 0.707, gain: -4, bypass: false,
			}];

			const loadResistor = new Resistor(30, 0);
			loadResistor.parameters.resistance = 8.0;

			const ground = new Ground(40, 0);

			circuit.addComponent(source);
			circuit.addComponent(peq1);
			circuit.addComponent(peq2);
			circuit.addComponent(loadResistor);
			circuit.addComponent(ground);

			// Source+ → PEQ1 +in
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: peq1.id, terminal: 0 },
			));
			// Source- → Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// PEQ1 -in → Ground
			circuit.addWire(new Wire(
				{ componentId: peq1.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// PEQ1 +out → PEQ2 +in
			circuit.addWire(new Wire(
				{ componentId: peq1.id, terminal: 2 },
				{ componentId: peq2.id, terminal: 0 },
			));
			// PEQ1 -out → Ground (shared negative rail)
			circuit.addWire(new Wire(
				{ componentId: peq1.id, terminal: 3 },
				{ componentId: ground.id, terminal: 0 },
			));
			// PEQ2 -in → Ground
			circuit.addWire(new Wire(
				{ componentId: peq2.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// PEQ2 +out → Resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: peq2.id, terminal: 2 },
				{ componentId: loadResistor.id, terminal: 0 },
			));
			// PEQ2 -out → Ground
			circuit.addWire(new Wire(
				{ componentId: peq2.id, terminal: 3 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Resistor terminal 1 → Ground
			circuit.addWire(new Wire(
				{ componentId: loadResistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 1000, 3000, 10000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				// Get input voltage to PEQ1
				const inputPosNodeId = `${peq1.id}_0`;
				const inputNegNodeId = `${peq1.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get output voltage from PEQ2
				const outputPosNodeId = `${peq2.id}_2`;
				const outputNegNodeId = `${peq2.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				// Expected cascaded transfer function: H1(f) × H2(f)
				const h1 = BiquadCalculator.evaluatePEQ(peq1.parameters, frequency);
				const h2 = BiquadCalculator.evaluatePEQ(peq2.parameters, frequency);
				const cascadedH = {
					re: h1.re * h2.re - h1.im * h2.im,
					im: h1.re * h2.im + h1.im * h2.re,
				};

				const actualRatio = complexDivide(vOutput, vInput);
				const expectedMagnitude = complexMagnitude(cascadedH);
				const actualMagnitude = complexMagnitude(actualRatio);

				expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 2);
			}
		});
	});

	describe('PEQ with passive components in circuit', () => {
		test('should correctly interact with a series resistor before the PEQ', () => {
			// Circuit: Source → Series Resistor → PEQ → Load Resistor → Ground
			// The series resistor forms a voltage divider with the load,
			// but the PEQ still applies H(f) to whatever voltage appears at its input.
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const seriesResistor = new Resistor(5, 0);
			seriesResistor.parameters.resistance = 4.0;

			const peq = new PEQ(10, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 1.0, gain: 6, bypass: false,
			}];

			const loadResistor = new Resistor(20, 0);
			loadResistor.parameters.resistance = 8.0;

			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(seriesResistor);
			circuit.addComponent(peq);
			circuit.addComponent(loadResistor);
			circuit.addComponent(ground);

			// Source+ → Series Resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: seriesResistor.id, terminal: 0 },
			));
			// Series Resistor terminal 1 → PEQ +in
			circuit.addWire(new Wire(
				{ componentId: seriesResistor.id, terminal: 1 },
				{ componentId: peq.id, terminal: 0 },
			));
			// Source- → Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// PEQ -in → Ground
			circuit.addWire(new Wire(
				{ componentId: peq.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// PEQ +out → Load Resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: peq.id, terminal: 2 },
				{ componentId: loadResistor.id, terminal: 0 },
			));
			// PEQ -out → Ground
			circuit.addWire(new Wire(
				{ componentId: peq.id, terminal: 3 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Load Resistor terminal 1 → Ground
			circuit.addWire(new Wire(
				{ componentId: loadResistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 1000, 5000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				// Get PEQ input voltage
				const inputPosNodeId = `${peq.id}_0`;
				const inputNegNodeId = `${peq.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get PEQ output voltage
				const outputPosNodeId = `${peq.id}_2`;
				const outputNegNodeId = `${peq.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				// The PEQ VCVS constraint still holds: V_out = H(f) × V_in
				const expectedH = BiquadCalculator.evaluatePEQ(peq.parameters, frequency);
				const actualRatio = complexDivide(vOutput, vInput);

				expect(complexMagnitude(actualRatio)).toBeCloseTo(complexMagnitude(expectedH), 2);
			}
		});

		test('should work with solveAllFrequencies and produce component voltages', () => {
			const { circuit, peq, loadResistor } = buildSimplePEQCircuit({
				sections: [{ filterType: 'peaking', frequency: 1000, q: 1.0, gain: 6, bypass: false }],
			});

			const solver = new CircuitSolver(circuit);
			const results = solver.solveAllFrequencies(100, 10000, 5);

			// Should have frequency points
			expect(results.frequencies.length).toBeGreaterThan(0);

			// Should have component voltages for the PEQ
			expect(results.componentVoltages[peq.id]).toBeDefined();
			expect(results.componentVoltages[peq.id].length).toBe(results.frequencies.length);

			// PEQ output voltage magnitude should vary with frequency (peaking filter)
			const magnitudes = results.componentVoltages[peq.id].map(
				(v) => Math.sqrt(v.re * v.re + v.im * v.im),
			);

			// At 1000 Hz (center frequency), magnitude should be higher than at 100 Hz
			const indexNear1k = results.frequencies.findIndex((f) => f >= 1000);
			const indexNear100 = results.frequencies.findIndex((f) => f >= 100);

			if (indexNear1k >= 0 && indexNear100 >= 0) {
				expect(magnitudes[indexNear1k]).toBeGreaterThan(magnitudes[indexNear100]);
			}
		});
	});

	describe('Disconnected PEQ is excluded from simulation', () => {
		test('should exclude a PEQ with no wire connections from the simulation', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 8.0;

			const ground = new Ground(20, 0);

			// Disconnected PEQ — no wires connected to it
			const disconnectedPeq = new PEQ(30, 0);
			disconnectedPeq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 1.0, gain: 12, bypass: false,
			}];

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(ground);
			circuit.addComponent(disconnectedPeq);

			// Simple circuit: Source → Resistor → Ground (PEQ is floating)
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

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// The disconnected PEQ should be excluded
			expect(solver.excludedComponents.has(disconnectedPeq.id)).toBe(true);

			// The PEQ should not have a VCVS current variable
			expect(solver.peqCurrentMap.has(disconnectedPeq.id)).toBe(false);

			// Circuit should still solve correctly without the disconnected PEQ
			const result = solveWithBuffers(solver, 1000);
			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);
		});

		test('should exclude a PEQ in a disconnected island from the simulation', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 8.0;

			const ground = new Ground(20, 0);

			// PEQ connected only to another floating resistor (disconnected island)
			const islandPeq = new PEQ(30, 0);
			const islandResistor = new Resistor(40, 0);
			islandResistor.parameters.resistance = 100;

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(ground);
			circuit.addComponent(islandPeq);
			circuit.addComponent(islandResistor);

			// Main circuit: Source → Resistor → Ground
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

			// Disconnected island: PEQ +out → island resistor (not connected to ground)
			circuit.addWire(new Wire(
				{ componentId: islandPeq.id, terminal: 2 },
				{ componentId: islandResistor.id, terminal: 0 },
			));
			circuit.addWire(new Wire(
				{ componentId: islandPeq.id, terminal: 3 },
				{ componentId: islandResistor.id, terminal: 1 },
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// The island PEQ should be excluded (not reachable from ground)
			expect(solver.peqCurrentMap.has(islandPeq.id)).toBe(false);

			// Circuit should still solve correctly
			const result = solveWithBuffers(solver, 1000);
			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);
		});
	});
});
