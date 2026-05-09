import BiquadCalculator from '@/simulation/BiquadCalculator';
import fc from 'fast-check';

function magnitudeDb(h) {
	return 20 * Math.log10(Math.sqrt(h.re * h.re + h.im * h.im));
}

function magnitude(h) {
	return Math.sqrt(h.re * h.re + h.im * h.im);
}

describe('BiquadCalculator', () => {
	describe('computeCoefficients', () => {
		it('should produce valid coefficients for peaking filter', () => {
			const section = {
				filterType: 'peaking', frequency: 1000, q: 1, gain: 6,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(coeffs).toHaveProperty('b0');
			expect(coeffs).toHaveProperty('b1');
			expect(coeffs).toHaveProperty('b2');
			expect(coeffs).toHaveProperty('a1');
			expect(coeffs).toHaveProperty('a2');
			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.b1)).toBe(true);
			expect(Number.isFinite(coeffs.b2)).toBe(true);
			expect(Number.isFinite(coeffs.a1)).toBe(true);
			expect(Number.isFinite(coeffs.a2)).toBe(true);
		});

		it('should produce valid coefficients for highShelf filter', () => {
			const section = {
				filterType: 'highShelf', frequency: 2000, q: 0.707, gain: 3,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.a1)).toBe(true);
		});

		it('should produce valid coefficients for lowShelf filter', () => {
			const section = {
				filterType: 'lowShelf', frequency: 200, q: 0.707, gain: -4,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.a2)).toBe(true);
		});

		it('should produce valid coefficients for lowPass1 filter', () => {
			const section = {
				filterType: 'lowPass1', frequency: 500, q: 0.707,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(coeffs.b2).toBe(0);
			expect(coeffs.a2).toBe(0);
		});

		it('should produce valid coefficients for highPass1 filter', () => {
			const section = {
				filterType: 'highPass1', frequency: 500, q: 0.707,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(coeffs.b2).toBe(0);
			expect(coeffs.a2).toBe(0);
		});

		it('should produce valid coefficients for lowPass2 filter', () => {
			const section = {
				filterType: 'lowPass2', frequency: 1000, q: 0.707,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.b2)).toBe(true);
		});

		it('should produce valid coefficients for highPass2 filter', () => {
			const section = {
				filterType: 'highPass2', frequency: 1000, q: 0.707,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.b2)).toBe(true);
		});

		it('should produce valid coefficients for allPass filter', () => {
			const section = {
				filterType: 'allPass', frequency: 1000, q: 0.707,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.b2)).toBe(true);
		});

		it('should return unity coefficients for unknown filter type', () => {
			const section = {
				filterType: 'unknown', frequency: 1000, q: 1,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(coeffs.b0).toBe(1);
			expect(coeffs.b1).toBe(0);
			expect(coeffs.b2).toBe(0);
			expect(coeffs.a1).toBe(0);
			expect(coeffs.a2).toBe(0);
		});
	});

	describe('evaluateTransferFunction', () => {
		it('should return gain at center frequency for peaking filter (±0.1 dB)', () => {
			const section = {
				filterType: 'peaking', frequency: 1000, q: 1, gain: 6,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1000, dspRate);
			const db = magnitudeDb(h);

			expect(db).toBeCloseTo(6, 0);
			expect(Math.abs(db - 6)).toBeLessThan(0.1);
		});

		it('should approach specified gain at 10× transition frequency for highShelf', () => {
			const section = {
				filterType: 'highShelf', frequency: 1000, q: 0.707, gain: 6,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 10000, dspRate);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 6)).toBeLessThan(0.5);
		});

		it('should approach specified gain at 0.1× transition frequency for lowShelf', () => {
			const section = {
				filterType: 'lowShelf', frequency: 1000, q: 0.707, gain: 6,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 100, dspRate);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 6)).toBeLessThan(0.5);
		});

		it('should have unity at DC for lowPass1', () => {
			const section = {
				filterType: 'lowPass1', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
			const db = magnitudeDb(h);

			expect(Math.abs(db)).toBeLessThan(0.1);
		});

		it('should attenuate above corner for lowPass1', () => {
			const section = {
				filterType: 'lowPass1', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 10000, dspRate);
			const db = magnitudeDb(h);

			expect(db).toBeLessThan(-6);
		});

		it('should have unity at DC for lowPass2', () => {
			const section = {
				filterType: 'lowPass2', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
			const db = magnitudeDb(h);

			expect(Math.abs(db)).toBeLessThan(0.1);
		});

		it('should attenuate significantly above corner for lowPass2 (< -10 dB at 10× corner)', () => {
			const section = {
				filterType: 'lowPass2', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 10000, dspRate);
			const db = magnitudeDb(h);

			expect(db).toBeLessThan(-10);
		});

		it('should attenuate at DC for highPass1 (very low frequency)', () => {
			const section = {
				filterType: 'highPass1', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
			const db = magnitudeDb(h);

			expect(db).toBeLessThan(-20);
		});

		it('should have unity well above corner for highPass1', () => {
			const section = {
				filterType: 'highPass1', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 10000, dspRate);
			const db = magnitudeDb(h);

			expect(Math.abs(db)).toBeLessThan(0.5);
		});

		it('should attenuate at DC for highPass2 (very low frequency)', () => {
			const section = {
				filterType: 'highPass2', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
			const db = magnitudeDb(h);

			expect(db).toBeLessThan(-40);
		});

		it('should have unity well above corner for highPass2', () => {
			const section = {
				filterType: 'highPass2', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 10000, dspRate);
			const db = magnitudeDb(h);

			expect(Math.abs(db)).toBeLessThan(0.5);
		});

		it('should have unity magnitude at all frequencies for allPass', () => {
			const section = {
				filterType: 'allPass', frequency: 1000, q: 0.707,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);

			const testFrequencies = [10, 100, 500, 1000, 2000, 5000, 10000, 20000];
			for (const freq of testFrequencies) {
				const h = BiquadCalculator.evaluateTransferFunction(coeffs, freq, dspRate);
				const mag = magnitude(h);

				expect(Math.abs(mag - 1.0)).toBeLessThan(1e-10);
			}
		});

		it('should return unity for frequency <= 0', () => {
			const coeffs = {
				b0: 1, b1: -1.5, b2: 0.7, a1: -1.2, a2: 0.5,
			};
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 0, 48000);

			expect(h.re).toBe(1);
			expect(h.im).toBe(0);
		});
	});

	describe('evaluatePEQ', () => {
		it('should return zero when muted', () => {
			const params = {
				gain: 0,
				delay: 0,
				dspRate: 48000,
				muted: true,
				sections: [{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: false,
				}],
			};
			const h = BiquadCalculator.evaluatePEQ(params, 1000);

			expect(h.re).toBe(0);
			expect(h.im).toBe(0);
		});

		it('should exclude bypassed sections from the product', () => {
			const params = {
				gain: 0,
				delay: 0,
				dspRate: 48000,
				muted: false,
				sections: [
					{
						filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: true,
					},
					{
						filterType: 'peaking', frequency: 2000, q: 1, gain: 3, bypass: false,
					},
				],
			};
			// Only the second section should contribute
			const h = BiquadCalculator.evaluatePEQ(params, 2000);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 3)).toBeLessThan(0.1);
		});

		it('should apply global gain', () => {
			const params = {
				gain: 6,
				delay: 0,
				dspRate: 48000,
				muted: false,
				sections: [{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 0, bypass: false,
				}],
			};
			// With 0 dB peaking gain and 6 dB global gain, result should be ~6 dB
			const h = BiquadCalculator.evaluatePEQ(params, 500);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 6)).toBeLessThan(0.1);
		});

		it('should preserve magnitude when delay is applied', () => {
			const paramsNoDelay = {
				gain: 0,
				delay: 0,
				dspRate: 48000,
				muted: false,
				sections: [{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: false,
				}],
			};
			const paramsWithDelay = {
				...paramsNoDelay,
				delay: 0.001,
			};

			const hNoDelay = BiquadCalculator.evaluatePEQ(paramsNoDelay, 1000);
			const hWithDelay = BiquadCalculator.evaluatePEQ(paramsWithDelay, 1000);

			const magNoDelay = magnitude(hNoDelay);
			const magWithDelay = magnitude(hWithDelay);

			expect(Math.abs(magNoDelay - magWithDelay)).toBeLessThan(1e-10);
		});

		it('should combine multiple non-bypassed sections', () => {
			const params = {
				gain: 0,
				delay: 0,
				dspRate: 48000,
				muted: false,
				sections: [
					{
						filterType: 'peaking', frequency: 1000, q: 1, gain: 3, bypass: false,
					},
					{
						filterType: 'peaking', frequency: 1000, q: 1, gain: 3, bypass: false,
					},
				],
			};
			// Two peaking filters at same frequency with 3 dB each should give ~6 dB
			const h = BiquadCalculator.evaluatePEQ(params, 1000);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 6)).toBeLessThan(0.2);
		});
	});

	describe('edge cases', () => {
		it('should clamp frequency at 95% Nyquist and warn', () => {
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

			const section = {
				filterType: 'peaking', frequency: 25000, q: 1, gain: 6,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('exceeds Nyquist'),
			);
			expect(Number.isFinite(coeffs.b0)).toBe(true);

			warnSpy.mockRestore();
		});

		it('should handle very low Q without producing NaN', () => {
			const section = {
				filterType: 'peaking', frequency: 1000, q: 0.001, gain: 6,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.b1)).toBe(true);
			expect(Number.isFinite(coeffs.b2)).toBe(true);
			expect(Number.isFinite(coeffs.a1)).toBe(true);
			expect(Number.isFinite(coeffs.a2)).toBe(true);
		});

		it('should handle very high frequency near Nyquist', () => {
			const section = {
				filterType: 'lowPass2', frequency: 23000, q: 0.707,
			};
			const coeffs = BiquadCalculator.computeCoefficients(section, 48000);

			expect(Number.isFinite(coeffs.b0)).toBe(true);
			expect(Number.isFinite(coeffs.a2)).toBe(true);
		});

		it('should produce unity transfer function for peaking filter with zero gain', () => {
			const section = {
				filterType: 'peaking', frequency: 1000, q: 1, gain: 0,
			};
			const dspRate = 48000;
			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1000, dspRate);
			const mag = magnitude(h);

			expect(Math.abs(mag - 1.0)).toBeLessThan(1e-10);
		});
	});
});

describe('BiquadCalculator - Property-Based Tests', () => {
	// Helper functions for property tests
	function magnitudeDbFromH(h) {
		return 20 * Math.log10(Math.sqrt(h.re * h.re + h.im * h.im));
	}

	function magnitudeFromH(h) {
		return Math.sqrt(h.re * h.re + h.im * h.im);
	}

	// Generators
	const frequencyArb = fc.double({ min: 20, max: 20000, noNaN: true });
	const qArb = fc.double({ min: 0.1, max: 20, noNaN: true });
	const gainArb = fc.double({ min: -20, max: 20, noNaN: true });
	const dspRateArb = fc.constantFrom(48000, 96000, 192000);

	describe('Property 3: Peaking Filter Gain at Center Frequency', () => {
		// **Validates: Requirements 3.1**
		// For any peaking filter with f₀ < Nyquist/2, |H(f₀)| ≈ gain_dB (±0.1 dB)
		it('peaking filter magnitude at center frequency equals specified gain', () => {
			fc.assert(
				fc.property(
					fc.double({ min: 20, max: 12000, noNaN: true }),
					qArb,
					gainArb,
					dspRateArb,
					(frequency, q, gain, dspRate) => {
						// Skip if frequency exceeds Nyquist/2 for this sample rate
						if (frequency >= dspRate / 4) return;

						const section = {
							filterType: 'peaking', frequency, q, gain,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);
						const db = magnitudeDbFromH(h);

						expect(Math.abs(db - gain)).toBeLessThan(0.1);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 4: Shelf Filter Asymptotic Gain', () => {
		// **Validates: Requirements 3.2, 3.3**
		const shelfFrequencyArb = fc.double({ min: 100, max: 5000, noNaN: true });
		// Use Q >= 0.5 for shelf tests — low Q values produce extremely broad
		// transitions where 10× the transition frequency is still within the slope region
		const shelfQArb = fc.double({ min: 0.5, max: 20, noNaN: true });

		it('highShelf filter magnitude at 10× transition frequency approaches specified gain', () => {
			fc.assert(
				fc.property(
					shelfFrequencyArb,
					shelfQArb,
					gainArb,
					dspRateArb,
					(frequency, q, gain, dspRate) => {
						const evaluationFrequency = frequency * 10;
						// Ensure evaluation frequency is below Nyquist
						if (evaluationFrequency >= dspRate / 2) return;

						const section = {
							filterType: 'highShelf', frequency, q, gain,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, evaluationFrequency, dspRate);
						const db = magnitudeDbFromH(h);

						expect(Math.abs(db - gain)).toBeLessThan(0.5);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('lowShelf filter magnitude at 0.1× transition frequency approaches specified gain', () => {
			fc.assert(
				fc.property(
					shelfFrequencyArb,
					shelfQArb,
					gainArb,
					dspRateArb,
					(frequency, q, gain, dspRate) => {
						const evaluationFrequency = frequency * 0.1;
						// Ensure evaluation frequency is above 0
						if (evaluationFrequency <= 0) return;

						const section = {
							filterType: 'lowShelf', frequency, q, gain,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, evaluationFrequency, dspRate);
						const db = magnitudeDbFromH(h);

						expect(Math.abs(db - gain)).toBeLessThan(0.5);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 5: Low-Pass Filter DC Passthrough', () => {
		// **Validates: Requirements 3.4, 3.6**
		// For any LP1/LP2 with f₀ > 0, |H(1 Hz)| ≈ 0 dB
		it('lowPass1 filter has unity gain at 1 Hz (DC passthrough)', () => {
			fc.assert(
				fc.property(
					frequencyArb,
					qArb,
					dspRateArb,
					(frequency, q, dspRate) => {
						const section = {
							filterType: 'lowPass1', frequency, q,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
						const db = magnitudeDbFromH(h);

						expect(Math.abs(db)).toBeLessThan(0.1);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('lowPass2 filter has unity gain at 1 Hz (DC passthrough)', () => {
			fc.assert(
				fc.property(
					// Use corner frequency >= 100 Hz so that 1 Hz is well within the passband
					// even for very low Q values (overdamped filters have wider transition bands)
					fc.double({ min: 100, max: 20000, noNaN: true }),
					qArb,
					dspRateArb,
					(frequency, q, dspRate) => {
						const section = {
							filterType: 'lowPass2', frequency, q,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
						const db = magnitudeDbFromH(h);

						expect(Math.abs(db)).toBeLessThan(0.1);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 6: High-Pass Filter DC Blocking', () => {
		// **Validates: Requirements 3.5, 3.7**
		// For any HP1/HP2 with f₀ > 0, |H(1 Hz)| << 0 (significantly attenuated)
		it('highPass1 filter significantly attenuates at 1 Hz (< -20 dB for corner > 100 Hz)', () => {
			fc.assert(
				fc.property(
					fc.double({ min: 100, max: 20000, noNaN: true }),
					qArb,
					dspRateArb,
					(frequency, q, dspRate) => {
						const section = {
							filterType: 'highPass1', frequency, q,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
						const db = magnitudeDbFromH(h);

						expect(db).toBeLessThan(-20);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('highPass2 filter significantly attenuates at 1 Hz (< -40 dB for corner > 100 Hz)', () => {
			fc.assert(
				fc.property(
					fc.double({ min: 100, max: 20000, noNaN: true }),
					qArb,
					dspRateArb,
					(frequency, q, dspRate) => {
						const section = {
							filterType: 'highPass2', frequency, q,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, 1, dspRate);
						const db = magnitudeDbFromH(h);

						expect(db).toBeLessThan(-40);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 7: All-Pass Unity Magnitude', () => {
		// **Validates: Requirements 3.8**
		// For any allPass with f₀ and Q, |H(f)| = 1.0 at any frequency
		it('allPass filter has unity magnitude at any frequency', () => {
			fc.assert(
				fc.property(
					frequencyArb,
					qArb,
					dspRateArb,
					fc.double({ min: 10, max: 20000, noNaN: true }),
					(centerFrequency, q, dspRate, evaluationFrequency) => {
						// Ensure evaluation frequency is below Nyquist
						if (evaluationFrequency >= dspRate / 2) return;

						const section = {
							filterType: 'allPass', frequency: centerFrequency, q,
						};
						const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
						const h = BiquadCalculator.evaluateTransferFunction(coeffs, evaluationFrequency, dspRate);
						const mag = magnitudeFromH(h);

						expect(Math.abs(mag - 1.0)).toBeLessThan(1e-6);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
