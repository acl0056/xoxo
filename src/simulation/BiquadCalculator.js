/**
 * BiquadCalculator — computes biquad filter coefficients and evaluates
 * transfer functions for the PEQ (Parametric Equalizer) component.
 *
 * Uses Audio EQ Cookbook formulas with bilinear transform and frequency pre-warping.
 * Supports 8 filter types: peaking, highShelf, lowShelf, lowPass1, highPass1,
 * lowPass2, highPass2, allPass.
 */
export default class BiquadCalculator {
	/**
	 * Compute biquad coefficients for a filter section.
	 * @param {Object} section - { filterType, frequency, q, gain }
	 * @param {number} dspRate - Sample rate in Hz
	 * @returns {{ b0: number, b1: number, b2: number, a1: number, a2: number }} Normalized coefficients (a0 = 1)
	 */
	static computeCoefficients(section, dspRate) {
		const {
			filterType, frequency, q, gain = 0,
		} = section;

		// Clamp Q to minimum 0.001 to avoid division by zero
		const clampedQ = Math.max(q, 0.001);

		// Clamp frequency to 95% of Nyquist if it exceeds Nyquist
		const nyquist = dspRate / 2;
		let clampedFrequency = frequency;
		if (frequency >= nyquist) {
			clampedFrequency = nyquist * 0.95;
			console.warn(
				`BiquadCalculator: frequency ${frequency} Hz exceeds Nyquist (${nyquist} Hz). Clamped to ${clampedFrequency} Hz.`,
			);
		}

		let b0; let b1; let b2; let a0; let a1; let a2;

		if (filterType === 'lowPass1' || filterType === 'highPass1') {
			// First-order filters use bilinear transform with K = tan(π × f / dspRate)
			const K = Math.tan((Math.PI * clampedFrequency) / dspRate);

			if (filterType === 'lowPass1') {
				b0 = K / (K + 1);
				b1 = K / (K + 1);
				b2 = 0;
				a0 = 1;
				a1 = (K - 1) / (K + 1);
				a2 = 0;
			} else {
				// highPass1
				b0 = 1 / (K + 1);
				b1 = -1 / (K + 1);
				b2 = 0;
				a0 = 1;
				a1 = (K - 1) / (K + 1);
				a2 = 0;
			}
		} else {
			// Second-order filters use ω₀ and α
			const omega0 = (2 * Math.PI * clampedFrequency) / dspRate;
			const sinOmega = Math.sin(omega0);
			const cosOmega = Math.cos(omega0);
			const alpha = sinOmega / (2 * clampedQ);
			const A = 10 ** (gain / 40);

			switch (filterType) {
				case 'peaking':
					b0 = 1 + alpha * A;
					b1 = -2 * cosOmega;
					b2 = 1 - alpha * A;
					a0 = 1 + alpha / A;
					a1 = -2 * cosOmega;
					a2 = 1 - alpha / A;
					break;

				case 'highShelf':
					b0 = A * ((A + 1) + (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha);
					b1 = -2 * A * ((A - 1) + (A + 1) * cosOmega);
					b2 = A * ((A + 1) + (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha);
					a0 = (A + 1) - (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha;
					a1 = 2 * ((A - 1) - (A + 1) * cosOmega);
					a2 = (A + 1) - (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha;
					break;

				case 'lowShelf':
					b0 = A * ((A + 1) - (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha);
					b1 = 2 * A * ((A - 1) - (A + 1) * cosOmega);
					b2 = A * ((A + 1) - (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha);
					a0 = (A + 1) + (A - 1) * cosOmega + 2 * Math.sqrt(A) * alpha;
					a1 = -2 * ((A - 1) + (A + 1) * cosOmega);
					a2 = (A + 1) + (A - 1) * cosOmega - 2 * Math.sqrt(A) * alpha;
					break;

				case 'lowPass2':
					b0 = (1 - cosOmega) / 2;
					b1 = 1 - cosOmega;
					b2 = (1 - cosOmega) / 2;
					a0 = 1 + alpha;
					a1 = -2 * cosOmega;
					a2 = 1 - alpha;
					break;

				case 'highPass2':
					b0 = (1 + cosOmega) / 2;
					b1 = -(1 + cosOmega);
					b2 = (1 + cosOmega) / 2;
					a0 = 1 + alpha;
					a1 = -2 * cosOmega;
					a2 = 1 - alpha;
					break;

				case 'allPass':
					b0 = 1 - alpha;
					b1 = -2 * cosOmega;
					b2 = 1 + alpha;
					a0 = 1 + alpha;
					a1 = -2 * cosOmega;
					a2 = 1 - alpha;
					break;

				default:
					// Unknown filter type — return unity (passthrough)
					console.warn(`BiquadCalculator: unknown filter type "${filterType}". Returning unity coefficients.`);
					return {
						b0: 1, b1: 0, b2: 0, a1: 0, a2: 0,
					};
			}
		}

		// Normalize by a0
		const normalizedB0 = b0 / a0;
		const normalizedB1 = b1 / a0;
		const normalizedB2 = b2 / a0;
		const normalizedA1 = a1 / a0;
		const normalizedA2 = a2 / a0;

		// NaN protection — return unity if any coefficient is NaN or Infinity
		if (
			!Number.isFinite(normalizedB0)
			|| !Number.isFinite(normalizedB1)
			|| !Number.isFinite(normalizedB2)
			|| !Number.isFinite(normalizedA1)
			|| !Number.isFinite(normalizedA2)
		) {
			console.error('BiquadCalculator: NaN/Infinity detected in coefficients. Returning unity.');
			return {
				b0: 1, b1: 0, b2: 0, a1: 0, a2: 0,
			};
		}

		return {
			b0: normalizedB0,
			b1: normalizedB1,
			b2: normalizedB2,
			a1: normalizedA1,
			a2: normalizedA2,
		};
	}

	/**
	 * Evaluate the transfer function H(z) of a single biquad at a given frequency.
	 * @param {{ b0: number, b1: number, b2: number, a1: number, a2: number }} coeffs - Biquad coefficients
	 * @param {number} frequency - Evaluation frequency in Hz
	 * @param {number} dspRate - Sample rate in Hz
	 * @returns {{ re: number, im: number }} Complex transfer function value
	 */
	static evaluateTransferFunction(coeffs, frequency, dspRate) {
		// Handle frequency <= 0: return unity
		if (frequency <= 0) {
			return { re: 1, im: 0 };
		}

		const {
			b0, b1, b2, a1, a2,
		} = coeffs;

		const omega = (2 * Math.PI * frequency) / dspRate;

		// z⁻¹ = cos(ω) - j×sin(ω)
		const cosW = Math.cos(omega);
		const sinW = Math.sin(omega);

		// z⁻² = cos(2ω) - j×sin(2ω)
		const cos2W = Math.cos(2 * omega);
		const sin2W = Math.sin(2 * omega);

		// Numerator: b0 + b1×z⁻¹ + b2×z⁻²
		const numRe = b0 + b1 * cosW + b2 * cos2W;
		const numIm = -(b1 * sinW + b2 * sin2W);

		// Denominator: 1 + a1×z⁻¹ + a2×z⁻²
		const denRe = 1 + a1 * cosW + a2 * cos2W;
		const denIm = -(a1 * sinW + a2 * sin2W);

		// Complex division: (numRe + j*numIm) / (denRe + j*denIm)
		const denomMagSquared = denRe * denRe + denIm * denIm;

		// Division by zero protection
		if (denomMagSquared === 0) {
			console.error('BiquadCalculator: division by zero in transfer function evaluation. Returning unity.');
			return { re: 1, im: 0 };
		}

		const re = (numRe * denRe + numIm * denIm) / denomMagSquared;
		const im = (numIm * denRe - numRe * denIm) / denomMagSquared;

		return { re, im };
	}

	/**
	 * Format biquad coefficients for export as plain text (XSim4-compatible format).
	 * ALL sections are exported, including bypassed ones (which export as unity).
	 * Coefficients are normalized so a0 = 1 (implicit).
	 * @param {Object} params - PEQ parameters { dspRate, sections }
	 * @returns {string} Plain text export with biquadN headers and coefficient lines
	 */
	static formatBiquadExport(params) {
		const { dspRate = 48000, sections = [] } = params;

		let output = '';

		for (let i = 0; i < sections.length; i++) {
			const section = sections[i];
			const sectionNumber = i + 1;

			let b0; let b1; let b2; let a1; let a2;

			if (section.bypass) {
				b0 = 1;
				b1 = 0;
				b2 = 0;
				a1 = 0;
				a2 = 0;
			} else {
				const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
				b0 = coeffs.b0;
				b1 = coeffs.b1;
				b2 = coeffs.b2;
				a1 = coeffs.a1;
				a2 = coeffs.a2;
			}

			output += `biquad${sectionNumber},\n`;
			output += `b0=${b0},\n`;
			output += `b1=${b1},\n`;
			output += `b2=${b2},\n`;
			output += `a1=${a1},\n`;
			output += `a2=${a2},\n`;
		}

		return output;
	}

	/**
	 * Compute the combined transfer function for all non-bypassed sections.
	 * Includes global gain and delay.
	 * @param {Object} params - PEQ parameters { gain, delay, dspRate, muted, sections }
	 * @param {number} frequency - Evaluation frequency in Hz
	 * @returns {{ re: number, im: number }} Combined complex H(f)
	 */
	static evaluatePEQ(params, frequency) {
		const {
			gain = 0, delay = 0, dspRate = 48000, muted = false, sections = [],
		} = params;

		// Muted: return zero immediately
		if (muted) {
			return { re: 0, im: 0 };
		}

		// Start with unity
		let resultRe = 1;
		let resultIm = 0;

		// Multiply by each non-bypassed section's transfer function
		for (const section of sections) {
			if (section.bypass) {
				continue;
			}

			const coeffs = BiquadCalculator.computeCoefficients(section, dspRate);
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);

			// Complex multiplication: result × h
			const newRe = resultRe * h.re - resultIm * h.im;
			const newIm = resultRe * h.im + resultIm * h.re;
			resultRe = newRe;
			resultIm = newIm;
		}

		// Apply global gain: G = 10^(gain_dB / 20)
		const globalGain = 10 ** (gain / 20);
		resultRe *= globalGain;
		resultIm *= globalGain;

		// Apply delay: e^(-j×2π×f×delay) = cos(2πfD) - j×sin(2πfD)
		if (delay > 0) {
			const delayPhase = 2 * Math.PI * frequency * delay;
			const delayRe = Math.cos(delayPhase);
			const delayIm = -Math.sin(delayPhase);

			const newRe = resultRe * delayRe - resultIm * delayIm;
			const newIm = resultRe * delayIm + resultIm * delayRe;
			resultRe = newRe;
			resultIm = newIm;
		}

		return { re: resultRe, im: resultIm };
	}
}
