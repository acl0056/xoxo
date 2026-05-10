import { Filter } from '@/models/Filter';
import FilterCoefficientCalculator from '@/simulation/FilterCoefficientCalculator';
import BiquadCalculator from '@/simulation/BiquadCalculator';
import fc from 'fast-check';

function magnitudeDb(h) {
	return 20 * Math.log10(Math.sqrt(h.re * h.re + h.im * h.im));
}

function magnitude(h) {
	return Math.sqrt(h.re * h.re + h.im * h.im);
}

describe('Filter Model', () => {
	describe('Unit Tests', () => {
		describe('constructor defaults', () => {
			it('should initialize with correct default parameters', () => {
				const filter = new Filter(0, 0);
				expect(filter.type).toBe('filter');
				expect(filter.parameters.filterShape).toBe('butterworth');
				expect(filter.parameters.filterType).toBe('lowPass');
				expect(filter.parameters.filterOrder).toBe(2);
				expect(filter.parameters.turnFrequency).toBe(1000);
				expect(filter.parameters.gain).toBe(0);
				expect(filter.parameters.delay).toBe(0);
				expect(filter.parameters.muted).toBe(false);
			});
		});

		describe('validate()', () => {
			it('should return valid:true for default parameters', () => {
				const filter = new Filter(0, 0);
				const result = filter.validate();
				expect(result.valid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it('should reject invalid filterShape', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterShape = 'invalid';
				const result = filter.validate();
				expect(result.valid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});

			it('should reject invalid filterType', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterType = 'notAType';
				const result = filter.validate();
				expect(result.valid).toBe(false);
			});

			it('should reject non-integer filterOrder', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterOrder = 2.5;
				const result = filter.validate();
				expect(result.valid).toBe(false);
			});

			it('should reject filterOrder out of range', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterOrder = 0;
				expect(filter.validate().valid).toBe(false);

				filter.parameters.filterOrder = 41;
				expect(filter.validate().valid).toBe(false);
			});

			it('should reject odd order for Linkwitz-Riley', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterShape = 'linkwitzRiley';
				filter.parameters.filterOrder = 3;
				const result = filter.validate();
				expect(result.valid).toBe(false);
			});

			it('should accept even order for Linkwitz-Riley', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterShape = 'linkwitzRiley';
				filter.parameters.filterOrder = 4;
				const result = filter.validate();
				expect(result.valid).toBe(true);
			});

			it('should reject non-positive turnFrequency', () => {
				const filter = new Filter(0, 0);
				filter.parameters.turnFrequency = 0;
				expect(filter.validate().valid).toBe(false);

				filter.parameters.turnFrequency = -100;
				expect(filter.validate().valid).toBe(false);
			});

			it('should reject NaN gain', () => {
				const filter = new Filter(0, 0);
				filter.parameters.gain = NaN;
				expect(filter.validate().valid).toBe(false);
			});

			it('should reject negative delay', () => {
				const filter = new Filter(0, 0);
				filter.parameters.delay = -0.001;
				expect(filter.validate().valid).toBe(false);
			});
		});

		describe('terminal positions', () => {
			it('should have 4 terminals matching PEQ layout', () => {
				const filter = new Filter(0, 0);
				expect(filter.terminals).toHaveLength(4);
				expect(filter.terminals[0]).toEqual({ x: -2, y: -2 }); // +in
				expect(filter.terminals[1]).toEqual({ x: -2, y: 2 }); // -in
				expect(filter.terminals[2]).toEqual({ x: 2, y: -2 }); // +out
				expect(filter.terminals[3]).toEqual({ x: 2, y: 2 }); // -out
			});
		});

		describe('evaluateTransferFunction', () => {
			it('should return zero when muted', () => {
				const filter = new Filter(0, 0);
				filter.parameters.muted = true;
				const h = filter.evaluateTransferFunction(1000);
				expect(h.re).toBe(0);
				expect(h.im).toBe(0);
			});

			it('should produce approximately -3 dB at turn frequency for Bessel LP order 2', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterShape = 'bessel';
				filter.parameters.filterType = 'lowPass';
				filter.parameters.filterOrder = 2;
				filter.parameters.turnFrequency = 1000;
				filter._parametersDirty = true;

				const h = filter.evaluateTransferFunction(1000);
				const db = magnitudeDb(h);
				// Bessel order 2 at turn frequency produces approximately -3 dB
				expect(db).toBeCloseTo(-3.01, 0);
			});

			it('should scale magnitude with gain', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterShape = 'butterworth';
				filter.parameters.filterType = 'lowPass';
				filter.parameters.filterOrder = 2;
				filter.parameters.turnFrequency = 1000;
				filter.parameters.gain = 6;
				filter._parametersDirty = true;

				const h = filter.evaluateTransferFunction(100);
				const db = magnitudeDb(h);
				// At 100 Hz (well below 1 kHz), LP should be ~0 dB + 6 dB gain = ~6 dB
				expect(db).toBeCloseTo(6, 0);
			});

			it('should preserve magnitude with delay', () => {
				const filter = new Filter(0, 0);
				filter.parameters.filterShape = 'butterworth';
				filter.parameters.filterType = 'lowPass';
				filter.parameters.filterOrder = 2;
				filter.parameters.turnFrequency = 1000;
				filter._parametersDirty = true;

				const hNoDelay = filter.evaluateTransferFunction(500);
				const magNoDelay = magnitude(hNoDelay);

				filter.parameters.delay = 0.001;
				filter._parametersDirty = true;

				const hWithDelay = filter.evaluateTransferFunction(500);
				const magWithDelay = magnitude(hWithDelay);

				expect(magWithDelay).toBeCloseTo(magNoDelay, 10);
			});
		});

		describe('toJSON / fromJSON', () => {
			it('should serialize all parameters in toJSON', () => {
				const filter = new Filter(5, 10);
				filter.parameters.filterShape = 'bessel';
				filter.parameters.filterType = 'highPass';
				filter.parameters.filterOrder = 4;
				filter.parameters.turnFrequency = 2000;
				filter.parameters.gain = -3;
				filter.parameters.delay = 0.005;
				filter.parameters.muted = true;

				const json = filter.toJSON();
				expect(json.type).toBe('filter');
				expect(json.x).toBe(5);
				expect(json.y).toBe(10);
				expect(json.parameters.filterShape).toBe('bessel');
				expect(json.parameters.filterType).toBe('highPass');
				expect(json.parameters.filterOrder).toBe(4);
				expect(json.parameters.turnFrequency).toBe(2000);
				expect(json.parameters.gain).toBe(-3);
				expect(json.parameters.delay).toBe(0.005);
				expect(json.parameters.muted).toBe(true);
			});

			it('should reconstruct equivalent instance from fromJSON', () => {
				const filter = new Filter(3, 7);
				filter.parameters.filterShape = 'linkwitzRiley';
				filter.parameters.filterType = 'bandpass';
				filter.parameters.filterOrder = 6;
				filter.parameters.turnFrequency = 500;
				filter.parameters.gain = 2;
				filter.parameters.delay = 0.01;
				filter.parameters.muted = false;

				const json = filter.toJSON();
				const restored = Filter.fromJSON(json);

				expect(restored.type).toBe('filter');
				expect(restored.x).toBe(3);
				expect(restored.y).toBe(7);
				expect(restored.parameters.filterShape).toBe('linkwitzRiley');
				expect(restored.parameters.filterType).toBe('bandpass');
				expect(restored.parameters.filterOrder).toBe(6);
				expect(restored.parameters.turnFrequency).toBe(500);
				expect(restored.parameters.gain).toBe(2);
				expect(restored.parameters.delay).toBe(0.01);
				expect(restored.parameters.muted).toBe(false);
			});
		});
	});

	describe('Property Tests', () => {
		// Generators
		const filterShapeGen = fc.constantFrom('butterworth', 'linkwitzRiley', 'bessel');
		const filterTypeGen = fc.constantFrom('lowPass', 'highPass', 'bandpass');
		const dspRateGen = fc.constantFrom(48000, 96000, 192000);
		const turnFrequencyGen = fc.double({ min: 20, max: 20000, noNaN: true });
		const gainGen = fc.double({ min: -30, max: 30, noNaN: true });
		const delayGen = fc.double({ min: 0, max: 0.1, noNaN: true });

		function validFilterParamsGen() {
			return fc.record({
				filterShape: filterShapeGen,
				filterType: filterTypeGen,
				filterOrder: fc.integer({ min: 1, max: 20 }),
				turnFrequency: turnFrequencyGen,
				gain: gainGen,
				delay: delayGen,
				muted: fc.boolean(),
			}).map((params) => {
				// Ensure LR has even order
				if (params.filterShape === 'linkwitzRiley') {
					params.filterOrder = Math.max(2, params.filterOrder * 2);
					if (params.filterOrder > 40) params.filterOrder = 40;
				}
				// Limit bessel to order 20
				if (params.filterShape === 'bessel' && params.filterOrder > 20) {
					params.filterOrder = 20;
				}
				return params;
			});
		}

		describe('Property 1: Filter Serialization Round-Trip', () => {
			/**
			 * **Validates: Requirements 2.10, 2.11, 2.12, 9.1, 9.2, 9.3**
			 * For any valid Filter instance with arbitrary parameters,
			 * verify toJSON() then fromJSON() produces identical parameters.
			 */
			it('should round-trip serialize/deserialize all parameters', () => {
				fc.assert(
					fc.property(
						validFilterParamsGen(),
						fc.integer({ min: -100, max: 100 }),
						fc.integer({ min: -100, max: 100 }),
						(params, x, y) => {
							const filter = new Filter(x, y);
							filter.parameters = { ...params };

							const json = filter.toJSON();
							const restored = Filter.fromJSON(json);

							return (
								restored.parameters.filterShape === params.filterShape
								&& restored.parameters.filterType === params.filterType
								&& restored.parameters.filterOrder === params.filterOrder
								&& restored.parameters.turnFrequency === params.turnFrequency
								&& restored.parameters.gain === params.gain
								&& restored.parameters.delay === params.delay
								&& restored.parameters.muted === params.muted
								&& restored.x === x
								&& restored.y === y
							);
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 2: Filter Validation Correctness', () => {
			/**
			 * **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**
			 * For any Filter parameter object, verify validate() returns valid:true
			 * iff all constraints are met, and valid:false otherwise.
			 */
			it('should correctly validate valid parameter combinations', () => {
				fc.assert(
					fc.property(
						validFilterParamsGen(),
						(params) => {
							const filter = new Filter(0, 0);
							filter.parameters = { ...params };
							const result = filter.validate();
							return result.valid === true;
						},
					),
					{ numRuns: 100 },
				);
			});

			it('should correctly reject invalid parameter combinations', () => {
				const invalidParamsGen = fc.oneof(
					// Invalid shape
					fc.record({
						filterShape: fc.constantFrom('invalid', 'notAShape', ''),
						filterType: fc.constantFrom('lowPass'),
						filterOrder: fc.constant(2),
						turnFrequency: fc.constant(1000),
						gain: fc.constant(0),
						delay: fc.constant(0),
						muted: fc.constant(false),
					}),
					// Invalid type
					fc.record({
						filterShape: fc.constantFrom('butterworth'),
						filterType: fc.constantFrom('invalid', 'notAType', ''),
						filterOrder: fc.constant(2),
						turnFrequency: fc.constant(1000),
						gain: fc.constant(0),
						delay: fc.constant(0),
						muted: fc.constant(false),
					}),
					// Invalid order (out of range)
					fc.record({
						filterShape: fc.constantFrom('butterworth'),
						filterType: fc.constantFrom('lowPass'),
						filterOrder: fc.oneof(fc.constant(0), fc.constant(41), fc.constant(-1)),
						turnFrequency: fc.constant(1000),
						gain: fc.constant(0),
						delay: fc.constant(0),
						muted: fc.constant(false),
					}),
					// LR with odd order
					fc.record({
						filterShape: fc.constant('linkwitzRiley'),
						filterType: fc.constantFrom('lowPass'),
						filterOrder: fc.constantFrom(1, 3, 5, 7),
						turnFrequency: fc.constant(1000),
						gain: fc.constant(0),
						delay: fc.constant(0),
						muted: fc.constant(false),
					}),
					// Non-positive turnFrequency
					fc.record({
						filterShape: fc.constantFrom('butterworth'),
						filterType: fc.constantFrom('lowPass'),
						filterOrder: fc.constant(2),
						turnFrequency: fc.oneof(fc.constant(0), fc.constant(-100)),
						gain: fc.constant(0),
						delay: fc.constant(0),
						muted: fc.constant(false),
					}),
					// Negative delay
					fc.record({
						filterShape: fc.constantFrom('butterworth'),
						filterType: fc.constantFrom('lowPass'),
						filterOrder: fc.constant(2),
						turnFrequency: fc.constant(1000),
						gain: fc.constant(0),
						delay: fc.constantFrom(-0.001, -1),
						muted: fc.constant(false),
					}),
				);

				fc.assert(
					fc.property(
						invalidParamsGen,
						(params) => {
							const filter = new Filter(0, 0);
							filter.parameters = { ...params };
							const result = filter.validate();
							return result.valid === false;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 10: Combined Transfer Function Equals Product of Sections', () => {
			/**
			 * **Validates: Requirements 4.1**
			 * For any Filter configuration and any frequency, verify combined H(f)
			 * (excluding gain/delay) equals product of individual biquad section evaluations.
			 */
			it('should equal product of individual section transfer functions', () => {
				fc.assert(
					fc.property(
						validFilterParamsGen(),
						fc.double({ min: 20, max: 20000, noNaN: true }),
						(params, frequency) => {
							const dspRate = 48000;
							const { sections } = FilterCoefficientCalculator.computeFilterCoefficients(params, dspRate);

							// Compute product of individual sections
							let productRe = 1;
							let productIm = 0;
							for (const coeffs of sections) {
								const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);
								const newRe = productRe * h.re - productIm * h.im;
								const newIm = productRe * h.im + productIm * h.re;
								productRe = newRe;
								productIm = newIm;
							}

							// Compute via Filter model (with gain=0, delay=0, muted=false)
							const filter = new Filter(0, 0);
							filter.parameters = {
								...params, gain: 0, delay: 0, muted: false,
							};
							filter._parametersDirty = true;
							const h = filter.evaluateTransferFunction(frequency);

							// Compare magnitudes (avoid phase issues from floating point)
							const productMag = Math.sqrt(productRe * productRe + productIm * productIm);
							const filterMag = Math.sqrt(h.re * h.re + h.im * h.im);

							if (productMag < 1e-15 && filterMag < 1e-15) return true;
							if (productMag === 0) return filterMag < 1e-10;

							const relativeError = Math.abs(productMag - filterMag) / Math.max(productMag, 1e-15);
							return relativeError < 0.001;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 11: Gain Scales Magnitude', () => {
			/**
			 * **Validates: Requirements 4.3**
			 * For any Filter configuration and any frequency, verify changing gain
			 * from 0 to G dB scales magnitude by 10^(G/20).
			 */
			it('should scale magnitude by gain factor', () => {
				fc.assert(
					fc.property(
						validFilterParamsGen(),
						fc.double({ min: 20, max: 20000, noNaN: true }),
						gainGen,
						(params, frequency, gain) => {
							// Filter with gain = 0
							const filter0 = new Filter(0, 0);
							filter0.parameters = {
								...params, gain: 0, delay: 0, muted: false,
							};
							filter0._parametersDirty = true;
							const h0 = filter0.evaluateTransferFunction(frequency);
							const mag0 = magnitude(h0);

							// Filter with gain = G
							const filterG = new Filter(0, 0);
							filterG.parameters = {
								...params, gain, delay: 0, muted: false,
							};
							filterG._parametersDirty = true;
							const hG = filterG.evaluateTransferFunction(frequency);
							const magG = magnitude(hG);

							if (mag0 < 1e-15) return magG < 1e-10;

							const expectedMagG = mag0 * (10 ** (gain / 20));
							if (expectedMagG < 1e-15) return magG < 1e-10;

							const relativeError = Math.abs(magG - expectedMagG) / Math.max(expectedMagG, 1e-15);
							return relativeError < 0.001;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 12: Delay Preserves Magnitude', () => {
			/**
			 * **Validates: Requirements 4.4**
			 * For any Filter configuration with delay D > 0 and any frequency,
			 * verify |H(f)| is identical with or without delay.
			 */
			it('should preserve magnitude regardless of delay', () => {
				fc.assert(
					fc.property(
						validFilterParamsGen(),
						fc.double({ min: 20, max: 20000, noNaN: true }),
						fc.double({ min: 0.0001, max: 0.1, noNaN: true }),
						(params, frequency, delay) => {
							// Filter without delay
							const filterNoDelay = new Filter(0, 0);
							filterNoDelay.parameters = {
								...params, delay: 0, muted: false,
							};
							filterNoDelay._parametersDirty = true;
							const hNoDelay = filterNoDelay.evaluateTransferFunction(frequency);
							const magNoDelay = magnitude(hNoDelay);

							// Filter with delay
							const filterWithDelay = new Filter(0, 0);
							filterWithDelay.parameters = {
								...params, delay, muted: false,
							};
							filterWithDelay._parametersDirty = true;
							const hWithDelay = filterWithDelay.evaluateTransferFunction(frequency);
							const magWithDelay = magnitude(hWithDelay);

							if (magNoDelay < 1e-15) return magWithDelay < 1e-10;

							const relativeError = Math.abs(magWithDelay - magNoDelay) / Math.max(magNoDelay, 1e-15);
							return relativeError < 0.001;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 13: Mute Produces Zero Output', () => {
			/**
			 * **Validates: Requirements 4.5**
			 * For any Filter configuration with muted=true and any frequency,
			 * verify H(f) = {re: 0, im: 0}.
			 */
			it('should produce zero output when muted', () => {
				fc.assert(
					fc.property(
						validFilterParamsGen(),
						fc.double({ min: 1, max: 20000, noNaN: true }),
						(params, frequency) => {
							const filter = new Filter(0, 0);
							filter.parameters = { ...params, muted: true };
							filter._parametersDirty = true;
							const h = filter.evaluateTransferFunction(frequency);
							return h.re === 0 && h.im === 0;
						},
					),
					{ numRuns: 100 },
				);
			});
		});
	});
});
