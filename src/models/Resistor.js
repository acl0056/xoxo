import { Component } from './Component';

/**
 * Resistor component class
 * Represents a resistor with resistance, tolerance, and state parameters
 */
export class Resistor extends Component {
	/**
	 * Create a new resistor component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('resistor', x, y);

		// Set default parameters according to schema
		this.parameters = {
			resistance: 8.0, // Ohms (default 8 ohm for speaker crossovers)
			tolerance: 5, // Percentage
			state: 'normal', // 'normal', 'open', 'short'
		};

		// Set terminals for a resistor (spans 6 grid dots)
		// Terminals at -3 and +3 from center
		this.terminals = [
			{ x: -3, y: 0 },
			{ x: 3, y: 0 },
		];
	}

	/**
	 * Validate resistor-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate resistance
		if (typeof this.parameters.resistance !== 'number' || this.parameters.resistance <= 0) {
			errors.push('Resistance must be a positive number');
		}

		// Validate tolerance
		if (typeof this.parameters.tolerance !== 'number'
			|| this.parameters.tolerance < 0
			|| this.parameters.tolerance > 100) {
			errors.push('Tolerance must be a number between 0 and 100');
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
	 * Deserialize a resistor from JSON format
	 * @param {Object} json - JSON representation of the resistor
	 * @returns {Resistor} A new Resistor instance
	 */
	static fromJSON(json) {
		const resistor = new Resistor(json.x, json.y);
		resistor.id = json.id;
		resistor.label = json.label || '';
		resistor.rotation = json.rotation || 0;
		resistor.parameters = {
			resistance: json.parameters.resistance,
			tolerance: json.parameters.tolerance,
			state: json.parameters.state,
		};
		resistor.terminals = json.terminals || resistor.terminals;
		return resistor;
	}
}
