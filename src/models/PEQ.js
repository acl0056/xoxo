import { Component } from './Component';
import BiquadCalculator from '../simulation/BiquadCalculator';

/**
 * PEQ (Parametric Equalizer) component class
 * Represents an active DSP component with cascaded biquad filter sections,
 * global gain, delay, and mute. Modeled as a VCVS in the MNA framework.
 */
export class PEQ extends Component {
	/**
	 * Create a new PEQ component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('peq', x, y);

		// Set default parameters according to schema
		this.parameters = {
			gain: 0, // Global gain in dB
			delay: 0, // Signal delay in seconds
			dspRate: 48000, // DSP sample rate in samples per second
			muted: false, // Mute flag
			sections: [
				{
					filterType: 'peaking',
					frequency: 1000, // Hz
					q: 0.707,
					gain: 0, // dB
					bypass: false,
				},
			],
		};

		// Set terminals for a PEQ (4 differential terminals)
		this.terminals = [
			{ x: -3, y: -2 }, // +in (top-left, extends 1 grid left of body)
			{ x: -3, y: 2 }, // -in (bottom-left, extends 1 grid left of body)
			{ x: 4, y: -2 }, // +out (top-right, extends 1 grid right of body)
			{ x: 4, y: 2 }, // -out (bottom-right, extends 1 grid right of body)
		];
	}

	/**
	 * Validate PEQ-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate gain is a finite number
		if (typeof this.parameters.gain !== 'number' || !Number.isFinite(this.parameters.gain)) {
			errors.push('Gain must be a finite number');
		}

		// Validate delay is non-negative
		if (typeof this.parameters.delay !== 'number' || this.parameters.delay < 0) {
			errors.push('Delay must be a non-negative number');
		}

		// Validate dspRate is positive
		if (typeof this.parameters.dspRate !== 'number' || this.parameters.dspRate <= 0) {
			errors.push('DSP rate must be a positive number');
		}

		// Validate muted is boolean
		if (typeof this.parameters.muted !== 'boolean') {
			errors.push('Muted must be a boolean');
		}

		// Validate sections array
		if (!Array.isArray(this.parameters.sections)) {
			errors.push('Sections must be an array');
		} else {
			if (this.parameters.sections.length < 1 || this.parameters.sections.length > 10) {
				errors.push('Sections must contain between 1 and 10 entries');
			}

			const validFilterTypes = [
				'peaking', 'highShelf', 'lowShelf',
				'lowPass1', 'highPass1', 'lowPass2', 'highPass2', 'allPass',
			];

			this.parameters.sections.forEach((section, index) => {
				if (!validFilterTypes.includes(section.filterType)) {
					errors.push(`Section ${index}: filterType must be one of: ${validFilterTypes.join(', ')}`);
				}

				if (typeof section.frequency !== 'number' || section.frequency <= 0) {
					errors.push(`Section ${index}: frequency must be a positive number`);
				}

				if (typeof section.q !== 'number' || section.q <= 0) {
					errors.push(`Section ${index}: Q must be a positive number`);
				}

				if (typeof section.bypass !== 'boolean') {
					errors.push(`Section ${index}: bypass must be a boolean`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Evaluate the combined transfer function at a frequency.
	 * Delegates to BiquadCalculator.evaluatePEQ.
	 * @param {number} frequency - Evaluation frequency in Hz
	 * @returns {{ re: number, im: number }} Complex transfer function value
	 */
	evaluateTransferFunction(frequency) {
		return BiquadCalculator.evaluatePEQ(this.parameters, frequency);
	}

	/**
	 * Serialize the PEQ to JSON format
	 * @returns {Object} JSON representation of the PEQ
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
				gain: this.parameters.gain,
				delay: this.parameters.delay,
				dspRate: this.parameters.dspRate,
				muted: this.parameters.muted,
				sections: this.parameters.sections.map((section) => ({
					filterType: section.filterType,
					frequency: section.frequency,
					q: section.q,
					gain: section.gain,
					bypass: section.bypass,
				})),
			},
		};
	}

	/**
	 * Deserialize a PEQ from JSON format
	 * @param {Object} json - JSON representation of the PEQ
	 * @returns {PEQ} A new PEQ instance
	 */
	static fromJSON(json) {
		const peq = new PEQ(json.x, json.y);
		peq.id = json.id;
		peq.label = json.label || '';
		peq.rotation = json.rotation || 0;
		peq.parameters = {
			gain: json.parameters.gain,
			delay: json.parameters.delay,
			dspRate: json.parameters.dspRate,
			muted: json.parameters.muted,
			sections: (json.parameters.sections || []).map((section) => ({
				filterType: section.filterType,
				frequency: section.frequency,
				q: section.q,
				gain: section.gain !== undefined ? section.gain : 0,
				bypass: section.bypass,
			})),
		};
		peq.terminals = json.terminals || peq.terminals;
		return peq;
	}
}
