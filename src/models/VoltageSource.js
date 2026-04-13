import { Component } from './Component';

/**
 * VoltageSource component class
 * Represents a voltage source (power amplifier) with configurable power and impedance
 * Voltage is calculated as V = sqrt(P * Z)
 */
export class VoltageSource extends Component {
	/**
	 * Create a new voltage source component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('source', x, y);

		// Set default parameters according to schema
		// Default: 1W at 8 ohms = 2.828 Vrms
		this.parameters = {
			power: 1.0, // Watts
			impedance: 8.0, // Ohms (reference)
			delay: 0.0, // Milliseconds
			inverted: false, // Polarity inversion flag
		};

		// Set terminals for a voltage source (+ and - terminals)
		// Terminals at x=3, 2 grid units apart vertically
		this.terminals = [
			{ x: 3, y: -2 }, // Top terminal (positive for normal polarity)
			{ x: 3, y: 2 }, // Bottom terminal (negative for normal polarity)
		];
	}

	/**
	 * Calculate the voltage from power and impedance
	 * V = sqrt(P * Z)
	 * @returns {number} Voltage in Vrms
	 */
	getVoltage() {
		return Math.sqrt(this.parameters.power * this.parameters.impedance);
	}

	/**
	 * Validate voltage source-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate power
		if (typeof this.parameters.power !== 'number' || this.parameters.power <= 0) {
			errors.push('Power must be a positive number');
		}

		// Validate impedance
		if (typeof this.parameters.impedance !== 'number' || this.parameters.impedance <= 0) {
			errors.push('Impedance must be a positive number');
		}

		// Validate delay
		if (typeof this.parameters.delay !== 'number' || this.parameters.delay < 0) {
			errors.push('Delay must be a non-negative number');
		}

		// Validate inverted flag
		if (typeof this.parameters.inverted !== 'boolean') {
			errors.push('Inverted must be a boolean');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the voltage source to JSON format
	 * @returns {Object} JSON representation of the voltage source
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
				power: this.parameters.power,
				impedance: this.parameters.impedance,
				delay: this.parameters.delay,
				inverted: this.parameters.inverted,
			},
		};
	}

	/**
	 * Deserialize a voltage source from JSON format
	 * @param {Object} json - JSON representation of the voltage source
	 * @returns {VoltageSource} A new VoltageSource instance
	 */
	static fromJSON(json) {
		const source = new VoltageSource(json.x, json.y);
		source.id = json.id;
		source.label = json.label || '';
		source.rotation = json.rotation || 0;
		source.parameters = {
			power: json.parameters.power || 1.0,
			impedance: json.parameters.impedance || 8.0,
			delay: json.parameters.delay || 0.0,
			inverted: json.parameters.inverted || false,
		};
		source.terminals = json.terminals || source.terminals;
		return source;
	}
}
