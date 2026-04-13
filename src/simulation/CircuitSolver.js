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

		// Find ALL ground components
		const groundComponents = this.circuit.components.filter((component) => component.type === 'ground');
		if (groundComponents.length === 0) {
			throw new Error('Circuit must contain a ground node');
		}
		this.groundNodeId = groundComponents[0].id;
		const groundIds = new Set(groundComponents.map((g) => g.id));

		// Union-Find to merge terminals connected by wires into the same electrical node
		const parent = new Map();

		const find = (x) => {
			if (!parent.has(x)) parent.set(x, x);
			if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
			return parent.get(x);
		};

		const union = (a, b) => {
			const rootA = find(a);
			const rootB = find(b);
			if (rootA !== rootB) parent.set(rootA, rootB);
		};

		// Process all wires to merge connected terminals
		for (const wire of this.circuit.wires) {
			const startComponent = this.circuit.components.find((c) => c.id === wire.startNode.componentId);
			const endComponent = this.circuit.components.find((c) => c.id === wire.endNode.componentId);

			if (startComponent?.parameters?.state === 'open' || endComponent?.parameters?.state === 'open') {
				continue;
			}

			const startNodeId = `${wire.startNode.componentId}_${wire.startNode.terminal}`;
			const endNodeId = `${wire.endNode.componentId}_${wire.endNode.terminal}`;

			// If either endpoint is ground, mark both as ground
			const startIsGround = groundIds.has(wire.startNode.componentId);
			const endIsGround = groundIds.has(wire.endNode.componentId);

			if (startIsGround) {
				union(endNodeId, 'GROUND');
			} else if (endIsGround) {
				union(startNodeId, 'GROUND');
			} else {
				union(startNodeId, endNodeId);
			}
		}
		// Wire segments are handled as low-resistance components in the MNA matrix

		// Collect unique representative nodes, excluding ground
		const representativeToIndex = new Map();
		let nodeIndex = 0;

		// First pass: find all node IDs that belong to non-wire-segment components
		const allNodeIds = new Set();
		for (const wire of this.circuit.wires) {
			const startNodeId = `${wire.startNode.componentId}_${wire.startNode.terminal}`;
			const endNodeId = `${wire.endNode.componentId}_${wire.endNode.terminal}`;
			allNodeIds.add(startNodeId);
			allNodeIds.add(endNodeId);
		}

		// Assign matrix indices to unique representative nodes
		for (const nodeId of allNodeIds) {
			const rep = find(nodeId);
			if (rep === 'GROUND' || find(rep) === 'GROUND') continue;
			if (!representativeToIndex.has(rep)) {
				representativeToIndex.set(rep, nodeIndex);
				nodeIndex++;
			}
			// Map this nodeId to the same index as its representative
			this.nodeMap.set(nodeId, representativeToIndex.get(rep));
		}

		// Assign indices for voltage source currents
		let currentIndex = nodeIndex;
		for (const component of this.circuit.components) {
			if (component.type === 'source') {
				this.voltageSourceMap.set(component.id, currentIndex);
				currentIndex++;
			}
		}

		this.matrixSize = representativeToIndex.size + this.voltageSourceMap.size;
		return this.matrixSize;
	}

	/**
	 * Build the MNA matrix and right-hand side vector for a given frequency.
	 * Returns {A: matrix, b: vector} where A*x = b
	 */
	buildMNAMatrix(frequency) {
		const omega = 2 * Math.PI * frequency;
		const matrixSize = this.matrixSize;

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

			// Get node indices (undefined means ground — node was merged to GROUND in union-find)
			const n1Raw = this.nodeMap.get(node1Id);
			const n2Raw = this.nodeMap.get(node2Id);
			const n1 = n1Raw !== undefined ? n1Raw : null;
			const n2 = n2Raw !== undefined ? n2Raw : null;

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

			case 'wire-segment': {
				// Wire segment modeled as 1 milliohm resistance (~3 inches of 18 AWG copper)
				return new Complex(1000, 0); // Y = 1/0.001 = 1000 siemens
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

			// Extract node voltages as plain object with {re, im} values (per schema)
			const nodeVoltages = {};
			for (const [nodeId, index] of this.nodeMap.entries()) {
				const voltage = x.subset(math.index(index, 0));
				nodeVoltages[nodeId] = {
					re: typeof voltage === 'object' && voltage.re !== undefined ? voltage.re : (typeof voltage === 'number' ? voltage : 0),
					im: typeof voltage === 'object' && voltage.im !== undefined ? voltage.im : 0,
				};
			}

			// Extract voltage source currents as plain object with {re, im} values
			const sourceCurrents = {};
			for (const [sourceId, index] of this.voltageSourceMap.entries()) {
				const current = x.subset(math.index(index, 0));
				sourceCurrents[sourceId] = {
					re: typeof current === 'object' && current.re !== undefined ? current.re : (typeof current === 'number' ? current : 0),
					im: typeof current === 'object' && current.im !== undefined ? current.im : 0,
				};
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
		const perFrequencyResults = [];

		let loggedFirst = false;
		for (const frequency of this.frequencyPoints) {
			try {
				const result = this.solve(frequency);
				perFrequencyResults.push(result);

				// DEBUG: Log voltage at each speaker's nodes at 1kHz
				if (!loggedFirst && frequency >= 1000) {
					loggedFirst = true;
					console.log(`=== VOLTAGES AT ${frequency.toFixed(0)} Hz ===`);
					for (const comp of this.circuit.components) {
						if (comp.type === 'speaker' || comp.type === 'source') {
							const terms = this.getComponentTerminals(comp);
							if (terms.length >= 2) {
								const v0 = result.nodeVoltages[terms[0]] || { re: 0, im: 0 };
								const v1 = result.nodeVoltages[terms[1]] || { re: 0, im: 0 };
								const mag0 = Math.sqrt(v0.re ** 2 + v0.im ** 2);
								const mag1 = Math.sqrt(v1.re ** 2 + v1.im ** 2);
								const diff = Math.sqrt((v0.re - v1.re) ** 2 + (v0.im - v1.im) ** 2);
								console.log(`  ${comp.label || comp.type}: |V0|=${mag0.toFixed(4)} |V1|=${mag1.toFixed(4)} |Vdiff|=${diff.toFixed(6)} idx=[${this.nodeMap.get(terms[0])},${this.nodeMap.get(terms[1])}]`);
							}
						}
					}
					// Log wire-segment indices
					console.log('  Wire-segment node indices:');
					for (const comp of this.circuit.components) {
						if (comp.type === 'wire-segment') {
							const terms = this.getComponentTerminals(comp);
							if (terms.length >= 2) {
								const idx0 = this.nodeMap.get(terms[0]);
								const idx1 = this.nodeMap.get(terms[1]);
								const v0 = result.nodeVoltages[terms[0]] || { re: 0, im: 0 };
								const v1 = result.nodeVoltages[terms[1]] || { re: 0, im: 0 };
								const mag0 = Math.sqrt(v0.re ** 2 + v0.im ** 2);
								const mag1 = Math.sqrt(v1.re ** 2 + v1.im ** 2);
								console.log(`    ws at (${comp.x},${comp.y}) len=${comp.parameters.length} rot=${comp.rotation}: idx=[${idx0},${idx1}] |V|=[${mag0.toFixed(4)},${mag1.toFixed(4)}]`);
							} else {
								console.log(`    ws at (${comp.x},${comp.y}): only ${terms.length} terminals`);
							}
						}
					}
				}
			} catch (error) {
				console.error(`Error solving at ${frequency} Hz:`, error.message);
			}
		}

		// Transpose results into format expected by FrequencyAnalyzer:
		// { frequencies: [], componentVoltages: { componentId: [Complex, ...] }, sourceCurrents: { sourceId: [Complex, ...] } }
		const frequencies = perFrequencyResults.map((r) => r.frequency);

		// Build componentVoltages: for each component, collect voltage across its terminals at each frequency
		const componentVoltages = {};
		for (const component of this.circuit.components) {
			if (component.type === 'ground' || component.type === 'wire-segment') continue;

			const terminals = this.getComponentTerminals(component);

			if (terminals.length < 2) continue;

			const node1Id = terminals[0];
			const node2Id = terminals[1];

			const voltages = perFrequencyResults.map((result) => {
				const v1 = result.nodeVoltages[node1Id] || { re: 0, im: 0 };
				const v2 = result.nodeVoltages[node2Id] || { re: 0, im: 0 };
				// Voltage across component = V(node1) - V(node2)
				return new Complex(v1.re - v2.re, v1.im - v2.im);
			});

			componentVoltages[component.id] = voltages;
		}

		// Build sourceCurrents: for each source, collect current at each frequency
		const sourceCurrents = {};
		for (const [sourceId] of this.voltageSourceMap) {
			sourceCurrents[sourceId] = perFrequencyResults.map((result) => {
				const current = result.sourceCurrents[sourceId] || { re: 0, im: 0 };
				return new Complex(current.re, current.im);
			});
		}

		return {
			frequencies,
			componentVoltages,
			sourceCurrents,
		};
	}
}

export default CircuitSolver;
