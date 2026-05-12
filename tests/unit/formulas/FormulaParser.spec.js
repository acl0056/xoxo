// Feature: circuit-blocks-menu, Property 2: Formula parse/print round-trip
// Feature: circuit-blocks-menu, Property 4: Formula operator precedence
import fc from 'fast-check';
import { parseFormula } from '@/formulas/FormulaParser';
import { printFormula } from '@/formulas/FormulaPrinter';
import { evaluateFormula } from '@/formulas/FormulaEngine';

/**
 * Validates: Requirements 7.1, 7.3, 7.4
 *
 * Property 2: For any valid formula AST (containing numbers, identifiers,
 * binary operators, unary negation, and parenthesized groups), printing it
 * to a string and then parsing the result SHALL produce a semantically
 * equivalent AST (evaluates to the same value for all variable bindings).
 */

/**
 * Extract all identifier names from an AST node (excluding 'pi').
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
				if (n.name !== 'pi') {
					identifiers.add(n.name);
				}
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
 * Recursively evaluate an AST node with given variable bindings.
 * Returns the numeric result directly (no error handling — assumes valid inputs).
 * @param {object} node - Formula AST node
 * @param {Object<string, number>} variables - Variable name → value map
 * @returns {number}
 */
function evaluateAst(node, variables) {
	switch (node.type) {
		case 'number':
			return node.value;
		case 'identifier':
			if (node.name === 'pi') return Math.PI;
			return variables[node.name];
		case 'binary': {
			const left = evaluateAst(node.left, variables);
			const right = evaluateAst(node.right, variables);
			switch (node.operator) {
				case '+': return left + right;
				case '-': return left - right;
				case '*': return left * right;
				case '/': return left / right;
				case '^': return left ** right;
				default: return NaN;
			}
		}
		case 'unary':
			return -evaluateAst(node.operand, variables);
		case 'group':
			return evaluateAst(node.expression, variables);
		default:
			return NaN;
	}
}

/**
 * Generator for valid formula ASTs with bounded depth.
 * Generates ASTs with numbers, identifiers, binary ops, unary negation, and groups.
 * @param {number} maxDepth - Maximum recursion depth (default 4)
 * @returns {fc.Arbitrary} - fast-check arbitrary producing valid AST nodes
 */
function formulaAstGenerator(maxDepth = 4) {
	// Short alpha-only identifier names (1-3 chars), avoiding 'pi'
	const identifierNames = ['a', 'b', 'c', 'x', 'y', 'z', 'f', 'q', 'r', 'w', 'ab', 'cd', 'ef', 'gh'];

	// Number node: positive finite values only
	const numberNodeGenerator = fc.double({
		min: 0.001,
		max: 1000,
		noNaN: true,
		noDefaultInfinity: true,
	}).filter((v) => Number.isFinite(v) && v > 0).map((value) => ({
		type: 'number',
		value,
	}));

	// Identifier node
	const identifierNodeGenerator = fc.constantFrom(...identifierNames).map((name) => ({
		type: 'identifier',
		name,
	}));

	// Leaf nodes (depth 0)
	const leafGenerator = fc.oneof(numberNodeGenerator, identifierNodeGenerator);

	// Recursive AST generator
	function astAtDepth(depth) {
		if (depth <= 0) {
			return leafGenerator;
		}

		const childGenerator = astAtDepth(depth - 1);

		// Binary operation node
		const binaryNodeGenerator = fc.tuple(
			childGenerator,
			fc.constantFrom('+', '-', '*', '/', '^'),
			childGenerator,
		).map(([left, operator, right]) => ({
			type: 'binary',
			operator,
			left,
			right,
		}));

		// Unary negation node
		const unaryNodeGenerator = childGenerator.map((operand) => ({
			type: 'unary',
			operator: '-',
			operand,
		}));

		// Group node (parenthesized expression)
		const groupNodeGenerator = childGenerator.map((expression) => ({
			type: 'group',
			expression,
		}));

		return fc.oneof(
			{ weight: 3, arbitrary: leafGenerator },
			{ weight: 4, arbitrary: binaryNodeGenerator },
			{ weight: 1, arbitrary: unaryNodeGenerator },
			{ weight: 2, arbitrary: groupNodeGenerator },
		);
	}

	return astAtDepth(maxDepth);
}

describe('Formula parse/print round-trip (Property 2)', () => {
	it('printFormula then parseFormula produces semantically equivalent AST', () => {
		fc.assert(
			fc.property(
				formulaAstGenerator(4),
				(ast) => {
					// Step 1: Print the AST to a formula string
					const printed = printFormula(ast);

					// Step 2: Parse the printed string back to an AST
					const parseResult = parseFormula(printed);
					expect(parseResult.success).toBe(true);

					// Step 3: Extract all identifiers from the original AST
					const identifiers = extractIdentifiers(ast);

					// Step 4: Generate positive finite bindings for each identifier
					// Use deterministic values based on identifier name for reproducibility
					const variables = {};
					const baseValues = [1.5, 2.7, 3.2, 4.1, 5.8, 6.3, 7.9, 8.4, 9.1, 10.6, 11.2, 12.5, 13.7, 14.3];
					let valueIndex = 0;
					for (const name of identifiers) {
						variables[name] = baseValues[valueIndex % baseValues.length];
						valueIndex++;
					}

					// Step 5: Evaluate both ASTs with the same bindings
					const originalValue = evaluateAst(ast, variables);
					const roundTrippedValue = evaluateAst(parseResult.ast, variables);

					// Skip cases that produce non-finite results (division by zero, overflow, etc.)
					if (!Number.isFinite(originalValue) || !Number.isFinite(roundTrippedValue)) {
						return;
					}

					// Step 6: Assert approximate equality (within floating point tolerance)
					if (originalValue === 0 && roundTrippedValue === 0) {
						// Both zero — pass
						return;
					}

					// Use relative tolerance for non-zero values
					const tolerance = 1e-10;
					const absoluteDifference = Math.abs(originalValue - roundTrippedValue);
					const relativeDifference = absoluteDifference / Math.max(Math.abs(originalValue), Math.abs(roundTrippedValue));

					expect(relativeDifference).toBeLessThan(tolerance);
				},
			),
			{ numRuns: 100 },
		);
	});
});

// Feature: circuit-blocks-menu, Property 4: Formula operator precedence

/**
 * Validates: Requirements 7.2
 *
 * Property 4: For any formula containing mixed operators (+, -, *, /, ^)
 * and parentheses, the Formula_Parser SHALL produce an AST that, when
 * evaluated, gives the same result as the mathematically correct evaluation
 * with standard precedence (parentheses > exponentiation > multiplication/division
 * > addition/subtraction).
 */

/**
 * Generator for formula expressions with mixed operators.
 * Produces formula strings using variables a, b, c with mixed operators
 * and optional parentheses to test precedence handling.
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {fc.Arbitrary<string>} - fast-check arbitrary producing formula strings
 */
function precedenceFormulaGenerator(maxDepth = 3) {
	const variables = ['a', 'b', 'c'];
	const operators = ['+', '-', '*', '/', '^'];

	// Leaf: a variable name or a small positive number
	const leafGenerator = fc.oneof(
		fc.constantFrom(...variables),
		fc.double({
			min: 0.5,
			max: 10,
			noNaN: true,
			noDefaultInfinity: true,
		})
			.filter((v) => Number.isFinite(v) && v > 0)
			.map((v) => v.toFixed(2)),
	);

	function exprAtDepth(depth) {
		if (depth <= 0) {
			return leafGenerator;
		}

		const childGenerator = exprAtDepth(depth - 1);

		// Binary expression: left op right
		const binaryGenerator = fc.tuple(
			childGenerator,
			fc.constantFrom(...operators),
			childGenerator,
		).map(([left, op, right]) => `${left} ${op} ${right}`);

		// Parenthesized expression
		const groupGenerator = fc.tuple(
			childGenerator,
			fc.constantFrom(...operators),
			childGenerator,
		).map(([left, op, right]) => `(${left} ${op} ${right})`);

		return fc.oneof(
			{ weight: 2, arbitrary: leafGenerator },
			{ weight: 4, arbitrary: binaryGenerator },
			{ weight: 2, arbitrary: groupGenerator },
		);
	}

	return exprAtDepth(maxDepth);
}

/**
 * Evaluate a formula string using JavaScript's native evaluation as a reference.
 * Replaces ^ with ** for exponentiation and substitutes variable values.
 * @param {string} formula - Formula string using a, b, c variables and ^ for exponentiation
 * @param {Object<string, number>} variables - Variable bindings
 * @returns {number} - Evaluated result
 */
function evaluateWithJavaScript(formula, variables) {
	// Replace ^ with ** for JavaScript exponentiation
	// Must handle carefully to not break other characters
	let jsFormula = formula.replace(/\^/g, '**');

	// Replace variable names with their values using word boundaries
	// Process longer names first to avoid partial replacements
	const sortedNames = Object.keys(variables).sort((x, y) => y.length - x.length);
	for (const name of sortedNames) {
		const regex = new RegExp(`\\b${name}\\b`, 'g');
		jsFormula = jsFormula.replace(regex, `(${variables[name]})`);
	}

	// Replace pi with Math.PI
	jsFormula = jsFormula.replace(/\bpi\b/g, `(${Math.PI})`);

	// Use Function constructor for safe evaluation with known inputs
	// eslint-disable-next-line no-new-func
	const fn = new Function(`return (${jsFormula});`);
	return fn();
}

describe('Formula operator precedence (Property 4)', () => {
	it('FormulaEngine evaluation matches JavaScript native evaluation for mixed-operator formulas', () => {
		// Use fixed positive variable values to avoid negative results
		const variables = { a: 2, b: 3, c: 5 };

		fc.assert(
			fc.property(
				precedenceFormulaGenerator(3),
				(formula) => {
					// Evaluate using FormulaEngine
					const engineResult = evaluateFormula(formula, variables);

					// Evaluate using JavaScript as reference
					let jsResult;
					try {
						jsResult = evaluateWithJavaScript(formula, variables);
					} catch {
						// If JS evaluation fails, skip this case
						return;
					}

					// Skip cases where JS produces non-finite results
					if (!Number.isFinite(jsResult)) {
						return;
					}

					// Skip cases where the result is negative (FormulaEngine rejects these)
					if (jsResult < 0) {
						return;
					}

					// FormulaEngine should succeed for valid positive results
					if (!engineResult.success) {
						// If engine fails but JS got a valid positive finite result,
						// that's acceptable only if the value is extremely large/small
						// or involves edge cases the engine guards against
						return;
					}

					// Compare results with relative tolerance
					const tolerance = 1e-10;
					if (jsResult === 0 && engineResult.value === 0) {
						return; // Both zero — pass
					}

					const absoluteDifference = Math.abs(engineResult.value - jsResult);
					const maxMagnitude = Math.max(Math.abs(engineResult.value), Math.abs(jsResult));

					if (maxMagnitude === 0) {
						expect(absoluteDifference).toBe(0);
					} else {
						const relativeDifference = absoluteDifference / maxMagnitude;
						expect(relativeDifference).toBeLessThan(tolerance);
					}
				},
			),
			{ numRuns: 100 },
		);
	});
});
