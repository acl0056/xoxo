import { Circuit } from '@/models/Circuit';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { Ground } from '@/models/Ground';
import { VoltageSource } from '@/models/VoltageSource';
import { Wire } from '@/models/Wire';
import CircuitValidator from '@/validation/CircuitValidator';

describe('CircuitValidator', () => {
	let circuit;
	let validator;

	beforeEach(() => {
		circuit = new Circuit();
		validator = new CircuitValidator(circuit);
	});

	describe('validateBasicStructure', () => {
		it('should report error for empty circuit', () => {
			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Circuit has no components');
		});

		it('should report error for circuit without ground', () => {
			const source = new VoltageSource(10, 10);
			circuit.addComponent(source);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Circuit has no ground reference');
		});

		it('should report error for circuit without voltage source', () => {
			const ground = new Ground(10, 10);
			circuit.addComponent(ground);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Circuit has no voltage source');
		});

		it('should report error for wire with invalid start component reference', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);
			circuit.addComponent(source);
			circuit.addComponent(ground);

			const wire = new Wire(
				{ componentId: 'invalid-id', terminal: 0 },
				{ componentId: ground.id, terminal: 0 },
			);

			// Circuit.addWire validates and throws, so we test that the validator
			// would catch this if the wire was already in the circuit
			circuit.wires.push(wire); // Bypass validation to test validator

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('references non-existent start component'))).toBe(true);
		});

		it('should report error for wire with invalid end component reference', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);
			circuit.addComponent(source);
			circuit.addComponent(ground);

			const wire = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: 'invalid-id', terminal: 0 },
			);

			// Circuit.addWire validates and throws, so we test that the validator
			// would catch this if the wire was already in the circuit
			circuit.wires.push(wire); // Bypass validation to test validator

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('references non-existent end component'))).toBe(true);
		});

		it('should report error for duplicate component labels', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);
			const resistor1 = new Resistor(20, 10);
			const resistor2 = new Resistor(40, 10);

			resistor1.label = 'R1';
			resistor2.label = 'R1'; // Duplicate label

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Duplicate component label: R1'))).toBe(true);
		});

		it('should pass validation for valid basic circuit', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);
			circuit.addComponent(source);
			circuit.addComponent(ground);

			// Connect source to ground
			const wire = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire);

			const result = validator.validate();

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe('detectFloatingNodes', () => {
		it('should detect wire connected to floating component', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const resistor1 = new Resistor(30, 10);
			const resistor2 = new Resistor(70, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);

			// Connect source -> resistor1 -> ground (valid path)
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor1.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: resistor1.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			const wire3 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);

			// Connect resistor2 to itself (floating island with wire)
			const wire4 = new Wire(
				{ componentId: resistor2.id, terminal: 0 },
				{ componentId: resistor2.id, terminal: 1 },
			);

			circuit.addWire(wire1);
			circuit.addWire(wire2);
			circuit.addWire(wire3);
			circuit.addWire(wire4);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Floating node detected') && e.includes(resistor2.id))).toBe(true);
		});

		it('should not report floating nodes for fully connected circuit', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const resistor = new Resistor(30, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor);

			// Connect source -> resistor -> ground
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			const wire3 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire1);
			circuit.addWire(wire2);
			circuit.addWire(wire3);

			const result = validator.validate();

			expect(result.valid).toBe(true);
			expect(result.errors.some((e) => e.includes('Floating node'))).toBe(false);
		});

		it('should ignore components in open state', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const resistor = new Resistor(30, 10);

			resistor.parameters.state = 'open'; // Component is open (disconnected)

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor);

			// Connect source to ground (valid circuit without the open resistor)
			const wire = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire);

			const result = validator.validate();

			// Open components should not cause floating node errors
			// The circuit is valid because source and ground are connected
			expect(result.valid).toBe(true);
		});
	});

	describe('detectShortCircuits', () => {
		it('should detect direct short circuit between voltage source terminals', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);

			// Connect source positive directly to source negative (short circuit)
			const wire = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: source.id, terminal: 1 },
			);
			circuit.addWire(wire);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Short circuit detected'))).toBe(true);
		});

		it('should detect short circuit through wire path', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const capacitor = new Capacitor(30, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(capacitor);

			// Connect source through capacitor (no resistance) back to itself
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: capacitor.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: capacitor.id, terminal: 1 },
				{ componentId: source.id, terminal: 1 },
			);
			circuit.addWire(wire1);
			circuit.addWire(wire2);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Short circuit detected'))).toBe(true);
		});

		it('should not report short circuit when resistor is in path', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const resistor = new Resistor(30, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor);

			// Connect source through resistor to ground (valid circuit)
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			const wire3 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire1);
			circuit.addWire(wire2);
			circuit.addWire(wire3);

			const result = validator.validate();

			expect(result.valid).toBe(true);
			expect(result.errors.some((e) => e.includes('Short circuit'))).toBe(false);
		});

		it('should detect short circuit through component in short state', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const resistor = new Resistor(30, 10);

			resistor.parameters.state = 'short'; // Component is shorted

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor);

			// Connect source through shorted resistor back to itself
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: resistor.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: resistor.id, terminal: 1 },
				{ componentId: source.id, terminal: 1 },
			);
			circuit.addWire(wire1);
			circuit.addWire(wire2);

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('Short circuit detected'))).toBe(true);
		});
	});

	describe('detectDisconnectedComponents', () => {
		it('should warn about circuit with no speakers', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);

			const wire = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire);

			const result = validator.validate();

			expect(result.warnings.some((w) => w.includes('Circuit has no speakers'))).toBe(true);
		});

		it('should warn about speaker not in signal path', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);
			const speaker = new Speaker(50, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(speaker);

			// Connect source to ground, but not to speaker
			const wire = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire);

			const result = validator.validate();

			expect(result.warnings.some((w) => w.includes('Disconnected component') && w.includes(speaker.id))).toBe(true);
		});

		it('should warn about disconnected passive component', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(30, 10);
			const resistor = new Resistor(50, 10);
			const speaker = new Speaker(70, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(resistor);
			circuit.addComponent(speaker);

			// Connect source -> speaker -> ground, but leave resistor disconnected
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: speaker.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: speaker.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			const wire3 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire1);
			circuit.addWire(wire2);
			circuit.addWire(wire3);

			const result = validator.validate();

			expect(result.warnings.some((w) => w.includes('Disconnected component') && w.includes(resistor.id))).toBe(true);
		});

		it('should not warn about connected speaker', () => {
			const source = new VoltageSource(10, 10);
			const ground = new Ground(50, 10);
			const speaker = new Speaker(30, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground);
			circuit.addComponent(speaker);

			// Connect source -> speaker -> ground
			const wire1 = new Wire(
				{ componentId: source.id, terminal: 0 },
				{ componentId: speaker.id, terminal: 0 },
			);
			const wire2 = new Wire(
				{ componentId: speaker.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			const wire3 = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground.id, terminal: 0 },
			);
			circuit.addWire(wire1);
			circuit.addWire(wire2);
			circuit.addWire(wire3);

			const result = validator.validate();

			expect(result.warnings.some((w) => w.includes('Disconnected component') && w.includes(speaker.id))).toBe(false);
		});

		it('should not warn about ground being disconnected', () => {
			const source = new VoltageSource(10, 10);
			const ground1 = new Ground(30, 10);
			const ground2 = new Ground(50, 10);

			circuit.addComponent(source);
			circuit.addComponent(ground1);
			circuit.addComponent(ground2);

			// Connect source to ground1, leave ground2 disconnected
			const wire = new Wire(
				{ componentId: source.id, terminal: 1 },
				{ componentId: ground1.id, terminal: 0 },
			);
			circuit.addWire(wire);

			const result = validator.validate();

			// Ground components should not trigger disconnected warnings
			expect(result.warnings.some((w) => w.includes(ground2.id))).toBe(false);
		});
	});

	describe('complex circuit scenarios', () => {
		it('should detect multiple errors in invalid circuit', () => {
			const source = new VoltageSource(10, 10);
			const resistor1 = new Resistor(30, 10);
			const resistor2 = new Resistor(50, 10);

			resistor1.label = 'R1';
			resistor2.label = 'R1'; // Duplicate label

			circuit.addComponent(source);
			circuit.addComponent(resistor1);
			circuit.addComponent(resistor2);
			// No ground

			const result = validator.validate();

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
			expect(result.errors.some((e) => e.includes('no ground reference'))).toBe(true);
			expect(result.errors.some((e) => e.includes('Duplicate component label'))).toBe(true);
		});
	});
});
