// Feature: circuit-blocks-menu, Property 1: XSC parse/print round-trip
import fs from 'fs';
import path from 'path';
import fc from 'fast-check';
import { parseXsc } from '@/io/XscParser';
import { printXsc } from '@/io/XscPrinter';

/**
 * Generator for valid CircuitBlock objects matching circuit-block.schema.json.
 * Produces blocks with random titles, 0-6 non-empty variable slots,
 * 1-8 components with valid formulas, random wires/grounds/texts.
 */
function circuitBlockGenerator() {
	// Title: non-empty, no newlines, no // (to avoid comment parsing issues)
	const titleGenerator = fc.stringMatching(/^[A-Za-z0-9 _-]{1,40}$/);

	// Variable name: alphanumeric, non-empty
	const variableNameGenerator = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,9}$/);

	// Variable description: no newlines, no leading/trailing spaces (parser trims)
	// Start with non-space, allow spaces in middle, end with non-space
	const descriptionGenerator = fc.oneof(
		fc.constant(''),
		fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 [\]()]{0,28}[A-Za-z0-9]$/),
		fc.stringMatching(/^[A-Za-z0-9]$/),
	);

	// Variable slot generator (non-empty)
	const nonEmptyVariableGenerator = fc.record({
		name: variableNameGenerator,
		description: descriptionGenerator,
		defaultValue: fc.double({
			min: -1000,
			max: 1000,
			noNaN: true,
			noDefaultInfinity: true,
		}),
	});

	// Empty variable slot
	const emptyVariable = { name: '', description: '', defaultValue: 0 };

	// Generate exactly 6 variable slots with 0-6 non-empty ones
	const variablesGenerator = fc.integer({ min: 0, max: 6 }).chain((nonEmptyCount) => {
		if (nonEmptyCount === 0) {
			return fc.constant(Array(6).fill(emptyVariable));
		}
		return fc.array(nonEmptyVariableGenerator, {
			minLength: nonEmptyCount,
			maxLength: nonEmptyCount,
		}).map((nonEmptyVars) => {
			const slots = Array(6).fill(emptyVariable);
			for (let i = 0; i < nonEmptyVars.length; i++) {
				slots[i] = nonEmptyVars[i];
			}
			return slots;
		});
	});

	// Simple valid formula strings
	const formulaGenerator = fc.constantFrom(
		'R*2',
		'freq/Q',
		'R/(2*pi*freq)',
		'Q/(2*pi*freq*R)',
		'R*1',
		'1/(6.28*f*8*Q)',
		'Z*TC',
		'R/(2*pi*freq*Q)',
	);

	// Grid position generator
	const gridPositionGenerator = fc.record({
		x: fc.integer({ min: -50, max: 50 }),
		y: fc.integer({ min: -50, max: 50 }),
	});

	// Component generator
	const componentGenerator = fc.record({
		partType: fc.constantFrom(0, 1, 2),
		defaultValue: fc.double({
			min: 0,
			max: 1000,
			noNaN: true,
			noDefaultInfinity: true,
		}),
		esr: fc.double({
			min: 0,
			max: 100,
			noNaN: true,
			noDefaultInfinity: true,
		}),
		rating: fc.double({
			min: 0,
			max: 1000,
			noNaN: true,
			noDefaultInfinity: true,
		}),
		position: gridPositionGenerator,
		isHorizontal: fc.boolean(),
		stepMode: fc.integer({ min: 0, max: 5 }),
		bypassMode: fc.constantFrom(0, 1, 2),
		formula: formulaGenerator,
		formulaScale: fc.constantFrom(1, 0.001, 1000, 0.000001),
	});

	// Wire generator
	const wireGenerator = fc.record({
		start: gridPositionGenerator,
		end: gridPositionGenerator,
	});

	// Ground generator
	const groundGenerator = gridPositionGenerator;

	// Text label: no newlines, non-empty, no trailing whitespace (parser uses trimEnd)
	const labelGenerator = fc.stringMatching(/^[A-Za-z0-9_-][A-Za-z0-9 _-]{0,29}$/)
		.map((s) => s.trimEnd())
		.filter((s) => s.length > 0);

	// Text generator
	const textGenerator = fc.record({
		label: labelGenerator,
		position: gridPositionGenerator,
		size: fc.integer({ min: 6, max: 24 }),
		color: fc.integer({ min: 0, max: 16777215 }),
	});

	return fc.record({
		title: titleGenerator,
		variables: variablesGenerator,
		components: fc.array(componentGenerator, { minLength: 1, maxLength: 8 }),
		grounds: fc.array(groundGenerator, { minLength: 0, maxLength: 3 }),
		wires: fc.array(wireGenerator, { minLength: 0, maxLength: 5 }),
		texts: fc.array(textGenerator, { minLength: 0, maxLength: 4 }),
	});
}

/**
 * Compare two CircuitBlock objects for structural equivalence after round-trip.
 * Accounts for the parser returning formulaScale as a string.
 */
function assertBlocksEquivalent(original, parsed) {
	// Title
	expect(parsed.title).toBe(original.title);

	// Variables (6 slots)
	expect(parsed.variables).toHaveLength(6);
	for (let i = 0; i < 6; i++) {
		expect(parsed.variables[i].name).toBe(original.variables[i].name);
		expect(parsed.variables[i].description).toBe(original.variables[i].description);
		expect(parsed.variables[i].defaultValue).toBeCloseTo(
			original.variables[i].defaultValue,
			10,
		);
	}

	// Components
	expect(parsed.components).toHaveLength(original.components.length);
	for (let i = 0; i < original.components.length; i++) {
		const orig = original.components[i];
		const comp = parsed.components[i];

		expect(comp.partType).toBe(orig.partType);
		expect(comp.defaultValue).toBeCloseTo(orig.defaultValue, 10);
		expect(comp.esr).toBeCloseTo(orig.esr, 10);
		expect(comp.rating).toBeCloseTo(orig.rating, 10);
		expect(comp.position).toEqual(orig.position);
		expect(comp.isHorizontal).toBe(orig.isHorizontal);
		expect(comp.stepMode).toBe(orig.stepMode);
		expect(comp.bypassMode).toBe(orig.bypassMode);
		expect(comp.formula).toBe(orig.formula);
		// formulaScale: parser returns string, compare numeric values
		expect(parseFloat(comp.formulaScale)).toBeCloseTo(orig.formulaScale, 10);
	}

	// Grounds
	expect(parsed.grounds).toHaveLength(original.grounds.length);
	for (let i = 0; i < original.grounds.length; i++) {
		expect(parsed.grounds[i]).toEqual(original.grounds[i]);
	}

	// Wires
	expect(parsed.wires).toHaveLength(original.wires.length);
	for (let i = 0; i < original.wires.length; i++) {
		expect(parsed.wires[i]).toEqual(original.wires[i]);
	}

	// Texts
	expect(parsed.texts).toHaveLength(original.texts.length);
	for (let i = 0; i < original.texts.length; i++) {
		expect(parsed.texts[i].label).toBe(original.texts[i].label);
		expect(parsed.texts[i].position).toEqual(original.texts[i].position);
		expect(parsed.texts[i].size).toBe(original.texts[i].size);
		expect(parsed.texts[i].color).toBe(original.texts[i].color);
	}
}

describe('XSC Parser/Printer Property-Based Tests', () => {
	describe('Feature: circuit-blocks-menu, Property 1: XSC parse/print round-trip', () => {
		/**
		 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8
		 *
		 * For any valid CircuitBlock object, printing it to XSC format and then
		 * parsing the result SHALL produce a structurally equivalent CircuitBlock object.
		 */
		it('should round-trip any valid CircuitBlock through print then parse', () => {
			fc.assert(
				fc.property(circuitBlockGenerator(), (block) => {
					const printed = printXsc(block);
					const result = parseXsc(printed);

					expect(result.success).toBe(true);
					expect(result.block).toBeDefined();

					assertBlocksEquivalent(block, result.block);
				}),
				{ numRuns: 100 },
			);
		});
	});
});

/**
 * Validates: Requirements 2.1, 2.6
 *
 * Unit tests for XSC Parser using real shipped .xsc files.
 */
const blocksDirectory = path.resolve(__dirname, '../../../research/CircuitBlocks');

const xscFiles = [
	'AllPass1stOrder.xsc',
	'AllPass2ndOrder.xsc',
	'HighPass2ndOrderQ.xsc',
	'HighPassFirstOrder.xsc',
	'L-Pad.xsc',
	'LowPass2ndOrderQ.xsc',
	'LowPassFirstOrder.xsc',
	'Series Notch.xsc',
	'Shunt Notch.xsc',
];

describe('XSC Parser Unit Tests — Real .xsc Files', () => {
	describe('parsing all 9 shipped .xsc files', () => {
		it.each(xscFiles)('should successfully parse %s', (filename) => {
			const filePath = path.resolve(blocksDirectory, filename);
			const content = fs.readFileSync(filePath, 'utf8');
			const result = parseXsc(content);

			expect(result.success).toBe(true);
			expect(result.block).toBeDefined();
			expect(result.block.title).toBeTruthy();
			expect(result.block.variables).toHaveLength(6);
			expect(result.block.components.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('LowPassFirstOrder.xsc verification', () => {
		let block;

		beforeAll(() => {
			const filePath = path.resolve(blocksDirectory, 'LowPassFirstOrder.xsc');
			const content = fs.readFileSync(filePath, 'utf8');
			const result = parseXsc(content);
			block = result.block;
		});

		it('should have title "Low Pass 1st Order"', () => {
			expect(block.title).toBe('Low Pass 1st Order');
		});

		it('should have 2 non-empty variables (freq, R)', () => {
			const nonEmpty = block.variables.filter((v) => v.name !== '');
			expect(nonEmpty).toHaveLength(2);
			expect(nonEmpty[0].name).toBe('freq');
			expect(nonEmpty[1].name).toBe('R');
		});

		it('should have variable freq with description and default 1000', () => {
			expect(block.variables[2].name).toBe('freq');
			expect(block.variables[2].description).toBe('frequency [Hz]');
			expect(block.variables[2].defaultValue).toBe(1000);
		});

		it('should have variable R with description and default 8', () => {
			expect(block.variables[3].name).toBe('R');
			expect(block.variables[3].description).toBe('Load resistance [Ohms]');
			expect(block.variables[3].defaultValue).toBe(8);
		});

		it('should have 1 component (inductor, partType=2)', () => {
			expect(block.components).toHaveLength(1);
			expect(block.components[0].partType).toBe(2);
		});

		it('should have component formula "R/(2*pi*freq)"', () => {
			expect(block.components[0].formula).toBe('R/(2*pi*freq)');
		});

		it('should have 1 wire', () => {
			expect(block.wires).toHaveLength(1);
		});

		it('should have 4 texts', () => {
			expect(block.texts).toHaveLength(4);
		});
	});

	describe('Shunt Notch.xsc verification', () => {
		let block;

		beforeAll(() => {
			const filePath = path.resolve(blocksDirectory, 'Shunt Notch.xsc');
			const content = fs.readFileSync(filePath, 'utf8');
			const result = parseXsc(content);
			block = result.block;
		});

		it('should have title "Shunt Notch"', () => {
			expect(block.title).toBe('Shunt Notch');
		});

		it('should have 3 non-empty variables (f, Q, R)', () => {
			const nonEmpty = block.variables.filter((v) => v.name !== '');
			expect(nonEmpty).toHaveLength(3);
			expect(nonEmpty[0].name).toBe('f');
			expect(nonEmpty[1].name).toBe('Q');
			expect(nonEmpty[2].name).toBe('R');
		});

		it('should have variable f at slot 2 with default 1000', () => {
			expect(block.variables[2].name).toBe('f');
			expect(block.variables[2].description).toBe('notch frequency');
			expect(block.variables[2].defaultValue).toBe(1000);
		});

		it('should have variable Q at slot 3 with default 1', () => {
			expect(block.variables[3].name).toBe('Q');
			expect(block.variables[3].description).toBe('determines notch width');
			expect(block.variables[3].defaultValue).toBe(1);
		});

		it('should have variable R at slot 4 with default 0.01', () => {
			expect(block.variables[4].name).toBe('R');
			expect(block.variables[4].description).toBe('determines notch depth');
			expect(block.variables[4].defaultValue).toBe(0.01);
		});

		it('should have 3 components', () => {
			expect(block.components).toHaveLength(3);
		});

		it('should have component 0 as inductor with formula "(Q*8)/(6.28*f)"', () => {
			expect(block.components[0].partType).toBe(2);
			expect(block.components[0].formula).toBe('(Q*8)/(6.28*f)');
		});

		it('should have component 1 as capacitor with formula "1/(6.28*f*8*Q)"', () => {
			expect(block.components[1].partType).toBe(1);
			expect(block.components[1].formula).toBe('1/(6.28*f*8*Q)');
		});

		it('should have component 2 as resistor with formula "R*1"', () => {
			expect(block.components[2].partType).toBe(0);
			expect(block.components[2].formula).toBe('R*1');
		});
	});
});

describe('XSC Parser Unit Tests — Error Cases', () => {
	it('should return error for empty string', () => {
		const result = parseXsc('');
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should return error for truncated file (just the title line)', () => {
		const result = parseXsc('Low Pass 1st Order\n');
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toMatch(/truncated|missing|end of file/i);
	});

	it('should return error for missing sections', () => {
		// Provide title and variables but no Passives section header
		const lines = [
			'Test Block',
			'',
			'',
		];
		// Add 6 variable slots (name, description, value)
		for (let i = 0; i < 6; i++) {
			lines.push(`   //Variable #${i}`);
			lines.push('');
			lines.push(`  0 //VarValue #${i}`);
		}
		// Missing Passives section — file ends here
		const content = lines.join('\n');
		const result = parseXsc(content);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should return error for non-numeric value where number expected', () => {
		const lines = [
			'Test Block',
			'',
			'',
		];
		// Add 6 variable slots but with a non-numeric default value
		for (let i = 0; i < 6; i++) {
			lines.push(`   //Variable #${i}`);
			lines.push('');
			if (i === 0) {
				lines.push('  abc //VarValue #0');
			} else {
				lines.push(`  0 //VarValue #${i}`);
			}
		}
		const content = lines.join('\n');
		const result = parseXsc(content);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toMatch(/non-numeric|numeric/i);
	});
});
