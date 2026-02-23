import fs from 'fs';
import path from 'path';
import { FileOperations } from '../../../src/io/FileOperations';
import { Circuit } from '../../../src/models/Circuit';
import { Resistor } from '../../../src/models/Resistor';
import { VoltageSource } from '../../../src/models/VoltageSource';
import { Ground } from '../../../src/models/Ground';
import { Wire } from '../../../src/models/Wire';

describe('FileOperations', () => {
	const testDirectory = path.join(__dirname, 'test-files');
	const testFilePath = path.join(testDirectory, 'test-circuit.json');

	beforeEach(() => {
		// Create test directory if it doesn't exist
		if (!fs.existsSync(testDirectory)) {
			fs.mkdirSync(testDirectory, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test files
		if (fs.existsSync(testDirectory)) {
			fs.rmSync(testDirectory, { recursive: true, force: true });
		}
	});

	describe('saveCircuit', () => {
		test('should save a valid circuit to a file', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Test Circuit';

			const result = FileOperations.saveCircuit(circuit, testFilePath);

			expect(result.success).toBe(true);
			expect(result.filePath).toBe(testFilePath);
			expect(fs.existsSync(testFilePath)).toBe(true);
		});

		test('should save a circuit with components and wires', () => {
			const circuit = new Circuit();
			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			const source = new VoltageSource(0, 20);
			const ground = new Ground(30, 20);

			circuit.addComponent(resistor);
			circuit.addComponent(source);
			circuit.addComponent(ground);

			const wire = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 },
			);
			circuit.addWire(wire);

			FileOperations.saveCircuit(circuit, testFilePath);

			expect(fs.existsSync(testFilePath)).toBe(true);

			// Verify file content
			const fileContent = fs.readFileSync(testFilePath, 'utf8');
			const jsonData = JSON.parse(fileContent);

			expect(jsonData.components).toHaveLength(3);
			expect(jsonData.wires).toHaveLength(1);
		});

		test('should create directory if it does not exist', () => {
			const nestedPath = path.join(testDirectory, 'nested', 'deep', 'circuit.json');
			const circuit = new Circuit();

			FileOperations.saveCircuit(circuit, nestedPath);

			expect(fs.existsSync(nestedPath)).toBe(true);
		});

		test('should throw error if circuit is null', () => {
			expect(() => {
				FileOperations.saveCircuit(null, testFilePath);
			}).toThrow('Circuit is required');
		});

		test('should throw error if file path is invalid', () => {
			const circuit = new Circuit();

			expect(() => {
				FileOperations.saveCircuit(circuit, '');
			}).toThrow('Valid file path is required');

			expect(() => {
				FileOperations.saveCircuit(circuit, null);
			}).toThrow('Valid file path is required');
		});
	});

	describe('loadCircuit', () => {
		test('should load a valid circuit from a file', () => {
			const originalCircuit = new Circuit();
			originalCircuit.metadata.name = 'Test Circuit';

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			originalCircuit.addComponent(resistor);

			FileOperations.saveCircuit(originalCircuit, testFilePath);

			const loadedCircuit = FileOperations.loadCircuit(testFilePath);

			expect(loadedCircuit).toBeInstanceOf(Circuit);
			expect(loadedCircuit.metadata.name).toBe('Test Circuit');
			expect(loadedCircuit.components).toHaveLength(1);
			expect(loadedCircuit.components[0].label).toBe('R1');
		});

		test('should load a circuit with all component types', () => {
			const circuit = new Circuit();
			circuit.addComponent(new Resistor(0, 0));
			circuit.addComponent(new VoltageSource(10, 0));
			circuit.addComponent(new Ground(20, 0));

			FileOperations.saveCircuit(circuit, testFilePath);

			const loadedCircuit = FileOperations.loadCircuit(testFilePath);

			expect(loadedCircuit.components).toHaveLength(3);
			expect(loadedCircuit.components[0].type).toBe('resistor');
			expect(loadedCircuit.components[1].type).toBe('source');
			expect(loadedCircuit.components[2].type).toBe('ground');
		});

		test('should throw error if file does not exist', () => {
			const nonExistentPath = path.join(testDirectory, 'nonexistent.json');

			expect(() => {
				FileOperations.loadCircuit(nonExistentPath);
			}).toThrow('File not found');
		});

		test('should throw error if file path is invalid', () => {
			expect(() => {
				FileOperations.loadCircuit('');
			}).toThrow('Valid file path is required');

			expect(() => {
				FileOperations.loadCircuit(null);
			}).toThrow('Valid file path is required');
		});

		test('should throw error for corrupted JSON file', () => {
			// Write invalid JSON to file
			fs.writeFileSync(testFilePath, '{ invalid json }', 'utf8');

			expect(() => {
				FileOperations.loadCircuit(testFilePath);
			}).toThrow('Corrupted file');
		});

		test('should throw error for invalid circuit format', () => {
			// Write valid JSON but invalid circuit structure
			const invalidCircuit = {
				version: '1.0',
				// Missing required metadata field
				components: [],
				wires: [],
			};

			fs.writeFileSync(testFilePath, JSON.stringify(invalidCircuit), 'utf8');

			expect(() => {
				FileOperations.loadCircuit(testFilePath);
			}).toThrow('Invalid file format');
		});

		test('should throw error for circuit with missing required fields', () => {
			const invalidCircuit = {
				version: '1.0',
				metadata: {
					name: 'Test',
					created: new Date().toISOString(),
					modified: new Date().toISOString(),
				},
				components: [
					{
						// Missing required fields like id, type, x, y
						label: 'R1',
					},
				],
				wires: [],
				annotations: [],
			};

			fs.writeFileSync(testFilePath, JSON.stringify(invalidCircuit), 'utf8');

			expect(() => {
				FileOperations.loadCircuit(testFilePath);
			}).toThrow();
		});
	});

	describe('fileExists', () => {
		test('should return true for existing file', () => {
			const circuit = new Circuit();
			FileOperations.saveCircuit(circuit, testFilePath);

			expect(FileOperations.fileExists(testFilePath)).toBe(true);
		});

		test('should return false for non-existent file', () => {
			const nonExistentPath = path.join(testDirectory, 'nonexistent.json');

			expect(FileOperations.fileExists(nonExistentPath)).toBe(false);
		});

		test('should return false for directory', () => {
			expect(FileOperations.fileExists(testDirectory)).toBe(false);
		});

		test('should return false for invalid path', () => {
			expect(FileOperations.fileExists('')).toBe(false);
			expect(FileOperations.fileExists(null)).toBe(false);
		});
	});

	describe('getFileInfo', () => {
		test('should return file information for existing file', () => {
			const circuit = new Circuit();
			FileOperations.saveCircuit(circuit, testFilePath);

			const info = FileOperations.getFileInfo(testFilePath);

			expect(info).not.toBeNull();
			expect(info.size).toBeGreaterThan(0);
			expect(info.modified).toBeDefined();
			expect(info.created).toBeDefined();
		});

		test('should return null for non-existent file', () => {
			const nonExistentPath = path.join(testDirectory, 'nonexistent.json');

			const info = FileOperations.getFileInfo(nonExistentPath);

			expect(info).toBeNull();
		});
	});

	describe('save and load round-trip', () => {
		test('should preserve all circuit data through save and load', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Round-trip Test';

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			resistor.parameters.resistance = 4700;

			const source = new VoltageSource(0, 20);
			source.parameters.power = 2.0;
			source.parameters.impedance = 4.0;

			circuit.addComponent(resistor);
			circuit.addComponent(source);

			const wire = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 },
			);
			circuit.addWire(wire);

			FileOperations.saveCircuit(circuit, testFilePath);
			const loadedCircuit = FileOperations.loadCircuit(testFilePath);

			expect(loadedCircuit.metadata.name).toBe(circuit.metadata.name);
			expect(loadedCircuit.components).toHaveLength(circuit.components.length);
			expect(loadedCircuit.wires).toHaveLength(circuit.wires.length);

			const loadedResistor = loadedCircuit.components.find((c) => c.type === 'resistor');
			expect(loadedResistor.label).toBe('R1');
			expect(loadedResistor.parameters.resistance).toBe(4700);

			const loadedSource = loadedCircuit.components.find((c) => c.type === 'source');
			expect(loadedSource.parameters.power).toBe(2.0);
			expect(loadedSource.parameters.impedance).toBe(4.0);
		});
	});
});

