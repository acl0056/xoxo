import { Component } from './Component';

/**
 * Ground component class
 * Represents a ground reference node in the circuit
 * Ground components do not have labels or tunable parameters
 */
export class Ground extends Component {
	/**
	 * Create a new ground component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('ground', x, y);

		// Ground has no parameters (per schema: groundParameters is empty object)
		this.parameters = {};

		// Ground has a single terminal at its center
		this.terminals = [
			{ x: 0, y: 0 },
		];

		// Ground does not receive an automatic label (per Requirements 2.12)
		this.label = '';
	}

	/**
	 * Validate ground-specific properties
	 * Ground has minimal validation since it has no parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Ground should not have a label (per Requirements 2.12)
		if (this.label !== '') {
			errors.push('Ground component should not have a label');
		}

		// Ground should have exactly one terminal
		if (this.terminals.length !== 1) {
			errors.push('Ground component must have exactly one terminal');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Deserialize a ground component from JSON format
	 * @param {Object} json - JSON representation of the ground component
	 * @returns {Ground} A new Ground instance
	 */
	static fromJSON(json) {
		const ground = new Ground(json.x, json.y);
		ground.id = json.id;
		ground.rotation = json.rotation || 0;
		ground.parameters = json.parameters || {};
		ground.terminals = json.terminals || ground.terminals;
		// Ensure label remains empty even if present in JSON
		ground.label = '';
		return ground;
	}
}
