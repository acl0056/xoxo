import { Component } from './Component';

/**
 * Speaker component class
 * Represents a loudspeaker driver with FRD/ZMA data support
 * Includes parameters for sensitivity, delay, polarity, and off-axis measurements
 */
export class Speaker extends Component {
	/**
	 * Create a new speaker component
	 * @param {number} x - Grid position X coordinate
	 * @param {number} y - Grid position Y coordinate
	 */
	constructor(x, y) {
		super('speaker', x, y);

		// Set default parameters according to schema
		this.parameters = {
			name: '', // Speaker name
			sensitivity: 0.0, // dB adjustment
			delay: 0.0, // Milliseconds
			inverted: false, // Polarity inversion flag
			muted: false, // Mute flag
			frdFile: null, // Primary on-axis FRD file path
			zmaFile: null, // Impedance file path
			phaseSource: 'derived', // 'measured' or 'derived' (minimum phase)
			offAxisFiles: [], // Array of {angle: number, frdPath: string}
		};

		// Parsed data (not serialized, loaded from files)
		this.frdData = null; // Parsed frequency response data
		this.zmaData = null; // Parsed impedance data
		this.offAxisData = []; // Parsed off-axis data

		// Set terminals for a speaker (+ and - terminals)
		// Terminals at -3 and +3 from center
		this.terminals = [
			{ x: -3, y: 0 }, // Negative terminal
			{ x: 3, y: 0 }, // Positive terminal
		];
	}

	/**
	 * Load FRD file and parse frequency response data
	 * @param {string} filePath - Path to FRD file
	 * @returns {Promise<void>}
	 */
	async loadFrdFile(filePath) {
		// This will be implemented when FRD parser is available
		// For now, just store the file path
		this.parameters.frdFile = filePath;
		// TODO: Parse FRD file and populate this.frdData
	}

	/**
	 * Load ZMA file and parse impedance data
	 * @param {string} filePath - Path to ZMA file
	 * @returns {Promise<void>}
	 */
	async loadZmaFile(filePath) {
		// This will be implemented when ZMA parser is available
		// For now, just store the file path
		this.parameters.zmaFile = filePath;
		// TODO: Parse ZMA file and populate this.zmaData
	}

	/**
	 * Add an off-axis FRD file with specified angle
	 * @param {number} angle - Measurement angle in degrees (0-180)
	 * @param {string} filePath - Path to off-axis FRD file
	 * @returns {Promise<void>}
	 */
	async addOffAxisFile(angle, filePath) {
		// Validate angle
		if (typeof angle !== 'number' || angle < 0 || angle > 180) {
			throw new Error('Angle must be a number between 0 and 180 degrees');
		}

		// Check if angle already exists
		const existingIndex = this.parameters.offAxisFiles.findIndex(
			(file) => file.angle === angle,
		);

		if (existingIndex >= 0) {
			// Update existing angle
			this.parameters.offAxisFiles[existingIndex].frdPath = filePath;
		} else {
			// Add new angle
			this.parameters.offAxisFiles.push({
				angle,
				frdPath: filePath,
			});
		}

		// TODO: Parse off-axis FRD file and populate this.offAxisData
	}

	/**
	 * Remove an off-axis file by angle
	 * @param {number} angle - Measurement angle to remove
	 */
	removeOffAxisFile(angle) {
		const index = this.parameters.offAxisFiles.findIndex(
			(file) => file.angle === angle,
		);

		if (index >= 0) {
			this.parameters.offAxisFiles.splice(index, 1);
			// TODO: Remove corresponding data from this.offAxisData
		}
	}

	/**
	 * Validate speaker-specific parameters
	 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
	 */
	validate() {
		const baseValidation = super.validate();
		const errors = [...baseValidation.errors];

		// Validate name (can be empty string)
		if (typeof this.parameters.name !== 'string') {
			errors.push('Name must be a string');
		}

		// Validate sensitivity
		if (typeof this.parameters.sensitivity !== 'number') {
			errors.push('Sensitivity must be a number');
		}

		// Validate delay
		if (typeof this.parameters.delay !== 'number' || this.parameters.delay < 0) {
			errors.push('Delay must be a non-negative number');
		}

		// Validate inverted flag
		if (typeof this.parameters.inverted !== 'boolean') {
			errors.push('Inverted must be a boolean');
		}

		// Validate muted flag
		if (typeof this.parameters.muted !== 'boolean') {
			errors.push('Muted must be a boolean');
		}

		// Validate frdFile (can be null or string)
		if (this.parameters.frdFile !== null && typeof this.parameters.frdFile !== 'string') {
			errors.push('FRD file must be null or a string');
		}

		// Validate zmaFile (can be null or string)
		if (this.parameters.zmaFile !== null && typeof this.parameters.zmaFile !== 'string') {
			errors.push('ZMA file must be null or a string');
		}

		// Validate phaseSource
		const validPhaseSources = ['measured', 'derived'];
		if (!validPhaseSources.includes(this.parameters.phaseSource)) {
			errors.push('Phase source must be one of: measured, derived');
		}

		// Validate offAxisFiles array
		if (!Array.isArray(this.parameters.offAxisFiles)) {
			errors.push('Off-axis files must be an array');
		} else {
			this.parameters.offAxisFiles.forEach((file, index) => {
				if (typeof file.angle !== 'number' || file.angle < 0 || file.angle > 180) {
					errors.push(`Off-axis file ${index}: angle must be a number between 0 and 180`);
				}
				if (typeof file.frdPath !== 'string') {
					errors.push(`Off-axis file ${index}: frdPath must be a string`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serialize the speaker to JSON format
	 * Note: Only parameters are serialized, not the parsed data (frdData, zmaData, offAxisData)
	 * @returns {Object} JSON representation of the speaker
	 */
	toJSON() {
		return {
			id: this.id,
			type: this.type,
			label: this.label,
			x: this.x,
			y: this.y,
			rotation: this.rotation,
			parameters: {
				name: this.parameters.name,
				sensitivity: this.parameters.sensitivity,
				delay: this.parameters.delay,
				inverted: this.parameters.inverted,
				muted: this.parameters.muted,
				frdFile: this.parameters.frdFile,
				zmaFile: this.parameters.zmaFile,
				phaseSource: this.parameters.phaseSource,
				offAxisFiles: this.parameters.offAxisFiles,
			},
		};
	}

	/**
	 * Deserialize a speaker from JSON format
	 * @param {Object} json - JSON representation of the speaker
	 * @returns {Speaker} A new Speaker instance
	 */
	static fromJSON(json) {
		const speaker = new Speaker(json.x, json.y);
		speaker.id = json.id;
		speaker.label = json.label || '';
		speaker.rotation = json.rotation || 0;
		speaker.parameters = {
			name: json.parameters.name || '',
			sensitivity: json.parameters.sensitivity || 0.0,
			delay: json.parameters.delay || 0.0,
			inverted: json.parameters.inverted || false,
			muted: json.parameters.muted || false,
			frdFile: json.parameters.frdFile || null,
			zmaFile: json.parameters.zmaFile || null,
			phaseSource: json.parameters.phaseSource || 'derived',
			offAxisFiles: json.parameters.offAxisFiles || [],
		};
		speaker.terminals = json.terminals || speaker.terminals;
		return speaker;
	}
}
