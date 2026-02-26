import ImpedanceCalculator from '@/simulation/ImpedanceCalculator';
import SchemaValidator from '@/simulation/SchemaValidator';
import { Circuit } from '@/models/Circuit';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';

describe('ImpedanceCalculator', () => {
	describe('Constructor', () => {
		test('should create ImpedanceCalculator with circuit and solver results', () => {
			const circuit = new Circuit();
			const solverResults = [];

			const calculator = new ImpedanceCalculator(circuit, solverResults);

			expect(calculator.circuit).toBe(circuit);
			expect(calculator.solverResults).toBe(solverResults);
		});
	});

	describe('calculateInputImpedance', () => {
		test('should throw error if no voltage source found', () => {
			const circuit = new Circuit();
			const ground = new Ground(0, 0);
			circuit.addComponent(ground);

			const solverResults = [];
			const calculator = new ImpedanceCalculator(circuit, solverResults);

			expect(() => calculator.calculateInputImpedance()).toThrow('No voltage source found in circuit');
		});

		test('should calculate impedance for simple resistive circuit with mock data', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0; // 1W
			source.parameters.impedance = 8.0; // 8 ohms
			// V = sqrt(1 * 8) = 2.828 V
			circuit.addComponent(source);

			// Mock solver results with known current values
			// For 8 ohm resistor: I = V/R = 2.828/8 = 0.354 A
			const solverResults = [
				{
					frequency: 100,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			expect(result.frequencies).toEqual([100, 1000]);
			expect(result.impedances).toHaveLength(2);
			expect(result.phases).toHaveLength(2);

			// Z = V / I = 2.828 / 0.354 ≈ 8 ohms
			result.impedances.forEach((impedance) => {
				expect(impedance).toBeCloseTo(8.0, 0);
			});

			// Pure resistive circuit should have phase near 0
			result.phases.forEach((phase) => {
				expect(Math.abs(phase)).toBeLessThan(5);
			});
		});

		test('should calculate impedance with capacitive phase shift', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			// Mock solver results with capacitive current (leading phase)
			// Current has negative imaginary component for capacitive circuit
			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.2, im: -0.3 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			expect(result.frequencies).toEqual([1000]);
			expect(result.impedances.length).toBe(1);
			expect(result.phases.length).toBe(1);

			// Impedance magnitude should be calculated correctly
			expect(result.impedances[0]).toBeGreaterThan(0);

			// Phase should be positive for capacitive impedance (current leads voltage)
			expect(result.phases[0]).toBeGreaterThan(0);
		});

		test('should calculate impedance with inductive phase shift', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			// Mock solver results with inductive current (lagging phase)
			// Current has positive imaginary component for inductive circuit
			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.2, im: 0.3 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			expect(result.frequencies).toEqual([1000]);
			expect(result.impedances.length).toBe(1);
			expect(result.phases.length).toBe(1);

			// Impedance magnitude should be calculated correctly
			expect(result.impedances[0]).toBeGreaterThan(0);

			// Phase should be negative for inductive impedance (current lags voltage)
			expect(result.phases[0]).toBeLessThan(0);
		});

		test('should handle inverted voltage source polarity', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			source.parameters.inverted = true;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: -0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			// Impedance magnitude should be the same regardless of polarity
			expect(result.impedances[0]).toBeCloseTo(8.0, 0);
		});

		test('should return Infinity for open circuit (no current)', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			// Open circuit should have infinite impedance
			expect(result.impedances[0]).toBe(Infinity);
		});

		test('should return Infinity when no current data available', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map(), // No current data
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			expect(result.impedances[0]).toBe(Infinity);
		});
	});

	describe('calculateImpedanceMagnitudeAtFrequency', () => {
		test('should calculate impedance magnitude at specific frequency', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const impedance = calculator.calculateImpedanceMagnitudeAtFrequency(1000);

			expect(impedance).toBeCloseTo(8.0, 0);
		});

		test('should throw error if frequency not found in results', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);

			expect(() => calculator.calculateImpedanceMagnitudeAtFrequency(5000)).toThrow('No solver result found for frequency 5000 Hz');
		});

		test('should return Infinity for zero current', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const impedance = calculator.calculateImpedanceMagnitudeAtFrequency(1000);

			expect(impedance).toBe(Infinity);
		});
	});

	describe('calculateImpedancePhaseAtFrequency', () => {
		test('should calculate impedance phase at specific frequency', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const phase = calculator.calculateImpedancePhaseAtFrequency(1000);

			// Pure resistive circuit should have phase near 0
			expect(Math.abs(phase)).toBeLessThan(5);
		});

		test('should calculate negative phase for capacitive circuit', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.2, im: -0.3 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const phase = calculator.calculateImpedancePhaseAtFrequency(1000);

			// Capacitive impedance should have positive phase
			expect(phase).toBeGreaterThan(0);
		});

		test('should calculate positive phase for inductive circuit', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.2, im: 0.3 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const phase = calculator.calculateImpedancePhaseAtFrequency(1000);

			// Inductive impedance should have negative phase
			expect(phase).toBeLessThan(0);
		});

		test('should return 0 phase for zero current', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const phase = calculator.calculateImpedancePhaseAtFrequency(1000);

			expect(phase).toBe(0);
		});

		test('should throw error if frequency not found in results', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);

			expect(() => calculator.calculateImpedancePhaseAtFrequency(5000)).toThrow('No solver result found for frequency 5000 Hz');
		});
	});

	describe('Schema Validation', () => {
		test('should produce impedance response data that validates against schema', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 100,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
				{
					frequency: 10000,
					sourceCurrents: new Map([[source.id, { re: 0.354, im: 0 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			// Validate result against schema
			const validation = SchemaValidator.validateImpedanceResponseData(result);
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);
		});

		test('should validate impedance data with complex phase values', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(0, 0);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			const solverResults = [
				{
					frequency: 1000,
					sourceCurrents: new Map([[source.id, { re: 0.2, im: -0.3 }]]),
				},
				{
					frequency: 2000,
					sourceCurrents: new Map([[source.id, { re: 0.2, im: 0.3 }]]),
				},
			];

			const calculator = new ImpedanceCalculator(circuit, solverResults);
			const result = calculator.calculateInputImpedance();

			// Validate result against schema
			const validation = SchemaValidator.validateImpedanceResponseData(result);
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);

			// Should have both positive and negative phase values
			expect(result.phases[0]).toBeGreaterThan(0);
			expect(result.phases[1]).toBeLessThan(0);
		});
	});
});
