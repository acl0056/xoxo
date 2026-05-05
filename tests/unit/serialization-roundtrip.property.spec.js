/**
 * Property-Based Tests for Serialization Round-Trip
 * 
 * Feature: crossover-network-simulator
 * Property 11: Serialization Round-Trip
 * 
 * For any valid circuit with components, wires, and annotations, serializing to JSON
 * and then deserializing should produce a circuit equivalent to the original, preserving
 * all component parameters, positions, connections, and annotations.
 * 
 * Task: 4.5 Write property test: Serialization round-trip preserves all data (Property 11)
 * Validates: Requirements 3.5, 6.1, 6.2, 6.3
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

describe('Feature: crossover-network-simulator, Property 11: Serialization Round-Trip', () => {
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
		phaseSource: fc.constantFrom('measured', 'derived'),
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
		frdPhaseSource: fc.constantFrom('measured', 'derived'),
		zmaPhaseSource: fc.constantFrom('measured', 'derived'),
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

	test('Property 11.1: Circuit serialization round-trip preserves all data', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				// Serialize the circuit to JSON
				const json = originalCircuit.toJSON();

				// Deserialize back to a Circuit instance
				const restoredCircuit = Circuit.fromJSON(json);

				// Serialize both circuits again for comparison
				const originalJson = originalCircuit.toJSON();
				const restoredJson = restoredCircuit.toJSON();

				// Compare the JSON representations
				return deepEqual(originalJson, restoredJson);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.2: Component count is preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				return originalCircuit.components.length === restoredCircuit.components.length;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.3: Wire count is preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				return originalCircuit.wires.length === restoredCircuit.wires.length;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.4: Annotation count is preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				return originalCircuit.annotations.length === restoredCircuit.annotations.length;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.5: Component IDs are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				const originalIds = originalCircuit.components.map((c) => c.id).sort();
				const restoredIds = restoredCircuit.components.map((c) => c.id).sort();

				return deepEqual(originalIds, restoredIds);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.6: Component types are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				const originalTypes = originalCircuit.components.map((c) => c.type).sort();
				const restoredTypes = restoredCircuit.components.map((c) => c.type).sort();

				return deepEqual(originalTypes, restoredTypes);
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.7: Component positions are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.components.length; i++) {
					const original = originalCircuit.components[i];
					const restored = restoredCircuit.components.find((c) => c.id === original.id);

					if (!restored || original.x !== restored.x || original.y !== restored.y) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.8: Component rotations are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.components.length; i++) {
					const original = originalCircuit.components[i];
					const restored = restoredCircuit.components.find((c) => c.id === original.id);

					if (!restored || original.rotation !== restored.rotation) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.9: Component parameters are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.components.length; i++) {
					const original = originalCircuit.components[i];
					const restored = restoredCircuit.components.find((c) => c.id === original.id);

					if (!restored || !deepEqual(original.parameters, restored.parameters)) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.10: Wire connections are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.wires.length; i++) {
					const original = originalCircuit.wires[i];
					const restored = restoredCircuit.wires.find((w) => w.id === original.id);

					if (!restored) {
						return false;
					}

					if (original.startNode.componentId !== restored.startNode.componentId
						|| original.startNode.terminal !== restored.startNode.terminal
						|| original.endNode.componentId !== restored.endNode.componentId
						|| original.endNode.terminal !== restored.endNode.terminal) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.11: Wire segments are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.wires.length; i++) {
					const original = originalCircuit.wires[i];
					const restored = restoredCircuit.wires.find((w) => w.id === original.id);

					if (!restored || !deepEqual(original.segments, restored.segments)) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.12: Annotation text is preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.annotations.length; i++) {
					const original = originalCircuit.annotations[i];
					const restored = restoredCircuit.annotations.find((a) => a.id === original.id);

					if (!restored || original.text !== restored.text) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.13: Annotation positions are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.annotations.length; i++) {
					const original = originalCircuit.annotations[i];
					const restored = restoredCircuit.annotations.find((a) => a.id === original.id);

					if (!restored || original.x !== restored.x || original.y !== restored.y) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.14: Annotation font sizes are preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				for (let i = 0; i < originalCircuit.annotations.length; i++) {
					const original = originalCircuit.annotations[i];
					const restored = restoredCircuit.annotations.find((a) => a.id === original.id);

					if (!restored || original.fontSize !== restored.fontSize) {
						return false;
					}
				}

				return true;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.15: Circuit metadata is preserved after round-trip', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				const json = originalCircuit.toJSON();
				const restoredCircuit = Circuit.fromJSON(json);

				return originalCircuit.metadata.name === restoredCircuit.metadata.name
					&& originalCircuit.metadata.version === restoredCircuit.metadata.version;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 11.16: Empty circuit round-trip preserves structure', () => {
		const emptyCircuit = new Circuit();
		emptyCircuit.metadata.name = 'Empty Test Circuit';

		const json = emptyCircuit.toJSON();
		const restoredCircuit = Circuit.fromJSON(json);

		expect(restoredCircuit.components.length).toBe(0);
		expect(restoredCircuit.wires.length).toBe(0);
		expect(restoredCircuit.annotations.length).toBe(0);
		expect(restoredCircuit.metadata.name).toBe('Empty Test Circuit');
	});

	test('Property 11.17: Circuit with only components (no wires) round-trips correctly', () => {
		fc.assert(
			fc.property(
				fc.array(componentArbitrary, { minLength: 1, maxLength: 10 }),
				(components) => {
					const circuit = new Circuit();

					components.forEach((component) => {
						try {
							circuit.addComponent(component);
						} catch (error) {
							// Skip duplicate IDs
						}
					});

					const json = circuit.toJSON();
					const restoredCircuit = Circuit.fromJSON(json);

					return circuit.components.length === restoredCircuit.components.length
						&& restoredCircuit.wires.length === 0;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 11.18: Multiple round-trips produce identical results', () => {
		fc.assert(
			fc.property(circuitArbitrary, (originalCircuit) => {
				// First round-trip
				const json1 = originalCircuit.toJSON();
				const restored1 = Circuit.fromJSON(json1);

				// Second round-trip
				const json2 = restored1.toJSON();
				const restored2 = Circuit.fromJSON(json2);

				// Third round-trip
				const json3 = restored2.toJSON();
				const restored3 = Circuit.fromJSON(json3);

				// All should be equal
				return deepEqual(json1, json2) && deepEqual(json2, json3);
			}),
			{ numRuns: 50 },
		);
	});
});
