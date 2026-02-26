import Complex from 'complex.js';
import FrequencyAnalyzer from '../../src/simulation/FrequencyAnalyzer';
import SchemaValidator from '../../src/simulation/SchemaValidator';
import { Circuit } from '../../src/models/Circuit';
import { Speaker } from '../../src/models/Speaker';
import { VoltageSource } from '../../src/models/VoltageSource';

describe('FrequencyAnalyzer', () => {
	describe('calculateSPL', () => {
		it('should calculate SPL for a speaker with FRD data', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';

			// Mock FRD data
			speaker.frdData = {
				frequencies: [100, 1000, 10000],
				magnitudes: [85, 90, 88],
				phases: [-45, -90, -135],
			};

			circuit.addComponent(speaker);

			// Mock solver results
			const solverResults = {
				frequencies: [100, 1000, 10000],
				componentVoltages: {
					[speaker.id]: [
						new Complex(1, 0),
						new Complex(1, 0),
						new Complex(1, 0),
					],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSPL(speaker);

			expect(result.frequencies).toEqual([100, 1000, 10000]);
			expect(result.spl).toHaveLength(3);
			expect(result.phase).toHaveLength(3);

			// SPL should be FRD magnitude + 20*log10(voltage magnitude)
			// With voltage = 1, 20*log10(1) = 0, so SPL = FRD magnitude
			expect(result.spl[0]).toBeCloseTo(85, 1);
			expect(result.spl[1]).toBeCloseTo(90, 1);
			expect(result.spl[2]).toBeCloseTo(88, 1);
		});

		it('should apply sensitivity adjustment', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';
			speaker.parameters.sensitivity = 3.0; // +3 dB

			speaker.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSPL(speaker);

			// SPL should be 90 + 3 = 93 dB
			expect(result.spl[0]).toBeCloseTo(93, 1);
		});

		it('should apply delay as phase shift', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';
			speaker.parameters.delay = 1.0; // 1 millisecond

			speaker.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSPL(speaker);

			// Phase shift = -360 * frequency * delay
			// = -360 * 1000 * 0.001 = -360 degrees = 0 degrees (wrapped)
			expect(result.phase[0]).toBeCloseTo(0, 1);
		});

		it('should apply polarity inversion', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';
			speaker.parameters.inverted = true;

			speaker.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSPL(speaker);

			// Phase should be shifted by 180 degrees
			expect(result.phase[0]).toBeCloseTo(180, 1);
		});

		it('should return -Infinity SPL for muted speaker', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';
			speaker.parameters.muted = true;

			speaker.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSPL(speaker);

			expect(result.spl[0]).toBe(-Infinity);
		});

		it('should use off-axis data when angle is specified', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';

			// On-axis data
			speaker.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};

			// Off-axis data at 30 degrees
			speaker.offAxisData = [
				{
					angle: 30,
					data: {
						frequencies: [1000],
						magnitudes: [85], // 5 dB lower off-axis
						phases: [-10],
					},
				},
			];

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);

			// On-axis
			const onAxisResult = analyzer.calculateSPL(speaker, 0);
			expect(onAxisResult.spl[0]).toBeCloseTo(90, 1);

			// Off-axis at 30 degrees
			const offAxisResult = analyzer.calculateSPL(speaker, 30);
			expect(offAxisResult.spl[0]).toBeCloseTo(85, 1);
		});

		it('should throw error if speaker has no FRD data', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';
			// No FRD data loaded

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);

			expect(() => {
				analyzer.calculateSPL(speaker);
			}).toThrow('has no FRD data loaded');
		});
	});

	describe('calculateSystemResponse', () => {
		it('should combine multiple speaker responses', () => {
			const circuit = new Circuit();

			// Speaker 1
			const speaker1 = new Speaker(10, 10);
			speaker1.label = 'S1';
			speaker1.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};
			circuit.addComponent(speaker1);

			// Speaker 2
			const speaker2 = new Speaker(20, 10);
			speaker2.label = 'S2';
			speaker2.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};
			circuit.addComponent(speaker2);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker1.id]: [new Complex(1, 0)],
					[speaker2.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSystemResponse();

			expect(result.frequencies).toEqual([1000]);
			expect(result.spl).toHaveLength(1);
			expect(result.phase).toHaveLength(1);

			// Two identical speakers in phase should sum to +6 dB
			// 90 dB + 6 dB = 96 dB
			expect(result.spl[0]).toBeCloseTo(96, 1);

			// Should include individual speaker responses
			expect(result.speakerResponses[speaker1.id]).toBeDefined();
			expect(result.speakerResponses[speaker2.id]).toBeDefined();
		});

		it('should handle speakers with opposite polarity', () => {
			const circuit = new Circuit();

			// Speaker 1 - normal polarity
			const speaker1 = new Speaker(10, 10);
			speaker1.label = 'S1';
			speaker1.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};
			circuit.addComponent(speaker1);

			// Speaker 2 - inverted polarity
			const speaker2 = new Speaker(20, 10);
			speaker2.label = 'S2';
			speaker2.parameters.inverted = true;
			speaker2.frdData = {
				frequencies: [1000],
				magnitudes: [90],
				phases: [0],
			};
			circuit.addComponent(speaker2);

			const solverResults = {
				frequencies: [1000],
				componentVoltages: {
					[speaker1.id]: [new Complex(1, 0)],
					[speaker2.id]: [new Complex(1, 0)],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSystemResponse();

			// Two identical speakers 180 degrees out of phase should cancel
			expect(result.spl[0]).toBeLessThan(50); // Significant cancellation
		});

		it('should throw error if no speakers in circuit', () => {
			const circuit = new Circuit();
			const solverResults = {
				frequencies: [1000],
				componentVoltages: {},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);

			expect(() => {
				analyzer.calculateSystemResponse();
			}).toThrow('No speakers found in circuit');
		});
	});

	describe('calculateImpedance', () => {
		it('should calculate input impedance', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(10, 10);
			source.parameters.power = 1.0;
			source.parameters.impedance = 8.0;
			circuit.addComponent(source);

			// Mock solver results with source current
			const solverResults = {
				frequencies: [1000],
				sourceCurrents: {
					[source.id]: [new Complex(0.354, 0)], // I = V/R = 2.828/8 = 0.354 A
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateImpedance();

			expect(result.frequencies).toEqual([1000]);
			expect(result.impedances).toHaveLength(1);
			expect(result.phases).toHaveLength(1);

			// Z = V / I = 2.828 / 0.354 ≈ 8 ohms
			expect(result.impedances[0]).toBeCloseTo(8, 0);
		});

		it('should handle very low current (high impedance)', () => {
			const circuit = new Circuit();
			const source = new VoltageSource(10, 10);
			circuit.addComponent(source);

			const solverResults = {
				frequencies: [1000],
				sourceCurrents: {
					[source.id]: [new Complex(1e-15, 0)], // Very low current
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateImpedance();

			// Should return very high impedance
			expect(result.impedances[0]).toBeGreaterThan(1e10);
		});

		it('should throw error if no voltage source in circuit', () => {
			const circuit = new Circuit();
			const solverResults = {
				frequencies: [1000],
				sourceCurrents: {},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);

			expect(() => {
				analyzer.calculateImpedance();
			}).toThrow('No voltage source found in circuit');
		});
	});

	describe('applySmoothing', () => {
		it('should return original data for "none" smoothing', () => {
			const frequencies = [100, 200, 400, 800, 1600];
			const magnitudes = [85, 87, 90, 88, 86];

			const analyzer = new FrequencyAnalyzer(new Circuit(), {});
			const result = analyzer.applySmoothing(frequencies, magnitudes, 'none');

			expect(result).toEqual(magnitudes);
		});

		it('should apply 1/3 octave smoothing', () => {
			const frequencies = [100, 125, 160, 200, 250, 315, 400];
			const magnitudes = [85, 90, 85, 90, 85, 90, 85];

			const analyzer = new FrequencyAnalyzer(new Circuit(), {});
			const result = analyzer.applySmoothing(frequencies, magnitudes, '1/3');

			expect(result).toHaveLength(frequencies.length);
			// Smoothed values should be between min and max
			result.forEach((value) => {
				expect(value).toBeGreaterThanOrEqual(85);
				expect(value).toBeLessThanOrEqual(90);
			});
		});

		it('should apply ERB smoothing', () => {
			const frequencies = [100, 200, 400, 800, 1600];
			const magnitudes = [85, 90, 85, 90, 85];

			const analyzer = new FrequencyAnalyzer(new Circuit(), {});
			const result = analyzer.applySmoothing(frequencies, magnitudes, 'ERB');

			expect(result).toHaveLength(frequencies.length);
			// Smoothed values should be between min and max
			result.forEach((value) => {
				expect(value).toBeGreaterThanOrEqual(85);
				expect(value).toBeLessThanOrEqual(90);
			});
		});

		it('should handle unknown smoothing type', () => {
			const frequencies = [100, 200, 400];
			const magnitudes = [85, 90, 85];

			const analyzer = new FrequencyAnalyzer(new Circuit(), {});
			const result = analyzer.applySmoothing(frequencies, magnitudes, 'invalid');

			// Should return original data
			expect(result).toEqual(magnitudes);
		});
	});

	describe('interpolate', () => {
		it('should interpolate between two points', () => {
			const analyzer = new FrequencyAnalyzer(new Circuit(), {});

			const xArray = [100, 200, 400];
			const yArray = [85, 90, 88];

			// Interpolate at 150 (midpoint between 100 and 200)
			const result = analyzer.interpolate(xArray, yArray, 150);

			// Should be halfway between 85 and 90
			expect(result).toBeCloseTo(87.5, 1);
		});

		it('should return first value for x below range', () => {
			const analyzer = new FrequencyAnalyzer(new Circuit(), {});

			const xArray = [100, 200, 400];
			const yArray = [85, 90, 88];

			const result = analyzer.interpolate(xArray, yArray, 50);

			expect(result).toBe(85);
		});

		it('should return last value for x above range', () => {
			const analyzer = new FrequencyAnalyzer(new Circuit(), {});

			const xArray = [100, 200, 400];
			const yArray = [85, 90, 88];

			const result = analyzer.interpolate(xArray, yArray, 500);

			expect(result).toBe(88);
		});
	});

	describe('Schema Validation', () => {
		it('should produce frequency response data that validates against schema', () => {
			const circuit = new Circuit();
			const speaker = new Speaker(10, 10);
			speaker.label = 'S1';

			speaker.frdData = {
				frequencies: [100, 1000, 10000],
				magnitudes: [85, 90, 88],
				phases: [-45, -90, -135],
			};

			circuit.addComponent(speaker);

			const solverResults = {
				frequencies: [100, 1000, 10000],
				componentVoltages: {
					[speaker.id]: [
						new Complex(1, 0),
						new Complex(1, 0),
						new Complex(1, 0),
					],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSPL(speaker);

			// Validate result against schema
			const validation = SchemaValidator.validateFrequencyResponseData(result);
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);
		});

		it('should produce system response data that validates against schema', () => {
			const circuit = new Circuit();
			const speaker1 = new Speaker(10, 10);
			speaker1.label = 'S1';
			speaker1.frdData = {
				frequencies: [100, 1000, 10000],
				magnitudes: [85, 90, 88],
				phases: [0, 0, 0],
			};

			const speaker2 = new Speaker(20, 20);
			speaker2.label = 'S2';
			speaker2.frdData = {
				frequencies: [100, 1000, 10000],
				magnitudes: [80, 85, 90],
				phases: [0, 0, 0],
			};

			circuit.addComponent(speaker1);
			circuit.addComponent(speaker2);

			const solverResults = {
				frequencies: [100, 1000, 10000],
				componentVoltages: {
					[speaker1.id]: [
						new Complex(1, 0),
						new Complex(1, 0),
						new Complex(1, 0),
					],
					[speaker2.id]: [
						new Complex(1, 0),
						new Complex(1, 0),
						new Complex(1, 0),
					],
				},
			};

			const analyzer = new FrequencyAnalyzer(circuit, solverResults);
			const result = analyzer.calculateSystemResponse();

			// Validate result against schema
			const validation = SchemaValidator.validateFrequencyResponseData(result);
			expect(validation.valid).toBe(true);
			expect(validation.errors).toEqual([]);

			// Should have speakerResponses property
			expect(result.speakerResponses).toBeDefined();
			expect(Object.keys(result.speakerResponses)).toHaveLength(2);
		});
	});
});
