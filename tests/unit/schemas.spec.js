/**
 * Schema Validation Tests
 * 
 * This test suite validates that all JSON Schema files are valid according to
 * the JSON Schema Draft 07 specification. It uses Ajv (Another JSON Schema Validator)
 * to compile and validate each schema file.
 * 
 * Task: 2.6 Write unit tests to validate schema files are valid JSON Schema
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import all schema files
import circuitSchema from '@/schemas/circuit.schema.json';
import frdDataSchema from '@/schemas/frd-data.schema.json';
import zmaDataSchema from '@/schemas/zma-data.schema.json';
import simulationResultsSchema from '@/schemas/simulation-results.schema.json';
import solverResultSchema from '@/schemas/solver-result.schema.json';
import frequencyResponseDataSchema from '@/schemas/frequency-response-data.schema.json';
import impedanceResponseDataSchema from '@/schemas/impedance-response-data.schema.json';

describe('JSON Schema Validation', () => {
	let ajv;

	beforeEach(() => {
		// Create a new Ajv instance for each test
		// Use strict mode to catch schema errors
		ajv = new Ajv({
			strict: true,
			allErrors: true,
			verbose: true,
		});

		// Add format validation support (for date-time, etc.)
		addFormats(ajv);
	});

	describe('Circuit Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(circuitSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(circuitSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required top-level properties', () => {
			expect(circuitSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(circuitSchema.$id).toBe('circuit.schema.json');
			expect(circuitSchema.type).toBe('object');
			expect(circuitSchema.required).toContain('version');
			expect(circuitSchema.required).toContain('metadata');
			expect(circuitSchema.required).toContain('components');
			expect(circuitSchema.required).toContain('wires');
		});

		it('should have all component type definitions', () => {
			expect(circuitSchema.definitions).toBeDefined();
			expect(circuitSchema.definitions.component).toBeDefined();
			expect(circuitSchema.definitions.resistorParameters).toBeDefined();
			expect(circuitSchema.definitions.capacitorParameters).toBeDefined();
			expect(circuitSchema.definitions.inductorParameters).toBeDefined();
			expect(circuitSchema.definitions.speakerParameters).toBeDefined();
			expect(circuitSchema.definitions.groundParameters).toBeDefined();
			expect(circuitSchema.definitions.sourceParameters).toBeDefined();
		});

		it('should have wire and node definitions', () => {
			expect(circuitSchema.definitions.wire).toBeDefined();
			expect(circuitSchema.definitions.nodeReference).toBeDefined();
			expect(circuitSchema.definitions.point).toBeDefined();
		});

		it('should have annotation definition', () => {
			expect(circuitSchema.definitions.annotation).toBeDefined();
		});
	});

	describe('FRD Data Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(frdDataSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(frdDataSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required properties', () => {
			expect(frdDataSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(frdDataSchema.$id).toBe('frd-data.schema.json');
			expect(frdDataSchema.type).toBe('object');
			expect(frdDataSchema.required).toContain('frequencies');
			expect(frdDataSchema.required).toContain('magnitudes');
			expect(frdDataSchema.required).toContain('phases');
		});

		it('should have proper array constraints', () => {
			expect(frdDataSchema.properties.frequencies.type).toBe('array');
			expect(frdDataSchema.properties.frequencies.minItems).toBe(1);
			expect(frdDataSchema.properties.magnitudes.type).toBe('array');
			expect(frdDataSchema.properties.magnitudes.minItems).toBe(1);
			expect(frdDataSchema.properties.phases.type).toBe('array');
			expect(frdDataSchema.properties.phases.minItems).toBe(1);
		});
	});

	describe('ZMA Data Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(zmaDataSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(zmaDataSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required properties', () => {
			expect(zmaDataSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(zmaDataSchema.$id).toBe('zma-data.schema.json');
			expect(zmaDataSchema.type).toBe('object');
			expect(zmaDataSchema.required).toContain('frequencies');
			expect(zmaDataSchema.required).toContain('impedances');
			expect(zmaDataSchema.required).toContain('phases');
		});

		it('should have proper array constraints', () => {
			expect(zmaDataSchema.properties.frequencies.type).toBe('array');
			expect(zmaDataSchema.properties.frequencies.minItems).toBe(1);
			expect(zmaDataSchema.properties.impedances.type).toBe('array');
			expect(zmaDataSchema.properties.impedances.minItems).toBe(1);
			expect(zmaDataSchema.properties.phases.type).toBe('array');
			expect(zmaDataSchema.properties.phases.minItems).toBe(1);
		});
	});

	describe('Simulation Results Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(simulationResultsSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(simulationResultsSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required properties', () => {
			expect(simulationResultsSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(simulationResultsSchema.$id).toBe('simulation-results.schema.json');
			expect(simulationResultsSchema.type).toBe('object');
			expect(simulationResultsSchema.required).toContain('frequencyResponse');
			expect(simulationResultsSchema.required).toContain('impedanceResponse');
			expect(simulationResultsSchema.required).toContain('timestamp');
		});

		it('should have nested frequency response structure', () => {
			const frequencyResponse = simulationResultsSchema.properties.frequencyResponse;
			expect(frequencyResponse.type).toBe('object');
			expect(frequencyResponse.required).toContain('frequencies');
			expect(frequencyResponse.required).toContain('spl');
			expect(frequencyResponse.required).toContain('phase');
		});

		it('should have nested impedance response structure', () => {
			const impedanceResponse = simulationResultsSchema.properties.impedanceResponse;
			expect(impedanceResponse.type).toBe('object');
			expect(impedanceResponse.required).toContain('frequencies');
			expect(impedanceResponse.required).toContain('impedances');
			expect(impedanceResponse.required).toContain('phases');
		});
	});

	describe('Solver Result Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(solverResultSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(solverResultSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required properties', () => {
			expect(solverResultSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(solverResultSchema.$id).toBe('solver-result.schema.json');
			expect(solverResultSchema.type).toBe('object');
			expect(solverResultSchema.required).toContain('frequency');
			expect(solverResultSchema.required).toContain('nodeVoltages');
			expect(solverResultSchema.required).toContain('sourceCurrents');
		});

		it('should have complex number definition', () => {
			expect(solverResultSchema.definitions).toBeDefined();
			expect(solverResultSchema.definitions.complexNumber).toBeDefined();
			expect(solverResultSchema.definitions.complexNumber.required).toContain('re');
			expect(solverResultSchema.definitions.complexNumber.required).toContain('im');
		});

		it('should validate valid solver result data', () => {
			const validate = ajv.compile(solverResultSchema);

			const validData = {
				frequency: 1000,
				nodeVoltages: {
					'node1': { re: 1.5, im: 0.5 },
					'node2': { re: 2.0, im: -0.3 },
				},
				sourceCurrents: {
					'source1': { re: 0.354, im: 0 },
				},
			};

			expect(validate(validData)).toBe(true);
		});

		it('should reject invalid frequency values', () => {
			const validate = ajv.compile(solverResultSchema);

			const invalidData = {
				frequency: 0, // Must be > 0
				nodeVoltages: {},
				sourceCurrents: {},
			};

			expect(validate(invalidData)).toBe(false);
		});
	});

	describe('Frequency Response Data Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(frequencyResponseDataSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(frequencyResponseDataSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required properties', () => {
			expect(frequencyResponseDataSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(frequencyResponseDataSchema.$id).toBe('frequency-response-data.schema.json');
			expect(frequencyResponseDataSchema.type).toBe('object');
			expect(frequencyResponseDataSchema.required).toContain('frequencies');
			expect(frequencyResponseDataSchema.required).toContain('spl');
			expect(frequencyResponseDataSchema.required).toContain('phase');
		});

		it('should validate valid frequency response data', () => {
			const validate = ajv.compile(frequencyResponseDataSchema);

			const validData = {
				frequencies: [100, 1000, 10000],
				spl: [85, 90, 88],
				phase: [-45, -90, -135],
			};

			expect(validate(validData)).toBe(true);
		});

		it('should validate system response with speaker responses', () => {
			const validate = ajv.compile(frequencyResponseDataSchema);

			const validData = {
				frequencies: [100, 1000, 10000],
				spl: [85, 90, 88],
				phase: [-45, -90, -135],
				speakerResponses: {
					'speaker1': {
						frequencies: [100, 1000, 10000],
						spl: [85, 90, 88],
						phase: [-45, -90, -135],
					},
				},
			};

			expect(validate(validData)).toBe(true);
		});

		it('should enforce phase range constraints', () => {
			const validate = ajv.compile(frequencyResponseDataSchema);

			const invalidData = {
				frequencies: [100, 1000],
				spl: [85, 90],
				phase: [-181, 0], // Out of range
			};

			expect(validate(invalidData)).toBe(false);
		});
	});

	describe('Impedance Response Data Schema', () => {
		it('should be a valid JSON Schema', () => {
			expect(() => {
				ajv.compile(impedanceResponseDataSchema);
			}).not.toThrow();
		});

		it('should compile without errors', () => {
			const validate = ajv.compile(impedanceResponseDataSchema);
			expect(validate).toBeDefined();
			expect(typeof validate).toBe('function');
		});

		it('should have required properties', () => {
			expect(impedanceResponseDataSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(impedanceResponseDataSchema.$id).toBe('impedance-response-data.schema.json');
			expect(impedanceResponseDataSchema.type).toBe('object');
			expect(impedanceResponseDataSchema.required).toContain('frequencies');
			expect(impedanceResponseDataSchema.required).toContain('impedances');
			expect(impedanceResponseDataSchema.required).toContain('phases');
		});

		it('should validate valid impedance response data', () => {
			const validate = ajv.compile(impedanceResponseDataSchema);

			const validData = {
				frequencies: [100, 1000, 10000],
				impedances: [8.0, 8.5, 9.0],
				phases: [-10, 0, 10],
			};

			expect(validate(validData)).toBe(true);
		});

		it('should enforce positive impedance values', () => {
			const validate = ajv.compile(impedanceResponseDataSchema);

			const invalidData = {
				frequencies: [100, 1000],
				impedances: [-8.0, 8.5], // Negative impedance not allowed
				phases: [0, 0],
			};

			expect(validate(invalidData)).toBe(false);
		});

		it('should enforce phase range constraints', () => {
			const validate = ajv.compile(impedanceResponseDataSchema);

			const invalidData = {
				frequencies: [100, 1000],
				impedances: [8.0, 8.5],
				phases: [0, 181], // Out of range
			};

			expect(validate(invalidData)).toBe(false);
		});
	});

	describe('Schema Cross-Validation', () => {
		it('should compile all schemas together without conflicts', () => {
			const ajvInstance = new Ajv({
				strict: true,
				allErrors: true,
			});
			addFormats(ajvInstance);

			// Compile all schemas
			expect(() => {
				ajvInstance.compile(circuitSchema);
				ajvInstance.compile(frdDataSchema);
				ajvInstance.compile(zmaDataSchema);
				ajvInstance.compile(simulationResultsSchema);
				ajvInstance.compile(solverResultSchema);
				ajvInstance.compile(frequencyResponseDataSchema);
				ajvInstance.compile(impedanceResponseDataSchema);
			}).not.toThrow();
		});

		it('should have unique schema IDs', () => {
			const schemaIds = [
				circuitSchema.$id,
				frdDataSchema.$id,
				zmaDataSchema.$id,
				simulationResultsSchema.$id,
				solverResultSchema.$id,
				frequencyResponseDataSchema.$id,
				impedanceResponseDataSchema.$id,
			];

			const uniqueIds = new Set(schemaIds);
			expect(uniqueIds.size).toBe(schemaIds.length);
		});

		it('should all use the same JSON Schema version', () => {
			const expectedVersion = 'http://json-schema.org/draft-07/schema#';
			expect(circuitSchema.$schema).toBe(expectedVersion);
			expect(frdDataSchema.$schema).toBe(expectedVersion);
			expect(zmaDataSchema.$schema).toBe(expectedVersion);
			expect(simulationResultsSchema.$schema).toBe(expectedVersion);
			expect(solverResultSchema.$schema).toBe(expectedVersion);
			expect(frequencyResponseDataSchema.$schema).toBe(expectedVersion);
			expect(impedanceResponseDataSchema.$schema).toBe(expectedVersion);
		});
	});

	describe('Schema Constraint Validation', () => {
		it('should enforce numeric constraints in circuit schema', () => {
			const validate = ajv.compile(circuitSchema);

			// Test valid circuit data
			const validCircuit = {
				version: '1.0',
				metadata: {
					name: 'Test Circuit',
					created: '2024-01-01T00:00:00Z',
					modified: '2024-01-01T00:00:00Z',
				},
				components: [
					{
						id: 'r1',
						type: 'resistor',
						label: 'R1',
						x: 0,
						y: 0,
						rotation: 0,
						parameters: {
							resistance: 8.0,
							tolerance: 5,
							state: 'normal',
						},
					},
				],
				wires: [],
			};

			expect(validate(validCircuit)).toBe(true);
		});

		it('should enforce phase range constraints in FRD schema', () => {
			const validate = ajv.compile(frdDataSchema);

			// Valid data
			const validData = {
				frequencies: [100, 200, 300],
				magnitudes: [85, 86, 87],
				phases: [-180, 0, 180],
			};
			expect(validate(validData)).toBe(true);

			// Invalid phase (out of range)
			const invalidData = {
				frequencies: [100, 200, 300],
				magnitudes: [85, 86, 87],
				phases: [-181, 0, 180],
			};
			expect(validate(invalidData)).toBe(false);
		});

		it('should enforce positive frequency constraints', () => {
			const validateFrd = ajv.compile(frdDataSchema);

			// Invalid: zero frequency
			const invalidData = {
				frequencies: [0, 100, 200],
				magnitudes: [85, 86, 87],
				phases: [0, 0, 0],
			};
			expect(validateFrd(invalidData)).toBe(false);

			// Invalid: negative frequency
			const invalidData2 = {
				frequencies: [-10, 100, 200],
				magnitudes: [85, 86, 87],
				phases: [0, 0, 0],
			};
			expect(validateFrd(invalidData2)).toBe(false);
		});

		it('should enforce minimum array length constraints', () => {
			const validate = ajv.compile(frdDataSchema);

			// Invalid: empty arrays
			const invalidData = {
				frequencies: [],
				magnitudes: [],
				phases: [],
			};
			expect(validate(invalidData)).toBe(false);
		});
	});
});
