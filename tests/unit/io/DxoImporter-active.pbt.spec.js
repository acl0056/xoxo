import fc from 'fast-check';
import { DxoImporter } from '../../../src/io/DxoImporter';

// ============================================================================
// Helper: Generate minimal DXO content with active blocks for property tests
// ============================================================================

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
		lines.push('  10 //number of BiQuad sections');

		// Always write exactly 10 biquad sections
		const biquads = block.biquads || [];
		for (let i = 0; i < 10; i++) {
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
// Generators
// ============================================================================

function biquadGenerator() {
	return fc.record({
		unbypassed: fc.boolean(),
		frequency: fc.double({ min: 20, max: 20000, noNaN: true, noDefaultInfinity: true }),
		q: fc.double({ min: 0.1, max: 20, noNaN: true, noDefaultInfinity: true }),
		gain: fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }),
		type: fc.integer({ min: 0, max: 7 }),
	});
}

function peqBlockGenerator() {
	return fc.record({
		type: fc.constant(0),
		x: fc.integer({ min: 10, max: 200 }),
		y: fc.integer({ min: 10, max: 200 }),
		scalarGain: fc.constant(1),
		turnFrequency: fc.double({ min: 20, max: 20000, noNaN: true, noDefaultInfinity: true }),
		adjustableDelay: fc.constant(0),
		dspRate: fc.constantFrom(44100, 48000, 96000),
		biquads: fc.array(biquadGenerator(), { minLength: 10, maxLength: 10 }),
	});
}

function opampBlockGenerator() {
	return fc.record({
		type: fc.constant(1),
		x: fc.integer({ min: 10, max: 200 }),
		y: fc.integer({ min: 10, max: 200 }),
		scalarGain: fc.double({ min: 1, max: 1000000, noNaN: true, noDefaultInfinity: true }),
		turnFrequency: fc.double({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true }),
		adjustableDelay: fc.constant(0),
		dspRate: fc.constant(48000),
		biquads: fc.constant(Array(10).fill({
			unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
		})),
	});
}

function filterBlockGenerator() {
	return fc.record({
		type: fc.constant(2),
		x: fc.integer({ min: 10, max: 200 }),
		y: fc.integer({ min: 10, max: 200 }),
		scalarGain: fc.constant(1),
		turnFrequency: fc.double({ min: 20, max: 20000, noNaN: true, noDefaultInfinity: true }),
		filterShape: fc.integer({ min: 0, max: 2 }),
		filterType: fc.integer({ min: 0, max: 2 }),
		filterOrder: fc.integer({ min: 1, max: 8 }),
		adjustableDelay: fc.constant(0),
		dspRate: fc.constant(48000),
		biquads: fc.constant(Array(10).fill({
			unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
		})),
	});
}

function validBlockGenerator() {
	return fc.oneof(peqBlockGenerator(), opampBlockGenerator(), filterBlockGenerator());
}

// ============================================================================
// Property-Based Tests (Tasks 2.3 - 2.10)
// ============================================================================

describe('DxoImporter Active Block Property-Based Tests', () => {
	describe('Feature: dxo-active-component-import, Property 1: Active block type code determines component type', () => {
		/**
		 * Validates: Requirements 2.1, 3.1, 4.1
		 *
		 * For any active block with a valid type code (0, 1, or 2), the importer
		 * SHALL create a component whose internal type matches the mapping:
		 * 0→"peq", 1→"opamp", 2→"filter".
		 */
		it('should create the correct component type for any valid type code', () => {
			const typeMapping = { 0: 'peq', 1: 'opamp', 2: 'filter' };

			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 2 }),
					fc.integer({ min: 10, max: 200 }),
					fc.integer({ min: 10, max: 200 }),
					(typeCode, x, y) => {
						const block = {
							type: typeCode,
							x,
							y,
							scalarGain: typeCode === 1 ? 1000 : 1,
							turnFrequency: 1000,
							filterShape: 0,
							filterType: 0,
							filterOrder: 2,
							adjustableDelay: 0,
							dspRate: 48000,
							biquads: Array(10).fill({
								unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
							}),
						};

						const content = generateMinimalDxoWithActiveBlocks([block]);
						const circuit = DxoImporter.importFromContent(content, 'test.dxo');

						const activeComponents = circuit.components.filter(
							(c) => c.type === 'peq' || c.type === 'opamp' || c.type === 'filter',
						);
						expect(activeComponents).toHaveLength(1);
						expect(activeComponents[0].type).toBe(typeMapping[typeCode]);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 2: PEQ biquad bypass filtering', () => {
		/**
		 * Validates: Requirements 2.2
		 *
		 * For any active block of type PEQ with an arbitrary combination of bypassed
		 * and unbypassed biquad sections, the created PEQ component SHALL contain
		 * exactly the sections marked unbypassed.
		 */
		it('should include only unbypassed biquad sections in the PEQ', () => {
			fc.assert(
				fc.property(peqBlockGenerator(), (block) => {
					const content = generateMinimalDxoWithActiveBlocks([block]);
					const circuit = DxoImporter.importFromContent(content, 'test.dxo');

					const peq = circuit.components.find((c) => c.type === 'peq');
					expect(peq).toBeDefined();

					const expectedCount = block.biquads.filter((bq) => bq.unbypassed).length;
					expect(peq.parameters.sections).toHaveLength(expectedCount);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 3: PEQ biquad parameters are preserved', () => {
		/**
		 * Validates: Requirements 2.3, 2.4, 2.5, 8.1
		 *
		 * For any unbypassed biquad section in a PEQ active block, the created PEQ
		 * section SHALL have the same frequency, Q, gain, and correctly mapped filter
		 * type string as the source DXO values.
		 */
		it('should preserve frequency, Q, gain, and type for each unbypassed section', () => {
			const biquadTypeMap = {
				0: 'peaking',
				1: 'lowShelf',
				2: 'highShelf',
				3: 'lowPass1',
				4: 'highPass1',
				5: 'lowPass2',
				6: 'highPass2',
				7: 'allPass',
			};

			fc.assert(
				fc.property(peqBlockGenerator(), (block) => {
					const content = generateMinimalDxoWithActiveBlocks([block]);
					const circuit = DxoImporter.importFromContent(content, 'test.dxo');

					const peq = circuit.components.find((c) => c.type === 'peq');
					const unbypassed = block.biquads.filter((bq) => bq.unbypassed);

					for (let i = 0; i < unbypassed.length; i++) {
						const source = unbypassed[i];
						const section = peq.parameters.sections[i];

						expect(section.frequency).toBeCloseTo(source.frequency, 5);
						expect(section.q).toBeCloseTo(source.q, 5);
						expect(section.gain).toBeCloseTo(source.gain, 5);
						expect(section.filterType).toBe(biquadTypeMap[source.type]);
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 4: OpAmp gain conversion', () => {
		/**
		 * Validates: Requirements 3.2, 3.3
		 *
		 * For any active block of type OpAmp with a positive scalar gain value,
		 * the created OpAmp component's dcGain SHALL equal 20 × log10(scalarGain),
		 * and its cornerFrequency SHALL equal the turn frequency field.
		 */
		it('should convert scalar gain to dB and set cornerFrequency from turnFrequency', () => {
			fc.assert(
				fc.property(opampBlockGenerator(), (block) => {
					const content = generateMinimalDxoWithActiveBlocks([block]);
					const circuit = DxoImporter.importFromContent(content, 'test.dxo');

					const opamp = circuit.components.find((c) => c.type === 'opamp');
					expect(opamp).toBeDefined();

					const expectedDcGain = 20 * Math.log10(block.scalarGain);
					expect(opamp.parameters.dcGain).toBeCloseTo(expectedDcGain, 5);
					expect(opamp.parameters.cornerFrequency).toBeCloseTo(block.turnFrequency, 5);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 5: Filter parameters are correctly mapped', () => {
		/**
		 * Validates: Requirements 4.2, 4.3, 4.4, 4.5, 8.2
		 *
		 * For any active block of type Filter with valid shape code (0–2), type code
		 * (0–2), and positive filter order, the created Filter component SHALL have
		 * the correctly mapped filterShape string, filterType string, filterOrder,
		 * and turnFrequency matching the source DXO values.
		 */
		it('should correctly map filter shape, type, order, and frequency', () => {
			const shapeMap = { 0: 'butterworth', 1: 'linkwitzRiley', 2: 'bessel' };
			const typeMap = { 0: 'lowPass', 1: 'highPass', 2: 'bandpass' };

			fc.assert(
				fc.property(filterBlockGenerator(), (block) => {
					const content = generateMinimalDxoWithActiveBlocks([block]);
					const circuit = DxoImporter.importFromContent(content, 'test.dxo');

					const filter = circuit.components.find((c) => c.type === 'filter');
					expect(filter).toBeDefined();

					expect(filter.parameters.filterShape).toBe(shapeMap[block.filterShape]);
					expect(filter.parameters.filterType).toBe(typeMap[block.filterType]);
					expect(filter.parameters.filterOrder).toBe(block.filterOrder);
					expect(filter.parameters.turnFrequency).toBeCloseTo(block.turnFrequency, 5);
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 6: Active component terminal positions', () => {
		/**
		 * Validates: Requirements 5.1, 5.3, 6.1, 6.2
		 *
		 * For any active component (PEQ, Filter, or OpAmp) placed at grid position
		 * (x, y), the calculated terminal positions SHALL be exactly:
		 * (x-2, y-2), (x-2, y+2), (x+2, y-2), (x+2, y+2).
		 */
		it('should calculate terminal positions at ±2 offsets from component center', () => {
			fc.assert(
				fc.property(validBlockGenerator(), (block) => {
					const content = generateMinimalDxoWithActiveBlocks([block]);
					const circuit = DxoImporter.importFromContent(content, 'test.dxo');

					const activeComponent = circuit.components.find(
						(c) => c.type === 'peq' || c.type === 'opamp' || c.type === 'filter',
					);
					expect(activeComponent).toBeDefined();

					// The component's terminals are relative offsets
					expect(activeComponent.terminals).toHaveLength(4);
					expect(activeComponent.terminals[0]).toEqual({ x: -3, y: -2 });
					expect(activeComponent.terminals[1]).toEqual({ x: -3, y: 2 });
					expect(activeComponent.terminals[2]).toEqual({ x: 4, y: -2 });
					expect(activeComponent.terminals[3]).toEqual({ x: 4, y: 2 });
				}),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 7: Sequential shared "A" labeling', () => {
		/**
		 * Validates: Requirements 7.1, 7.2, 7.3
		 *
		 * For any sequence of N active blocks (regardless of type), the created
		 * components SHALL receive labels A0, A1, ..., A(N-1) in the order they
		 * appear in the file, sharing a single counter across all component types.
		 */
		it('should assign sequential A-labels across mixed block types', () => {
			fc.assert(
				fc.property(
					fc.array(validBlockGenerator(), { minLength: 1, maxLength: 5 }),
					(blocks) => {
						const content = generateMinimalDxoWithActiveBlocks(blocks);
						const circuit = DxoImporter.importFromContent(content, 'test.dxo');

						const activeComponents = circuit.components.filter(
							(c) => c.type === 'peq' || c.type === 'opamp' || c.type === 'filter',
						);

						expect(activeComponents).toHaveLength(blocks.length);

						for (let i = 0; i < activeComponents.length; i++) {
							expect(activeComponents[i].label).toBe(`A${i}`);
						}
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	describe('Feature: dxo-active-component-import, Property 8: Unknown type blocks don\'t interrupt subsequent parsing', () => {
		/**
		 * Validates: Requirements 9.1, 9.3
		 *
		 * For any sequence of active blocks where one or more blocks have an unknown
		 * type code (not 0, 1, or 2), all subsequent blocks with valid type codes
		 * SHALL still be parsed and create the correct components.
		 */
		it('should parse valid blocks after unknown type blocks', () => {
			const unknownBlockGenerator = fc.record({
				type: fc.integer({ min: 3, max: 99 }),
				x: fc.integer({ min: 10, max: 200 }),
				y: fc.integer({ min: 10, max: 200 }),
				scalarGain: fc.constant(1),
				turnFrequency: fc.constant(1000),
				filterShape: fc.constant(0),
				filterType: fc.constant(0),
				filterOrder: fc.constant(1),
				adjustableDelay: fc.constant(0),
				dspRate: fc.constant(48000),
				biquads: fc.constant(Array(10).fill({
					unbypassed: false, frequency: 1000, q: 1, gain: 0, type: 5,
				})),
			});

			fc.assert(
				fc.property(
					unknownBlockGenerator,
					validBlockGenerator(),
					(unknownBlock, validBlock) => {
						const blocks = [unknownBlock, validBlock];
						const content = generateMinimalDxoWithActiveBlocks(blocks);
						const circuit = DxoImporter.importFromContent(content, 'test.dxo');

						const typeMapping = { 0: 'peq', 1: 'opamp', 2: 'filter' };
						const expectedType = typeMapping[validBlock.type];

						const activeComponents = circuit.components.filter(
							(c) => c.type === 'peq' || c.type === 'opamp' || c.type === 'filter',
						);

						expect(activeComponents).toHaveLength(1);
						expect(activeComponents[0].type).toBe(expectedType);
						// Label should be A1 since the unknown block at index 0 was skipped
						expect(activeComponents[0].label).toBe('A1');
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
