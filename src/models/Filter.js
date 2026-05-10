import { Component } from './Component';
import FilterCoefficientCalculator from '../simulation/FilterCoefficientCalculator';
import BiquadCalculator from '../simulation/BiquadCalculator';

/**
 * Filter (Active Filter) component class
 * Represents a DSP-based component that implements classic analog filter shapes
 * (Butterworth, Linkwitz-Riley, Bessel) as cascaded biquad sections.
 * Modeled as a VCVS in the MNA framework, sharing the same 4-terminal
 * differential layout as PEQ.
 */
export class Filter extends Component {
	/**
	 * Create a new Filter component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('filter', x, y);

		// Set default parameters according to schema
		this.parameters = {
			filterShape: 'butterworth',
			filterType: 'lowPass',
			filterOrder: 2,
			turnFrequency: 1000, // Hz
			gain: 0, // dB
			delay: 0, // seconds
			muted: false,
		};

		// Set terminals for a Filter (4 differential terminals, same as PEQ)
		this.terminals = [
			{ x: -2, y: -2 }, // +in (top-left)
			{ x: -2, y: 2 }, // -in (bottom-left)
			{ x: 2, y: -2 }, // +out (top-right)
			{ x: 2, y: 2 }, // -out (bottom-right)
		];

		// Coefficient cache
		this._cachedCoefficients = null;
		this._parametersDirty = true;
	}

	/**
	 * Validate Filter-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		const validShapes = ['butterworth', 'linkwitzRiley', 'bessel'];
		const validTypes = ['lowPass', 'highPass', 'bandpass'];

		// Validate filterShape
		if (!validShapes.includes(this.parameters.filterShape)) {
			errors.push(`filterShape must be one of: ${validShapes.join(', ')}`);
		}

		// Validate filterType
		if (!validTypes.includes(this.parameters.filterType)) {
			errors.push(`filterType must be one of: ${validTypes.join(', ')}`);
		}

		// Validate filterOrder is an integer between 1 and 40
		if (
			typeof this.parameters.filterOrder !== 'number'
			|| !Number.isInteger(this.parameters.filterOrder)
			|| this.parameters.filterOrder < 1
			|| this.parameters.filterOrder > 40
		) {
			errors.push('filterOrder must be an integer between 1 and 40');
		}

		// Validate filterOrder is even when Linkwitz-Riley
		if (
			this.parameters.filterShape === 'linkwitzRiley'
			&& Number.isInteger(this.parameters.filterOrder)
			&& this.parameters.filterOrder % 2 !== 0
		) {
			errors.push('filterOrder must be even for Linkwitz-Riley filter shape');
		}

		// Validate turnFrequency is positive
		if (typeof this.parameters.turnFrequency !== 'number' || this.parameters.turnFrequency <= 0) {
			errors.push('turnFrequency must be a positive number');
		}

		// Validate gain is a finite number
		if (typeof this.parameters.gain !== 'number' || !Number.isFinite(this.parameters.gain)) {
			errors.push('gain must be a finite number');
		}

		// Validate delay is non-negative
		if (typeof this.parameters.delay !== 'number' || this.parameters.delay < 0) {
			errors.push('delay must be a non-negative number');
		}

		// Validate muted is boolean
		if (typeof this.parameters.muted !== 'boolean') {
			errors.push('muted must be a boolean');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Evaluate the combined transfer function at a frequency.
	 * Computes cascaded biquad sections via FilterCoefficientCalculator,
	 * then evaluates each via BiquadCalculator.evaluateTransferFunction.
	 * @param {number} frequency - Evaluation frequency in Hz
	 * @returns {{ re: number, im: number }} Complex transfer function value
	 */
	evaluateTransferFunction(frequency) {
		// Muted: return zero immediately
		if (this.parameters.muted) {
			return { re: 0, im: 0 };
		}

		// Compute or retrieve cached coefficients
		if (this._cachedCoefficients === null || this._parametersDirty) {
			const dspRate = this.parameters.dspRate || 48000;
			this._cachedCoefficients = FilterCoefficientCalculator.computeFilterCoefficients(
				this.parameters, dspRate,
			);
			this._parametersDirty = false;
		}

		const dspRate = this.parameters.dspRate || 48000;
		const { sections } = this._cachedCoefficients;

		// Start with unity
		let resultRe = 1;
		let resultIm = 0;

		// Multiply by each section's transfer function
		for (const coeffs of sections) {
			const h = BiquadCalculator.evaluateTransferFunction(coeffs, frequency, dspRate);

			// Complex multiplication: result × h
			const newRe = resultRe * h.re - resultIm * h.im;
			const newIm = resultRe * h.im + resultIm * h.re;
			resultRe = newRe;
			resultIm = newIm;
		}

		// Apply global gain: G = 10^(gain_dB / 20)
		if (this.parameters.gain !== 0) {
			const globalGain = 10 ** (this.parameters.gain / 20);
			resultRe *= globalGain;
			resultIm *= globalGain;
		}

		// Apply delay: e^(-j×2π×f×delay) = cos(2πfD) - j×sin(2πfD)
		if (this.parameters.delay > 0) {
			const delayPhase = 2 * Math.PI * frequency * this.parameters.delay;
			const delayRe = Math.cos(delayPhase);
			const delayIm = -Math.sin(delayPhase);

			const newRe = resultRe * delayRe - resultIm * delayIm;
			const newIm = resultRe * delayIm + resultIm * delayRe;
			resultRe = newRe;
			resultIm = newIm;
		}

		return { re: resultRe, im: resultIm };
	}

	/**
	 * Serialize the Filter to JSON format
	 * @returns {Object} JSON representation of the Filter
	 */
	toJSON() {
		return {
			id: this.id,
			type: this.type,
			label: this.label,
			x: this.x,
			y: this.y,
			rotation: this.rotation,
			parameters: {
				filterShape: this.parameters.filterShape,
				filterType: this.parameters.filterType,
				filterOrder: this.parameters.filterOrder,
				turnFrequency: this.parameters.turnFrequency,
				gain: this.parameters.gain,
				delay: this.parameters.delay,
				muted: this.parameters.muted,
			},
		};
	}

	/**
	 * Deserialize a Filter from JSON format
	 * @param {Object} json - JSON representation of the Filter
	 * @returns {Filter} A new Filter instance
	 */
	static fromJSON(json) {
		const filter = new Filter(json.x, json.y);
		filter.id = json.id;
		filter.label = json.label || '';
		filter.rotation = json.rotation || 0;
		filter.parameters = {
			filterShape: json.parameters.filterShape,
			filterType: json.parameters.filterType,
			filterOrder: json.parameters.filterOrder,
			turnFrequency: json.parameters.turnFrequency,
			gain: json.parameters.gain,
			delay: json.parameters.delay,
			muted: json.parameters.muted,
		};
		filter.terminals = json.terminals || filter.terminals;
		filter._parametersDirty = true;
		return filter;
	}
}
