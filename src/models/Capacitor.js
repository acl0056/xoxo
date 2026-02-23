import { Component } from './Component';

/**
 * Capacitor component class
 * Represents a capacitor with capacitance, tolerance, ESR, and state parameters
 */
export class Capacitor extends Component {
	/**
	 * Create a new capacitor component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('capacitor', x, y);

		// Set default parameters according to schema
		this.parameters = {
			capacitance: 10e-6, // Farads (10 microfarads default)
			tolerance: 10, // Percentage
			esr: 0.0, // Equivalent Series Resistance (Ohms)
			state: 'normal', // 'normal', 'open', 'short'
		};

		// Set terminals for a capacitor (spans 6 grid dots)
		// Terminals at -3 and +3 from center
		this.terminals = [
			{ x: -3, y: 0 },
			{ x: 3, y: 0 },
		];
	}

	/**
	 * Validate capacitor-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate capacitance
		if (typeof this.parameters.capacitance !== 'number' || this.parameters.capacitance <= 0) {
			errors.push('Capacitance must be a positive number');
		}

		// Validate tolerance
		if (typeof this.parameters.tolerance !== 'number'
			|| this.parameters.tolerance < 0
			|| this.parameters.tolerance > 100) {
			errors.push('Tolerance must be a number between 0 and 100');
		}

		// Validate ESR
		if (typeof this.parameters.esr !== 'number' || this.parameters.esr < 0) {
			errors.push('ESR must be a non-negative number');
		}

		// Validate state
		const validStates = ['normal', 'open', 'short'];
		if (!validStates.includes(this.parameters.state)) {
			errors.push('State must be one of: normal, open, short');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Deserialize a capacitor from JSON format
	 * @param {Object} json - JSON representation of the capacitor
	 * @returns {Capacitor} A new Capacitor instance
	 */
	static fromJSON(json) {
		const capacitor = new Capacitor(json.x, json.y);
		capacitor.id = json.id;
		capacitor.label = json.label || '';
		capacitor.rotation = json.rotation || 0;
		capacitor.parameters = {
			capacitance: json.parameters.capacitance,
			tolerance: json.parameters.tolerance,
			esr: json.parameters.esr,
			state: json.parameters.state,
		};
		capacitor.terminals = json.terminals || capacitor.terminals;
		return capacitor;
	}
}
