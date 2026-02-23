/**
 * Standard component value series (E12, E24) utilities
 * Used for stepping through standard resistor, capacitor, and inductor values
 */

/**
 * E12 series values (10% tolerance)
 * 12 values per decade
 */
const E12_VALUES = [
	1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2,
];

/**
 * E24 series values (5% tolerance)
 * 24 values per decade
 */
const E24_VALUES = [
	1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
	3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
];

/**
 * Find the nearest standard value in a series
 *
 * @param {number} value - Input value
 * @param {Array<number>} series - Standard value series (E12 or E24)
 * @returns {number} Nearest standard value
 */
function findNearestStandardValue(value, series) {
	if (value <= 0) {
		throw new Error('Value must be positive');
	}

	// Find the decade (power of 10)
	const decade = 10 ** Math.floor(Math.log10(value));

	// Normalize value to 1-10 range
	const normalized = value / decade;

	// Find closest value in series
	let closestValue = series[0];
	let minDifference = Math.abs(normalized - closestValue);

	for (const seriesValue of series) {
		const difference = Math.abs(normalized - seriesValue);
		if (difference < minDifference) {
			minDifference = difference;
			closestValue = seriesValue;
		}
	}

	// Scale back to original decade
	return closestValue * decade;
}

/**
 * Get the next higher standard value in a series
 *
 * @param {number} value - Current value
 * @param {Array<number>} series - Standard value series (E12 or E24)
 * @returns {number} Next higher standard value
 */
function getNextStandardValue(value, series) {
	if (value <= 0) {
		throw new Error('Value must be positive');
	}

	// Find the decade (power of 10)
	const decade = 10 ** Math.floor(Math.log10(value));

	// Normalize value to 1-10 range
	const normalized = value / decade;

	// Find next higher value in series
	for (const seriesValue of series) {
		if (seriesValue > normalized + 1e-10) { // Small epsilon for floating point comparison
			return seriesValue * decade;
		}
	}

	// If we're at the end of the series, move to next decade
	return series[0] * decade * 10;
}

/**
 * Get the next lower standard value in a series
 *
 * @param {number} value - Current value
 * @param {Array<number>} series - Standard value series (E12 or E24)
 * @returns {number} Next lower standard value
 */
function getPreviousStandardValue(value, series) {
	if (value <= 0) {
		throw new Error('Value must be positive');
	}

	// Find the decade (power of 10)
	const decade = 10 ** Math.floor(Math.log10(value));

	// Normalize value to 1-10 range
	const normalized = value / decade;

	// Find next lower value in series (search backwards)
	for (let i = series.length - 1; i >= 0; i--) {
		if (series[i] < normalized - 1e-10) { // Small epsilon for floating point comparison
			return series[i] * decade;
		}
	}

	// If we're at the beginning of the series, move to previous decade
	return (series[series.length - 1] * decade) / 10;
}

/**
 * Find the nearest E12 standard value
 *
 * @param {number} value - Input value
 * @returns {number} Nearest E12 standard value
 */
export function findNearestE12(value) {
	return findNearestStandardValue(value, E12_VALUES);
}

/**
 * Find the nearest E24 standard value
 *
 * @param {number} value - Input value
 * @returns {number} Nearest E24 standard value
 */
export function findNearestE24(value) {
	return findNearestStandardValue(value, E24_VALUES);
}

/**
 * Get the next higher E12 standard value
 *
 * @param {number} value - Current value
 * @returns {number} Next higher E12 standard value
 */
export function getNextE12(value) {
	return getNextStandardValue(value, E12_VALUES);
}

/**
 * Get the next higher E24 standard value
 *
 * @param {number} value - Current value
 * @returns {number} Next higher E24 standard value
 */
export function getNextE24(value) {
	return getNextStandardValue(value, E24_VALUES);
}

/**
 * Get the next lower E12 standard value
 *
 * @param {number} value - Current value
 * @returns {number} Next lower E12 standard value
 */
export function getPreviousE12(value) {
	return getPreviousStandardValue(value, E12_VALUES);
}

/**
 * Get the next lower E24 standard value
 *
 * @param {number} value - Current value
 * @returns {number} Next lower E24 standard value
 */
export function getPreviousE24(value) {
	return getPreviousStandardValue(value, E24_VALUES);
}

/**
 * Step through E12 values (increment or decrement)
 *
 * @param {number} value - Current value
 * @param {number} direction - 1 for increment, -1 for decrement
 * @returns {number} Next E12 standard value in the specified direction
 */
export function stepE12(value, direction) {
	if (direction > 0) {
		return getNextE12(value);
	} if (direction < 0) {
		return getPreviousE12(value);
	}
	return value;
}

/**
 * Step through E24 values (increment or decrement)
 *
 * @param {number} value - Current value
 * @param {number} direction - 1 for increment, -1 for decrement
 * @returns {number} Next E24 standard value in the specified direction
 */
export function stepE24(value, direction) {
	if (direction > 0) {
		return getNextE24(value);
	} if (direction < 0) {
		return getPreviousE24(value);
	}
	return value;
}
