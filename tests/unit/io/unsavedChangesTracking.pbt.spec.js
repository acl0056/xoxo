import fc from 'fast-check';
import { UnsavedChangesTracker } from '../../../src/io/UnsavedChangesTracker';
import { Circuit } from '../../../src/models/Circuit';
import { Resistor } from '../../../src/models/Resistor';
import { Capacitor } from '../../../src/models/Capacitor';
import { Inductor } from '../../../src/models/Inductor';
import { VoltageSource } from '../../../src/models/VoltageSource';
import { Ground } from '../../../src/models/Ground';
import { Wire } from '../../../src/models/Wire';
import { TextAnnotation } from '../../../src/models/TextAnnotation';

/**
 * Property 20: Unsaved Changes Tracking
 * For any circuit, making modifications (adding/removing/editing components) should set
 * the "dirty" flag, and saving should clear it. Loading a new file or closing with
 * unsaved changes should trigger a prompt.
 *
 * Feature: crossover-network-simulator, Property 20: Unsaved changes tracking
 * Validates: Requirements 6.5
 */
describe('Feature: crossover-network-simulator, Property 20: Unsaved changes tracking', () => {
	// Generator for component types
	const componentTypeGenerator = fc.constantFrom(
		'resistor',
		'capacitor',
		'inductor',
		'source',
		'ground',
	);

	// Generator for creating a component based on type
	const createComponentByType = (type, x, y) => {
		switch (type) {
		case 'resistor':
			return new Resistor(x, y);
		case 'capacitor':
			return new Capacitor(x, y);
		case 'inductor':
			return new Inductor(x, y);
		case 'source':
			return new VoltageSource(x, y);
		case 'ground':
			return new Ground(x, y);
		default:
			return new Resistor(x, y);
		}
	};

	test('should mark dirty when components are added', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 10 }),
				(componentTypes) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Initial state should be clean
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Add components
					componentTypes.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
						tracker.markDirty();
					});

					// Should be marked as dirty after adding components
					expect(tracker.hasUnsavedChanges()).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should mark dirty when components are removed', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeGenerator, { minLength: 2, maxLength: 10 }),
				fc.integer({ min: 0, max: 100 }),
				(componentTypes, seed) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Add components
					const components = componentTypes.map((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
						return component;
					});

					// Save snapshot and mark clean
					tracker.saveSnapshot(circuit);
					tracker.markClean();
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Remove a component
					const indexToRemove = seed % components.length;
					circuit.removeComponent(components[indexToRemove].id);
					tracker.markDirty();

					// Should be marked as dirty after removing component
					expect(tracker.hasUnsavedChanges()).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should mark dirty when component parameters are modified', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 1, max: 1000000, noNaN: true }),
				(newResistance) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					const resistor = new Resistor(10, 20);
					circuit.addComponent(resistor);

					// Save snapshot and mark clean
					tracker.saveSnapshot(circuit);
					tracker.markClean();
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Modify component parameter
					resistor.parameters.resistance = newResistance;
					tracker.markDirty();

					// Should be marked as dirty after modification
					expect(tracker.hasUnsavedChanges()).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should mark dirty when wires are added', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 10 }),
				(wireCount) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Add some components
					const source = new VoltageSource(0, 0);
					const resistor = new Resistor(10, 0);
					circuit.addComponent(source);
					circuit.addComponent(resistor);

					// Save snapshot and mark clean
					tracker.saveSnapshot(circuit);
					tracker.markClean();
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Add wires
					for (let i = 0; i < wireCount; i++) {
						const wire = new Wire(
							{ componentId: source.id, terminal: 0 },
							{ componentId: resistor.id, terminal: 0 },
						);
						circuit.addWire(wire);
						tracker.markDirty();
					}

					if (wireCount > 0) {
						// Should be marked as dirty after adding wires
						expect(tracker.hasUnsavedChanges()).toBe(true);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should mark dirty when annotations are added', () => {
		fc.assert(
			fc.property(
				fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
				(annotationTexts) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Save snapshot and mark clean
					tracker.saveSnapshot(circuit);
					tracker.markClean();
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Add annotations
					annotationTexts.forEach((text, index) => {
						const annotation = new TextAnnotation(index * 10, 0, text);
						circuit.addAnnotation(annotation);
						tracker.markDirty();
					});

					// Should be marked as dirty after adding annotations
					expect(tracker.hasUnsavedChanges()).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should clear dirty flag when marked clean', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 10 }),
				(componentTypes) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Add components and mark dirty
					componentTypes.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
						tracker.markDirty();
					});

					expect(tracker.hasUnsavedChanges()).toBe(true);

					// Mark clean (simulating save)
					tracker.markClean('/path/to/file.json');

					// Should be clean after marking clean
					expect(tracker.hasUnsavedChanges()).toBe(false);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should detect changes since snapshot', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 5 }),
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 5 }),
				(initialComponents, additionalComponents) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Add initial components
					initialComponents.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
					});

					// Save snapshot
					tracker.saveSnapshot(circuit);

					// Circuit should not have changed yet
					expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(false);

					// Add more components
					additionalComponents.forEach((type, index) => {
						const component = createComponentByType(type, (initialComponents.length + index) * 10, 0);
						circuit.addComponent(component);
					});

					// Circuit should have changed
					expect(tracker.hasChangedSinceSnapshot(circuit)).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should track file path when saving', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 100 }).map((str) => `/path/to/${str}.json`),
				(filePath) => {
					const tracker = new UnsavedChangesTracker();

					// Mark clean with file path
					tracker.markClean(filePath);

					// Should store the file path
					expect(tracker.getCurrentFilePath()).toBe(filePath);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should reset all state when reset is called', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 10 }),
				fc.string({ minLength: 1, maxLength: 100 }).map((str) => `/path/to/${str}.json`),
				(componentTypes, filePath) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Add components and mark dirty
					componentTypes.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
					});
					tracker.markDirty();
					tracker.setCurrentFilePath(filePath);
					tracker.saveSnapshot(circuit);

					// Reset
					tracker.reset();

					// All state should be reset
					expect(tracker.hasUnsavedChanges()).toBe(false);
					expect(tracker.getCurrentFilePath()).toBeNull();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should maintain dirty state through multiple modifications', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						action: fc.constantFrom('add', 'remove', 'modify'),
						componentType: componentTypeGenerator,
					}),
					{ minLength: 1, maxLength: 20 },
				),
				(actions) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();
					const components = [];
					let anyModificationMade = false;

					// Initial state is clean
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Perform actions
					actions.forEach((action, index) => {
						switch (action.action) {
						case 'add': {
							const component = createComponentByType(action.componentType, index * 10, 0);
							circuit.addComponent(component);
							components.push(component);
							tracker.markDirty();
							anyModificationMade = true;
							break;
						}
						case 'remove':
							if (components.length > 0) {
								const componentToRemove = components.pop();
								circuit.removeComponent(componentToRemove.id);
								tracker.markDirty();
								anyModificationMade = true;
							}
							break;
						case 'modify':
							if (components.length > 0) {
								const componentToModify = components[components.length - 1];
								if (componentToModify.type === 'resistor') {
									componentToModify.parameters.resistance = Math.random() * 10000;
								}
								tracker.markDirty();
								anyModificationMade = true;
							}
							break;
						default:
							break;
						}
					});

					// Should be dirty only if any modification was actually made
					if (anyModificationMade) {
						expect(tracker.hasUnsavedChanges()).toBe(true);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should handle save-modify-save workflow correctly', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 5 }),
				fc.array(componentTypeGenerator, { minLength: 1, maxLength: 5 }),
				(firstBatch, secondBatch) => {
					const tracker = new UnsavedChangesTracker();
					const circuit = new Circuit();

					// Add first batch of components
					firstBatch.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
						tracker.markDirty();
					});

					expect(tracker.hasUnsavedChanges()).toBe(true);

					// Save
					tracker.saveSnapshot(circuit);
					tracker.markClean('/path/to/file.json');
					expect(tracker.hasUnsavedChanges()).toBe(false);

					// Add second batch of components
					secondBatch.forEach((type, index) => {
						const component = createComponentByType(type, (firstBatch.length + index) * 10, 0);
						circuit.addComponent(component);
						tracker.markDirty();
					});

					expect(tracker.hasUnsavedChanges()).toBe(true);

					// Save again
					tracker.saveSnapshot(circuit);
					tracker.markClean('/path/to/file.json');
					expect(tracker.hasUnsavedChanges()).toBe(false);
				},
			),
			{ numRuns: 100 },
		);
	});
});

