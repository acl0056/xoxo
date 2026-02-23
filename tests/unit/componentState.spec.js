/**
 * Unit tests for component state transitions
 * Tests normal, open, and short states for passive components
 */

import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';

describe('Component State Transitions', () => {
	describe('Resistor State', () => {
		test('should initialize with normal state', () => {
			const resistor = new Resistor(0, 0);
			expect(resistor.parameters.state).toBe('normal');
		});

		test('should transition from normal to open', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'open';
			expect(resistor.parameters.state).toBe('open');
		});

		test('should transition from normal to short', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'short';
			expect(resistor.parameters.state).toBe('short');
		});

		test('should transition from open to normal', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'open';
			resistor.parameters.state = 'normal';
			expect(resistor.parameters.state).toBe('normal');
		});

		test('should transition from short to normal', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'short';
			resistor.parameters.state = 'normal';
			expect(resistor.parameters.state).toBe('normal');
		});

		test('should transition from open to short', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'open';
			resistor.parameters.state = 'short';
			expect(resistor.parameters.state).toBe('short');
		});

		test('should transition from short to open', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'short';
			resistor.parameters.state = 'open';
			expect(resistor.parameters.state).toBe('open');
		});

		test('should validate normal state', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'normal';
			const validation = resistor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should validate open state', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'open';
			const validation = resistor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should validate short state', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'short';
			const validation = resistor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should reject invalid state', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.state = 'invalid';
			const validation = resistor.validate();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('State must be one of: normal, open, short');
		});

		test('should preserve other parameters during state transition', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 100;
			resistor.parameters.tolerance = 1;
			resistor.parameters.state = 'open';

			expect(resistor.parameters.resistance).toBe(100);
			expect(resistor.parameters.tolerance).toBe(1);
			expect(resistor.parameters.state).toBe('open');
		});
	});

	describe('Capacitor State', () => {
		test('should initialize with normal state', () => {
			const capacitor = new Capacitor(0, 0);
			expect(capacitor.parameters.state).toBe('normal');
		});

		test('should transition from normal to open', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'open';
			expect(capacitor.parameters.state).toBe('open');
		});

		test('should transition from normal to short', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'short';
			expect(capacitor.parameters.state).toBe('short');
		});

		test('should validate normal state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'normal';
			const validation = capacitor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should validate open state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'open';
			const validation = capacitor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should validate short state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'short';
			const validation = capacitor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should reject invalid state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'invalid';
			const validation = capacitor.validate();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('State must be one of: normal, open, short');
		});

		test('should preserve other parameters during state transition', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.capacitance = 100e-6;
			capacitor.parameters.tolerance = 5;
			capacitor.parameters.esr = 0.5;
			capacitor.parameters.state = 'short';

			expect(capacitor.parameters.capacitance).toBe(100e-6);
			expect(capacitor.parameters.tolerance).toBe(5);
			expect(capacitor.parameters.esr).toBe(0.5);
			expect(capacitor.parameters.state).toBe('short');
		});
	});

	describe('Inductor State', () => {
		test('should initialize with normal state', () => {
			const inductor = new Inductor(0, 0);
			expect(inductor.parameters.state).toBe('normal');
		});

		test('should transition from normal to open', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'open';
			expect(inductor.parameters.state).toBe('open');
		});

		test('should transition from normal to short', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'short';
			expect(inductor.parameters.state).toBe('short');
		});

		test('should validate normal state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'normal';
			const validation = inductor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should validate open state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'open';
			const validation = inductor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should validate short state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'short';
			const validation = inductor.validate();
			expect(validation.valid).toBe(true);
		});

		test('should reject invalid state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'invalid';
			const validation = inductor.validate();
			expect(validation.valid).toBe(false);
			expect(validation.errors).toContain('State must be one of: normal, open, short');
		});

		test('should preserve other parameters during state transition', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.inductance = 2e-3;
			inductor.parameters.tolerance = 10;
			inductor.parameters.esr = 0.2;
			inductor.parameters.state = 'open';

			expect(inductor.parameters.inductance).toBe(2e-3);
			expect(inductor.parameters.tolerance).toBe(10);
			expect(inductor.parameters.esr).toBe(0.2);
			expect(inductor.parameters.state).toBe('open');
		});
	});

	describe('State Serialization', () => {
		test('should serialize resistor state to JSON', () => {
			const resistor = new Resistor(5, 10);
			resistor.parameters.state = 'open';
			const json = resistor.toJSON();

			expect(json.parameters.state).toBe('open');
		});

		test('should deserialize resistor state from JSON', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				x: 5,
				y: 10,
				rotation: 0,
				label: 'R1',
				parameters: {
					resistance: 100,
					tolerance: 5,
					state: 'short',
				},
			};

			const resistor = Resistor.fromJSON(json);
			expect(resistor.parameters.state).toBe('short');
		});

		test('should serialize capacitor state to JSON', () => {
			const capacitor = new Capacitor(5, 10);
			capacitor.parameters.state = 'short';
			const json = capacitor.toJSON();

			expect(json.parameters.state).toBe('short');
		});

		test('should deserialize capacitor state from JSON', () => {
			const json = {
				id: 'test-id',
				type: 'capacitor',
				x: 5,
				y: 10,
				rotation: 0,
				label: 'C1',
				parameters: {
					capacitance: 10e-6,
					tolerance: 10,
					esr: 0.1,
					state: 'open',
				},
			};

			const capacitor = Capacitor.fromJSON(json);
			expect(capacitor.parameters.state).toBe('open');
		});

		test('should serialize inductor state to JSON', () => {
			const inductor = new Inductor(5, 10);
			inductor.parameters.state = 'normal';
			const json = inductor.toJSON();

			expect(json.parameters.state).toBe('normal');
		});

		test('should deserialize inductor state from JSON', () => {
			const json = {
				id: 'test-id',
				type: 'inductor',
				x: 5,
				y: 10,
				rotation: 0,
				label: 'L1',
				parameters: {
					inductance: 1e-3,
					tolerance: 10,
					esr: 0.05,
					state: 'short',
				},
			};

			const inductor = Inductor.fromJSON(json);
			expect(inductor.parameters.state).toBe('short');
		});
	});
});
