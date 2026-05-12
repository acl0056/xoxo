import fc from 'fast-check';
import { DxoImporter } from '../../../src/io/DxoImporter';
import { Circuit } from '../../../src/models/Circuit';

// ============================================================================
// Helper: Generate minimal DXO content with active blocks for property tests
// ============================================================================

/**
 * Generate a minimal valid DXO file string containing the given active blocks.
 * The file has a voltage source, 0 subckts, 0 passives, 0 grounds, 0 wires,
 * 0 texts, 0 drivers, setup, baffle, then the active blocks section.
 */
function generateMinimalDxoWithActiveBlocks(activeBlocks) {
	const lines = [];

	// Voltage source section
	lines.push('1 //VoltageSource');
	lines.push('7 //Lines');
	lines.push('  2.83 //Vrms');
	lines.push('  F //Inverted');
	lines.push('  10 //position X');
	lines.push('  10 //position Y');
	lines.push('  0 //overall delay');
	lines.push('  1 //Power');
	lines.push('  8 //Ohms for Power level');

	// Subckts
	lines.push('0 //Subckts');
	lines.push('27 //Lines Per Subckt');

	// Passives
	lines.push('0 //Passives');
	lines.push('20 //Lines Per Passive');

	// Grounds
	lines.push('0 //Grounds');
	lines.push('3 //Lines Per Ground');

	// Wires
	lines.push('0 //Wires');
	lines.push('5 //Lines Per Wire');

	// Texts
	lines.push('0 //Texts');
	lines.push('6 //Lines Per Text');

	// Drivers
	lines.push('0 //drivers');
	lines.push('39 //Lines Per driver');

	// Setup
	lines.push('1 //Setup');
	lines.push('0 //Lines for Setup');

	// Baffle
	lines.push('0 //Baffle');
	lines.push('28 //Lines for each Baffle');

	// Active blocks
	lines.push(`${activeBlocks.length} //# of Active blocks`);
	lines.push('68 //Lines Per Active block');

	for (const block of activeBlocks) {
		lines.push(`  ${block.type} //Active block Type`);
		lines.push(`  ${block.x} //position X`);
		lines.push(`  ${block.y} //position Y`);
		lines.push('  F //Inverted?');
		lines.push('  1000000000 //Input R');
		lines.push('  0.001 //Output R');
		lines.push(`  ${block.scalarGain} //scalar gain`);
		lines.push(`  ${block.turnFrequency} //turn frequency`);
		lines.push('  100 //bandpass bandwidth');
		lines.push('  0 //chebychev error');
		lines.push(`  ${block.filterShape !== undefined ? block.filterShape : 0} //Filter Shape`);
		lines.push(`  ${block.filterType !== undefined ? block.filterType : 0} //Filter Type`);
		lines.push(`  ${block.filterOrder !== undefined ? block.filterOrder : 1} //FilterOrder`);
		lines.push(`  ${block.adjustableDelay !== undefined ? block.adjustableDelay : 0} //Adjustable Delay`);
		lines.push('  0 //Inherent Delay');
		lines.push('  0 //DSP model');
		lines.push(`  ${block.dspRate || 48000} //DSP sample rate`);
		lines.push(`  ${block.biquads ? block.biquads.length : 10} //number of BiQuad sections`);

		// Biquad sections
		const biquads = block.biquads || [];
		for (let i = 0; i < (block.biquads ? block.biquads.length : 10); i++) {
			const bq = biquads[i] || {
				unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
			};
			lines.push(`  ${bq.unbypassed ? 'T' : 'F'} //BQ${i + 1} UnBypassed`);
			lines.push(`  ${bq.frequency} //BQ${i + 1} Freq`);
			lines.push(`  ${bq.q} //BQ${i + 1} Q`);
			lines.push(`  ${bq.gain} //BQ${i + 1} Gain`);
			lines.push(`  ${bq.type} ///BQ${i + 1} BiQuad type`);
		}
	}

	return lines.join('\n');
}

// ============================================================================
// Unit Tests (Task 2.2)
// ============================================================================

describe('DxoImporter - Active Block Parsing', () => {
	describe('PEQ import from orbs-peq.dxo', () => {
		it('should create a PEQ with correct biquad sections (only unbypassed ones)', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq).toBeDefined();

			// Only BQ1 and BQ5 are unbypassed (T)
			expect(peq.parameters.sections).toHaveLength(2);

			// BQ1: peaking at 529.73 Hz, Q=1.9, gain=5
			expect(peq.parameters.sections[0].filterType).toBe('peaking');
			expect(peq.parameters.sections[0].frequency).toBeCloseTo(529.731547179622, 5);
			expect(peq.parameters.sections[0].q).toBeCloseTo(1.9, 5);
			expect(peq.parameters.sections[0].gain).toBeCloseTo(5, 1);

			// BQ5: lowShelf at 20000 Hz, Q=1, gain=-3
			expect(peq.parameters.sections[1].filterType).toBe('lowShelf');
			expect(peq.parameters.sections[1].frequency).toBeCloseTo(20000, 5);
			expect(peq.parameters.sections[1].q).toBeCloseTo(1, 5);
			expect(peq.parameters.sections[1].gain).toBeCloseTo(-3, 5);
		});

		it('should set PEQ label to A0', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq.label).toBe('A0');
		});

		it('should set PEQ dspRate to 48000', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq.parameters.dspRate).toBe(48000);
		});
	});

	describe('OpAmp import from orbs-opamp.dxo', () => {
		it('should create an OpAmp with dcGain ≈ 100 dB and cornerFrequency = 50', () => {
			const filePath = 'tests/fixtures/projects/opamp/orbs-opamp.dxo';
			const circuit = DxoImporter.import(filePath);

			const opamp = circuit.components.find((c) => c.type === 'opamp');
			expect(opamp).toBeDefined();

			// 20 * log10(100000) = 100 dB
			expect(opamp.parameters.dcGain).toBeCloseTo(100, 1);
			expect(opamp.parameters.cornerFrequency).toBe(50);
		});

		it('should set OpAmp label to A0', () => {
			const filePath = 'tests/fixtures/projects/opamp/orbs-opamp.dxo';
			const circuit = DxoImporter.import(filePath);

			const opamp = circuit.components.find((c) => c.type === 'opamp');
			expect(opamp.label).toBe('A0');
		});
	});

	describe('Filter import from orbs-filter.dxo', () => {
		it('should create a Filter with shape=butterworth, type=bandpass, order=1, freq=4000', () => {
			const filePath = 'tests/fixtures/projects/filter/orbs-filter.dxo';
			const circuit = DxoImporter.import(filePath);

			const filter = circuit.components.find((c) => c.type === 'filter');
			expect(filter).toBeDefined();

			expect(filter.parameters.filterShape).toBe('butterworth');
			expect(filter.parameters.filterType).toBe('bandpass');
			expect(filter.parameters.filterOrder).toBe(1);
			expect(filter.parameters.turnFrequency).toBe(4000);
		});

		it('should set Filter label to A0', () => {
			const filePath = 'tests/fixtures/projects/filter/orbs-filter.dxo';
			const circuit = DxoImporter.import(filePath);

			const filter = circuit.components.find((c) => c.type === 'filter');
			expect(filter.label).toBe('A0');
		});
	});

	describe('Terminal positions for active components', () => {
		it('should calculate terminal positions at ±2 offsets for PEQ', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const peq = circuit.components.find((c) => c.type === 'peq');
			// The PEQ is at position (127, 64) in the DXO file
			// After translateToOrigin, positions shift. Check relative terminal offsets.
			const terminalPositions = peq.terminals;
			expect(terminalPositions).toHaveLength(4);
			expect(terminalPositions[0]).toEqual({ x: -3, y: -2 });
			expect(terminalPositions[1]).toEqual({ x: -3, y: 2 });
			expect(terminalPositions[2]).toEqual({ x: 4, y: -2 });
			expect(terminalPositions[3]).toEqual({ x: 4, y: 2 });
		});
	});

	describe('Existing components still import correctly alongside active blocks', () => {
		it('should still parse passives and speakers from peq fixture', () => {
			const filePath = 'tests/fixtures/projects/peq/orbs-peq.dxo';
			const circuit = DxoImporter.import(filePath);

			const resistors = circuit.components.filter((c) => c.type === 'resistor');
			const inductors = circuit.components.filter((c) => c.type === 'inductor');
			const speakers = circuit.components.filter((c) => c.type === 'speaker');

			expect(resistors.length).toBeGreaterThan(0);
			expect(inductors.length).toBeGreaterThan(0);
			expect(speakers.length).toBeGreaterThan(0);
		});
	});

	describe('Edge cases', () => {
		it('should handle zero active blocks without creating components', () => {
			const content = generateMinimalDxoWithActiveBlocks([]);
			const circuit = DxoImporter.importFromContent(content, 'test.dxo');

			const activeComponents = circuit.components.filter(
				(c) => c.type === 'peq' || c.type === 'opamp' || c.type === 'filter',
			);
			expect(activeComponents).toHaveLength(0);
		});

		it('should throw on malformed header (non-integer count)', () => {
			// Build a DXO where the active block count is not a number
			const lines = [];
			lines.push('1 //VoltageSource');
			lines.push('7 //Lines');
			lines.push('  2.83 //Vrms');
			lines.push('  F //Inverted');
			lines.push('  10 //position X');
			lines.push('  10 //position Y');
			lines.push('  0 //overall delay');
			lines.push('  1 //Power');
			lines.push('  8 //Ohms');
			lines.push('0 //Subckts');
			lines.push('27 //Lines Per Subckt');
			lines.push('0 //Passives');
			lines.push('20 //Lines Per Passive');
			lines.push('0 //Grounds');
			lines.push('3 //Lines Per Ground');
			lines.push('0 //Wires');
			lines.push('5 //Lines Per Wire');
			lines.push('0 //Texts');
			lines.push('6 //Lines Per Text');
			lines.push('0 //drivers');
			lines.push('39 //Lines Per driver');
			lines.push('1 //Setup');
			lines.push('0 //Lines for Setup');
			lines.push('0 //Baffle');
			lines.push('28 //Lines for each Baffle');
			lines.push('abc //# of Active blocks');
			lines.push('68 //Lines Per Active block');

			const content = lines.join('\n');
			expect(() => DxoImporter.importFromContent(content, 'test.dxo')).toThrow(/Invalid active block count/);
		});

		it('should skip unknown block types and still parse subsequent valid blocks', () => {
			const content = generateMinimalDxoWithActiveBlocks([
				{
					type: 99, x: 50, y: 50, scalarGain: 1, turnFrequency: 1000,
					biquads: Array(10).fill({
						unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
					}),
				},
				{
					type: 0, x: 60, y: 60, scalarGain: 1, turnFrequency: 1000,
					biquads: [
						{
							unbypassed: true, frequency: 500, q: 1.5, gain: 3, type: 0,
						},
						...Array(9).fill({
							unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
						}),
					],
				},
			]);

			const circuit = DxoImporter.importFromContent(content, 'test.dxo');
			const peqs = circuit.components.filter((c) => c.type === 'peq');
			expect(peqs).toHaveLength(1);
			expect(peqs[0].label).toBe('A1');
		});

		it('should clamp negative delay to 0 and emit warning', () => {
			const content = generateMinimalDxoWithActiveBlocks([
				{
					type: 0, x: 50, y: 50, scalarGain: 1, turnFrequency: 1000,
					adjustableDelay: -0.5,
					biquads: [
						{
							unbypassed: true, frequency: 500, q: 1, gain: 0, type: 0,
						},
						...Array(9).fill({
							unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
						}),
					],
				},
			]);

			const circuit = DxoImporter.importFromContent(content, 'test.dxo');
			const peq = circuit.components.find((c) => c.type === 'peq');
			expect(peq.parameters.delay).toBe(0);
		});
	});
});
