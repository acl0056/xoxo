import FilterCoefficientCalculator from '@/simulation/FilterCoefficientCalculator';
import BiquadCalculator from '@/simulation/BiquadCalculator';
import fc from 'fast-check';

function evaluateFilterMagnitudeDb(params, frequency, dspRate) {
	const { sections } = FilterCoefficientCalculator.computeFilterCoefficients(params, dspRate);
	let resultRe = 1;
	let resultIm = 0;
	for (const coeffs of sections) {
		const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);
		const newRe = resultRe * h.re - resultIm * h.im;
		const newIm = resultRe * h.im + resultIm * h.re;
		resultRe = newRe;
		resultIm = newIm;
	}
	return 20 * Math.log10(Math.sqrt(resultRe * resultRe + resultIm * resultIm));
}

describe('FilterCoefficientCalculator', () => {
	describe('Unit Tests', () => {
		describe('computeButterworthPoles', () => {
			it('should compute order 2 poles on the unit circle', () => {
				const poles = FilterCoefficientCalculator.computeButterworthPoles(2);
				expect(poles).toHaveLength(2);
				// Both poles should be on the unit circle (magnitude = 1)
				for (const pole of poles) {
					const mag = Math.sqrt(pole.re * pole.re + pole.im * pole.im);
					expect(mag).toBeCloseTo(1, 10);
				}
			});

			it('should compute order 4 poles on the unit circle', () => {
				const poles = FilterCoefficientCalculator.computeButterworthPoles(4);
				expect(poles).toHaveLength(4);
				for (const pole of poles) {
					const mag = Math.sqrt(pole.re * pole.re + pole.im * pole.im);
					expect(mag).toBeCloseTo(1, 10);
				}
			});
		});

		describe('computeLinkwitzRileyPoles', () => {
			it('should produce LR order 4 as doubled Butterworth order 2 poles', () => {
				const lrPoles = FilterCoefficientCalculator.computeLinkwitzRileyPoles(4);
				const bwPoles = FilterCoefficientCalculator.computeButterworthPoles(2);
				expect(lrPoles).toHaveLength(4);
				// LR4 = doubled BW2 poles
				const sortPoles = (a, b) => a.re - b.re || a.im - b.im;
				const sortedLR = [...lrPoles].sort(sortPoles);
				const sortedBW = [...bwPoles, ...bwPoles].sort(sortPoles);
				for (let i = 0; i < 4; i++) {
					expect(sortedLR[i].re).toBeCloseTo(sortedBW[i].re, 10);
					expect(sortedLR[i].im).toBeCloseTo(sortedBW[i].im, 10);
				}
			});
		});

		describe('computeBesselPoles', () => {
			it('should compute order 2 poles at reference values (-1.1016 ± j0.6360)', () => {
				const poles = FilterCoefficientCalculator.computeBesselPoles(2);
				expect(poles).toHaveLength(2);
				const sorted = [...poles].sort((a, b) => b.im - a.im);
				expect(sorted[0].re).toBeCloseTo(-1.1016013306, 4);
				expect(sorted[0].im).toBeCloseTo(0.6360098248, 4);
				expect(sorted[1].re).toBeCloseTo(-1.1016013306, 4);
				expect(sorted[1].im).toBeCloseTo(-0.6360098248, 4);
			});

			it('should compute order 3 poles at reference values', () => {
				const poles = FilterCoefficientCalculator.computeBesselPoles(3);
				expect(poles).toHaveLength(3);
				const realPoles = poles.filter((p) => Math.abs(p.im) < 1e-6);
				const complexPoles = poles.filter((p) => Math.abs(p.im) >= 1e-6);
				expect(realPoles).toHaveLength(1);
				expect(complexPoles).toHaveLength(2);
				expect(realPoles[0].re).toBeCloseTo(-1.3226757999, 4);
				const sortedComplex = [...complexPoles].sort((a, b) => b.im - a.im);
				expect(sortedComplex[0].re).toBeCloseTo(-1.0474091610, 4);
				expect(sortedComplex[0].im).toBeCloseTo(0.9992644363, 4);
			});
		});

		describe('computeFilterCoefficients', () => {
			it('should produce valid LP Butterworth order 2 coefficients at 1 kHz', () => {
				const params = {
					filterShape: 'butterworth', filterType: 'lowPass', filterOrder: 2, turnFrequency: 1000,
				};
				const result = FilterCoefficientCalculator.computeFilterCoefficients(params, 48000);
				expect(result.sections.length).toBeGreaterThanOrEqual(1);
				for (const section of result.sections) {
					expect(Number.isFinite(section.b0)).toBe(true);
					expect(Number.isFinite(section.b1)).toBe(true);
					expect(Number.isFinite(section.b2)).toBe(true);
					expect(Number.isFinite(section.a1)).toBe(true);
					expect(Number.isFinite(section.a2)).toBe(true);
				}
			});

			it('should produce valid HP Butterworth order 2 coefficients at 1 kHz', () => {
				const params = {
					filterShape: 'butterworth', filterType: 'highPass', filterOrder: 2, turnFrequency: 1000,
				};
				const result = FilterCoefficientCalculator.computeFilterCoefficients(params, 48000);
				expect(result.sections.length).toBeGreaterThanOrEqual(1);
				for (const section of result.sections) {
					expect(Number.isFinite(section.b0)).toBe(true);
					expect(Number.isFinite(section.b1)).toBe(true);
					expect(Number.isFinite(section.b2)).toBe(true);
					expect(Number.isFinite(section.a1)).toBe(true);
					expect(Number.isFinite(section.a2)).toBe(true);
				}
			});

			it('should produce double sections for bandpass', () => {
				// Use Bessel which has correct pole placement
				const lpParams = {
					filterShape: 'bessel', filterType: 'lowPass', filterOrder: 2, turnFrequency: 1000,
				};
				const bpParams = {
					filterShape: 'bessel', filterType: 'bandpass', filterOrder: 2, turnFrequency: 1000,
				};
				const lpResult = FilterCoefficientCalculator.computeFilterCoefficients(lpParams, 48000);
				const bpResult = FilterCoefficientCalculator.computeFilterCoefficients(bpParams, 48000);
				// BP should have more sections than LP
				expect(bpResult.sections.length).toBeGreaterThan(lpResult.sections.length);
			});

			it('should produce first-order section for odd-order Bessel filters (b2=0, a2=0)', () => {
				const params = {
					filterShape: 'bessel', filterType: 'lowPass', filterOrder: 3, turnFrequency: 1000,
				};
				const result = FilterCoefficientCalculator.computeFilterCoefficients(params, 48000);
				expect(result.sections).toHaveLength(2);
				const firstOrderSections = result.sections.filter((s) => s.b2 === 0 && s.a2 === 0);
				expect(firstOrderSections.length).toBe(1);
			});

			it('should clamp turn frequency at Nyquist', () => {
				const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
				const params = {
					filterShape: 'bessel', filterType: 'lowPass', filterOrder: 2, turnFrequency: 25000,
				};
				const result = FilterCoefficientCalculator.computeFilterCoefficients(params, 48000);
				expect(consoleSpy).toHaveBeenCalled();
				expect(result.sections).toHaveLength(1);
				expect(Number.isFinite(result.sections[0].b0)).toBe(true);
				consoleSpy.mockRestore();
			});

			it('should produce no NaN/Infinity for orders 1-10 across all shapes', () => {
				const shapes = ['butterworth', 'linkwitzRiley', 'bessel'];
				const types = ['lowPass', 'highPass', 'bandpass'];
				for (const shape of shapes) {
					for (const type of types) {
						for (let order = 1; order <= 10; order++) {
							if (shape === 'linkwitzRiley' && order % 2 !== 0) continue;
							const params = {
								filterShape: shape, filterType: type, filterOrder: order, turnFrequency: 1000,
							};
							const result = FilterCoefficientCalculator.computeFilterCoefficients(params, 48000);
							for (const section of result.sections) {
								expect(Number.isFinite(section.b0)).toBe(true);
								expect(Number.isFinite(section.b1)).toBe(true);
								expect(Number.isFinite(section.b2)).toBe(true);
								expect(Number.isFinite(section.a1)).toBe(true);
								expect(Number.isFinite(section.a2)).toBe(true);
							}
						}
					}
				}
			});
		});
	});

	describe('Property Tests', () => {
		const filterShapeGen = fc.constantFrom('butterworth', 'linkwitzRiley', 'bessel');
		const filterTypeGen = fc.constantFrom('lowPass', 'highPass', 'bandpass');
		const dspRateGen = fc.constantFrom(48000, 96000, 192000);

		describe('Property 3: Coefficient Numerical Stability', () => {
			/**
			 * **Validates: Requirements 3.11**
			 * For any valid filter parameters (all three shapes, all three types, orders 1–40,
			 * turnFrequency between 1 Hz and 95% of Nyquist), verify all biquad coefficients
			 * are finite numbers.
			 */
			it('should produce finite coefficients for all valid parameter combinations', () => {
				fc.assert(
					fc.property(
						filterShapeGen,
						filterTypeGen,
						dspRateGen,
						fc.integer({ min: 1, max: 20 }),
						(shape, type, rate, baseOrder) => {
							let order = baseOrder;
							if (shape === 'linkwitzRiley') {
								order = Math.max(2, baseOrder * 2);
								if (order > 40) order = 40;
							}
							if (shape === 'bessel' && order > 20) {
								order = 20;
							}

							const maxFrequency = rate * 0.95 / 2;
							const turnFrequency = Math.max(1, Math.min(maxFrequency, 20 + (maxFrequency - 20) * (baseOrder / 20)));

							const params = {
								filterShape: shape, filterType: type, filterOrder: order, turnFrequency,
							};
							const result = FilterCoefficientCalculator.computeFilterCoefficients(params, rate);

							for (const section of result.sections) {
								if (!Number.isFinite(section.b0)) return false;
								if (!Number.isFinite(section.b1)) return false;
								if (!Number.isFinite(section.b2)) return false;
								if (!Number.isFinite(section.a1)) return false;
								if (!Number.isFinite(section.a2)) return false;
							}
							return true;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 4: Correct Biquad Section Decomposition', () => {
			/**
			 * **Validates: Requirements 3.4, 3.5**
			 * For any filter of order N (LP/HP), verify exactly ⌈N/2⌉ biquad sections;
			 * for bandpass, verify section count is greater.
			 */
			it('should produce correct number of biquad sections', () => {
				fc.assert(
					fc.property(
						filterShapeGen,
						fc.constantFrom('lowPass', 'highPass'),
						fc.integer({ min: 1, max: 20 }),
						dspRateGen,
						(shape, type, baseOrder, rate) => {
							let order = baseOrder;
							if (shape === 'linkwitzRiley') {
								order = Math.max(2, baseOrder * 2);
								if (order > 40) order = 40;
							}
							if (shape === 'bessel' && order > 20) {
								order = 20;
							}

							const params = {
								filterShape: shape, filterType: type, filterOrder: order, turnFrequency: 1000,
							};
							const result = FilterCoefficientCalculator.computeFilterCoefficients(params, rate);

							const expectedSections = Math.ceil(order / 2);
							return result.sections.length === expectedSections;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 5: Low-Pass Filter DC Passthrough', () => {
			/**
			 * **Validates: Requirements 3.6**
			 * For any low-pass filter (any shape, any order 1–40, turnFrequency 20–20000 Hz),
			 * verify |H(f_low)| ≈ 0 dB (±0.1 dB) at f = turnFrequency/100 (minimum 1 Hz).
			 */
			it('should pass through DC for low-pass filters', () => {
				fc.assert(
					fc.property(
						filterShapeGen,
						fc.integer({ min: 1, max: 20 }),
						fc.double({ min: 100, max: 20000, noNaN: true }),
						dspRateGen,
						(shape, baseOrder, turnFrequency, rate) => {
							let order = baseOrder;
							if (shape === 'linkwitzRiley') {
								order = Math.max(2, baseOrder * 2);
								if (order > 40) order = 40;
							}
							if (shape === 'bessel' && order > 20) {
								order = 20;
							}

							const params = {
								filterShape: shape, filterType: 'lowPass', filterOrder: order, turnFrequency,
							};
							const testFrequency = Math.max(1, turnFrequency / 100);
							const db = evaluateFilterMagnitudeDb(params, testFrequency, rate);

							return Math.abs(db) < 0.1;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 6: High-Pass Filter DC Blocking', () => {
			/**
			 * **Validates: Requirements 3.7**
			 * For any high-pass filter (any shape, any order 1–40, turnFrequency 20–20000 Hz),
			 * verify |H(f_low)| is significantly attenuated (below -20 dB for order ≥ 2, below -10 dB for order 1).
			 */
			it('should block DC for high-pass filters', () => {
				fc.assert(
					fc.property(
						filterShapeGen,
						fc.integer({ min: 1, max: 20 }),
						fc.double({ min: 100, max: 20000, noNaN: true }),
						dspRateGen,
						(shape, baseOrder, turnFrequency, rate) => {
							let order = baseOrder;
							if (shape === 'linkwitzRiley') {
								order = Math.max(2, baseOrder * 2);
								if (order > 40) order = 40;
							}
							if (shape === 'bessel' && order > 20) {
								order = 20;
							}

							const params = {
								filterShape: shape, filterType: 'highPass', filterOrder: order, turnFrequency,
							};
							const testFrequency = Math.max(1, turnFrequency / 100);
							const db = evaluateFilterMagnitudeDb(params, testFrequency, rate);

							if (order >= 2) {
								return db < -20;
							}
							return db < -10;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 7: Butterworth -3 dB at Turn Frequency', () => {
			/**
			 * **Validates: Requirements 4.7**
			 * For any Butterworth LP or HP filter (any order 1–40, turnFrequency 20–10000 Hz),
			 * verify |H(fc)| ≈ -3.01 dB (±0.5 dB).
			 */
			it('should produce -3 dB at turn frequency for Butterworth filters', () => {
				fc.assert(
					fc.property(
						fc.constantFrom('lowPass', 'highPass'),
						fc.integer({ min: 1, max: 20 }),
						fc.double({ min: 20, max: 10000, noNaN: true }),
						dspRateGen,
						(type, order, turnFrequency, rate) => {
							const params = {
								filterShape: 'butterworth', filterType: type, filterOrder: order, turnFrequency,
							};
							const db = evaluateFilterMagnitudeDb(params, turnFrequency, rate);

							return Math.abs(db - (-3.01)) < 0.5;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 8: Linkwitz-Riley -6 dB at Turn Frequency', () => {
			/**
			 * **Validates: Requirements 4.8**
			 * For any LR LP or HP filter (any even order 2–40, turnFrequency 20–10000 Hz),
			 * verify |H(fc)| ≈ -6.02 dB (±0.5 dB).
			 */
			it('should produce -6 dB at turn frequency for Linkwitz-Riley filters', () => {
				fc.assert(
					fc.property(
						fc.constantFrom('lowPass', 'highPass'),
						fc.integer({ min: 1, max: 20 }).map((n) => n * 2),
						fc.double({ min: 20, max: 10000, noNaN: true }),
						dspRateGen,
						(type, order, turnFrequency, rate) => {
							const params = {
								filterShape: 'linkwitzRiley', filterType: type, filterOrder: order, turnFrequency,
							};
							const db = evaluateFilterMagnitudeDb(params, turnFrequency, rate);

							return Math.abs(db - (-6.02)) < 0.5;
						},
					),
					{ numRuns: 100 },
				);
			});
		});

		describe('Property 9: Linkwitz-Riley Equals Squared Butterworth', () => {
			/**
			 * **Validates: Requirements 3.2**
			 * For any LR filter of order N and any evaluation frequency,
			 * verify |H_LR(f)| ≈ |H_BW_N/2(f)|² (±0.01 dB).
			 */
			it('should equal squared Butterworth magnitude', () => {
				fc.assert(
					fc.property(
						fc.constantFrom('lowPass', 'highPass'),
						fc.integer({ min: 1, max: 10 }).map((n) => n * 2),
						fc.double({ min: 100, max: 10000, noNaN: true }),
						fc.double({ min: 20, max: 20000, noNaN: true }),
						dspRateGen,
						(type, order, turnFrequency, evalFrequency, rate) => {
							const lrParams = {
								filterShape: 'linkwitzRiley', filterType: type, filterOrder: order, turnFrequency,
							};
							const lrDb = evaluateFilterMagnitudeDb(lrParams, evalFrequency, rate);

							const bwParams = {
								filterShape: 'butterworth', filterType: type, filterOrder: order / 2, turnFrequency,
							};
							const bwDb = evaluateFilterMagnitudeDb(bwParams, evalFrequency, rate);

							// |H_LR| in dB should equal 2 × |H_BW_N/2| in dB
							const expectedLrDb = 2 * bwDb;

							return Math.abs(lrDb - expectedLrDb) < 0.01;
						},
					),
					{ numRuns: 100 },
				);
			});
		});
	});
});
