import fs from 'fs';
import path from 'path';

/**
 * Parser for FRD (Frequency Response Data) files
 * Format: Frequency(Hz) Magnitude(dB) Phase(degrees)
 */
class FrdParser {
	/**
	 * Parse an FRD file and return structured data
	 * @param {string} filePath - Path to the FRD file
	 * @returns {Object} - {frequencies: number[], magnitudes: number[], phases: number[]}
	 * @throws {Error} - If file cannot be read or data is invalid
	 */
	static parse(filePath) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`FRD file not found: ${filePath}`);
		}

		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n');

		const frequencies = [];
		const magnitudes = [];
		const phases = [];

		let lineNumber = 0;

		for (const line of lines) {
			lineNumber++;
			const trimmedLine = line.trim();

			// Skip empty lines and comments
			if (trimmedLine === '' || trimmedLine.startsWith('#')) {
				continue;
			}

			// Skip the filename line (format: "filename.frd //frd filename")
			if (trimmedLine.includes('//frd filename')) {
				continue;
			}

			// Parse data line: frequency magnitude phase
			// Values can be separated by tabs or spaces
			const parts = trimmedLine.split(/\s+/);

			if (parts.length < 3) {
				throw new Error(`Invalid FRD data at line ${lineNumber}: expected 3 values, got ${parts.length}`);
			}

			const frequency = parseFloat(parts[0]);
			const magnitude = parseFloat(parts[1]);
			const phase = parseFloat(parts[2]);

			// Validate numeric values
			if (Number.isNaN(frequency)) {
				throw new Error(`Invalid frequency value at line ${lineNumber}: ${parts[0]}`);
			}
			if (Number.isNaN(magnitude)) {
				throw new Error(`Invalid magnitude value at line ${lineNumber}: ${parts[1]}`);
			}
			if (Number.isNaN(phase)) {
				throw new Error(`Invalid phase value at line ${lineNumber}: ${parts[2]}`);
			}

			// Validate frequency is positive
			if (frequency <= 0) {
				throw new Error(`Negative or zero frequency at line ${lineNumber}: ${frequency}`);
			}

			frequencies.push(frequency);
			magnitudes.push(magnitude);
			phases.push(phase);
		}

		// Validate we have data
		if (frequencies.length === 0) {
			throw new Error(`No data found in FRD file: ${filePath}`);
		}

		// Validate monotonic frequencies
		for (let i = 1; i < frequencies.length; i++) {
			if (frequencies[i] <= frequencies[i - 1]) {
				throw new Error(`Non-monotonic frequencies at line ${i + 1}: ${frequencies[i]} <= ${frequencies[i - 1]}`);
			}
		}

		return {
			frequencies,
			magnitudes,
			phases,
		};
	}

	/**
	 * Export frequency response data to an FRD file
	 * @param {number[]} frequencies - Array of frequency values in Hz
	 * @param {number[]} magnitudes - Array of magnitude values in dB
	 * @param {number[]} phases - Array of phase values in degrees
	 * @param {string} outputPath - Path where the FRD file should be saved
	 * @throws {Error} - If arrays have different lengths or data is invalid
	 */
	static export(frequencies, magnitudes, phases, outputPath) {
		// Validate input arrays
		if (!Array.isArray(frequencies) || !Array.isArray(magnitudes) || !Array.isArray(phases)) {
			throw new Error('All parameters must be arrays');
		}

		if (frequencies.length !== magnitudes.length || frequencies.length !== phases.length) {
			throw new Error(`Array length mismatch: frequencies=${frequencies.length}, magnitudes=${magnitudes.length}, phases=${phases.length}`);
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

		// Build file content
		const lines = [];
		lines.push('# Frequency Response Data');
		lines.push('# Frequency(Hz) Magnitude(dB) Phase(degrees)');

		const filename = path.basename(outputPath);
		lines.push(`${filename} //frd filename`);

		for (let i = 0; i < frequencies.length; i++) {
			const frequency = frequencies[i];
			const magnitude = magnitudes[i];
			const phase = phases[i];

			// Validate values
			if (Number.isNaN(frequency) || Number.isNaN(magnitude) || Number.isNaN(phase)) {
				throw new Error(`Invalid numeric value at index ${i}`);
			}

			if (frequency <= 0) {
				throw new Error(`Negative or zero frequency at index ${i}: ${frequency}`);
			}

			// Format with tabs for consistency with input files
			lines.push(`${frequency}\t${magnitude}\t${phase}`);
		}

		// Write to file
		const content = `${lines.join('\n')}\n`;
		fs.writeFileSync(outputPath, content, 'utf8');
	}
}

export default FrdParser;
