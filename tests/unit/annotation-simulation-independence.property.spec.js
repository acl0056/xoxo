import fc from 'fast-check';
import { Circuit } from '@/models/Circuit';
import { TextAnnotation } from '@/models/TextAnnotation';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Speaker } from '@/models/Speaker';
import { Wire } from '@/models/Wire';
import { CircuitSolver } from '@/simulation/CircuitSolver';

/**
 * **Validates: Requirements 1.9**
 *
 * Property 4: Annotation Simulation Independence
 *
 * For any circuit, adding, removing, or modifying text annotations should not
 * change the simulation results (frequency response, impedance, SPL).
 *
 * This property ensures that annotations are purely visual and do not affect
 * the electrical behavior of the circuit.
 */

// Generator for text annotations
const textAnnotationArbitrary = fc.record({
	x: fc.integer({ min: 0, max: 100 }),
	y: fc.integer({ min: 0, max: 100 }),
	text: fc.string({ minLength: 1, maxLength: 50 }),
	fontSize: fc.integer({ min: 8, max: 72 }),
}).map((data) => {
	const annotation = new TextAnnotation(data.x, data.y, data.text);
	annotation.fontSize = data.fontSize;
	return annotation;
});

// Generator for simple valid circuits with components
const simpleCircuitArbitrary = fc.record({
	resistorValue: fc.double({ min: 1, max: 1000, noNaN: true }),
	capacitorValue: fc.double({ min: 1e-9, max: 1e-3, noNaN: true }),
}).map((data) => {
	const circuit = new Circuit();

	// Add voltage source
	const voltageSource = new VoltageSource(10, 10);
	circuit.addComponent(voltageSource);

	// Add resistor
	const resistor = new Resistor(20, 10);
	resistor.parameters.resistance = data.resistorValue;
	circuit.addComponent(resistor);

	// Add capacitor
	const capacitor = new Capacitor(30, 10);
	capacitor.parameters.capacitance = data.capacitorValue;
	circuit.addComponent(capacitor);

	// Add ground
	const ground = new Ground(40, 10);
	circuit.addComponent(ground);

	// Wire voltage source to resistor
	const wire1 = new Wire(
		{ componentId: voltageSource.id, terminal: 1 },
		{ componentId: resistor.id, terminal: 0 },
	);
	circuit.addWire(wire1);

	// Wire resistor to capacitor
	const wire2 = new Wire(
		{ componentId: resistor.id, terminal: 1 },
		{ componentId: capacitor.id, terminal: 0 },
	);
	circuit.addWire(wire2);

	// Wire capacitor to ground
	const wire3 = new Wire(
		{ componentId: capacitor.id, terminal: 1 },
		{ componentId: ground.id, terminal: 0 },
	);
	circuit.addWire(wire3);

	// Wire voltage source negative to ground
	const wire4 = new Wire(
		{ componentId: voltageSource.id, terminal: 0 },
		{ componentId: ground.id, terminal: 0 },
	);
	circuit.addWire(wire4);

	return circuit;
});

// Helper function to run simulation and extract key results
function getSimulationResults(circuit) {
	try {
		const solver = new CircuitSolver(circuit);
		const results = solver.solveAllFrequencies();

		// Extract a few key frequency points for comparison
		const samplePoints = [0, Math.floor(results.length / 4), Math.floor(results.length / 2), results.length - 1];

		return samplePoints.map((index) => {
			const result = results[index];
			return {
				frequency: result.frequency,
				// Extract magnitude of first node voltage as a representative value
				nodeVoltage: result.nodeVoltages && result.nodeVoltages.size > 0
					? Array.from(result.nodeVoltages.values())[0]
					: null,
			};
		});
	} catch (error) {
		// If simulation fails, return null
		return null;
	}
}

// Helper function to compare simulation results
function resultsAreEqual(results1, results2) {
	if (results1 === null && results2 === null) return true;
	if (results1 === null || results2 === null) return false;
	if (results1.length !== results2.length) return false;

	for (let i = 0; i < results1.length; i++) {
		const r1 = results1[i];
		const r2 = results2[i];

		// Compare frequencies
		if (Math.abs(r1.frequency - r2.frequency) > 0.001) {
			return false;
		}

		// Compare node voltages (complex numbers)
		if (r1.nodeVoltage && r2.nodeVoltage) {
			const magnitudeDiff = Math.abs(r1.nodeVoltage.abs() - r2.nodeVoltage.abs());
			const phaseDiff = Math.abs(r1.nodeVoltage.arg() - r2.nodeVoltage.arg());

			// Allow small numerical differences
			if (magnitudeDiff > 1e-6 || phaseDiff > 1e-6) {
				return false;
			}
		} else if (r1.nodeVoltage !== r2.nodeVoltage) {
			return false;
		}
	}

	return true;
}

describe('Feature: crossover-network-simulator, Property 4: Annotation simulation independence', () => {
	test('adding annotations does not change simulation results', () => {
		fc.assert(
			fc.property(
				simpleCircuitArbitrary,
				fc.array(textAnnotationArbitrary, { minLength: 1, maxLength: 5 }),
				(circuit, annotations) => {
					// Get simulation results before adding annotations
					const resultsBefore = getSimulationResults(circuit);

					// Add annotations
					annotations.forEach((annotation) => {
						try {
							circuit.addAnnotation(annotation);
						} catch (error) {
							// Skip if annotation can't be added (e.g., duplicate ID)
						}
					});

					// Get simulation results after adding annotations
					const resultsAfter = getSimulationResults(circuit);

					// Results should be identical
					return resultsAreEqual(resultsBefore, resultsAfter);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('removing annotations does not change simulation results', () => {
		fc.assert(
			fc.property(
				simpleCircuitArbitrary,
				fc.array(textAnnotationArbitrary, { minLength: 1, maxLength: 5 }),
				(circuit, annotations) => {
					// Add annotations first
					annotations.forEach((annotation) => {
						try {
							circuit.addAnnotation(annotation);
						} catch (error) {
							// Skip if annotation can't be added
						}
					});

					// Get simulation results before removing annotations
					const resultsBefore = getSimulationResults(circuit);

					// Remove all annotations
					const annotationIds = circuit.annotations.map((a) => a.id);
					annotationIds.forEach((id) => {
						circuit.removeAnnotation(id);
					});

					// Get simulation results after removing annotations
					const resultsAfter = getSimulationResults(circuit);

					// Results should be identical
					return resultsAreEqual(resultsBefore, resultsAfter);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('modifying annotation text does not change simulation results', () => {
		fc.assert(
			fc.property(
				simpleCircuitArbitrary,
				textAnnotationArbitrary,
				fc.string({ minLength: 1, maxLength: 50 }),
				(circuit, annotation, newText) => {
					// Add annotation
					try {
						circuit.addAnnotation(annotation);
					} catch (error) {
						return true; // Skip if annotation can't be added
					}

					// Get simulation results before modifying annotation
					const resultsBefore = getSimulationResults(circuit);

					// Modify annotation text
					circuit.updateAnnotation(annotation.id, { text: newText });

					// Get simulation results after modifying annotation
					const resultsAfter = getSimulationResults(circuit);

					// Results should be identical
					return resultsAreEqual(resultsBefore, resultsAfter);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('modifying annotation font size does not change simulation results', () => {
		fc.assert(
			fc.property(
				simpleCircuitArbitrary,
				textAnnotationArbitrary,
				fc.integer({ min: 8, max: 72 }),
				(circuit, annotation, newFontSize) => {
					// Add annotation
					try {
						circuit.addAnnotation(annotation);
					} catch (error) {
						return true; // Skip if annotation can't be added
					}

					// Get simulation results before modifying annotation
					const resultsBefore = getSimulationResults(circuit);

					// Modify annotation font size
					circuit.updateAnnotation(annotation.id, { fontSize: newFontSize });

					// Get simulation results after modifying annotation
					const resultsAfter = getSimulationResults(circuit);

					// Results should be identical
					return resultsAreEqual(resultsBefore, resultsAfter);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('modifying annotation position does not change simulation results', () => {
		fc.assert(
			fc.property(
				simpleCircuitArbitrary,
				textAnnotationArbitrary,
				fc.integer({ min: 0, max: 100 }),
				fc.integer({ min: 0, max: 100 }),
				(circuit, annotation, newX, newY) => {
					// Add annotation
					try {
						circuit.addAnnotation(annotation);
					} catch (error) {
						return true; // Skip if annotation can't be added
					}

					// Get simulation results before modifying annotation
					const resultsBefore = getSimulationResults(circuit);

					// Modify annotation position
					circuit.updateAnnotation(annotation.id, { x: newX, y: newY });

					// Get simulation results after modifying annotation
					const resultsAfter = getSimulationResults(circuit);

					// Results should be identical
					return resultsAreEqual(resultsBefore, resultsAfter);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('multiple annotation operations do not change simulation results', () => {
		fc.assert(
			fc.property(
				simpleCircuitArbitrary,
				fc.array(textAnnotationArbitrary, { minLength: 2, maxLength: 10 }),
				(circuit, annotations) => {
					// Get simulation results before any annotation operations
					const resultsBefore = getSimulationResults(circuit);

					// Perform multiple annotation operations
					annotations.forEach((annotation, index) => {
						try {
							circuit.addAnnotation(annotation);

							// Modify some annotations
							if (index % 2 === 0) {
								circuit.updateAnnotation(annotation.id, { text: `Modified ${index}` });
							}

							// Remove some annotations
							if (index % 3 === 0 && index > 0) {
								circuit.removeAnnotation(annotations[index - 1].id);
							}
						} catch (error) {
							// Skip if operation fails
						}
					});

					// Get simulation results after all annotation operations
					const resultsAfter = getSimulationResults(circuit);

					// Results should be identical
					return resultsAreEqual(resultsBefore, resultsAfter);
				},
			),
			{ numRuns: 100 },
		);
	});
});
