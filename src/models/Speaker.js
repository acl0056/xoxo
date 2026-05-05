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
			delay: 0.0, // Seconds (internal storage always in seconds)
			delayUnit: 'in', // Display unit: 'in' (inches), 'cm', or 'ms'
			inverted: false, // Polarity inversion flag
			muted: false, // Mute flag
			frdFile: null, // Primary on-axis FRD file path
			zmaFile: null, // Impedance file path
			frdPhaseSource: 'measured', // 'measured' or 'derived' (minimum phase) for primary FRD
			zmaPhaseSource: 'measured', // 'measured' or 'derived' (minimum phase) for ZMA
			offAxisFiles: [], // Array of {angle: number, frdPath: string, phaseSource: string}
		};

		// Parsed data (not serialized, loaded from files)
		this.frdData = null; // Parsed frequency response data
		this.zmaData = null; // Parsed impedance data
		this.offAxisData = []; // Parsed off-axis data

		// Set terminals for a speaker (+ and - terminals)
		// Terminals at x=-1, 1 grid unit apart vertically from center
		this.terminals = [
			{ x: -1, y: -1 }, // Top terminal (positive for normal polarity)
			{ x: -1, y: 1 }, // Bottom terminal (negative for normal polarity)
		];
	}

	/**
	 * Load FRD file and parse frequency response data
	 * @param {string} filePath - Path to FRD file
	 * @returns {Promise<void>}
	 */
	async loadFrdFile(filePath) {
		// Import FrdParser dynamically to avoid circular dependencies
		const FrdParser = (await import('../io/FrdParser')).default;

		this.parameters.frdFile = filePath;

		try {
			this.frdData = FrdParser.parse(filePath);
		} catch (error) {
			console.error('Failed to load FRD file:', error);
			this.frdData = null;
			throw error;
		}
	}

	/**
	 * Load ZMA file and parse impedance data
	 * @param {string} filePath - Path to ZMA file
	 * @returns {Promise<void>}
	 */
	async loadZmaFile(filePath) {
		// Import ZmaParser dynamically to avoid circular dependencies
		const ZmaParser = (await import('../io/ZmaParser')).default;

		this.parameters.zmaFile = filePath;

		try {
			this.zmaData = ZmaParser.parse(filePath);
		} catch (error) {
			console.error('Failed to load ZMA file:', error);
			this.zmaData = null;
			throw error;
		}
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
				phaseSource: 'measured',
			});
		}

		// Parse off-axis FRD file and populate this.offAxisData
		await this.loadOffAxisData();
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
			// Remove corresponding data from this.offAxisData
			const dataIndex = this.offAxisData.findIndex(
				(data) => data.angle === angle,
			);
			if (dataIndex >= 0) {
				this.offAxisData.splice(dataIndex, 1);
			}
		}
	}

	/**
	 * Load and parse all off-axis FRD files
	 * @returns {Promise<void>}
	 */
	async loadOffAxisData() {
		// Import FrdParser dynamically to avoid circular dependencies
		const FrdParser = (await import('../io/FrdParser')).default;

		this.offAxisData = [];

		for (const offAxisFile of this.parameters.offAxisFiles) {
			try {
				const data = FrdParser.parse(offAxisFile.frdPath);
				this.offAxisData.push({
					angle: offAxisFile.angle,
					frequencies: data.frequencies,
					magnitudes: data.magnitudes,
					phases: data.phases,
				});
			} catch (error) {
				console.error(`Failed to load off-axis file at ${offAxisFile.angle}°:`, error.message);
				// Continue loading other files even if one fails
			}
		}
	}

	/**
	 * Get off-axis data for a specific angle
	 * @param {number} angle - Measurement angle in degrees
	 * @returns {Object|null} Off-axis data or null if not found
	 */
	getOffAxisData(angle) {
		return this.offAxisData.find((data) => data.angle === angle) || null;
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

		// Validate frdPhaseSource
		const validPhaseSources = ['measured', 'derived'];
		if (!validPhaseSources.includes(this.parameters.frdPhaseSource)) {
			errors.push('FRD phase source must be one of: measured, derived');
		}

		// Validate zmaPhaseSource
		if (!validPhaseSources.includes(this.parameters.zmaPhaseSource)) {
			errors.push('ZMA phase source must be one of: measured, derived');
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
				if (!validPhaseSources.includes(file.phaseSource)) {
					errors.push(`Off-axis file ${index}: phaseSource must be one of: measured, derived`);
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
	 * Includes embedded frdData and zmaData so they survive save/load round-trips.
	 * @returns {Object} JSON representation of the speaker
	 */
	toJSON() {
		const json = {
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
				delayUnit: this.parameters.delayUnit,
				inverted: this.parameters.inverted,
				muted: this.parameters.muted,
				frdFile: this.parameters.frdFile,
				zmaFile: this.parameters.zmaFile,
				frdPhaseSource: this.parameters.frdPhaseSource,
				zmaPhaseSource: this.parameters.zmaPhaseSource,
				offAxisFiles: this.parameters.offAxisFiles.map((entry) => ({
					angle: entry.angle,
					frdPath: entry.frdPath,
					phaseSource: entry.phaseSource,
				})),
			},
		};

		// Embed parsed data so it survives save/load
		if (this.frdData) {
			json.frdData = this.frdData;
		}
		if (this.zmaData) {
			json.zmaData = this.zmaData;
		}
		if (this.offAxisData && this.offAxisData.length > 0) {
			json.offAxisData = this.offAxisData;
		}

		return json;
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

		// Determine per-file phase source with legacy migration
		let frdPhaseSource;
		let zmaPhaseSource;
		const legacyPhaseSource = json.parameters.phaseSource;

		if (json.parameters.frdPhaseSource !== undefined) {
			// New format: use per-file values directly
			frdPhaseSource = json.parameters.frdPhaseSource;
			zmaPhaseSource = json.parameters.zmaPhaseSource || 'measured';
		} else if (legacyPhaseSource !== undefined) {
			// Legacy format: propagate global phaseSource to both
			frdPhaseSource = legacyPhaseSource;
			zmaPhaseSource = legacyPhaseSource;
		} else {
			// No phase source at all: default to measured
			frdPhaseSource = 'measured';
			zmaPhaseSource = 'measured';
		}

		// Migrate off-axis entries: add phaseSource if missing
		const offAxisFiles = (json.parameters.offAxisFiles || []).map((entry) => ({
			angle: entry.angle,
			frdPath: entry.frdPath,
			phaseSource: entry.phaseSource !== undefined
				? entry.phaseSource
				: (legacyPhaseSource !== undefined ? legacyPhaseSource : 'measured'),
		}));

		speaker.parameters = {
			name: json.parameters.name || '',
			sensitivity: json.parameters.sensitivity || 0.0,
			delay: json.parameters.delay || 0.0,
			delayUnit: json.parameters.delayUnit || 'in',
			inverted: json.parameters.inverted || false,
			muted: json.parameters.muted || false,
			frdFile: json.parameters.frdFile || null,
			zmaFile: json.parameters.zmaFile || null,
			frdPhaseSource,
			zmaPhaseSource,
			offAxisFiles,
		};
		speaker.terminals = json.terminals || speaker.terminals;

		// Restore embedded data if present
		if (json.frdData) {
			speaker.frdData = json.frdData;
		}
		if (json.zmaData) {
			speaker.zmaData = json.zmaData;
		}
		if (json.offAxisData) {
			speaker.offAxisData = json.offAxisData;
		}

		return speaker;
	}
}
