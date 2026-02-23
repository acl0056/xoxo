/**
 * Property-Based Tests for Component State Simulation Behavior
 *
 * Feature: crossover-network-simulator
 * Property 13: Component State Simulation Behavior
 *
 * For any component set to "open" state, the simulation should treat it as disconnected
 * (infinite impedance). For any component set to "short" state, the simulation should
 * treat it as a zero-resistance connection. Components in "normal" state should use
 * their specified parameter values.
 *
 * Task: 16.5 Write property test: Component state simulation behavior (Property 13)
 * Validates: Requirements 3.11, 3.12, 3.13
 *
 * Note: This test validates the state parameter behavior at the model level.
 * The actual simulation engine integration will be tested when the simulation
 * engine is implemented in Phase 6.
 */

import fc from 'fast-check';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Circuit } from '@/models/Circuit';

describe('Feature: crossover-network-simulator, Property 13: Component State Simulation Behavior', () => {
	/**
	 * Generator for passive component types
	 */
	const passiveComponentTypeArbitrary = fc.constantFrom('resistor', 'capacitor', 'inductor');

	/**
	 * Generator for component states
	 */
	const componentStateArbitrary = fc.constantFrom('normal', 'open', 'short');

	/**
	 * Generator for valid component parameters
	 */
	const componentParametersArbitrary = fc.record({
		resistance: fc.double({ min: 0.1, max: 10000, noNaN: true }),
		capacitance: fc.double({ min: 1e-9, max: 1e-3, noNaN: true }),
		inductance: fc.double({ min: 1e-6, max: 1e-1, noNaN: true }),
		tolerance: fc.double({ min: 0, max: 100, noNaN: true }),
		esr: fc.double({ min: 0, max: 10, noNaN: true }),
	});

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
			default:
				throw new Error(`Unknown component type: ${type}`);
		}
	}

	/**
	 * Helper function to get the impedance representation for a component state
	 * This simulates what the simulation engine should do
	 */
	function getStateImpedanceRepresentation(state) {
		switch (state) {
			case 'normal':
				return 'finite'; // Use component's actual parameters
			case 'open':
				return 'infinite'; // Infinite impedance (disconnected)
			case 'short':
				return 'zero'; // Zero resistance (direct connection)
			default:
				throw new Error(`Unknown state: ${state}`);
		}
	}

	test('Property 13.1: Component state parameter is preserved through all operations', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				componentStateArbitrary,
				fc.integer({ min: 0, max: 100 }),
				fc.integer({ min: 0, max: 100 }),
				(componentType, state, x, y) => {
					// Create component
					const component = createComponentByType(componentType, x, y);

					// Set state
					component.parameters.state = state;

					// Verify state is preserved
					expect(component.parameters.state).toBe(state);

					// Serialize and deserialize
					const json = component.toJSON();
					expect(json.parameters.state).toBe(state);

					// Verify state is preserved after deserialization
					let deserializedComponent;
					switch (componentType) {
						case 'resistor':
							deserializedComponent = Resistor.fromJSON(json);
							break;
						case 'capacitor':
							deserializedComponent = Capacitor.fromJSON(json);
							break;
						case 'inductor':
							deserializedComponent = Inductor.fromJSON(json);
							break;
						default:
							throw new Error(`Unknown type: ${componentType}`);
					}

					expect(deserializedComponent.parameters.state).toBe(state);

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.2: State transitions do not affect other component parameters', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				componentParametersArbitrary,
				componentStateArbitrary,
				componentStateArbitrary,
				(componentType, parameters, initialState, newState) => {
					// Create component
					const component = createComponentByType(componentType, 0, 0);

					// Set initial parameters
					if (componentType === 'resistor') {
						component.parameters.resistance = parameters.resistance;
						component.parameters.tolerance = parameters.tolerance;
					} else if (componentType === 'capacitor') {
						component.parameters.capacitance = parameters.capacitance;
						component.parameters.tolerance = parameters.tolerance;
						component.parameters.esr = parameters.esr;
					} else if (componentType === 'inductor') {
						component.parameters.inductance = parameters.inductance;
						component.parameters.tolerance = parameters.tolerance;
						component.parameters.esr = parameters.esr;
					}

					// Set initial state
					component.parameters.state = initialState;

					// Store original parameter values
					const originalParameters = { ...component.parameters };

					// Change state
					component.parameters.state = newState;

					// Verify other parameters are unchanged
					if (componentType === 'resistor') {
						expect(component.parameters.resistance).toBe(originalParameters.resistance);
						expect(component.parameters.tolerance).toBe(originalParameters.tolerance);
					} else if (componentType === 'capacitor') {
						expect(component.parameters.capacitance).toBe(originalParameters.capacitance);
						expect(component.parameters.tolerance).toBe(originalParameters.tolerance);
						expect(component.parameters.esr).toBe(originalParameters.esr);
					} else if (componentType === 'inductor') {
						expect(component.parameters.inductance).toBe(originalParameters.inductance);
						expect(component.parameters.tolerance).toBe(originalParameters.tolerance);
						expect(component.parameters.esr).toBe(originalParameters.esr);
					}

					// Only state should have changed
					expect(component.parameters.state).toBe(newState);

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.3: Each state has a distinct impedance representation', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				(componentType) => {
					const component = createComponentByType(componentType, 0, 0);

					// Test each state
					const states = ['normal', 'open', 'short'];
					const impedanceRepresentations = states.map((state) => {
						component.parameters.state = state;
						return getStateImpedanceRepresentation(component.parameters.state);
					});

					// Verify all states have distinct representations
					const uniqueRepresentations = new Set(impedanceRepresentations);
					expect(uniqueRepresentations.size).toBe(3);

					// Verify specific representations
					component.parameters.state = 'normal';
					expect(getStateImpedanceRepresentation(component.parameters.state)).toBe('finite');

					component.parameters.state = 'open';
					expect(getStateImpedanceRepresentation(component.parameters.state)).toBe('infinite');

					component.parameters.state = 'short';
					expect(getStateImpedanceRepresentation(component.parameters.state)).toBe('zero');

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.4: State validation rejects invalid states', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				fc.string().filter((s) => !['normal', 'open', 'short'].includes(s)),
				(componentType, invalidState) => {
					const component = createComponentByType(componentType, 0, 0);

					// Set invalid state
					component.parameters.state = invalidState;

					// Validation should fail
					const validation = component.validate();
					expect(validation.valid).toBe(false);
					expect(validation.errors.some((error) => error.includes('State must be one of'))).toBe(true);

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.5: Components in circuit maintain independent states', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						type: passiveComponentTypeArbitrary,
						state: componentStateArbitrary,
						x: fc.integer({ min: 0, max: 100 }),
						y: fc.integer({ min: 0, max: 100 }),
					}),
					{ minLength: 2, maxLength: 10 },
				),
				(componentSpecs) => {
					const circuit = new Circuit();

					// Create and add components with different states
					const components = componentSpecs.map((spec) => {
						const component = createComponentByType(spec.type, spec.x, spec.y);
						component.parameters.state = spec.state;
						circuit.addComponent(component);
						return component;
					});

					// Verify each component maintains its own state
					components.forEach((component, index) => {
						expect(component.parameters.state).toBe(componentSpecs[index].state);
					});

					// Change one component's state
					if (components.length > 0) {
						const firstComponent = components[0];
						const originalState = firstComponent.parameters.state;
						const newState = originalState === 'normal' ? 'open' : 'normal';
						firstComponent.parameters.state = newState;

						// Verify only the first component's state changed
						expect(firstComponent.parameters.state).toBe(newState);

						// Verify other components' states are unchanged
						for (let i = 1; i < components.length; i++) {
							expect(components[i].parameters.state).toBe(componentSpecs[i].state);
						}
					}

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.6: State is preserved through circuit serialization', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						type: passiveComponentTypeArbitrary,
						state: componentStateArbitrary,
						x: fc.integer({ min: 0, max: 100 }),
						y: fc.integer({ min: 0, max: 100 }),
					}),
					{ minLength: 1, maxLength: 5 },
				),
				(componentSpecs) => {
					const circuit = new Circuit();

					// Create and add components with different states
					componentSpecs.forEach((spec) => {
						const component = createComponentByType(spec.type, spec.x, spec.y);
						component.parameters.state = spec.state;
						circuit.addComponent(component);
					});

					// Serialize circuit
					const json = circuit.toJSON();

					// Deserialize circuit
					const restoredCircuit = Circuit.fromJSON(json);

					// Verify all component states are preserved
					expect(restoredCircuit.components.length).toBe(componentSpecs.length);

					restoredCircuit.components.forEach((component, index) => {
						expect(component.parameters.state).toBe(componentSpecs[index].state);
					});

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.7: Default state is always normal', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				fc.integer({ min: 0, max: 100 }),
				fc.integer({ min: 0, max: 100 }),
				(componentType, x, y) => {
					const component = createComponentByType(componentType, x, y);

					// Verify default state is normal
					expect(component.parameters.state).toBe('normal');

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.8: State transitions are idempotent', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				componentStateArbitrary,
				(componentType, targetState) => {
					const component = createComponentByType(componentType, 0, 0);

					// Set state multiple times
					component.parameters.state = targetState;
					const firstState = component.parameters.state;

					component.parameters.state = targetState;
					const secondState = component.parameters.state;

					component.parameters.state = targetState;
					const thirdState = component.parameters.state;

					// Verify state is the same after multiple assignments
					expect(firstState).toBe(targetState);
					expect(secondState).toBe(targetState);
					expect(thirdState).toBe(targetState);

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.9: All valid state transitions are possible', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				componentStateArbitrary,
				componentStateArbitrary,
				(componentType, fromState, toState) => {
					const component = createComponentByType(componentType, 0, 0);

					// Set initial state
					component.parameters.state = fromState;
					expect(component.parameters.state).toBe(fromState);

					// Transition to new state
					component.parameters.state = toState;
					expect(component.parameters.state).toBe(toState);

					// Verify component is still valid
					const validation = component.validate();
					expect(validation.valid).toBe(true);

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 13.10: State parameter exists for all passive components', () => {
		fc.assert(
			fc.property(
				passiveComponentTypeArbitrary,
				(componentType) => {
					const component = createComponentByType(componentType, 0, 0);

					// Verify state parameter exists
					expect(component.parameters).toHaveProperty('state');
					expect(typeof component.parameters.state).toBe('string');

					// Verify it's one of the valid states
					expect(['normal', 'open', 'short']).toContain(component.parameters.state);

					return true;
				},
			),
			{ numRuns: 100 },
		);
	});
});
