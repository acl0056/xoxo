/**
 * Printer for .xsc (xsim circuit block) files.
 * Serializes a structured CircuitBlock object back into the line-based .xsc format.
 *
 * @module XscPrinter
 */

/**
 * Format a numeric value for output, avoiding unnecessary trailing zeros
 * while preserving scientific notation when present in the original.
 * @param {number|string} value - The value to format
 * @returns {string}
 */
function formatValue(value) {
	if (typeof value === 'string') {
		return value;
	}
	// Use toString() which handles scientific notation naturally
	return String(value);
}

/**
 * Serialize a CircuitBlock object to .xsc format string.
 * @param {object} block - Structured block definition (as produced by parseXsc)
 * @returns {string} - .xsc format string
 */
export function printXsc(block) {
	const lines = [];

	// --- Title (line 1) ---
	lines.push(block.title);

	// --- Two empty lines after title ---
	lines.push('');
	lines.push('');

	// --- 6 variable slots ---
	for (let i = 0; i < 6; i++) {
		const variable = block.variables[i];
		const name = variable.name || '';

		// Variable name line: "  name //Variable #N" or "   //Variable #N" for empty
		if (name) {
			lines.push(`  ${name} //Variable #${i}`);
		} else {
			lines.push(`   //Variable #${i}`);
		}

		// Description line
		lines.push(variable.description || '');

		// Value line: "  value //VarValue #N"
		lines.push(`  ${formatValue(variable.defaultValue)} //VarValue #${i}`);
	}

	// --- Passives section ---
	lines.push(`${block.components.length} //Passives`);
	lines.push('12 //Lines Per Passive');

	for (const component of block.components) {
		lines.push(` ${component.partType} //PartType`);
		lines.push('   //Part#');
		lines.push(`  ${formatValue(component.defaultValue)} //Value`);
		lines.push(`  ${formatValue(component.esr)} //ESR`);
		lines.push(`  ${formatValue(component.rating)} //Rating`);
		lines.push(`  ${component.position.x} //position X`);
		lines.push(`  ${component.position.y} //position Y`);
		lines.push(`  ${component.isHorizontal ? 'T' : 'F'}  //Is Horizontal`);
		lines.push(`  ${component.stepMode} //StepMode`);
		lines.push(`  ${component.bypassMode} //0short/1val/2open`);
		lines.push(component.formula);
		lines.push(formatValue(component.formulaScale));
	}

	// --- Grounds section ---
	lines.push(`${block.grounds.length} //Grounds`);
	lines.push('2 //Lines Per Ground');

	for (const ground of block.grounds) {
		lines.push(`  ${ground.x} //position X`);
		lines.push(`  ${ground.y} //position Y`);
	}

	// --- Wires section ---
	lines.push(`${block.wires.length} //Wires`);
	lines.push('4 //Lines Per Wire');

	for (const wire of block.wires) {
		lines.push(`  ${wire.start.x} //End1 X`);
		lines.push(`  ${wire.start.y} //End1 Y`);
		lines.push(`  ${wire.end.x} //End2 X`);
		lines.push(`  ${wire.end.y} //End2 Y`);
	}

	// --- Texts section ---
	lines.push(`${block.texts.length} //Texts`);
	lines.push('5 //Lines Per Text');

	for (const text of block.texts) {
		lines.push(text.label);
		lines.push(`  ${text.position.x} //position X`);
		lines.push(`  ${text.position.y} //position Y`);
		lines.push(`  ${text.size} //Size`);
		lines.push(`  ${text.color} //color`);
	}

	// File ends with a trailing newline
	lines.push('');

	return lines.join('\n');
}
