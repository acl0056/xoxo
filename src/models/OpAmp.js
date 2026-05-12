import { Component } from './Component';

/**
 * OpAmp (Operational Amplifier) component class
 * Represents an active component modeled as a VCVS with a frequency-dependent
 * open-loop gain following a single-pole model: A(f) = A₀ / (1 + j×f/f_c).
 * The closed-loop behavior depends on external feedback networks.
 */
export class OpAmp extends Component {
	/**
	 * Create a new OpAmp component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('opamp', x, y);

		// Set default parameters according to schema
		this.parameters = {
			dcGain: 100, // Open-loop DC gain in dB (100 dB ≈ 100,000× linear)
			cornerFrequency: 50, // Open-loop corner frequency in Hz
		};

		// Set terminals for an OpAmp (4 differential terminals, same as PEQ)
		this.terminals = [
			{ x: -3, y: -2 }, // Terminal 0: +in (top-left, extends 1 grid left of body)
			{ x: -3, y: 2 }, // Terminal 1: -in (bottom-left, extends 1 grid left of body)
			{ x: 4, y: -2 }, // Terminal 2: +out (top-right, extends 1 grid right of body)
			{ x: 4, y: 2 }, // Terminal 3: -out (bottom-right, extends 1 grid right of body)
		];
	}

	/**
	 * Validate OpAmp-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate dcGain is a finite number
		if (typeof this.parameters.dcGain !== 'number' || !Number.isFinite(this.parameters.dcGain)) {
			errors.push('dcGain must be a finite number');
		}

		// Validate cornerFrequency is a positive number
		if (typeof this.parameters.cornerFrequency !== 'number' || !Number.isFinite(this.parameters.cornerFrequency) || this.parameters.cornerFrequency <= 0) {
			errors.push('cornerFrequency must be a positive number');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Evaluate the open-loop transfer function A(f) at a given frequency.
	 * Single-pole model: A(f) = A₀ / (1 + j×f/f_c)
	 *
	 * Derived by multiplying numerator and denominator by conjugate:
	 * A(f) = A₀ × (1 - j×f/f_c) / (1 + (f/f_c)²)
	 *
	 * @param {number} frequency - Evaluation frequency in Hz
	 * @returns {{ re: number, im: number }} Complex transfer function value
	 */
	evaluateTransferFunction(frequency) {
		const linearGain = 10 ** (this.parameters.dcGain / 20);
		const ratio = frequency / this.parameters.cornerFrequency;
		const denomMagSquared = 1 + ratio * ratio;
		return {
			re: linearGain / denomMagSquared,
			im: -(linearGain * ratio) / denomMagSquared,
		};
	}

	/**
	 * Serialize the OpAmp to JSON format
	 * @returns {Object} JSON representation of the OpAmp
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
				dcGain: this.parameters.dcGain,
				cornerFrequency: this.parameters.cornerFrequency,
			},
		};
	}

	/**
	 * Deserialize an OpAmp from JSON format
	 * @param {Object} json - JSON representation of the OpAmp
	 * @returns {OpAmp} A new OpAmp instance
	 */
	static fromJSON(json) {
		const opamp = new OpAmp(json.x, json.y);
		opamp.id = json.id;
		opamp.label = json.label || '';
		opamp.rotation = json.rotation || 0;
		opamp.parameters = {
			dcGain: json.parameters.dcGain,
			cornerFrequency: json.parameters.cornerFrequency,
		};
		opamp.terminals = json.terminals || opamp.terminals;
		return opamp;
	}
}
