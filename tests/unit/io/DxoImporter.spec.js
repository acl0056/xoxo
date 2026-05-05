import { DxoImporter } from '../../../src/io/DxoImporter';
import { Circuit } from '../../../src/models/Circuit';

describe('DxoImporter', () => {
	describe('import()', () => {
		it('should import center 2-way crossover', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			expect(circuit).toBeInstanceOf(Circuit);
			expect(circuit.components.length).toBeGreaterThan(0);
		});

		it('should import tonic 2-way crossover', () => {
			const filePath = 'tests/fixtures/projects/tonic/tonic xo 0_1_1.dxo';
			const circuit = DxoImporter.import(filePath);

			expect(circuit).toBeInstanceOf(Circuit);
			expect(circuit.components.length).toBeGreaterThan(0);
		});

		it('should import vivace 3-way crossover', () => {
			const filePath = 'tests/fixtures/projects/vivace/vivace 1_0_3.dxo';
			const circuit = DxoImporter.import(filePath);

			expect(circuit).toBeInstanceOf(Circuit);
			expect(circuit.components.length).toBeGreaterThan(0);
		});

		it('should parse voltage source from center project', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const voltageSource = circuit.components.find((c) => c.type === 'source');
			expect(voltageSource).toBeDefined();
			expect(voltageSource.parameters.power).toBe(1);
			expect(voltageSource.parameters.impedance).toBe(8);
		});

		it('should parse passive components from center project', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const resistors = circuit.components.filter((c) => c.type === 'resistor');
			const capacitors = circuit.components.filter((c) => c.type === 'capacitor');
			const inductors = circuit.components.filter((c) => c.type === 'inductor');

			expect(resistors.length).toBeGreaterThan(0);
			expect(capacitors.length).toBeGreaterThan(0);
			expect(inductors.length).toBeGreaterThan(0);
		});

		it('should assign correct labels to passive components', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const resistors = circuit.components.filter((c) => c.type === 'resistor');
			const capacitors = circuit.components.filter((c) => c.type === 'capacitor');
			const inductors = circuit.components.filter((c) => c.type === 'inductor');

			// Check that labels follow R#, C#, L# pattern
			resistors.forEach((r) => {
				expect(r.label).toMatch(/^R\d+$/);
			});
			capacitors.forEach((c) => {
				expect(c.label).toMatch(/^C\d+$/);
			});
			inductors.forEach((l) => {
				expect(l.label).toMatch(/^L\d+$/);
			});
		});

		it('should parse component values correctly', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const resistors = circuit.components.filter((c) => c.type === 'resistor');
			const capacitors = circuit.components.filter((c) => c.type === 'capacitor');
			const inductors = circuit.components.filter((c) => c.type === 'inductor');

			// All values should be positive numbers
			resistors.forEach((r) => {
				expect(r.parameters.resistance).toBeGreaterThan(0);
			});
			capacitors.forEach((c) => {
				expect(c.parameters.capacitance).toBeGreaterThan(0);
				expect(c.parameters.esr).toBeGreaterThanOrEqual(0);
			});
			inductors.forEach((l) => {
				expect(l.parameters.inductance).toBeGreaterThan(0);
				expect(l.parameters.esr).toBeGreaterThanOrEqual(0);
			});
		});

		it('should parse component states correctly', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const passiveComponents = circuit.components.filter(
				(c) => c.type === 'resistor' || c.type === 'capacitor' || c.type === 'inductor'
			);

			passiveComponents.forEach((component) => {
				expect(['normal', 'open', 'short']).toContain(component.parameters.state);
			});
		});

		it('should parse component orientations correctly', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const passiveComponents = circuit.components.filter(
				(c) => c.type === 'resistor' || c.type === 'capacitor' || c.type === 'inductor'
			);

			passiveComponents.forEach((component) => {
				expect([0, 90, 180, 270]).toContain(component.rotation);
			});
		});

		it('should parse ground nodes from center project', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const grounds = circuit.components.filter((c) => c.type === 'ground');
			expect(grounds.length).toBeGreaterThan(0);
		});

		it('should parse speakers from center project', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			expect(speakers.length).toBe(2); // Center is a 2-way
		});

		it('should assign correct labels to speakers', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			speakers.forEach((s) => {
				expect(s.label).toMatch(/^S\d+$/);
			});
		});

		it('should parse speaker parameters correctly', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			speakers.forEach((speaker) => {
				expect(speaker.parameters.sensitivity).toBeDefined();
				expect(speaker.parameters.delay).toBeDefined();
				expect(typeof speaker.parameters.inverted).toBe('boolean');
				expect(typeof speaker.parameters.muted).toBe('boolean');
				expect(['measured', 'derived']).toContain(speaker.parameters.frdPhaseSource);
				expect(['measured', 'derived']).toContain(speaker.parameters.zmaPhaseSource);
			});
		});

		it('should parse embedded FRD data for speakers', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			speakers.forEach((speaker) => {
				expect(speaker.frdData).toBeDefined();
				expect(speaker.frdData.frequencies).toBeInstanceOf(Array);
				expect(speaker.frdData.magnitudes).toBeInstanceOf(Array);
				expect(speaker.frdData.phases).toBeInstanceOf(Array);
				expect(speaker.frdData.frequencies.length).toBeGreaterThan(0);
				expect(speaker.frdData.frequencies.length).toBe(speaker.frdData.magnitudes.length);
				expect(speaker.frdData.frequencies.length).toBe(speaker.frdData.phases.length);
			});
		});

		it('should parse embedded ZMA data for speakers', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			speakers.forEach((speaker) => {
				expect(speaker.zmaData).toBeDefined();
				expect(speaker.zmaData.frequencies).toBeInstanceOf(Array);
				expect(speaker.zmaData.impedances).toBeInstanceOf(Array);
				expect(speaker.zmaData.phases).toBeInstanceOf(Array);
				expect(speaker.zmaData.frequencies.length).toBeGreaterThan(0);
				expect(speaker.zmaData.frequencies.length).toBe(speaker.zmaData.impedances.length);
				expect(speaker.zmaData.frequencies.length).toBe(speaker.zmaData.phases.length);
			});
		});

		it('should parse FRD data with correct frequency range', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			speakers.forEach((speaker) => {
				const { frequencies } = speaker.frdData;
				expect(frequencies[0]).toBeGreaterThan(0);
				expect(frequencies[frequencies.length - 1]).toBeGreaterThan(frequencies[0]);
			});
		});

		it('should parse ZMA data with correct frequency range', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			speakers.forEach((speaker) => {
				const { frequencies } = speaker.zmaData;
				expect(frequencies[0]).toBeGreaterThan(0);
				expect(frequencies[frequencies.length - 1]).toBeGreaterThan(frequencies[0]);
			});
		});

		it('should parse wires from center project', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			expect(circuit.wires.length).toBeGreaterThan(0);
		});

		it('should create valid wire connections', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			circuit.wires.forEach((wire) => {
				expect(wire.startNode).toBeDefined();
				expect(wire.endNode).toBeDefined();
				expect(wire.startNode.componentId).toBeDefined();
				expect(wire.endNode.componentId).toBeDefined();
				expect(typeof wire.startNode.terminal).toBe('number');
				expect(typeof wire.endNode.terminal).toBe('number');
			});
		});

		it('should parse vivace 3-way with 3 speakers', () => {
			const filePath = 'tests/fixtures/projects/vivace/vivace 1_0_3.dxo';
			const circuit = DxoImporter.import(filePath);

			const speakers = circuit.components.filter((c) => c.type === 'speaker');
			expect(speakers.length).toBeGreaterThanOrEqual(3); // Vivace has at least 3 speakers (may have more if file includes unused drivers)
		});

		it('should handle component positions correctly', () => {
			const filePath = 'tests/fixtures/projects/center/center 1_0_2.dxo';
			const circuit = DxoImporter.import(filePath);

			circuit.components.forEach((component) => {
				expect(typeof component.x).toBe('number');
				expect(typeof component.y).toBe('number');
			});
		});

		it('should throw error for non-existent file', () => {
			expect(() => {
				DxoImporter.import('tests/fixtures/projects/nonexistent.dxo');
			}).toThrow();
		});
	});
});
