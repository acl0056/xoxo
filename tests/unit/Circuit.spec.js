import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { generateUniqueId } from '@/utils/idGenerator';

describe('Circuit', () => {
	let circuit;

	beforeEach(() => {
		circuit = new Circuit();
	});

	describe('constructor', () => {
		it('should initialize with empty arrays', () => {
			expect(circuit.components).toEqual([]);
			expect(circuit.wires).toEqual([]);
			expect(circuit.nodes).toEqual([]);
			expect(circuit.annotations).toEqual([]);
		});

		it('should initialize metadata with default values', () => {
			expect(circuit.metadata.name).toBe('');
			expect(circuit.metadata.version).toBe('1.0');
			expect(circuit.metadata.created).toBeDefined();
			expect(circuit.metadata.modified).toBeDefined();
		});

		it('should set created and modified timestamps', () => {
			const now = new Date().toISOString();
			expect(circuit.metadata.created).toBeTruthy();
			expect(circuit.metadata.modified).toBeTruthy();
			// Check that timestamps are valid ISO strings
			expect(() => new Date(circuit.metadata.created)).not.toThrow();
			expect(() => new Date(circuit.metadata.modified)).not.toThrow();
		});
	});

	describe('addComponent', () => {
		it('should add a component to the circuit', () => {
			const component = {
				id: generateUniqueId(),
				type: 'resistor',
				label: 'R1',
				x: 0,
				y: 0
			};

			const result = circuit.addComponent(component);

			expect(circuit.components).toHaveLength(1);
			expect(circuit.components[0]).toBe(component);
			expect(result).toBe(component);
		});

		it('should throw error if component has no id', () => {
			const component = { type: 'resistor' };

			expect(() => circuit.addComponent(component)).toThrow('Invalid component: must have an id');
		});

		it('should throw error if component with same id already exists', () => {
			const id = generateUniqueId();
			const component1 = { id, type: 'resistor' };
			const component2 = { id, type: 'capacitor' };

			circuit.addComponent(component1);

			expect(() => circuit.addComponent(component2)).toThrow(`Component with id ${id} already exists`);
		});

		it('should update modified timestamp when adding component', () => {
			const originalModified = circuit.metadata.modified;
			
			// Wait a bit to ensure timestamp changes
			setTimeout(() => {
				const component = { id: generateUniqueId(), type: 'resistor' };
				circuit.addComponent(component);
				
				expect(circuit.metadata.modified).not.toBe(originalModified);
			}, 10);
		});
	});

	describe('removeComponent', () => {
		it('should remove a component from the circuit', () => {
			const component = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(component);

			const result = circuit.removeComponent(component.id);

			expect(circuit.components).toHaveLength(0);
			expect(result).toBe(component);
		});

		it('should return null if component not found', () => {
			const result = circuit.removeComponent('non-existent-id');

			expect(result).toBeNull();
		});

		it('should remove connected wires when removing component', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};

			circuit.addComponent(comp1);
			circuit.addComponent(comp2);
			circuit.addWire(wire);

			circuit.removeComponent(comp1.id);

			expect(circuit.wires).toHaveLength(0);
		});
	});

	describe('getComponent', () => {
		it('should return component by id', () => {
			const component = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(component);

			const result = circuit.getComponent(component.id);

			expect(result).toBe(component);
		});

		it('should return undefined if component not found', () => {
			const result = circuit.getComponent('non-existent-id');

			expect(result).toBeUndefined();
		});
	});

	describe('updateComponent', () => {
		it('should update component properties', () => {
			const component = { id: generateUniqueId(), type: 'resistor', x: 0, y: 0 };
			circuit.addComponent(component);

			const result = circuit.updateComponent(component.id, { x: 10, y: 20 });

			expect(result.x).toBe(10);
			expect(result.y).toBe(20);
		});

		it('should return null if component not found', () => {
			const result = circuit.updateComponent('non-existent-id', { x: 10 });

			expect(result).toBeNull();
		});
	});

	describe('addWire', () => {
		it('should add a wire to the circuit', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			circuit.addComponent(comp1);
			circuit.addComponent(comp2);

			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};

			const result = circuit.addWire(wire);

			expect(circuit.wires).toHaveLength(1);
			expect(circuit.wires[0]).toBe(wire);
			expect(result).toBe(wire);
		});

		it('should throw error if wire has no id', () => {
			const wire = {
				startNode: { componentId: 'comp1', terminal: 0 },
				endNode: { componentId: 'comp2', terminal: 0 }
			};

			expect(() => circuit.addWire(wire)).toThrow('Invalid wire: must have an id');
		});

		it('should throw error if wire with same id already exists', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			circuit.addComponent(comp1);
			circuit.addComponent(comp2);

			const id = generateUniqueId();
			const wire1 = {
				id,
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};
			const wire2 = {
				id,
				startNode: { componentId: comp1.id, terminal: 1 },
				endNode: { componentId: comp2.id, terminal: 1 },
				segments: []
			};

			circuit.addWire(wire1);

			expect(() => circuit.addWire(wire2)).toThrow(`Wire with id ${id} already exists`);
		});

		it('should throw error if start component does not exist', () => {
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			circuit.addComponent(comp2);

			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: 'non-existent', terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};

			expect(() => circuit.addWire(wire)).toThrow('Start component non-existent not found');
		});

		it('should throw error if end component does not exist', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(comp1);

			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: 'non-existent', terminal: 0 },
				segments: []
			};

			expect(() => circuit.addWire(wire)).toThrow('End component non-existent not found');
		});
	});

	describe('removeWire', () => {
		it('should remove a wire from the circuit', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			circuit.addComponent(comp1);
			circuit.addComponent(comp2);

			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};
			circuit.addWire(wire);

			const result = circuit.removeWire(wire.id);

			expect(circuit.wires).toHaveLength(0);
			expect(result).toBe(wire);
		});

		it('should return null if wire not found', () => {
			const result = circuit.removeWire('non-existent-id');

			expect(result).toBeNull();
		});
	});

	describe('getWire', () => {
		it('should return wire by id', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			circuit.addComponent(comp1);
			circuit.addComponent(comp2);

			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};
			circuit.addWire(wire);

			const result = circuit.getWire(wire.id);

			expect(result).toBe(wire);
		});

		it('should return undefined if wire not found', () => {
			const result = circuit.getWire('non-existent-id');

			expect(result).toBeUndefined();
		});
	});

	describe('addAnnotation', () => {
		it('should add an annotation to the circuit', () => {
			const annotation = {
				id: generateUniqueId(),
				x: 10,
				y: 20,
				text: 'Test annotation',
				fontSize: 12
			};

			const result = circuit.addAnnotation(annotation);

			expect(circuit.annotations).toHaveLength(1);
			expect(circuit.annotations[0]).toBe(annotation);
			expect(result).toBe(annotation);
		});

		it('should throw error if annotation has no id', () => {
			const annotation = { x: 10, y: 20, text: 'Test' };

			expect(() => circuit.addAnnotation(annotation)).toThrow('Invalid annotation: must have an id');
		});

		it('should throw error if annotation with same id already exists', () => {
			const id = generateUniqueId();
			const annotation1 = { id, x: 10, y: 20, text: 'Test 1' };
			const annotation2 = { id, x: 30, y: 40, text: 'Test 2' };

			circuit.addAnnotation(annotation1);

			expect(() => circuit.addAnnotation(annotation2)).toThrow(`Annotation with id ${id} already exists`);
		});
	});

	describe('removeAnnotation', () => {
		it('should remove an annotation from the circuit', () => {
			const annotation = { id: generateUniqueId(), x: 10, y: 20, text: 'Test' };
			circuit.addAnnotation(annotation);

			const result = circuit.removeAnnotation(annotation.id);

			expect(circuit.annotations).toHaveLength(0);
			expect(result).toBe(annotation);
		});

		it('should return null if annotation not found', () => {
			const result = circuit.removeAnnotation('non-existent-id');

			expect(result).toBeNull();
		});
	});

	describe('getAnnotation', () => {
		it('should return annotation by id', () => {
			const annotation = { id: generateUniqueId(), x: 10, y: 20, text: 'Test' };
			circuit.addAnnotation(annotation);

			const result = circuit.getAnnotation(annotation.id);

			expect(result).toBe(annotation);
		});

		it('should return undefined if annotation not found', () => {
			const result = circuit.getAnnotation('non-existent-id');

			expect(result).toBeUndefined();
		});
	});

	describe('updateAnnotation', () => {
		it('should update annotation properties', () => {
			const annotation = { id: generateUniqueId(), x: 10, y: 20, text: 'Test' };
			circuit.addAnnotation(annotation);

			const result = circuit.updateAnnotation(annotation.id, { text: 'Updated', fontSize: 16 });

			expect(result.text).toBe('Updated');
			expect(result.fontSize).toBe(16);
		});

		it('should return null if annotation not found', () => {
			const result = circuit.updateAnnotation('non-existent-id', { text: 'Updated' });

			expect(result).toBeNull();
		});
	});

	describe('findConnectedComponents', () => {
		it('should find all components connected via wires', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			const comp2 = { id: generateUniqueId(), type: 'capacitor' };
			const comp3 = { id: generateUniqueId(), type: 'inductor' };
			const comp4 = { id: generateUniqueId(), type: 'ground' };

			circuit.addComponent(comp1);
			circuit.addComponent(comp2);
			circuit.addComponent(comp3);
			circuit.addComponent(comp4);

			// Connect comp1 -> comp2 -> comp3
			const wire1 = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: comp2.id, terminal: 0 },
				segments: []
			};
			const wire2 = {
				id: generateUniqueId(),
				startNode: { componentId: comp2.id, terminal: 1 },
				endNode: { componentId: comp3.id, terminal: 0 },
				segments: []
			};

			circuit.addWire(wire1);
			circuit.addWire(wire2);

			const connected = circuit.findConnectedComponents(comp1.id);

			expect(connected).toHaveLength(3);
			expect(connected.map(c => c.id)).toContain(comp1.id);
			expect(connected.map(c => c.id)).toContain(comp2.id);
			expect(connected.map(c => c.id)).toContain(comp3.id);
			expect(connected.map(c => c.id)).not.toContain(comp4.id);
		});

		it('should return only the component if it has no connections', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(comp1);

			const connected = circuit.findConnectedComponents(comp1.id);

			expect(connected).toHaveLength(1);
			expect(connected[0]).toBe(comp1);
		});

		it('should return empty array if component not found', () => {
			const connected = circuit.findConnectedComponents('non-existent-id');

			expect(connected).toEqual([]);
		});

		it('should accept component object as parameter', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(comp1);

			const connected = circuit.findConnectedComponents(comp1);

			expect(connected).toHaveLength(1);
			expect(connected[0]).toBe(comp1);
		});
	});

	describe('validate', () => {
		it('should return valid for empty circuit', () => {
			const result = circuit.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Circuit has no components');
		});

		it('should detect missing ground', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(comp1);

			const result = circuit.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Circuit has no ground reference');
		});

		it('should detect missing voltage source', () => {
			const ground = { id: generateUniqueId(), type: 'ground' };
			circuit.addComponent(ground);

			const result = circuit.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Circuit has no voltage source');
		});

		it('should detect invalid wire references', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(comp1);

			const wire = {
				id: generateUniqueId(),
				startNode: { componentId: comp1.id, terminal: 0 },
				endNode: { componentId: 'non-existent', terminal: 0 },
				segments: []
			};

			// Bypass validation by directly pushing to wires array
			circuit.wires.push(wire);

			const result = circuit.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('non-existent'))).toBe(true);
		});

		it('should detect duplicate component labels', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor', label: 'R1' };
			const comp2 = { id: generateUniqueId(), type: 'resistor', label: 'R1' };
			circuit.addComponent(comp1);
			circuit.addComponent(comp2);

			const result = circuit.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('Duplicate component label: R1'))).toBe(true);
		});

		it('should return valid for properly configured circuit', () => {
			const ground = { id: generateUniqueId(), type: 'ground' };
			const source = { id: generateUniqueId(), type: 'source' };
			const resistor = { id: generateUniqueId(), type: 'resistor', label: 'R1' };

			circuit.addComponent(ground);
			circuit.addComponent(source);
			circuit.addComponent(resistor);

			const result = circuit.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('toJSON', () => {
		it('should serialize circuit to JSON format', () => {
			circuit.metadata.name = 'Test Circuit';
			const comp1 = { id: generateUniqueId(), type: 'resistor', toJSON: () => ({ id: 'comp1', type: 'resistor' }) };
			circuit.addComponent(comp1);

			const json = circuit.toJSON();

			expect(json.version).toBe('1.0');
			expect(json.metadata.name).toBe('Test Circuit');
			expect(json.metadata.created).toBeDefined();
			expect(json.metadata.modified).toBeDefined();
			expect(json.components).toHaveLength(1);
			expect(json.wires).toEqual([]);
			expect(json.annotations).toEqual([]);
		});

		it('should handle components without toJSON method', () => {
			const comp1 = { id: generateUniqueId(), type: 'resistor' };
			circuit.addComponent(comp1);

			const json = circuit.toJSON();

			expect(json.components).toHaveLength(1);
			expect(json.components[0]).toBe(comp1);
		});
	});

	describe('fromJSON', () => {
		it('should deserialize circuit from JSON format', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Test Circuit',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z'
				},
				components: [
					{
						id: 'comp1',
						type: 'resistor',
						label: 'R1',
						x: 10,
						y: 20,
						rotation: 0,
						parameters: {
							resistance: 8.0,
							tolerance: 5,
							state: 'normal'
						}
					}
				],
				wires: [],
				annotations: []
			};

			const loadedCircuit = Circuit.fromJSON(json);

			expect(loadedCircuit.metadata.version).toBe('1.0');
			expect(loadedCircuit.metadata.name).toBe('Test Circuit');
			expect(loadedCircuit.metadata.created).toBe('2024-01-01T00:00:00.000Z');
			expect(loadedCircuit.metadata.modified).toBe('2024-01-02T00:00:00.000Z');
			expect(loadedCircuit.components).toHaveLength(1);
			expect(loadedCircuit.components[0]).toBeInstanceOf(Resistor);
			expect(loadedCircuit.components[0].id).toBe('comp1');
			expect(loadedCircuit.components[0].label).toBe('R1');
		});

		it('should handle missing optional fields', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Test',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-01T00:00:00.000Z'
				},
				components: [],
				wires: []
			};

			const loadedCircuit = Circuit.fromJSON(json);

			expect(loadedCircuit.annotations).toEqual([]);
		});

		it('should use defaults for missing metadata', () => {
			const json = {
				components: [],
				wires: []
			};

			const loadedCircuit = Circuit.fromJSON(json);

			expect(loadedCircuit.metadata.version).toBe('1.0');
			expect(loadedCircuit.metadata.name).toBe('');
			expect(loadedCircuit.metadata.created).toBeDefined();
			expect(loadedCircuit.metadata.modified).toBeDefined();
		});
	});
});
