/**
 * Recursive-descent parser for parametric formula expressions.
 * Produces an AST conforming to formula-ast.schema.json.
 *
 * Grammar (EBNF):
 *   Expression  = Term (('+' | '-') Term)*
 *   Term        = Exponent (('*' | '/') Exponent)*
 *   Exponent    = Unary ('^' Exponent)?
 *   Unary       = '-' Unary | Atom
 *   Atom        = Number | Identifier | '(' Expression ')'
 *   Number      = [0-9]+ ('.' [0-9]+)? (('e'|'E') ('+'|'-')? [0-9]+)?
 *   Identifier  = [a-zA-Z_][a-zA-Z0-9_]*
 *
 * Operator precedence (lowest to highest):
 *   1. Addition, Subtraction (+, -)
 *   2. Multiplication, Division (*, /)
 *   3. Exponentiation (^) — right-associative
 *   4. Unary negation (-)
 *   5. Parentheses
 *
 * @module FormulaParser
 */

/**
 * Parse a formula string into an AST.
 * @param {string} formula - e.g. "R/(2*pi*freq*Q)"
 * @returns {{ success: boolean, ast?: object, error?: string }}
 */
export function parseFormula(formula) {
	if (!formula || typeof formula !== 'string') {
		return { success: false, error: 'Formula must be a non-empty string' };
	}

	const input = formula;
	const { length } = input;
	let position = 0;

	/**
	 * Skip whitespace characters at the current position.
	 */
	function skipWhitespace() {
		while (position < length && (input[position] === ' ' || input[position] === '\t')) {
			position++;
		}
	}

	/**
	 * Expect a specific character, consuming it. Returns error if not found.
	 * @param {string} expected
	 * @returns {string|null} error message or null on success
	 */
	function expect(expected) {
		skipWhitespace();
		if (position >= length) {
			return `Expected '${expected}' but reached end of formula at position ${position}`;
		}
		if (input[position] !== expected) {
			return `Expected '${expected}' but found '${input[position]}' at position ${position}`;
		}
		position++;
		return null;
	}

	/**
	 * Parse a number literal, including scientific notation.
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseNumber() {
		const start = position;
		let numberStr = '';

		// Integer part
		while (position < length && input[position] >= '0' && input[position] <= '9') {
			numberStr += input[position];
			position++;
		}

		// Decimal part
		if (position < length && input[position] === '.') {
			numberStr += '.';
			position++;
			while (position < length && input[position] >= '0' && input[position] <= '9') {
				numberStr += input[position];
				position++;
			}
		}

		// Scientific notation (e.g., 5.6E-6, 1e-3, 1E5)
		if (position < length && (input[position] === 'e' || input[position] === 'E')) {
			numberStr += input[position];
			position++;
			if (position < length && (input[position] === '+' || input[position] === '-')) {
				numberStr += input[position];
				position++;
			}
			if (position >= length || input[position] < '0' || input[position] > '9') {
				return { error: `Invalid scientific notation at position ${start}: expected digits after exponent` };
			}
			while (position < length && input[position] >= '0' && input[position] <= '9') {
				numberStr += input[position];
				position++;
			}
		}

		const value = parseFloat(numberStr);
		if (Number.isNaN(value)) {
			return { error: `Invalid number at position ${start}` };
		}

		return { node: { type: 'number', value } };
	}

	/**
	 * Parse an identifier (variable name or constant like pi).
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseIdentifier() {
		let name = '';
		while (
			position < length
			&& ((input[position] >= 'a' && input[position] <= 'z')
				|| (input[position] >= 'A' && input[position] <= 'Z')
				|| (input[position] >= '0' && input[position] <= '9')
				|| input[position] === '_')
		) {
			name += input[position];
			position++;
		}

		if (name.length === 0) {
			return { error: `Expected identifier at position ${position}` };
		}

		return { node: { type: 'identifier', name } };
	}

	/**
	 * Parse an atom: number, identifier, or parenthesized expression.
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseAtom() {
		skipWhitespace();

		if (position >= length) {
			return { error: `Unexpected end of formula at position ${position}: expected a value` };
		}

		const character = input[position];

		// Parenthesized expression
		if (character === '(') {
			const openPosition = position;
			position++; // consume '('
			const result = parseExpression();
			if (result.error) return result;

			const closeError = expect(')');
			if (closeError) {
				return { error: `Unclosed parenthesis opened at position ${openPosition}: ${closeError}` };
			}

			return { node: { type: 'group', expression: result.node } };
		}

		// Number literal
		if (character >= '0' && character <= '9') {
			return parseNumber();
		}

		// Decimal number starting with '.'
		if (character === '.') {
			return parseNumber();
		}

		// Identifier
		if ((character >= 'a' && character <= 'z')
			|| (character >= 'A' && character <= 'Z')
			|| character === '_') {
			return parseIdentifier();
		}

		return { error: `Unexpected character '${character}' at position ${position}` };
	}

	/**
	 * Parse a unary expression: optional negation prefix.
	 * Unary = '-' Unary | Atom
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseUnary() {
		skipWhitespace();

		if (position < length && input[position] === '-') {
			const operatorPosition = position;
			position++; // consume '-'
			const result = parseUnary();
			if (result.error) return result;

			// Optimization: if the operand is a number literal, negate it directly
			// This avoids unnecessary unary nodes for negative numbers
			// But we keep unary nodes for expressions like -(x+1)
			if (result.node.type === 'number' && operatorPosition === 0) {
				return { node: { type: 'number', value: -result.node.value } };
			}

			return { node: { type: 'unary', operator: '-', operand: result.node } };
		}

		return parseAtom();
	}

	/**
	 * Parse an exponentiation expression (right-associative).
	 * Exponent = Unary ('^' Exponent)?
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseExponent() {
		const left = parseUnary();
		if (left.error) return left;

		skipWhitespace();
		if (position < length && input[position] === '^') {
			position++; // consume '^'
			const right = parseExponent(); // right-associative: recurse into parseExponent
			if (right.error) return right;

			return {
				node: {
					type: 'binary', operator: '^', left: left.node, right: right.node,
				},
			};
		}

		return left;
	}

	/**
	 * Parse a term: multiplication and division (left-associative).
	 * Term = Exponent (('*' | '/') Exponent)*
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseTerm() {
		const initial = parseExponent();
		if (initial.error) return initial;

		let { node } = initial;

		skipWhitespace();
		while (position < length && (input[position] === '*' || input[position] === '/')) {
			const operator = input[position];
			position++; // consume operator
			const right = parseExponent();
			if (right.error) return right;

			node = {
				type: 'binary', operator, left: node, right: right.node,
			};
			skipWhitespace();
		}

		return { node };
	}

	/**
	 * Parse an expression: addition and subtraction (left-associative).
	 * Expression = Term (('+' | '-') Term)*
	 * @returns {{ node?: object, error?: string }}
	 */
	function parseExpression() {
		const initial = parseTerm();
		if (initial.error) return initial;

		let { node } = initial;

		skipWhitespace();
		while (position < length && (input[position] === '+' || input[position] === '-')) {
			const operator = input[position];
			position++; // consume operator
			const right = parseTerm();
			if (right.error) return right;

			node = {
				type: 'binary', operator, left: node, right: right.node,
			};
			skipWhitespace();
		}

		return { node };
	}

	// --- Main parse entry point ---
	skipWhitespace();
	if (position >= length) {
		return { success: false, error: 'Formula is empty' };
	}

	const result = parseExpression();
	if (result.error) {
		return { success: false, error: result.error };
	}

	// Check for trailing characters
	skipWhitespace();
	if (position < length) {
		return { success: false, error: `Unexpected character '${input[position]}' at position ${position} after complete expression` };
	}

	return { success: true, ast: result.node };
}
