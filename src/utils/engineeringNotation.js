/**
 * Engineering notation utilities for parsing and formatting component values
 * Supports standard engineering suffixes: T, G, M, k, m, u, n, p, f
 */

/**
 * Parse engineering notation string to numeric value
 * Examples: "4.7k" -> 4700, "10u" -> 0.00001, "100n" -> 0.0000001
 *
 * @param {string} notation - Engineering notation string
 * @returns {number} Numeric value
 * @throws {Error} If notation is invalid
 */
export function parseEngineering(notation) {
	if (typeof notation !== 'string') {
		throw new Error('Input must be a string');
	}

	// Trim whitespace
	const trimmed = notation.trim();

	if (trimmed === '') {
		throw new Error('Empty string is not valid engineering notation');
	}

	// Engineering notation suffixes and their multipliers
	const suffixes = {
		T: 1e12, // Tera
		G: 1e9, // Giga
		M: 1e6, // Mega
		k: 1e3, // Kilo
		m: 1e-3, // Milli
		u: 1e-6, // Micro (μ)
		μ: 1e-6, // Micro (alternative)
		n: 1e-9, // Nano
		p: 1e-12, // Pico
		f: 1e-15, // Femto
	};

	// Try to match engineering notation pattern
	// Pattern: optional sign, digits, optional decimal point, optional digits, suffix
	const pattern = /^([+-]?)(\d+\.?\d*|\.\d+)([TGMkmuμnpf]?)$/;
	const match = trimmed.match(pattern);

	if (!match) {
		throw new Error(`Invalid engineering notation: ${notation}`);
	}

	const sign = match[1] === '-' ? -1 : 1;
	const numberPart = parseFloat(match[2]);
	const suffix = match[3];

	if (Number.isNaN(numberPart)) {
		throw new Error(`Invalid number in engineering notation: ${notation}`);
	}

	// Apply multiplier if suffix exists
	const multiplier = suffix ? suffixes[suffix] : 1;

	if (multiplier === undefined) {
		throw new Error(`Unknown suffix in engineering notation: ${suffix}`);
	}

	return sign * numberPart * multiplier;
}

/**
 * Format numeric value to engineering notation string
 * Automatically selects appropriate suffix based on magnitude
 *
 * @param {number} value - Numeric value to format
 * @param {number} precision - Number of significant digits (default: 3)
 * @returns {string} Engineering notation string
 */
export function formatEngineering(value, precision = 4) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		throw new Error('Value must be a valid number');
	}

	if (!Number.isFinite(value)) {
		throw new Error('Value must be finite');
	}

	// Handle zero specially
	if (value === 0) {
		return '0';
	}

	// Handle negative values
	const sign = value < 0 ? '-' : '';
	const absValue = Math.abs(value);

	// Engineering notation suffixes in order from largest to smallest
	const suffixes = [
		{ suffix: 'T', multiplier: 1e12 },
		{ suffix: 'G', multiplier: 1e9 },
		{ suffix: 'M', multiplier: 1e6 },
		{ suffix: 'k', multiplier: 1e3 },
		{ suffix: '', multiplier: 1 },
		{ suffix: 'm', multiplier: 1e-3 },
		{ suffix: 'u', multiplier: 1e-6 },
		{ suffix: 'n', multiplier: 1e-9 },
		{ suffix: 'p', multiplier: 1e-12 },
		{ suffix: 'f', multiplier: 1e-15 },
	];

	// Find the appropriate suffix - use the one where scaled value is >= 1 and < 1000
	for (const { suffix, multiplier } of suffixes) {
		const scaledValue = absValue / multiplier;

		if (scaledValue >= 1 && scaledValue < 1000) {
			// Format with appropriate precision
			let formatted;
			if (scaledValue >= 100) {
				// For values >= 100, use integer or 1 decimal place
				formatted = scaledValue.toFixed(Math.max(0, precision - 3));
			} else if (scaledValue >= 10) {
				// For values >= 10, use 1-2 decimal places
				formatted = scaledValue.toFixed(Math.max(0, precision - 2));
			} else {
				// For values < 10, use more decimal places
				formatted = scaledValue.toFixed(Math.max(0, precision - 1));
			}

			// Remove trailing zeros after decimal point, and decimal point if not needed
			if (formatted.includes('.')) {
				formatted = formatted.replace(/\.?0+$/, '');
			}

			return `${sign}${formatted}${suffix}`;
		}
	}

	// For very small values, use scientific notation
	return value.toExponential(precision - 1);
}
