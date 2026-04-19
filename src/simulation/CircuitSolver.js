import Complex from 'complex.js';
import { complexLUSolve } from './ComplexLUSolver';

/**
 * Interpolate ZMA (impedance measurement) data at a given frequency.
 * Uses linear interpolation with edge clamping (same approach as FrequencyAnalyzer.interpolate).
 *
 * @param {{ frequencies: number[], impedances: number[], phases: number[] }} zmaData
 * @param {number} frequency - Frequency in Hz
 * @returns {{ magnitude: number, phaseDeg: number }} Interpolated impedance magnitude and phase in degrees
 */
function interpolateZMA(zmaData, frequency) {
	const { frequencies, impedances, phases } = zmaData;

	// Edge clamping: if frequency is at or below the lowest point, use the first point
	if (frequency <= frequencies[0]) {
		return { magnitude: impedances[0], phaseDeg: phases[0] };
	}

	// Edge clamping: if frequency is at or above the highest point, use the last point
	if (frequency >= frequencies[frequencies.length - 1]) {
		return {
			magnitude: impedances[impedances.length - 1],
			phaseDeg: phases[phases.length - 1],
		};
	}

	// Find surrounding points for linear interpolation
	let i = 0;
	while (i < frequencies.length - 1 && frequencies[i + 1] < frequency) {
		i++;
	}

	// Linear interpolation
	const x0 = frequencies[i];
	const x1 = frequencies[i + 1];
	const t = (frequency - x0) / (x1 - x0);

	const magnitude = impedances[i] + t * (impedances[i + 1] - impedances[i]);
	const phaseDeg = phases[i] + t * (phases[i + 1] - phases[i]);

	return { magnitude, phaseDeg };
}

/**
 * CircuitSolver implements Modified Nodal Analysis (MNA) for AC circuit simulation.
 * It solves the circuit at multiple frequency points to generate frequency response data.
 *
 * Uses flat Float64Array buffers and a custom complex LU solver for performance.
 * Matrix element (i, j) is stored at index [i * n + j] in row-major order.
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
				union(startNodeId, 'GROUND');
				union(endNodeId, 'GROUND');
			} else if (endIsGround) {
				union(endNodeId, 'GROUND');
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
	 * Fills pre-allocated Float64Array buffers directly using index arithmetic.
	 *
	 * @param {number} frequency - Frequency in Hz
	 * @param {Float64Array} Are - Real part of n×n matrix buffer, row-major
	 * @param {Float64Array} Aim - Imaginary part of n×n matrix buffer, row-major
	 * @param {Float64Array} bre - Real part of RHS vector buffer, length n
	 * @param {Float64Array} bim - Imaginary part of RHS vector buffer, length n
	 */
	buildMNAMatrix(frequency, Are, Aim, bre, bim) {
		const omega = 2 * Math.PI * frequency;
		const n = this.matrixSize;

		// Zero the buffers
		Are.fill(0);
		Aim.fill(0);
		bre.fill(0);
		bim.fill(0);

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
				this.addVoltageSource(Are, Aim, bre, bim, component, n1, n2, n);
			} else {
				const admittance = this.calculateAdmittance(component, omega);
				this.addPassiveComponent(Are, Aim, admittance.re, admittance.im, n1, n2, n);
			}
		}
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
				// Use frequency-dependent impedance from ZMA data when available
				if (component.zmaData && component.zmaData.frequencies && component.zmaData.frequencies.length > 0) {
					const frequency = omega / (2 * Math.PI);
					const { magnitude, phaseDeg } = interpolateZMA(component.zmaData, frequency);
					const phaseRad = phaseDeg * Math.PI / 180;
					const impedance = new Complex(
						magnitude * Math.cos(phaseRad),
						magnitude * Math.sin(phaseRad),
					);
					return new Complex(1, 0).div(impedance);
				}
				// Fallback: 8 ohms nominal when no ZMA data
				return new Complex(0.125, 0);
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
	 * Add a passive component's admittance to the MNA matrix using direct array stamping.
	 *
	 * @param {Float64Array} Are - Real part of matrix buffer
	 * @param {Float64Array} Aim - Imaginary part of matrix buffer
	 * @param {number} admittanceRe - Real part of admittance
	 * @param {number} admittanceIm - Imaginary part of admittance
	 * @param {number|null} n1 - Node 1 index (null if ground)
	 * @param {number|null} n2 - Node 2 index (null if ground)
	 * @param {number} n - Matrix dimension
	 */
	addPassiveComponent(Are, Aim, admittanceRe, admittanceIm, n1, n2, n) {
		// Add to diagonal elements
		if (n1 !== null) {
			Are[n1 * n + n1] += admittanceRe;
			Aim[n1 * n + n1] += admittanceIm;
		}
		if (n2 !== null) {
			Are[n2 * n + n2] += admittanceRe;
			Aim[n2 * n + n2] += admittanceIm;
		}

		// Add to off-diagonal elements (subtract admittance)
		if (n1 !== null && n2 !== null) {
			Are[n1 * n + n2] -= admittanceRe;
			Aim[n1 * n + n2] -= admittanceIm;
			Are[n2 * n + n1] -= admittanceRe;
			Aim[n2 * n + n1] -= admittanceIm;
		}
	}

	/**
	 * Add a voltage source to the MNA matrix using direct array stamping.
	 *
	 * @param {Float64Array} Are - Real part of matrix buffer
	 * @param {Float64Array} Aim - Imaginary part of matrix buffer
	 * @param {Float64Array} bre - Real part of RHS vector buffer
	 * @param {Float64Array} bim - Imaginary part of RHS vector buffer
	 * @param {Object} component - Voltage source component
	 * @param {number|null} n1 - Positive node index (null if ground)
	 * @param {number|null} n2 - Negative node index (null if ground)
	 * @param {number} n - Matrix dimension
	 */
	addVoltageSource(Are, Aim, bre, bim, component, n1, n2, n) {
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
			Are[n1 * n + currentIndex] = 1;
			Are[currentIndex * n + n1] = 1;
		}
		if (n2 !== null) {
			Are[n2 * n + currentIndex] = -1;
			Are[currentIndex * n + n2] = -1;
		}

		// Set voltage in b vector
		bre[currentIndex] = actualVoltage;
	}

	/**
	 * Solve the MNA system A*x = b at a given frequency using complexLUSolve.
	 * Returns node voltages and branch currents.
	 *
	 * @param {number} frequency - Frequency in Hz
	 * @param {Float64Array} Are - Real part of matrix buffer (will be zeroed and filled)
	 * @param {Float64Array} Aim - Imaginary part of matrix buffer (will be zeroed and filled)
	 * @param {Float64Array} bre - Real part of RHS vector buffer (will be zeroed and filled)
	 * @param {Float64Array} bim - Imaginary part of RHS vector buffer (will be zeroed and filled)
	 * @param {SimulationProfiler} [profiler] - Optional profiler for timing instrumentation
	 */
	solve(frequency, Are, Aim, bre, bim, profiler) {
		if (profiler) profiler.startStage('buildMNAMatrix');
		this.buildMNAMatrix(frequency, Are, Aim, bre, bim);
		if (profiler) profiler.endStage('buildMNAMatrix');

		try {
			// Clone buffers before LU solve since complexLUSolve modifies Are/Aim in place
			const n = this.matrixSize;
			const solveAre = new Float64Array(Are);
			const solveAim = new Float64Array(Aim);
			const solveBre = new Float64Array(bre);
			const solveBim = new Float64Array(bim);

			// Solve using custom complex LU decomposition
			if (profiler) profiler.startStage('lusolve');
			const { xre, xim } = complexLUSolve(n, solveAre, solveAim, solveBre, solveBim);
			if (profiler) profiler.endStage('lusolve');

			// Extract node voltages as plain object with {re, im} values
			if (profiler) profiler.startStage('extractResults');
			const nodeVoltages = {};
			for (const [nodeId, index] of this.nodeMap.entries()) {
				nodeVoltages[nodeId] = {
					re: xre[index],
					im: xim[index],
				};
			}

			// Extract voltage source currents as plain object with {re, im} values
			const sourceCurrents = {};
			for (const [sourceId, index] of this.voltageSourceMap.entries()) {
				sourceCurrents[sourceId] = {
					re: xre[index],
					im: xim[index],
				};
			}
			if (profiler) profiler.endStage('extractResults');

			return {
				frequency,
				nodeVoltages,
				sourceCurrents,
			};
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
	 * Pre-allocates Float64Array buffers once and reuses them across all iterations.
	 * Returns results with complex.js Complex objects for downstream consumption.
	 *
	 * @param {number} [startFrequency=1] - Start frequency in Hz
	 * @param {number} [endFrequency=100000] - End frequency in Hz
	 * @param {number} [pointsPerDecade=10] - Number of frequency points per decade
	 * @param {SimulationProfiler} [profiler] - Optional profiler for timing instrumentation
	 */
	solveAllFrequencies(startFrequency = 1, endFrequency = 100000, pointsPerDecade = 10, profiler) {
		// Build node map first
		let t0 = performance.now();
		if (profiler) profiler.startStage('buildNodeMap');
		this.buildNodeMap();
		if (profiler) profiler.endStage('buildNodeMap');
		console.log(`[SOLVER-PERF] buildNodeMap: ${(performance.now() - t0).toFixed(1)}ms, matrixSize: ${this.matrixSize}`);

		const n = this.matrixSize;

		// Pre-allocate buffers ONCE for the entire frequency sweep
		const Are = new Float64Array(n * n);
		const Aim = new Float64Array(n * n);
		const bre = new Float64Array(n);
		const bim = new Float64Array(n);

		// Generate frequency points
		this.frequencyPoints = this.generateFrequencyPoints(startFrequency, endFrequency, pointsPerDecade);
		console.log(`[SOLVER-PERF] frequency points: ${this.frequencyPoints.length}`);

		// Pre-compute component terminal info ONCE (topology doesn't change with frequency)
		const componentTerminalCache = [];
		for (const component of this.circuit.components) {
			if (component.type === 'ground') continue;
			if (component.parameters?.state === 'open') continue;

			const terminals = this.getComponentTerminals(component);
			if (terminals.length < 2) continue;

			const n1Raw = this.nodeMap.get(terminals[0]);
			const n2Raw = this.nodeMap.get(terminals[1]);
			const n1 = n1Raw !== undefined ? n1Raw : null;
			const n2 = n2Raw !== undefined ? n2Raw : null;

			componentTerminalCache.push({ component, n1, n2 });
		}

		// Solve at each frequency — track sub-step totals
		const perFrequencyResults = [];
		let totalLUSolve = 0;
		let totalExtract = 0;
		let totalClone = 0;
		let totalCalcAdmittance = 0;
		let totalStamping = 0;
		let totalZeroBuffers = 0;

		for (const frequency of this.frequencyPoints) {
			try {
				const omega = 2 * Math.PI * frequency;

				// Zero the buffers
				t0 = performance.now();
				Are.fill(0);
				Aim.fill(0);
				bre.fill(0);
				bim.fill(0);
				totalZeroBuffers += performance.now() - t0;

				// Stamp components using cached terminal info
				for (const { component, n1, n2 } of componentTerminalCache) {
					if (component.type === 'source') {
						t0 = performance.now();
						this.addVoltageSource(Are, Aim, bre, bim, component, n1, n2, n);
						totalStamping += performance.now() - t0;
					} else {
						t0 = performance.now();
						const admittance = this.calculateAdmittance(component, omega);
						totalCalcAdmittance += performance.now() - t0;

						t0 = performance.now();
						this.addPassiveComponent(Are, Aim, admittance.re, admittance.im, n1, n2, n);
						totalStamping += performance.now() - t0;
					}
				}

				t0 = performance.now();
				const solveAre = new Float64Array(Are);
				const solveAim = new Float64Array(Aim);
				const solveBre = new Float64Array(bre);
				const solveBim = new Float64Array(bim);
				totalClone += performance.now() - t0;

				t0 = performance.now();
				const { xre, xim } = complexLUSolve(n, solveAre, solveAim, solveBre, solveBim);
				totalLUSolve += performance.now() - t0;

				t0 = performance.now();
				const nodeVoltages = {};
				for (const [nodeId, index] of this.nodeMap.entries()) {
					nodeVoltages[nodeId] = { re: xre[index], im: xim[index] };
				}
				const sourceCurrents = {};
				for (const [sourceId, index] of this.voltageSourceMap.entries()) {
					sourceCurrents[sourceId] = { re: xre[index], im: xim[index] };
				}
				totalExtract += performance.now() - t0;

				perFrequencyResults.push({ frequency, nodeVoltages, sourceCurrents });
			} catch (error) {
				console.error(`Error solving at ${frequency} Hz:`, error.message);
			}
		}

		console.log(`[SOLVER-PERF] --- per-frequency breakdown ---`);
		console.log(`[SOLVER-PERF]   zero buffers: ${totalZeroBuffers.toFixed(1)}ms`);
		console.log(`[SOLVER-PERF]   calculateAdmittance: ${totalCalcAdmittance.toFixed(1)}ms`);
		console.log(`[SOLVER-PERF]   stamping (addPassive+addVoltage): ${totalStamping.toFixed(1)}ms`);
		console.log(`[SOLVER-PERF]   buffer clone: ${totalClone.toFixed(1)}ms`);
		console.log(`[SOLVER-PERF]   complexLUSolve: ${totalLUSolve.toFixed(1)}ms`);
		console.log(`[SOLVER-PERF]   extract results: ${totalExtract.toFixed(1)}ms`);

		// Transpose results into format expected by FrequencyAnalyzer:
		// { frequencies: [], componentVoltages: { componentId: [Complex, ...] }, sourceCurrents: { sourceId: [Complex, ...] } }
		const frequencies = perFrequencyResults.map((r) => r.frequency);

		// Build componentVoltages using cached terminal info
		const componentVoltages = {};
		for (const { component, n1, n2 } of componentTerminalCache) {
			if (component.type === 'wire-segment' || component.type === 'source') continue;

			const terminals = this.getComponentTerminals(component);
			const node1Id = terminals[0];
			const node2Id = terminals[1];

			const voltages = perFrequencyResults.map((result) => {
				const v1 = result.nodeVoltages[node1Id] || { re: 0, im: 0 };
				const v2 = result.nodeVoltages[node2Id] || { re: 0, im: 0 };
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

export { interpolateZMA };
export default CircuitSolver;
