import { Component } from './Component';

/**
 * WireSegment component class
 * Represents a wire segment with two connection terminals
 * Wire segments are movable and can connect to component terminals or other wire segments
 */
export class WireSegment extends Component {
	/**
	 * Create a new wire segment
	 * @param {number} x - Grid position X coordinate (center of segment)
	 * @param {number} y - Grid position Y coordinate (center of segment)
	 * @param {number} length - Length of the wire segment in grid units
	 * @param {number} rotation - Rotation angle (0, 90, 180, 270)
	 */
	constructor(x, y, length = 5, rotation = 0) {
		super('wire-segment', x, y);

		// Wire segments have no tunable parameters
		this.parameters = {
			length, // Length in grid units
		};

		// Wire segments don't get automatic labels
		this.label = '';

		// Set rotation
		this.rotation = rotation;

		// Calculate terminal positions based on length and rotation
		this.updateTerminals();
	}

	/**
	 * Update terminal positions based on length and rotation
	 * Terminals are at the two ends of the wire segment
	 */
	updateTerminals() {
		const halfLength = this.parameters.length / 2;

		// Always store terminals in unrotated (horizontal) frame
		// getTerminalPosition() in Component base class applies rotation
		this.terminals = [
			{ x: -halfLength, y: 0 },
			{ x: halfLength, y: 0 },
		];
	}

	/**
	 * Override rotate to update terminals after rotation
	 * @param {number} degrees - Degrees to rotate (typically 90)
	 */
	rotate(degrees) {
		super.rotate(degrees);
		this.updateTerminals();
	}

	/**
	 * Set the length of the wire segment
	 * @param {number} length - New length in grid units
	 */
	setLength(length) {
		if (length <= 0) {
			throw new Error('Wire segment length must be positive');
		}
		this.parameters.length = length;
		this.updateTerminals();
	}

	/**
	 * Validate wire segment-specific properties
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Wire segment should not have a label
		if (this.label !== '') {
			errors.push('Wire segment should not have a label');
		}

		// Validate length
		if (typeof this.parameters.length !== 'number' || this.parameters.length <= 0) {
			errors.push('Wire segment length must be a positive number');
		}

		// Wire segment should have exactly two terminals
		if (this.terminals.length !== 2) {
			errors.push('Wire segment must have exactly two terminals');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the wire segment to JSON format
	 * @returns {Object} JSON representation of the wire segment
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
				length: this.parameters.length,
			},
		};
	}

	/**
	 * Deserialize a wire segment from JSON format
	 * @param {Object} json - JSON representation of the wire segment
	 * @returns {WireSegment} A new WireSegment instance
	 */
	static fromJSON(json) {
		const segment = new WireSegment(
			json.x,
			json.y,
			json.parameters.length,
			json.rotation || 0,
		);
		segment.id = json.id;
		// Ensure label remains empty even if present in JSON
		segment.label = '';
		return segment;
	}
}
