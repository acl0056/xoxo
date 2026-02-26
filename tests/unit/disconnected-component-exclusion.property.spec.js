/**
 * Property-Based Test: Disconnected Component Exclusion (Property 18)
 *
 * Feature: crossover-network-simulator
 * Property 18: Disconnected component exclusion
 *
 * For any circuit containing components not connected to the path between voltage source
 * and loudspeakers, simulation should exclude those components and produce the same results
 * as if they were not present.
 *
 * Validates: Requirements 4.17
 */

import fc from 'fast-check';
import { Circuit } from '@/models/Circuit';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Speaker } from '@/models/Speaker';
import { Wire } from '@/models/Wire';
import CircuitValidator from '@/validation/CircuitValidator';

describe('Feature: crossover-network-simulator, Property 18: Disconnected component exclusion', () => {
	it('should warn about disconnected components', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 5 }), // Number of disconnected components
				(disconnectedCount) => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					const ground = new Ground(50, 10);
					const speaker = new Speaker(30, 10);

					circuit.addComponent(source);
					circuit.addComponent(ground);
					circuit.addComponent(speaker);

					// Create valid circuit path: source -> speaker -> ground
					const wire1 = new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: speaker.id, terminal: 0 },
					);
					const wire2 = new Wire(
						{ componentId: speaker.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					const wire3 = new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					circuit.addWire(wire1);
					circuit.addWire(wire2);
					circuit.addWire(wire3);

					// Add disconnected components
					const disconnectedComponents = [];
					for (let i = 0; i < disconnectedCount; i++) {
						const resistor = new Resistor(70 + i * 20, 10);
						circuit.addComponent(resistor);
						disconnectedComponents.push(resistor);
					}

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should warn about each disconnected component
					disconnectedComponents.forEach((component) => {
						expect(
							result.warnings.some((w) => w.includes('Disconnected component') && w.includes(component.id)),
						).toBe(true);
					});
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should not warn about components in the signal path', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 3 }), // Number of components in path
				(componentCount) => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					const ground = new Ground(100, 10);
					const speaker = new Speaker(80, 10);

					circuit.addComponent(source);
					circuit.addComponent(ground);
					circuit.addComponent(speaker);

					// Add components in series in the signal path
					const components = [];
					for (let i = 0; i < componentCount; i++) {
						const resistor = new Resistor(30 + i * 20, 10);
						circuit.addComponent(resistor);
						components.push(resistor);
					}

					// Wire them in series: source -> R1 -> R2 -> ... -> speaker -> ground
					let previousComponent = source;
					let previousTerminal = 0;

					components.forEach((component) => {
						const wire = new Wire(
							{ componentId: previousComponent.id, terminal: previousTerminal },
							{ componentId: component.id, terminal: 0 },
						);
						circuit.addWire(wire);
						previousComponent = component;
						previousTerminal = 1;
					});

					// Connect last component to speaker
					const wireToSpeaker = new Wire(
						{ componentId: previousComponent.id, terminal: previousTerminal },
						{ componentId: speaker.id, terminal: 0 },
					);
					circuit.addWire(wireToSpeaker);

					// Connect speaker to ground
					const wireToGround = new Wire(
						{ componentId: speaker.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					circuit.addWire(wireToGround);

					// Connect source negative to ground
					const sourceToGround = new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					circuit.addWire(sourceToGround);

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should not warn about any of the components in the signal path
					components.forEach((component) => {
						expect(
							result.warnings.some((w) => w.includes('Disconnected component') && w.includes(component.id)),
						).toBe(false);
					});
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should detect disconnected components even with wires', () => {
		fc.assert(
			fc.property(
				fc.constant(null),
				() => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					const ground = new Ground(50, 10);
					const speaker = new Speaker(30, 10);
					const resistor1 = new Resistor(70, 10);
					const resistor2 = new Resistor(90, 10);

					circuit.addComponent(source);
					circuit.addComponent(ground);
					circuit.addComponent(speaker);
					circuit.addComponent(resistor1);
					circuit.addComponent(resistor2);

					// Create valid circuit path: source -> speaker -> ground
					const wire1 = new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: speaker.id, terminal: 0 },
					);
					const wire2 = new Wire(
						{ componentId: speaker.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					const wire3 = new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					circuit.addWire(wire1);
					circuit.addWire(wire2);
					circuit.addWire(wire3);

					// Create disconnected island: resistor1 -> resistor2
					const wire4 = new Wire(
						{ componentId: resistor1.id, terminal: 0 },
						{ componentId: resistor2.id, terminal: 0 },
					);
					circuit.addWire(wire4);

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should warn about both disconnected resistors
					expect(result.warnings.some((w) => w.includes(resistor1.id))).toBe(true);
					expect(result.warnings.some((w) => w.includes(resistor2.id))).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should not warn about ground components being disconnected', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 3 }), // Number of extra grounds
				(extraGroundCount) => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					const ground1 = new Ground(50, 10);
					const speaker = new Speaker(30, 10);

					circuit.addComponent(source);
					circuit.addComponent(ground1);
					circuit.addComponent(speaker);

					// Create valid circuit path
					const wire1 = new Wire(
						{ componentId: source.id, terminal: 0 },
						{ componentId: speaker.id, terminal: 0 },
					);
					const wire2 = new Wire(
						{ componentId: speaker.id, terminal: 1 },
						{ componentId: ground1.id, terminal: 0 },
					);
					const wire3 = new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground1.id, terminal: 0 },
					);
					circuit.addWire(wire1);
					circuit.addWire(wire2);
					circuit.addWire(wire3);

					// Add extra disconnected ground components
					const extraGrounds = [];
					for (let i = 0; i < extraGroundCount; i++) {
						const ground = new Ground(70 + i * 20, 10);
						circuit.addComponent(ground);
						extraGrounds.push(ground);
					}

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should not warn about disconnected ground components
					extraGrounds.forEach((ground) => {
						expect(result.warnings.some((w) => w.includes(ground.id))).toBe(false);
					});
				},
			),
			{ numRuns: 100 },
		);
	});

	it('should warn when circuit has no speakers', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 5 }), // Number of passive components
				(componentCount) => {
					const circuit = new Circuit();
					const source = new VoltageSource(10, 10);
					const ground = new Ground(50, 10);

					circuit.addComponent(source);
					circuit.addComponent(ground);

					// Add passive components
					for (let i = 0; i < componentCount; i++) {
						const resistor = new Resistor(30 + i * 20, 10);
						circuit.addComponent(resistor);
					}

					// Connect source to ground
					const wire = new Wire(
						{ componentId: source.id, terminal: 1 },
						{ componentId: ground.id, terminal: 0 },
					);
					circuit.addWire(wire);

					const validator = new CircuitValidator(circuit);
					const result = validator.validate();

					// Should warn about no speakers
					expect(result.warnings.some((w) => w.includes('no speakers'))).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});
});
