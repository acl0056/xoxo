import { generateUniqueId } from '@/utils/idGenerator';

/**
 * Component base class for all circuit components
 * Provides common properties and behavior for resistors, capacitors, inductors,
 * speakers, ground, and voltage sources
 */
export class Component {
	/**
	 * Create a new component
	 * @param {string} type - Component type ('resistor', 'capacitor', 'inductor', 'speaker', 'ground', 'source', 'peq', 'filter', 'opamp')
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(type, x, y) {
		this.id = generateUniqueId();
		this.type = type; // 'resistor', 'capacitor', 'inductor', 'speaker', 'ground', 'source', 'peq', 'filter', 'opamp'
		this.label = ''; // Auto-assigned (R1, C1, L1, S1, A0, etc.)
		this.x = x; // Grid position X
		this.y = y; // Grid position Y
		this.rotation = 0; // 0, 90, 180, 270 degrees
		this.terminals = []; // Array of terminal positions
		this.parameters = {}; // Component-specific parameters
	}

	/**
	 * Get the position of a terminal relative to the component's position
	 * Takes rotation into account
	 * @param {number} terminalIndex - Index of the terminal
	 * @returns {Object|null} Terminal position {x, y} or null if invalid index
	 */
	getTerminalPosition(terminalIndex) {
		if (terminalIndex < 0 || terminalIndex >= this.terminals.length) {
			return null;
		}

		const terminal = this.terminals[terminalIndex];
		const radians = (this.rotation * Math.PI) / 180;
		const cos = Math.cos(radians);
		const sin = Math.sin(radians);

		// Apply rotation transformation
		const rotatedX = terminal.x * cos - terminal.y * sin;
		const rotatedY = terminal.x * sin + terminal.y * cos;

		return {
			x: this.x + rotatedX,
			y: this.y + rotatedY,
		};
	}

	/**
	 * Rotate the component by a specified number of degrees
	 * Rotation is normalized to 0, 90, 180, or 270 degrees
	 * @param {number} degrees - Degrees to rotate (typically 90 or -90)
	 */
	rotate(degrees) {
		this.rotation = (this.rotation + degrees) % 360;
		if (this.rotation < 0) {
			this.rotation += 360;
		}
		// Normalize to 0, 90, 180, 270
		this.rotation = Math.round(this.rotation / 90) * 90;
	}

	/**
	 * Validate the component's properties
	 * Checks for required fields and valid values
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const errors = [];

		// Check required fields
		if (!this.id) {
			errors.push('Component must have an id');
		}

		if (!this.type) {
			errors.push('Component must have a type');
		}

		// Validate type
		const validTypes = ['resistor', 'capacitor', 'inductor', 'speaker', 'ground', 'source', 'peq', 'filter', 'opamp'];
		if (this.type && !validTypes.includes(this.type)) {
			errors.push(`Invalid component type: ${this.type}`);
		}

		// Validate position
		if (typeof this.x !== 'number' || !Number.isFinite(this.x)) {
			errors.push('Component x position must be a finite number');
		}

		if (typeof this.y !== 'number' || !Number.isFinite(this.y)) {
			errors.push('Component y position must be a finite number');
		}

		// Validate rotation
		const validRotations = [0, 90, 180, 270];
		if (!validRotations.includes(this.rotation)) {
			errors.push(`Invalid rotation: ${this.rotation}. Must be 0, 90, 180, or 270`);
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the component to JSON format
	 * @returns {Object} JSON representation of the component
	 */
	toJSON() {
		return {
			id: this.id,
			type: this.type,
			label: this.label,
			x: this.x,
			y: this.y,
			rotation: this.rotation,
			parameters: this.parameters,
		};
	}

	/**
	 * Deserialize a component from JSON format
	 * @param {Object} json - JSON representation of the component
	 * @returns {Component} A new Component instance
	 */
	static fromJSON(json) {
		const component = new Component(json.type, json.x, json.y);
		component.id = json.id;
		component.label = json.label || '';
		component.rotation = json.rotation || 0;
		component.parameters = json.parameters || {};
		component.terminals = json.terminals || [];
		return component;
	}
}
