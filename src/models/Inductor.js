import { Component } from './Component';

/**
 * Inductor component class
 * Represents an inductor with inductance, tolerance, ESR, and state parameters
 */
export class Inductor extends Component {
	/**
	 * Create a new inductor component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('inductor', x, y);

		// Set default parameters according to schema
		this.parameters = {
			inductance: 1e-3, // Henries (1 millihenry default)
			tolerance: 10, // Percentage
			esr: 0.0, // Equivalent Series Resistance (Ohms)
			state: 'normal', // 'normal', 'open', 'short'
		};

		// Set terminals for an inductor (spans 6 grid dots)
		// Terminals at -3 and +3 from center
		this.terminals = [
			{ x: -3, y: 0 },
			{ x: 3, y: 0 },
		];
	}

	/**
	 * Validate inductor-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate inductance
		if (typeof this.parameters.inductance !== 'number' || this.parameters.inductance <= 0) {
			errors.push('Inductance must be a positive number');
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
	 * Deserialize an inductor from JSON format
	 * @param {Object} json - JSON representation of the inductor
	 * @returns {Inductor} A new Inductor instance
	 */
	static fromJSON(json) {
		const inductor = new Inductor(json.x, json.y);
		inductor.id = json.id;
		inductor.label = json.label || '';
		inductor.rotation = json.rotation || 0;
		inductor.parameters = {
			inductance: json.parameters.inductance,
			tolerance: json.parameters.tolerance,
			esr: json.parameters.esr,
			state: json.parameters.state,
		};
		inductor.terminals = json.terminals || inductor.terminals;
		return inductor;
	}
}
