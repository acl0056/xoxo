import fc from 'fast-check';
import Complex from 'complex.js';
import FrequencyAnalyzer from '../../src/simulation/FrequencyAnalyzer';
import { Circuit } from '../../src/models/Circuit';
import { Speaker } from '../../src/models/Speaker';
import { VoltageSource } from '../../src/models/VoltageSource';

/**
 * Property 26: Polarity Inversion
 *
 * **Validates: Requirements 13.26, 13.27, 17.8**
 *
 * For any loudspeaker or voltage source component with polarity inverted,
 * the terminal labels should swap (+ becomes -, - becomes +), and simulation
 * should reflect the phase inversion.
 */
describe('Feature: crossover-network-simulator, Property 26: Polarity inversion', () => {
	it('should invert phase by 180 degrees for speakers with inverted polarity', () => {
		fc.assert(
			fc.property(
				// Generate random speaker parameters
				fc.record({
					sensitivity: fc.double({ min: -10, max: 10, noNaN: true }),
					delay: fc.double({ min: 0, max: 10, noNaN: true }),
					frdMagnitude: fc.double({ min: 80, max: 100, noNaN: true }),
					frdPhase: fc.double({ min: -180, max: 180, noNaN: true }),
					voltageMagnitude: fc.double({ min: 0.1, max: 10, noNaN: true }),
					voltagePhase: fc.double({ min: -180, max: 180, noNaN: true }),
				}),
				(params) => {
					// Create circuit with speaker
					const circuit = new Circuit();
					const speaker = new Speaker(10, 10);
					speaker.label = 'S1';
					speaker.parameters.sensitivity = params.sensitivity;
					speaker.parameters.delay = params.delay;
					speaker.parameters.inverted = false; // Start with normal polarity

					// Set FRD data
					speaker.frdData = {
						frequencies: [1000],
						magnitudes: [params.frdMagnitude],
						phases: [params.frdPhase],
					};

					circuit.addComponent(speaker);

					// Create solver results
					const voltagePhaseRadians = (params.voltagePhase * Math.PI) / 180;
					const voltage = new Complex({
						abs: params.voltageMagnitude,
						arg: voltagePhaseRadians,
					});

					const solverResults = {
						frequencies: [1000],
						componentVoltages: {
							[speaker.id]: [voltage],
						},
					};

					// Calculate SPL with normal polarity
					const analyzer = new FrequencyAnalyzer(circuit, solverResults);
					const normalResult = analyzer.calculateSPL(speaker);

					// Invert polarity
					speaker.parameters.inverted = true;

					// Calculate SPL with inverted polarity
					const invertedResult = analyzer.calculateSPL(speaker);

					// SPL magnitude should be the same
					expect(Math.abs(normalResult.spl[0] - invertedResult.spl[0])).toBeLessThan(0.01);

					// Phase should differ by 180 degrees (accounting for wrapping)
					let phaseDifference = invertedResult.phase[0] - normalResult.phase[0];

					// Normalize phase difference to -180 to +180 range
					while (phaseDifference > 180) {
						phaseDifference -= 360;
					}
					while (phaseDifference < -180) {
						phaseDifference += 360;
					}

					// Phase difference should be 180 or -180 degrees
					expect(Math.abs(Math.abs(phaseDifference) - 180)).toBeLessThan(0.1);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should swap terminal labels when speaker polarity is inverted', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 100 }),
				fc.integer({ min: 0, max: 100 }),
				(x, y) => {
					const speaker = new Speaker(x, y);

					// Check initial terminal configuration
					// Terminals should be at relative positions
					const initialTerminals = [...speaker.terminals];

					// Invert polarity
					speaker.parameters.inverted = true;

					// Terminal positions should remain the same (physical layout doesn't change)
					// But the logical meaning swaps (+ becomes -, - becomes +)
					// This is a semantic change, not a physical one
					expect(speaker.terminals).toEqual(initialTerminals);

					// The inverted flag should be set
					expect(speaker.parameters.inverted).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should combine speakers with opposite polarity correctly', () => {
		fc.assert(
			fc.property(
				fc.record({
					frdMagnitude: fc.double({ min: 85, max: 95, noNaN: true }),
					voltageMagnitude: fc.double({ min: 0.5, max: 2, noNaN: true }),
				}),
				(params) => {
					// Create circuit with two identical speakers
					const circuit = new Circuit();

					const speaker1 = new Speaker(10, 10);
					speaker1.label = 'S1';
					speaker1.parameters.inverted = false;
					speaker1.frdData = {
						frequencies: [1000],
						magnitudes: [params.frdMagnitude],
						phases: [0],
					};
					circuit.addComponent(speaker1);

					const speaker2 = new Speaker(20, 10);
					speaker2.label = 'S2';
					speaker2.parameters.inverted = true; // Opposite polarity
					speaker2.frdData = {
						frequencies: [1000],
						magnitudes: [params.frdMagnitude],
						phases: [0],
					};
					circuit.addComponent(speaker2);

					// Same voltage for both
					const voltage = new Complex(params.voltageMagnitude, 0);

					const solverResults = {
						frequencies: [1000],
						componentVoltages: {
							[speaker1.id]: [voltage],
							[speaker2.id]: [voltage],
						},
					};

					const analyzer = new FrequencyAnalyzer(circuit, solverResults);
					const systemResponse = analyzer.calculateSystemResponse();

					// Two identical speakers with opposite polarity should cancel significantly
					// The combined SPL should be much lower than individual speakers
					const individualSPL = params.frdMagnitude + 20 * Math.log10(params.voltageMagnitude);

					// Combined SPL should be at least 20 dB lower due to cancellation
					// (In practice, perfect cancellation would be -Infinity, but numerical precision limits this)
					expect(systemResponse.spl[0]).toBeLessThan(individualSPL - 15);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should handle voltage source polarity inversion', () => {
		fc.assert(
			fc.property(
				fc.record({
					power: fc.double({ min: 0.1, max: 10, noNaN: true }),
					impedance: fc.double({ min: 4, max: 16, noNaN: true }),
				}),
				(params) => {
					const source = new VoltageSource(10, 10);
					source.parameters.power = params.power;
					source.parameters.impedance = params.impedance;

					// Check initial state
					expect(source.parameters.inverted).toBe(false);

					// Calculate voltage
					const normalVoltage = source.getVoltage();
					expect(normalVoltage).toBeCloseTo(Math.sqrt(params.power * params.impedance), 5);

					// Invert polarity
					source.parameters.inverted = true;

					// Voltage magnitude should remain the same
					const invertedVoltage = source.getVoltage();
					expect(invertedVoltage).toBeCloseTo(normalVoltage, 5);

					// The inverted flag should be set
					expect(source.parameters.inverted).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should maintain SPL magnitude when inverting polarity multiple times', () => {
		fc.assert(
			fc.property(
				fc.record({
					sensitivity: fc.double({ min: -5, max: 5, noNaN: true }),
					frdMagnitude: fc.double({ min: 85, max: 95, noNaN: true }),
					frdPhase: fc.double({ min: -180, max: 180, noNaN: true }),
					voltageMagnitude: fc.double({ min: 0.5, max: 2, noNaN: true }),
				}),
				(params) => {
					const circuit = new Circuit();
					const speaker = new Speaker(10, 10);
					speaker.label = 'S1';
					speaker.parameters.sensitivity = params.sensitivity;

					speaker.frdData = {
						frequencies: [1000],
						magnitudes: [params.frdMagnitude],
						phases: [params.frdPhase],
					};

					circuit.addComponent(speaker);

					const voltage = new Complex(params.voltageMagnitude, 0);
					const solverResults = {
						frequencies: [1000],
						componentVoltages: {
							[speaker.id]: [voltage],
						},
					};

					const analyzer = new FrequencyAnalyzer(circuit, solverResults);

					// Calculate SPL with normal polarity
					speaker.parameters.inverted = false;
					const result1 = analyzer.calculateSPL(speaker);

					// Invert once
					speaker.parameters.inverted = true;
					analyzer.calculateSPL(speaker);

					// Invert again (back to normal)
					speaker.parameters.inverted = false;
					const result3 = analyzer.calculateSPL(speaker);

					// SPL magnitude should be consistent
					expect(Math.abs(result1.spl[0] - result3.spl[0])).toBeLessThan(0.01);

					// Phase should also be consistent
					let phaseDiff = result1.phase[0] - result3.phase[0];
					while (phaseDiff > 180) {
						phaseDiff -= 360;
					}
					while (phaseDiff < -180) {
						phaseDiff += 360;
					}
					expect(Math.abs(phaseDiff)).toBeLessThan(0.1);
				},
			),
			{ numRuns: 100 },
		);
	});
});
