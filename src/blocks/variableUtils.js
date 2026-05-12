/**
 * Variable utilities — filtering and transformation helpers for CircuitBlock
 * variable slots.
 *
 * @module variableUtils
 */

/**
 * Filter a CircuitBlock's variable slots to return only those with non-empty names.
 * @param {Array<{name: string, description: string, defaultValue: number}>} variables - The 6 variable slots from a CircuitBlock
 * @returns {Array<{name: string, description: string, defaultValue: number, slotIndex: number}>} - Only non-empty variables, with their original slot index preserved
 */
export function filterActiveVariables(variables) {
	return variables
		.map((variable, index) => ({ ...variable, slotIndex: index }))
		.filter((variable) => variable.name.trim() !== '');
}
