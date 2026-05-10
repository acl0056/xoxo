import { OpAmp } from '@/models/OpAmp';
import { Circuit } from '@/models/Circuit';
import { Ground } from '@/models/Ground';
import { VoltageSource } from '@/models/VoltageSource';
import fc from 'fast-check';

function magnitude(h) {
	return Math.sqrt(h.re * h.re + h.im * h.im);
}

function magnitudeDb(h) {
	return 20 * Math.log10(magnitude(h));
}

describe('OpAmp Model', () => {
	describe('Unit Tests', () => {
		describe('constructor defaults', () => {
			it('should initialize with correct default parameters', () => {
				const opamp = new OpAmp(0, 0);
				expect(opamp.type).toBe('opamp');
				expect(opamp.parameters.dcGain).toBe(100);
				expect(opamp.parameters.cornerFrequency).toBe(50);
			});

			it('should have 4 terminals at correct positions', () => {
				const opamp = new OpAmp(5, 10);
				expect(opamp.terminals).toHaveLength(4);
				expect(opamp.terminals[0]).toEqual({ x: -2, y: -2 }); // +in
				expect(opamp.terminals[1]).toEqual({ x: -2, y: 2 }); // -in
				expect(opamp.terminals[2]).toEqual({ x: 2, y: -2 }); // +out
				expect(opamp.terminals[3]).toEqual({ x: 2, y: 2 }); // -out
			});

			it('should set position from constructor arguments', () => {
				const opamp = new OpAmp(7, 13);
				expect(opamp.x).toBe(7);
				expect(opamp.y).toBe(13);
			});
		});

		describe('validate()', () => {
			it('should return valid:true for default parameters', () => {
				const opamp = new OpAmp(0, 0);
				const result = opamp.validate();
				expect(result.valid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it('should reject NaN dcGain', () => {
				const opamp = new OpAmp(0, 0);
				opamp.parameters.dcGain = NaN;
				const result = opamp.validate();
				expect(result.valid).toBe(false);
				expect(result.errors.some((e) => e.includes('dcGain'))).toBe(true);
			});

			it('should reject Infinity dcGain', () => {
				const opamp = new OpAmp(0, 0);
				opamp.parameters.dcGain = Infinity;
				const result = opamp.validate();
				expect(result.valid).toBe(false);
				expect(result.errors.some((e) => e.includes('dcGain'))).toBe(true);
			});

			it('should reject non-positive cornerFrequency', () => {
				const opamp = new OpAmp(0, 0);
				opamp.parameters.cornerFrequency = 0;
				const result = opamp.validate();
				expect(result.valid).toBe(false);
				expect(result.errors.some((e) => e.includes('cornerFrequency'))).toBe(true);
			});

			it('should reject negative cornerFrequency', () => {
				const opamp = new OpAmp(0, 0);
				opamp.parameters.cornerFrequency = -10;
				const result = opamp.validate();
				expect(result.valid).toBe(false);
			});

			it('should reject NaN cornerFrequency', () => {
				const opamp = new OpAmp(0, 0);
				opamp.parameters.cornerFrequency = NaN;
				const result = opamp.validate();
				expect(result.valid).toBe(false);
			});

			it('should accept negative dcGain (valid attenuation)', () => {
				const opamp = new OpAmp(0, 0);
				opamp.parameters.dcGain = -20;
				const result = opamp.validate();
				expect(result.valid).toBe(true);
			});
		});

		describe('evaluateTransferFunction()', () => {
			it('should return { re: A₀, im: 0 } at f=0', () => {
				const opamp = new OpAmp(0, 0);
				const result = opamp.evaluateTransferFunction(0);
				const expectedA0 = 10 ** (100 / 20); // 100000
				expect(result.re).toBeCloseTo(expectedA0, 5);
				expect(result.im).toBeCloseTo(0, 10);
			});

			it('should return magnitude ≈ -3.01 dB below DC at corner frequency', () => {
				const opamp = new OpAmp(0, 0);
				const dcResult = opamp.evaluateTransferFunction(0);
				const cornerResult = opamp.evaluateTransferFunction(50);

				const dcMagDb = magnitudeDb(dcResult);
				const cornerMagDb = magnitudeDb(cornerResult);

				// At corner frequency, magnitude should be -3.01 dB below DC
				expect(dcMagDb - cornerMagDb).toBeCloseTo(3.0103, 2);
			});

			it('should show roll-off at high frequency', () => {
				const opamp = new OpAmp(0, 0);
				const f1 = 500; // 10× corner
				const f2 = 5000; // 100× corner

				const mag1Db = magnitudeDb(opamp.evaluateTransferFunction(f1));
				const mag2Db = magnitudeDb(opamp.evaluateTransferFunction(f2));

				// One decade apart, should be ~20 dB difference
				expect(mag1Db - mag2Db).toBeCloseTo(20, 0);
			});
		});

		describe('toJSON()', () => {
			it('should include all parameters', () => {
				const opamp = new OpAmp(3, 7);
				opamp.label = 'A0';
				opamp.parameters.dcGain = 80;
				opamp.parameters.cornerFrequency = 100;

				const json = opamp.toJSON();
				expect(json.type).toBe('opamp');
				expect(json.x).toBe(3);
				expect(json.y).toBe(7);
				expect(json.label).toBe('A0');
				expect(json.parameters.dcGain).toBe(80);
				expect(json.parameters.cornerFrequency).toBe(100);
			});
		});

		describe('fromJSON()', () => {
			it('should reconstruct equivalent instance', () => {
				const original = new OpAmp(5, 10);
				original.label = 'A1';
				original.parameters.dcGain = 60;
				original.parameters.cornerFrequency = 200;

				const json = original.toJSON();
				const restored = OpAmp.fromJSON(json);

				expect(restored.type).toBe('opamp');
				expect(restored.x).toBe(5);
				expect(restored.y).toBe(10);
				expect(restored.label).toBe('A1');
				expect(restored.parameters.dcGain).toBe(60);
				expect(restored.parameters.cornerFrequency).toBe(200);
				expect(restored.id).toBe(original.id);
			});
		});
	});

	describe('Property-Based Tests', () => {
		// Generators
		const validDcGain = fc.double({ min: -200, max: 200, noNaN: true, noDefaultInfinity: true });
		const validCornerFrequency = fc.double({ min: 0.001, max: 1e9, noNaN: true, noDefaultInfinity: true });
		const validFrequency = fc.double({ min: 0, max: 1e9, noNaN: true, noDefaultInfinity: true });

		describe('Property 1: OpAmp Serialization Round-Trip', () => {
			/**
			 * Feature: opamp-component, Property 1: OpAmp Serialization Round-Trip
			 * Validates: Requirements 2.6, 2.7, 2.8, 8.1, 8.2, 8.3
			 */
			it('toJSON() then fromJSON() produces identical parameters', () => {
				fc.assert(
					fc.property(
						validDcGain,
						validCornerFrequency,
						(dcGain, cornerFrequency) => {
							const opamp = new OpAmp(0, 0);
							opamp.parameters.dcGain = dcGain;
							opamp.parameters.cornerFrequency = cornerFrequency;

							const restored = OpAmp.fromJSON(opamp.toJSON());

							expect(restored.parameters.dcGain).toBe(dcGain);
							expect(restored.parameters.cornerFrequency).toBe(cornerFrequency);
							expect(restored.type).toBe('opamp');
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 2: OpAmp Validation Correctness', () => {
			/**
			 * Feature: opamp-component, Property 2: OpAmp Validation Correctness
			 * Validates: Requirements 2.4, 2.5
			 */
			it('validate() returns valid:true iff dcGain is finite AND cornerFrequency is positive', () => {
				fc.assert(
					fc.property(
						fc.oneof(
							// Valid parameters
							fc.record({
								dcGain: validDcGain,
								cornerFrequency: validCornerFrequency,
							}),
							// Invalid: NaN dcGain
							fc.record({
								dcGain: fc.constant(NaN),
								cornerFrequency: validCornerFrequency,
							}),
							// Invalid: Infinity dcGain
							fc.record({
								dcGain: fc.constant(Infinity),
								cornerFrequency: validCornerFrequency,
							}),
							// Invalid: non-positive cornerFrequency
							fc.record({
								dcGain: validDcGain,
								cornerFrequency: fc.double({ min: -1e9, max: 0, noNaN: true, noDefaultInfinity: true }),
							}),
							// Invalid: NaN cornerFrequency
							fc.record({
								dcGain: validDcGain,
								cornerFrequency: fc.constant(NaN),
							}),
						),
						(params) => {
							const opamp = new OpAmp(0, 0);
							opamp.parameters = params;

							const result = opamp.validate();
							const dcGainValid = typeof params.dcGain === 'number' && Number.isFinite(params.dcGain);
							const cornerFreqValid = typeof params.cornerFrequency === 'number' && Number.isFinite(params.cornerFrequency) && params.cornerFrequency > 0;

							if (dcGainValid && cornerFreqValid) {
								expect(result.valid).toBe(true);
							} else {
								expect(result.valid).toBe(false);
								expect(result.errors.length).toBeGreaterThan(0);
							}
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 3: Transfer Function Formula Correctness', () => {
			/**
			 * Feature: opamp-component, Property 3: Transfer Function Formula Correctness
			 * Validates: Requirements 3.1, 3.2
			 */
			it('returns correct re and im values for any valid parameters and frequency', () => {
				fc.assert(
					fc.property(
						validDcGain,
						validCornerFrequency,
						validFrequency,
						(dcGain, cornerFrequency, frequency) => {
							const opamp = new OpAmp(0, 0);
							opamp.parameters.dcGain = dcGain;
							opamp.parameters.cornerFrequency = cornerFrequency;

							const result = opamp.evaluateTransferFunction(frequency);

							const linearGain = 10 ** (dcGain / 20);
							const ratio = frequency / cornerFrequency;
							const denomMagSquared = 1 + ratio * ratio;
							const expectedRe = linearGain / denomMagSquared;
							const expectedIm = -(linearGain * ratio) / denomMagSquared;

							// Use relative tolerance for large values
							const tolerance = Math.max(Math.abs(expectedRe) * 1e-10, 1e-15);
							expect(Math.abs(result.re - expectedRe)).toBeLessThan(tolerance);

							const toleranceIm = Math.max(Math.abs(expectedIm) * 1e-10, 1e-15);
							expect(Math.abs(result.im - expectedIm)).toBeLessThan(toleranceIm);
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 4: DC Gain Magnitude', () => {
			/**
			 * Feature: opamp-component, Property 4: DC Gain Magnitude
			 * Validates: Requirements 3.3
			 */
			it('evaluateTransferFunction(0) produces magnitude equal to 10^(G/20)', () => {
				fc.assert(
					fc.property(
						validDcGain,
						validCornerFrequency,
						(dcGain, cornerFrequency) => {
							const opamp = new OpAmp(0, 0);
							opamp.parameters.dcGain = dcGain;
							opamp.parameters.cornerFrequency = cornerFrequency;

							const result = opamp.evaluateTransferFunction(0);
							const expectedMagnitude = 10 ** (dcGain / 20);

							const tolerance = Math.max(Math.abs(expectedMagnitude) * 1e-10, 1e-15);
							expect(Math.abs(magnitude(result) - expectedMagnitude)).toBeLessThan(tolerance);
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 5: Corner Frequency -3 dB Point', () => {
			/**
			 * Feature: opamp-component, Property 5: Corner Frequency -3 dB Point
			 * Validates: Requirements 3.4
			 */
			it('evaluateTransferFunction(f_c) produces magnitude approximately 3.01 dB below DC gain', () => {
				fc.assert(
					fc.property(
						validDcGain,
						validCornerFrequency,
						(dcGain, cornerFrequency) => {
							const opamp = new OpAmp(0, 0);
							opamp.parameters.dcGain = dcGain;
							opamp.parameters.cornerFrequency = cornerFrequency;

							const dcResult = opamp.evaluateTransferFunction(0);
							const cornerResult = opamp.evaluateTransferFunction(cornerFrequency);

							const dcMagDb = magnitudeDb(dcResult);
							const cornerMagDb = magnitudeDb(cornerResult);
							const dropDb = dcMagDb - cornerMagDb;

							// Should be exactly 3.0103 dB (10*log10(2))
							expect(Math.abs(dropDb - 3.0103)).toBeLessThan(0.01);
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 6: High-Frequency Roll-Off Rate', () => {
			/**
			 * Feature: opamp-component, Property 6: High-Frequency Roll-Off Rate
			 * Validates: Requirements 3.5
			 */
			it('magnitude at f₂=10×f₁ is approximately 20 dB below magnitude at f₁ (f₁ ≥ 10×f_c)', () => {
				fc.assert(
					fc.property(
						validDcGain,
						fc.double({ min: 0.001, max: 1000, noNaN: true, noDefaultInfinity: true }),
						fc.double({ min: 10, max: 1000, noNaN: true, noDefaultInfinity: true }),
						(dcGain, cornerFrequency, multiplier) => {
							const opamp = new OpAmp(0, 0);
							opamp.parameters.dcGain = dcGain;
							opamp.parameters.cornerFrequency = cornerFrequency;

							const f1 = cornerFrequency * multiplier; // f1 >= 10 × f_c
							const f2 = f1 * 10; // one decade above f1

							const mag1Db = magnitudeDb(opamp.evaluateTransferFunction(f1));
							const mag2Db = magnitudeDb(opamp.evaluateTransferFunction(f2));

							const rollOff = mag1Db - mag2Db;

							// Should be approximately 20 dB per decade (±1 dB tolerance)
							expect(Math.abs(rollOff - 20)).toBeLessThan(1);
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 7: Circuit-Level Serialization Round-Trip', () => {
			/**
			 * Feature: opamp-component, Property 7: Circuit-Level Serialization Round-Trip
			 * Validates: Requirements 8.1, 8.2, 8.3
			 */
			it('Circuit.fromJSON(Circuit.toJSON(circuit)) preserves OpAmp parameters', () => {
				fc.assert(
					fc.property(
						fc.array(
							fc.record({
								dcGain: validDcGain,
								cornerFrequency: validCornerFrequency,
								x: fc.integer({ min: 0, max: 100 }),
								y: fc.integer({ min: 0, max: 100 }),
							}),
							{ minLength: 1, maxLength: 5 },
						),
						(opampConfigs) => {
							const circuit = new Circuit();

							// Add required ground and source
							const ground = new Ground(0, 0);
							circuit.components.push(ground);
							const source = new VoltageSource(0, 5);
							circuit.components.push(source);

							// Add OpAmp components
							const originalParams = [];
							opampConfigs.forEach((config) => {
								const opamp = new OpAmp(config.x, config.y);
								opamp.parameters.dcGain = config.dcGain;
								opamp.parameters.cornerFrequency = config.cornerFrequency;
								circuit.components.push(opamp);
								originalParams.push({
									dcGain: config.dcGain,
									cornerFrequency: config.cornerFrequency,
								});
							});

							// Round-trip
							const json = circuit.toJSON();
							const restored = Circuit.fromJSON(json);

							// Verify OpAmp parameters are preserved
							const restoredOpAmps = restored.components.filter((c) => c.type === 'opamp');
							expect(restoredOpAmps).toHaveLength(opampConfigs.length);

							restoredOpAmps.forEach((restoredOpAmp, index) => {
								expect(restoredOpAmp.parameters.dcGain).toBe(originalParams[index].dcGain);
								expect(restoredOpAmp.parameters.cornerFrequency).toBe(originalParams[index].cornerFrequency);
							});
						},
					),
					{ numRuns: 100 },
				);
			});
		});
	});
});
