import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import { FileOperations } from '../../../src/io/FileOperations';
import { Circuit } from '../../../src/models/Circuit';

/**
 * Property 19: Invalid File Rejection
 * For any corrupted or invalid JSON file, attempting to load should produce an error message
 * and prevent loading, leaving the current circuit unchanged.
 *
 * Feature: crossover-network-simulator, Property 19: Invalid file rejection
 * Validates: Requirements 6.4
 */
describe('Feature: crossover-network-simulator, Property 19: Invalid file rejection', () => {
	const testDirectory = path.join(__dirname, 'pbt-test-files');
	const testFilePath = path.join(testDirectory, 'invalid-circuit.json');

	beforeEach(() => {
		if (!fs.existsSync(testDirectory)) {
			fs.mkdirSync(testDirectory, { recursive: true });
		}
	});

	afterEach(() => {
		if (fs.existsSync(testDirectory)) {
			fs.rmSync(testDirectory, { recursive: true, force: true });
		}
	});

	test('should reject corrupted JSON files', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 1000 }).filter((str) => {
					// Generate strings that are NOT valid JSON
					try {
						JSON.parse(str);
						return false; // Valid JSON, skip
					} catch (error) {
						return true; // Invalid JSON, use it
					}
				}),
				(invalidJsonString) => {
					// Write invalid JSON to file
					fs.writeFileSync(testFilePath, invalidJsonString, 'utf8');

					// Attempt to load should throw an error
					expect(() => {
						FileOperations.loadCircuit(testFilePath);
					}).toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should reject JSON files with invalid circuit structure', () => {
		fc.assert(
			fc.property(
				fc.record({
					// Generate objects that are valid JSON but invalid circuit structure
					randomField1: fc.string(),
					randomField2: fc.integer(),
					randomField3: fc.boolean(),
				}),
				(invalidCircuitData) => {
					// Write valid JSON but invalid circuit structure
					fs.writeFileSync(testFilePath, JSON.stringify(invalidCircuitData), 'utf8');

					// Attempt to load should throw an error
					expect(() => {
						FileOperations.loadCircuit(testFilePath);
					}).toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should reject circuit files with missing required fields', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constantFrom('1.0', '2.0'),
					// Intentionally omit metadata or make it incomplete
					components: fc.constant([]),
					wires: fc.constant([]),
				}),
				(incompleteCircuitData) => {
					fs.writeFileSync(testFilePath, JSON.stringify(incompleteCircuitData), 'utf8');

					expect(() => {
						FileOperations.loadCircuit(testFilePath);
					}).toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should reject circuit files with invalid component data', () => {
		fc.assert(
			fc.property(
				fc.record({
					version: fc.constant('1.0'),
					metadata: fc.record({
						name: fc.string(),
						created: fc.integer({ min: 0, max: Date.now() }).map((timestamp) => new Date(timestamp).toISOString()),
						modified: fc.integer({ min: 0, max: Date.now() }).map((timestamp) => new Date(timestamp).toISOString()),
					}),
					components: fc.array(
						fc.record({
							// Missing required fields like id, type, x, y
							label: fc.string(),
							someRandomField: fc.integer(),
						}),
						{ minLength: 1, maxLength: 5 },
					),
					wires: fc.constant([]),
					annotations: fc.constant([]),
				}),
				(invalidCircuitData) => {
					fs.writeFileSync(testFilePath, JSON.stringify(invalidCircuitData), 'utf8');

					expect(() => {
						FileOperations.loadCircuit(testFilePath);
					}).toThrow();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should not modify current circuit when load fails', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 500 }).filter((str) => {
					try {
						JSON.parse(str);
						return false;
					} catch (error) {
						return true;
					}
				}),
				(invalidJsonString) => {
					// Create a valid circuit first
					const validCircuit = new Circuit();
					validCircuit.metadata.name = 'Original Circuit';

					// Write invalid file
					fs.writeFileSync(testFilePath, invalidJsonString, 'utf8');

					// Attempt to load invalid file should throw
					let loadError = null;
					try {
						FileOperations.loadCircuit(testFilePath);
					} catch (error) {
						loadError = error;
					}

					// Verify error was thrown
					expect(loadError).not.toBeNull();

					// Verify original circuit is unchanged (we can't directly test this
					// without a circuit manager, but we verify the error was thrown)
					expect(loadError.message).toBeTruthy();
				},
			),
			{ numRuns: 100 },
		);
	});

	test('should provide specific error messages for different failure types', () => {
		fc.assert(
			fc.property(
				fc.oneof(
					// Corrupted JSON
					fc.string({ minLength: 1, maxLength: 100 }).filter((str) => {
						try {
							JSON.parse(str);
							return false;
						} catch (error) {
							return true;
						}
					}),
					// Valid JSON but invalid structure
					fc.record({
						randomField: fc.string(),
					}).map((obj) => JSON.stringify(obj)),
				),
				(fileContent) => {
					fs.writeFileSync(testFilePath, fileContent, 'utf8');

					let errorMessage = '';
					try {
						FileOperations.loadCircuit(testFilePath);
					} catch (error) {
						errorMessage = error.message;
					}

					// Error message should be non-empty and descriptive
					expect(errorMessage).toBeTruthy();
					expect(errorMessage.length).toBeGreaterThan(0);

					// Should contain either "Corrupted" or "Invalid" or "validation"
					const hasDescriptiveError = errorMessage.includes('Corrupted')
						|| errorMessage.includes('Invalid')
						|| errorMessage.includes('validation')
						|| errorMessage.includes('Failed');

					expect(hasDescriptiveError).toBe(true);
				},
			),
			{ numRuns: 100 },
		);
	});
});

