/**
 * Property-Based Test: Default Parameter Assignment (Property 8)
 * Feature: crossover-network-simulator, Property 8: Default parameter assignment
 *
 * Property: For any newly created component, all required parameters should be
 * initialized with valid default values appropriate for the component type.
 *
 * Validates: Requirements 2.3
 */

import fc from 'fast-check';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';

describe('Feature: crossover-network-simulator, Property 8: Default parameter assignment', () => {
	/**
	 * Generator for component types
	 */
	const componentTypeGenerator = () => fc.constantFrom(
		'resistor',
		'capacitor',
		'inductor',
		'speaker',
		'source',
		'ground',
	);

	/**
	 * Generator for grid positions
	 */
	const positionGenerator = () => fc.record({
		x: fc.integer({ min: -100, max: 100 }),
		y: fc.integer({ min: -100, max: 100 }),
	});

	/**
	 * Create a component instance based on type
	 */
	function createComponent(type, x, y) {
		switch (type) {
			case 'resistor':
				return new Resistor(x, y);
			case 'capacitor':
				return new Capacitor(x, y);
			case 'inductor':
				return new Inductor(x, y);
			case 'speaker':
				return new Speaker(x, y);
			case 'source':
				return new VoltageSource(x, y);
			case 'ground':
				return new Ground(x, y);
			default:
				throw new Error(`Unknown component type: ${type}`);
		}
	}

	/**
	 * Validate that a parameter value is defined and not null/undefined
	 */
	function isValidParameterValue(value) {
		return value !== null && value !== undefined;
	}

	/**
	 * Validate that a numeric parameter is a valid number
	 */
	function isValidNumber(value) {
		return typeof value === 'number' && !isNaN(value) && isFinite(value);
	}

	/**
	 * Validate that a parameter is within acceptable range
	 */
	function isInValidRange(value, min, max) {
		return isValidNumber(value) && value >= min && value <= max;
	}

	test('Property 8: All components have required parameters initialized', () => {
		fc.assert(
			fc.property(
				componentTypeGenerator(),
				positionGenerator(),
				(type, position) => {
					const component = createComponent(type, position.x, position.y);

					// All components should have a parameters object
					expect(component.parameters).toBeDefined();
					expect(typeof component.parameters).toBe('object');

					// Validate component has all required parameters based on type
					switch (type) {
						case 'resistor':
							expect(isValidParameterValue(component.parameters.resistance)).toBe(true);
							expect(isValidParameterValue(component.parameters.tolerance)).toBe(true);
							expect(isValidParameterValue(component.parameters.state)).toBe(true);
							break;

						case 'capacitor':
							expect(isValidParameterValue(component.parameters.capacitance)).toBe(true);
							expect(isValidParameterValue(component.parameters.tolerance)).toBe(true);
							expect(isValidParameterValue(component.parameters.esr)).toBe(true);
							expect(isValidParameterValue(component.parameters.state)).toBe(true);
							break;

						case 'inductor':
							expect(isValidParameterValue(component.parameters.inductance)).toBe(true);
							expect(isValidParameterValue(component.parameters.tolerance)).toBe(true);
							expect(isValidParameterValue(component.parameters.esr)).toBe(true);
							expect(isValidParameterValue(component.parameters.state)).toBe(true);
							break;

						case 'speaker':
							expect(isValidParameterValue(component.parameters.name)).toBe(true);
							expect(isValidParameterValue(component.parameters.sensitivity)).toBe(true);
							expect(isValidParameterValue(component.parameters.delay)).toBe(true);
							expect(isValidParameterValue(component.parameters.inverted)).toBe(true);
							expect(isValidParameterValue(component.parameters.muted)).toBe(true);
							expect(isValidParameterValue(component.parameters.phaseSource)).toBe(true);
							expect(isValidParameterValue(component.parameters.offAxisFiles)).toBe(true);
							break;

						case 'source':
							expect(isValidParameterValue(component.parameters.power)).toBe(true);
							expect(isValidParameterValue(component.parameters.impedance)).toBe(true);
							expect(isValidParameterValue(component.parameters.delay)).toBe(true);
							expect(isValidParameterValue(component.parameters.inverted)).toBe(true);
							break;

						case 'ground':
							// Ground has no parameters
							break;

						default:
							throw new Error(`Unknown component type: ${type}`);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8: Passive component default values are positive and valid', () => {
		fc.assert(
			fc.property(
				fc.constantFrom('resistor', 'capacitor', 'inductor'),
				positionGenerator(),
				(type, position) => {
					const component = createComponent(type, position.x, position.y);

					// Get the value parameter name based on component type
					let valueParam;
					switch (type) {
						case 'resistor':
							valueParam = 'resistance';
							break;
						case 'capacitor':
							valueParam = 'capacitance';
							break;
						case 'inductor':
							valueParam = 'inductance';
							break;
						default:
							throw new Error(`Unknown passive component type: ${type}`);
					}

					// Value must be a positive number
					expect(isValidNumber(component.parameters[valueParam])).toBe(true);
					expect(component.parameters[valueParam]).toBeGreaterThan(0);

					// Tolerance must be between 0 and 100
					expect(isInValidRange(component.parameters.tolerance, 0, 100)).toBe(true);

					// State must be one of the valid values
					expect(['normal', 'open', 'short']).toContain(component.parameters.state);

					// ESR must be non-negative for capacitors and inductors
					if (type === 'capacitor' || type === 'inductor') {
						expect(isValidNumber(component.parameters.esr)).toBe(true);
						expect(component.parameters.esr).toBeGreaterThanOrEqual(0);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8: Speaker default values are valid', () => {
		fc.assert(
			fc.property(
				positionGenerator(),
				(position) => {
					const speaker = new Speaker(position.x, position.y);

					// Name should be a string (can be empty)
					expect(typeof speaker.parameters.name).toBe('string');

					// Sensitivity should be a number
					expect(isValidNumber(speaker.parameters.sensitivity)).toBe(true);

					// Delay should be non-negative
					expect(isValidNumber(speaker.parameters.delay)).toBe(true);
					expect(speaker.parameters.delay).toBeGreaterThanOrEqual(0);

					// Inverted and muted should be booleans
					expect(typeof speaker.parameters.inverted).toBe('boolean');
					expect(typeof speaker.parameters.muted).toBe('boolean');

					// Phase source should be valid
					expect(['measured', 'derived']).toContain(speaker.parameters.phaseSource);

					// Off-axis files should be an array
					expect(Array.isArray(speaker.parameters.offAxisFiles)).toBe(true);

					// FRD and ZMA files can be null or string
					expect(
						speaker.parameters.frdFile === null || typeof speaker.parameters.frdFile === 'string',
					).toBe(true);
					expect(
						speaker.parameters.zmaFile === null || typeof speaker.parameters.zmaFile === 'string',
					).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8: Voltage source default values are valid', () => {
		fc.assert(
			fc.property(
				positionGenerator(),
				(position) => {
					const source = new VoltageSource(position.x, position.y);

					// Power should be positive
					expect(isValidNumber(source.parameters.power)).toBe(true);
					expect(source.parameters.power).toBeGreaterThan(0);

					// Impedance should be positive
					expect(isValidNumber(source.parameters.impedance)).toBe(true);
					expect(source.parameters.impedance).toBeGreaterThan(0);

					// Delay should be non-negative
					expect(isValidNumber(source.parameters.delay)).toBe(true);
					expect(source.parameters.delay).toBeGreaterThanOrEqual(0);

					// Inverted should be a boolean
					expect(typeof source.parameters.inverted).toBe('boolean');

					// Default should be 1W at 8 ohms
					expect(source.parameters.power).toBe(1.0);
					expect(source.parameters.impedance).toBe(8.0);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8: Component validation passes for default parameters', () => {
		fc.assert(
			fc.property(
				componentTypeGenerator(),
				positionGenerator(),
				(type, position) => {
					const component = createComponent(type, position.x, position.y);

					// All components should have a validate method
					expect(typeof component.validate).toBe('function');

					// Validation should pass for default parameters
					const validation = component.validate();
					expect(validation).toHaveProperty('valid');
					expect(validation).toHaveProperty('errors');
					expect(validation.valid).toBe(true);
					expect(validation.errors).toHaveLength(0);
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8: Components can be serialized with default parameters', () => {
		fc.assert(
			fc.property(
				componentTypeGenerator(),
				positionGenerator(),
				(type, position) => {
					const component = createComponent(type, position.x, position.y);

					// All components should have a toJSON method
					expect(typeof component.toJSON).toBe('function');

					// Serialization should succeed
					const json = component.toJSON();
					expect(json).toBeDefined();
					expect(typeof json).toBe('object');

					// JSON should include parameters
					expect(json).toHaveProperty('parameters');
					expect(typeof json.parameters).toBe('object');

					// JSON should be valid (can be stringified)
					expect(() => JSON.stringify(json)).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('Property 8: Default parameters remain consistent across multiple instantiations', () => {
		fc.assert(
			fc.property(
				componentTypeGenerator(),
				positionGenerator(),
				(type, position) => {
					// Create two instances of the same component type
					const component1 = createComponent(type, position.x, position.y);
					const component2 = createComponent(type, position.x, position.y);

					// Default parameters should be the same (excluding unique IDs)
					const params1 = JSON.parse(JSON.stringify(component1.parameters));
					const params2 = JSON.parse(JSON.stringify(component2.parameters));

					expect(params1).toEqual(params2);
				},
			),
			{ numRuns: 100 },
		);
	});
});
