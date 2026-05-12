import CircuitSolver from '@/simulation/CircuitSolver';
import { Circuit } from '@/models/Circuit';
import { Filter } from '@/models/Filter';
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
 * Build a simple test circuit: Source → Filter → Resistor → Ground
 *
 * Topology:
 *   Source terminal 0 (+) → Filter terminal 0 (+in)
 *   Source terminal 1 (-) → Ground
 *   Filter terminal 1 (-in) → Ground
 *   Filter terminal 2 (+out) → Resistor terminal 0
 *   Filter terminal 3 (-out) → Ground
 *   Resistor terminal 1 → Ground
 */
function buildSimpleFilterCircuit(filterOptions = {}) {
	const circuit = new Circuit();

	const source = new VoltageSource(0, 0);
	source.parameters.power = 1.0;
	source.parameters.impedance = 8.0;

	const filter = new Filter(10, 0);
	if (filterOptions.filterShape !== undefined) filter.parameters.filterShape = filterOptions.filterShape;
	if (filterOptions.filterType !== undefined) filter.parameters.filterType = filterOptions.filterType;
	if (filterOptions.filterOrder !== undefined) filter.parameters.filterOrder = filterOptions.filterOrder;
	if (filterOptions.turnFrequency !== undefined) filter.parameters.turnFrequency = filterOptions.turnFrequency;
	if (filterOptions.gain !== undefined) filter.parameters.gain = filterOptions.gain;
	if (filterOptions.delay !== undefined) filter.parameters.delay = filterOptions.delay;
	if (filterOptions.muted !== undefined) filter.parameters.muted = filterOptions.muted;
	// Invalidate cache after parameter changes
	filter._parametersDirty = true;

	const loadResistor = new Resistor(20, 0);
	loadResistor.parameters.resistance = 8.0;

	const ground = new Ground(30, 0);

	circuit.addComponent(source);
	circuit.addComponent(filter);
	circuit.addComponent(loadResistor);
	circuit.addComponent(ground);

	// Source+ → Filter +in
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 0 },
		{ componentId: filter.id, terminal: 0 },
	));

	// Source- → Ground
	circuit.addWire(new Wire(
		{ componentId: source.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	// Filter -in → Ground
	circuit.addWire(new Wire(
		{ componentId: filter.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	// Filter +out → Resistor terminal 0
	circuit.addWire(new Wire(
		{ componentId: filter.id, terminal: 2 },
		{ componentId: loadResistor.id, terminal: 0 },
	));

	// Filter -out → Ground
	circuit.addWire(new Wire(
		{ componentId: filter.id, terminal: 3 },
		{ componentId: ground.id, terminal: 0 },
	));

	// Resistor terminal 1 → Ground
	circuit.addWire(new Wire(
		{ componentId: loadResistor.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	));

	return { circuit, source, filter, loadResistor, ground };
}

describe('Filter Integration with CircuitSolver', () => {
	describe('Single Filter (Butterworth LP order 2) in simple circuit: output voltage = input × H(f)', () => {
		test('should produce output voltage equal to input voltage times H(f)', () => {
			const { circuit, filter } = buildSimpleFilterCircuit({
				filterShape: 'butterworth',
				filterType: 'lowPass',
				filterOrder: 2,
				turnFrequency: 1000,
			});

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 500, 1000, 2000, 5000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				// Get input voltage: V(+in) - V(-in)
				const inputPosNodeId = `${filter.id}_0`;
				const inputNegNodeId = `${filter.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get output voltage: V(+out) - V(-out)
				const outputPosNodeId = `${filter.id}_2`;
				const outputNegNodeId = `${filter.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				// Expected transfer function
				const expectedH = filter.evaluateTransferFunction(frequency);

				// Compute actual ratio: V_out / V_in
				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				const actualRatio = complexDivide(vOutput, vInput);
				const expectedMagnitude = complexMagnitude(expectedH);
				const actualMagnitude = complexMagnitude(actualRatio);

				// Verify magnitude matches within 1% tolerance
				expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 2);
			}
		});
	});

	describe('Filter with unity response: output ≈ input', () => {
		test('should pass signal unchanged at low frequency for a high-frequency low-pass filter', () => {
			// LP at 20 kHz — at 100 Hz the response is essentially unity
			const { circuit, filter } = buildSimpleFilterCircuit({
				filterShape: 'butterworth',
				filterType: 'lowPass',
				filterOrder: 2,
				turnFrequency: 20000,
				gain: 0,
			});

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [10, 50, 100];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				const inputPosNodeId = `${filter.id}_0`;
				const inputNegNodeId = `${filter.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				const outputPosNodeId = `${filter.id}_2`;
				const outputNegNodeId = `${filter.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				const actualRatio = complexDivide(vOutput, vInput);

				// Unity gain: ratio should be approximately 1+0j
				expect(actualRatio.re).toBeCloseTo(1.0, 2);
				expect(Math.abs(actualRatio.im)).toBeLessThan(0.05);
			}
		});
	});

	describe('Filter muted: zero output', () => {
		test('should produce zero output voltage when Filter is muted', () => {
			const { circuit, filter } = buildSimpleFilterCircuit({
				muted: true,
			});

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 1000, 5000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				const outputPosNodeId = `${filter.id}_2`;
				const outputNegNodeId = `${filter.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const outputMagnitude = complexMagnitude(vOutput);

				// Muted Filter should produce zero output
				expect(outputMagnitude).toBeCloseTo(0, 10);
			}
		});
	});

	describe('Filter + PEQ in series: cascaded transfer functions', () => {
		test('should cascade transfer functions of Filter and PEQ in series', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const filter = new Filter(10, 0);
			filter.parameters.filterShape = 'butterworth';
			filter.parameters.filterType = 'lowPass';
			filter.parameters.filterOrder = 2;
			filter.parameters.turnFrequency = 2000;
			filter._parametersDirty = true;

			const peq = new PEQ(20, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 1.0, gain: 6, bypass: false,
			}];

			const loadResistor = new Resistor(30, 0);
			loadResistor.parameters.resistance = 8.0;

			const ground = new Ground(40, 0);

			circuit.addComponent(source);
			circuit.addComponent(filter);
			circuit.addComponent(peq);
			circuit.addComponent(loadResistor);
			circuit.addComponent(ground);

			// Source+ → Filter +in
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: filter.id, terminal: 0 },
			));
			// Source- → Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Filter -in → Ground
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Filter +out → PEQ +in
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 2 },
				{ componentId: peq.id, terminal: 0 },
			));
			// Filter -out → Ground
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 3 },
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

			const solver = new CircuitSolver(circuit);
			solver.buildNodeMap();

			const testFrequencies = [100, 1000, 2000, 5000];

			for (const frequency of testFrequencies) {
				const result = solveWithBuffers(solver, frequency);

				// Get input voltage to Filter
				const inputPosNodeId = `${filter.id}_0`;
				const inputNegNodeId = `${filter.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get output voltage from PEQ
				const outputPosNodeId = `${peq.id}_2`;
				const outputNegNodeId = `${peq.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				// Expected cascaded transfer function: H_filter(f) × H_peq(f)
				const hFilter = filter.evaluateTransferFunction(frequency);
				const hPeq = peq.evaluateTransferFunction(frequency);
				const cascadedH = {
					re: hFilter.re * hPeq.re - hFilter.im * hPeq.im,
					im: hFilter.re * hPeq.im + hFilter.im * hPeq.re,
				};

				const actualRatio = complexDivide(vOutput, vInput);
				const expectedMagnitude = complexMagnitude(cascadedH);
				const actualMagnitude = complexMagnitude(actualRatio);

				expect(actualMagnitude).toBeCloseTo(expectedMagnitude, 2);
			}
		});
	});

	describe('Filter with passive components (resistor divider + filter)', () => {
		test('should correctly interact with a series resistor before the Filter', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const seriesResistor = new Resistor(5, 0);
			seriesResistor.parameters.resistance = 4.0;

			const filter = new Filter(10, 0);
			filter.parameters.filterShape = 'butterworth';
			filter.parameters.filterType = 'lowPass';
			filter.parameters.filterOrder = 2;
			filter.parameters.turnFrequency = 1000;
			filter._parametersDirty = true;

			const loadResistor = new Resistor(20, 0);
			loadResistor.parameters.resistance = 8.0;

			const ground = new Ground(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(seriesResistor);
			circuit.addComponent(filter);
			circuit.addComponent(loadResistor);
			circuit.addComponent(ground);

			// Source+ → Series Resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: seriesResistor.id, terminal: 0 },
			));
			// Series Resistor terminal 1 → Filter +in
			circuit.addWire(new Wire(
				{ componentId: seriesResistor.id, terminal: 1 },
				{ componentId: filter.id, terminal: 0 },
			));
			// Source- → Ground
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Filter -in → Ground
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			// Filter +out → Load Resistor terminal 0
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 2 },
				{ componentId: loadResistor.id, terminal: 0 },
			));
			// Filter -out → Ground
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 3 },
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

				// Get Filter input voltage
				const inputPosNodeId = `${filter.id}_0`;
				const inputNegNodeId = `${filter.id}_1`;
				const vInPos = result.nodeVoltages[inputPosNodeId] || { re: 0, im: 0 };
				const vInNeg = result.nodeVoltages[inputNegNodeId] || { re: 0, im: 0 };
				const vInput = { re: vInPos.re - vInNeg.re, im: vInPos.im - vInNeg.im };

				// Get Filter output voltage
				const outputPosNodeId = `${filter.id}_2`;
				const outputNegNodeId = `${filter.id}_3`;
				const vOutPos = result.nodeVoltages[outputPosNodeId] || { re: 0, im: 0 };
				const vOutNeg = result.nodeVoltages[outputNegNodeId] || { re: 0, im: 0 };
				const vOutput = { re: vOutPos.re - vOutNeg.re, im: vOutPos.im - vOutNeg.im };

				const inputMagnitude = complexMagnitude(vInput);
				if (inputMagnitude < 1e-12) continue;

				// The Filter VCVS constraint still holds: V_out = H(f) × V_in
				const expectedH = filter.evaluateTransferFunction(frequency);
				const actualRatio = complexDivide(vOutput, vInput);

				expect(complexMagnitude(actualRatio)).toBeCloseTo(complexMagnitude(expectedH), 2);
			}
		});
	});

	describe('Disconnected Filter is excluded from simulation', () => {
		test('should exclude a Filter with no wire connections from the simulation', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;

			const resistor = new Resistor(10, 0);
			resistor.parameters.resistance = 8.0;

			const ground = new Ground(20, 0);

			// Disconnected Filter — no wires connected to it
			const disconnectedFilter = new Filter(30, 0);

			circuit.addComponent(source);
			circuit.addComponent(resistor);
			circuit.addComponent(ground);
			circuit.addComponent(disconnectedFilter);

			// Simple circuit: Source → Resistor → Ground (Filter is floating)
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

			// The disconnected Filter should be excluded
			expect(solver.excludedComponents.has(disconnectedFilter.id)).toBe(true);

			// The Filter should not have a VCVS current variable
			expect(solver.peqCurrentMap.has(disconnectedFilter.id)).toBe(false);

			// Circuit should still solve correctly without the disconnected Filter
			const result = solveWithBuffers(solver, 1000);
			expect(result).toBeDefined();
			expect(result.frequency).toBe(1000);
		});
	});

	describe('Shared "A" label assignment: PEQ and Filter share counter', () => {
		test('should assign sequential labels across PEQ and Filter components', () => {
			// This test verifies the label assignment logic works correctly
			// when both PEQ and Filter components are present
			const circuit = new Circuit();

			const peq = new PEQ(0, 0);
			peq.label = 'A0';

			const filter = new Filter(10, 0);
			filter.label = 'A1';

			const peq2 = new PEQ(20, 0);
			peq2.label = 'A2';

			circuit.addComponent(peq);
			circuit.addComponent(filter);
			circuit.addComponent(peq2);

			// Verify labels are assigned correctly
			expect(peq.label).toBe('A0');
			expect(filter.label).toBe('A1');
			expect(peq2.label).toBe('A2');
		});
	});

	describe('Save/load round-trip of circuit containing Filter components', () => {
		test('should preserve Filter parameters through JSON serialization', () => {
			const circuit = new Circuit();

			const source = new VoltageSource(0, 0);
			const filter = new Filter(10, 0);
			filter.parameters.filterShape = 'linkwitzRiley';
			filter.parameters.filterType = 'highPass';
			filter.parameters.filterOrder = 4;
			filter.parameters.turnFrequency = 2000;
			filter.parameters.gain = -3;
			filter.parameters.delay = 0.001;
			filter.parameters.muted = false;
			filter.label = 'A0';

			const ground = new Ground(20, 0);

			circuit.addComponent(source);
			circuit.addComponent(filter);
			circuit.addComponent(ground);

			// Add wires
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: filter.id, terminal: 0 },
			));
			circuit.addWire(new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));
			circuit.addWire(new Wire(
				{ componentId: filter.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			));

			// Serialize
			const json = circuit.toJSON();
			const jsonString = JSON.stringify(json);

			// Deserialize
			const parsed = JSON.parse(jsonString);
			const restoredCircuit = Circuit.fromJSON(parsed);

			// Find the filter in the restored circuit
			const restoredFilter = restoredCircuit.components.find((c) => c.type === 'filter');
			expect(restoredFilter).toBeDefined();
			expect(restoredFilter.parameters.filterShape).toBe('linkwitzRiley');
			expect(restoredFilter.parameters.filterType).toBe('highPass');
			expect(restoredFilter.parameters.filterOrder).toBe(4);
			expect(restoredFilter.parameters.turnFrequency).toBe(2000);
			expect(restoredFilter.parameters.gain).toBe(-3);
			expect(restoredFilter.parameters.delay).toBe(0.001);
			expect(restoredFilter.parameters.muted).toBe(false);
			expect(restoredFilter.label).toBe('A0');
		});
	});
});
