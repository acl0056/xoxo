/**
 * Evaluates parametric formula expressions with variable bindings.
 * Parses the formula string to an AST using FormulaParser, then recursively
 * evaluates the tree, substituting variable names with provided values.
 *
 * @module FormulaEngine
 */

import { parseFormula } from './FormulaParser';

/**
 * Recursively evaluate an AST node with the given variable bindings.
 * @param {object} node - A FormulaNode AST node
 * @param {Object<string, number>} variables - Variable name → value map
 * @returns {{ success: boolean, value?: number, error?: string }}
 */
function evaluateNode(node, variables) {
	switch (node.type) {
		case 'number':
			return { success: true, value: node.value };

		case 'identifier': {
			if (node.name === 'pi') {
				return { success: true, value: Math.PI };
			}
			if (Object.prototype.hasOwnProperty.call(variables, node.name)) {
				return { success: true, value: variables[node.name] };
			}
			return { success: false, error: `Undefined variable: ${node.name}` };
		}

		case 'group':
			return evaluateNode(node.expression, variables);

		case 'unary': {
			const operandResult = evaluateNode(node.operand, variables);
			if (!operandResult.success) return operandResult;
			return { success: true, value: -operandResult.value };
		}

		case 'binary': {
			const leftResult = evaluateNode(node.left, variables);
			if (!leftResult.success) return leftResult;

			const rightResult = evaluateNode(node.right, variables);
			if (!rightResult.success) return rightResult;

			const left = leftResult.value;
			const right = rightResult.value;

			switch (node.operator) {
				case '+':
					return { success: true, value: left + right };
				case '-':
					return { success: true, value: left - right };
				case '*':
					return { success: true, value: left * right };
				case '/':
					if (right === 0) {
						return { success: false, error: 'Division by zero in formula' };
					}
					return { success: true, value: left / right };
				case '^':
					return { success: true, value: left ** right };
				default:
					return { success: false, error: `Unknown operator: ${node.operator}` };
			}
		}

		default:
			return { success: false, error: `Unknown AST node type: ${node.type}` };
	}
}

/**
 * Evaluate a formula string with given variable bindings.
 * @param {string} formula - Formula string (e.g., "R/(2*pi*freq*Q)")
 * @param {Object<string, number>} variables - Variable name → value map
 * @returns {{ success: boolean, value?: number, error?: string }}
 */
export function evaluateFormula(formula, variables) {
	const parseResult = parseFormula(formula);
	if (!parseResult.success) {
		return { success: false, error: parseResult.error };
	}

	const evalResult = evaluateNode(parseResult.ast, variables);
	if (!evalResult.success) {
		return evalResult;
	}

	const { value } = evalResult;

	if (Number.isNaN(value)) {
		return { success: false, error: 'Formula evaluation produced NaN' };
	}

	if (!Number.isFinite(value)) {
		return { success: false, error: 'Formula evaluation produced Infinity' };
	}

	if (value < 0) {
		return { success: false, error: `Formula evaluation produced negative value: ${value}` };
	}

	return { success: true, value };
}
