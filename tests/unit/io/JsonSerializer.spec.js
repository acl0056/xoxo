import { JsonSerializer } from '../../../src/io/JsonSerializer';
import { Circuit } from '../../../src/models/Circuit';
import { Resistor } from '../../../src/models/Resistor';
import { Capacitor } from '../../../src/models/Capacitor';
import { Inductor } from '../../../src/models/Inductor';
import { Speaker } from '../../../src/models/Speaker';
import { VoltageSource } from '../../../src/models/VoltageSource';
import { Ground } from '../../../src/models/Ground';
import { Wire } from '../../../src/models/Wire';
import { TextAnnotation } from '../../../src/models/TextAnnotation';

describe('JsonSerializer', () => {
	describe('serialize', () => {
		test('should serialize an empty circuit', () => {
			const circuit = new Circuit();
			const jsonString = JsonSerializer.serialize(circuit);
			
			expect(jsonString).toBeDefined();
			expect(typeof jsonString).toBe('string');
			
			const parsed = JSON.parse(jsonString);
			expect(parsed.version).toBe('1.0');
			expect(parsed.metadata).toBeDefined();
			expect(parsed.components).toEqual([]);
			expect(parsed.wires).toEqual([]);
			expect(parsed.annotations).toEqual([]);
		});

		test('should serialize a circuit with components', () => {
			const circuit = new Circuit();
			const resistor = new Resistor(0, 0);
			const capacitor = new Capacitor(10, 0);
			
			circuit.addComponent(resistor);
			circuit.addComponent(capacitor);
			
			const jsonString = JsonSerializer.serialize(circuit);
			const parsed = JSON.parse(jsonString);
			
			expect(parsed.components).toHaveLength(2);
			expect(parsed.components[0].type).toBe('resistor');
			expect(parsed.components[1].type).toBe('capacitor');
		});

		test('should serialize a circuit with wires', () => {
			const circuit = new Circuit();
			const resistor = new Resistor(0, 0);
			const capacitor = new Capacitor(10, 0);
			
			circuit.addComponent(resistor);
			circuit.addComponent(capacitor);
			
			const wire = new Wire(
				{ componentId: resistor.id, terminal: 0 },
				{ componentId: capacitor.id, terminal: 0 }
			);
			circuit.addWire(wire);
			
			const jsonString = JsonSerializer.serialize(circuit);
			const parsed = JSON.parse(jsonString);
			
			expect(parsed.wires).toHaveLength(1);
			expect(parsed.wires[0].startNode.componentId).toBe(resistor.id);
			expect(parsed.wires[0].endNode.componentId).toBe(capacitor.id);
		});

		test('should serialize a circuit with annotations', () => {
			const circuit = new Circuit();
			const annotation = new TextAnnotation(5, 5, 'Test annotation');
			
			circuit.addAnnotation(annotation);
			
			const jsonString = JsonSerializer.serialize(circuit);
			const parsed = JSON.parse(jsonString);
			
			expect(parsed.annotations).toHaveLength(1);
			expect(parsed.annotations[0].text).toBe('Test annotation');
		});

		test('should throw error if input is not a Circuit instance', () => {
			expect(() => {
				JsonSerializer.serialize({});
			}).toThrow('Input must be a Circuit instance');
		});

		test('should validate serialized output against schema', () => {
			const circuit = new Circuit();
			const resistor = new Resistor(0, 0);
			circuit.addComponent(resistor);
			
			const jsonString = JsonSerializer.serialize(circuit);
			const validation = JsonSerializer.validate(jsonString);
			
			expect(validation.valid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});
	});

	describe('deserialize', () => {
		test('should deserialize an empty circuit', () => {
			const originalCircuit = new Circuit();
			const jsonString = JsonSerializer.serialize(originalCircuit);
			
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit).toBeInstanceOf(Circuit);
			expect(deserializedCircuit.components).toHaveLength(0);
			expect(deserializedCircuit.wires).toHaveLength(0);
			expect(deserializedCircuit.annotations).toHaveLength(0);
		});

		test('should deserialize a circuit with resistor', () => {
			const originalCircuit = new Circuit();
			const resistor = new Resistor(0, 0);
			originalCircuit.addComponent(resistor);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.components).toHaveLength(1);
			expect(deserializedCircuit.components[0]).toBeInstanceOf(Resistor);
			expect(deserializedCircuit.components[0].type).toBe('resistor');
		});

		test('should deserialize a circuit with capacitor', () => {
			const originalCircuit = new Circuit();
			const capacitor = new Capacitor(10, 0);
			originalCircuit.addComponent(capacitor);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.components).toHaveLength(1);
			expect(deserializedCircuit.components[0]).toBeInstanceOf(Capacitor);
			expect(deserializedCircuit.components[0].type).toBe('capacitor');
		});

		test('should deserialize a circuit with inductor', () => {
			const originalCircuit = new Circuit();
			const inductor = new Inductor(20, 0);
			originalCircuit.addComponent(inductor);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.components).toHaveLength(1);
			expect(deserializedCircuit.components[0]).toBeInstanceOf(Inductor);
			expect(deserializedCircuit.components[0].type).toBe('inductor');
		});

		test('should deserialize a circuit with speaker', () => {
			const originalCircuit = new Circuit();
			const speaker = new Speaker(30, 0);
			originalCircuit.addComponent(speaker);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.components).toHaveLength(1);
			expect(deserializedCircuit.components[0]).toBeInstanceOf(Speaker);
			expect(deserializedCircuit.components[0].type).toBe('speaker');
		});

		test('should deserialize a circuit with voltage source', () => {
			const originalCircuit = new Circuit();
			const source = new VoltageSource(40, 0);
			originalCircuit.addComponent(source);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.components).toHaveLength(1);
			expect(deserializedCircuit.components[0]).toBeInstanceOf(VoltageSource);
			expect(deserializedCircuit.components[0].type).toBe('source');
		});

		test('should deserialize a circuit with ground', () => {
			const originalCircuit = new Circuit();
			const ground = new Ground(50, 0);
			originalCircuit.addComponent(ground);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.components).toHaveLength(1);
			expect(deserializedCircuit.components[0]).toBeInstanceOf(Ground);
			expect(deserializedCircuit.components[0].type).toBe('ground');
		});

		test('should deserialize a circuit with wires', () => {
			const originalCircuit = new Circuit();
			const resistor = new Resistor(0, 0);
			const capacitor = new Capacitor(10, 0);
			
			originalCircuit.addComponent(resistor);
			originalCircuit.addComponent(capacitor);
			
			const wire = new Wire(
				{ componentId: resistor.id, terminal: 0 },
				{ componentId: capacitor.id, terminal: 0 }
			);
			originalCircuit.addWire(wire);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.wires).toHaveLength(1);
			expect(deserializedCircuit.wires[0]).toBeInstanceOf(Wire);
		});

		test('should deserialize a circuit with annotations', () => {
			const originalCircuit = new Circuit();
			const annotation = new TextAnnotation(5, 5, 'Test annotation');
			
			originalCircuit.addAnnotation(annotation);
			
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			expect(deserializedCircuit.annotations).toHaveLength(1);
			expect(deserializedCircuit.annotations[0]).toBeInstanceOf(TextAnnotation);
			expect(deserializedCircuit.annotations[0].text).toBe('Test annotation');
		});

		test('should throw error for invalid JSON string', () => {
			expect(() => {
				JsonSerializer.deserialize('invalid json');
			}).toThrow('Invalid JSON');
		});

		test('should throw error if input is not a string', () => {
			expect(() => {
				JsonSerializer.deserialize({});
			}).toThrow('Input must be a string');
		});

		test('should throw error for JSON that fails schema validation', () => {
			const invalidJson = JSON.stringify({
				version: '1.0',
				metadata: { name: 'test' }, // Missing required fields
				components: [],
				wires: [],
			});
			
			expect(() => {
				JsonSerializer.deserialize(invalidJson);
			}).toThrow('Circuit validation failed');
		});
	});

	describe('validate', () => {
		test('should validate a valid circuit JSON string', () => {
			const circuit = new Circuit();
			const jsonString = JsonSerializer.serialize(circuit);
			
			const result = JsonSerializer.validate(jsonString);
			
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		test('should validate a valid circuit JSON object', () => {
			const circuit = new Circuit();
			const jsonObject = circuit.toJSON();
			
			const result = JsonSerializer.validate(jsonObject);
			
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		test('should return validation errors for invalid JSON string', () => {
			const result = JsonSerializer.validate('invalid json');
			
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain('Invalid JSON');
		});

		test('should return validation errors for missing required fields', () => {
			const invalidObject = {
				version: '1.0',
				// Missing metadata, components, wires
			};
			
			const result = JsonSerializer.validate(invalidObject);
			
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		test('should return validation errors for invalid component type', () => {
			const invalidObject = {
				version: '1.0',
				metadata: {
					name: 'test',
					created: new Date().toISOString(),
					modified: new Date().toISOString(),
				},
				components: [
					{
						id: 'test-id',
						type: 'invalid-type', // Invalid type
						x: 0,
						y: 0,
						rotation: 0,
						parameters: {},
					},
				],
				wires: [],
				annotations: [],
			};
			
			const result = JsonSerializer.validate(invalidObject);
			
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		test('should return error for non-string, non-object input', () => {
			const result = JsonSerializer.validate(123);
			
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Input must be a string or object');
		});

		test('should return error for null input', () => {
			const result = JsonSerializer.validate(null);
			
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Input must be a string or object');
		});
	});

	describe('getSchema', () => {
		test('should return the circuit schema', () => {
			const schema = JsonSerializer.getSchema();
			
			expect(schema).toBeDefined();
			expect(schema.$id).toBe('circuit.schema.json');
			expect(schema.type).toBe('object');
		});
	});

	describe('round-trip serialization', () => {
		test('should preserve all data through serialize/deserialize cycle', () => {
			const originalCircuit = new Circuit();
			originalCircuit.metadata.name = 'Test Circuit';
			
			const resistor = new Resistor(0, 0);
			resistor.label = 'R1';
			resistor.parameters.resistance = 8.0;
			
			const capacitor = new Capacitor(10, 0);
			capacitor.label = 'C1';
			capacitor.parameters.capacitance = 10e-6;
			
			const ground = new Ground(20, 0);
			
			originalCircuit.addComponent(resistor);
			originalCircuit.addComponent(capacitor);
			originalCircuit.addComponent(ground);
			
			const wire = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: capacitor.id, terminal: 0 }
			);
			originalCircuit.addWire(wire);
			
			const annotation = new TextAnnotation(5, 5, 'Test note');
			originalCircuit.addAnnotation(annotation);
			
			// Serialize and deserialize
			const jsonString = JsonSerializer.serialize(originalCircuit);
			const deserializedCircuit = JsonSerializer.deserialize(jsonString);
			
			// Verify metadata
			expect(deserializedCircuit.metadata.name).toBe('Test Circuit');
			expect(deserializedCircuit.metadata.version).toBe('1.0');
			
			// Verify components
			expect(deserializedCircuit.components).toHaveLength(3);
			expect(deserializedCircuit.components[0].label).toBe('R1');
			expect(deserializedCircuit.components[0].parameters.resistance).toBe(8.0);
			expect(deserializedCircuit.components[1].label).toBe('C1');
			expect(deserializedCircuit.components[1].parameters.capacitance).toBe(10e-6);
			
			// Verify wires
			expect(deserializedCircuit.wires).toHaveLength(1);
			expect(deserializedCircuit.wires[0].startNode.terminal).toBe(1);
			expect(deserializedCircuit.wires[0].endNode.terminal).toBe(0);
			
			// Verify annotations
			expect(deserializedCircuit.annotations).toHaveLength(1);
			expect(deserializedCircuit.annotations[0].text).toBe('Test note');
		});
	});
});
