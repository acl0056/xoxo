/**
 * Serializes a formula AST back into a string representation.
 * Emits minimal parentheses based on operator precedence, and preserves
 * explicit grouping nodes as parentheses for round-trip fidelity.
 *
 * @module FormulaPrinter
 */

/**
 * Operator precedence levels (higher number = tighter binding).
 */
const PRECEDENCE = {
	'+': 1,
	'-': 1,
	'*': 2,
	'/': 2,
	'^': 3,
};

/**
 * Format a number value for output. Uses exponential notation when the
 * number was originally in scientific notation (very small or very large),
 * otherwise uses standard decimal representation.
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
	// Use toPrecision to get a round-trippable representation, then clean up
	// JavaScript's toString handles most cases well for round-tripping
	const str = String(value);
	return str;
}

/**
 * Determine whether a child node needs parentheses when appearing as
 * an operand of a parent binary operator.
 * @param {object} child - The child AST node
 * @param {string} parentOperator - The parent binary operator
 * @param {'left'|'right'} side - Which side of the parent operator
 * @returns {boolean}
 */
function needsParentheses(child, parentOperator, side) {
	// Only binary nodes can require precedence-based parentheses
	if (child.type !== 'binary') {
		return false;
	}

	const parentPrecedence = PRECEDENCE[parentOperator];
	const childPrecedence = PRECEDENCE[child.operator];

	// Child has strictly lower precedence → always needs parens
	if (childPrecedence < parentPrecedence) {
		return true;
	}

	// Child has same precedence on the right side of - or /
	// e.g., a - (b - c) or a / (b / c) need parens on the right
	if (childPrecedence === parentPrecedence && side === 'right') {
		if (parentOperator === '-' || parentOperator === '/') {
			return true;
		}
		// For exponentiation (right-associative), right child at same
		// precedence does NOT need parens: a^b^c = a^(b^c)
		// But left child at same precedence DOES: (a^b)^c
	}

	// Left side of exponentiation with same precedence needs parens
	// because ^ is right-associative: (a^b)^c ≠ a^b^c
	if (childPrecedence === parentPrecedence && side === 'left') {
		if (parentOperator === '^') {
			return true;
		}
	}

	return false;
}

/**
 * Recursively print an AST node to a formula string.
 * @param {object} node - A FormulaNode AST node
 * @returns {string}
 */
function printNode(node) {
	switch (node.type) {
		case 'number':
			return formatNumber(node.value);

		case 'identifier':
			return node.name;

		case 'group':
			return `(${printNode(node.expression)})`;

		case 'unary': {
			const operand = printNode(node.operand);
			// Wrap the operand in parens if it's a binary expression
			if (node.operand.type === 'binary') {
				return `-(${operand})`;
			}
			return `-${operand}`;
		}

		case 'binary': {
			const leftStr = needsParentheses(node.left, node.operator, 'left')
				? `(${printNode(node.left)})`
				: printNode(node.left);

			const rightStr = needsParentheses(node.right, node.operator, 'right')
				? `(${printNode(node.right)})`
				: printNode(node.right);

			return `${leftStr}${node.operator}${rightStr}`;
		}

		default:
			throw new Error(`Unknown AST node type: ${node.type}`);
	}
}

/**
 * Serialize a formula AST back to a string.
 * @param {object} ast - Formula AST (conforming to formula-ast.schema.json)
 * @returns {string} - Formula string
 */
export function printFormula(ast) {
	return printNode(ast);
}
