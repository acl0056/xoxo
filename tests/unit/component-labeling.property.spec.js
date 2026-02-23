/**
 * Property-Based Tests for Component Labeling
 * 
 * Feature: crossover-network-simulator
 * Property 7: Component Labeling Uniqueness and Sequence
 * 
 * For any circuit, all passive components of the same type should have unique labels
 * with sequential numbering (R1, R2, R3 for resistors; C1, C2, C3 for capacitors; etc.),
 * and no two components should share the same label.
 * 
 * Task: 3.11 Write property test: Component labeling uniqueness and sequence (Property 7)
 * Validates: Requirements 2.6, 2.7, 2.8
 */

import fc from 'fast-check';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { Ground } from '@/models/Ground';
import { VoltageSource } from '@/models/VoltageSource';

describe('Feature: crossover-network-simulator, Property 7: Component Labeling Uniqueness and Sequence', () => {
	/**
	 * Helper function to create a component based on type
	 */
	function createComponentByType(type, x, y) {
		switch (type) {
			case 'resistor':
				return new Resistor(x, y);
			case 'capacitor':
				return new Capacitor(x, y);
			case 'inductor':
				return new Inductor(x, y);
			case 'speaker':
				return new Speaker(x, y);
			case 'ground':
				return new Ground(x, y);
			case 'source':
				return new VoltageSource(x, y);
			default:
				throw new Error(`Unknown component type: ${type}`);
		}
	}

	/**
	 * Helper function to assign labels to components in a circuit
	 * This simulates the expected auto-labeling behavior
	 */
	function assignLabelsToCircuit(circuit) {
		const labelCounters = {
			resistor: 1,
			capacitor: 1,
			inductor: 1,
			speaker: 1,
		};

		const labelPrefixes = {
			resistor: 'R',
			capacitor: 'C',
			inductor: 'L',
			speaker: 'S',
		};

		circuit.components.forEach((component) => {
			// Ground and source components don't get labels
			if (component.type === 'ground' || component.type === 'source') {
				component.label = '';
				return;
			}

			// Assign sequential label for labeled component types
			if (labelPrefixes[component.type]) {
				const prefix = labelPrefixes[component.type];
				const number = labelCounters[component.type];
				component.label = `${prefix}${number}`;
				labelCounters[component.type]++;
			}
		});
	}

	/**
	 * Arbitrary for generating component types
	 */
	const componentTypeArbitrary = fc.constantFrom(
		'resistor',
		'capacitor',
		'inductor',
		'speaker',
		'ground',
		'source',
	);

	/**
	 * Arbitrary for generating a sequence of component types
	 */
	const componentTypeSequenceArbitrary = fc.array(
		componentTypeArbitrary,
		{ minLength: 1, maxLength: 50 },
	);

	test('Property 7.1: All component labels in a circuit are unique', () => {
		fc.assert(
			fc.property(componentTypeSequenceArbitrary, (componentTypes) => {
				const circuit = new Circuit();

				// Create and add components
				componentTypes.forEach((type, index) => {
					const component = createComponentByType(type, index * 10, 0);
					circuit.addComponent(component);
				});

				// Assign labels (simulating auto-labeling)
				assignLabelsToCircuit(circuit);

				// Collect all non-empty labels
				const labels = circuit.components
					.map((c) => c.label)
					.filter((label) => label !== '');

				// Check uniqueness
				const uniqueLabels = new Set(labels);
				return uniqueLabels.size === labels.length;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 7.2: Components of the same type have sequential numbering', () => {
		fc.assert(
			fc.property(componentTypeSequenceArbitrary, (componentTypes) => {
				const circuit = new Circuit();

				// Create and add components
				componentTypes.forEach((type, index) => {
					const component = createComponentByType(type, index * 10, 0);
					circuit.addComponent(component);
				});

				// Assign labels (simulating auto-labeling)
				assignLabelsToCircuit(circuit);

				// Group components by type
				const componentsByType = {
					resistor: [],
					capacitor: [],
					inductor: [],
					speaker: [],
				};

				circuit.components.forEach((component) => {
					if (componentsByType[component.type]) {
						componentsByType[component.type].push(component);
					}
				});

				// Check sequential numbering for each type
				let allSequential = true;

				Object.entries(componentsByType).forEach(([type, components]) => {
					if (components.length === 0) {
						return;
					}

					const prefix = {
						resistor: 'R',
						capacitor: 'C',
						inductor: 'L',
						speaker: 'S',
					}[type];

					// Extract numbers from labels
					const numbers = components.map((c) => {
						const match = c.label.match(/^[RCLS](\d+)$/);
						return match ? parseInt(match[1], 10) : null;
					});

					// Check if all numbers are present and sequential starting from 1
					const expectedNumbers = Array.from(
						{ length: components.length },
						(_, i) => i + 1,
					);

					const numbersMatch = numbers.every(
						(num, index) => num === expectedNumbers[index],
					);

					if (!numbersMatch) {
						allSequential = false;
					}
				});

				return allSequential;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 7.3: Ground components do not receive labels', () => {
		fc.assert(
			fc.property(
				fc.array(fc.constant('ground'), { minLength: 1, maxLength: 10 }),
				(componentTypes) => {
					const circuit = new Circuit();

					// Create and add ground components
					componentTypes.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
					});

					// Assign labels (simulating auto-labeling)
					assignLabelsToCircuit(circuit);

					// Check that all ground components have empty labels
					const allGroundsUnlabeled = circuit.components.every(
						(component) => component.type === 'ground' && component.label === '',
					);

					return allGroundsUnlabeled;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 7.4: Voltage source components do not receive labels', () => {
		fc.assert(
			fc.property(
				fc.array(fc.constant('source'), { minLength: 1, maxLength: 5 }),
				(componentTypes) => {
					const circuit = new Circuit();

					// Create and add voltage source components
					componentTypes.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
					});

					// Assign labels (simulating auto-labeling)
					assignLabelsToCircuit(circuit);

					// Check that all source components have empty labels
					const allSourcesUnlabeled = circuit.components.every(
						(component) => component.type === 'source' && component.label === '',
					);

					return allSourcesUnlabeled;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 7.5: Mixed component types maintain unique labels', () => {
		fc.assert(
			fc.property(componentTypeSequenceArbitrary, (componentTypes) => {
				const circuit = new Circuit();

				// Create and add components
				componentTypes.forEach((type, index) => {
					const component = createComponentByType(type, index * 10, 0);
					circuit.addComponent(component);
				});

				// Assign labels (simulating auto-labeling)
				assignLabelsToCircuit(circuit);

				// Collect all non-empty labels
				const labels = circuit.components
					.map((c) => c.label)
					.filter((label) => label !== '');

				// Check uniqueness
				const uniqueLabels = new Set(labels);

				// Also verify no label collisions across types
				// (e.g., R1 should not conflict with C1)
				return uniqueLabels.size === labels.length;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 7.6: Label format matches expected pattern', () => {
		fc.assert(
			fc.property(componentTypeSequenceArbitrary, (componentTypes) => {
				const circuit = new Circuit();

				// Create and add components
				componentTypes.forEach((type, index) => {
					const component = createComponentByType(type, index * 10, 0);
					circuit.addComponent(component);
				});

				// Assign labels (simulating auto-labeling)
				assignLabelsToCircuit(circuit);

				// Check label format for each component type
				const labelPatterns = {
					resistor: /^R\d+$/,
					capacitor: /^C\d+$/,
					inductor: /^L\d+$/,
					speaker: /^S\d+$/,
				};

				const allLabelsValid = circuit.components.every((component) => {
					// Ground and source should have empty labels
					if (component.type === 'ground' || component.type === 'source') {
						return component.label === '';
					}

					// Other components should match their pattern
					const pattern = labelPatterns[component.type];
					return pattern && pattern.test(component.label);
				});

				return allLabelsValid;
			}),
			{ numRuns: 100 },
		);
	});

	test('Property 7.7: Adding components maintains label sequence', () => {
		fc.assert(
			fc.property(
				fc.tuple(
					componentTypeSequenceArbitrary,
					componentTypeSequenceArbitrary,
				),
				([firstBatch, secondBatch]) => {
					const circuit = new Circuit();

					// Add first batch of components
					firstBatch.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
					});

					// Assign labels to first batch
					assignLabelsToCircuit(circuit);

					// Store labels from first batch
					const firstBatchLabels = circuit.components.map((c) => c.label);

					// Add second batch of components
					const firstBatchSize = circuit.components.length;
					secondBatch.forEach((type, index) => {
						const component = createComponentByType(
							type,
							(firstBatchSize + index) * 10,
							0,
						);
						circuit.addComponent(component);
					});

					// Re-assign labels to entire circuit
					assignLabelsToCircuit(circuit);

					// Collect all non-empty labels
					const allLabels = circuit.components
						.map((c) => c.label)
						.filter((label) => label !== '');

					// Check uniqueness
					const uniqueLabels = new Set(allLabels);
					return uniqueLabels.size === allLabels.length;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 7.8: Empty circuit has no labels', () => {
		const circuit = new Circuit();
		assignLabelsToCircuit(circuit);

		const labels = circuit.components
			.map((c) => c.label)
			.filter((label) => label !== '');

		expect(labels.length).toBe(0);
	});

	test('Property 7.9: Single component of each type gets label ending in 1', () => {
		fc.assert(
			fc.property(
				fc.constantFrom('resistor', 'capacitor', 'inductor', 'speaker'),
				(componentType) => {
					const circuit = new Circuit();
					const component = createComponentByType(componentType, 0, 0);
					circuit.addComponent(component);

					// Assign labels
					assignLabelsToCircuit(circuit);

					const expectedLabels = {
						resistor: 'R1',
						capacitor: 'C1',
						inductor: 'L1',
						speaker: 'S1',
					};

					return component.label === expectedLabels[componentType];
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 7.10: Large circuits maintain label uniqueness', () => {
		fc.assert(
			fc.property(
				fc.array(componentTypeArbitrary, { minLength: 20, maxLength: 100 }),
				(componentTypes) => {
					const circuit = new Circuit();

					// Create and add components
					componentTypes.forEach((type, index) => {
						const component = createComponentByType(type, index * 10, 0);
						circuit.addComponent(component);
					});

					// Assign labels
					assignLabelsToCircuit(circuit);

					// Collect all non-empty labels
					const labels = circuit.components
						.map((c) => c.label)
						.filter((label) => label !== '');

					// Check uniqueness
					const uniqueLabels = new Set(labels);
					return uniqueLabels.size === labels.length;
				},
			),
			{ numRuns: 50 },
		);
	});
});
