import BiquadCalculator from '@/simulation/BiquadCalculator';
import fc from 'fast-check';

describe('BiquadExport', () => {
	// ─── Unit Tests (Task 4.2) ───────────────────────────────────────────────────

	describe('formatBiquadExport — unit tests', () => {
		it('should export a single section with correct format and known coefficients', () => {
			const params = {
				dspRate: 48000,
				sections: [{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: false,
				}],
			};

			const output = BiquadCalculator.formatBiquadExport(params);
			const lines = output.split('\n').filter((line) => line.length > 0);

			expect(lines[0]).toBe('biquad1,');
			expect(lines[1]).toMatch(/^b0=.+,$/);
			expect(lines[2]).toMatch(/^b1=.+,$/);
			expect(lines[3]).toMatch(/^b2=.+,$/);
			expect(lines[4]).toMatch(/^a1=.+,$/);
			expect(lines[5]).toMatch(/^a2=.+,$/);

			// Verify the coefficients match computeCoefficients output
			const coeffs = BiquadCalculator.computeCoefficients(params.sections[0], 48000);
			expect(lines[1]).toBe(`b0=${coeffs.b0},`);
			expect(lines[2]).toBe(`b1=${coeffs.b1},`);
			expect(lines[3]).toBe(`b2=${coeffs.b2},`);
			expect(lines[4]).toBe(`a1=${coeffs.a1},`);
			expect(lines[5]).toBe(`a2=${coeffs.a2},`);
		});

		it('should export bypassed sections as unity coefficients', () => {
			const params = {
				dspRate: 48000,
				sections: [{
					filterType: 'peaking', frequency: 1000, q: 1, gain: 6, bypass: true,
				}],
			};

			const output = BiquadCalculator.formatBiquadExport(params);
			const lines = output.split('\n').filter((line) => line.length > 0);

			expect(lines[0]).toBe('biquad1,');
			expect(lines[1]).toBe('b0=1,');
			expect(lines[2]).toBe('b1=0,');
			expect(lines[3]).toBe('b2=0,');
			expect(lines[4]).toBe('a1=0,');
			expect(lines[5]).toBe('a2=0,');
		});

		it('should number sections starting from 1', () => {
			const params = {
				dspRate: 48000,
				sections: [
					{
						filterType: 'peaking', frequency: 1000, q: 1, gain: 0, bypass: false,
					},
					{
						filterType: 'lowPass2', frequency: 2000, q: 0.707, bypass: false,
					},
					{
						filterType: 'highShelf', frequency: 5000, q: 0.707, gain: 3, bypass: false,
					},
				],
			};

			const output = BiquadCalculator.formatBiquadExport(params);
			const lines = output.split('\n').filter((line) => line.length > 0);

			// Each section has 6 lines (header + 5 coefficients)
			expect(lines[0]).toBe('biquad1,');
			expect(lines[6]).toBe('biquad2,');
			expect(lines[12]).toBe('biquad3,');
		});

		it('should export multiple sections in order with correct structure', () => {
			const params = {
				dspRate: 48000,
				sections: [
					{
						filterType: 'peaking', frequency: 500, q: 2, gain: -3, bypass: false,
					},
					{
						filterType: 'highPass2', frequency: 100, q: 0.707, bypass: true,
					},
				],
			};

			const output = BiquadCalculator.formatBiquadExport(params);
			const lines = output.split('\n').filter((line) => line.length > 0);

			// First section: computed coefficients
			expect(lines[0]).toBe('biquad1,');
			const coeffs = BiquadCalculator.computeCoefficients(params.sections[0], 48000);
			expect(lines[1]).toBe(`b0=${coeffs.b0},`);

			// Second section: bypassed → unity
			expect(lines[6]).toBe('biquad2,');
			expect(lines[7]).toBe('b0=1,');
			expect(lines[8]).toBe('b1=0,');
			expect(lines[9]).toBe('b2=0,');
			expect(lines[10]).toBe('a1=0,');
			expect(lines[11]).toBe('a2=0,');
		});
	});

	// ─── Property 12: Biquad Export Format and Normalization (Task 4.3) ──────────

	describe('Property 12: Biquad Export Format and Normalization', () => {
		/**
		 * **Validates: Requirements 8.3, 8.4**
		 *
		 * For any set of filter sections with valid parameters, the exported biquad text
		 * shall contain one block per section with header "biquadN," (N starting from 1)
		 * followed by lines "b0=value,", "b1=value,", "b2=value,", "a1=value,", "a2=value,"
		 * where the coefficients are normalized (a0 = 1 implicitly).
		 * The number of blocks shall equal the total number of sections.
		 */
		const filterTypeArbitrary = fc.constantFrom(
			'peaking', 'highShelf', 'lowShelf', 'lowPass1', 'highPass1', 'lowPass2', 'highPass2', 'allPass',
		);

		const sectionArbitrary = fc.record({
			filterType: filterTypeArbitrary,
			frequency: fc.double({ min: 20, max: 20000, noNaN: true }),
			q: fc.double({ min: 0.1, max: 20, noNaN: true }),
			gain: fc.double({ min: -24, max: 24, noNaN: true }),
			bypass: fc.boolean(),
		});

		const paramsArbitrary = fc.record({
			dspRate: fc.constantFrom(48000, 96000, 192000),
			sections: fc.array(sectionArbitrary, { minLength: 1, maxLength: 10 }),
		});

		it('Feature: peq-parametric-equalizer, Property 12: Biquad Export Format and Normalization — exported text has correct format with biquadN headers', () => {
			fc.assert(
				fc.property(paramsArbitrary, (params) => {
					const output = BiquadCalculator.formatBiquadExport(params);
					const lines = output.split('\n').filter((line) => line.length > 0);

					const sectionCount = params.sections.length;

					// Total lines should be 6 per section (1 header + 5 coefficients)
					expect(lines.length).toBe(sectionCount * 6);

					for (let i = 0; i < sectionCount; i++) {
						const blockStart = i * 6;
						const sectionNumber = i + 1;

						// Header line: "biquadN,"
						expect(lines[blockStart]).toBe(`biquad${sectionNumber},`);

						// Coefficient lines: "key=value,"
						expect(lines[blockStart + 1]).toMatch(/^b0=.+,$/);
						expect(lines[blockStart + 2]).toMatch(/^b1=.+,$/);
						expect(lines[blockStart + 3]).toMatch(/^b2=.+,$/);
						expect(lines[blockStart + 4]).toMatch(/^a1=.+,$/);
						expect(lines[blockStart + 5]).toMatch(/^a2=.+,$/);

						// Verify coefficients are finite numbers
						const b0 = parseFloat(lines[blockStart + 1].slice(3, -1));
						const b1 = parseFloat(lines[blockStart + 2].slice(3, -1));
						const b2 = parseFloat(lines[blockStart + 3].slice(3, -1));
						const a1 = parseFloat(lines[blockStart + 4].slice(3, -1));
						const a2 = parseFloat(lines[blockStart + 5].slice(3, -1));

						expect(Number.isFinite(b0)).toBe(true);
						expect(Number.isFinite(b1)).toBe(true);
						expect(Number.isFinite(b2)).toBe(true);
						expect(Number.isFinite(a1)).toBe(true);
						expect(Number.isFinite(a2)).toBe(true);
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	// ─── Property 13: Bypassed Sections Export as Unity (Task 4.4) ───────────────

	describe('Property 13: Bypassed Sections Export as Unity', () => {
		/**
		 * **Validates: Requirements 8.6**
		 *
		 * For any PEQ configuration containing bypassed sections, the exported biquad
		 * coefficients for each bypassed section shall be exactly:
		 * b0=1, b1=0, b2=0, a1=0, a2=0 (unity transfer function).
		 */
		const filterTypeArbitrary = fc.constantFrom(
			'peaking', 'highShelf', 'lowShelf', 'lowPass1', 'highPass1', 'lowPass2', 'highPass2', 'allPass',
		);

		const bypassedSectionArbitrary = fc.record({
			filterType: filterTypeArbitrary,
			frequency: fc.double({ min: 20, max: 20000, noNaN: true }),
			q: fc.double({ min: 0.1, max: 20, noNaN: true }),
			gain: fc.double({ min: -24, max: 24, noNaN: true }),
			bypass: fc.constant(true),
		});

		const activeSectionArbitrary = fc.record({
			filterType: filterTypeArbitrary,
			frequency: fc.double({ min: 20, max: 20000, noNaN: true }),
			q: fc.double({ min: 0.1, max: 20, noNaN: true }),
			gain: fc.double({ min: -24, max: 24, noNaN: true }),
			bypass: fc.constant(false),
		});

		const sectionArbitrary = fc.oneof(bypassedSectionArbitrary, activeSectionArbitrary);

		// Ensure at least one bypassed section exists
		const paramsWithBypassedArbitrary = fc.record({
			dspRate: fc.constantFrom(48000, 96000, 192000),
			sections: fc.tuple(
				bypassedSectionArbitrary,
				fc.array(sectionArbitrary, { minLength: 0, maxLength: 9 }),
			).map(([bypassed, rest]) => {
				// Insert the guaranteed bypassed section at a random-ish position
				const combined = [...rest];
				combined.splice(0, 0, bypassed);
				return combined;
			}),
		});

		it('Feature: peq-parametric-equalizer, Property 13: Bypassed Sections Export as Unity — bypassed sections export as b0=1, b1=0, b2=0, a1=0, a2=0', () => {
			fc.assert(
				fc.property(paramsWithBypassedArbitrary, (params) => {
					const output = BiquadCalculator.formatBiquadExport(params);
					const lines = output.split('\n').filter((line) => line.length > 0);

					for (let i = 0; i < params.sections.length; i++) {
						const section = params.sections[i];
						const blockStart = i * 6;

						if (section.bypass) {
							expect(lines[blockStart + 1]).toBe('b0=1,');
							expect(lines[blockStart + 2]).toBe('b1=0,');
							expect(lines[blockStart + 3]).toBe('b2=0,');
							expect(lines[blockStart + 4]).toBe('a1=0,');
							expect(lines[blockStart + 5]).toBe('a2=0,');
						}
					}
				}),
				{ numRuns: 100 },
			);
		});
	});
});
