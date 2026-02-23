import { generateUniqueId } from '@/utils/idGenerator';

/**
 * Node class represents a connection point in the circuit
 * Nodes are junction points where multiple wires can connect
 */
export class Node {
	/**
	 * Create a new node
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		this.id = generateUniqueId();
		this.x = x; // Grid position X
		this.y = y; // Grid position Y
		this.connectedWires = []; // Array of Wire IDs connected to this node
	}

	/**
	 * Add a wire connection to this node
	 * @param {string} wireId - The ID of the wire to connect
	 * @returns {boolean} True if wire was added, false if already connected
	 */
	addWire(wireId) {
		if (!wireId) {
			return false;
		}

		// Check if wire is already connected
		if (this.connectedWires.includes(wireId)) {
			return false;
		}

		this.connectedWires.push(wireId);
		return true;
	}

	/**
	 * Remove a wire connection from this node
	 * @param {string} wireId - The ID of the wire to disconnect
	 * @returns {boolean} True if wire was removed, false if not found
	 */
	removeWire(wireId) {
		const index = this.connectedWires.indexOf(wireId);
		if (index === -1) {
			return false;
		}

		this.connectedWires.splice(index, 1);
		return true;
	}

	/**
	 * Check if a wire is connected to this node
	 * @param {string} wireId - The ID of the wire to check
	 * @returns {boolean} True if wire is connected, false otherwise
	 */
	hasWire(wireId) {
		return this.connectedWires.includes(wireId);
	}

	/**
	 * Get the number of wires connected to this node
	 * @returns {number} Number of connected wires
	 */
	getWireCount() {
		return this.connectedWires.length;
	}

	/**
	 * Clear all wire connections from this node
	 */
	clearWires() {
		this.connectedWires = [];
	}

	/**
	 * Check if this node is at the same position as another node
	 * @param {Node|Object} other - Another node or position object with x and y properties
	 * @returns {boolean} True if positions match, false otherwise
	 */
	isAtSamePosition(other) {
		if (!other) {
			return false;
		}
		return this.x === other.x && this.y === other.y;
	}

	/**
	 * Validate the node structure
	 * Checks for required fields and valid values
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const errors = [];

		// Check required fields
		if (!this.id) {
			errors.push('Node must have an id');
		}

		// Validate position
		if (typeof this.x !== 'number' || !Number.isFinite(this.x)) {
			errors.push('Node x position must be a finite number');
		}

		if (typeof this.y !== 'number' || !Number.isFinite(this.y)) {
			errors.push('Node y position must be a finite number');
		}

		// Validate connectedWires array
		if (!Array.isArray(this.connectedWires)) {
			errors.push('Node connectedWires must be an array');
		} else {
			this.connectedWires.forEach((wireId, index) => {
				if (typeof wireId !== 'string' || wireId.length === 0) {
					errors.push(`Connected wire at index ${index} must be a non-empty string`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the node to JSON format
	 * @returns {Object} JSON representation of the node
	 */
	toJSON() {
		return {
			id: this.id,
			x: this.x,
			y: this.y,
			connectedWires: [...this.connectedWires],
		};
	}

	/**
	 * Deserialize a node from JSON format
	 * @param {Object} json - JSON representation of the node
	 * @returns {Node} A new Node instance
	 */
	static fromJSON(json) {
		const node = new Node(json.x, json.y);
		node.id = json.id;
		node.connectedWires = json.connectedWires || [];
		return node;
	}
}
