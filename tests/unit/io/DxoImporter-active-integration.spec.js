import { DxoImporter } from '../../../src/io/DxoImporter';

/**
 * Integration tests for active component frequency response verification.
 *
 * NOTE: The FRD reference files contain the FULL circuit response (speaker +
 * passives + active component), not just the active component in isolation.
 * Therefore, we verify that the active component's transfer function can be
 * evaluated and produces reasonable results at key frequencies, rather than
 * comparing directly against the FRD data.
 */
describe('DxoImporter - Active Component Integration Tests', () => {
	describe('PEQ transfer function evaluation', () => {
		it('should produce a boost around 530 Hz from the peaking section', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq).toBeDefined();

			// Evaluate at the peaking frequency (529.73 Hz) - should show gain
			const atPeak = peq.evaluateTransferFunction(529.73);
			const magnitudeAtPeak = 20 * Math.log10(Math.sqrt(atPeak.re ** 2 + atPeak.im ** 2));

			// The peaking section has +5 dB gain at 529.73 Hz
			// Combined with the lowShelf at 20kHz (-3 dB below shelf), net is ~+2 dB at 530 Hz
			expect(magnitudeAtPeak).toBeGreaterThan(1);

			// Evaluate at a low frequency (50 Hz) - lowShelf applies -3 dB below 20kHz
			const atLow = peq.evaluateTransferFunction(50);
			const magnitudeAtLow = 20 * Math.log10(Math.sqrt(atLow.re ** 2 + atLow.im ** 2));
			expect(magnitudeAtLow).toBeCloseTo(-3, 0); // Near -3 dB from lowShelf
		});

		it('should have near-unity response at high frequencies from the lowShelf section', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const peq = circuit.components.find((c) => c.type === 'peq');

			// The lowShelf at 20kHz with -3 dB gain attenuates below the shelf frequency
			// At very high frequencies (above shelf), response should approach 0 dB
			const atHighFreq = peq.evaluateTransferFunction(23000);
			const magnitudeAtHigh = 20 * Math.log10(Math.sqrt(atHighFreq.re ** 2 + atHighFreq.im ** 2));

			// Above the shelf frequency, response approaches unity
			expect(Math.abs(magnitudeAtHigh)).toBeLessThan(2);
		});
	});

	describe('OpAmp transfer function evaluation', () => {
		it('should have high gain at DC and roll off above corner frequency', () => {
			const filePath = 'tests/fixtures/projects/opamp/orbs-opamp.dxo';
			const circuit = DxoImporter.import(filePath);

			const opamp = circuit.components.find((c) => c.type === 'opamp');
			expect(opamp).toBeDefined();

			// At DC (very low frequency), gain should be close to 100 dB
			const atDC = opamp.evaluateTransferFunction(0.01);
			const magnitudeAtDC = 20 * Math.log10(Math.sqrt(atDC.re ** 2 + atDC.im ** 2));
			expect(magnitudeAtDC).toBeCloseTo(100, 0);

			// At corner frequency (50 Hz), gain should be ~3 dB below DC
			const atCorner = opamp.evaluateTransferFunction(50);
			const magnitudeAtCorner = 20 * Math.log10(Math.sqrt(atCorner.re ** 2 + atCorner.im ** 2));
			expect(magnitudeAtCorner).toBeCloseTo(magnitudeAtDC - 3, 0);

			// Well above corner, gain should roll off at -20 dB/decade
			const at5000 = opamp.evaluateTransferFunction(5000);
			const magnitudeAt5000 = 20 * Math.log10(Math.sqrt(at5000.re ** 2 + at5000.im ** 2));
			expect(magnitudeAt5000).toBeLessThan(magnitudeAtDC - 30);
		});
	});

	describe('Filter transfer function evaluation', () => {
		it('should pass signals near the turn frequency for bandpass filter', () => {
			const filePath = 'tests/fixtures/projects/filter/orbs-filter.dxo';
			const circuit = DxoImporter.import(filePath);

			const filter = circuit.components.find((c) => c.type === 'filter');
			expect(filter).toBeDefined();

			// At the turn frequency (4000 Hz), bandpass should be near unity
			const atTurn = filter.evaluateTransferFunction(4000);
			const magnitudeAtTurn = 20 * Math.log10(Math.sqrt(atTurn.re ** 2 + atTurn.im ** 2));
			expect(Math.abs(magnitudeAtTurn)).toBeLessThan(4); // Near 0 dB at center

			// Well below the turn frequency, bandpass should attenuate
			const atLow = filter.evaluateTransferFunction(100);
			const magnitudeAtLow = 20 * Math.log10(Math.sqrt(atLow.re ** 2 + atLow.im ** 2));
			expect(magnitudeAtLow).toBeLessThan(magnitudeAtTurn);

			// Well above the turn frequency, bandpass should attenuate
			const atHigh = filter.evaluateTransferFunction(40000);
			const magnitudeAtHigh = 20 * Math.log10(Math.sqrt(atHigh.re ** 2 + atHigh.im ** 2));
			expect(magnitudeAtHigh).toBeLessThan(magnitudeAtTurn);
		});
	});
});
