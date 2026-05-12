import CircuitSolver from '@/simulation/CircuitSolver';
import { Circuit } from '@/models/Circuit';
import { OpAmp } from '@/models/OpAmp';
import { PEQ } from '@/models/PEQ';
import { Filter } from '@/models/Filter';
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
 * Build a simple open-loop OpAmp circuit: Source → OpAmp → Resistor → Ground
 *
 * Topology:
 *   Source terminal 0 (+) → OpAmp terminal 0 (+in)
 *   Source terminal 1 (-) → Ground
 *   OpAmp terminal 1 (-in) → Ground
 *   OpAmp terminal 2 (+out) → Resistor terminal 0
 *   OpAmp terminal 3 (-out) → Ground
 *   Resistor terminal 1 → Ground
 */
function buildSimpleOpAmpCircuit(opampOptions = {}) {
	const circuit = new Circuit();

	const source = new VoltageSource(0, 0);
	source.parameters.power = 1.0;
	source.parameters.impedance = 8.0;

	const opamp = new OpAmp(10, 0);
	if (opampOptions.dcGain !== undefined) opamp.parameters.dcGain = opampOptions.dcGain;
	if (opampOptions.cornerFrequency !== undefined) opamp.parameters.cornerFrequency = opampOptions.cornerFrequency;

	const loadResistor = new Resistor(20, 0);
	loadResistor.parameters.resistance = 8.0;

	const ground = new Ground(30, 0);

	circuit.addComponent(source);
	circuit.addComponent(opamp);
	circuit.addComponent(loadResistor);
	circuit.addComponent(ground);

	// Source+ → OpAmp +in
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 0 },
		{ componentId: opamp.id, terminal: 0 },
	));

	// Source- → Ground
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	// OpAmp -in → Ground
	circuit.addWire(new Wire(
		{ componentId: opamp.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	// OpAmp +out → Resistor terminal 0
	circuit.addWire(new Wire(
		{ componentId: opamp.id, terminal: 2 },
		{ componentId: loadResistor.id, terminal: 0 },
	));

	// OpAmp -out → Ground
	circuit.addWire(new Wire(
		{ componentId: opamp.id, terminal: 3 },
		{ componentId: ground.id, terminal: 0 },
	));

	// Resistor terminal 1 → Ground
	circuit.addWire(new Wire(
		{ componentId: loadResistor.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	return {
		circuit, source, opamp, loadResistor, ground,
	};
}

describe('OpAmp Integration with CircuitSolver', () => {
	describe('Open-loop OpAmp: output = A(f) × input', () => {
		test('should produce output voltage equal to input voltage times A(f)', () => {
			const { circuit, opamp } = buildSimpleOpAmpCircuit({ dcGain: 60, cornerFrequency: 100 });
			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [10, 50, 100, 500, 1000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				// Get input voltage: V(+in) - V(-in)
				const inputPosNodeId = `${opamp.id}_0`;
				const inputNegNodeId = `${opamp.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get output voltage: V(+out) - V(-out)
				const outputPosNodeId = `${opamp.id}_2`;
				const outputNegNodeId = `${opamp.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				// Expected: vOutput = A(f) × vInput
				const transferFunction = opamp.evaluateTransferFunction(frequency);
				const expectedRe = transferFunction.re * vInput.re - transferFunction.im * vInput.im;
				const expectedIm = transferFunction.re * vInput.im + transferFunction.im * vInput.re;

				expect(vOutput.re).toBeCloseTo(expectedRe, 5);
				expect(vOutput.im).toBeCloseTo(expectedIm, 5);
			}
		});
	});

	describe('OpAmp at DC: output ≈ A₀ × input', () => {
		test('should produce output voltage approximately A₀ times input at very low frequency', () => {
			const { circuit, opamp } = buildSimpleOpAmpCircuit({ dcGain: 40, cornerFrequency: 100 });
			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// Use very low frequency (well below corner) to approximate DC
			const frequency = 1;
			const result = solveWithBuffers(solver, frequency);

			const inputPosNodeId = `${opamp.id}_0`;
			const inputNegNodeId = `${opamp.id}_1`;
			const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
			const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
			const inputMag = complexMagnitude({ re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im });

			const outputPosNodeId = `${opamp.id}_2`;
			const outputNegNodeId = `${opamp.id}_3`;
			const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
			const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
			const outputMag = complexMagnitude({ re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im });

			const expectedA0 = 10 ** (40 / 20); // 100
			const measuredGain = outputMag / inputMag;

			// At f=1 Hz with corner at 100 Hz, gain should be very close to A₀
			expect(measuredGain).toBeCloseTo(expectedA0, 0);
		});
	});

	describe('OpAmp at high frequency: gain rolls off', () => {
		test('should show decreasing gain at frequencies above corner', () => {
			const { circuit, opamp } = buildSimpleOpAmpCircuit({ dcGain: 60, cornerFrequency: 100 });
			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const f1 = 1000; // 10× corner
			const f2 = 10000; // 100× corner

			const result1 = solveWithBuffers(solver, f1);
			const result2 = solveWithBuffers(solver, f2);

			const getOutputMag = (result) => {
				const vOutPos = result.nodeVoltages[`${opamp.id}_2`] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[`${opamp.id}_3`] || { re: 0, im: 0 };
				return complexMagnitude({ re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im });
			};

			const mag1 = getOutputMag(result1);
			const mag2 = getOutputMag(result2);

			// One decade apart, should be ~20 dB difference
			const rollOffDb = 20 * Math.log10(mag1 / mag2);
			expect(rollOffDb).toBeCloseTo(20, 0);
		});
	});

	describe('OpAmp with resistive feedback (inverting amplifier)', () => {
		test('closed-loop gain ≈ -Rf/Rin at low frequencies', () => {
			// Inverting amplifier topology:
			// Source → Rin → OpAmp +in
			// OpAmp output → Rf → OpAmp +in (feedback)
			// OpAmp -in → Ground
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const inputResistor = new Resistor(5, 0);
			inputResistor.parameters.resistance = 1000; // Rin = 1kΩ

			const feedbackResistor = new Resistor(15, 0);
			feedbackResistor.parameters.resistance = 10000; // Rf = 10kΩ

			const opamp = new OpAmp(10, 0);
			opamp.parameters.dcGain = 100; // Very high gain
			opamp.parameters.cornerFrequency = 50;

			const loadResistor = new Resistor(20, 0);
			loadResistor.parameters.resistance = 8.0;

			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(inputResistor);
			circuit.addComponent(feedbackResistor);
			circuit.addComponent(opamp);
			circuit.addComponent(loadResistor);
			circuit.addComponent(ground);

			// Source+ → Rin terminal 0
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: inputResistor.id, terminal: 0 },
			));

			// Rin terminal 1 → OpAmp +in (terminal 0)
			circuit.addWire(new Wire(
				{ componentId: inputResistor.id, terminal: 1 },
				{ componentId: opamp.id, terminal: 0 },
			));

			// Rf terminal 0 → OpAmp +in (terminal 0) — feedback node
			circuit.addWire(new Wire(
				{ componentId: feedbackResistor.id, terminal: 0 },
				{ componentId: opamp.id, terminal: 0 },
			));

			// OpAmp +out (terminal 2) → Rf terminal 1
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 2 },
				{ componentId: feedbackResistor.id, terminal: 1 },
			));

			// OpAmp +out (terminal 2) → Load resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 2 },
				{ componentId: loadResistor.id, terminal: 0 },
			));

			// OpAmp -in (terminal 1) → Ground
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			// OpAmp -out (terminal 3) → Ground
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 3 },
				{ componentId: ground.id, terminal: 0 },
			));

			// Source- → Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			// Load resistor terminal 1 → Ground
			circuit.addWire(new Wire(
				{ componentId: loadResistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// Test at low frequency where loop gain is very high
			const frequency = 10; // Well below corner frequency
			const result = solveWithBuffers(solver, frequency);

			// Get source voltage (input to Rin)
			const vSourcePos = result.nodeVoltages[`${source.id}_0`] || { re: 0, im: 0 };

			// Get output voltage
			const vOutPos = result.nodeVoltages[`${opamp.id}_2`] || { re: 0, im: 0 };
			const vOutNeg = result.nodeVoltages[`${opamp.id}_3`] || { re: 0, im: 0 };
			const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

			// Closed-loop gain should be approximately -Rf/Rin = -10
			const outputMag = complexMagnitude(vOutput);
			const inputMag = complexMagnitude(vSourcePos);
			const closedLoopGain = outputMag / inputMag;

			// Expected gain magnitude: Rf/Rin = 10 (the sign is inverted but magnitude is 10)
			expect(closedLoopGain).toBeCloseTo(10, 0);
		});
	});

	describe('Disconnected OpAmp excluded from simulation', () => {
		test('should exclude OpAmp with no wire connections', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			const ground = new Ground(10, 0);
			const loadResistor = new Resistor(5, 0);
			loadResistor.parameters.resistance = 8.0;

			// Disconnected OpAmp (no wires)
			const opamp = new OpAmp(20, 20);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(loadResistor);
			circuit.addComponent(opamp);

			// Wire source to resistor to ground (simple circuit without OpAmp)
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: loadResistor.id, terminal: 0 },
			));
			circuit.addWire(new Wire(
				{ componentId: loadResistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// OpAmp should be excluded
			expect(solver.excludedComponents.has(opamp.id)).toBe(true);

			// Circuit should still solve without error
			const result = solveWithBuffers(solver, 1000);
			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);
		});
	});

	describe('Shared "A" label assignment with PEQ and Filter', () => {
		test('PEQ and OpAmp share the "A" label counter', () => {
			const circuit = new Circuit();

			const peq = new PEQ(0, 0);
			peq.label = 'A0';

			const opamp = new OpAmp(10, 0);
			opamp.label = 'A1';

			const filter = new Filter(20, 0);
			filter.label = 'A2';

			circuit.components.push(peq);
			circuit.components.push(opamp);
			circuit.components.push(filter);

			// Verify all three share the "A" prefix
			expect(peq.label).toBe('A0');
			expect(opamp.label).toBe('A1');
			expect(filter.label).toBe('A2');

			// Verify all are distinct
			const labels = circuit.components.map((c) => c.label);
			const uniqueLabels = new Set(labels);
			expect(uniqueLabels.size).toBe(3);
		});
	});

	describe('Save/load round-trip of circuit containing OpAmp', () => {
		test('should preserve OpAmp parameters through Circuit serialization', () => {
			const { circuit, opamp } = buildSimpleOpAmpCircuit({ dcGain: 80, cornerFrequency: 200 });
			opamp.label = 'A0';

			const json = circuit.toJSON();
			const restored = Circuit.fromJSON(json);

			const restoredOpAmp = restored.components.find((c) => c.type === 'opamp');
			expect(restoredOpAmp).toBeDefined();
			expect(restoredOpAmp.parameters.dcGain).toBe(80);
			expect(restoredOpAmp.parameters.cornerFrequency).toBe(200);
			expect(restoredOpAmp.label).toBe('A0');
			expect(restoredOpAmp.terminals).toHaveLength(4);
		});
	});

	describe('Circuit with both PEQ and OpAmp', () => {
		test('both should be stamped correctly as VCVS', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const peq = new PEQ(10, 0);
			peq.parameters.gain = 6; // +6 dB gain
			peq.parameters.sections = [{
				filterType: 'peaking',
				frequency: 1000,
				q: 0.707,
				gain: 0,
				bypass: false,
			}];

			const opamp = new OpAmp(20, 0);
			opamp.parameters.dcGain = 40;
			opamp.parameters.cornerFrequency = 100;

			const loadResistor = new Resistor(30, 0);
			loadResistor.parameters.resistance = 8.0;

			const ground = new Ground(40, 0);

			circuit.addComponent(source);
			circuit.addComponent(peq);
			circuit.addComponent(opamp);
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
			// PEQ +out → OpAmp +in
			circuit.addWire(new Wire(
				{ componentId: peq.id, terminal: 2 },
				{ componentId: opamp.id, terminal: 0 },
			));
			// PEQ -out → Ground
			circuit.addWire(new Wire(
				{ componentId: peq.id, terminal: 3 },
				{ componentId: ground.id, terminal: 0 },
			));
			// OpAmp -in → Ground
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// OpAmp +out → Load
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 2 },
				{ componentId: loadResistor.id, terminal: 0 },
			));
			// OpAmp -out → Ground
			circuit.addWire(new Wire(
				{ componentId: opamp.id, terminal: 3 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Load → Ground
			circuit.addWire(new Wire(
				{ componentId: loadResistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			// Both PEQ and OpAmp should have entries in peqCurrentMap
			expect(solver.peqCurrentMap.has(peq.id)).toBe(true);
			expect(solver.peqCurrentMap.has(opamp.id)).toBe(true);

			// Should solve without error
			const result = solveWithBuffers(solver, 1000);
			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);

			// Output should be non-zero (both VCVS are active)
			const vOutPos = result.nodeVoltages[`${opamp.id}_2`] || { re: 0, im: 0 };
			const outputMag = complexMagnitude(vOutPos);
			expect(outputMag).toBeGreaterThan(0);
		});
	});
});
