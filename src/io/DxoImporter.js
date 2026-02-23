import fs from 'fs';
import { Circuit } from '../models/Circuit';
import { Resistor } from '../models/Resistor';
import { Capacitor } from '../models/Capacitor';
import { Inductor } from '../models/Inductor';
import { Speaker } from '../models/Speaker';
import { Ground } from '../models/Ground';
import { VoltageSource } from '../models/VoltageSource';
import { Wire } from '../models/Wire';

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
		component.rotation = isHorizontal ? 90 : 0;

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

		// Skip Hilbert parameters and other settings (19 lines remaining in the 39-line block)
		// Lower/Upper Hilbert freq, Lower/Upper slope, Invert Hilbert, Hilbert Delay,
		// get acoust info, ACOUstic FRD, Vendor, SPARE, rectang Ht/Wt, empty,
		// Z Phase Hilbert, baffle thickness, Baffle type, OffAxis from file, Include baffle, driver depth
		for (let i = 0; i < 19; i++) {
			this.readLine();
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
		speaker.parameters.phaseSource = useHilbert ? 'derived' : 'measured';

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
		const count = parseInt(this.extractValue(this.readLine()), 10);

		if (this.lineIndex < this.lines.length) {
			const linesPerBlock = parseInt(this.extractValue(this.readLine()), 10);

			if (count > 0) {
				this.warnings.push(`Active components found (${count}). Skipping - not supported in MVP.`);
				// Skip active block lines
				for (let i = 0; i < count * linesPerBlock; i++) {
					this.readLine();
				}
			}
		}
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
				// Vertical: terminals at top and bottom
				terminals.push({ x, y: y - 3 });
				terminals.push({ x, y: y + 3 });
			} else {
				// Horizontal: terminals at left and right
				terminals.push({ x: x - 3, y });
				terminals.push({ x: x + 3, y });
			}
		} else if (component.type === 'ground') {
			// Ground has one terminal at its position
			terminals.push({ x, y });
		} else if (component.type === 'source' || component.type === 'speaker') {
			// Voltage source and speakers have + and - terminals
			// Assume similar layout to passive components
			if (component.rotation === 0) {
				terminals.push({ x, y: y - 3 });
				terminals.push({ x, y: y + 3 });
			} else {
				terminals.push({ x: x - 3, y });
				terminals.push({ x: x + 3, y });
			}
		}

		return terminals;
	}

	/**
	 * Map wire endpoints to component terminals
	 */
	mapWiresToTerminals() {
		if (!this.wireEndpoints) {
			return;
		}

		this.wireEndpoints.forEach((wireData, index) => {
			const {
				x1, y1, x2, y2,
			} = wireData;

			// Find terminals at each endpoint
			const terminal1 = this.findTerminalAtPosition(x1, y1);
			const terminal2 = this.findTerminalAtPosition(x2, y2);

			if (!terminal1) {
				this.warnings.push(`Wire ${index + 1}: No terminal found at (${x1}, ${y1})`);
				return;
			}

			if (!terminal2) {
				this.warnings.push(`Wire ${index + 1}: No terminal found at (${x2}, ${y2})`);
				return;
			}

			// Create wire connecting the two terminals
			const wire = new Wire(
				{
					componentId: terminal1.component.id,
					terminal: terminal1.terminalIndex,
				},
				{
					componentId: terminal2.component.id,
					terminal: terminal2.terminalIndex,
				},
			);

			// Check if wire is straight or needs segments
			if (x1 !== x2 && y1 !== y2) {
				// Wire has a corner - add segment point
				// For now, assume L-shaped wires with one corner
				wire.segments = [{ x: x1, y: y2 }];
			}

			this.circuit.addWire(wire);
		});
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
