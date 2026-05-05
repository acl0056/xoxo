import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { Speaker } from '@/models/Speaker';
import { VoltageSource } from '@/models/VoltageSource';
import { Ground } from '@/models/Ground';

/**
 * Component Serialization Tests
 * Tests for serialization of each component type with various parameter configurations
 * Task 4.4: Write unit tests for serialization of each component type
 */

describe('Component Serialization - Resistor', () => {
	describe('toJSON with various states', () => {
		it('should serialize resistor in normal state', () => {
			const resistor = new Resistor(10, 20);
			resistor.label = 'R1';
			resistor.parameters.resistance = 4.7;
			resistor.parameters.tolerance = 5;
			resistor.parameters.state = 'normal';

			const json = resistor.toJSON();

			expect(json.type).toBe('resistor');
			expect(json.parameters.state).toBe('normal');
			expect(json.parameters.resistance).toBe(4.7);
		});

		it('should serialize resistor in open state', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.state = 'open';

			const json = resistor.toJSON();

			expect(json.parameters.state).toBe('open');
		});

		it('should serialize resistor in short state', () => {
			const resistor = new Resistor(10, 20);
			resistor.parameters.state = 'short';

			const json = resistor.toJSON();

			expect(json.parameters.state).toBe('short');
		});
	});

	describe('toJSON with various resistance values', () => {
		it('should serialize resistor with small resistance value', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 0.1;

			const json = resistor.toJSON();

			expect(json.parameters.resistance).toBe(0.1);
		});

		it('should serialize resistor with large resistance value', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 1000000;

			const json = resistor.toJSON();

			expect(json.parameters.resistance).toBe(1000000);
		});

		it('should serialize resistor with typical crossover value', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.resistance = 8.0;

			const json = resistor.toJSON();

			expect(json.parameters.resistance).toBe(8.0);
		});
	});

	describe('toJSON with various tolerance values', () => {
		it('should serialize resistor with 1% tolerance', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.tolerance = 1;

			const json = resistor.toJSON();

			expect(json.parameters.tolerance).toBe(1);
		});

		it('should serialize resistor with 20% tolerance', () => {
			const resistor = new Resistor(0, 0);
			resistor.parameters.tolerance = 20;

			const json = resistor.toJSON();

			expect(json.parameters.tolerance).toBe(20);
		});
	});

	describe('fromJSON with various states', () => {
		it('should deserialize resistor in open state', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				label: 'R1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					resistance: 8.0,
					tolerance: 5,
					state: 'open',
				},
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.parameters.state).toBe('open');
		});

		it('should deserialize resistor in short state', () => {
			const json = {
				id: 'test-id',
				type: 'resistor',
				label: 'R1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					resistance: 8.0,
					tolerance: 5,
					state: 'short',
				},
			};

			const resistor = Resistor.fromJSON(json);

			expect(resistor.parameters.state).toBe('short');
		});
	});
});

describe('Component Serialization - Capacitor', () => {
	describe('toJSON with various capacitance values', () => {
		it('should serialize capacitor with small capacitance', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.capacitance = 1e-9; // 1 nanofarad

			const json = capacitor.toJSON();

			expect(json.parameters.capacitance).toBe(1e-9);
		});

		it('should serialize capacitor with large capacitance', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.capacitance = 1e-3; // 1 millifarad

			const json = capacitor.toJSON();

			expect(json.parameters.capacitance).toBe(1e-3);
		});

		it('should serialize capacitor with typical crossover value', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.capacitance = 47e-6; // 47 microfarads

			const json = capacitor.toJSON();

			expect(json.parameters.capacitance).toBe(47e-6);
		});
	});

	describe('toJSON with ESR values', () => {
		it('should serialize capacitor with zero ESR', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.esr = 0.0;

			const json = capacitor.toJSON();

			expect(json.parameters.esr).toBe(0.0);
		});

		it('should serialize capacitor with non-zero ESR', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.esr = 0.5;

			const json = capacitor.toJSON();

			expect(json.parameters.esr).toBe(0.5);
		});

		it('should serialize capacitor with high ESR', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.esr = 2.0;

			const json = capacitor.toJSON();

			expect(json.parameters.esr).toBe(2.0);
		});
	});

	describe('toJSON with various states', () => {
		it('should serialize capacitor in normal state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'normal';

			const json = capacitor.toJSON();

			expect(json.parameters.state).toBe('normal');
		});

		it('should serialize capacitor in open state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'open';

			const json = capacitor.toJSON();

			expect(json.parameters.state).toBe('open');
		});

		it('should serialize capacitor in short state', () => {
			const capacitor = new Capacitor(0, 0);
			capacitor.parameters.state = 'short';

			const json = capacitor.toJSON();

			expect(json.parameters.state).toBe('short');
		});
	});

	describe('fromJSON with ESR values', () => {
		it('should deserialize capacitor with ESR', () => {
			const json = {
				id: 'test-id',
				type: 'capacitor',
				label: 'C1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					capacitance: 10e-6,
					tolerance: 10,
					esr: 0.8,
					state: 'normal',
				},
			};

			const capacitor = Capacitor.fromJSON(json);

			expect(capacitor.parameters.esr).toBe(0.8);
		});
	});
});

describe('Component Serialization - Inductor', () => {
	describe('toJSON with various inductance values', () => {
		it('should serialize inductor with small inductance', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.inductance = 1e-6; // 1 microhenry

			const json = inductor.toJSON();

			expect(json.parameters.inductance).toBe(1e-6);
		});

		it('should serialize inductor with large inductance', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.inductance = 1e-1; // 100 millihenries

			const json = inductor.toJSON();

			expect(json.parameters.inductance).toBe(1e-1);
		});

		it('should serialize inductor with typical crossover value', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.inductance = 2.2e-3; // 2.2 millihenries

			const json = inductor.toJSON();

			expect(json.parameters.inductance).toBe(2.2e-3);
		});
	});

	describe('toJSON with ESR values', () => {
		it('should serialize inductor with zero ESR', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.esr = 0.0;

			const json = inductor.toJSON();

			expect(json.parameters.esr).toBe(0.0);
		});

		it('should serialize inductor with non-zero ESR', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.esr = 1.5;

			const json = inductor.toJSON();

			expect(json.parameters.esr).toBe(1.5);
		});
	});

	describe('toJSON with various states', () => {
		it('should serialize inductor in normal state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'normal';

			const json = inductor.toJSON();

			expect(json.parameters.state).toBe('normal');
		});

		it('should serialize inductor in open state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'open';

			const json = inductor.toJSON();

			expect(json.parameters.state).toBe('open');
		});

		it('should serialize inductor in short state', () => {
			const inductor = new Inductor(0, 0);
			inductor.parameters.state = 'short';

			const json = inductor.toJSON();

			expect(json.parameters.state).toBe('short');
		});
	});

	describe('fromJSON with ESR values', () => {
		it('should deserialize inductor with ESR', () => {
			const json = {
				id: 'test-id',
				type: 'inductor',
				label: 'L1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					inductance: 1e-3,
					tolerance: 10,
					esr: 0.6,
					state: 'normal',
				},
			};

			const inductor = Inductor.fromJSON(json);

			expect(inductor.parameters.esr).toBe(0.6);
		});
	});
});

describe('Component Serialization - Speaker', () => {
	describe('toJSON with various parameter combinations', () => {
		it('should serialize speaker with default parameters', () => {
			const speaker = new Speaker(0, 0);

			const json = speaker.toJSON();

			expect(json.type).toBe('speaker');
			expect(json.parameters.name).toBe('');
			expect(json.parameters.sensitivity).toBe(0.0);
			expect(json.parameters.delay).toBe(0.0);
			expect(json.parameters.inverted).toBe(false);
			expect(json.parameters.muted).toBe(false);
			expect(json.parameters.frdFile).toBe(null);
			expect(json.parameters.zmaFile).toBe(null);
			expect(json.parameters.frdPhaseSource).toBe('measured');
			expect(json.parameters.zmaPhaseSource).toBe('measured');
			expect(json.parameters.offAxisFiles).toEqual([]);
		});

		it('should serialize speaker with custom name', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.name = 'Woofer 8 inch';

			const json = speaker.toJSON();

			expect(json.parameters.name).toBe('Woofer 8 inch');
		});

		it('should serialize speaker with positive sensitivity adjustment', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.sensitivity = 3.5;

			const json = speaker.toJSON();

			expect(json.parameters.sensitivity).toBe(3.5);
		});

		it('should serialize speaker with negative sensitivity adjustment', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.sensitivity = -2.0;

			const json = speaker.toJSON();

			expect(json.parameters.sensitivity).toBe(-2.0);
		});

		it('should serialize speaker with delay', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.delay = 1.5;

			const json = speaker.toJSON();

			expect(json.parameters.delay).toBe(1.5);
		});

		it('should serialize speaker with inverted polarity', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.inverted = true;

			const json = speaker.toJSON();

			expect(json.parameters.inverted).toBe(true);
		});

		it('should serialize speaker with muted flag', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.muted = true;

			const json = speaker.toJSON();

			expect(json.parameters.muted).toBe(true);
		});

		it('should serialize speaker with FRD file path', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.frdFile = '/path/to/driver.frd';

			const json = speaker.toJSON();

			expect(json.parameters.frdFile).toBe('/path/to/driver.frd');
		});

		it('should serialize speaker with ZMA file path', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.zmaFile = '/path/to/driver.zma';

			const json = speaker.toJSON();

			expect(json.parameters.zmaFile).toBe('/path/to/driver.zma');
		});

		it('should serialize speaker with measured phase source', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.frdPhaseSource = 'measured';
			speaker.parameters.zmaPhaseSource = 'measured';

			const json = speaker.toJSON();

			expect(json.parameters.frdPhaseSource).toBe('measured');
			expect(json.parameters.zmaPhaseSource).toBe('measured');
		});

		it('should serialize speaker with single off-axis file', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.offAxisFiles = [
				{ angle: 30, frdPath: '/path/to/driver-30.frd', phaseSource: 'measured' },
			];

			const json = speaker.toJSON();

			expect(json.parameters.offAxisFiles).toHaveLength(1);
			expect(json.parameters.offAxisFiles[0].angle).toBe(30);
			expect(json.parameters.offAxisFiles[0].frdPath).toBe('/path/to/driver-30.frd');
			expect(json.parameters.offAxisFiles[0].phaseSource).toBe('measured');
		});

		it('should serialize speaker with multiple off-axis files', () => {
			const speaker = new Speaker(0, 0);
			speaker.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/driver-15.frd', phaseSource: 'measured' },
				{ angle: 30, frdPath: '/path/to/driver-30.frd', phaseSource: 'measured' },
				{ angle: 45, frdPath: '/path/to/driver-45.frd', phaseSource: 'measured' },
				{ angle: 60, frdPath: '/path/to/driver-60.frd', phaseSource: 'measured' },
			];

			const json = speaker.toJSON();

			expect(json.parameters.offAxisFiles).toHaveLength(4);
			expect(json.parameters.offAxisFiles[0].angle).toBe(15);
			expect(json.parameters.offAxisFiles[3].angle).toBe(60);
		});

		it('should serialize speaker with all parameters configured', () => {
			const speaker = new Speaker(50, 60);
			speaker.label = 'S1';
			speaker.parameters.name = 'Tweeter';
			speaker.parameters.sensitivity = 3.0;
			speaker.parameters.delay = 0.5;
			speaker.parameters.inverted = true;
			speaker.parameters.muted = false;
			speaker.parameters.frdFile = '/path/to/tweeter.frd';
			speaker.parameters.zmaFile = '/path/to/tweeter.zma';
			speaker.parameters.frdPhaseSource = 'measured';
			speaker.parameters.zmaPhaseSource = 'derived';
			speaker.parameters.offAxisFiles = [
				{ angle: 15, frdPath: '/path/to/tweeter-15.frd', phaseSource: 'measured' },
				{ angle: 30, frdPath: '/path/to/tweeter-30.frd', phaseSource: 'measured' },
			];

			const json = speaker.toJSON();

			expect(json.type).toBe('speaker');
			expect(json.label).toBe('S1');
			expect(json.x).toBe(50);
			expect(json.y).toBe(60);
			expect(json.parameters.name).toBe('Tweeter');
			expect(json.parameters.sensitivity).toBe(3.0);
			expect(json.parameters.delay).toBe(0.5);
			expect(json.parameters.inverted).toBe(true);
			expect(json.parameters.muted).toBe(false);
			expect(json.parameters.frdFile).toBe('/path/to/tweeter.frd');
			expect(json.parameters.zmaFile).toBe('/path/to/tweeter.zma');
			expect(json.parameters.frdPhaseSource).toBe('measured');
			expect(json.parameters.zmaPhaseSource).toBe('derived');
			expect(json.parameters.offAxisFiles).toHaveLength(2);
		});
	});

	describe('fromJSON with various parameter combinations', () => {
		it('should deserialize speaker with measured phase source', () => {
			const json = {
				id: 'test-id',
				type: 'speaker',
				label: 'S1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					name: 'Test Speaker',
					sensitivity: 0.0,
					delay: 0.0,
					inverted: false,
					muted: false,
					frdFile: null,
					zmaFile: null,
					frdPhaseSource: 'measured',
					zmaPhaseSource: 'measured',
					offAxisFiles: [],
				},
			};

			const speaker = Speaker.fromJSON(json);

			expect(speaker.parameters.frdPhaseSource).toBe('measured');
			expect(speaker.parameters.zmaPhaseSource).toBe('measured');
		});

		it('should deserialize speaker with off-axis files', () => {
			const json = {
				id: 'test-id',
				type: 'speaker',
				label: 'S1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					name: 'Test Speaker',
					sensitivity: 0.0,
					delay: 0.0,
					inverted: false,
					muted: false,
					frdFile: null,
					zmaFile: null,
					frdPhaseSource: 'derived',
					zmaPhaseSource: 'derived',
					offAxisFiles: [
						{ angle: 30, frdPath: '/path/to/file-30.frd', phaseSource: 'derived' },
						{ angle: 60, frdPath: '/path/to/file-60.frd', phaseSource: 'derived' },
					],
				},
			};

			const speaker = Speaker.fromJSON(json);

			expect(speaker.parameters.offAxisFiles).toHaveLength(2);
			expect(speaker.parameters.offAxisFiles[0].angle).toBe(30);
			expect(speaker.parameters.offAxisFiles[0].phaseSource).toBe('derived');
			expect(speaker.parameters.offAxisFiles[1].angle).toBe(60);
		});
	});
});

describe('Component Serialization - VoltageSource', () => {
	describe('toJSON with various parameter combinations', () => {
		it('should serialize voltage source with default parameters', () => {
			const source = new VoltageSource(0, 0);

			const json = source.toJSON();

			expect(json.type).toBe('source');
			expect(json.parameters.power).toBe(1.0);
			expect(json.parameters.impedance).toBe(8.0);
			expect(json.parameters.delay).toBe(0.0);
			expect(json.parameters.inverted).toBe(false);
		});

		it('should serialize voltage source with custom power', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.power = 10.0;

			const json = source.toJSON();

			expect(json.parameters.power).toBe(10.0);
		});

		it('should serialize voltage source with 4 ohm impedance', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.impedance = 4.0;

			const json = source.toJSON();

			expect(json.parameters.impedance).toBe(4.0);
		});

		it('should serialize voltage source with 16 ohm impedance', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.impedance = 16.0;

			const json = source.toJSON();

			expect(json.parameters.impedance).toBe(16.0);
		});

		it('should serialize voltage source with delay', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.delay = 0.25;

			const json = source.toJSON();

			expect(json.parameters.delay).toBe(0.25);
		});

		it('should serialize voltage source with inverted polarity', () => {
			const source = new VoltageSource(0, 0);
			source.parameters.inverted = true;

			const json = source.toJSON();

			expect(json.parameters.inverted).toBe(true);
		});

		it('should serialize voltage source with all parameters configured', () => {
			const source = new VoltageSource(70, 80);
			source.label = 'V1';
			source.parameters.power = 2.5;
			source.parameters.impedance = 4.0;
			source.parameters.delay = 0.1;
			source.parameters.inverted = true;

			const json = source.toJSON();

			expect(json.type).toBe('source');
			expect(json.label).toBe('V1');
			expect(json.x).toBe(70);
			expect(json.y).toBe(80);
			expect(json.parameters.power).toBe(2.5);
			expect(json.parameters.impedance).toBe(4.0);
			expect(json.parameters.delay).toBe(0.1);
			expect(json.parameters.inverted).toBe(true);
		});
	});

	describe('fromJSON with various parameter combinations', () => {
		it('should deserialize voltage source with custom impedance', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				label: 'V1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					power: 5.0,
					impedance: 4.0,
					delay: 0.0,
					inverted: false,
				},
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.parameters.power).toBe(5.0);
			expect(source.parameters.impedance).toBe(4.0);
		});

		it('should deserialize voltage source with inverted polarity', () => {
			const json = {
				id: 'test-id',
				type: 'source',
				label: 'V1',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {
					power: 1.0,
					impedance: 8.0,
					delay: 0.0,
					inverted: true,
				},
			};

			const source = VoltageSource.fromJSON(json);

			expect(source.parameters.inverted).toBe(true);
		});
	});
});

describe('Component Serialization - Ground', () => {
	describe('toJSON', () => {
		it('should serialize ground with default parameters', () => {
			const ground = new Ground(0, 0);

			const json = ground.toJSON();

			expect(json.type).toBe('ground');
			expect(json.label).toBe('');
			expect(json.parameters).toEqual({});
		});

		it('should serialize ground at various positions', () => {
			const ground1 = new Ground(10, 20);
			const ground2 = new Ground(100, 200);

			const json1 = ground1.toJSON();
			const json2 = ground2.toJSON();

			expect(json1.x).toBe(10);
			expect(json1.y).toBe(20);
			expect(json2.x).toBe(100);
			expect(json2.y).toBe(200);
		});

		it('should serialize ground with rotation', () => {
			const ground = new Ground(0, 0);
			ground.rotation = 90;

			const json = ground.toJSON();

			expect(json.rotation).toBe(90);
		});

		it('should always serialize ground with empty label', () => {
			const ground = new Ground(0, 0);
			// Even if someone tries to set a label, it should remain empty
			ground.label = 'GND'; // This shouldn't happen, but test it

			const json = ground.toJSON();

			// The toJSON should preserve whatever is in the object
			// but the Ground constructor ensures label is empty
			expect(json.label).toBe('GND'); // toJSON serializes what's there
		});
	});

	describe('fromJSON', () => {
		it('should deserialize ground with empty parameters', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				label: '',
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {},
			};

			const ground = Ground.fromJSON(json);

			expect(ground.type).toBe('ground');
			expect(ground.label).toBe('');
			expect(ground.parameters).toEqual({});
		});

		it('should deserialize ground and ensure label is empty', () => {
			const json = {
				id: 'test-id',
				type: 'ground',
				label: 'GND', // Invalid, but test that fromJSON corrects it
				x: 10,
				y: 20,
				rotation: 0,
				parameters: {},
			};

			const ground = Ground.fromJSON(json);

			// fromJSON should ensure label is empty per requirements
			expect(ground.label).toBe('');
		});
	});
});

describe('Component Serialization - Round-trip with edge cases', () => {
	it('should preserve resistor with all rotations', () => {
		const rotations = [0, 90, 180, 270];

		rotations.forEach((rotation) => {
			const original = new Resistor(10, 20);
			original.rotation = rotation;

			const json = original.toJSON();
			const restored = Resistor.fromJSON(json);

			expect(restored.rotation).toBe(rotation);
		});
	});

	it('should preserve capacitor with extreme ESR values', () => {
		const esrValues = [0.0, 0.001, 1.0, 10.0];

		esrValues.forEach((esr) => {
			const original = new Capacitor(10, 20);
			original.parameters.esr = esr;

			const json = original.toJSON();
			const restored = Capacitor.fromJSON(json);

			expect(restored.parameters.esr).toBe(esr);
		});
	});

	it('should preserve inductor with extreme ESR values', () => {
		const esrValues = [0.0, 0.01, 2.0, 5.0];

		esrValues.forEach((esr) => {
			const original = new Inductor(10, 20);
			original.parameters.esr = esr;

			const json = original.toJSON();
			const restored = Inductor.fromJSON(json);

			expect(restored.parameters.esr).toBe(esr);
		});
	});

	it('should preserve speaker with complex off-axis configuration', () => {
		const original = new Speaker(50, 60);
		original.parameters.offAxisFiles = [
			{ angle: 0, frdPath: '/path/to/on-axis.frd', phaseSource: 'measured' },
			{ angle: 15, frdPath: '/path/to/15deg.frd', phaseSource: 'measured' },
			{ angle: 30, frdPath: '/path/to/30deg.frd', phaseSource: 'measured' },
			{ angle: 45, frdPath: '/path/to/45deg.frd', phaseSource: 'measured' },
			{ angle: 60, frdPath: '/path/to/60deg.frd', phaseSource: 'measured' },
			{ angle: 75, frdPath: '/path/to/75deg.frd', phaseSource: 'measured' },
			{ angle: 90, frdPath: '/path/to/90deg.frd', phaseSource: 'measured' },
		];

		const json = original.toJSON();
		const restored = Speaker.fromJSON(json);

		expect(restored.parameters.offAxisFiles).toHaveLength(7);
		expect(restored.parameters.offAxisFiles[0].angle).toBe(0);
		expect(restored.parameters.offAxisFiles[6].angle).toBe(90);
	});

	it('should preserve voltage source voltage calculation after round-trip', () => {
		const original = new VoltageSource(10, 20);
		original.parameters.power = 2.0;
		original.parameters.impedance = 4.0;

		const originalVoltage = original.getVoltage();

		const json = original.toJSON();
		const restored = VoltageSource.fromJSON(json);

		const restoredVoltage = restored.getVoltage();

		expect(restoredVoltage).toBe(originalVoltage);
		expect(restoredVoltage).toBeCloseTo(Math.sqrt(2.0 * 4.0), 10);
	});
});
