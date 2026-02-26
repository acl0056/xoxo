import { create, all } from 'mathjs';
import Complex from 'complex.js';
import SchemaValidator from './SchemaValidator';

const math = create(all);

/**
 * CircuitSolver implements Modified Nodal Analysis (MNA) for AC circuit simulation.
 * It solves the circuit at multiple frequency points to generate frequency response data.
 */
class CircuitSolver {
	constructor(circuit) {
		this.circuit = circuit;
		this.nodeMap = new Map(); // Maps node IDs to matrix indices
		this.voltageSourceMap = new Map(); // Maps voltage source IDs to current variable indices
		this.frequencyPoints = [];
		this.groundNodeId = null;
	}

	/**
	 * Build a map of circuit nodes to matrix indices.
	 * Ground node is assigned index 0 and excluded from the matrix.
	 * Components in 'open' state are treated as disconnected.
	 */
	buildNodeMap() {
		this.nodeMap.clear();
		this.voltageSourceMap.clear();
		this.groundNodeId = null;

		// Find ground component
		const groundComponent = this.circuit.components.find((component) => component.type === 'ground');
		if (!groundComponent) {
			throw new Error('Circuit must contain a ground node');
		}
		this.groundNodeId = groundComponent.id;

		// Collect all unique nodes from wires, excluding ground
		const nodeSet = new Set();

		for (const wire of this.circuit.wires) {
			// Skip wires connected to components in 'open' state
			const startComponent = this.circuit.components.find((c) => c.id === wire.startNode.componentId);
			const endComponent = this.circuit.components.find((c) => c.id === wire.endNode.componentId);

			if (startComponent?.parameters?.state === 'open' || endComponent?.parameters?.state === 'open') {
				continue;
			}

			// Create unique node identifiers for component terminals
			const startNodeId = `${wire.startNode.componentId}_${wire.startNode.terminal}`;
			const endNodeId = `${wire.endNode.componentId}_${wire.endNode.terminal}`;

			if (wire.startNode.componentId !== this.groundNodeId) {
				nodeSet.add(startNodeId);
			}
			if (wire.endNode.componentId !== this.groundNodeId) {
				nodeSet.add(endNodeId);
			}
		}

		// Assign matrix indices to nodes (starting from 0, ground is not in matrix)
		let nodeIndex = 0;
		for (const nodeId of nodeSet) {
			this.nodeMap.set(nodeId, nodeIndex);
			nodeIndex++;
		}

		// Assign indices for voltage source currents
		let currentIndex = nodeIndex;
		for (const component of this.circuit.components) {
			if (component.type === 'source') {
				this.voltageSourceMap.set(component.id, currentIndex);
				currentIndex++;
			}
		}

		return this.nodeMap.size + this.voltageSourceMap.size;
	}

	/**
	 * Build the MNA matrix and right-hand side vector for a given frequency.
	 * Returns {A: matrix, b: vector} where A*x = b
	 */
	buildMNAMatrix(frequency) {
		const omega = 2 * Math.PI * frequency;
		const matrixSize = this.nodeMap.size + this.voltageSourceMap.size;

		// Initialize matrix A and vector b with zeros
		const A = math.zeros(matrixSize, matrixSize);
		const b = math.zeros(matrixSize, 1);

		// Process each component
		for (const component of this.circuit.components) {
			if (component.type === 'ground') {
				continue; // Ground is reference, not in matrix
			}

			// Skip components in 'open' state
			if (component.parameters?.state === 'open') {
				continue;
			}

			// Get component terminals
			const terminals = this.getComponentTerminals(component);
			if (terminals.length < 2) {
				continue; // Component not properly connected
			}

			const node1Id = terminals[0];
			const node2Id = terminals[1];

			// Get node indices (null if ground)
			const n1 = node1Id === this.groundNodeId ? null : this.nodeMap.get(node1Id);
			const n2 = node2Id === this.groundNodeId ? null : this.nodeMap.get(node2Id);

			// Calculate component admittance or handle voltage source
			if (component.type === 'source') {
				this.addVoltageSource(A, b, component, n1, n2);
			} else {
				const admittance = this.calculateAdmittance(component, omega);
				this.addPassiveComponent(A, admittance, n1, n2);
			}
		}

		return { A, b };
	}

	/**
	 * Get the terminal node IDs for a component based on wire connections.
	 */
	getComponentTerminals(component) {
		const terminals = [];

		// Find wires connected to this component
		for (const wire of this.circuit.wires) {
			if (wire.startNode.componentId === component.id) {
				const nodeId = `${component.id}_${wire.startNode.terminal}`;
				if (!terminals.includes(nodeId)) {
					terminals.push(nodeId);
				}
			}
			if (wire.endNode.componentId === component.id) {
				const nodeId = `${component.id}_${wire.endNode.terminal}`;
				if (!terminals.includes(nodeId)) {
					terminals.push(nodeId);
				}
			}
		}

		return terminals;
	}

	/**
	 * Calculate the complex admittance (Y = 1/Z) for a passive component.
	 */
	calculateAdmittance(component, omega) {
		const { type, parameters } = component;

		// Handle 'short' state as zero resistance
		if (parameters?.state === 'short') {
			return new Complex(1e12, 0); // Very high conductance (near short circuit)
		}

		switch (type) {
			case 'resistor': {
				const resistance = parameters.resistance || 1.0;
				return new Complex(1.0 / resistance, 0);
			}

			case 'capacitor': {
				const capacitance = parameters.capacitance || 1e-6;
				const esr = parameters.esr || 0;

				// Z = ESR + 1/(jωC)
				// Y = 1/Z = 1/(ESR + 1/(jωC))
				const capacitiveReactance = -1.0 / (omega * capacitance);
				const impedance = new Complex(esr, capacitiveReactance);
				return new Complex(1, 0).div(impedance);
			}

			case 'inductor': {
				const inductance = parameters.inductance || 1e-3;
				const esr = parameters.esr || 0;

				// Z = ESR + jωL
				// Y = 1/Z
				const inductiveReactance = omega * inductance;
				const impedance = new Complex(esr, inductiveReactance);
				return new Complex(1, 0).div(impedance);
			}

			case 'speaker': {
				// Speaker impedance comes from ZMA data
				// For now, use a simple model (will be enhanced in later tasks)
				return new Complex(0.125, 0); // 8 ohms nominal
			}

			default:
				return new Complex(0, 0); // Unknown component type
		}
	}

	/**
	 * Add a passive component's admittance to the MNA matrix.
	 */
	addPassiveComponent(A, admittance, n1, n2) {
		const real = admittance.re;
		const imag = admittance.im;

		// Add to diagonal elements
		if (n1 !== null) {
			A.subset(math.index(n1, n1), math.add(A.subset(math.index(n1, n1)), math.complex(real, imag)));
		}
		if (n2 !== null) {
			A.subset(math.index(n2, n2), math.add(A.subset(math.index(n2, n2)), math.complex(real, imag)));
		}

		// Add to off-diagonal elements
		if (n1 !== null && n2 !== null) {
			A.subset(math.index(n1, n2), math.subtract(A.subset(math.index(n1, n2)), math.complex(real, imag)));
			A.subset(math.index(n2, n1), math.subtract(A.subset(math.index(n2, n1)), math.complex(real, imag)));
		}
	}

	/**
	 * Add a voltage source to the MNA matrix.
	 */
	addVoltageSource(A, b, component, n1, n2) {
		const currentIndex = this.voltageSourceMap.get(component.id);
		if (currentIndex === undefined) {
			return;
		}

		// Calculate voltage from power and impedance: V = sqrt(P * Z)
		const power = component.parameters.power || 1.0;
		const impedance = component.parameters.impedance || 8.0;
		const voltage = Math.sqrt(power * impedance);
		const inverted = component.parameters.inverted || false;
		const actualVoltage = inverted ? -voltage : voltage;

		// Add voltage source stamps to matrix
		if (n1 !== null) {
			A.subset(math.index(n1, currentIndex), math.complex(1, 0));
			A.subset(math.index(currentIndex, n1), math.complex(1, 0));
		}
		if (n2 !== null) {
			A.subset(math.index(n2, currentIndex), math.complex(-1, 0));
			A.subset(math.index(currentIndex, n2), math.complex(-1, 0));
		}

		// Set voltage in b vector
		b.subset(math.index(currentIndex, 0), math.complex(actualVoltage, 0));
	}

	/**
	 * Solve the MNA system A*x = b at a given frequency.
	 * Returns node voltages and branch currents.
	 */
	solve(frequency) {
		const { A, b } = this.buildMNAMatrix(frequency);

		try {
			// Solve using LU decomposition
			const x = math.lusolve(A, b);

			// Extract node voltages
			const nodeVoltages = new Map();
			for (const [nodeId, index] of this.nodeMap.entries()) {
				const voltage = x.subset(math.index(index, 0));
				nodeVoltages.set(nodeId, voltage);
			}

			// Extract voltage source currents
			const sourceCurrents = new Map();
			for (const [sourceId, index] of this.voltageSourceMap.entries()) {
				const current = x.subset(math.index(index, 0));
				sourceCurrents.set(sourceId, current);
			}

			const result = {
				frequency,
				nodeVoltages,
				sourceCurrents,
			};

			// Validate result against schema
			const validation = SchemaValidator.validateSolverResult(result);
			if (!validation.valid) {
				console.warn(`Solver result validation warning at ${frequency} Hz:`, validation.errors);
			}

			return result;
		} catch (error) {
			throw new Error(`Failed to solve circuit at ${frequency} Hz: ${error.message}`);
		}
	}

	/**
	 * Generate logarithmically spaced frequency points.
	 */
	generateFrequencyPoints(startFrequency = 1, endFrequency = 100000, pointsPerDecade = 10) {
		const frequencies = [];
		const startLog = Math.log10(startFrequency);
		const endLog = Math.log10(endFrequency);
		const decades = endLog - startLog;
		const totalPoints = Math.ceil(decades * pointsPerDecade);

		for (let i = 0; i <= totalPoints; i++) {
			const logFreq = startLog + (i / totalPoints) * decades;
			const freq = 10 ** logFreq;
			frequencies.push(freq);
		}

		return frequencies;
	}

	/**
	 * Solve the circuit across all frequency points.
	 * Returns an array of results for each frequency.
	 */
	solveAllFrequencies(startFrequency = 1, endFrequency = 100000, pointsPerDecade = 10) {
		// Build node map first
		this.buildNodeMap();

		// Generate frequency points
		this.frequencyPoints = this.generateFrequencyPoints(startFrequency, endFrequency, pointsPerDecade);

		// Solve at each frequency
		const results = [];
		for (const frequency of this.frequencyPoints) {
			try {
				const result = this.solve(frequency);
				results.push(result);
			} catch (error) {
				console.error(`Error solving at ${frequency} Hz:`, error.message);
				// Continue with other frequencies
			}
		}

		return results;
	}
}

export default CircuitSolver;
