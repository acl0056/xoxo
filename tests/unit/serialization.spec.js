import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';
import { Node } from '@/models/Node';
import { TextAnnotation } from '@/models/TextAnnotation';

describe('Model Serialization (toJSON)', () => {
	describe('Component.toJSON()', () => {
		it('should serialize a resistor to JSON', () => {
			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			resistor.rotation = 90;

			const json = resistor.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.type).toBe('resistor');
			expect(json.label).toBe('R1');
			expect(json.x).toBe(10);
			expect(json.y).toBe(20);
			expect(json.rotation).toBe(90);
			expect(json.parameters).toEqual({
				resistance: 8.0,
				tolerance: 5,
				state: 'normal',
			});
		});

		it('should serialize a capacitor to JSON', () => {
			const capacitor = new Capacitor(15, 25);
			capacitor.label = 'C1';
			capacitor.parameters.capacitance = 47e-6;
			capacitor.parameters.esr = 0.1;

			const json = capacitor.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.type).toBe('capacitor');
			expect(json.label).toBe('C1');
			expect(json.x).toBe(15);
			expect(json.y).toBe(25);
			expect(json.parameters).toEqual({
				capacitance: 47e-6,
				tolerance: 10,
				esr: 0.1,
				state: 'normal',
			});
		});

		it('should serialize an inductor to JSON', () => {
			const inductor = new Inductor(30, 40);
			inductor.label = 'L1';
			inductor.parameters.inductance = 2.2e-3;
			inductor.parameters.esr = 0.5;

			const json = inductor.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.type).toBe('inductor');
			expect(json.label).toBe('L1');
			expect(json.x).toBe(30);
			expect(json.y).toBe(40);
			expect(json.parameters).toEqual({
				inductance: 2.2e-3,
				tolerance: 10,
				esr: 0.5,
				state: 'normal',
			});
		});

		it('should serialize a speaker to JSON', () => {
			const speaker = new Speaker(50, 60);
			speaker.label = 'S1';
			speaker.parameters.name = 'Tweeter';
			speaker.parameters.sensitivity = 3.0;
			speaker.parameters.delay = 0.5;
			speaker.parameters.inverted = true;
			speaker.parameters.frdFile = '/path/to/tweeter.frd';
			speaker.parameters.zmaFile = '/path/to/tweeter.zma';
			speaker.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/tweeter-15.frd', phaseSource: 'measured' },
				{ angle: 30, frdPath: '/path/to/tweeter-30.frd', phaseSource: 'measured' },
			];

			const json = speaker.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.type).toBe('speaker');
			expect(json.label).toBe('S1');
			expect(json.x).toBe(50);
			expect(json.y).toBe(60);
			expect(json.parameters).toEqual({
				name: 'Tweeter',
				sensitivity: 3.0,
				delay: 0.5,
				delayUnit: 'in',
				inverted: true,
				muted: false,
				frdFile: '/path/to/tweeter.frd',
				zmaFile: '/path/to/tweeter.zma',
				frdPhaseSource: 'measured',
				zmaPhaseSource: 'measured',
				offAxisFiles: [
					{ angle: 15, frdPath: '/path/to/tweeter-15.frd', phaseSource: 'measured' },
					{ angle: 30, frdPath: '/path/to/tweeter-30.frd', phaseSource: 'measured' },
				],
			});
		});

		it('should serialize a voltage source to JSON', () => {
			const source = new VoltageSource(70, 80);
			source.label = 'V1';
			source.parameters.power = 2.5;
			source.parameters.impedance = 4.0;
			source.parameters.delay = 0.1;
			source.parameters.inverted = true;

			const json = source.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.type).toBe('source');
			expect(json.label).toBe('V1');
			expect(json.x).toBe(70);
			expect(json.y).toBe(80);
			expect(json.parameters).toEqual({
				power: 2.5,
				impedance: 4.0,
				delay: 0.1,
				inverted: true,
			});
		});

		it('should serialize a ground to JSON', () => {
			const ground = new Ground(90, 100);

			const json = ground.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.type).toBe('ground');
			expect(json.label).toBe('');
			expect(json.x).toBe(90);
			expect(json.y).toBe(100);
			expect(json.parameters).toEqual({});
		});
	});

	describe('Wire.toJSON()', () => {
		it('should serialize a wire to JSON', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			wire.addSegment(10, 20);
			wire.addSegment(30, 40);

			const json = wire.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.startNode).toEqual({
				componentId: 'comp1',
				terminal: 0,
			});
			expect(json.endNode).toEqual({
				componentId: 'comp2',
				terminal: 1,
			});
			expect(json.segments).toEqual([
				{ x: 10, y: 20 },
				{ x: 30, y: 40 },
			]);
		});

		it('should serialize a wire with no segments to JSON', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);

			const json = wire.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.segments).toEqual([]);
		});
	});

	describe('Node.toJSON()', () => {
		it('should serialize a node to JSON', () => {
			const node = new Node(100, 200);
			node.addWire('wire1');
			node.addWire('wire2');

			const json = node.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.x).toBe(100);
			expect(json.y).toBe(200);
			expect(json.connectedWires).toEqual(['wire1', 'wire2']);
		});

		it('should serialize a node with no wires to JSON', () => {
			const node = new Node(150, 250);

			const json = node.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.x).toBe(150);
			expect(json.y).toBe(250);
			expect(json.connectedWires).toEqual([]);
		});
	});

	describe('TextAnnotation.toJSON()', () => {
		it('should serialize a text annotation to JSON', () => {
			const annotation = new TextAnnotation(300, 400, 'Test annotation');
			annotation.fontSize = 16;

			const json = annotation.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.x).toBe(300);
			expect(json.y).toBe(400);
			expect(json.text).toBe('Test annotation');
			expect(json.fontSize).toBe(16);
		});

		it('should serialize a text annotation with default font size to JSON', () => {
			const annotation = new TextAnnotation(350, 450, 'Another annotation');

			const json = annotation.toJSON();

			expect(json).toHaveProperty('id');
			expect(json.fontSize).toBe(12);
		});
	});

	describe('Circuit.toJSON()', () => {
		it('should serialize an empty circuit to JSON', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Test Circuit';

			const json = circuit.toJSON();

			expect(json.version).toBe('1.0');
			expect(json.metadata).toHaveProperty('name', 'Test Circuit');
			expect(json.metadata).toHaveProperty('created');
			expect(json.metadata).toHaveProperty('modified');
			expect(json.components).toEqual([]);
			expect(json.wires).toEqual([]);
			expect(json.annotations).toEqual([]);
		});

		it('should serialize a circuit with components to JSON', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Simple Circuit';

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			circuit.addComponent(resistor);

			const capacitor = new Capacitor(30, 40);
			capacitor.label = 'C1';
			circuit.addComponent(capacitor);

			const json = circuit.toJSON();

			expect(json.version).toBe('1.0');
			expect(json.metadata.name).toBe('Simple Circuit');
			expect(json.components).toHaveLength(2);
			expect(json.components[0].type).toBe('resistor');
			expect(json.components[0].label).toBe('R1');
			expect(json.components[1].type).toBe('capacitor');
			expect(json.components[1].label).toBe('C1');
		});

		it('should serialize a circuit with wires to JSON', () => {
			const circuit = new Circuit();

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			circuit.addComponent(resistor);

			const capacitor = new Capacitor(30, 40);
			capacitor.label = 'C1';
			circuit.addComponent(capacitor);

			const wire = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: capacitor.id, terminal: 0 },
			);
			circuit.addWire(wire);

			const json = circuit.toJSON();

			expect(json.wires).toHaveLength(1);
			expect(json.wires[0].startNode.componentId).toBe(resistor.id);
			expect(json.wires[0].endNode.componentId).toBe(capacitor.id);
		});

		it('should serialize a circuit with annotations to JSON', () => {
			const circuit = new Circuit();

			const annotation = new TextAnnotation(100, 200, 'Test note');
			circuit.addAnnotation(annotation);

			const json = circuit.toJSON();

			expect(json.annotations).toHaveLength(1);
			expect(json.annotations[0].text).toBe('Test note');
			expect(json.annotations[0].x).toBe(100);
			expect(json.annotations[0].y).toBe(200);
		});

		it('should serialize a complete circuit to JSON', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Complete Circuit';

			// Add components
			const source = new VoltageSource(0, 0);
			source.label = 'V1';
			circuit.addComponent(source);

			const resistor = new Resistor(10, 0);
			resistor.label = 'R1';
			circuit.addComponent(resistor);

			const ground = new Ground(20, 0);
			circuit.addComponent(ground);

			// Add wires
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: resistor.id, terminal: 0 },
			);
			circuit.addWire(wire1);

			const wire2 = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire2);

			// Add annotation
			const annotation = new TextAnnotation(10, 10, 'Simple voltage divider');
			circuit.addAnnotation(annotation);

			const json = circuit.toJSON();

			expect(json.version).toBe('1.0');
			expect(json.metadata.name).toBe('Complete Circuit');
			expect(json.components).toHaveLength(3);
			expect(json.wires).toHaveLength(2);
			expect(json.annotations).toHaveLength(1);
		});
	});

	describe('JSON structure validation', () => {
		it('should produce JSON with all required fields for components', () => {
			const resistor = new Resistor(10, 20);
			const json = resistor.toJSON();

			// Required fields per schema
			expect(json).toHaveProperty('id');
			expect(json).toHaveProperty('type');
			expect(json).toHaveProperty('label');
			expect(json).toHaveProperty('x');
			expect(json).toHaveProperty('y');
			expect(json).toHaveProperty('rotation');
			expect(json).toHaveProperty('parameters');
		});

		it('should produce JSON with all required fields for wires', () => {
			const wire = new Wire(
				{ componentId: 'comp1', terminal: 0 },
				{ componentId: 'comp2', terminal: 1 },
			);
			const json = wire.toJSON();

			// Required fields per schema
			expect(json).toHaveProperty('id');
			expect(json).toHaveProperty('startNode');
			expect(json).toHaveProperty('endNode');
			expect(json).toHaveProperty('segments');
			expect(json.startNode).toHaveProperty('componentId');
			expect(json.startNode).toHaveProperty('terminal');
			expect(json.endNode).toHaveProperty('componentId');
			expect(json.endNode).toHaveProperty('terminal');
		});

		it('should produce JSON with all required fields for annotations', () => {
			const annotation = new TextAnnotation(100, 200, 'Test');
			const json = annotation.toJSON();

			// Required fields per schema
			expect(json).toHaveProperty('id');
			expect(json).toHaveProperty('x');
			expect(json).toHaveProperty('y');
			expect(json).toHaveProperty('text');
			expect(json).toHaveProperty('fontSize');
		});

		it('should produce JSON with all required fields for circuit', () => {
			const circuit = new Circuit();
			const json = circuit.toJSON();

			// Required fields per schema
			expect(json).toHaveProperty('version');
			expect(json).toHaveProperty('metadata');
			expect(json).toHaveProperty('components');
			expect(json).toHaveProperty('wires');
			expect(json).toHaveProperty('annotations');
			expect(json.metadata).toHaveProperty('name');
			expect(json.metadata).toHaveProperty('created');
			expect(json.metadata).toHaveProperty('modified');
		});
	});
});

describe('Model Deserialization (fromJSON)', () => {
	describe('Component.fromJSON()', () => {
		it('should deserialize a resistor from JSON', () => {
			const json = {
				id: 'test-resistor-id',
				type: 'resistor',
				label: 'R1',
				x: 10,
				y: 20,
				rotation: 90,
				parameters: {
					resistance: 4.7,
					tolerance: 10,
					state: 'normal',
				},
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.id).toBe('test-resistor-id');
			expect(resistor.type).toBe('resistor');
			expect(resistor.label).toBe('R1');
			expect(resistor.x).toBe(10);
			expect(resistor.y).toBe(20);
			expect(resistor.rotation).toBe(90);
			expect(resistor.parameters.resistance).toBe(4.7);
			expect(resistor.parameters.tolerance).toBe(10);
			expect(resistor.parameters.state).toBe('normal');
		});

		it('should deserialize a capacitor from JSON', () => {
			const json = {
				id: 'test-capacitor-id',
				type: 'capacitor',
				label: 'C1',
				x: 15,
				y: 25,
				rotation: 180,
				parameters: {
					capacitance: 47e-6,
					tolerance: 20,
					esr: 0.1,
					state: 'normal',
				},
			};

			const capacitor = Capacitor.fromJSON(json);

			expect(capacitor.id).toBe('test-capacitor-id');
			expect(capacitor.type).toBe('capacitor');
			expect(capacitor.label).toBe('C1');
			expect(capacitor.x).toBe(15);
			expect(capacitor.y).toBe(25);
			expect(capacitor.rotation).toBe(180);
			expect(capacitor.parameters.capacitance).toBe(47e-6);
			expect(capacitor.parameters.tolerance).toBe(20);
			expect(capacitor.parameters.esr).toBe(0.1);
			expect(capacitor.parameters.state).toBe('normal');
		});

		it('should deserialize an inductor from JSON', () => {
			const json = {
				id: 'test-inductor-id',
				type: 'inductor',
				label: 'L1',
				x: 30,
				y: 40,
				rotation: 270,
				parameters: {
					inductance: 2.2e-3,
					tolerance: 10,
					esr: 0.5,
					state: 'normal',
				},
			};

			const inductor = Inductor.fromJSON(json);

			expect(inductor.id).toBe('test-inductor-id');
			expect(inductor.type).toBe('inductor');
			expect(inductor.label).toBe('L1');
			expect(inductor.x).toBe(30);
			expect(inductor.y).toBe(40);
			expect(inductor.rotation).toBe(270);
			expect(inductor.parameters.inductance).toBe(2.2e-3);
			expect(inductor.parameters.tolerance).toBe(10);
			expect(inductor.parameters.esr).toBe(0.5);
			expect(inductor.parameters.state).toBe('normal');
		});

		it('should deserialize a speaker from JSON', () => {
			const json = {
				id: 'test-speaker-id',
				type: 'speaker',
				label: 'S1',
				x: 50,
				y: 60,
				rotation: 0,
				parameters: {
					name: 'Tweeter',
					sensitivity: 3.0,
					delay: 0.5,
					inverted: true,
					muted: false,
					frdFile: '/path/to/tweeter.frd',
					zmaFile: '/path/to/tweeter.zma',
					frdPhaseSource: 'measured',
					zmaPhaseSource: 'measured',
					offAxisFiles: [
						{ angle: 15, frdPath: '/path/to/tweeter-15.frd', phaseSource: 'measured' },
						{ angle: 30, frdPath: '/path/to/tweeter-30.frd', phaseSource: 'measured' },
					],
				},
			};

			const speaker = Speaker.fromJSON(json);

			expect(speaker.id).toBe('test-speaker-id');
			expect(speaker.type).toBe('speaker');
			expect(speaker.label).toBe('S1');
			expect(speaker.x).toBe(50);
			expect(speaker.y).toBe(60);
			expect(speaker.rotation).toBe(0);
			expect(speaker.parameters.name).toBe('Tweeter');
			expect(speaker.parameters.sensitivity).toBe(3.0);
			expect(speaker.parameters.delay).toBe(0.5);
			expect(speaker.parameters.inverted).toBe(true);
			expect(speaker.parameters.muted).toBe(false);
			expect(speaker.parameters.frdFile).toBe('/path/to/tweeter.frd');
			expect(speaker.parameters.zmaFile).toBe('/path/to/tweeter.zma');
			expect(speaker.parameters.frdPhaseSource).toBe('measured');
			expect(speaker.parameters.zmaPhaseSource).toBe('measured');
			expect(speaker.parameters.offAxisFiles).toHaveLength(2);
			expect(speaker.parameters.offAxisFiles[0]).toEqual({
				angle: 15,
				frdPath: '/path/to/tweeter-15.frd',
				phaseSource: 'measured',
			});
		});

		it('should deserialize a voltage source from JSON', () => {
			const json = {
				id: 'test-source-id',
				type: 'source',
				label: 'V1',
				x: 70,
				y: 80,
				rotation: 0,
				parameters: {
					power: 2.5,
					impedance: 4.0,
					delay: 0.1,
					inverted: true,
				},
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.id).toBe('test-source-id');
			expect(source.type).toBe('source');
			expect(source.label).toBe('V1');
			expect(source.x).toBe(70);
			expect(source.y).toBe(80);
			expect(source.rotation).toBe(0);
			expect(source.parameters.power).toBe(2.5);
			expect(source.parameters.impedance).toBe(4.0);
			expect(source.parameters.delay).toBe(0.1);
			expect(source.parameters.inverted).toBe(true);
		});

		it('should deserialize a ground from JSON', () => {
			const json = {
				id: 'test-ground-id',
				type: 'ground',
				label: '',
				x: 90,
				y: 100,
				rotation: 0,
				parameters: {},
			};

			const ground = Ground.fromJSON(json);

			expect(ground.id).toBe('test-ground-id');
			expect(ground.type).toBe('ground');
			expect(ground.label).toBe('');
			expect(ground.x).toBe(90);
			expect(ground.y).toBe(100);
			expect(ground.rotation).toBe(0);
			expect(ground.parameters).toEqual({});
		});

		it('should handle missing optional fields with defaults', () => {
			const json = {
				id: 'test-resistor-id',
				type: 'resistor',
				x: 10,
				y: 20,
				parameters: {
					resistance: 8.0,
					tolerance: 5,
					state: 'normal',
				},
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.label).toBe('');
			expect(resistor.rotation).toBe(0);
		});
	});

	describe('Wire.fromJSON()', () => {
		it('should deserialize a wire from JSON', () => {
			const json = {
				id: 'test-wire-id',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
				segments: [
					{ x: 10, y: 20 },
					{ x: 30, y: 40 },
				],
			};

			const wire = Wire.fromJSON(json);

			expect(wire.id).toBe('test-wire-id');
			expect(wire.startNode.componentId).toBe('comp1');
			expect(wire.startNode.terminal).toBe(0);
			expect(wire.endNode.componentId).toBe('comp2');
			expect(wire.endNode.terminal).toBe(1);
			expect(wire.segments).toHaveLength(2);
			expect(wire.segments[0]).toEqual({ x: 10, y: 20 });
			expect(wire.segments[1]).toEqual({ x: 30, y: 40 });
		});

		it('should deserialize a wire with no segments from JSON', () => {
			const json = {
				id: 'test-wire-id',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
				segments: [],
			};

			const wire = Wire.fromJSON(json);

			expect(wire.id).toBe('test-wire-id');
			expect(wire.segments).toEqual([]);
		});

		it('should handle missing segments array', () => {
			const json = {
				id: 'test-wire-id',
				startNode: {
					componentId: 'comp1',
					terminal: 0,
				},
				endNode: {
					componentId: 'comp2',
					terminal: 1,
				},
			};

			const wire = Wire.fromJSON(json);

			expect(wire.segments).toEqual([]);
		});
	});

	describe('Node.fromJSON()', () => {
		it('should deserialize a node from JSON', () => {
			const json = {
				id: 'test-node-id',
				x: 100,
				y: 200,
				connectedWires: ['wire1', 'wire2'],
			};

			const node = Node.fromJSON(json);

			expect(node.id).toBe('test-node-id');
			expect(node.x).toBe(100);
			expect(node.y).toBe(200);
			expect(node.connectedWires).toEqual(['wire1', 'wire2']);
		});

		it('should deserialize a node with no wires from JSON', () => {
			const json = {
				id: 'test-node-id',
				x: 150,
				y: 250,
				connectedWires: [],
			};

			const node = Node.fromJSON(json);

			expect(node.id).toBe('test-node-id');
			expect(node.connectedWires).toEqual([]);
		});

		it('should handle missing connectedWires array', () => {
			const json = {
				id: 'test-node-id',
				x: 150,
				y: 250,
			};

			const node = Node.fromJSON(json);

			expect(node.connectedWires).toEqual([]);
		});
	});

	describe('TextAnnotation.fromJSON()', () => {
		it('should deserialize a text annotation from JSON', () => {
			const json = {
				id: 'test-annotation-id',
				x: 300,
				y: 400,
				text: 'Test annotation',
				fontSize: 16,
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.id).toBe('test-annotation-id');
			expect(annotation.x).toBe(300);
			expect(annotation.y).toBe(400);
			expect(annotation.text).toBe('Test annotation');
			expect(annotation.fontSize).toBe(16);
		});

		it('should use default font size when not provided', () => {
			const json = {
				id: 'test-annotation-id',
				x: 350,
				y: 450,
				text: 'Another annotation',
			};

			const annotation = TextAnnotation.fromJSON(json);

			expect(annotation.fontSize).toBe(12);
		});
	});

	describe('Circuit.fromJSON()', () => {
		it('should deserialize an empty circuit from JSON', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Test Circuit',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
				components: [],
				wires: [],
				annotations: [],
			};

			const circuit = Circuit.fromJSON(json);

			expect(circuit.metadata.version).toBe('1.0');
			expect(circuit.metadata.name).toBe('Test Circuit');
			expect(circuit.metadata.created).toBe('2024-01-01T00:00:00.000Z');
			expect(circuit.metadata.modified).toBe('2024-01-02T00:00:00.000Z');
			expect(circuit.components).toEqual([]);
			expect(circuit.wires).toEqual([]);
			expect(circuit.annotations).toEqual([]);
		});

		it('should deserialize a circuit with components from JSON', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Simple Circuit',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
				components: [
					{
						id: 'resistor-1',
						type: 'resistor',
						label: 'R1',
						x: 10,
						y: 20,
						rotation: 0,
						parameters: {
							resistance: 8.0,
							tolerance: 5,
							state: 'normal',
						},
					},
					{
						id: 'capacitor-1',
						type: 'capacitor',
						label: 'C1',
						x: 30,
						y: 40,
						rotation: 0,
						parameters: {
							capacitance: 10e-6,
							tolerance: 10,
							esr: 0.0,
							state: 'normal',
						},
					},
				],
				wires: [],
				annotations: [],
			};

			const circuit = Circuit.fromJSON(json);

			expect(circuit.components).toHaveLength(2);
			expect(circuit.components[0]).toBeInstanceOf(Resistor);
			expect(circuit.components[0].id).toBe('resistor-1');
			expect(circuit.components[0].label).toBe('R1');
			expect(circuit.components[1]).toBeInstanceOf(Capacitor);
			expect(circuit.components[1].id).toBe('capacitor-1');
			expect(circuit.components[1].label).toBe('C1');
		});

		it('should deserialize all component types correctly', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'All Components',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
				components: [
					{
						id: 'resistor-1',
						type: 'resistor',
						label: 'R1',
						x: 0,
						y: 0,
						rotation: 0,
						parameters: { resistance: 8.0, tolerance: 5, state: 'normal' },
					},
					{
						id: 'capacitor-1',
						type: 'capacitor',
						label: 'C1',
						x: 10,
						y: 0,
						rotation: 0,
						parameters: { capacitance: 10e-6, tolerance: 10, esr: 0.0, state: 'normal' },
					},
					{
						id: 'inductor-1',
						type: 'inductor',
						label: 'L1',
						x: 20,
						y: 0,
						rotation: 0,
						parameters: { inductance: 1e-3, tolerance: 10, esr: 0.0, state: 'normal' },
					},
					{
						id: 'speaker-1',
						type: 'speaker',
						label: 'S1',
						x: 30,
						y: 0,
						rotation: 0,
						parameters: {
							name: '',
							sensitivity: 0.0,
							delay: 0.0,
							delayUnit: 'in',
							inverted: false,
							muted: false,
							frdFile: null,
							zmaFile: null,
							frdPhaseSource: 'measured',
							zmaPhaseSource: 'measured',
							offAxisFiles: [],
						},
					},
					{
						id: 'source-1',
						type: 'source',
						label: 'V1',
						x: 40,
						y: 0,
						rotation: 0,
						parameters: { power: 1.0, impedance: 8.0, delay: 0.0, inverted: false },
					},
					{
						id: 'ground-1',
						type: 'ground',
						label: '',
						x: 50,
						y: 0,
						rotation: 0,
						parameters: {},
					},
				],
				wires: [],
				annotations: [],
			};

			const circuit = Circuit.fromJSON(json);

			expect(circuit.components).toHaveLength(6);
			expect(circuit.components[0]).toBeInstanceOf(Resistor);
			expect(circuit.components[1]).toBeInstanceOf(Capacitor);
			expect(circuit.components[2]).toBeInstanceOf(Inductor);
			expect(circuit.components[3]).toBeInstanceOf(Speaker);
			expect(circuit.components[4]).toBeInstanceOf(VoltageSource);
			expect(circuit.components[5]).toBeInstanceOf(Ground);
		});

		it('should deserialize a circuit with wires from JSON', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Circuit with Wires',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
				components: [],
				wires: [
					{
						id: 'wire-1',
						startNode: { componentId: 'comp1', terminal: 0 },
						endNode: { componentId: 'comp2', terminal: 1 },
						segments: [{ x: 10, y: 20 }],
					},
				],
				annotations: [],
			};

			const circuit = Circuit.fromJSON(json);

			expect(circuit.wires).toHaveLength(1);
			expect(circuit.wires[0]).toBeInstanceOf(Wire);
			expect(circuit.wires[0].id).toBe('wire-1');
			expect(circuit.wires[0].startNode.componentId).toBe('comp1');
		});

		it('should deserialize a circuit with annotations from JSON', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Circuit with Annotations',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
				components: [],
				wires: [],
				annotations: [
					{
						id: 'annotation-1',
						x: 100,
						y: 200,
						text: 'Test note',
						fontSize: 14,
					},
				],
			};

			const circuit = Circuit.fromJSON(json);

			expect(circuit.annotations).toHaveLength(1);
			expect(circuit.annotations[0]).toBeInstanceOf(TextAnnotation);
			expect(circuit.annotations[0].id).toBe('annotation-1');
			expect(circuit.annotations[0].text).toBe('Test note');
		});

		it('should throw error for unknown component type', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Invalid Circuit',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
				components: [
					{
						id: 'unknown-1',
						type: 'unknown-type',
						label: 'X1',
						x: 0,
						y: 0,
						rotation: 0,
						parameters: {},
					},
				],
				wires: [],
				annotations: [],
			};

			expect(() => Circuit.fromJSON(json)).toThrow('Unknown component type: unknown-type');
		});

		it('should handle missing optional arrays', () => {
			const json = {
				version: '1.0',
				metadata: {
					name: 'Minimal Circuit',
					created: '2024-01-01T00:00:00.000Z',
					modified: '2024-01-02T00:00:00.000Z',
				},
			};

			const circuit = Circuit.fromJSON(json);

			expect(circuit.components).toEqual([]);
			expect(circuit.wires).toEqual([]);
			expect(circuit.annotations).toEqual([]);
		});
	});

	describe('Serialization round-trip', () => {
		it('should preserve resistor data through serialization round-trip', () => {
			const original = new Resistor(10, 20);
			original.label = 'R1';
			original.rotation = 90;
			original.parameters.resistance = 4.7;

			const json = original.toJSON();
			const restored = Resistor.fromJSON(json);

			expect(restored.id).toBe(original.id);
			expect(restored.type).toBe(original.type);
			expect(restored.label).toBe(original.label);
			expect(restored.x).toBe(original.x);
			expect(restored.y).toBe(original.y);
			expect(restored.rotation).toBe(original.rotation);
			expect(restored.parameters.resistance).toBe(original.parameters.resistance);
		});

		it('should preserve speaker data through serialization round-trip', () => {
			const original = new Speaker(50, 60);
			original.label = 'S1';
			original.parameters.name = 'Tweeter';
			original.parameters.sensitivity = 3.0;
			original.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/file.frd', phaseSource: 'measured' },
			];

			const json = original.toJSON();
			const restored = Speaker.fromJSON(json);

			expect(restored.id).toBe(original.id);
			expect(restored.parameters.name).toBe(original.parameters.name);
			expect(restored.parameters.sensitivity).toBe(original.parameters.sensitivity);
			expect(restored.parameters.offAxisFiles).toEqual(original.parameters.offAxisFiles);
		});

		it('should preserve circuit data through serialization round-trip', () => {
			const original = new Circuit();
			original.metadata.name = 'Test Circuit';

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			original.addComponent(resistor);

			const capacitor = new Capacitor(30, 40);
			capacitor.label = 'C1';
			original.addComponent(capacitor);

			const wire = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: capacitor.id, terminal: 0 },
			);
			wire.addSegment(20, 30);
			original.addWire(wire);

			const annotation = new TextAnnotation(100, 200, 'Test note');
			original.addAnnotation(annotation);

			const json = original.toJSON();
			const restored = Circuit.fromJSON(json);

			expect(restored.metadata.name).toBe(original.metadata.name);
			expect(restored.components).toHaveLength(2);
			expect(restored.components[0]).toBeInstanceOf(Resistor);
			expect(restored.components[0].id).toBe(resistor.id);
			expect(restored.components[1]).toBeInstanceOf(Capacitor);
			expect(restored.components[1].id).toBe(capacitor.id);
			expect(restored.wires).toHaveLength(1);
			expect(restored.wires[0].id).toBe(wire.id);
			expect(restored.wires[0].segments).toHaveLength(1);
			expect(restored.annotations).toHaveLength(1);
			expect(restored.annotations[0].text).toBe('Test note');
		});
	});
});
