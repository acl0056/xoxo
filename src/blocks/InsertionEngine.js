/**
 * Insertion Engine — instantiates a circuit block into the active circuit
 * as a BlockGroup with calculated component values, positioned wires,
 * and sequential labels.
 *
 * @module InsertionEngine
 */

import { evaluateFormula } from '@/formulas/FormulaEngine';
import { Resistor } from '@/models/Resistor';
import { Capacitor } from '@/models/Capacitor';
import { Inductor } from '@/models/Inductor';
import { WireSegment } from '@/models/WireSegment';
import { generateUniqueId } from '@/utils/idGenerator';

/**
 * Map from block partType integer to component type string and label prefix.
 */
const PART_TYPE_MAP = {
	0: { type: 'resistor', prefix: 'R' },
	1: { type: 'capacitor', prefix: 'C' },
	2: { type: 'inductor', prefix: 'L' },
};

/**
 * Find the highest existing label number for a given prefix in the circuit.
 * For example, if the circuit has R1, R3, R5, this returns 5 for prefix 'R'.
 * @param {Array} components - Array of circuit components
 * @param {string} prefix - Label prefix ('R', 'C', or 'L')
 * @returns {number} The highest label number found, or 0 if none exist
 */
function getHighestLabelNumber(components, prefix) {
	let highest = 0;
	const pattern = new RegExp(`^${prefix}(\\d+)$`);

	for (const component of components) {
		if (component.label) {
			const match = component.label.match(pattern);
			if (match) {
				const number = parseInt(match[1], 10);
				if (number > highest) {
					highest = number;
				}
			}
		}
	}

	return highest;
}

/**
 * Determine the rotation value from the block component's isHorizontal flag.
 * Horizontal components have rotation 0, vertical components have rotation 90.
 * @param {boolean} isHorizontal - Whether the component is horizontal
 * @returns {number} Rotation in degrees (0 or 90)
 */
function getRotation(isHorizontal) {
	return isHorizontal ? 0 : 90;
}

/**
 * Create a component instance from a block component definition.
 * @param {object} blockComponent - Component definition from the block
 * @param {number} calculatedValue - The formula-evaluated value
 * @param {{ x: number, y: number }} insertionPoint - Grid position for placement
 * @returns {object} The created component instance
 */
function createComponent(blockComponent, calculatedValue, insertionPoint) {
	const positionX = insertionPoint.x + blockComponent.position.x;
	const positionY = insertionPoint.y + blockComponent.position.y;

	let component;
	switch (blockComponent.partType) {
		case 0: {
			component = new Resistor(positionX, positionY);
			component.parameters.resistance = calculatedValue;
			break;
		}
		case 1: {
			component = new Capacitor(positionX, positionY);
			component.parameters.capacitance = calculatedValue;
			if (blockComponent.esr > 0) {
				component.parameters.esr = blockComponent.esr;
			}
			break;
		}
		case 2: {
			component = new Inductor(positionX, positionY);
			component.parameters.inductance = calculatedValue;
			if (blockComponent.esr > 0) {
				component.parameters.esr = blockComponent.esr;
			}
			break;
		}
		default:
			return null;
	}

	component.rotation = getRotation(blockComponent.isHorizontal);
	return component;
}

/**
 * Create a WireSegment from a block wire definition, offset by the insertion point.
 * @param {object} blockWire - Wire definition from the block { start: {x,y}, end: {x,y} }
 * @param {{ x: number, y: number }} insertionPoint - Grid position for placement
 * @returns {WireSegment} The created wire segment instance
 */
function createWireSegment(blockWire, insertionPoint) {
	const startX = insertionPoint.x + blockWire.start.x;
	const startY = insertionPoint.y + blockWire.start.y;
	const endX = insertionPoint.x + blockWire.end.x;
	const endY = insertionPoint.y + blockWire.end.y;

	// Calculate center position and length
	const centerX = Math.round((startX + endX) / 2);
	const centerY = Math.round((startY + endY) / 2);

	const deltaX = endX - startX;
	const deltaY = endY - startY;
	const length = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));

	// Determine rotation: horizontal (0) or vertical (90)
	let rotation = 0;
	if (deltaX === 0 && deltaY !== 0) {
		rotation = 90;
	}

	const wireSegment = new WireSegment(centerX, centerY, length, rotation);
	return wireSegment;
}

/**
 * Map from component type string to the parameter property name that holds the value.
 */
const VALUE_PROPERTY_MAP = {
	resistor: 'resistance',
	capacitor: 'capacitance',
	inductor: 'inductance',
};

/**
 * Re-tune a block group with new variable values.
 * Re-evaluates all component formulas with the new variables and updates
 * each component's value. Preserves positions, labels, and ESR values.
 *
 * @param {object} circuit - The circuit containing the block group
 * @param {string} blockGroupId - ID of the block group to tune
 * @param {Object<string, number>} newVariables - New variable name → value map
 * @returns {{ success: boolean, error?: string }}
 */
export function tuneBlock(circuit, blockGroupId, newVariables) {
	if (!circuit || !circuit.blockGroups) {
		return { success: false, error: 'No active circuit or circuit has no block groups' };
	}

	// Find the BlockGroup by ID
	const blockGroup = circuit.blockGroups.find((group) => group.id === blockGroupId);
	if (!blockGroup) {
		return { success: false, error: `Block group not found: ${blockGroupId}` };
	}

	const { componentIds, formulas } = blockGroup;

	// Pre-evaluate all formulas before applying any changes (fail-fast)
	const calculatedValues = [];
	for (let i = 0; i < componentIds.length; i++) {
		const formula = formulas[i];

		// If formula is empty, skip recalculation for this component
		if (!formula || formula.trim() === '') {
			calculatedValues.push(null);
			continue;
		}

		const result = evaluateFormula(formula, newVariables);
		if (!result.success) {
			return {
				success: false,
				error: `Formula evaluation failed for component ${i} ("${formula}"): ${result.error}`,
			};
		}

		calculatedValues.push(result.value);
	}

	// All formulas evaluated successfully — apply the new values
	for (let i = 0; i < componentIds.length; i++) {
		if (calculatedValues[i] === null) {
			continue;
		}

		const componentId = componentIds[i];
		const component = circuit.components.find((c) => c.id === componentId);
		if (!component) {
			continue;
		}

		const valueProperty = VALUE_PROPERTY_MAP[component.type];
		if (valueProperty) {
			component.parameters[valueProperty] = calculatedValues[i];
		}
	}

	// Update the BlockGroup's stored variable values
	for (const variable of blockGroup.variables) {
		if (Object.prototype.hasOwnProperty.call(newVariables, variable.name)) {
			variable.value = newVariables[variable.name];
		}
	}

	return { success: true };
}

/**
 * Dissolve a block group into independent components.
 * Removes the BlockGroup entity but leaves all components and wires in place.
 * This is a one-way operation — the parametric link is permanently removed.
 *
 * @param {object} circuit - The circuit containing the block group
 * @param {string} blockGroupId - ID of the block group to dissolve
 * @returns {{ success: boolean, error?: string }}
 */
export function dissolveBlock(circuit, blockGroupId) {
	if (!circuit || !circuit.blockGroups) {
		return { success: false, error: 'No active circuit or circuit has no block groups' };
	}

	const index = circuit.blockGroups.findIndex((group) => group.id === blockGroupId);
	if (index === -1) {
		return { success: false, error: `Block group not found: ${blockGroupId}` };
	}

	// Remove the BlockGroup from the array — components and wires stay exactly as they are
	circuit.blockGroups.splice(index, 1);

	return { success: true };
}

/**
 * Insert a circuit block into the active circuit.
 * @param {object} circuit - Target circuit (Circuit instance with components, wires, blockGroups arrays)
 * @param {object} block - CircuitBlock definition (from XscParser/BlockRegistry)
 * @param {Object<string, number>} variables - User-supplied variable values
 * @param {{ x: number, y: number }} insertionPoint - Grid position for placement
 * @returns {{ success: boolean, blockGroup?: object, error?: string }}
 */
export function insertBlock(circuit, block, variables, insertionPoint) {
	// Validate circuit
	if (!circuit) {
		return { success: false, error: 'No active circuit: a circuit must be open' };
	}

	// Ensure blockGroups array exists
	if (!circuit.blockGroups) {
		circuit.blockGroups = [];
	}

	// Evaluate all component formulas first (fail-fast: don't partially insert)
	const calculatedValues = [];
	for (let i = 0; i < block.components.length; i++) {
		const blockComponent = block.components[i];
		const { formula } = blockComponent;

		// If formula is empty or not provided, use the defaultValue
		if (!formula || formula.trim() === '') {
			calculatedValues.push(blockComponent.defaultValue);
			continue;
		}

		const result = evaluateFormula(formula, variables);
		if (!result.success) {
			return {
				success: false,
				error: `Formula evaluation failed for component ${i} ("${formula}"): ${result.error}`,
			};
		}

		calculatedValues.push(result.value);
	}

	// Track the highest label numbers per type for sequential assignment
	const labelCounters = {
		R: getHighestLabelNumber(circuit.components, 'R'),
		C: getHighestLabelNumber(circuit.components, 'C'),
		L: getHighestLabelNumber(circuit.components, 'L'),
	};

	// Create component instances
	const createdComponents = [];
	const componentIds = [];
	const formulas = [];

	for (let i = 0; i < block.components.length; i++) {
		const blockComponent = block.components[i];
		const calculatedValue = calculatedValues[i];

		const component = createComponent(blockComponent, calculatedValue, insertionPoint);
		if (!component) {
			return {
				success: false,
				error: `Unknown partType ${blockComponent.partType} for component ${i}`,
			};
		}

		// Assign sequential label
		const partInfo = PART_TYPE_MAP[blockComponent.partType];
		labelCounters[partInfo.prefix]++;
		component.label = `${partInfo.prefix}${labelCounters[partInfo.prefix]}`;

		createdComponents.push(component);
		componentIds.push(component.id);
		formulas.push(blockComponent.formula || '');
	}

	// Create wire segments from block's wiring topology
	const createdWireSegments = [];
	const wireSegmentIds = [];

	for (const blockWire of block.wires) {
		const wireSegment = createWireSegment(blockWire, insertionPoint);
		createdWireSegments.push(wireSegment);
		wireSegmentIds.push(wireSegment.id);
	}

	// Add all components to the circuit
	for (const component of createdComponents) {
		circuit.components.push(component);
	}

	// Add all wire segments to the circuit
	for (const wireSegment of createdWireSegments) {
		circuit.components.push(wireSegment);
	}

	// Build the BlockGroup metadata
	// Filter variables to only include non-empty slots
	const blockGroupVariables = block.variables
		.filter((variable) => variable.name && variable.name.trim() !== '')
		.map((variable) => ({
			name: variable.name,
			value: variables[variable.name] !== undefined ? variables[variable.name] : variable.defaultValue,
			description: variable.description,
		}));

	// Collect step modes from block components (pad to 6 entries)
	const stepModes = block.components.map((component) => component.stepMode || 0);
	while (stepModes.length < 6) {
		stepModes.push(0);
	}

	const blockGroup = {
		id: generateUniqueId(),
		blockIdentifier: block.identifier || '',
		blockTitle: block.title || '',
		variables: blockGroupVariables,
		componentIds,
		wireSegmentIds,
		formulas,
		stepModes: stepModes.slice(0, 6),
	};

	// Add the BlockGroup to the circuit
	circuit.blockGroups.push(blockGroup);

	return { success: true, blockGroup };
}
