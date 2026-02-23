import { generateUniqueId } from '@/utils/idGenerator';

/**
 * TextAnnotation class represents a text label on the circuit canvas
 * Annotations are visual only and do not affect circuit simulation
 */
export class TextAnnotation {
	/**
	 * Create a new text annotation
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 * @param {string} text - Annotation text content
	 */
	constructor(x, y, text) {
		this.id = generateUniqueId();
		this.x = x;
		this.y = y;
		this.text = text;
		this.fontSize = 12;
	}

	/**
	 * Validate the annotation's properties
	 * Checks for required fields and valid values
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const errors = [];

		// Check required fields
		if (!this.id) {
			errors.push('Annotation must have an id');
		}

		// Validate position
		if (typeof this.x !== 'number' || !Number.isFinite(this.x)) {
			errors.push('Annotation x position must be a finite number');
		}

		if (typeof this.y !== 'number' || !Number.isFinite(this.y)) {
			errors.push('Annotation y position must be a finite number');
		}

		// Validate text
		if (typeof this.text !== 'string') {
			errors.push('Annotation text must be a string');
		}

		// Validate fontSize
		if (typeof this.fontSize !== 'number' || !Number.isFinite(this.fontSize)) {
			errors.push('Annotation fontSize must be a finite number');
		} else if (this.fontSize < 8 || this.fontSize > 72) {
			errors.push('Annotation fontSize must be between 8 and 72');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the annotation to JSON format
	 * @returns {Object} JSON representation of the annotation
	 */
	toJSON() {
		return {
			id: this.id,
			x: this.x,
			y: this.y,
			text: this.text,
			fontSize: this.fontSize,
		};
	}

	/**
	 * Deserialize an annotation from JSON format
	 * @param {Object} json - JSON representation of the annotation
	 * @returns {TextAnnotation} A new TextAnnotation instance
	 */
	static fromJSON(json) {
		const annotation = new TextAnnotation(json.x, json.y, json.text);
		annotation.id = json.id;
		annotation.fontSize = json.fontSize !== undefined ? json.fontSize : 12;
		return annotation;
	}
}
