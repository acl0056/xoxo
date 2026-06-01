import Ajv from 'ajv';
import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';
import { Wire } from '@/models/Wire';
import { TextAnnotation } from '@/models/TextAnnotation';
import circuitSchema from '@schemas/circuit.schema.json';

describe('Schema Validation for toJSON() output', () => {
	let ajv;
	let validateCircuit;

	beforeAll(() => {
		// Configure Ajv with format support for date-time
		ajv = new Ajv({ allErrors: true, strict: false });
		validateCircuit = ajv.compile(circuitSchema);
	});

	describe('Circuit serialization schema compliance', () => {
		it('should produce schema-compliant JSON for an empty circuit', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Empty Circuit';

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with a resistor', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Resistor Circuit';

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			circuit.addComponent(resistor);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with a capacitor', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Capacitor Circuit';

			const capacitor = new Capacitor(15, 25);
			capacitor.label = 'C1';
			capacitor.parameters.capacitance = 47e-6;
			capacitor.parameters.esr = 0.1;
			circuit.addComponent(capacitor);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with an inductor', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Inductor Circuit';

			const inductor = new Inductor(30, 40);
			inductor.label = 'L1';
			inductor.parameters.inductance = 2.2e-3;
			inductor.parameters.esr = 0.5;
			circuit.addComponent(inductor);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with a speaker', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Speaker Circuit';

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
			circuit.addComponent(speaker);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with a voltage source', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Voltage Source Circuit';

			const source = new VoltageSource(70, 80);
			source.label = 'V1';
			source.parameters.power = 2.5;
			source.parameters.impedance = 4.0;
			source.parameters.delay = 0.1;
			source.parameters.inverted = true;
			circuit.addComponent(source);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with a ground', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Ground Circuit';

			const ground = new Ground(90, 100);
			circuit.addComponent(ground);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with wires', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Circuit with Wires';

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
			wire.addSegment(20, 30);
			circuit.addWire(wire);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with annotations', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Circuit with Annotations';

			const annotation = new TextAnnotation(100, 200, 'Test annotation');
			annotation.fontSize = 16;
			circuit.addAnnotation(annotation);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a complete circuit', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Complete Crossover Circuit';

			// Add voltage source
			const source = new VoltageSource(0, 0);
			source.label = 'V1';
			circuit.addComponent(source);

			// Add resistor
			const resistor = new Resistor(10, 0);
			resistor.label = 'R1';
			resistor.parameters.resistance = 4.7;
			circuit.addComponent(resistor);

			// Add capacitor
			const capacitor = new Capacitor(20, 0);
			capacitor.label = 'C1';
			capacitor.parameters.capacitance = 10e-6;
			capacitor.parameters.esr = 0.05;
			circuit.addComponent(capacitor);

			// Add inductor
			const inductor = new Inductor(30, 0);
			inductor.label = 'L1';
			inductor.parameters.inductance = 1e-3;
			inductor.parameters.esr = 0.2;
			circuit.addComponent(inductor);

			// Add speaker
			const speaker = new Speaker(40, 0);
			speaker.label = 'S1';
			speaker.parameters.name = 'Woofer';
			speaker.parameters.sensitivity = -3.0;
			speaker.parameters.frdFile = '/path/to/woofer.frd';
			speaker.parameters.zmaFile = '/path/to/woofer.zma';
			circuit.addComponent(speaker);

			// Add ground
			const ground = new Ground(50, 0);
			circuit.addComponent(ground);

			// Add wires
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: resistor.id, terminal: 0 },
			);
			circuit.addWire(wire1);

			const wire2 = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: capacitor.id, terminal: 0 },
			);
			wire2.addSegment(15, 5);
			circuit.addWire(wire2);

			const wire3 = new Wire(
				{ componentId: capacitor.id, terminal: 1 },
				{ componentId: inductor.id, terminal: 0 },
			);
			circuit.addWire(wire3);

			const wire4 = new Wire(
				{ componentId: inductor.id, terminal: 1 },
				{ componentId: speaker.id, terminal: 0 },
			);
			circuit.addWire(wire4);

			const wire5 = new Wire(
				{ componentId: speaker.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire5);

			// Add annotation
			const annotation = new TextAnnotation(25, 10, '2-way crossover network');
			annotation.fontSize = 14;
			circuit.addAnnotation(annotation);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for a circuit with all component types', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'All Component Types';

			// Add one of each component type
			const resistor = new Resistor(0, 0);
			resistor.label = 'R1';
			circuit.addComponent(resistor);

			const capacitor = new Capacitor(10, 0);
			capacitor.label = 'C1';
			circuit.addComponent(capacitor);

			const inductor = new Inductor(20, 0);
			inductor.label = 'L1';
			circuit.addComponent(inductor);

			const speaker = new Speaker(30, 0);
			speaker.label = 'S1';
			circuit.addComponent(speaker);

			const source = new VoltageSource(40, 0);
			source.label = 'V1';
			circuit.addComponent(source);

			const ground = new Ground(50, 0);
			circuit.addComponent(ground);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});
	});

	describe('Component state variations', () => {
		it('should produce schema-compliant JSON for components in open state', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Open State Circuit';

			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			resistor.parameters.state = 'open';
			circuit.addComponent(resistor);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for components in short state', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Short State Circuit';

			const capacitor = new Capacitor(15, 25);
			capacitor.label = 'C1';
			capacitor.parameters.state = 'short';
			circuit.addComponent(capacitor);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});
	});

	describe('Speaker phase source variations', () => {
		it('should produce schema-compliant JSON for speaker with measured phase', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Measured Phase Circuit';

			const speaker = new Speaker(50, 60);
			speaker.label = 'S1';
			speaker.parameters.frdPhaseSource = 'measured';
			speaker.parameters.zmaPhaseSource = 'measured';
			circuit.addComponent(speaker);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for speaker with derived phase', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Derived Phase Circuit';

			const speaker = new Speaker(50, 60);
			speaker.label = 'S1';
			speaker.parameters.frdPhaseSource = 'derived';
			speaker.parameters.zmaPhaseSource = 'derived';
			circuit.addComponent(speaker);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});

		it('should produce schema-compliant JSON for speaker with mixed phase sources', () => {
			const circuit = new Circuit();
			circuit.metadata.name = 'Mixed Phase Circuit';

			const speaker = new Speaker(50, 60);
			speaker.label = 'S1';
			speaker.parameters.frdPhaseSource = 'derived';
			speaker.parameters.zmaPhaseSource = 'measured';
			circuit.addComponent(speaker);

			const json = circuit.toJSON();
			const valid = validateCircuit(json);

			if (!valid) {
				console.error('Validation errors:', validateCircuit.errors);
			}

			expect(valid).toBe(true);
		});
	});
});
