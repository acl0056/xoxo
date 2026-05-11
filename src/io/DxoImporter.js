import fs from 'fs';
import { Circuit } from '../models/Circuit';
import { Resistor } from '../models/Resistor';
import { Capacitor } from '../models/Capacitor';
import { Inductor } from '../models/Inductor';
import { Speaker } from '../models/Speaker';
import { Ground } from '../models/Ground';
import { VoltageSource } from '../models/VoltageSource';
import { WireSegment } from '../models/WireSegment';
import { Wire } from '../models/Wire';
import { PEQ } from '../models/PEQ';
import { Filter } from '../models/Filter';
import { OpAmp } from '../models/OpAmp';

/**
 * DxoImporter - Imports XSim .dxo files and converts them to internal Circuit format
 */
export class DxoImporter {
	/**
	 * Import a .dxo file and return a Circuit instance
	 * @param {string} filePath - Path to the .dxo file
	 * @returns {Circuit} - Parsed circuit
	 */
	static import(filePath) {
		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n').map((line) => line.trim());

		const importer = new DxoImporter(filePath, lines);
		return importer.parse();
	}

	/**
	 * Import a .dxo file from content string and return a Circuit instance
	 * @param {string} content - File content as string
	 * @param {string} filePath - Original file path (for reference)
	 * @returns {Circuit} - Parsed circuit
	 */
	static importFromContent(content, filePath = '') {
		const lines = content.split('\n').map((line) => line.trim());

		const importer = new DxoImporter(filePath, lines);
		return importer.parse();
	}

	constructor(filePath, lines) {
		this.filePath = filePath;
		this.lines = lines;
		this.lineIndex = 0;
		this.circuit = new Circuit();
		this.warnings = [];
		this.componentMap = new Map(); // Maps grid positions to components
		this.gridToTerminalMap = new Map(); // Maps grid positions to component terminals
	}

	/**
	 * Parse the .dxo file
	 * @returns {Circuit}
	 */
	parse() {
		this.parseVoltageSource();
		this.parseSubcircuits();
		this.parsePassiveComponents();
		this.parseGrounds();
		this.parseWires();
		this.parseTexts();
		this.parseDrivers();
		this.parseSetup();
		this.parseBaffle();
		this.parseActiveBlocks();

		// Translate all coordinates so the voltage source is near the origin
		this.translateToOrigin();

		// Map wires to component terminals
		this.mapWiresToTerminals();

		// Log warnings if any
		if (this.warnings.length > 0) {
			console.warn('DXO Import Warnings:');
			this.warnings.forEach((warning) => console.warn(`  - ${warning}`));
		}

		return this.circuit;
	}

	/**
	 * Translate all component and wire coordinates so the voltage source
	 * is placed at a reasonable position near the origin
	 */
	translateToOrigin() {
		const targetX = 20;
		const targetY = 40;

		// Find the voltage source
		const voltageSource = this.circuit.components.find((c) => c.type === 'source');
		if (!voltageSource) return;

		const offsetX = voltageSource.x - targetX;
		const offsetY = voltageSource.y - targetY;

		if (offsetX === 0 && offsetY === 0) return;

		// Translate all components
		for (const component of this.circuit.components) {
			component.x -= offsetX;
			component.y -= offsetY;
		}

		// Translate all wire endpoints
		if (this.wireEndpoints) {
			for (const wire of this.wireEndpoints) {
				wire.x1 -= offsetX;
				wire.y1 -= offsetY;
				wire.x2 -= offsetX;
				wire.y2 -= offsetY;
			}
		}
	}

	/**
	 * Read the next line and advance the index
	 * @returns {string}
	 */
	readLine() {
		if (this.lineIndex >= this.lines.length) {
			throw new Error(`Unexpected end of file at line ${this.lineIndex}`);
		}
		const line = this.lines[this.lineIndex];
		this.lineIndex++;
		return line;
	}

	/**
	 * Extract the value from a line (before the comment)
	 * @param {string} line
	 * @returns {string}
	 */
	extractValue(line) {
		// Handle lines with comments
		const commentIndex = line.indexOf('//');
		let value;
		if (commentIndex === -1) {
			value = line;
		} else {
			value = line.substring(0, commentIndex);
		}

		// Trim whitespace and handle empty values
		value = value.trim();

		// Return empty string if no value (for optional fields)
		return value;
	}

	/**
	 * Parse boolean value (T/F)
	 * @param {string} value
	 * @returns {boolean}
	 */
	parseBoolean(value) {
		return value === 'T';
	}

	/**
	 * Parse voltage source section
	 */
	parseVoltageSource() {
		this.readLine(); // //VoltageSource
		this.readLine(); // 7 //Lines

		this.readLine(); // vrms (not used in current implementation)
		const inverted = this.parseBoolean(this.extractValue(this.readLine()));
		const x = parseInt(this.extractValue(this.readLine()), 10);
		const y = parseInt(this.extractValue(this.readLine()), 10);
		const delay = parseFloat(this.extractValue(this.readLine()));
		const power = parseFloat(this.extractValue(this.readLine()));
		const impedance = parseFloat(this.extractValue(this.readLine()));

		const voltageSource = new VoltageSource(x, y);
		voltageSource.parameters.power = power;
		voltageSource.parameters.impedance = impedance;
		voltageSource.parameters.delay = delay;
		voltageSource.parameters.inverted = inverted;

		this.circuit.addComponent(voltageSource);
		this.registerComponentPosition(voltageSource, x, y);
	}

	/**
	 * Parse subcircuits section (skip - not supported in MVP)
	 */
	parseSubcircuits() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		const linesPerSubckt = parseInt(this.extractValue(this.readLine()), 10);

		if (count > 0) {
			this.warnings.push(`Subcircuits are not supported (${count} found). Skipping.`);
			// Skip subcircuit lines
			for (let i = 0; i < count * linesPerSubckt; i++) {
				this.readLine();
			}
		}
	}

	/**
	 * Parse passive components section
	 */
	parsePassiveComponents() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		this.readLine(); // linesPerPassive (not used in parsing logic)

		for (let i = 0; i < count; i++) {
			this.parsePassiveComponent();
		}
	}

	/**
	 * Parse a single passive component
	 */
	parsePassiveComponent() {
		const partTypeLine = this.readLine();
		const partType = parseInt(this.extractValue(partTypeLine), 10);

		if (Number.isNaN(partType)) {
			throw new Error(`Failed to parse partType from line ${this.lineIndex - 1}: "${partTypeLine}"`);
		}

		const refDes = parseInt(this.extractValue(this.readLine()), 10);
		this.readLine(); // Part# (skip)
		const value = parseFloat(this.extractValue(this.readLine()));
		const esr = parseFloat(this.extractValue(this.readLine()));
		this.readLine(); // Rating (skip)
		const x = parseInt(this.extractValue(this.readLine()), 10);
		const y = parseInt(this.extractValue(this.readLine()), 10);
		const isHorizontal = this.parseBoolean(this.extractValue(this.readLine()));
		this.readLine(); // StepMode (skip)
		const state = parseInt(this.extractValue(this.readLine()), 10);

		// Skip remaining lines (9 more: Subckt#, equation1, equation2, IsHighSpec, 4 tolerances, vendor)
		for (let i = 0; i < 9; i++) {
			this.readLine();
		}

		let component;
		if (partType === 0) {
			// Resistor
			component = new Resistor(x, y);
			component.parameters.resistance = value;
			component.label = `R${refDes}`;
		} else if (partType === 1) {
			// Capacitor
			component = new Capacitor(x, y);
			component.parameters.capacitance = value;
			component.parameters.esr = esr;
			component.label = `C${refDes}`;
		} else if (partType === 2) {
			// Inductor
			component = new Inductor(x, y);
			component.parameters.inductance = value;
			component.parameters.esr = esr;
			component.label = `L${refDes}`;
		} else {
			throw new Error(`Unknown part type: ${partType}`);
		}

		// Set rotation based on orientation
		// In DXO format: T (horizontal) = terminals left/right = rotation 0
		// F (vertical) = terminals top/bottom = rotation 90
		component.rotation = isHorizontal ? 0 : 90;

		// Map state
		if (state === 0) {
			component.parameters.state = 'short';
		} else if (state === 1) {
			component.parameters.state = 'normal';
		} else if (state === 2) {
			component.parameters.state = 'open';
		}

		this.circuit.addComponent(component);
		this.registerComponentPosition(component, x, y);
	}

	/**
	 * Parse grounds section
	 */
	parseGrounds() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		this.readLine(); // Lines per ground

		for (let i = 0; i < count; i++) {
			const x = parseInt(this.extractValue(this.readLine()), 10);
			const y = parseInt(this.extractValue(this.readLine()), 10);
			this.readLine(); // Subckt# (skip)

			const ground = new Ground(x, y);
			this.circuit.addComponent(ground);
			this.registerComponentPosition(ground, x, y);
		}
	}

	/**
	 * Parse wires section
	 */
	parseWires() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		this.readLine(); // Lines per wire

		this.wireEndpoints = []; // Store for later processing

		for (let i = 0; i < count; i++) {
			const x1 = parseInt(this.extractValue(this.readLine()), 10);
			const y1 = parseInt(this.extractValue(this.readLine()), 10);
			const x2 = parseInt(this.extractValue(this.readLine()), 10);
			const y2 = parseInt(this.extractValue(this.readLine()), 10);
			this.readLine(); // Subckt# (skip)

			// Store wire endpoints for later processing
			this.wireEndpoints.push({
				x1, y1, x2, y2,
			});
		}
	}

	/**
	 * Parse text annotations section
	 */
	parseTexts() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		const linesPerText = parseInt(this.extractValue(this.readLine()), 10);

		if (count > 0) {
			this.warnings.push(`Text annotations found (${count}). Skipping - not implemented in MVP.`);
			// Skip text lines
			for (let i = 0; i < count * linesPerText; i++) {
				this.readLine();
			}
		}
	}

	/**
	 * Parse drivers (speakers) section
	 */
	parseDrivers() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		this.readLine(); // linesPerDriver (not used in parsing logic)

		for (let i = 0; i < count; i++) {
			this.readLine(); // !driver <index>
			this.parseDriver(i);
		}
	}

	/**
	 * Parse a single driver
	 * @param {number} index
	 */
	parseDriver(index) {
		// Note: !driver line already read by parseDrivers

		const refDes = parseInt(this.extractValue(this.readLine()), 10);
		const name = this.extractValue(this.readLine());
		this.readLine(); // PartNumber (skip)
		const x = parseInt(this.extractValue(this.readLine()), 10);
		const y = parseInt(this.extractValue(this.readLine()), 10);
		const inverted = this.parseBoolean(this.extractValue(this.readLine()));
		const muted = this.parseBoolean(this.extractValue(this.readLine()));
		this.readLine(); // Rating (skip)
		const dbGain = parseFloat(this.extractValue(this.readLine()));
		const delay = parseFloat(this.extractValue(this.readLine()));

		// Skip position offsets and tilts (5 lines: Xoffs, Yoffs, Zoffs, Htilt, Vtilt)
		for (let i = 0; i < 5; i++) {
			this.readLine();
		}

		this.readLine(); // dia (skip)
		const frdFilename = this.extractValue(this.readLine());
		const zmaFilename = this.extractValue(this.readLine());
		const useHilbert = this.parseBoolean(this.extractValue(this.readLine()));

		// Read remaining 19 lines of the driver block individually to extract zPhaseHilbert
		// Lines: Lower/Upper Hilbert freq, Lower/Upper slope, Invert Hilbert, Hilbert Delay,
		// get acoust info, ACOUstic FRD, Vendor, SPARE, rectang Ht/Wt, empty,
		// Z Phase Hilbert, baffle thickness, Baffle type, OffAxis from file, Include baffle, driver depth
		for (let i = 0; i < 13; i++) {
			this.readLine(); // Skip lines 0-12 (lowerFreq through empty)
		}
		const zPhaseHilbert = this.parseBoolean(this.extractValue(this.readLine())); // Line 13: Z Phase Hilbert
		for (let i = 0; i < 5; i++) {
			this.readLine(); // Skip lines 14-18 (baffleThickness through driverDepth)
		}

		// Check if there's embedded FRD/ZMA data or if we're at the next driver
		const nextLine = this.lines[this.lineIndex];
		let frdData = null;
		let zmaData = null;

		if (nextLine && nextLine.startsWith('**FRD')) {
			// Parse embedded FRD data
			frdData = this.parseEmbeddedFRD();

			// Parse embedded ZMA data
			zmaData = this.parseEmbeddedZMA();
		} else {
			// No embedded data - this driver references external files only
			// or is an off-axis measurement
			this.warnings.push(`Driver ${index} (${name}) has no embedded FRD/ZMA data - will use external files if available`);
		}

		// Create speaker component
		const speaker = new Speaker(x, y);
		speaker.label = `S${refDes}`;
		speaker.parameters.name = name;
		speaker.parameters.sensitivity = dbGain;
		speaker.parameters.delay = delay;
		speaker.parameters.inverted = inverted;
		speaker.parameters.muted = muted;
		speaker.parameters.frdPhaseSource = useHilbert ? 'derived' : 'measured';
		speaker.parameters.zmaPhaseSource = zPhaseHilbert ? 'derived' : 'measured';

		// Store FRD and ZMA data (may be null)
		speaker.frdData = frdData;
		speaker.zmaData = zmaData;
		speaker.parameters.frdFile = frdFilename;
		speaker.parameters.zmaFile = zmaFilename;

		this.circuit.addComponent(speaker);
		this.registerComponentPosition(speaker, x, y);
	}

	/**
	 * Parse embedded FRD data
	 * @param {number} driverIndex
	 * @returns {Object}
	 */
	parseEmbeddedFRD() {
		const startMarker = this.readLine(); // **FRD 1 for driver <index>
		if (!startMarker.startsWith('**FRD')) {
			throw new Error(`Expected FRD start marker, got: ${startMarker}`);
		}

		this.readLine(); // filename line

		const frequencies = [];
		const magnitudes = [];
		const phases = [];

		let line = this.readLine();
		while (!line.startsWith('**END FRD')) {
			const parts = line.split('\t');
			if (parts.length === 3) {
				frequencies.push(parseFloat(parts[0]));
				magnitudes.push(parseFloat(parts[1]));
				phases.push(parseFloat(parts[2]));
			}
			line = this.readLine();
		}

		return { frequencies, magnitudes, phases };
	}

	/**
	 * Parse embedded ZMA data
	 * @param {number} driverIndex
	 * @returns {Object}
	 */
	parseEmbeddedZMA() {
		const startMarker = this.readLine(); // **ZMA Data for driver <index>
		if (!startMarker.startsWith('**ZMA')) {
			throw new Error(`Expected ZMA start marker, got: ${startMarker}`);
		}

		const frequencies = [];
		const impedances = [];
		const phases = [];

		let line = this.readLine();
		while (!line.startsWith('**END ZMA')) {
			const parts = line.split('\t');
			if (parts.length === 3) {
				frequencies.push(parseFloat(parts[0]));
				impedances.push(parseFloat(parts[1]));
				phases.push(parseFloat(parts[2]));
			}
			line = this.readLine();
		}

		return { frequencies, impedances, phases };
	}

	/**
	 * Parse setup section
	 */
	parseSetup() {
		this.readLine(); // Setup count
		const linesForSetup = parseInt(this.extractValue(this.readLine()), 10);

		if (linesForSetup > 0) {
			// Skip setup lines
			for (let i = 0; i < linesForSetup; i++) {
				this.readLine();
			}
		}
	}

	/**
	 * Parse baffle section
	 */
	parseBaffle() {
		const count = parseInt(this.extractValue(this.readLine()), 10);
		const linesPerBaffle = parseInt(this.extractValue(this.readLine()), 10);

		if (count > 0) {
			this.warnings.push('Baffle geometry found. Skipping - not supported in MVP.');
			// Skip baffle lines
			for (let i = 0; i < count * linesPerBaffle; i++) {
				this.readLine();
			}
		}
	}

	/**
	 * Parse active blocks section
	 */
	parseActiveBlocks() {
		// Check if we've reached the end of the file or the active blocks section
		if (this.lineIndex >= this.lines.length) return;

		const countLine = this.readLine();
		const count = parseInt(this.extractValue(countLine), 10);

		if (Number.isNaN(count)) {
			throw new Error(`Invalid active block count at line ${this.lineIndex - 1}: "${countLine}"`);
		}

		if (this.lineIndex >= this.lines.length) return;

		const linesPerBlockLine = this.readLine();
		const linesPerBlock = parseInt(this.extractValue(linesPerBlockLine), 10);

		if (Number.isNaN(linesPerBlock)) {
			throw new Error(`Invalid lines per active block at line ${this.lineIndex - 1}: "${linesPerBlockLine}"`);
		}

		if (count === 0) return;

		for (let i = 0; i < count; i++) {
			this.parseActiveBlock(i);
		}
	}

	/**
	 * Parse a single active block (68 lines) and create the appropriate component
	 * @param {number} index - Block index for labeling
	 */
	parseActiveBlock(index) {
		// Read all 68 lines of the active block
		const type = parseInt(this.extractValue(this.readLine()), 10);
		const x = parseInt(this.extractValue(this.readLine()), 10);
		const y = parseInt(this.extractValue(this.readLine()), 10);
		this.readLine(); // Inverted (not used)
		this.readLine(); // Input R (not used)
		this.readLine(); // Output R (not used)
		const scalarGain = parseFloat(this.extractValue(this.readLine()));
		const turnFrequency = parseFloat(this.extractValue(this.readLine()));
		const passbandBandwidth = parseFloat(this.extractValue(this.readLine()));
		this.readLine(); // chebychev error (not used)
		const filterShape = parseInt(this.extractValue(this.readLine()), 10);
		const filterType = parseInt(this.extractValue(this.readLine()), 10);
		const filterOrder = parseInt(this.extractValue(this.readLine()), 10);
		const adjustableDelay = parseFloat(this.extractValue(this.readLine()));
		this.readLine(); // Inherent Delay (not used)
		this.readLine(); // DSP model (not used)
		const dspRate = parseFloat(this.extractValue(this.readLine()));
		const biquadCount = parseInt(this.extractValue(this.readLine()), 10);

		// Read biquad sections (5 lines each)
		const biquads = [];
		for (let i = 0; i < biquadCount; i++) {
			const unbypassed = this.parseBoolean(this.extractValue(this.readLine()));
			const frequency = parseFloat(this.extractValue(this.readLine()));
			const q = parseFloat(this.extractValue(this.readLine()));
			const gain = parseFloat(this.extractValue(this.readLine()));
			const biquadType = parseInt(this.extractValue(this.readLine()), 10);
			biquads.push({
				unbypassed, frequency, q, gain, type: biquadType,
			});
		}

		const blockData = {
			type,
			x,
			y,
			scalarGain,
			turnFrequency,
			passbandBandwidth,
			filterShape,
			filterType,
			filterOrder,
			adjustableDelay,
			dspRate,
			biquads,
		};

		// Dispatch to creation method based on type code
		if (type === 0) {
			this.createPEQFromBlock(blockData, index);
		} else if (type === 1) {
			this.createOpAmpFromBlock(blockData, index);
		} else if (type === 2) {
			this.createFilterFromBlock(blockData, index);
		} else {
			this.warnings.push(`Unknown active block type ${type} at block index ${index}. Skipping.`);
		}
	}

	/**
	 * Create a PEQ component from parsed active block data
	 * @param {Object} blockData - Parsed block fields
	 * @param {number} index - Block index for labeling
	 */
	createPEQFromBlock(blockData, index) {
		const peq = new PEQ(blockData.x, blockData.y);

		// Set gain = 0 (DXO scalar gain of 1 = unity = 0 dB)
		peq.parameters.gain = 0;

		// Set delay (clamp to >= 0)
		if (blockData.adjustableDelay < 0) {
			this.warnings.push(`Negative delay (${blockData.adjustableDelay}) for active block ${index}. Clamping to 0.`);
		}
		peq.parameters.delay = Math.max(0, blockData.adjustableDelay);

		// Set DSP rate
		peq.parameters.dspRate = blockData.dspRate;

		// Set muted = false
		peq.parameters.muted = false;

		// Biquad type code mapping
		const biquadTypeMap = {
			0: 'peaking',
			1: 'lowShelf',
			2: 'highShelf',
			3: 'lowPass1',
			4: 'highPass1',
			5: 'lowPass2',
			6: 'highPass2',
			7: 'allPass',
		};

		// Filter biquads to only unbypassed ones and map type codes
		const sections = [];
		for (const biquad of blockData.biquads) {
			if (!biquad.unbypassed) continue;

			const filterType = biquadTypeMap[biquad.type];
			if (filterType === undefined) {
				this.warnings.push(`Unknown biquad type code ${biquad.type} in active block ${index}. Skipping section.`);
				continue;
			}

			sections.push({
				filterType,
				frequency: biquad.frequency,
				q: biquad.q,
				gain: biquad.gain,
				bypass: false,
			});
		}

		peq.parameters.sections = sections;

		// Set label
		peq.label = `A${index}`;

		// Register position and add to circuit
		this.registerComponentPosition(peq, blockData.x, blockData.y);
		this.circuit.addComponent(peq);
	}

	/**
	 * Create an OpAmp component from parsed active block data
	 * @param {Object} blockData - Parsed block fields
	 * @param {number} index - Block index for labeling
	 */
	createOpAmpFromBlock(blockData, index) {
		const opamp = new OpAmp(blockData.x, blockData.y);

		// Convert scalar gain to dB
		if (blockData.scalarGain <= 0) {
			this.warnings.push(`Scalar gain <= 0 (${blockData.scalarGain}) for active block ${index}. Defaulting dcGain to 100 dB.`);
			opamp.parameters.dcGain = 100;
		} else {
			opamp.parameters.dcGain = 20 * Math.log10(blockData.scalarGain);
		}

		// Set corner frequency from turn frequency
		opamp.parameters.cornerFrequency = blockData.turnFrequency;

		// Set label
		opamp.label = `A${index}`;

		// Register position and add to circuit
		this.registerComponentPosition(opamp, blockData.x, blockData.y);
		this.circuit.addComponent(opamp);
	}

	/**
	 * Create a Filter component from parsed active block data
	 * @param {Object} blockData - Parsed block fields
	 * @param {number} index - Block index for labeling
	 */
	createFilterFromBlock(blockData, index) {
		const filter = new Filter(blockData.x, blockData.y);

		// Map filter shape
		const shapeMap = { 0: 'butterworth', 1: 'linkwitzRiley', 2: 'bessel' };
		if (shapeMap[blockData.filterShape] === undefined) {
			this.warnings.push(`Unknown filter shape code ${blockData.filterShape} for active block ${index}. Defaulting to butterworth.`);
		}
		filter.parameters.filterShape = shapeMap[blockData.filterShape] || 'butterworth';

		// Map filter type
		const typeMap = { 0: 'lowPass', 1: 'highPass', 2: 'bandpass' };
		if (typeMap[blockData.filterType] === undefined) {
			this.warnings.push(`Unknown filter type code ${blockData.filterType} for active block ${index}. Defaulting to lowPass.`);
		}
		filter.parameters.filterType = typeMap[blockData.filterType] || 'lowPass';

		// Set filter order and turn frequency
		filter.parameters.filterOrder = blockData.filterOrder;
		filter.parameters.turnFrequency = blockData.turnFrequency;

		// Set passband bandwidth
		filter.parameters.passbandBandwidth = blockData.passbandBandwidth || 1000;

		// Set gain = 0
		filter.parameters.gain = 0;

		// Set delay (clamp to >= 0)
		if (blockData.adjustableDelay < 0) {
			this.warnings.push(`Negative delay (${blockData.adjustableDelay}) for active block ${index}. Clamping to 0.`);
		}
		filter.parameters.delay = Math.max(0, blockData.adjustableDelay);

		// Set muted = false
		filter.parameters.muted = false;

		// Set label
		filter.label = `A${index}`;

		// Register position and add to circuit
		this.registerComponentPosition(filter, blockData.x, blockData.y);
		this.circuit.addComponent(filter);
	}

	/**
	 * Register a component's position for wire mapping
	 * @param {Component} component
	 * @param {number} x
	 * @param {number} y
	 */
	registerComponentPosition(component, x, y) {
		const key = `${x},${y}`;
		this.componentMap.set(key, component);

		// Calculate terminal positions based on component type and rotation
		const terminals = this.calculateTerminalPositions(component, x, y);
		terminals.forEach((terminalPos, terminalIndex) => {
			const terminalKey = `${terminalPos.x},${terminalPos.y}`;
			this.gridToTerminalMap.set(terminalKey, {
				component,
				terminalIndex,
			});
		});
	}

	/**
	 * Calculate terminal positions for a component
	 * @param {Component} component
	 * @param {number} x
	 * @param {number} y
	 * @returns {Array<{x: number, y: number}>}
	 */
	calculateTerminalPositions(component, x, y) {
		const terminals = [];

		// Most components span 6 grid dots in their primary orientation
		// Passive components have 2 terminals
		if (component.type === 'resistor' || component.type === 'capacitor' || component.type === 'inductor') {
			if (component.rotation === 0) {
				// Horizontal: terminals at left and right
				terminals.push({ x: x - 3, y });
				terminals.push({ x: x + 3, y });
			} else {
				// Vertical: terminals at top and bottom
				terminals.push({ x, y: y - 3 });
				terminals.push({ x, y: y + 3 });
			}
		} else if (component.type === 'ground') {
			// Ground has one terminal at its position
			terminals.push({ x, y });
		} else if (component.type === 'source') {
			// Voltage source terminals: {x:3, y:-2} and {x:3, y:2}
			terminals.push({ x: x + 3, y: y - 2 });
			terminals.push({ x: x + 3, y: y + 2 });
		} else if (component.type === 'speaker') {
			// Speaker terminals: {x:-1, y:-1} and {x:-1, y:1}
			terminals.push({ x: x - 1, y: y - 1 });
			terminals.push({ x: x - 1, y: y + 1 });
		} else if (component.type === 'peq' || component.type === 'filter' || component.type === 'opamp') {
			terminals.push({ x: x - 3, y: y - 2 });
			terminals.push({ x: x - 3, y: y + 2 });
			terminals.push({ x: x + 4, y: y - 2 });
			terminals.push({ x: x + 4, y: y + 2 });
		}

		return terminals;
	}

	/**
	 * Split wire segments at T-junctions where another wire's endpoint
	 * falls on the interior of a wire segment
	 */
	splitWiresAtJunctions(wireEndpoints) {
		// Collect all unique endpoints
		const allEndpoints = new Set();
		for (const wire of wireEndpoints) {
			allEndpoints.add(`${wire.x1},${wire.y1}`);
			allEndpoints.add(`${wire.x2},${wire.y2}`);
		}

		// Also collect component terminal positions as potential split points
		for (const component of this.circuit.components) {
			const terminals = this.calculateTerminalPositions(component, component.x, component.y);
			for (const t of terminals) {
				allEndpoints.add(`${t.x},${t.y}`);
			}
		}

		// For each wire, check if any endpoint falls on its interior and split
		let result = [...wireEndpoints];
		let changed = true;

		while (changed) {
			changed = false;
			const newResult = [];

			for (const wire of result) {
				const splitPoints = [];

				for (const epKey of allEndpoints) {
					const [px, py] = epKey.split(',').map(Number);

					// Skip if this point is one of the wire's own endpoints
					if ((px === wire.x1 && py === wire.y1) || (px === wire.x2 && py === wire.y2)) {
						continue;
					}

					// Check if point is on this wire's interior
					if (wire.y1 === wire.y2 && py === wire.y1) {
						// Horizontal wire — check if px is between x1 and x2
						const minX = Math.min(wire.x1, wire.x2);
						const maxX = Math.max(wire.x1, wire.x2);
						if (px > minX && px < maxX) {
							splitPoints.push({ x: px, y: py });
						}
					} else if (wire.x1 === wire.x2 && px === wire.x1) {
						// Vertical wire — check if py is between y1 and y2
						const minY = Math.min(wire.y1, wire.y2);
						const maxY = Math.max(wire.y1, wire.y2);
						if (py > minY && py < maxY) {
							splitPoints.push({ x: px, y: py });
						}
					}
				}

				if (splitPoints.length === 0) {
					newResult.push(wire);
				} else {
					// Sort split points by distance from (x1,y1)
					splitPoints.sort((a, b) => {
						const distA = Math.abs(a.x - wire.x1) + Math.abs(a.y - wire.y1);
						const distB = Math.abs(b.x - wire.x1) + Math.abs(b.y - wire.y1);
						return distA - distB;
					});

					// Create sub-segments
					let prevX = wire.x1;
					let prevY = wire.y1;
					for (const sp of splitPoints) {
						newResult.push({
							x1: prevX, y1: prevY, x2: sp.x, y2: sp.y,
						});
						prevX = sp.x;
						prevY = sp.y;
					}
					newResult.push({
						x1: prevX, y1: prevY, x2: wire.x2, y2: wire.y2,
					});

					changed = true;
				}
			}

			result = newResult;
		}

		return result;
	}

	/**
	 * Convert DXO wire endpoints into WireSegment components and build Wire connections for solver
	 */
	mapWiresToTerminals() {
		if (!this.wireEndpoints) {
			return;
		}

		// Split wires at T-junctions: where one wire's endpoint falls on another wire's interior
		this.wireEndpoints = this.splitWiresAtJunctions(this.wireEndpoints);

		// Create WireSegment components for each DXO wire (visual/interactive)
		this.wireEndpoints.forEach((wireData) => {
			const {
				x1, y1, x2, y2,
			} = wireData;

			const deltaX = x2 - x1;
			const deltaY = y2 - y1;

			const centerX = (x1 + x2) / 2;
			const centerY = (y1 + y2) / 2;

			let length;
			let rotation;

			if (deltaY === 0) {
				length = Math.abs(deltaX);
				rotation = 0;
			} else if (deltaX === 0) {
				length = Math.abs(deltaY);
				rotation = 90;
			} else {
				length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				rotation = 0;
				this.warnings.push(`Wire from (${x1},${y1}) to (${x2},${y2}) is diagonal`);
			}

			if (length > 0) {
				const wireSegment = new WireSegment(centerX, centerY, length, rotation);
				this.circuit.addComponent(wireSegment);
			}
		});

		// Build connectivity from terminal position overlaps for the solver
		const positionToTerminals = new Map();

		for (const component of this.circuit.components) {
			if (!component.terminals) continue;
			for (let t = 0; t < component.terminals.length; t++) {
				const pos = component.getTerminalPosition(t);
				if (!pos) continue;
				const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
				if (!positionToTerminals.has(key)) {
					positionToTerminals.set(key, []);
				}
				positionToTerminals.get(key).push({
					componentId: component.id,
					terminalIndex: t,
				});
			}
		}

		// Create Wire objects for every pair of terminals sharing a grid position
		const createdWires = new Set();
		for (const [, terminals] of positionToTerminals) {
			for (let i = 0; i < terminals.length; i++) {
				for (let j = i + 1; j < terminals.length; j++) {
					const a = terminals[i];
					const b = terminals[j];

					const wireId = [a.componentId, a.terminalIndex, b.componentId, b.terminalIndex].sort().join('|');
					if (createdWires.has(wireId)) continue;
					createdWires.add(wireId);

					const wire = new Wire(
						{ componentId: a.componentId, terminal: a.terminalIndex },
						{ componentId: b.componentId, terminal: b.terminalIndex },
					);
					this.circuit.addWire(wire);
				}
			}
		}
	}

	/**
	 * Find a terminal at a specific grid position
	 * @param {number} x
	 * @param {number} y
	 * @returns {Object|null}
	 */
	findTerminalAtPosition(x, y) {
		const key = `${x},${y}`;
		return this.gridToTerminalMap.get(key) || null;
	}
}
