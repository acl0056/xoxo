import fs from 'fs';

/**
 * Parser for ZMA (Impedance) files
 * Format: Frequency(Hz) Impedance(Ohms) Phase(degrees)
 */
class ZmaParser {
	/**
	 * Parse a ZMA file and return structured data
	 * @param {string} filePath - Path to the ZMA file
	 * @returns {Object} - {frequencies: number[], impedances: number[], phases: number[]}
	 * @throws {Error} - If file cannot be read or data is invalid
	 */
	static parse(filePath) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`ZMA file not found: ${filePath}`);
		}

		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n');

		const frequencies = [];
		const impedances = [];
		const phases = [];

		let lineNumber = 0;

		for (const line of lines) {
			lineNumber++;
			const trimmedLine = line.trim();

			// Skip empty lines and comments
			if (trimmedLine === '' || trimmedLine.startsWith('#')) {
				continue;
			}

			// Parse data line: frequency impedance phase
			// Values can be separated by tabs or spaces
			const parts = trimmedLine.split(/\s+/);

			if (parts.length < 3) {
				throw new Error(`Invalid ZMA data at line ${lineNumber}: expected 3 values, got ${parts.length}`);
			}

			const frequency = parseFloat(parts[0]);
			const impedance = parseFloat(parts[1]);
			const phase = parseFloat(parts[2]);

			// Validate numeric values
			if (Number.isNaN(frequency)) {
				throw new Error(`Invalid frequency value at line ${lineNumber}: ${parts[0]}`);
			}
			if (Number.isNaN(impedance)) {
				throw new Error(`Invalid impedance value at line ${lineNumber}: ${parts[1]}`);
			}
			if (Number.isNaN(phase)) {
				throw new Error(`Invalid phase value at line ${lineNumber}: ${parts[2]}`);
			}

			// Validate frequency is positive
			if (frequency <= 0) {
				throw new Error(`Negative or zero frequency at line ${lineNumber}: ${frequency}`);
			}

			// Validate impedance is positive
			if (impedance <= 0) {
				throw new Error(`Negative or zero impedance at line ${lineNumber}: ${impedance}`);
			}

			frequencies.push(frequency);
			impedances.push(impedance);
			phases.push(phase);
		}

		// Validate we have data
		if (frequencies.length === 0) {
			throw new Error(`No data found in ZMA file: ${filePath}`);
		}

		// Validate monotonic frequencies
		for (let i = 1; i < frequencies.length; i++) {
			if (frequencies[i] <= frequencies[i - 1]) {
				throw new Error(`Non-monotonic frequencies at line ${i + 1}: ${frequencies[i]} <= ${frequencies[i - 1]}`);
			}
		}

		return {
			frequencies,
			impedances,
			phases,
		};
	}

	/**
	 * Export impedance data to a ZMA file
	 * @param {number[]} frequencies - Array of frequency values in Hz
	 * @param {number[]} impedances - Array of impedance values in Ohms
	 * @param {number[]} phases - Array of phase values in degrees
	 * @param {string} outputPath - Path where the ZMA file should be saved
	 * @throws {Error} - If arrays have different lengths or data is invalid
	 */
	static export(frequencies, impedances, phases, outputPath) {
		// Validate input arrays
		if (!Array.isArray(frequencies) || !Array.isArray(impedances) || !Array.isArray(phases)) {
			throw new Error('All parameters must be arrays');
		}

		if (frequencies.length !== impedances.length || frequencies.length !== phases.length) {
			throw new Error(`Array length mismatch: frequencies=${frequencies.length}, impedances=${impedances.length}, phases=${phases.length}`);
		}

		if (frequencies.length === 0) {
			throw new Error('Cannot export empty data');
		}

		// Validate monotonic frequencies
		for (let i = 1; i < frequencies.length; i++) {
			if (frequencies[i] <= frequencies[i - 1]) {
				throw new Error(`Non-monotonic frequencies at index ${i}: ${frequencies[i]} <= ${frequencies[i - 1]}`);
			}
		}

		// Validate positive impedances
		for (let i = 0; i < impedances.length; i++) {
			if (impedances[i] <= 0) {
				throw new Error(`Negative or zero impedance at index ${i}: ${impedances[i]}`);
			}
		}

		// Build file content
		const lines = [];
		lines.push('# Impedance Data');
		lines.push('# Frequency(Hz) Impedance(Ohms) Phase(degrees)');

		for (let i = 0; i < frequencies.length; i++) {
			const frequency = frequencies[i];
			const impedance = impedances[i];
			const phase = phases[i];

			// Validate values
			if (Number.isNaN(frequency) || Number.isNaN(impedance) || Number.isNaN(phase)) {
				throw new Error(`Invalid numeric value at index ${i}`);
			}

			if (frequency <= 0) {
				throw new Error(`Negative or zero frequency at index ${i}: ${frequency}`);
			}

			if (impedance <= 0) {
				throw new Error(`Negative or zero impedance at index ${i}: ${impedance}`);
			}

			// Format with tabs for consistency with input files
			lines.push(`${frequency}    \t${impedance}    \t${phase}`);
		}

		// Write to file
		const content = `${lines.join('\n')}\n`;
		fs.writeFileSync(outputPath, content, 'utf8');
	}
}

export default ZmaParser;
