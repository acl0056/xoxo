/**
 * Hilbert Transform for Minimum Phase Derivation
 *
 * This module implements the Hilbert Transform to derive minimum phase
 * response from magnitude-only frequency response data. This is used when
 * loudspeaker measurements don't include phase data or when the user
 * selects "derived" phase source.
 *
 * The Hilbert Transform relates the magnitude and phase of a minimum phase
 * system. For a minimum phase system, the phase can be uniquely determined
 * from the magnitude response.
 *
 * Algorithm:
 * 1. Convert magnitude from dB to linear scale
 * 2. Take natural logarithm of magnitude
 * 3. Apply discrete Hilbert Transform
 * 4. Convert result to phase in degrees
 *
 * Reference: "Minimum-Phase Response from Magnitude Response" by Oppenheim & Schafer
 */

class HilbertTransform {
	/**
	 * Calculate minimum phase from magnitude data using Hilbert Transform
	 *
	 * @param {Array<number>} frequencies - Frequency points in Hz (must be monotonically increasing)
	 * @param {Array<number>} magnitudes - Magnitude values in dB
	 * @returns {Array<number>} Phase values in degrees
	 */
	static calculateMinimumPhase(frequencies, magnitudes) {
		if (!frequencies || !magnitudes) {
			throw new Error('Frequencies and magnitudes are required');
		}

		if (frequencies.length !== magnitudes.length) {
			throw new Error('Frequencies and magnitudes must have the same length');
		}

		if (frequencies.length < 2) {
			throw new Error('At least 2 frequency points are required');
		}

		// Validate monotonic frequencies
		for (let i = 1; i < frequencies.length; i++) {
			if (frequencies[i] <= frequencies[i - 1]) {
				throw new Error(`Non-monotonic frequencies at index ${i}`);
			}
		}

		// Convert magnitude from dB to linear scale
		const linearMagnitudes = magnitudes.map((mag) => 10 ** (mag / 20));

		// Take natural logarithm of magnitude
		const logMagnitudes = linearMagnitudes.map((mag) => {
			if (mag <= 0) {
				// Handle zero or negative magnitudes (shouldn't happen with valid data)
				return -100; // Very small value
			}
			return Math.log(mag);
		});

		// Apply discrete Hilbert Transform
		const phases = this._discreteHilbertTransform(logMagnitudes, frequencies);

		// Convert from radians to degrees
		return phases.map((phase) => (phase * 180) / Math.PI);
	}

	/**
	 * Discrete Hilbert Transform implementation
	 *
	 * This uses the Kramers-Kronig relation to derive minimum phase from magnitude.
	 * For a minimum phase system, the phase can be computed from the log magnitude
	 * using the Hilbert Transform.
	 *
	 * The implementation uses logarithmic frequency spacing and numerical integration.
	 *
	 * @param {Array<number>} logMagnitudes - Natural log of linear magnitudes
	 * @param {Array<number>} frequencies - Frequency points in Hz
	 * @returns {Array<number>} Phase values in radians
	 * @private
	 */
	static _discreteHilbertTransform(logMagnitudes, frequencies) {
		const n = logMagnitudes.length;
		const phases = new Array(n);

		// Convert to log frequency for better numerical stability
		const logFrequencies = frequencies.map((f) => Math.log(f));

		// For each frequency point, compute the Hilbert Transform integral
		for (let i = 0; i < n; i++) {
			let phaseSum = 0;

			// Numerical integration using trapezoidal rule in log-frequency domain
			// The Hilbert Transform for minimum phase:
			// φ(ω) = -(1/π) ∫ [d(ln|H(ω')|)/d(ln ω')] * ln|(ω' - ω)/(ω' + ω)| d(ln ω')

			for (let j = 0; j < n; j++) {
				if (i === j) {
					// Skip the singularity
					continue;
				}

				// Compute derivative of log magnitude with respect to log frequency
				let dLogMagDLogFreq;
				if (j === 0) {
					// Forward difference
					dLogMagDLogFreq = (logMagnitudes[j + 1] - logMagnitudes[j])
						/ (logFrequencies[j + 1] - logFrequencies[j]);
				} else if (j === n - 1) {
					// Backward difference
					dLogMagDLogFreq = (logMagnitudes[j] - logMagnitudes[j - 1])
						/ (logFrequencies[j] - logFrequencies[j - 1]);
				} else {
					// Central difference
					dLogMagDLogFreq = (logMagnitudes[j + 1] - logMagnitudes[j - 1])
						/ (logFrequencies[j + 1] - logFrequencies[j - 1]);
				}

				// Hilbert Transform kernel in log-frequency domain
				const freqRatio = frequencies[j] / frequencies[i];
				const kernel = Math.log(Math.abs((freqRatio - 1) / (freqRatio + 1)));

				// Integration weight (trapezoidal rule)
				let weight;
				if (j === 0) {
					weight = (logFrequencies[j + 1] - logFrequencies[j]) / 2;
				} else if (j === n - 1) {
					weight = (logFrequencies[j] - logFrequencies[j - 1]) / 2;
				} else {
					weight = (logFrequencies[j + 1] - logFrequencies[j - 1]) / 2;
				}

				phaseSum += dLogMagDLogFreq * kernel * weight;
			}

			// Apply the -1/π factor
			phases[i] = -phaseSum / Math.PI;
		}

		return phases;
	}

	/**
	 * Validate that the derived phase is different from measured phase
	 *
	 * @param {Array<number>} derivedPhase - Derived minimum phase in degrees
	 * @param {Array<number>} measuredPhase - Measured phase in degrees (optional)
	 * @returns {boolean} True if phases are different (or if no measured phase provided)
	 */
	static validatePhaseDifference(derivedPhase, measuredPhase = null) {
		if (!measuredPhase || measuredPhase.length === 0) {
			// No measured phase to compare, derived phase is valid
			return true;
		}

		if (derivedPhase.length !== measuredPhase.length) {
			// Different lengths, they're different
			return true;
		}

		// Check if phases are significantly different
		// Use a threshold of 1 degree average difference
		let sumDifference = 0;
		for (let i = 0; i < derivedPhase.length; i++) {
			sumDifference += Math.abs(derivedPhase[i] - measuredPhase[i]);
		}

		const averageDifference = sumDifference / derivedPhase.length;
		return averageDifference > 1.0; // More than 1 degree average difference
	}
}

module.exports = HilbertTransform;
