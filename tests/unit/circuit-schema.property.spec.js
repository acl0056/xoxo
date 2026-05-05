/**
 * Property-Based Tests for Circuit Schema Validation
 * 
 * This test suite uses fast-check to generate random circuit data and validate
 * that it conforms to the circuit.schema.json specification.
 * 
 * Task: 2.7 Write property test: Generated circuit data validates against circuit schema
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 6.1, 6.2
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import circuitSchema from '@/schemas/circuit.schema.json';

describe('Property-Based Tests: Circuit Schema Validation', () => {
	let ajv;
	let validateCircuit;

	beforeEach(() => {
		ajv = new Ajv({
			strict: true,
			allErrors: true,
			verbose: true,
		});
		addFormats(ajv);
		validateCircuit = ajv.compile(circuitSchema);
	});

	// Custom arbitraries for circuit data generation

	/**
	 * Generate valid resistor parameters
	 */
	const resistorParametersArbitrary = () => fc.record({
		resistance: fc.double({ min: 0.01, max: 1000000, noNaN: true, noDefaultInfinity: true }),
		tolerance: fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
		state: fc.constantFrom('normal', 'open', 'short'),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate valid capacitor parameters
	 */
	const capacitorParametersArbitrary = () => fc.record({
		capacitance: fc.double({ min: 1e-9, max: 1, noNaN: true, noDefaultInfinity: true }),
		tolerance: fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
		esr: fc.double({ min: 0.001, max: 100, noNaN: true, noDefaultInfinity: true }),
		state: fc.constantFrom('normal', 'open', 'short'),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate valid inductor parameters
	 */
	const inductorParametersArbitrary = () => fc.record({
		inductance: fc.double({ min: 1e-6, max: 10, noNaN: true, noDefaultInfinity: true }),
		tolerance: fc.double({ min: 0.1, max: 100, noNaN: true, noDefaultInfinity: true }),
		esr: fc.double({ min: 0.001, max: 100, noNaN: true, noDefaultInfinity: true }),
		state: fc.constantFrom('normal', 'open', 'short'),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate valid off-axis file entry
	 */
	const offAxisFileArbitrary = () => fc.record({
		angle: fc.double({ min: 0.1, max: 180, noNaN: true, noDefaultInfinity: true }),
		frdPath: fc.string({ minLength: 1 }),
		phaseSource: fc.constantFrom('measured', 'derived'),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate valid speaker parameters
	 */
	const speakerParametersArbitrary = () => fc.record({
		name: fc.string(),
		sensitivity: fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }),
		delay: fc.double({ min: 0.001, max: 100, noNaN: true, noDefaultInfinity: true }),
		inverted: fc.boolean(),
		muted: fc.boolean(),
		frdFile: fc.oneof(fc.constant(null), fc.string({ minLength: 1 })),
		zmaFile: fc.oneof(fc.constant(null), fc.string({ minLength: 1 })),
		frdPhaseSource: fc.constantFrom('measured', 'derived'),
		zmaPhaseSource: fc.constantFrom('measured', 'derived'),
		offAxisFiles: fc.array(offAxisFileArbitrary(), { maxLength: 10 }),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate valid ground parameters (empty object)
	 */
	const groundParametersArbitrary = () => fc.constant({});

	/**
	 * Generate valid voltage source parameters
	 */
	const sourceParametersArbitrary = () => fc.record({
		power: fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
		impedance: fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
		delay: fc.double({ min: 0.001, max: 100, noNaN: true, noDefaultInfinity: true }),
		inverted: fc.boolean(),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate a valid component based on type
	 */
	const componentArbitrary = () => fc.constantFrom(
		'resistor',
		'capacitor',
		'inductor',
		'speaker',
		'ground',
		'source',
	).chain((type) => {
		let parametersArbitrary;
		switch (type) {
			case 'resistor':
				parametersArbitrary = resistorParametersArbitrary();
				break;
			case 'capacitor':
				parametersArbitrary = capacitorParametersArbitrary();
				break;
			case 'inductor':
				parametersArbitrary = inductorParametersArbitrary();
				break;
			case 'speaker':
				parametersArbitrary = speakerParametersArbitrary();
				break;
			case 'ground':
				parametersArbitrary = groundParametersArbitrary();
				break;
			case 'source':
				parametersArbitrary = sourceParametersArbitrary();
				break;
			default:
				parametersArbitrary = fc.constant({});
		}

		return fc.record({
			id: fc.uuid(),
			type: fc.constant(type),
			label: fc.string(),
			x: fc.integer({ min: -1000, max: 1000 }),
			y: fc.integer({ min: -1000, max: 1000 }),
			rotation: fc.constantFrom(0, 90, 180, 270),
			parameters: parametersArbitrary,
		}).map((obj) => {
			const { __proto__, ...cleanObj } = obj;
			return cleanObj;
		});
	});

	/**
	 * Generate a valid node reference
	 */
	const nodeReferenceArbitrary = (componentIds) => {
		if (componentIds.length === 0) {
			// Fallback if no components
			return fc.record({
				componentId: fc.uuid(),
				terminal: fc.integer({ min: 0, max: 3 }),
			}).map((obj) => {
				const { __proto__, ...cleanObj } = obj;
				return cleanObj;
			});
		}
		return fc.record({
			componentId: fc.constantFrom(...componentIds),
			terminal: fc.integer({ min: 0, max: 3 }),
		}).map((obj) => {
			const { __proto__, ...cleanObj } = obj;
			return cleanObj;
		});
	};

	/**
	 * Generate a valid point for wire segments
	 */
	const pointArbitrary = () => fc.record({
		x: fc.integer({ min: -1000, max: 1000 }),
		y: fc.integer({ min: -1000, max: 1000 }),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate a valid wire
	 */
	const wireArbitrary = (componentIds) => fc.record({
		id: fc.uuid(),
		startNode: nodeReferenceArbitrary(componentIds),
		endNode: nodeReferenceArbitrary(componentIds),
		segments: fc.array(pointArbitrary(), { maxLength: 10 }),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate a valid annotation
	 */
	const annotationArbitrary = () => fc.record({
		id: fc.uuid(),
		x: fc.integer({ min: -1000, max: 1000 }),
		y: fc.integer({ min: -1000, max: 1000 }),
		text: fc.string({ maxLength: 100 }),
		fontSize: fc.integer({ min: 8, max: 72 }),
	}).map((obj) => {
		// Remove __proto__ if it exists to avoid schema validation issues
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate valid metadata
	 */
	const metadataArbitrary = () => fc.record({
		name: fc.string(),
		created: fc.integer({ min: 946684800000, max: 1924905600000 }).map((timestamp) => new Date(timestamp).toISOString()),
		modified: fc.integer({ min: 946684800000, max: 1924905600000 }).map((timestamp) => new Date(timestamp).toISOString()),
	}).map((obj) => {
		const { __proto__, ...cleanObj } = obj;
		return cleanObj;
	});

	/**
	 * Generate a complete valid circuit
	 */
	const circuitArbitrary = () => fc.array(componentArbitrary(), { minLength: 0, maxLength: 20 })
		.chain((components) => {
			const componentIds = components.map((c) => c.id);
			return fc.record({
				version: fc.constantFrom('1.0', '1.1', '2.0'),
				metadata: metadataArbitrary(),
				components: fc.constant(components),
				wires: fc.array(wireArbitrary(componentIds), { maxLength: 30 }),
				annotations: fc.array(annotationArbitrary(), { maxLength: 10 }),
			}).map((obj) => {
				const { __proto__, ...cleanObj } = obj;
				return cleanObj;
			});
		});

	test('Property: Generated circuit data validates against circuit schema', () => {
		// Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 6.1, 6.2
		fc.assert(
			fc.property(circuitArbitrary(), (circuit) => {
				const isValid = validateCircuit(circuit);
				if (!isValid) {
					console.error('Validation errors:', validateCircuit.errors);
					console.error('Invalid circuit:', JSON.stringify(circuit, null, 2));
				}
				return isValid;
			}),
		);
	});

	test('Property: Generated resistor components validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.array(
						fc.record({
							id: fc.uuid(),
							type: fc.constant('resistor'),
							label: fc.string(),
							x: fc.integer(),
							y: fc.integer(),
							rotation: fc.constantFrom(0, 90, 180, 270),
							parameters: resistorParametersArbitrary(),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						}),
						{ minLength: 1, maxLength: 5 },
					),
					wires: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Resistor validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Generated capacitor components validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.array(
						fc.record({
							id: fc.uuid(),
							type: fc.constant('capacitor'),
							label: fc.string(),
							x: fc.integer(),
							y: fc.integer(),
							rotation: fc.constantFrom(0, 90, 180, 270),
							parameters: capacitorParametersArbitrary(),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						}),
						{ minLength: 1, maxLength: 5 },
					),
					wires: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Capacitor validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Generated inductor components validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.array(
						fc.record({
							id: fc.uuid(),
							type: fc.constant('inductor'),
							label: fc.string(),
							x: fc.integer(),
							y: fc.integer(),
							rotation: fc.constantFrom(0, 90, 180, 270),
							parameters: inductorParametersArbitrary(),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						}),
						{ minLength: 1, maxLength: 5 },
					),
					wires: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Inductor validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Generated speaker components validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.array(
						fc.record({
							id: fc.uuid(),
							type: fc.constant('speaker'),
							label: fc.string(),
							x: fc.integer(),
							y: fc.integer(),
							rotation: fc.constantFrom(0, 90, 180, 270),
							parameters: speakerParametersArbitrary(),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						}),
						{ minLength: 1, maxLength: 5 },
					),
					wires: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Speaker validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Generated voltage source components validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.array(
						fc.record({
							id: fc.uuid(),
							type: fc.constant('source'),
							label: fc.string(),
							x: fc.integer(),
							y: fc.integer(),
							rotation: fc.constantFrom(0, 90, 180, 270),
							parameters: sourceParametersArbitrary(),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						}),
						{ minLength: 1, maxLength: 2 },
					),
					wires: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Source validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Generated ground components validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.array(
						fc.record({
							id: fc.uuid(),
							type: fc.constant('ground'),
							label: fc.string(),
							x: fc.integer(),
							y: fc.integer(),
							rotation: fc.constantFrom(0, 90, 180, 270),
							parameters: groundParametersArbitrary(),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						}),
						{ minLength: 1, maxLength: 5 },
					),
					wires: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Ground validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Generated wires with valid node references validate', () => {
		fc.assert(
			fc.property(circuitArbitrary(), (circuit) => {
				// Ensure all wire node references point to existing components
				const componentIds = new Set(circuit.components.map((c) => c.id));
				const allReferencesValid = circuit.wires.every((wire) => componentIds.has(wire.startNode.componentId)
						&& componentIds.has(wire.endNode.componentId));

				if (!allReferencesValid) {
					// Skip this test case if references are invalid
					// (this is expected since we generate random IDs)
					return true;
				}

				const isValid = validateCircuit(circuit);
				if (!isValid) {
					console.error('Wire validation errors:', validateCircuit.errors);
				}
				return isValid;
			}),
		);
	});

	test('Property: Generated annotations validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: metadataArbitrary(),
					components: fc.constant([]),
					wires: fc.constant([]),
					annotations: fc.array(annotationArbitrary(), { minLength: 1, maxLength: 10 }),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Annotation validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Circuits with mixed component types validate', () => {
		fc.assert(
			fc.property(circuitArbitrary(), (circuit) => {
				const isValid = validateCircuit(circuit);
				if (!isValid) {
					console.error('Mixed component validation errors:', validateCircuit.errors);
					console.error('Component types:', circuit.components.map((c) => c.type));
				}
				return isValid;
			}),
		);
	});

	test('Property: Empty circuits validate', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constantFrom('1.0', '1.1', '2.0'),
					metadata: metadataArbitrary(),
					components: fc.constant([]),
					wires: fc.constant([]),
					annotations: fc.constant([]),
				}).map((obj) => {
					const { __proto__, ...cleanObj } = obj;
					return cleanObj;
				}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Empty circuit validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});

	test('Property: Circuits with maximum complexity validate', () => {
		fc.assert(
			fc.property(
				fc.array(componentArbitrary(), { minLength: 15, maxLength: 20 })
					.chain((components) => {
						const componentIds = components.map((c) => c.id);
						return fc.record({
							version: fc.constant('1.0'),
							metadata: metadataArbitrary(),
							components: fc.constant(components),
							wires: fc.array(wireArbitrary(componentIds), { minLength: 20, maxLength: 30 }),
							annotations: fc.array(annotationArbitrary(), { minLength: 5, maxLength: 10 }),
						}).map((obj) => {
							const { __proto__, ...cleanObj } = obj;
							return cleanObj;
						});
					}),
				(circuit) => {
					const isValid = validateCircuit(circuit);
					if (!isValid) {
						console.error('Complex circuit validation errors:', validateCircuit.errors);
					}
					return isValid;
				},
			),
		);
	});
});
