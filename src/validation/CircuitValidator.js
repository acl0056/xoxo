/**
 * Circuit Validator
 *
 * Validates circuit topology and detects common errors:
 * - Floating nodes (nodes not connected to ground or voltage source)
 * - Short circuits (direct connections between voltage source terminals)
 * - Missing ground reference
 * - Disconnected components (components not in signal path)
 */

class CircuitValidator {
	constructor(circuit) {
		this.circuit = circuit;
		this.errors = [];
		this.warnings = [];
	}

	/**
	 * Validate the circuit and return all errors and warnings
	 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
	 */
	validate() {
		this.errors = [];
		this.warnings = [];

		// Basic structural validation
		this.validateBasicStructure();

		// Topology validation
		this.detectFloatingNodes();
		this.detectShortCircuits();
		this.detectDisconnectedComponents();

		return {
			valid: this.errors.length === 0,
			errors: this.errors,
			warnings: this.warnings,
		};
	}

	/**
	 * Validate basic circuit structure (ground, source, components)
	 * @private
	 */
	validateBasicStructure() {
		// Check if circuit has at least one component
		if (this.circuit.components.length === 0) {
			this.errors.push('Circuit has no components');
			return;
		}

		// Check for ground component
		const hasGround = this.circuit.components.some((c) => c.type === 'ground');
		if (!hasGround) {
			this.errors.push('Circuit has no ground reference');
		}

		// Check for voltage source
		const hasSource = this.circuit.components.some((c) => c.type === 'source');
		if (!hasSource) {
			this.errors.push('Circuit has no voltage source');
		}

		// Check for invalid wire references
		this.circuit.wires.forEach((wire) => {
			const startComponent = this.circuit.getComponent(wire.startNode.componentId);
			const endComponent = this.circuit.getComponent(wire.endNode.componentId);

			if (!startComponent) {
				this.errors.push(`Wire ${wire.id} references non-existent start component ${wire.startNode.componentId}`);
			}
			if (!endComponent) {
				this.errors.push(`Wire ${wire.id} references non-existent end component ${wire.endNode.componentId}`);
			}
		});

		// Check for duplicate component labels
		const labelCounts = {};
		this.circuit.components.forEach((component) => {
			if (component.label) {
				labelCounts[component.label] = (labelCounts[component.label] || 0) + 1;
			}
		});

		Object.entries(labelCounts).forEach(([label, count]) => {
			if (count > 1) {
				this.errors.push(`Duplicate component label: ${label} (used ${count} times)`);
			}
		});
	}

	/**
	 * Detect floating nodes - nodes not connected to ground or voltage source
	 *
	 * A floating node is a node that is not part of a complete circuit path
	 * from the voltage source to ground. This can happen when:
	 * - A component is placed but not connected
	 * - A wire is connected to only one component
	 * - A group of components forms an isolated island
	 *
	 * Note: We only report components as floating if they have wires connected
	 * but aren't part of the main circuit. Components with no wires are handled
	 * by the disconnected component detection.
	 *
	 * @private
	 */
	detectFloatingNodes() {
		// Build a graph of all connections
		const nodeGraph = this.buildNodeGraph();

		// Find ground nodes
		const groundNodes = this.circuit.components
			.filter((c) => c.type === 'ground')
			.map((c) => this.getNodeKey(c.id, 0));

		// Find voltage source
		const source = this.circuit.components.find((c) => c.type === 'source');

		if (groundNodes.length === 0 || !source) {
			// Already reported in basic structure validation
			return;
		}

		// Find all nodes in the connected component that includes ground
		// This represents the main circuit
		const mainCircuitNodes = new Set();
		groundNodes.forEach((groundNode) => {
			this.traverseGraph(nodeGraph, groundNode, mainCircuitNodes);
		});

		// Check if source is in the main circuit
		const sourceNodes = [
			this.getNodeKey(source.id, 0),
			this.getNodeKey(source.id, 1),
		];

		const sourceInMainCircuit = sourceNodes.some((node) => mainCircuitNodes.has(node));
		if (!sourceInMainCircuit) {
			this.errors.push('Circuit is not complete: voltage source is not connected to ground');
			return;
		}

		// Find which nodes have wires connected (these are the ones we care about)
		const nodesWithWires = new Set();
		this.circuit.wires.forEach((wire) => {
			const startNode = this.getNodeKey(wire.startNode.componentId, wire.startNode.terminal);
			const endNode = this.getNodeKey(wire.endNode.componentId, wire.endNode.terminal);
			nodesWithWires.add(startNode);
			nodesWithWires.add(endNode);
		});

		// Check for floating nodes - nodes with wires that aren't in the main circuit
		const floatingNodes = [];
		nodesWithWires.forEach((node) => {
			if (!mainCircuitNodes.has(node)) {
				floatingNodes.push(node);
			}
		});

		// Report floating nodes
		if (floatingNodes.length > 0) {
			const componentIds = new Set();
			floatingNodes.forEach((nodeKey) => {
				const [componentId] = nodeKey.split(':');
				componentIds.add(componentId);
			});

			componentIds.forEach((componentId) => {
				const component = this.circuit.getComponent(componentId);
				if (component) {
					const label = component.label || component.type;
					this.errors.push(`Floating node detected: ${label} (${componentId}) has wires but is not connected to the main circuit`);
				}
			});
		}
	}

	/**
	 * Detect short circuits - direct connections between voltage source terminals
	 *
	 * A short circuit occurs when the positive and negative terminals of the
	 * voltage source are connected through a path with zero or very low resistance.
	 *
	 * @private
	 */
	detectShortCircuits() {
		// Find voltage source
		const source = this.circuit.components.find((c) => c.type === 'source');
		if (!source) {
			return;
		}

		// Build a graph excluding resistive components
		const nodeGraph = this.buildNodeGraph({ excludeResistive: true });

		// Check if positive and negative terminals are directly connected
		const positiveNode = this.getNodeKey(source.id, 0);
		const negativeNode = this.getNodeKey(source.id, 1);

		const reachableFromPositive = new Set();
		this.traverseGraph(nodeGraph, positiveNode, reachableFromPositive);

		if (reachableFromPositive.has(negativeNode)) {
			this.errors.push('Short circuit detected: voltage source terminals are directly connected without resistance');
		}
	}

	/**
	 * Detect disconnected components - components not in the signal path
	 *
	 * A disconnected component is one that is not part of the path from
	 * the voltage source to any speaker. These components don't affect
	 * the simulation and should be excluded or reported as warnings.
	 *
	 * @private
	 */
	detectDisconnectedComponents() {
		// Find voltage source
		const source = this.circuit.components.find((c) => c.type === 'source');
		if (!source) {
			return;
		}

		// Find all speakers
		const speakers = this.circuit.components.filter((c) => c.type === 'speaker');
		if (speakers.length === 0) {
			this.warnings.push('Circuit has no speakers');
			return;
		}

		// Build node graph
		const nodeGraph = this.buildNodeGraph();

		// Find all components reachable from voltage source
		const sourceNodes = [
			this.getNodeKey(source.id, 0),
			this.getNodeKey(source.id, 1),
		];

		const reachableNodes = new Set();
		sourceNodes.forEach((sourceNode) => {
			this.traverseGraph(nodeGraph, sourceNode, reachableNodes);
		});

		// Extract component IDs from reachable nodes
		const reachableComponentIds = new Set();
		reachableNodes.forEach((nodeKey) => {
			const [componentId] = nodeKey.split(':');
			reachableComponentIds.add(componentId);
		});

		// Check if all speakers are reachable
		speakers.forEach((speaker) => {
			if (!reachableComponentIds.has(speaker.id)) {
				const label = speaker.label || 'Speaker';
				this.warnings.push(`Disconnected component: ${label} (${speaker.id}) is not in the signal path from voltage source`);
			}
		});

		// Check for other disconnected components (excluding ground)
		this.circuit.components.forEach((component) => {
			if (component.type === 'ground') {
				return; // Ground doesn't need to be in signal path
			}

			if (!reachableComponentIds.has(component.id)) {
				const label = component.label || component.type;
				this.warnings.push(`Disconnected component: ${label} (${component.id}) is not connected to the circuit`);
			}
		});
	}

	/**
	 * Build a graph representation of circuit connections
	 *
	 * @param {Object} options - Options for graph building
	 * @param {boolean} options.excludeResistive - Exclude resistive components (for short circuit detection)
	 * @returns {Object} Node graph where keys are node IDs and values are arrays of connected node IDs
	 * @private
	 */
	buildNodeGraph(options = {}) {
		const { excludeResistive = false } = options;
		const graph = {};

		// Add all component terminals as nodes
		this.circuit.components.forEach((component) => {
			// Skip components in 'open' state (they're disconnected)
			if (component.parameters && component.parameters.state === 'open') {
				return;
			}

			const terminalCount = this.getTerminalCount(component);
			for (let i = 0; i < terminalCount; i++) {
				const nodeKey = this.getNodeKey(component.id, i);
				if (!graph[nodeKey]) {
					graph[nodeKey] = [];
				}
			}

			// For components in 'short' state, connect their terminals directly
			if (component.parameters && component.parameters.state === 'short') {
				if (terminalCount === 2) {
					const node0 = this.getNodeKey(component.id, 0);
					const node1 = this.getNodeKey(component.id, 1);
					graph[node0].push(node1);
					graph[node1].push(node0);
				}
			}

			// For resistive components, check if we should exclude them
			if (excludeResistive && this.isResistiveComponent(component)) {
				// Don't connect terminals through resistive components
				return;
			}

			// For normal components, terminals are connected through the component
			if (!component.parameters || component.parameters.state === 'normal') {
				if (terminalCount === 2) {
					const node0 = this.getNodeKey(component.id, 0);
					const node1 = this.getNodeKey(component.id, 1);
					graph[node0].push(node1);
					graph[node1].push(node0);
				}
			}
		});

		// Add wire connections
		this.circuit.wires.forEach((wire) => {
			const startNode = this.getNodeKey(wire.startNode.componentId, wire.startNode.terminal);
			const endNode = this.getNodeKey(wire.endNode.componentId, wire.endNode.terminal);

			if (graph[startNode] && graph[endNode]) {
				graph[startNode].push(endNode);
				graph[endNode].push(startNode);
			}
		});

		return graph;
	}

	/**
	 * Traverse graph using depth-first search
	 *
	 * @param {Object} graph - Node graph
	 * @param {string} startNode - Starting node key
	 * @param {Set} visited - Set of visited nodes
	 * @private
	 */
	traverseGraph(graph, startNode, visited) {
		if (visited.has(startNode)) {
			return;
		}

		visited.add(startNode);

		const neighbors = graph[startNode] || [];
		neighbors.forEach((neighbor) => {
			this.traverseGraph(graph, neighbor, visited);
		});
	}

	/**
	 * Get node key for a component terminal
	 *
	 * @param {string} componentId - Component ID
	 * @param {number} terminal - Terminal index
	 * @returns {string} Node key
	 * @private
	 */
	getNodeKey(componentId, terminal) {
		return `${componentId}:${terminal}`;
	}

	/**
	 * Get number of terminals for a component
	 *
	 * @param {Object} component - Component
	 * @returns {number} Number of terminals
	 * @private
	 */
	getTerminalCount(component) {
		switch (component.type) {
			case 'ground':
				return 1;
			case 'resistor':
			case 'capacitor':
			case 'inductor':
			case 'speaker':
			case 'source':
				return 2;
			default:
				return 0;
		}
	}

	/**
	 * Check if component is resistive (has resistance)
	 *
	 * @param {Object} component - Component
	 * @returns {boolean} True if component is resistive
	 * @private
	 */
	isResistiveComponent(component) {
		return component.type === 'resistor'
			|| (component.type === 'capacitor' && component.parameters.esr > 0)
			|| (component.type === 'inductor' && component.parameters.esr > 0);
	}
}

module.exports = CircuitValidator;
