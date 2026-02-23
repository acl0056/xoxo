import { Wire } from './Wire';
import { TextAnnotation } from './TextAnnotation';
import { Resistor } from './Resistor';
import { Capacitor } from './Capacitor';
import { Inductor } from './Inductor';
import { Speaker } from './Speaker';
import { VoltageSource } from './VoltageSource';
import { Ground } from './Ground';

/**
 * Circuit class represents a complete crossover network design
 * Manages components, wires, nodes, and annotations
 */
export class Circuit {
	constructor() {
		this.components = []; // Array of Component instances
		this.wires = []; // Array of Wire instances
		this.nodes = []; // Array of Node instances (derived from wires)
		this.annotations = []; // Array of TextAnnotation instances
		this.metadata = {
			name: '',
			created: new Date().toISOString(),
			modified: new Date().toISOString(),
			version: '1.0',
		};
	}

	/**
	 * Add a component to the circuit
	 * @param {Component} component - The component to add
	 * @returns {Component} The added component
	 */
	addComponent(component) {
		if (!component || !component.id) {
			throw new Error('Invalid component: must have an id');
		}

		// Check for duplicate IDs
		const existingComponent = this.components.find((c) => c.id === component.id);
		if (existingComponent) {
			throw new Error(`Component with id ${component.id} already exists`);
		}

		this.components.push(component);
		this.updateModifiedTimestamp();
		return component;
	}

	/**
	 * Remove a component from the circuit
	 * @param {string} componentId - The ID of the component to remove
	 * @returns {Component|null} The removed component, or null if not found
	 */
	removeComponent(componentId) {
		const index = this.components.findIndex((c) => c.id === componentId);
		if (index === -1) {
			return null;
		}

		const removedComponent = this.components.splice(index, 1)[0];

		// Remove any wires connected to this component
		this.wires = this.wires.filter((wire) => {
			const connectedToComponent = 				wire.startNode.componentId === componentId
				|| wire.endNode.componentId === componentId;
			return !connectedToComponent;
		});

		this.updateModifiedTimestamp();
		return removedComponent;
	}

	/**
	 * Get a component by its ID
	 * @param {string} componentId - The ID of the component to find
	 * @returns {Component|undefined} The component, or undefined if not found
	 */
	getComponent(componentId) {
		return this.components.find((c) => c.id === componentId);
	}

	/**
	 * Update a component in the circuit
	 * @param {string} componentId - The ID of the component to update
	 * @param {Object} updates - Object containing properties to update
	 * @returns {Component|null} The updated component, or null if not found
	 */
	updateComponent(componentId, updates) {
		const component = this.getComponent(componentId);
		if (!component) {
			return null;
		}

		Object.assign(component, updates);
		this.updateModifiedTimestamp();
		return component;
	}

	/**
	 * Add a wire to the circuit
	 * @param {Wire} wire - The wire to add
	 * @returns {Wire} The added wire
	 */
	addWire(wire) {
		if (!wire || !wire.id) {
			throw new Error('Invalid wire: must have an id');
		}

		// Check for duplicate IDs
		const existingWire = this.wires.find((w) => w.id === wire.id);
		if (existingWire) {
			throw new Error(`Wire with id ${wire.id} already exists`);
		}

		// Validate that referenced components exist
		const startComponent = this.getComponent(wire.startNode.componentId);
		const endComponent = this.getComponent(wire.endNode.componentId);

		if (!startComponent) {
			throw new Error(`Start component ${wire.startNode.componentId} not found`);
		}
		if (!endComponent) {
			throw new Error(`End component ${wire.endNode.componentId} not found`);
		}

		this.wires.push(wire);
		this.updateModifiedTimestamp();
		return wire;
	}

	/**
	 * Remove a wire from the circuit
	 * @param {string} wireId - The ID of the wire to remove
	 * @returns {Wire|null} The removed wire, or null if not found
	 */
	removeWire(wireId) {
		const index = this.wires.findIndex((w) => w.id === wireId);
		if (index === -1) {
			return null;
		}

		const removedWire = this.wires.splice(index, 1)[0];
		this.updateModifiedTimestamp();
		return removedWire;
	}

	/**
	 * Get a wire by its ID
	 * @param {string} wireId - The ID of the wire to find
	 * @returns {Wire|undefined} The wire, or undefined if not found
	 */
	getWire(wireId) {
		return this.wires.find((w) => w.id === wireId);
	}

	/**
	 * Add an annotation to the circuit
	 * @param {TextAnnotation} annotation - The annotation to add
	 * @returns {TextAnnotation} The added annotation
	 */
	addAnnotation(annotation) {
		if (!annotation || !annotation.id) {
			throw new Error('Invalid annotation: must have an id');
		}

		// Check for duplicate IDs
		const existingAnnotation = this.annotations.find((a) => a.id === annotation.id);
		if (existingAnnotation) {
			throw new Error(`Annotation with id ${annotation.id} already exists`);
		}

		this.annotations.push(annotation);
		this.updateModifiedTimestamp();
		return annotation;
	}

	/**
	 * Remove an annotation from the circuit
	 * @param {string} annotationId - The ID of the annotation to remove
	 * @returns {TextAnnotation|null} The removed annotation, or null if not found
	 */
	removeAnnotation(annotationId) {
		const index = this.annotations.findIndex((a) => a.id === annotationId);
		if (index === -1) {
			return null;
		}

		const removedAnnotation = this.annotations.splice(index, 1)[0];
		this.updateModifiedTimestamp();
		return removedAnnotation;
	}

	/**
	 * Get an annotation by its ID
	 * @param {string} annotationId - The ID of the annotation to find
	 * @returns {TextAnnotation|undefined} The annotation, or undefined if not found
	 */
	getAnnotation(annotationId) {
		return this.annotations.find((a) => a.id === annotationId);
	}

	/**
	 * Update an annotation in the circuit
	 * @param {string} annotationId - The ID of the annotation to update
	 * @param {Object} updates - Object containing properties to update
	 * @returns {TextAnnotation|null} The updated annotation, or null if not found
	 */
	updateAnnotation(annotationId, updates) {
		const annotation = this.getAnnotation(annotationId);
		if (!annotation) {
			return null;
		}

		Object.assign(annotation, updates);
		this.updateModifiedTimestamp();
		return annotation;
	}

	/**
	 * Find all components connected to a starting component
	 * Uses depth-first search to traverse wire connections
	 * @param {Component|string} startComponent - The starting component or its ID
	 * @returns {Component[]} Array of connected components (including the start component)
	 */
	findConnectedComponents(startComponent) {
		const startId = typeof startComponent === 'string' ? startComponent : startComponent.id;
		const startComp = this.getComponent(startId);

		if (!startComp) {
			return [];
		}

		const visited = new Set();
		const connected = [];
		const stack = [startId];

		while (stack.length > 0) {
			const currentId = stack.pop();

			if (visited.has(currentId)) {
				continue;
			}

			visited.add(currentId);
			const component = this.getComponent(currentId);
			if (component) {
				connected.push(component);
			}

			// Find all wires connected to this component
			const connectedWires = this.wires.filter((wire) => wire.startNode.componentId === currentId
				|| wire.endNode.componentId === currentId);

			// Add connected components to the stack
			connectedWires.forEach((wire) => {
				const otherComponentId = wire.startNode.componentId === currentId
					? wire.endNode.componentId
					: wire.startNode.componentId;

				if (!visited.has(otherComponentId)) {
					stack.push(otherComponentId);
				}
			});
		}

		return connected;
	}

	/**
	 * Validate the circuit structure
	 * Checks for common issues like floating nodes, missing ground, etc.
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const errors = [];

		// Check if circuit has at least one component
		if (this.components.length === 0) {
			errors.push('Circuit has no components');
		}

		// Check for ground component
		const hasGround = this.components.some((c) => c.type === 'ground');
		if (!hasGround && this.components.length > 0) {
			errors.push('Circuit has no ground reference');
		}

		// Check for voltage source
		const hasSource = this.components.some((c) => c.type === 'source');
		if (!hasSource && this.components.length > 0) {
			errors.push('Circuit has no voltage source');
		}

		// Check for invalid wire references
		this.wires.forEach((wire) => {
			const startComponent = this.getComponent(wire.startNode.componentId);
			const endComponent = this.getComponent(wire.endNode.componentId);

			if (!startComponent) {
				errors.push(`Wire ${wire.id} references non-existent start component ${wire.startNode.componentId}`);
			}
			if (!endComponent) {
				errors.push(`Wire ${wire.id} references non-existent end component ${wire.endNode.componentId}`);
			}
		});

		// Check for duplicate component labels
		const labelCounts = {};
		this.components.forEach((component) => {
			if (component.label) {
				labelCounts[component.label] = (labelCounts[component.label] || 0) + 1;
			}
		});

		Object.entries(labelCounts).forEach(([label, count]) => {
			if (count > 1) {
				errors.push(`Duplicate component label: ${label} (used ${count} times)`);
			}
		});

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Update the modified timestamp
	 * @private
	 */
	updateModifiedTimestamp() {
		this.metadata.modified = new Date().toISOString();
	}

	/**
	 * Serialize the circuit to JSON format
	 * @returns {Object} JSON representation of the circuit
	 */
	toJSON() {
		return {
			version: this.metadata.version,
			metadata: {
				name: this.metadata.name,
				created: this.metadata.created,
				modified: this.metadata.modified,
			},
			components: this.components.map((c) => (c.toJSON ? c.toJSON() : c)),
			wires: this.wires.map((w) => (w.toJSON ? w.toJSON() : w)),
			annotations: this.annotations.map((a) => (a.toJSON ? a.toJSON() : a)),
		};
	}

	/**
	 * Deserialize a circuit from JSON format
	 * @param {Object} json - JSON representation of the circuit
	 * @returns {Circuit} A new Circuit instance
	 */
	static fromJSON(json) {
		const circuit = new Circuit();

		// Set metadata
		circuit.metadata.version = json.version || '1.0';
		circuit.metadata.name = json.metadata?.name || '';
		circuit.metadata.created = json.metadata?.created || new Date().toISOString();
		circuit.metadata.modified = json.metadata?.modified || new Date().toISOString();

		// Deserialize components using their specific class fromJSON methods
		circuit.components = (json.components || []).map((componentData) => {
			switch (componentData.type) {
			case 'resistor':
				return Resistor.fromJSON(componentData);
			case 'capacitor':
				return Capacitor.fromJSON(componentData);
			case 'inductor':
				return Inductor.fromJSON(componentData);
			case 'speaker':
				return Speaker.fromJSON(componentData);
			case 'source':
				return VoltageSource.fromJSON(componentData);
			case 'ground':
				return Ground.fromJSON(componentData);
			default:
				throw new Error(`Unknown component type: ${componentData.type}`);
			}
		});

		// Deserialize wires using Wire.fromJSON
		circuit.wires = (json.wires || []).map((wireData) => Wire.fromJSON(wireData));

		// Deserialize annotations using TextAnnotation.fromJSON
		circuit.annotations = (json.annotations || []).map((annotationData) => TextAnnotation.fromJSON(annotationData));

		return circuit;
	}
}
