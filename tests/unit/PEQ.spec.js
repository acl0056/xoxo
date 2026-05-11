import { PEQ } from '@/models/PEQ';
import BiquadCalculator from '@/simulation/BiquadCalculator';
import fc from 'fast-check';

function magnitude(h) {
	return Math.sqrt(h.re * h.re + h.im * h.im);
}

function magnitudeDb(h) {
	return 20 * Math.log10(magnitude(h));
}

describe('PEQ', () => {
	describe('constructor', () => {
		it('should create a PEQ with default parameters matching schema', () => {
			const peq = new PEQ(10, 20);

			expect(peq.type).toBe('peq');
			expect(peq.x).toBe(10);
			expect(peq.y).toBe(20);
			expect(peq.rotation).toBe(0);
			expect(peq.parameters.gain).toBe(0);
			expect(peq.parameters.delay).toBe(0);
			expect(peq.parameters.dspRate).toBe(48000);
			expect(peq.parameters.muted).toBe(false);
			expect(peq.parameters.sections).toHaveLength(1);
		});

		it('should have correct default section parameters', () => {
			const peq = new PEQ(0, 0);
			const section = peq.parameters.sections[0];

			expect(section.filterType).toBe('peaking');
			expect(section.frequency).toBe(1000);
			expect(section.q).toBe(0.707);
			expect(section.gain).toBe(0);
			expect(section.bypass).toBe(false);
		});

		it('should define four terminals at correct positions', () => {
			const peq = new PEQ(0, 0);

			expect(peq.terminals).toHaveLength(4);
			expect(peq.terminals[0]).toEqual({ x: -3, y: -2 }); // +in (top-left)
			expect(peq.terminals[1]).toEqual({ x: -3, y: 2 });  // -in (bottom-left)
			expect(peq.terminals[2]).toEqual({ x: 4, y: -2 });  // +out (top-right)
			expect(peq.terminals[3]).toEqual({ x: 4, y: 2 });   // -out (bottom-right)
		});
	});

	describe('terminal positions and rotation', () => {
		it('should return correct terminal positions at rotation 0', () => {
			const peq = new PEQ(5, 5);

			expect(peq.getTerminalPosition(0)).toEqual({ x: 2, y: 3 });   // 5 + (-3), 5 + (-2)
			expect(peq.getTerminalPosition(1)).toEqual({ x: 2, y: 7 });   // 5 + (-3), 5 + 2
			expect(peq.getTerminalPosition(2)).toEqual({ x: 9, y: 3 });   // 5 + 4, 5 + (-2)
			expect(peq.getTerminalPosition(3)).toEqual({ x: 9, y: 7 });   // 5 + 4, 5 + 2
		});

		it('should return correct terminal positions at rotation 90', () => {
			const peq = new PEQ(5, 5);
			peq.rotation = 90;

			const pos0 = peq.getTerminalPosition(0);
			// At 90°: rotatedX = x*cos(90) - y*sin(90) = -3*0 - (-2)*1 = 2
			//          rotatedY = x*sin(90) + y*cos(90) = -3*1 + (-2)*0 = -3
			expect(pos0.x).toBeCloseTo(7);
			expect(pos0.y).toBeCloseTo(2);
		});

		it('should return null for invalid terminal index', () => {
			const peq = new PEQ(0, 0);

			expect(peq.getTerminalPosition(-1)).toBeNull();
			expect(peq.getTerminalPosition(4)).toBeNull();
		});
	});

	describe('validate', () => {
		it('should return valid: true for default parameters', () => {
			const peq = new PEQ(0, 0);
			const result = peq.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should return valid: true for valid custom parameters', () => {
			const peq = new PEQ(0, 0);
			peq.parameters = {
				gain: -12,
				delay: 0.005,
				dspRate: 96000,
				muted: true,
				sections: [
					{
						filterType: 'highShelf', frequency: 5000, q: 0.5, gain: 3, bypass: false,
					},
					{
						filterType: 'lowPass2', frequency: 200, q: 1.4, gain: 0, bypass: true,
					},
				],
			};
			const result = peq.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject negative delay', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.delay = -0.1;
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Delay'))).toBe(true);
		});

		it('should reject zero dspRate', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.dspRate = 0;
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('DSP rate'))).toBe(true);
		});

		it('should reject negative dspRate', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.dspRate = -48000;
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('DSP rate'))).toBe(true);
		});

		it('should reject empty sections array', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('between 1 and 10'))).toBe(true);
		});

		it('should reject more than 10 sections', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = Array.from({ length: 11 }, () => ({
				filterType: 'peaking', frequency: 1000, q: 1, gain: 0, bypass: false,
			}));
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('between 1 and 10'))).toBe(true);
		});

		it('should reject invalid filterType', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'bandPass', frequency: 1000, q: 1, gain: 0, bypass: false,
			}];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('filterType'))).toBe(true);
		});

		it('should reject zero frequency in section', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 0, q: 1, gain: 0, bypass: false,
			}];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('frequency'))).toBe(true);
		});

		it('should reject negative frequency in section', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: -100, q: 1, gain: 0, bypass: false,
			}];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('frequency'))).toBe(true);
		});

		it('should reject zero Q in section', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 0, gain: 0, bypass: false,
			}];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Q'))).toBe(true);
		});

		it('should reject negative Q in section', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: -1, gain: 0, bypass: false,
			}];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Q'))).toBe(true);
		});

		it('should reject non-boolean bypass', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 1, gain: 0, bypass: 'yes',
			}];
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('bypass'))).toBe(true);
		});

		it('should reject non-finite gain (NaN)', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.gain = NaN;
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Gain'))).toBe(true);
		});

		it('should reject non-finite gain (Infinity)', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.gain = Infinity;
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Gain'))).toBe(true);
		});

		it('should reject non-boolean muted', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.muted = 1;
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Muted'))).toBe(true);
		});

		it('should reject non-array sections', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = 'not an array';
			const result = peq.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Sections must be an array'))).toBe(true);
		});
	});

	describe('evaluateTransferFunction', () => {
		it('should return zero when muted', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.muted = true;
			const h = peq.evaluateTransferFunction(1000);

			expect(h.re).toBe(0);
			expect(h.im).toBe(0);
		});

		it('should exclude bypassed sections from the product', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [
				{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: true,
				},
				{
					filterType: 'peaking', frequency: 2000, q: 1, gain: 3, bypass: false,
				},
			];
			// Only the second section should contribute
			const h = peq.evaluateTransferFunction(2000);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 3)).toBeLessThan(0.1);
		});

		it('should return unity when all sections are bypassed and gain is 0', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [
				{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: true,
				},
			];
			const h = peq.evaluateTransferFunction(1000);
			const mag = magnitude(h);

			expect(Math.abs(mag - 1.0)).toBeLessThan(1e-10);
		});

		it('should apply global gain correctly', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.gain = 6;
			// Default section has 0 dB gain peaking, so only global gain contributes
			const h = peq.evaluateTransferFunction(500);
			const db = magnitudeDb(h);

			expect(Math.abs(db - 6)).toBeLessThan(0.1);
		});

		it('should preserve magnitude when delay is applied', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: false,
			}];

			const hNoDelay = peq.evaluateTransferFunction(1000);

			peq.parameters.delay = 0.001;
			const hWithDelay = peq.evaluateTransferFunction(1000);

			const magNoDelay = magnitude(hNoDelay);
			const magWithDelay = magnitude(hWithDelay);

			expect(Math.abs(magNoDelay - magWithDelay)).toBeLessThan(1e-10);
		});
	});

	describe('toJSON / fromJSON', () => {
		it('should serialize and deserialize with default parameters', () => {
			const peq = new PEQ(10, 20);
			peq.label = 'A0';
			const json = peq.toJSON();
			const restored = PEQ.fromJSON(json);

			expect(restored.type).toBe('peq');
			expect(restored.x).toBe(10);
			expect(restored.y).toBe(20);
			expect(restored.label).toBe('A0');
			expect(restored.parameters.gain).toBe(0);
			expect(restored.parameters.delay).toBe(0);
			expect(restored.parameters.dspRate).toBe(48000);
			expect(restored.parameters.muted).toBe(false);
			expect(restored.parameters.sections).toHaveLength(1);
			expect(restored.parameters.sections[0].filterType).toBe('peaking');
		});

		it('should serialize and deserialize with custom parameters', () => {
			const peq = new PEQ(5, 15);
			peq.label = 'A2';
			peq.rotation = 90;
			peq.parameters = {
				gain: -6,
				delay: 0.002,
				dspRate: 96000,
				muted: true,
				sections: [
					{
						filterType: 'highShelf', frequency: 5000, q: 0.5, gain: 3, bypass: false,
					},
					{
						filterType: 'allPass', frequency: 800, q: 2, gain: 0, bypass: true,
					},
				],
			};

			const json = peq.toJSON();
			const restored = PEQ.fromJSON(json);

			expect(restored.rotation).toBe(90);
			expect(restored.parameters.gain).toBe(-6);
			expect(restored.parameters.delay).toBe(0.002);
			expect(restored.parameters.dspRate).toBe(96000);
			expect(restored.parameters.muted).toBe(true);
			expect(restored.parameters.sections).toHaveLength(2);
			expect(restored.parameters.sections[0].filterType).toBe('highShelf');
			expect(restored.parameters.sections[1].bypass).toBe(true);
		});

		it('should preserve section gain field through round-trip', () => {
			const peq = new PEQ(0, 0);
			peq.parameters.sections = [{
				filterType: 'peaking', frequency: 2000, q: 1.5, gain: -4.5, bypass: false,
			}];

			const json = peq.toJSON();
			const restored = PEQ.fromJSON(json);

			expect(restored.parameters.sections[0].gain).toBe(-4.5);
		});
	});
});

describe('PEQ - Property-Based Tests', () => {
	// Generators
	const filterTypeArb = fc.constantFrom(
		'peaking', 'highShelf', 'lowShelf', 'lowPass1', 'highPass1', 'lowPass2', 'highPass2', 'allPass',
	);

	const sectionArb = fc.record({
		filterType: filterTypeArb,
		frequency: fc.double({ min: 20, max: 20000, noNaN: true }),
		q: fc.double({ min: 0.1, max: 20, noNaN: true }),
		gain: fc.double({ min: -20, max: 20, noNaN: true }),
		bypass: fc.boolean(),
	});

	const peqParametersArb = fc.record({
		gain: fc.double({ min: -30, max: 30, noNaN: true }),
		delay: fc.double({ min: 0, max: 1, noNaN: true }),
		dspRate: fc.constantFrom(48000, 96000, 192000),
		muted: fc.boolean(),
		sections: fc.array(sectionArb, { minLength: 1, maxLength: 10 }),
	});

	describe('Property 1: PEQ Serialization Round-Trip', () => {
		// **Validates: Requirements 2.11, 10.3**
		it('for any valid PEQ, toJSON() then fromJSON() produces equivalent parameters', () => {
			fc.assert(
				fc.property(
					peqParametersArb,
					fc.integer({ min: 0, max: 100 }),
					fc.integer({ min: 0, max: 100 }),
					(params, x, y) => {
						const peq = new PEQ(x, y);
						peq.parameters = params;

						const json = peq.toJSON();
						const restored = PEQ.fromJSON(json);

						// Verify all top-level parameters
						expect(restored.parameters.gain).toBe(params.gain);
						expect(restored.parameters.delay).toBe(params.delay);
						expect(restored.parameters.dspRate).toBe(params.dspRate);
						expect(restored.parameters.muted).toBe(params.muted);
						expect(restored.parameters.sections).toHaveLength(params.sections.length);

						// Verify each section
						for (let i = 0; i < params.sections.length; i++) {
							const original = params.sections[i];
							const restoredSection = restored.parameters.sections[i];

							expect(restoredSection.filterType).toBe(original.filterType);
							expect(restoredSection.frequency).toBe(original.frequency);
							expect(restoredSection.q).toBe(original.q);
							expect(restoredSection.gain).toBe(original.gain);
							expect(restoredSection.bypass).toBe(original.bypass);
						}

						// Verify position
						expect(restored.x).toBe(x);
						expect(restored.y).toBe(y);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 2: PEQ Validation Correctness', () => {
		// **Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.8**
		it('valid parameters produce valid: true', () => {
			fc.assert(
				fc.property(
					peqParametersArb,
					(params) => {
						const peq = new PEQ(0, 0);
						peq.parameters = params;
						const result = peq.validate();

						expect(result.valid).toBe(true);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('negative delay produces valid: false', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -1000, max: -0.001, noNaN: true }),
					(delay) => {
						const peq = new PEQ(0, 0);
						peq.parameters.delay = delay;
						const result = peq.validate();

						expect(result.valid).toBe(false);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('zero or negative dspRate produces valid: false', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -10000, max: 0, noNaN: true }),
					(dspRate) => {
						const peq = new PEQ(0, 0);
						peq.parameters.dspRate = dspRate;
						const result = peq.validate();

						expect(result.valid).toBe(false);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('invalid filterType produces valid: false', () => {
			fc.assert(
				fc.property(
					fc.constantFrom('bandPass', 'notch', 'unknown', 'invalid', ''),
					(filterType) => {
						const peq = new PEQ(0, 0);
						peq.parameters.sections = [{
							filterType, frequency: 1000, q: 1, gain: 0, bypass: false,
						}];
						const result = peq.validate();

						expect(result.valid).toBe(false);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('non-positive frequency produces valid: false', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -10000, max: 0, noNaN: true }),
					(frequency) => {
						const peq = new PEQ(0, 0);
						peq.parameters.sections = [{
							filterType: 'peaking', frequency, q: 1, gain: 0, bypass: false,
						}];
						const result = peq.validate();

						expect(result.valid).toBe(false);
					},
				),
				{ numRuns: 100 },
			);
		});

		it('non-positive Q produces valid: false', () => {
			fc.assert(
				fc.property(
					fc.double({ min: -100, max: 0, noNaN: true }),
					(q) => {
						const peq = new PEQ(0, 0);
						peq.parameters.sections = [{
							filterType: 'peaking', frequency: 1000, q, gain: 0, bypass: false,
						}];
						const result = peq.validate();

						expect(result.valid).toBe(false);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 8: Combined Transfer Function Equals Product of Non-Bypassed Sections', () => {
		// **Validates: Requirements 4.1, 4.2**
		it('combined TF (excluding gain/delay) equals product of individual non-bypassed section TFs', () => {
			fc.assert(
				fc.property(
					fc.array(sectionArb, { minLength: 1, maxLength: 5 }),
					fc.constantFrom(48000, 96000, 192000),
					fc.double({ min: 20, max: 20000, noNaN: true }),
					(sections, dspRate, frequency) => {
						// Ensure frequency is below Nyquist
						if (frequency >= dspRate / 2) return;

						// Compute combined TF with gain=0, delay=0, not muted
						const params = {
							gain: 0, delay: 0, dspRate, muted: false, sections,
						};
						const combined = BiquadCalculator.evaluatePEQ(params, frequency);

						// Compute product of individual non-bypassed sections manually
						let productRe = 1;
						let productIm = 0;

						for (const section of sections) {
							if (section.bypass) continue;

							const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
							const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);

							const newRe = productRe * h.re - productIm * h.im;
							const newIm = productRe * h.im + productIm * h.re;
							productRe = newRe;
							productIm = newIm;
						}

						// Compare combined with manual product
						expect(combined.re).toBeCloseTo(productRe, 10);
						expect(combined.im).toBeCloseTo(productIm, 10);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 9: Global Gain Scales Magnitude', () => {
		// **Validates: Requirements 4.4**
		it('changing gain from 0 to G scales magnitude by 10^(G/20)', () => {
			fc.assert(
				fc.property(
					fc.array(sectionArb, { minLength: 1, maxLength: 5 }),
					fc.constantFrom(48000, 96000, 192000),
					fc.double({ min: 20, max: 20000, noNaN: true }),
					fc.double({ min: -30, max: 30, noNaN: true }),
					(sections, dspRate, frequency, gain) => {
						// Ensure frequency is below Nyquist
						if (frequency >= dspRate / 2) return;

						// Compute TF with gain = 0
						const paramsNoGain = {
							gain: 0, delay: 0, dspRate, muted: false, sections,
						};
						const hNoGain = BiquadCalculator.evaluatePEQ(paramsNoGain, frequency);
						const magNoGain = magnitude(hNoGain);

						// Compute TF with gain = G
						const paramsWithGain = {
							gain, delay: 0, dspRate, muted: false, sections,
						};
						const hWithGain = BiquadCalculator.evaluatePEQ(paramsWithGain, frequency);
						const magWithGain = magnitude(hWithGain);

						// Expected scaling factor
						const expectedScale = 10 ** (gain / 20);
						const expectedMagnitude = magNoGain * expectedScale;

						if (expectedMagnitude === 0) return;

						// Compare with relative tolerance
						const relativeDifference = Math.abs(magWithGain - expectedMagnitude) / expectedMagnitude;
						expect(relativeDifference).toBeLessThan(1e-10);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 10: Delay Preserves Magnitude', () => {
		// **Validates: Requirements 4.5**
		it('adding delay does not change |H(f)|', () => {
			fc.assert(
				fc.property(
					fc.array(sectionArb, { minLength: 1, maxLength: 5 }),
					fc.constantFrom(48000, 96000, 192000),
					fc.double({ min: 20, max: 20000, noNaN: true }),
					fc.double({ min: 0.0001, max: 0.1, noNaN: true }),
					fc.double({ min: -20, max: 20, noNaN: true }),
					(sections, dspRate, frequency, delay, gain) => {
						// Ensure frequency is below Nyquist
						if (frequency >= dspRate / 2) return;

						// Compute TF without delay
						const paramsNoDelay = {
							gain, delay: 0, dspRate, muted: false, sections,
						};
						const hNoDelay = BiquadCalculator.evaluatePEQ(paramsNoDelay, frequency);
						const magNoDelay = magnitude(hNoDelay);

						// Compute TF with delay
						const paramsWithDelay = {
							gain, delay, dspRate, muted: false, sections,
						};
						const hWithDelay = BiquadCalculator.evaluatePEQ(paramsWithDelay, frequency);
						const magWithDelay = magnitude(hWithDelay);

						expect(Math.abs(magNoDelay - magWithDelay)).toBeLessThan(1e-10);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Property 11: Mute Produces Zero Output', () => {
		// **Validates: Requirements 4.6**
		it('muted PEQ returns {re: 0, im: 0} at any frequency', () => {
			fc.assert(
				fc.property(
					peqParametersArb,
					fc.double({ min: 1, max: 20000, noNaN: true }),
					(params, frequency) => {
						const mutedParams = { ...params, muted: true };
						const h = BiquadCalculator.evaluatePEQ(mutedParams, frequency);

						expect(h.re).toBe(0);
						expect(h.im).toBe(0);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
