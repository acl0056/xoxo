// Feature: circuit-blocks-menu, Property 3: Formula evaluation determinism
// Feature: circuit-blocks-menu, Task 3.7: Unit tests for known formulas
import fc from 'fast-check';
import { evaluateFormula } from '@/formulas/FormulaEngine';
import { printFormula } from '@/formulas/FormulaPrinter';

/**
 * Validates: Requirements 3.1, 3.3
 *
 * Property 3: For any valid formula string and valid variable bindings
 * (all referenced variables present, all values positive finite numbers),
 * evaluating the formula SHALL produce a finite positive number.
 *
 * To ensure the property holds, we generate "safe" formulas that only use
 * addition, multiplication, and division (with reasonable denominators),
 * positive number literals, and identifiers bound to positive values.
 * This tests DETERMINISM — the engine doesn't crash or produce unexpected
 * errors for valid positive inputs that should produce positive results.
 */

const IDENTIFIER_NAMES = ['a', 'b', 'c', 'x', 'y', 'z', 'f', 'q', 'r', 'w'];

/**
 * Generator for "safe" formula ASTs that should always produce positive
 * finite results when evaluated with positive finite variable bindings.
 * Only uses +, *, / operators with positive numbers and identifiers.
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {fc.Arbitrary} - fast-check arbitrary producing safe AST nodes
 */
function safeFormulaAstGenerator(maxDepth = 3) {
	// Number node: positive values in a safe range
	const numberNodeGenerator = fc.double({
		min: 0.01,
		max: 100,
		noNaN: true,
		noDefaultInfinity: true,
	}).filter((v) => Number.isFinite(v) && v > 0).map((value) => ({
		type: 'number',
		value,
	}));

	// Identifier node
	const identifierNodeGenerator = fc.constantFrom(...IDENTIFIER_NAMES).map((name) => ({
		type: 'identifier',
		name,
	}));

	// Leaf nodes
	const leafGenerator = fc.oneof(numberNodeGenerator, identifierNodeGenerator);

	function astAtDepth(depth) {
		if (depth <= 0) {
			return leafGenerator;
		}

		const childGenerator = astAtDepth(depth - 1);

		// Addition: positive + positive = positive
		const additionNodeGenerator = fc.tuple(
			childGenerator,
			childGenerator,
		).map(([left, right]) => ({
			type: 'binary',
			operator: '+',
			left,
			right,
		}));

		// Multiplication: positive * positive = positive
		const multiplicationNodeGenerator = fc.tuple(
			childGenerator,
			childGenerator,
		).map(([left, right]) => ({
			type: 'binary',
			operator: '*',
			left,
			right,
		}));

		// Division: positive / positive = positive (finite if denominator > 0)
		const divisionNodeGenerator = fc.tuple(
			childGenerator,
			childGenerator,
		).map(([left, right]) => ({
			type: 'binary',
			operator: '/',
			left,
			right,
		}));

		// Group node (parenthesized expression)
		const groupNodeGenerator = childGenerator.map((expression) => ({
			type: 'group',
			expression,
		}));

		return fc.oneof(
			{ weight: 3, arbitrary: leafGenerator },
			{ weight: 3, arbitrary: additionNodeGenerator },
			{ weight: 3, arbitrary: multiplicationNodeGenerator },
			{ weight: 2, arbitrary: divisionNodeGenerator },
			{ weight: 1, arbitrary: groupNodeGenerator },
		);
	}

	return astAtDepth(maxDepth);
}

/**
 * Extract all identifier names from an AST node.
 * @param {object} node - Formula AST node
 * @returns {Set<string>} - Set of identifier names
 */
function extractIdentifiers(node) {
	const identifiers = new Set();

	function walk(n) {
		switch (n.type) {
			case 'number':
				break;
			case 'identifier':
				identifiers.add(n.name);
				break;
			case 'binary':
				walk(n.left);
				walk(n.right);
				break;
			case 'unary':
				walk(n.operand);
				break;
			case 'group':
				walk(n.expression);
				break;
			default:
				break;
		}
	}

	walk(node);
	return identifiers;
}

/**
 * Generator for positive finite variable bindings given an AST.
 * Extracts identifiers from the AST and generates values in [0.1, 100].
 * @param {object} ast - Formula AST node
 * @returns {fc.Arbitrary} - fast-check arbitrary producing variable bindings object
 */
function variableBindingsGenerator(ast) {
	const identifiers = Array.from(extractIdentifiers(ast));

	if (identifiers.length === 0) {
		return fc.constant({});
	}

	return fc.tuple(
		...identifiers.map(() => fc.double({
			min: 0.1,
			max: 100,
			noNaN: true,
			noDefaultInfinity: true,
		}).filter((v) => Number.isFinite(v) && v > 0)),
	).map((values) => {
		const bindings = {};
		identifiers.forEach((name, index) => {
			bindings[name] = values[index];
		});
		return bindings;
	});
}

describe('Formula evaluation determinism (Property 3)', () => {
	it('for any valid formula with positive finite bindings, evaluateFormula returns a finite positive number', () => {
		fc.assert(
			fc.property(
				safeFormulaAstGenerator(3).chain((ast) => variableBindingsGenerator(ast).map((variables) => ({ ast, variables }))),
				({ ast, variables }) => {
					// Print the AST to get a formula string
					const formulaString = printFormula(ast);

					// Evaluate the formula with the generated bindings
					const result = evaluateFormula(formulaString, variables);

					// Assert: result is successful with a finite positive number
					expect(result.success).toBe(true);
					expect(typeof result.value).toBe('number');
					expect(Number.isFinite(result.value)).toBe(true);
					expect(result.value).toBeGreaterThan(0);
				},
			),
			{ numRuns: 100 },
		);
	});
});


/**
 * Validates: Requirements 3.1, 3.4, 3.5
 *
 * Unit tests for Formula Engine with known formulas from .xsc files.
 * Each test uses hand-calculated expected results to verify correctness.
 */
describe('Formula Engine - known formula evaluations', () => {
	it('evaluates Low Pass inductor formula: R/(2*pi*freq) with R=8, freq=1000', () => {
		const result = evaluateFormula('R/(2*pi*freq)', { R: 8, freq: 1000 });
		expect(result.success).toBe(true);
		// 8 / (2 * π * 1000) ≈ 0.0012732
		expect(result.value).toBeCloseTo(8 / (2 * Math.PI * 1000), 6);
	});

	it('evaluates Shunt Notch inductor formula: (Q*8)/(6.28*f) with Q=1, f=1000', () => {
		const result = evaluateFormula('(Q*8)/(6.28*f)', { Q: 1, f: 1000 });
		expect(result.success).toBe(true);
		// (1 * 8) / (6.28 * 1000) = 8 / 6280 ≈ 0.0012739
		expect(result.value).toBeCloseTo(8 / 6280, 6);
	});

	it('evaluates Shunt Notch capacitor formula: 1/(6.28*f*8*Q) with f=1000, Q=1', () => {
		const result = evaluateFormula('1/(6.28*f*8*Q)', { f: 1000, Q: 1 });
		expect(result.success).toBe(true);
		// 1 / (6.28 * 1000 * 8 * 1) = 1 / 50240 ≈ 0.0000199
		expect(result.value).toBeCloseTo(1 / 50240, 8);
	});

	it('evaluates L-Pad series resistor formula: R*(1-(10^(-(dB+0.001)/20))) with R=8, dB=6', () => {
		const result = evaluateFormula('R*(1-(10^(-(dB+0.001)/20)))', { R: 8, dB: 6 });
		expect(result.success).toBe(true);
		// 8 * (1 - 10^(-6.001/20)) = 8 * (1 - 10^(-0.30005))
		const expected = 8 * (1 - (10 ** (-6.001 / 20)));
		expect(result.value).toBeCloseTo(expected, 6);
	});

	it('evaluates All Pass formula: Z*TC with Z=8, TC=0.0001', () => {
		const result = evaluateFormula('Z*TC', { Z: 8, TC: 0.0001 });
		expect(result.success).toBe(true);
		// 8 * 0.0001 = 0.0008
		expect(result.value).toBeCloseTo(0.0008, 8);
	});

	it('evaluates 2nd Order capacitor formula: Q/(2*pi*freq*R) with Q=1, freq=1000, R=8', () => {
		const result = evaluateFormula('Q/(2*pi*freq*R)', { Q: 1, freq: 1000, R: 8 });
		expect(result.success).toBe(true);
		// 1 / (2 * π * 1000 * 8) ≈ 0.0000199
		expect(result.value).toBeCloseTo(1 / (2 * Math.PI * 1000 * 8), 8);
	});
});

describe('Formula Engine - error cases', () => {
	it('returns error for undefined variable', () => {
		const result = evaluateFormula('R/(2*pi*freq)', { R: 8 });
		expect(result.success).toBe(false);
		expect(result.error).toContain('Undefined variable');
	});

	it('returns error for division by zero', () => {
		const result = evaluateFormula('R/freq', { R: 8, freq: 0 });
		expect(result.success).toBe(false);
		expect(result.error).toContain('Division by zero');
	});

	it('returns error for empty formula', () => {
		const result = evaluateFormula('', {});
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('returns error for invalid syntax', () => {
		const result = evaluateFormula('R +* freq', { R: 8, freq: 1000 });
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('returns error for formula producing negative value', () => {
		// 1 - 2 = -1, which is negative
		const result = evaluateFormula('a-b', { a: 1, b: 2 });
		expect(result.success).toBe(false);
		expect(result.error).toContain('negative');
	});
});
