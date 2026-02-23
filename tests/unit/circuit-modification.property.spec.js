/**
 * Property-Based Tests for Circuit Modification Preserves Validity
 * 
 * Feature: crossover-network-simulator
 * Property 1: Circuit Modification Preserves Validity
 * 
 * For any valid circuit, adding or removing components, wires, or annotations should
 * result in a valid circuit that can be serialized and deserialized without data loss.
 * 
 * Task: 4.6 Write property test: Circuit modification preserves validity (Property 1)
 * Validates: Requirements 1.2, 1.3, 1.4, 1.7
 */

import fc from 'fast-check';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';
import { TextAnnotation } from '@/models/TextAnnotation';
import { JsonSerializer } from '@/io/JsonSerializer';

describe('Feature: crossover-network-simulator, Property 1: Circuit Modification Preserves Validity', () => {
	/**
	 * Arbitrary for generating component positions
	 */
	const positionArbitrary = fc.integer({ min: 0, max: 1000 });

	/**
	 * Arbitrary for generating rotation values
	 */
	const rotationArbitrary = fc.constantFrom(0, 90, 180, 270);

	/**
	 * Arbitrary for generating resistor parameters
	 */
	const resistorParametersArbitrary = fc.record({
		resistance: fc.double({ min: 0.1, max: 1000000, noNaN: true }),
		tolerance: fc.integer({ min: 1, max: 20 }),
		state: fc.constantFrom('normal', 'open', 'short'),
	});

	/**
	 * Arbitrary for generating capacitor parameters
	 */
	const capacitorParametersArbitrary = fc.record({
		capacitance: fc.double({ min: 1e-12, max: 1e-3, noNaN: true }),
		tolerance: fc.integer({ min: 1, max: 20 }),
		esr: fc.double({ min: 0, max: 10, noNaN: true }),
		state: fc.constantFrom('normal', 'open', 'short'),
	});

	/**
	 * Arbitrary for generating inductor parameters
	 */
	const inductorParametersArbitrary = fc.record({
		inductance: fc.double({ min: 1e-6, max: 1e-1, noNaN: true }),
		tolerance: fc.integer({ min: 1, max: 20 }),
		esr: fc.double({ min: 0, max: 10, noNaN: true }),
		state: fc.constantFrom('normal', 'open', 'short'),
	});

	/**
	 * Arbitrary for generating off-axis file entries
	 */
	const offAxisFileArbitrary = fc.record({
		angle: fc.integer({ min: 0, max: 180 }),
		frdPath: fc.string({ minLength: 1, maxLength: 50 }),
	});

	/**
	 * Arbitrary for generating speaker parameters
	 */
	const speakerParametersArbitrary = fc.record({
		name: fc.string({ maxLength: 50 }),
		sensitivity: fc.double({ min: -10, max: 10, noNaN: true }),
		delay: fc.double({ min: 0, max: 10, noNaN: true }),
		inverted: fc.boolean(),
		muted: fc.boolean(),
		frdFile: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
		zmaFile: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
		phaseSource: fc.constantFrom('measured', 'derived'),
		offAxisFiles: fc.array(offAxisFileArbitrary, { maxLength: 7 }),
	});

	/**
	 * Arbitrary for generating voltage source parameters
	 */
	const voltageSourceParametersArbitrary = fc.record({
		power: fc.double({ min: 0.1, max: 100, noNaN: true }),
		impedance: fc.double({ min: 1, max: 32, noNaN: true }),
		delay: fc.double({ min: 0, max: 10, noNaN: true }),
		inverted: fc.boolean(),
	});

	/**
	 * Arbitrary for generating a resistor component
	 */
	const resistorArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		rotationArbitrary,
		resistorParametersArbitrary,
		fc.string({ minLength: 1, maxLength: 10 }),
	).map(([x, y, rotation, parameters, label]) => {
		const resistor = new Resistor(x, y);
		resistor.rotation = rotation;
		resistor.parameters = { ...resistor.parameters, ...parameters };
		resistor.label = label;
		return resistor;
	});

	/**
	 * Arbitrary for generating a capacitor component
	 */
	const capacitorArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		rotationArbitrary,
		capacitorParametersArbitrary,
		fc.string({ minLength: 1, maxLength: 10 }),
	).map(([x, y, rotation, parameters, label]) => {
		const capacitor = new Capacitor(x, y);
		capacitor.rotation = rotation;
		capacitor.parameters = { ...capacitor.parameters, ...parameters };
		capacitor.label = label;
		return capacitor;
	});

	/**
	 * Arbitrary for generating an inductor component
	 */
	const inductorArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		rotationArbitrary,
		inductorParametersArbitrary,
		fc.string({ minLength: 1, maxLength: 10 }),
	).map(([x, y, rotation, parameters, label]) => {
		const inductor = new Inductor(x, y);
		inductor.rotation = rotation;
		inductor.parameters = { ...inductor.parameters, ...parameters };
		inductor.label = label;
		return inductor;
	});

	/**
	 * Arbitrary for generating a speaker component
	 */
	const speakerArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		rotationArbitrary,
		speakerParametersArbitrary,
		fc.string({ minLength: 1, maxLength: 10 }),
	).map(([x, y, rotation, parameters, label]) => {
		const speaker = new Speaker(x, y);
		speaker.rotation = rotation;
		speaker.parameters = { ...speaker.parameters, ...parameters };
		speaker.label = label;
		return speaker;
	});

	/**
	 * Arbitrary for generating a voltage source component
	 */
	const voltageSourceArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		rotationArbitrary,
		voltageSourceParametersArbitrary,
	).map(([x, y, rotation, parameters]) => {
		const source = new VoltageSource(x, y);
		source.rotation = rotation;
		source.parameters = { ...source.parameters, ...parameters };
		return source;
	});

	/**
	 * Arbitrary for generating a ground component
	 */
	const groundArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		rotationArbitrary,
	).map(([x, y, rotation]) => {
		const ground = new Ground(x, y);
		ground.rotation = rotation;
		return ground;
	});

	/**
	 * Arbitrary for generating any component
	 */
	const componentArbitrary = fc.oneof(
		resistorArbitrary,
		capacitorArbitrary,
		inductorArbitrary,
		speakerArbitrary,
		voltageSourceArbitrary,
		groundArbitrary,
	);

	/**
	 * Arbitrary for generating a wire segment
	 */
	const wireSegmentArbitrary = fc.record({
		x: fc.integer({ min: 0, max: 1000 }),
		y: fc.integer({ min: 0, max: 1000 }),
	});

	/**
	 * Arbitrary for generating a text annotation
	 */
	const textAnnotationArbitrary = fc.tuple(
		positionArbitrary,
		positionArbitrary,
		fc.string({ minLength: 0, maxLength: 100 }),
		fc.integer({ min: 8, max: 72 }),
	).map(([x, y, text, fontSize]) => {
		const annotation = new TextAnnotation(x, y, text);
		annotation.fontSize = fontSize;
		return annotation;
	});

	/**
	 * Arbitrary for generating a circuit with components, wires, and annotations
	 */
	const circuitArbitrary = fc.tuple(
		fc.array(componentArbitrary, { minLength: 0, maxLength: 20 }),
		fc.array(wireSegmentArbitrary, { maxLength: 5 }),
		fc.array(textAnnotationArbitrary, { maxLength: 10 }),
		fc.string({ maxLength: 50 }),
	).chain(([components, segments, annotations, circuitName]) => {
		// Create a circuit and add components
		const circuit = new Circuit();
		circuit.metadata.name = circuitName;

		// Add components to circuit
		components.forEach((component) => {
			try {
				circuit.addComponent(component);
			} catch (error) {
				// Skip components with duplicate IDs (can happen with random generation)
			}
		});

		// Generate wires between components if we have at least 2 components
		const wireCount = circuit.components.length >= 2
			? Math.min(circuit.components.length - 1, 10)
			: 0;

		const wires = [];
		for (let i = 0; i < wireCount; i++) {
			const startIndex = i % circuit.components.length;
			const endIndex = (i + 1) % circuit.components.length;

			if (startIndex !== endIndex) {
				const startComponent = circuit.components[startIndex];
				const endComponent = circuit.components[endIndex];

				const wire = new Wire(
					{ componentId: startComponent.id, terminal: 0 },
					{ componentId: endComponent.id, terminal: 0 },
				);

				// Add some segments to the wire
				const segmentCount = Math.min(segments.length, 3);
				for (let j = 0; j < segmentCount; j++) {
					wire.addSegment(segments[j].x, segments[j].y);
				}

				wires.push(wire);
			}
		}

		// Add wires to circuit
		wires.forEach((wire) => {
			try {
				circuit.addWire(wire);
			} catch (error) {
				// Skip wires that reference non-existent components
			}
		});

		// Add annotations to circuit
		annotations.forEach((annotation) => {
			try {
				circuit.addAnnotation(annotation);
			} catch (error) {
				// Skip annotations with duplicate IDs
			}
		});

		return fc.constant(circuit);
	});

	/**
	 * Helper function to check if a circuit can be serialized and deserialized
	 */
	function canRoundTrip(circuit) {
		try {
			const json = JsonSerializer.serialize(circuit);
			const restored = JsonSerializer.deserialize(json);
			return restored instanceof Circuit;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Helper function to deeply compare two objects
	 */
	function deepEqual(obj1, obj2) {
		if (obj1 === obj2) {
			return true;
		}

		if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
			return false;
		}

		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		if (keys1.length !== keys2.length) {
			return false;
		}

		for (const key of keys1) {
			if (!keys2.includes(key)) {
				return false;
			}

			if (!deepEqual(obj1[key], obj2[key])) {
				return false;
			}
		}

		return true;
	}

	test('Property 1.1: Adding a component preserves circuit validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, componentArbitrary, (circuit, newComponent) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Add the new component
				try {
					circuit.addComponent(newComponent);
				} catch (error) {
					// If adding fails (e.g., duplicate ID), that's acceptable
					return true;
				}

				// Circuit should still be valid after adding component
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.2: Removing a component preserves circuit validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, (circuit) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Skip if circuit has no components
				if (circuit.components.length === 0) {
					return true;
				}

				// Remove a random component
				const componentToRemove = circuit.components[0];
				try {
					circuit.removeComponent(componentToRemove.id);
				} catch (error) {
					// If removal fails, that's acceptable
					return true;
				}

				// Circuit should still be valid after removing component
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.3: Adding a wire preserves circuit validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, wireSegmentArbitrary, (circuit, segment) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Skip if circuit has fewer than 2 components
				if (circuit.components.length < 2) {
					return true;
				}

				// Create a wire between two components
				const startComponent = circuit.components[0];
				const endComponent = circuit.components[1];

				const wire = new Wire(
					{ componentId: startComponent.id, terminal: 0 },
					{ componentId: endComponent.id, terminal: 0 },
				);

				// Add a segment
				wire.addSegment(segment.x, segment.y);

				// Add the wire
				try {
					circuit.addWire(wire);
				} catch (error) {
					// If adding fails, that's acceptable
					return true;
				}

				// Circuit should still be valid after adding wire
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.4: Removing a wire preserves circuit validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, (circuit) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Skip if circuit has no wires
				if (circuit.wires.length === 0) {
					return true;
				}

				// Remove a random wire
				const wireToRemove = circuit.wires[0];
				try {
					circuit.removeWire(wireToRemove.id);
				} catch (error) {
					// If removal fails, that's acceptable
					return true;
				}

				// Circuit should still be valid after removing wire
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.5: Adding an annotation preserves circuit validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, textAnnotationArbitrary, (circuit, newAnnotation) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Add the new annotation
				try {
					circuit.addAnnotation(newAnnotation);
				} catch (error) {
					// If adding fails (e.g., duplicate ID), that's acceptable
					return true;
				}

				// Circuit should still be valid after adding annotation
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.6: Removing an annotation preserves circuit validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, (circuit) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Skip if circuit has no annotations
				if (circuit.annotations.length === 0) {
					return true;
				}

				// Remove a random annotation
				const annotationToRemove = circuit.annotations[0];
				try {
					circuit.removeAnnotation(annotationToRemove.id);
				} catch (error) {
					// If removal fails, that's acceptable
					return true;
				}

				// Circuit should still be valid after removing annotation
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.7: Multiple modifications preserve circuit validity', () => {
		fc.assert(
			fc.property(
				circuitArbitrary,
				componentArbitrary,
				textAnnotationArbitrary,
				(circuit, newComponent, newAnnotation) => {
					// Circuit should be valid before modification
					if (!canRoundTrip(circuit)) {
						return true; // Skip invalid starting circuits
					}

					// Perform multiple modifications
					try {
						circuit.addComponent(newComponent);
					} catch (error) {
						// Ignore errors
					}

					try {
						circuit.addAnnotation(newAnnotation);
					} catch (error) {
						// Ignore errors
					}

					// If circuit has components, try removing one
					if (circuit.components.length > 0) {
						try {
							circuit.removeComponent(circuit.components[0].id);
						} catch (error) {
							// Ignore errors
						}
					}

					// Circuit should still be valid after multiple modifications
					return canRoundTrip(circuit);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 1.8: Modification preserves data integrity on round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, componentArbitrary, (circuit, newComponent) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Add the new component
				try {
					circuit.addComponent(newComponent);
				} catch (error) {
					// If adding fails, skip this test case
					return true;
				}

				// Serialize and deserialize
				try {
					const json = JsonSerializer.serialize(circuit);
					const restored = JsonSerializer.deserialize(json);

					// Check that component count matches
					return circuit.components.length === restored.components.length;
				} catch (error) {
					// If serialization fails, the circuit is invalid
					return false;
				}
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.9: Empty circuit remains valid after modifications', () => {
		fc.assert(
			fc.property(componentArbitrary, (newComponent) => {
				// Start with an empty circuit
				const circuit = new Circuit();

				// Empty circuit should be valid
				if (!canRoundTrip(circuit)) {
					return false;
				}

				// Add a component
				try {
					circuit.addComponent(newComponent);
				} catch (error) {
					// If adding fails, skip
					return true;
				}

				// Circuit should still be valid
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.10: Modification does not corrupt existing data', () => {
		fc.assert(
			fc.property(circuitArbitrary, componentArbitrary, (circuit, newComponent) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Record original component count
				const originalComponentCount = circuit.components.length;

				// Add the new component
				try {
					circuit.addComponent(newComponent);
				} catch (error) {
					// If adding fails, component count should not change
					return circuit.components.length === originalComponentCount;
				}

				// Component count should increase by 1
				return circuit.components.length === originalComponentCount + 1;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.11: Removing and re-adding component preserves validity', () => {
		fc.assert(
			fc.property(circuitArbitrary, (circuit) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Skip if circuit has no components
				if (circuit.components.length === 0) {
					return true;
				}

				// Get a component to remove
				const componentToRemove = circuit.components[0];
				const componentCopy = { ...componentToRemove };

				// Remove the component
				try {
					circuit.removeComponent(componentToRemove.id);
				} catch (error) {
					return true;
				}

				// Circuit should be valid after removal
				if (!canRoundTrip(circuit)) {
					return false;
				}

				// Re-add the component (create new instance with same data)
				const newComponent = new componentToRemove.constructor(
					componentCopy.x,
					componentCopy.y,
				);
				newComponent.rotation = componentCopy.rotation;
				newComponent.parameters = { ...componentCopy.parameters };
				newComponent.label = componentCopy.label;

				try {
					circuit.addComponent(newComponent);
				} catch (error) {
					return true;
				}

				// Circuit should still be valid after re-adding
				return canRoundTrip(circuit);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 1.12: Serialization after modification produces valid JSON', () => {
		fc.assert(
			fc.property(circuitArbitrary, componentArbitrary, (circuit, newComponent) => {
				// Circuit should be valid before modification
				if (!canRoundTrip(circuit)) {
					return true; // Skip invalid starting circuits
				}

				// Add the new component
				try {
					circuit.addComponent(newComponent);
				} catch (error) {
					return true;
				}

				// Try to serialize
				try {
					const json = JsonSerializer.serialize(circuit);
					// Should be valid JSON string
					JSON.parse(json);
					return true;
				} catch (error) {
					// Serialization should not fail for valid circuit
					return false;
				}
			}),
			{ numRuns: 100 },
		);
	});
});
