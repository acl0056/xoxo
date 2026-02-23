import { generateUniqueId } from '@/utils/idGenerator';

/**
 * Wire class represents a connection between two nodes in the circuit
 * Supports multi-segment routing for flexible wire paths
 */
export class Wire {
	/**
	 * Create a new wire
	 * @param {Object} startNode - Start node reference {componentId: string, terminal: number}
	 * @param {Object} endNode - End node reference {componentId: string, terminal: number}
	 */
	constructor(startNode, endNode) {
		this.id = generateUniqueId();
		this.startNode = startNode; // {componentId: string, terminal: number}
		this.endNode = endNode; // {componentId: string, terminal: number}
		this.segments = []; // Array of {x, y} points for multi-segment wires
	}

	/**
	 * Add a segment point to the wire path
	 * Segments define corner points for multi-segment wire routing
	 * @param {number} x - X coordinate of the segment point
	 * @param {number} y - Y coordinate of the segment point
	 * @returns {Object} The added segment point {x, y}
	 */
	addSegment(x, y) {
		const segment = { x, y };
		this.segments.push(segment);
		return segment;
	}

	/**
	 * Remove a segment point from the wire path
	 * @param {number} index - Index of the segment to remove
	 * @returns {Object|null} The removed segment, or null if index is invalid
	 */
	removeSegment(index) {
		if (index < 0 || index >= this.segments.length) {
			return null;
		}
		return this.segments.splice(index, 1)[0];
	}

	/**
	 * Get a segment point by index
	 * @param {number} index - Index of the segment
	 * @returns {Object|null} The segment point {x, y}, or null if index is invalid
	 */
	getSegment(index) {
		if (index < 0 || index >= this.segments.length) {
			return null;
		}
		return this.segments[index];
	}

	/**
	 * Update a segment point's position
	 * @param {number} index - Index of the segment to update
	 * @param {number} x - New X coordinate
	 * @param {number} y - New Y coordinate
	 * @returns {boolean} True if update was successful, false if index is invalid
	 */
	updateSegment(index, x, y) {
		if (index < 0 || index >= this.segments.length) {
			return false;
		}
		this.segments[index] = { x, y };
		return true;
	}

	/**
	 * Clear all segment points
	 * Results in a direct wire from start to end node
	 */
	clearSegments() {
		this.segments = [];
	}

	/**
	 * Get the total number of segments
	 * @returns {number} Number of segment points
	 */
	getSegmentCount() {
		return this.segments.length;
	}

	/**
	 * Validate the wire structure
	 * Checks for required fields and valid segment data
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const errors = [];

		// Check required fields
		if (!this.id) {
			errors.push('Wire must have an id');
		}

		if (!this.startNode) {
			errors.push('Wire must have a startNode');
		} else {
			if (!this.startNode.componentId) {
				errors.push('Wire startNode must have a componentId');
			}
			if (typeof this.startNode.terminal !== 'number') {
				errors.push('Wire startNode must have a terminal number');
			}
		}

		if (!this.endNode) {
			errors.push('Wire must have an endNode');
		} else {
			if (!this.endNode.componentId) {
				errors.push('Wire endNode must have a componentId');
			}
			if (typeof this.endNode.terminal !== 'number') {
				errors.push('Wire endNode must have a terminal number');
			}
		}

		// Validate segments
		if (!Array.isArray(this.segments)) {
			errors.push('Wire segments must be an array');
		} else {
			this.segments.forEach((segment, index) => {
				if (typeof segment.x !== 'number' || !Number.isFinite(segment.x)) {
					errors.push(`Segment ${index} x coordinate must be a finite number`);
				}
				if (typeof segment.y !== 'number' || !Number.isFinite(segment.y)) {
					errors.push(`Segment ${index} y coordinate must be a finite number`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the wire to JSON format
	 * @returns {Object} JSON representation of the wire
	 */
	toJSON() {
		return {
			id: this.id,
			startNode: {
				componentId: this.startNode.componentId,
				terminal: this.startNode.terminal,
			},
			endNode: {
				componentId: this.endNode.componentId,
				terminal: this.endNode.terminal,
			},
			segments: this.segments.map((segment) => ({
				x: segment.x,
				y: segment.y,
			})),
		};
	}

	/**
	 * Deserialize a wire from JSON format
	 * @param {Object} json - JSON representation of the wire
	 * @returns {Wire} A new Wire instance
	 */
	static fromJSON(json) {
		const wire = new Wire(json.startNode, json.endNode);
		wire.id = json.id;
		wire.segments = json.segments || [];
		return wire;
	}
}
