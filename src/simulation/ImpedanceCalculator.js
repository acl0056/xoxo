import Complex from 'complex.js';
import SchemaValidator from './SchemaValidator';

/**
 * ImpedanceCalculator class
 * Calculates input impedance of a circuit at each frequency point
 * Uses voltage and current data from CircuitSolver results
 */
class ImpedanceCalculator {
	/**
	 * Create a new ImpedanceCalculator
	 * @param {Circuit} circuit - The circuit being analyzed
	 * @param {Array} solverResults - Results from CircuitSolver.solveAllFrequencies()
	 */
	constructor(circuit, solverResults) {
		this.circuit = circuit;
		this.solverResults = solverResults;
	}

	/**
	 * Calculate input impedance at all frequencies
	 * @returns {Object} - {frequencies: number[], impedances: number[], phases: number[]}
	 */
	calculateInputImpedance() {
		const frequencies = [];
		const impedances = [];
		const phases = [];

		// Find voltage source component
		const voltageSource = this.circuit.components.find(
			(component) => component.type === 'source',
		);

		if (!voltageSource) {
			throw new Error('No voltage source found in circuit');
		}

		// Calculate voltage from power and impedance: V = sqrt(P * Z)
		const power = voltageSource.parameters.power || 1.0;
		const referenceImpedance = voltageSource.parameters.impedance || 8.0;
		const voltage = Math.sqrt(power * referenceImpedance);
		const inverted = voltageSource.parameters.inverted || false;
		const actualVoltage = inverted ? -voltage : voltage;

		// Process each frequency point
		for (const result of this.solverResults) {
			const { frequency } = result;

			// Get source current from solver results
			const currentFromSolver = result.sourceCurrents.get(voltageSource.id);

			if (!currentFromSolver) {
				// No current data available for this frequency
				frequencies.push(frequency);
				impedances.push(Infinity);
				phases.push(0);
				continue;
			}

			// Convert mathjs complex to Complex.js
			// mathjs complex has .re and .im properties
			let current;
			if (currentFromSolver.re !== undefined && currentFromSolver.im !== undefined) {
				// mathjs complex number
				current = new Complex(currentFromSolver.re, currentFromSolver.im);
			} else if (currentFromSolver instanceof Complex) {
				// Already a Complex.js object
				current = currentFromSolver;
			} else {
				// Unknown format
				frequencies.push(frequency);
				impedances.push(Infinity);
				phases.push(0);
				continue;
			}

			// Calculate impedance: Z = V / I
			const currentMagnitude = current.abs();

			if (currentMagnitude > 1e-12) {
				// Normal case: calculate impedance
				const voltageComplex = new Complex(actualVoltage, 0);
				const impedance = voltageComplex.div(current);

				frequencies.push(frequency);
				impedances.push(impedance.abs());
				phases.push(impedance.arg() * (180 / Math.PI)); // Convert radians to degrees
			} else {
				// Open circuit or very high impedance
				frequencies.push(frequency);
				impedances.push(Infinity);
				phases.push(0);
			}
		}

		const result = {
			frequencies,
			impedances,
			phases,
		};

		// Validate result against schema
		const validation = SchemaValidator.validateImpedanceResponseData(result);
		if (!validation.valid) {
			console.warn('Impedance response data validation warning:', validation.errors);
		}

		return result;
	}

	/**
	 * Calculate impedance magnitude at a specific frequency
	 * @param {number} frequency - Frequency in Hz
	 * @returns {number} - Impedance magnitude in ohms
	 */
	calculateImpedanceMagnitudeAtFrequency(frequency) {
		// Find the result for this frequency
		const result = this.solverResults.find(
			(r) => Math.abs(r.frequency - frequency) < 0.01,
		);

		if (!result) {
			throw new Error(`No solver result found for frequency ${frequency} Hz`);
		}

		// Find voltage source
		const voltageSource = this.circuit.components.find(
			(component) => component.type === 'source',
		);

		if (!voltageSource) {
			throw new Error('No voltage source found in circuit');
		}

		// Calculate voltage
		const power = voltageSource.parameters.power || 1.0;
		const referenceImpedance = voltageSource.parameters.impedance || 8.0;
		const voltage = Math.sqrt(power * referenceImpedance);
		const inverted = voltageSource.parameters.inverted || false;
		const actualVoltage = inverted ? -voltage : voltage;

		// Get current
		const currentFromSolver = result.sourceCurrents.get(voltageSource.id);

		if (!currentFromSolver || (Math.abs(currentFromSolver.re) < 1e-12 && Math.abs(currentFromSolver.im) < 1e-12)) {
			return Infinity;
		}

		// Convert mathjs complex to Complex.js
		const current = new Complex(currentFromSolver.re, currentFromSolver.im);

		// Calculate impedance magnitude
		const voltageComplex = new Complex(actualVoltage, 0);
		const impedance = voltageComplex.div(current);

		return impedance.abs();
	}

	/**
	 * Calculate impedance phase at a specific frequency
	 * @param {number} frequency - Frequency in Hz
	 * @returns {number} - Impedance phase in degrees
	 */
	calculateImpedancePhaseAtFrequency(frequency) {
		// Find the result for this frequency
		const result = this.solverResults.find(
			(r) => Math.abs(r.frequency - frequency) < 0.01,
		);

		if (!result) {
			throw new Error(`No solver result found for frequency ${frequency} Hz`);
		}

		// Find voltage source
		const voltageSource = this.circuit.components.find(
			(component) => component.type === 'source',
		);

		if (!voltageSource) {
			throw new Error('No voltage source found in circuit');
		}

		// Calculate voltage
		const power = voltageSource.parameters.power || 1.0;
		const referenceImpedance = voltageSource.parameters.impedance || 8.0;
		const voltage = Math.sqrt(power * referenceImpedance);
		const inverted = voltageSource.parameters.inverted || false;
		const actualVoltage = inverted ? -voltage : voltage;

		// Get current
		const currentFromSolver = result.sourceCurrents.get(voltageSource.id);

		if (!currentFromSolver || (Math.abs(currentFromSolver.re) < 1e-12 && Math.abs(currentFromSolver.im) < 1e-12)) {
			return 0;
		}

		// Convert mathjs complex to Complex.js
		const current = new Complex(currentFromSolver.re, currentFromSolver.im);

		// Calculate impedance phase
		const voltageComplex = new Complex(actualVoltage, 0);
		const impedance = voltageComplex.div(current);

		return impedance.arg() * (180 / Math.PI); // Convert radians to degrees
	}
}

export default ImpedanceCalculator;
